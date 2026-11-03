#!/usr/bin/python3 -I
"""Fixed-scope, read-only disk inspection. No command arguments or deletion API."""
import datetime as dt
import errno
import fcntl
import json
import os
from pathlib import Path
import re
import stat
import sys
import time

RELEASE = re.compile(r'\d{8}T\d{6}Z-[a-f0-9]{12}')
ROTATED = re.compile(r'(?:\.log\.\d+(?:\.gz)?$|\.log[-.]\d{8}(?:\.gz)?$|(?:__|[-.])\d{4}[-_]\d{2}[-_]\d{2}.*\.log(?:\.gz)?$)')
DIR_FLAGS = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
MAX_ROWS = 300


def open_fixed(path, flags, mode=0o600):
    """Reject symlinks in every component of a fixed administrative path."""
    path = Path(path)
    if not path.is_absolute() or '..' in path.parts:
        raise ValueError('Expected absolute path')
    parent = os.open('/', DIR_FLAGS)
    try:
        for part in path.parts[1:-1]:
            child = os.open(part, DIR_FLAGS, dir_fd=parent)
            os.close(parent)
            parent = child
        return os.open(path.name, flags | os.O_NOFOLLOW | os.O_CLOEXEC, mode, dir_fd=parent)
    finally:
        os.close(parent)


class Limit(Exception):
    pass


class Budget:
    def __init__(self, seconds=25, entries=250000):
        self.deadline = time.monotonic() + seconds
        self.left = entries

    def tick(self):
        self.left -= 1
        if self.left < 0 or time.monotonic() > self.deadline:
            raise Limit()


def json_file(path):
    fd = open_fixed(path, os.O_RDONLY)
    with os.fdopen(fd) as stream:
        if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
            raise ValueError('Not a regular metadata file')
        raw = stream.read(2 * 1024 * 1024 + 1)
        if len(raw) > 2 * 1024 * 1024:
            raise ValueError('Metadata too large')
        return json.loads(raw)


def measure(parent_fd, name, budget):
    """Use directory descriptors, never follow symlinks or cross filesystems."""
    size = reclaimable = 0
    complete = True
    seen = set()
    fd = os.open(name, DIR_FLAGS, dir_fd=parent_fd)
    device = os.fstat(fd).st_dev

    def visit(directory):
        nonlocal size, reclaimable, complete
        info = os.fstat(directory)
        size += info.st_blocks * 512
        reclaimable += info.st_blocks * 512
        with os.scandir(directory) as entries:
            for entry in entries:
                budget.tick()
                try:
                    item = os.stat(entry.name, dir_fd=directory, follow_symlinks=False)
                    if item.st_dev != device:
                        complete = False
                    elif stat.S_ISDIR(item.st_mode):
                        child = os.open(entry.name, DIR_FLAGS, dir_fd=directory)
                        try:
                            if os.fstat(child).st_dev == device:
                                visit(child)
                            else:
                                complete = False
                        finally:
                            os.close(child)
                    elif stat.S_ISREG(item.st_mode):
                        key = (item.st_dev, item.st_ino)
                        if key not in seen:
                            seen.add(key)
                            size += item.st_blocks * 512
                            # Shared hard links cannot be counted as freed space.
                            if item.st_nlink == 1:
                                reclaimable += item.st_blocks * 512
                    elif not stat.S_ISLNK(item.st_mode):
                        complete = False
                except OSError:
                    complete = False
    try:
        visit(fd)
    finally:
        os.close(fd)
    return size, reclaimable, complete


def live_references(proc, budget):
    """Read paths/inodes only, never process environments or log contents."""
    paths, opened = [], set()
    reliable = True
    for process in proc.iterdir():
        if not process.name.isdigit():
            continue
        budget.tick()
        try:
            paths.append(os.readlink(process / 'cwd'))
            # Scripts may use a release path while cwd is elsewhere.
            with (process / 'cmdline').open('rb') as stream:
                paths.extend(x.decode('utf-8', 'replace') for x in stream.read(65536).split(b'\0') if x.startswith(b'/'))
            for handle in (process / 'fd').iterdir():
                budget.tick()
                try:
                    info = handle.stat()
                    opened.add((info.st_dev, info.st_ino))
                    target = os.readlink(handle)
                    if target.startswith('/'):
                        paths.append(target)
                except OSError as error:
                    if error.errno not in (errno.ENOENT, errno.ESRCH):
                        reliable = False
        except OSError as error:
            if error.errno not in (errno.ENOENT, errno.ESRCH):
                reliable = False
    return paths, opened, reliable


