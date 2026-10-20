"""Check project switching without cloud access or touching operator state."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
FAKE = r'''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
kind = Path(sys.argv[0]).name
args = sys.argv[1:]
entry = {'tool': kind, 'args': args}
if kind == 'terraform' and args[:2] == ['-chdir=infra', 'plan']:
    entry['inputs'] = {
        k.strip(): json.loads(v)
        for k, v in (line.split('=', 1) for line in Path('infra/terraform.tfvars').read_text().splitlines())
    }
with open(os.environ['BOOTSTRAP_LOG'], 'a') as log:
    log.write(json.dumps(entry) + '\n')
project = os.environ['GCP_PROJECT_ID']
if kind == 'gh' and args[0] == 'api':
    query = args[-1]
    print('owner-id' if '.owner.id' in query else 'repo-id' if query.startswith('.id') else os.environ['GITHUB_REPOSITORY'])
elif kind == 'gcloud':
    if args[:3] == ['billing', 'projects', 'describe']:
        print('True')
    elif args[:3] == ['config', 'get-value', 'account']:
        print('new-user@example.invalid')
    elif args[:2] == ['auth', 'print-access-token']:
        print('test-access-token')
    elif args[:2] == ['auth', 'print-identity-token']:
        print('test-identity-token')
    elif args[:4] == ['artifacts', 'docker', 'images', 'describe']:
        print('sha256:' + 'a' * 64)
    elif args[:3] == ['run', 'services', 'describe']:
        print('https://new-service.run.app')
elif kind == 'terraform':
    if args[1] == 'plan':
        destination = next(a.split('=', 1)[1] for a in args if a.startswith('-out='))
        Path(args[0].split('=', 1)[1], destination).touch()
    elif args[1] == 'output':
        values = {
            'builder_service_account': f'clarity-builder@{project}.iam.gserviceaccount.com',
            'deployer_service_account': f'clarity-deployer@{project}.iam.gserviceaccount.com',
            'workload_identity_provider': 'projects/123/locations/global/workloadIdentityPools/clarity-github/providers/github',
        }
        print(values[args[-1]])
elif kind == 'curl':
    if os.environ.get('FAIL_HEALTH') == 'true':
        sys.exit(22)
    print('{"status":"ok"}')
'''


class Bootstrap(unittest.TestCase):
    def run_bootstrap(self, zone='us-central1-c', fail_health=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            (root / 'infra/bootstrap').mkdir(parents=True)
            shutil.copy(ROOT / 'scripts/bootstrap-cloud.sh', root / 'scripts')
            (root / 'infra/terraform.tfvars').write_text(
                'project_id = "old-project"\nregion = "europe-west1"\n'
                'app_image = "old-registry/app:old"\n'
            )
            bin_dir = root / 'bin'
            bin_dir.mkdir()
            for name in ['gcloud', 'gh', 'terraform', 'node', 'curl']:
                tool = bin_dir / name
                tool.write_text(FAKE)
                tool.chmod(0o755)
            log = root / 'commands.jsonl'
            log.touch()
            env = {
                **os.environ,
                'PATH': str(bin_dir) + os.pathsep + os.environ['PATH'],
                'BOOTSTRAP_LOG': str(log),
                'GCP_PROJECT_ID': 'new-lab-project',
                'GCP_REGION': 'us-central1',
                'GCP_ZONE': zone,
                'GEMINI_MODEL': 'test-model',
                'GEMINI_LOCATION': 'global',
                'GITHUB_REPOSITORY': 'example/app',
                'TERRAFORM': 'terraform',
                'FAIL_HEALTH': str(fail_health).lower(),
            }
            env.pop('VIEWER_MEMBER', None)
            result = subprocess.run(
                ['bash', str(root / 'scripts/bootstrap-cloud.sh')],
                env=env, capture_output=True, text=True,
            )
            return result, [json.loads(line) for line in log.read_text().splitlines()]

    def test_switch_uses_new_state_and_inputs_before_planning(self):
        result, calls = self.run_bootstrap()
        self.assertEqual(result.returncode, 0, result.stderr)
        inits = [c for c in calls if c['tool'] == 'terraform' and c['args'][1] == 'init']
        self.assertEqual(len(inits), 2)
        for call in inits:
            self.assertIn('-reconfigure', call['args'])
            self.assertIn('-backend-config=bucket=new-lab-project-clarity-tfstate', call['args'])
            self.assertNotIn('-migrate-state', call['args'])
        planned = next(c['inputs'] for c in calls if 'inputs' in c)
        self.assertEqual(planned['project_id'], 'new-lab-project')
        self.assertEqual(planned['region'], 'us-central1')
        self.assertEqual(planned['zone'], 'us-central1-c')
        self.assertEqual(planned['gemini_location'], 'global')
        self.assertTrue(planned['app_image'].startswith('us-central1-docker.pkg.dev/new-lab-project/'))
        health = next(i for i, c in enumerate(calls) if c['tool'] == 'curl')
        writes = [i for i, c in enumerate(calls) if c['tool'] == 'gh' and c['args'][0] == 'variable']
        self.assertEqual(len(writes), 5)
        self.assertTrue(all(i > health for i in writes))

    def test_failed_health_does_not_switch_ci_target(self):
        result, calls = self.run_bootstrap(fail_health=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(c['tool'] == 'gh' and c['args'][0] == 'variable' for c in calls))

    def test_rejects_zone_outside_target_region_before_cloud_calls(self):
        result, calls = self.run_bootstrap(zone='europe-west1-b')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(calls, [])


if __name__ == '__main__':
    unittest.main()
