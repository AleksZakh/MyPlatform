import importlib.util
import json
import os
from pathlib import Path
import tempfile
import time
import unittest
import fcntl
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('disk_report', Path(__file__).resolve().parents[2]/'deploy/disk/space-disk-report.py')
reporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reporter)


class DiskReportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.base = self.root/'space';self.releases=self.base/'releases';self.releases.mkdir(parents=True)
        self.pm2=self.root/'pm2';self.pm2.mkdir()
        self.logs=self.root/'logs';self.logs.mkdir()
        self.proc=self.root/'proc';self.proc.mkdir()
        self.names=[f'202610{n:02d}T120000Z-123456789abc' for n in range(1,11)]
        for name in self.names:
            (self.releases/name).mkdir()
            (self.releases/name/'file').write_bytes(b'a'*4096)
        (self.base/'deploy.lock').touch()
        (self.base/'current').symlink_to(self.releases/self.names[0])
        self.state={'current':self.names[0], 'previous':{'oldRelease':self.names[1], 'oldConfig':{'apps':[{'cwd':str(self.releases/self.names[2])}]}}}
        (self.base/'deployment.json').write_text(json.dumps(self.state))
        (self.pm2/'dump.pm2').write_text(json.dumps([{'pm_cwd':str(self.releases/self.names[3])}]))
        (self.pm2/'dump.pm2.bak').write_text(json.dumps([{'pm_cwd':str(self.releases/self.names[4])}]))
        self.now=time.time()
        for name in ['combined.log','combined.log.1','error.log.2.gz','space-out__2026-09-01_00-00-00.log']:
            p=self.logs/name;p.write_bytes(b'x'*4096);os.utime(p,(self.now-40*86400,self.now-40*86400))
        (self.logs/'fresh.log.1').write_text('new')

    def tearDown(self):self.temp.cleanup()
    def scan(self,**kwargs):return reporter.inspect(self.base,[self.logs],self.pm2,self.proc,now=self.now,**kwargs)

    def test_preserves_current_previous_saved_processes_latest_and_never_deletes(self):
        before=list(self.releases.iterdir())
        report=self.scan()
        self.assertEqual(report['status'],'complete')
        candidates=[Path(x['path']).name for x in report['items'] if x['category']=='release' and x['status']=='candidate']
        self.assertEqual(candidates,self.names[5:7])
        self.assertEqual(before,list(self.releases.iterdir()))
        self.assertEqual(report['candidateBytes'],sum(x['reclaimable'] for x in report['items']))

    def test_active_process_release_and_open_rotated_log_are_protected(self):
        process=self.proc/'123';(process/'fd').mkdir(parents=True)
        (process/'cwd').symlink_to(self.releases/self.names[5])
        (process/'cmdline').write_bytes(b'/usr/bin/node\0')
        (process/'fd/1').symlink_to(self.logs/'combined.log.1')
        items={x['path']:x for x in self.scan()['items']}
        self.assertEqual(items[str(self.releases/self.names[5])]['status'],'protected')
        self.assertEqual(items[str(self.logs/'combined.log.1')]['status'],'protected')
        self.assertEqual(items[str(self.logs/'combined.log')]['status'],'protected')
        self.assertEqual(items[str(self.logs/'fresh.log.1')]['status'],'protected')
        self.assertEqual(items[str(self.logs/'error.log.2.gz')]['status'],'candidate')

    def test_missing_metadata_never_produces_release_candidates(self):
        (self.base/'deployment.json').write_text('{invalid')
        report=self.scan();self.assertEqual(report['status'],'partial')
        self.assertFalse(any(x['category']=='release' and x['status']=='candidate' for x in report['items']))

    def test_deployment_lock_and_pending_switch(self):
        with (self.base/'deploy.lock').open() as lock:
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            report=self.scan();self.assertEqual(report['status'],'busy');self.assertEqual(report['items'],[])
        (self.base/'pending-switch.json').write_text('{}')
        self.assertEqual(self.scan()['status'],'busy')

    def test_no_symlink_traversal_or_hardlink_reclaim(self):
        outside=self.root/'secret';outside.mkdir();(outside/'private').write_bytes(b'x'*1024*1024)
        (self.releases/self.names[5]/'outside').symlink_to(outside)
        os.link(self.releases/self.names[5]/'file',outside/'shared')
        items={x['path']:x for x in self.scan()['items']}
        candidate=items[str(self.releases/self.names[5])]
        self.assertLess(candidate['bytes'],1024*1024)
        self.assertLess(candidate['reclaimable'],candidate['bytes'])
        with self.assertRaises(OSError):reporter.open_fixed(self.releases/self.names[5]/'outside/private',os.O_RDONLY)

    def test_budget_and_rows_report_partial_not_zero_complete(self):
        report=self.scan(budget=reporter.Budget(entries=0))
        self.assertEqual(report['status'],'partial')
        self.assertTrue(report['warnings'])

    def test_unreadable_processes_disable_all_candidates(self):
        with patch.object(reporter,'live_references',return_value=([],set(),False)):
            report=self.scan()
        self.assertEqual(report['status'],'partial')
        self.assertEqual(report['candidateBytes'],0)
        self.assertFalse(any(x['status']=='candidate' for x in report['items']))

    def test_open_release_file_protects_release_even_with_other_cwd(self):
        process=self.proc/'456';(process/'fd').mkdir(parents=True)
        (process/'cwd').symlink_to(self.root)
        (process/'cmdline').write_bytes(b'/usr/bin/node\0')
        (process/'fd/4').symlink_to(self.releases/self.names[5]/'file')
        archived=self.logs/'combined.log-20260901.gz';archived.write_text('old')
        os.utime(archived,(self.now-40*86400,self.now-40*86400))
        items={x['path']:x for x in self.scan()['items']}
        self.assertEqual(items[str(self.releases/self.names[5])]['status'],'protected')
        self.assertEqual(items[str(archived)]['status'],'candidate')


if __name__=='__main__':unittest.main()
