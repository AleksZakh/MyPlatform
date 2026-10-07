#!/usr/bin/env python3
"""Space: prepare / migrate / activate / rollback. Run installed copy as root."""
import argparse
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
import urllib.request

BASE = Path('/var/www/space')
RELEASES = BASE / 'releases'
STATE = BASE / 'deployment.json'
JOURNAL = BASE / 'pending-switch.json'
ENV_FILE = '/etc/space/space.env'
NODE = '/usr/bin/node'
PM2 = '/usr/local/bin/pm2'
NAMES = ('space-app', 'space-ws')

def run(args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)

def json_write(path, value):
    temp = path.with_name(path.name + '.tmp')
    temp.write_text(json.dumps(value, indent=2) + '\n')
    temp.chmod(0o600)
    os.replace(temp, path)

def pm2(*args, capture=False):
    return run(['sudo', '-u', 'space', '-H', PM2, *args], cwd='/home/space',
               **({'capture_output': True, 'text': True} if capture else {}))

def as_space(args, cwd, build=False):
    env = {'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': '/home/space', 'USER': 'space'}
    if build:
        env.update(DATABASE_URL='postgresql://build:build@127.0.0.1:1/build',
                   NUXT_SESSION_PASSWORD='build-only-not-used-in-production-000000000',
                   NODE_OPTIONS='--max-old-space-size=4096', LAB_EXPORT_WORKER='0')
    return run(['sudo', '-u', 'space', '-H', 'env', '-i', *[f'{k}={v}' for k,v in env.items()], *args], cwd=cwd)

def release_path(name):
    if not re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}', name):
        raise ValueError('Invalid release ID')
    target = RELEASES / name
    if target.is_symlink() or target.resolve().parent != RELEASES.resolve():
        raise ValueError('Invalid release path')
    return target

def atomic_link(target):
    current = BASE / 'current'
    if current.exists() and not current.is_symlink():
        raise ValueError('current must be a symlink, not a directory')
    temp = BASE / 'current.next'
    if temp.is_symlink(): temp.unlink()
    if temp.exists(): raise ValueError('current.next already exists')
    temp.symlink_to(target)
    os.replace(temp, current)

