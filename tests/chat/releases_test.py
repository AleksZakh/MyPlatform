import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('deploy', Path(__file__).resolve().parents[2]/'deploy/releases/space-release.py')
d = importlib.util.module_from_spec(spec); spec.loader.exec_module(d)

class Releases(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d.BASE = Path(self.tmp.name); d.RELEASES = d.BASE/'releases'; d.RELEASES.mkdir()
        d.STATE = d.BASE/'deployment.json'; d.JOURNAL = d.BASE/'pending-switch.json'
        self.old = {'apps': [{'name': 'space-app', 'env': {}}, {'name': 'space-ws', 'env': {}}]}
        self.target = d.RELEASES/'20261007T190000Z-abcdef123456'; self.target.mkdir()
        for name in ('.output/server/index.mjs', 'dist-server/websocket.js', 'scripts/start-space.mjs'):
            p = self.target/name; p.parent.mkdir(parents=True, exist_ok=True); p.touch()
        d.json_write(self.target/'release.json', {'id':self.target.name})
    def tearDown(self): self.tmp.cleanup()
    def test_invalid_release_name(self):
        for value in ('../../etc', 'current', '20261007T190000Z-abcdef123456/../'):
            with self.assertRaises(ValueError): d.release_path(value)
    def test_activation_date_matches_processes_and_survives_snapshot(self):
        config = d.config_for(self.target)
        installed = config['apps'][0]['env']['SPACE_RELEASE_INSTALLED_AT']
        self.assertTrue(installed.endswith('Z'))
        self.assertEqual(config['apps'][1]['env']['SPACE_RELEASE_INSTALLED_AT'], installed)
        processes = [{'name': app['name'], 'pm2_env': {**app['env'], 'status': 'online', 'pm_cwd': app['cwd'], 'pm_exec_path': app['script'], 'SECRET': 'never-export'}} for app in config['apps']]
        from types import SimpleNamespace
        with patch.object(d, 'pm2', return_value=SimpleNamespace(stdout=json.dumps(processes))):
            saved = d.snapshot()
        self.assertEqual(saved['apps'][0]['env']['SPACE_RELEASE_INSTALLED_AT'], installed)
        self.assertNotIn('SECRET', saved['apps'][0]['env'])
    def test_pointer_is_atomic_and_rejects_directory(self):
        d.atomic_link(self.target)
        self.assertEqual((d.BASE/'current').resolve(), self.target)
        (d.BASE/'current').unlink(); (d.BASE/'current').mkdir()
        with self.assertRaises(ValueError): d.atomic_link(self.target)
    def test_switch_failure_restores_legacy_and_keeps_no_new_pointer(self):
        with patch.object(d, 'snapshot', return_value=self.old), patch.object(d, 'launch') as launch, patch.object(d, 'healthy', side_effect=[False,True]), patch.object(d, 'pm2'), patch.object(d.shutil, 'chown'), patch.object(Path, 'mkdir'):
            with self.assertRaises(RuntimeError): d.switch(self.target, True)
        self.assertEqual(launch.call_args.args[0], self.old)
        self.assertFalse((d.BASE/'current').exists()); self.assertFalse(d.JOURNAL.exists())
    def test_success_and_manual_rollback_snapshot(self):
        prior_date = '2026-10-01T09:00:00Z'
        for app in self.old['apps']: app['env']['SPACE_RELEASE_INSTALLED_AT'] = prior_date
        d.json_write(d.STATE, {'current': 'legacy', 'installedAt': prior_date})
        with patch.object(d, 'snapshot', return_value=self.old), patch.object(d, 'launch'), patch.object(d, 'healthy', return_value=True), patch.object(d, 'pm2'), patch.object(d.shutil, 'chown'), patch.object(Path, 'mkdir'):
            d.switch(self.target, True)
            state = json.loads(d.STATE.read_text())
            self.assertEqual(state['current'], self.target.name)
            self.assertTrue(state['installedAt'].endswith('Z'))
            self.assertEqual(state['previous']['oldConfig'], self.old)
            d.restore_previous(state['previous'])
            self.assertEqual(json.loads(d.STATE.read_text())['installedAt'], prior_date)
            self.assertEqual(state['previous']['oldConfig']['apps'][0]['env']['SPACE_RELEASE_INSTALLED_AT'], prior_date)
        self.assertFalse((d.BASE/'current').exists())
    def test_compatibility_required(self):
        with self.assertRaises(ValueError): d.switch(self.target, False)
    def test_unfinished_switch_is_not_overwritten(self):
        d.json_write(d.JOURNAL, {'marker': 'keep'})
        with self.assertRaises(ValueError): d.switch(self.target, True)
        self.assertEqual(json.loads(d.JOURNAL.read_text())['marker'], 'keep')

if __name__ == '__main__': unittest.main()