def inspect(base, log_dirs, pm2_dir, proc=Path('/proc'), budget=None, now=None):
    started = time.monotonic()
    budget = budget or Budget()
    now = now or time.time()
    report = dict(version=1, status='complete', checkedAt=dt.datetime.fromtimestamp(now, dt.timezone.utc).isoformat(),
                  durationMs=0, candidateBytes=0, items=[], warnings=[], policy=dict(keepLatest=3, logDays=30))
    locks = []
    def warn(message):
        report['status'] = 'partial'
        if message not in report['warnings']:
            report['warnings'].append(message)
    def add(path, category, status, size, reclaimable, reason, modified):
        if len(report['items']) >= MAX_ROWS:
            raise Limit()
        report['items'].append(dict(path=str(path), category=category, status=status, bytes=size,
                                   reclaimable=reclaimable if status == 'candidate' else 0, reason=reason,
                                   modifiedAt=dt.datetime.fromtimestamp(modified, dt.timezone.utc).isoformat() if modified else None))
    try:
        # Same deployment lock as prepare/activate and the manual cleanup script.
        for path, mode, flags in [(base/'deploy.lock', fcntl.LOCK_SH, os.O_RDONLY),
                                  (base/'disk-scan.lock', fcntl.LOCK_EX, os.O_RDWR | os.O_CREAT)]:
            fd = open_fixed(path, flags)
            locks.append(fd)
            fcntl.flock(fd, mode | fcntl.LOCK_NB)
        if os.path.lexists(base/'pending-switch.json'):
            report['status'] = 'busy'
            report['warnings'].append('Есть незавершённое переключение версии. Проверка релизов отложена.')
            return report
        releases = base/'releases'
        protected = {}
        def protect(value, reason):
            if not isinstance(value, str):
                return
            if RELEASE.fullmatch(value):
                protected[value] = reason
            elif value.startswith(str(releases) + '/'):
                name = value[len(str(releases)) + 1:].split('/')[0]
                if RELEASE.fullmatch(name):
                    protected[name] = reason
        def apps(values):
            for app in values:
                env = app.get('pm2_env', app)
                for key in ('cwd', 'script', 'pm_cwd', 'pm_exec_path', 'SPACE_RELEASE_ID'):
                    protect(env.get(key), 'Версия сохранена в конфигурации процессов')
                protect(env.get('env', {}).get('SPACE_RELEASE_ID'), 'Версия сохранена в конфигурации процессов')
        metadata_ok = True
        try:
            state = json_file(base/'deployment.json')
            if not (base/'current').is_symlink():
                raise ValueError('Missing current')
            current = (base/'current').resolve(strict=True)
            if current.parent != releases.resolve() or not RELEASE.fullmatch(current.name):
                raise ValueError('Unexpected current')
            protect(str(current), 'Текущая версия')
            if not RELEASE.fullmatch(str(state.get('current', ''))):
                raise ValueError('Invalid deployment metadata')
            protect(state.get('current'), 'Текущая версия по журналу развёртывания')
            previous = state.get('previous') or {}
            protect(previous.get('oldRelease'), 'Предыдущая версия для отката')
            protect(previous.get('oldLink'), 'Предыдущая версия для отката')
            apps(previous.get('oldConfig', {}).get('apps', []))
            for filename in ('dump.pm2', 'dump.pm2.bak'):
                if os.path.lexists(pm2_dir/filename):
                    apps(json_file(pm2_dir/filename))
            # The saved process list is required to confirm safe release candidates.
            if not (pm2_dir/'dump.pm2').is_file():
                raise ValueError('No saved PM2 state')
        except (OSError, ValueError, TypeError, AttributeError, KeyError):
            metadata_ok = False
            warn('Не удалось полностью проверить current, журнал развёртывания или сохранённые процессы. Релизы требуют ручной проверки.')
        paths, opened, live_ok = live_references(proc, budget)
        for path in paths:
            protect(path, 'Версия используется процессом')
        if not live_ok:
            warn('Не удалось проверить все процессы. Оценка кандидатов отключена.')
        with os.scandir(releases) as entries:
            names = []
            for entry in entries:
                budget.tick()
                if RELEASE.fullmatch(entry.name) and entry.is_dir(follow_symlinks=False):
                    names.append(entry.name)
        for name in sorted(names)[-3:]:
            protected.setdefault(name, 'Одна из трёх последних версий')
        root_fd = open_fixed(releases, DIR_FLAGS)
        try:
            for name in sorted(names, key=lambda n: (n in protected, n)):
                budget.tick()
                info = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
                reason = protected.get(name)
                if reason:
                    add(releases/name, 'release', 'protected', None, 0, reason, info.st_mtime)
                    continue
                if not metadata_ok or not live_ok:
                    add(releases/name, 'release', 'review', None, 0, 'Не подтверждено, что версия больше не используется', info.st_mtime)
                    continue
                size, reclaimable, complete = measure(root_fd, name, budget)
                add(releases/name, 'release', 'candidate' if complete else 'review', size, reclaimable,
                    'Устаревшая версия вне защищённого набора' if complete else 'Размер определён частично; нужна ручная проверка', info.st_mtime)
                if not complete:
                    warn('Часть каталогов недоступна или содержит отдельную файловую систему.')
        finally:
            os.close(root_fd)
        for directory in log_dirs:
            try:
                fd = open_fixed(directory, DIR_FLAGS)
                try:
                    with os.scandir(fd) as entries:
                        for entry in entries:
                            budget.tick()
                            info = os.stat(entry.name, dir_fd=fd, follow_symlinks=False)
                            if not stat.S_ISREG(info.st_mode):
                                continue
                            rotated = bool(ROTATED.search(entry.name))
                            old = now - info.st_mtime >= 30 * 86400
                            in_use = (info.st_dev, info.st_ino) in opened
                            eligible = rotated and old and not in_use and live_ok and info.st_nlink == 1
                            reason = ('Архивный лог старше 30 дней' if eligible else
                                      'Файл открыт процессом' if in_use else
                                      'Лог младше 30 дней' if rotated and not old else
                                      'Требуется ручная проверка' if rotated else 'Текущий лог или файл без признаков ротации')
                            add(directory/entry.name, 'log', 'candidate' if eligible else 'protected' if in_use or not rotated or not old else 'review',
                                info.st_blocks * 512, info.st_blocks * 512, reason, info.st_mtime)
                finally:
                    os.close(fd)
            except FileNotFoundError:
                warn('Каталог логов не найден: ' + str(directory))
            except OSError:
                warn('Каталог логов недоступен: ' + str(directory))
    except BlockingIOError:
        report['status'] = 'busy'
        report['warnings'].append('Сейчас выполняется развёртывание, очистка или другая проверка. Повторите позже.')
    except Limit:
        warn('Достигнут лимит времени, файлов или строк отчёта. Показана только проверенная часть.')
    except (OSError, ValueError, TypeError, AttributeError):
        warn('Не удалось завершить проверку системных каталогов. Оценка неполная.')
    finally:
        for fd in reversed(locks):
            os.close(fd)
        report['durationMs'] = round((time.monotonic() - started) * 1000)
        report['candidateBytes'] = sum(item['reclaimable'] for item in report['items'])
    return report


if __name__ == '__main__':
    if len(sys.argv) != 1 or os.geteuid() != 0:
        raise SystemExit('Run the installed helper through the configured sudo rule, without arguments.')
    result = inspect(Path('/var/www/space'), [Path('/var/log/space'), Path('/home/space/.pm2/logs')], Path('/home/space/.pm2'))
    print(json.dumps(result, ensure_ascii=True, separators=(',', ':')))