def prepare(source):
    source = Path(source).resolve()
    # Only the explicitly supplied local repository is trusted; do not change global git config.
    git = ['git', '-c', f'safe.directory={source}', '-C', str(source)]
    if run([*git, 'status', '--porcelain'], capture_output=True, text=True).stdout.strip():
        raise ValueError('Working tree is dirty. Commit the update first; nothing has been built.')
    commit = run([*git, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    name = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ-') + commit[:12]
    target = release_path(name)
    target.mkdir(mode=0o750)
    owner = pwd.getpwnam('space')
    with tempfile.TemporaryFile() as archive:
        run([*git, 'archive', '--format=tar', commit], stdout=archive)
        archive.seek(0)
        with tarfile.open(fileobj=archive) as tar:
            members = tar.getmembers()
            for member in members:
                p = Path(member.name)
                if p.is_absolute() or '..' in p.parts or member.issym() or member.islnk() or not (member.isfile() or member.isdir()):
                    raise ValueError('Unsafe archive entry: ' + member.name)
            for member in members:
                parts = Path(member.name).parts
                if any(x in ('node_modules', '.output', '.nuxt', '.git', 'dist-server') or x == '.env' or x.startswith('.env.') for x in parts): continue
                tar.extract(member, target, filter='data')
    if not (target / 'package-lock.json').is_file():
        raise ValueError(f'{target}: package-lock.json is required. Create and commit it; this incomplete release is not active.')
    if (target / 'public/files').exists():
        raise ValueError('Remove public/files from Git; storage must remain external.')
    for root, dirs, files in os.walk(target):
        os.chown(root, owner.pw_uid, owner.pw_gid)
        for file in files: os.chown(Path(root)/file, owner.pw_uid, owner.pw_gid)
    # No production .env and no app instance is started by this procedure.
    as_space(['/usr/bin/npm', 'ci', '--include=dev'], target, build=True)
    as_space([NODE, 'node_modules/prisma/build/index.js', 'generate'], target, build=True)
    as_space(['/usr/bin/npm', 'run', 'build:ws'], target, build=True)
    as_space(['/usr/bin/npm', 'run', 'build'], target, build=True)
    for f in ('.output/server/index.mjs', 'dist-server/websocket.js', 'scripts/start-space.mjs'):
        if not (target/f).is_file(): raise ValueError('Build artifact missing: ' + f)
    schema_hash = hashlib.sha256((target/'prisma/schema.prisma').read_bytes()).hexdigest()
    # Freeze prepared code. Runtime data must live outside the release directory.
    run(['chown', '-hR', 'root:space', target])
    run(['chmod', '-R', 'g-w,o-rwx', target])
    json_write(target/'release.json', {'id': name, 'commit': commit, 'schemaHash': schema_hash})
    shutil.chown(target/'release.json', group='space')
    (target/'release.json').chmod(0o640)
    print('READY:', name, flush=True)
    print('Next: migrate (if required), then activate ID --db-compatible')

def config_for(target):
    name = target.name
    common = dict(cwd=str(target), interpreter=NODE, node_args=f'--env-file={ENV_FILE}',
                  exec_mode='fork', instances=1, autorestart=True, watch=False,
                  restart_delay=3000, min_uptime='10s', max_restarts=10, kill_timeout=30000, time=True)
    return {'apps': [dict(common, name='space-app', script=str(target/'scripts/start-space.mjs'), env=dict(NODE_ENV='production', HOST='127.0.0.1', PORT='3000', NUXT_HOST='127.0.0.1', NUXT_PORT='3000', SPACE_RELEASE_ID=name, SPACE_LOG_DIR='/var/log/space')),
                     dict(common, name='space-ws', script=str(target/'dist-server/websocket.js'), env=dict(NODE_ENV='production', WS_PORT='5050', SPACE_RELEASE_ID=name, SPACE_LOG_DIR='/var/log/space'))]}

def snapshot():
    processes = json.loads(pm2('jlist', capture=True).stdout)
    apps = []
    for name in NAMES:
        matches = [p for p in processes if p.get('name') == name]
        if len(matches) != 1: raise ValueError(f'Expected exactly one running {name}')
        e = matches[0]['pm2_env']
        if e.get('status') != 'online': raise ValueError(f'{name} is not online')
        # Do not write the PM2 environment dump: it can contain credentials.
        env = {k: str(e[k]) for k in ('NODE_ENV','HOST','PORT','NUXT_HOST','NUXT_PORT','WS_PORT','SPACE_RELEASE_ID','LAB_EXPORT_WORKER','SPACE_LOG_DIR') if k in e}
        apps.append(dict(name=name, cwd=e['pm_cwd'], script=e['pm_exec_path'], interpreter=NODE,
                         node_args=f'--env-file={ENV_FILE}', exec_mode='fork', instances=1,
                         autorestart=True, watch=False, restart_delay=3000, kill_timeout=30000, time=True, env=env))
    return {'apps': apps}

def launch(config):
    path = BASE/'runtime.json'
    json_write(path, config)
    shutil.chown(path, group='space'); path.chmod(0o640)
    # Recreate only these two definitions: PM2 must not retain the previous cwd/script.
    live = json.loads(pm2('jlist', capture=True).stdout)
    for name in NAMES:
        if any(p.get('name') == name for p in live): pm2('delete', name)
    pm2('start', str(path))

def healthy(expected=None):
    for _ in range(30):
        try:
            path = '/api/public/health' if expected else '/'
            with urllib.request.urlopen('http://127.0.0.1:3000'+path, timeout=2) as response:
                if expected and json.load(response).get('release') != expected: raise ValueError('Wrong Nuxt release')
            with urllib.request.urlopen('http://127.0.0.1:5050/health', timeout=2) as response:
                result = json.load(response)
                if not result.get('ok') or (expected and result.get('release') != expected): raise ValueError('Wrong WS release')
            return True
        except Exception: time.sleep(1)
    return False

def restore_previous(journal):
    old_link = journal.get('oldLink')
    if old_link: atomic_link(old_link)
    elif (BASE/'current').is_symlink(): (BASE/'current').unlink()
    launch(journal['oldConfig'])
    if not healthy(journal.get('oldRelease')):
        raise RuntimeError('Previous processes failed health check; pending-switch.json retained. Inspect PM2 logs.')
    pm2('save')
    json_write(STATE, journal.get('oldState') or {'current': None})
    JOURNAL.unlink(missing_ok=True)

def switch(target, compatible):
    if not compatible: raise ValueError('Review DB migrations/backup first, then pass --db-compatible. Code rollback does not undo migrations.')
    manifest = json.loads((target/'release.json').read_text())
    if manifest['id'] != target.name: raise ValueError('Release manifest mismatch')
    if JOURNAL.exists(): raise ValueError('An interrupted switch exists. Use recover before another switch.')
    for artifact in ('.output/server/index.mjs', 'dist-server/websocket.js', 'scripts/start-space.mjs'):
        if not (target/artifact).is_file(): raise ValueError('Incomplete release: ' + artifact)
    logdir = Path('/var/log/space')
    logdir.mkdir(mode=0o750, exist_ok=True)
    shutil.chown(logdir, user='space', group='space')
    old_state = json.loads(STATE.read_text()) if STATE.exists() else {'current': None}
    old_link = str((BASE/'current').resolve()) if (BASE/'current').is_symlink() else None
    old_config = snapshot()
    old_release = old_config['apps'][0].get('env', {}).get('SPACE_RELEASE_ID')
    journal = dict(oldConfig=old_config, oldLink=old_link, oldRelease=old_release, oldState=old_state)
    json_write(JOURNAL, journal)
    try:
        atomic_link(target)
        launch(config_for(target))
        if not healthy(target.name): raise RuntimeError('New release failed readiness check')
        pm2('save')
        json_write(STATE, {'current': target.name, 'previous': journal})
        JOURNAL.unlink()
        print('ACTIVE:', target.name)
    except BaseException:
        print('Switch failed; restoring previous processes.', flush=True)
        restore_previous(journal)
        raise

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('prepare'); p.add_argument('--source', default='/var/www/html/MyPlatform')
    for name in ('activate', 'migrate', 'db-status'):
        p = sub.add_parser(name); p.add_argument('release'); p.add_argument('--db-compatible', action='store_true')
    p = sub.add_parser('rollback'); p.add_argument('--db-compatible', action='store_true')
    sub.add_parser('recover')
    sub.add_parser('status')
    args = parser.parse_args()
    if os.geteuid() != 0: parser.error('Run as root; builds and PM2 execute as space.')
    if not RELEASES.is_dir(): parser.error('Create /var/www/space/releases first.')
    os.chdir('/home/space')
    with (BASE/'deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.command == 'prepare': prepare(args.source)
        elif args.command == 'activate': switch(release_path(args.release), args.db_compatible)
        elif args.command in ('migrate', 'db-status'):
            target = release_path(args.release)
            if not (target/'release.json').is_file(): raise ValueError('Release is not ready')
            as_space([NODE, f'--env-file={ENV_FILE}', 'node_modules/prisma/build/index.js', 'migrate', 'deploy' if args.command == 'migrate' else 'status'], target)
        elif args.command == 'rollback':
            if not args.db_compatible: raise ValueError('Rollback requires --db-compatible after checking schema compatibility')
            state = json.loads(STATE.read_text())
            if JOURNAL.exists(): raise ValueError('Use recover for interrupted switch')
            previous = state.get('previous')
            if not previous: raise ValueError('No previous version recorded')
            json_write(JOURNAL, previous)
            restore_previous(previous)
            print('Previous version restored')
        elif args.command == 'recover':
            if not JOURNAL.exists(): raise ValueError('No interrupted switch to recover')
            restore_previous(json.loads(JOURNAL.read_text()))
        else:
            state = json.loads(STATE.read_text()) if STATE.exists() else {}
            print('current:', state.get('current', 'legacy'))
            print('pending recovery:', JOURNAL.exists())
            print('ready releases:', ', '.join(p.name for p in sorted(RELEASES.iterdir()) if (p/'release.json').is_file()))

if __name__ == '__main__':
    try: main()
    except (Exception, KeyboardInterrupt) as error:
        print(f'FAILED: {type(error).__name__}: {error}', flush=True)
        raise SystemExit(1)
