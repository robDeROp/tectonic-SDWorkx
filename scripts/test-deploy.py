"""Exercise release ordering and failure recovery without cloud credentials."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
FAKE = r'''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
args = sys.argv[1:]
kind = Path(sys.argv[0]).name
with open(os.environ['DEPLOY_LOG'], 'a') as log:
    log.write(json.dumps([kind, *args]) + '\n')
mode = os.environ['FAIL_MODE']
if kind == 'curl':
    url = args[-1]
    if mode == 'candidate-app' and 'candidate' in url and url.endswith('/api/tickets'):
        sys.exit(22)
    if (mode == 'candidate' and 'candidate' in url) or (mode == 'live' and 'candidate' not in url):
        sys.exit(22)
    print('[]' if url.endswith('/api/tickets') else '{"status":"ok"}')
elif args[:3] == ['run', 'services', 'describe']:
    if '--format=json' in args:
        print(json.dumps({'status': {'traffic': [
            {'revisionName': 'clarity-old', 'percent': 100},
            {'revisionName': 'clarity-release', 'tag': 'candidate', 'url': 'https://candidate.run.app'}
        ]}}))
    else:
        print('https://service.run.app')
elif args[:3] == ['run', 'jobs', 'execute'] and mode == 'migration':
    sys.exit(1)
elif args[:2] == ['auth', 'print-identity-token']:
    print('test-token')
elif args[:3] == ['run', 'services', 'update-traffic'] and '--to-revisions=clarity-release=100' in args and mode == 'promotion':
    sys.exit(1)
'''

class Deployment(unittest.TestCase):
    def run_release(self, failure='none', image=None):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            log = folder / 'log'
            log.touch()
            for name in ['gcloud', 'curl']:
                tool = folder / name
                tool.write_text(FAKE)
                tool.chmod(0o755)
            env = {**os.environ, 'PATH': directory + os.pathsep + os.environ['PATH'],
                   'DEPLOY_LOG': str(log), 'FAIL_MODE': failure,
                   'GCP_PROJECT_ID': 'test-project', 'GCP_REGION': 'europe-west1',
                   'GCP_DEPLOY_SERVICE_ACCOUNT': 'deploy@test-project.iam.gserviceaccount.com',
                   'APP_IMAGE': image or 'registry/app@sha256:' + 'a' * 64,
                   'TOOLS_IMAGE': 'registry/tools@sha256:' + 'b' * 64,
                   'RELEASE_ID': 'release'}
            env.pop('GITHUB_STEP_SUMMARY', None)
            result = subprocess.run(['bash', str(ROOT / 'scripts/deploy.sh')], env=env, capture_output=True, text=True)
            commands = [json.loads(line) for line in log.read_text().splitlines()]
            return result, commands

    def test_success_migrates_before_release_and_checks_before_promotion(self):
        result, calls = self.run_release()
        self.assertEqual(result.returncode, 0, result.stderr)
        migrate = next(i for i,c in enumerate(calls) if c[1:4] == ['run','jobs','execute'])
        deploy = next(i for i,c in enumerate(calls) if c[1:3] == ['run','deploy'])
        candidate = next(i for i,c in enumerate(calls) if c[0] == 'curl')
        promote = next(i for i,c in enumerate(calls) if '--to-revisions=clarity-release=100' in c)
        self.assertLess(migrate, deploy)
        self.assertLess(deploy, candidate)
        self.assertLess(candidate, promote)
        self.assertEqual(calls[-1][-1], 'https://service.run.app/api/tickets')

    def test_failed_migration_keeps_existing_release(self):
        result, calls = self.run_release('migration')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(c[1:3] == ['run', 'deploy'] for c in calls))

    def test_failed_candidate_never_receives_traffic(self):
        result, calls = self.run_release('candidate')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any('--to-revisions=clarity-release=100' in c for c in calls))

    def test_healthy_probe_cannot_hide_broken_application_routes(self):
        result, calls = self.run_release('candidate-app')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any('--to-revisions=clarity-release=100' in c for c in calls))

    def test_failure_after_promotion_restores_previous_revision(self):
        for failure in ['live', 'promotion']:
            with self.subTest(failure=failure):
                result, calls = self.run_release(failure)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('--to-revisions=clarity-old=100', calls[-1])

    def test_rejects_mutable_images_before_cloud_calls(self):
        result, calls = self.run_release(image='registry/app:latest')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(calls, [])

if __name__ == '__main__':
    unittest.main()
