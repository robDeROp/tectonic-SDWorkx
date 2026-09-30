#!/usr/bin/env python3
"""Validate a deployed private Clarity service with one clearly marked test ticket.

Requires gcloud login and service invocation permission. Creates synthetic data;
never changes existing tickets. Exits 2 if any check fails (including blocked AI).
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import time
import uuid

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--project', required=True)
parser.add_argument('--region', default='europe-west1')
parser.add_argument('--report', default='.data/cloud-validation.json')
args = parser.parse_args()
report = {'project': args.project, 'checkedAt': datetime.now(timezone.utc).isoformat(), 'checks': []}


def gcloud(*command):
    return subprocess.check_output(['gcloud', *command, '--project=' + args.project], text=True).strip()


def record(name, passed, detail=''):
    report['checks'].append({'name': name, 'passed': bool(passed), 'detail': detail})
    print(('PASS' if passed else 'FAIL') + ': ' + name + (' — ' + detail if detail else ''), flush=True)


def request(path, body=None, authorized=True, form=None):
    command = ['curl', '--silent', '--show-error', '--max-time', '45', '--write-out', '\n%{http_code}']
    if authorized:
        command += ['-H', 'Authorization: Bearer ' + token]
    if form:
        command += form
    elif body is not None:
        command += ['-H', 'Content-Type: application/json', '--data-binary', '@-']
    result = subprocess.run(command + [url + path], input=json.dumps(body) if body is not None else None,
                            capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError("HTTP transport failed")
    content, status = result.stdout.rsplit('\n', 1)
    try:
        content = json.loads(content)
    except json.JSONDecodeError:
        content = None
    return int(status), content


def wait_job(ticket, job_id=None):
    for _ in range(60):
        status, detail = request('/api/tickets/' + ticket)
        if status != 200:
            raise RuntimeError('Ticket cannot be read')
        jobs = detail['jobs']
        job = next((j for j in jobs if j['id'] == job_id), None) if job_id else (jobs[0] if jobs else None)
        if job and (job['state'] in ['done', 'failed', 'obsolete'] or job.get('dispatchError')):
            return detail, job
        time.sleep(5)
    raise RuntimeError('Background job did not finish within five minutes')


try:
    url = gcloud('run', 'services', 'describe', 'clarity', '--region=' + args.region, '--format=value(status.url)')
    report['url'] = url
    service = json.loads(gcloud('run', 'services', 'describe', 'clarity', '--region=' + args.region, '--format=json'))
    env = {entry['name']: entry.get('value') for entry in service['spec']['template']['spec']['containers'][0]['env']}
    record('Cloud backends configured', env.get('TASK_BACKEND') == 'cloud-tasks' and env.get('STORAGE_BACKEND') == 'gcs')
    policy = json.loads(gcloud('run', 'services', 'get-iam-policy', 'clarity', '--region=' + args.region, '--format=json'))
    public = {'allUsers', 'allAuthenticatedUsers'}
    record('No public Cloud Run IAM bindings', not any(public.intersection(b.get('members', [])) for b in policy.get('bindings', [])))
    instance = json.loads(gcloud('sql', 'instances', 'describe', 'clarity-postgres', '--format=json'))
    settings = instance['settings']
    record('PostgreSQL running with protected backups', instance['state'] == 'RUNNABLE' and settings.get('deletionProtectionEnabled') and settings['backupConfiguration'].get('enabled') and settings['backupConfiguration'].get('pointInTimeRecoveryEnabled'))
    record('No open SQL authorized networks', not settings['ipConfiguration'].get('authorizedNetworks'))
    for suffix in ['tfstate', 'documents']:
        bucket = json.loads(gcloud('storage', 'buckets', 'describe', 'gs://' + args.project + '-clarity-' + suffix, '--format=json'))
        record('Private ' + suffix + ' bucket', bucket.get('public_access_prevention') == 'enforced' and bucket.get('uniform_bucket_level_access'))
        if suffix == 'tfstate':
            record('Terraform state version history', bucket.get('versioning_enabled'))
    versions = json.loads(gcloud('secrets', 'versions', 'list', 'clarity-database-url', '--format=json'))
    record('Database secret has an enabled version', any(v.get('state') == 'ENABLED' for v in versions))
    queue = json.loads(gcloud('tasks', 'queues', 'describe', 'ticket-reviews', '--location=' + args.region, '--format=json'))
    record('Cloud Tasks queue running', queue.get('state') == 'RUNNING')
    token = gcloud('auth', 'print-identity-token')
    status, _ = request('/api/health', authorized=False)
    record('Anonymous requests are rejected', status in [401, 403], 'HTTP ' + str(status))
    status, health = request('/api/health')
    record('Cloud Run connects to migrated PostgreSQL', status == 200 and health == {'status': 'ok'})
    status, _ = request('/api/internal/tasks', {'jobId': str(uuid.uuid4())})
    record('Human identity cannot impersonate task worker', status in [401, 403])
    status, result = request('/api/tickets', {
        'customer': 'GCP validatie', 'company': 'Fictieve testorganisatie', 'email': 'validation@example.invalid',
        'subject': 'GCP validatieticket ' + report['checkedAt'],
        'question': 'Fictieve Belgische bediende verlaat het bedrijf. Welke loon- en vakantiegegevens zijn nodig voor de eindafrekening en het vakantieattest?',
    })
    if status != 200:
        raise RuntimeError('Synthetic ticket creation failed: HTTP ' + str(status))
    ticket = result['id']
    report['ticketId'] = ticket
    record('Ticket creation and persistence', True, ticket)
    detail, job = wait_job(ticket)
    record('Cloud Tasks dispatch and authenticated processing', job['state'] in ['done', 'failed'] and not job.get('dispatchError'), job['state'])
    record('Real Gemini document assessment', job['state'] == 'done' and len(detail['documents']) >= 3 and all(d['assessment'] for d in detail['documents']), job.get('error') or '')
    # A successful upload requires the app service identity to persist an object in GCS.
    marker = str(uuid.uuid4())
    upload = Path('.data') / ('gcp-validation-' + marker + '.txt')
    upload.parent.mkdir(parents=True, exist_ok=True)
    upload.write_text('FICTIEF VALIDATIEDOCUMENT. Vraag loonhistoriek, vakantiedagen en reeds betaald vakantiegeld op. Bezorg een vakantieattest. Testreferentie: ' + marker)
    try:
        status, _ = request('/api/tickets/' + ticket + '/upload', form=['-F', 'kind=Intern', '-F', 'file=@' + str(upload)])
        record('Upload through app to private Cloud Storage', status == 200)
    finally:
        upload.unlink(missing_ok=True)
    detail, upload_job = wait_job(ticket)
    record('Uploaded text persists in PostgreSQL', any(marker in d['content'] for d in detail['documents']))
    record('Real Gemini reassessment after upload', upload_job['state'] == 'done', upload_job.get('error') or '')
    if upload_job['state'] == 'done':
        status, draft = request('/api/tickets/' + ticket + '/draft', {'version': detail['ticket']['answerVersion']})
        if status != 200:
            raise RuntimeError('Draft request rejected')
        detail, draft_job = wait_job(ticket, draft['jobId'])
        record('Real Gemini draft', draft_job['state'] == 'done' and bool(detail['ticket']['answer']))
        if draft_job['state'] == 'done':
            status, review = request('/api/tickets/' + ticket + '/review', {'version': detail['ticket']['answerVersion']})
            if status != 200:
                raise RuntimeError('Review request rejected')
            detail, review_job = wait_job(ticket, review['jobId'])
            record('Real Gemini answer review', review_job['state'] == 'done', (review_job.get('result') or {}).get('verdict', ''))
    else:
        record('Real Gemini draft and review', False, 'Blocked by unsuccessful document assessment; no mock AI used')
except Exception as error:
    record('Validation completed', False, type(error).__name__ + ': ' + str(error))
finally:
    destination = Path(args.report)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print('Report: ' + str(destination.resolve()), flush=True)
raise SystemExit(0 if report['checks'] and all(c['passed'] for c in report['checks']) else 2)
