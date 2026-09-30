#!/usr/bin/env bash
# Usage: GCP_PROJECT_ID=... GEMINI_MODEL=... bash scripts/bootstrap-cloud.sh
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
: "${GCP_PROJECT_ID:?Set the target Google Cloud project ID}"
: "${GEMINI_MODEL:?Set a Gemini model available in GCP_REGION}"
GCP_REGION="${GCP_REGION:-europe-west1}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-robDeROp/tectonic-SDWorkx}"
TERRAFORM="${TERRAFORM:-terraform}"
[[ "$GCP_PROJECT_ID" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || { echo 'Invalid project ID' >&2; exit 1; }
[[ "$GCP_REGION" =~ ^[a-z]+-[a-z]+[0-9]+$ ]] || { echo 'Invalid region' >&2; exit 1; }
[[ "$GITHUB_REPOSITORY" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || exit 1
for command in gcloud gh python3 "$TERRAFORM"; do command -v "$command" >/dev/null; done
gh auth status
gh api "repos/$GITHUB_REPOSITORY" --jq 'select(.permissions.push == true) | .full_name' | grep -Fx "$GITHUB_REPOSITORY" >/dev/null || { echo 'GitHub repository write access is required to configure deployment.' >&2; exit 1; }
gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectId)'
[[ "$(gcloud billing projects describe "$GCP_PROJECT_ID" --format='value(billingEnabled)')" == True ]] || { echo 'Billing must be enabled on the chosen project.' >&2; exit 1; }
account="$(gcloud config get-value account 2>/dev/null)"
VIEWER_MEMBER="${VIEWER_MEMBER:-user:${account}}"
export TF_VAR_project_id="$GCP_PROJECT_ID" TF_VAR_region="$GCP_REGION"
export TF_VAR_github_repository="$GITHUB_REPOSITORY"
TF_VAR_github_repository_id="$(gh api "repos/$GITHUB_REPOSITORY" --jq '.id|tostring')"
TF_VAR_github_owner_id="$(gh api "repos/$GITHUB_REPOSITORY" --jq '.owner.id|tostring')"
export TF_VAR_github_repository_id TF_VAR_github_owner_id
refresh_credentials() {
  GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
  export GOOGLE_OAUTH_ACCESS_TOKEN
}
refresh_credentials
# The backend bucket must exist before either Terraform root can initialize.
state_bucket="${GCP_PROJECT_ID}-clarity-tfstate"
gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com storage.googleapis.com --project="$GCP_PROJECT_ID"
if ! gcloud storage buckets describe "gs://${state_bucket}" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${state_bucket}" --project="$GCP_PROJECT_ID" --location="$GCP_REGION" --uniform-bucket-level-access --public-access-prevention
fi
gcloud storage buckets update "gs://${state_bucket}" --versioning --public-access-prevention --uniform-bucket-level-access --quiet
"$TERRAFORM" -chdir=infra/bootstrap init -input=false -backend-config="bucket=$state_bucket" -backend-config='prefix=clarity/bootstrap'
"$TERRAFORM" -chdir=infra/bootstrap plan -input=false -out=bootstrap.tfplan
"$TERRAFORM" -chdir=infra/bootstrap apply -input=false bootstrap.tfplan
rm infra/bootstrap/bootstrap.tfplan
builder="$("$TERRAFORM" -chdir=infra/bootstrap output -raw builder_service_account)"
deployer="$("$TERRAFORM" -chdir=infra/bootstrap output -raw deployer_service_account)"
provider="$("$TERRAFORM" -chdir=infra/bootstrap output -raw workload_identity_provider)"
tag="bootstrap-$(date -u +%Y%m%d%H%M%S)"
gcloud builds submit . --project="$GCP_PROJECT_ID" --region="$GCP_REGION" \
  --config=infra/cloudbuild.yaml --substitutions="_REGION=${GCP_REGION},_TAG=${tag}" \
  --service-account="projects/${GCP_PROJECT_ID}/serviceAccounts/${builder}" \
  --gcs-source-staging-dir="gs://${GCP_PROJECT_ID}-clarity-build-source/source"
registry="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/clarity"
app_digest="$(gcloud artifacts docker images describe "${registry}/app:${tag}" --project="$GCP_PROJECT_ID" --format='value(image_summary.digest)')"
tools_digest="$(gcloud artifacts docker images describe "${registry}/tools:${tag}" --project="$GCP_PROJECT_ID" --format='value(image_summary.digest)')"
export TF_VAR_app_image="${registry}/app@${app_digest}" TF_VAR_tools_image="${registry}/tools@${tools_digest}"
export TF_VAR_gemini_model="$GEMINI_MODEL" TF_VAR_gemini_location="${GEMINI_LOCATION:-$GCP_REGION}" TF_VAR_deployer_service_account="$deployer"
TF_VAR_viewer_members="$(python3 -c 'import json,sys; print(json.dumps([sys.argv[1]]))' "$VIEWER_MEMBER")"
export TF_VAR_viewer_members
refresh_credentials
"$TERRAFORM" -chdir=infra init -input=false -backend-config="bucket=$state_bucket" -backend-config='prefix=clarity/application'
"$TERRAFORM" -chdir=infra plan -input=false -out=application.tfplan
"$TERRAFORM" -chdir=infra apply -input=false application.tfplan
rm infra/application.tfplan
# Store non-secret infrastructure inputs for subsequent operator plans.
python3 - <<'PY'
import json, os
from pathlib import Path
keys = ['project_id', 'region', 'app_image', 'tools_image', 'gemini_model', 'gemini_location', 'deployer_service_account']
values = {k: os.environ['TF_VAR_' + k] for k in keys}
values['viewer_members'] = json.loads(os.environ['TF_VAR_viewer_members'])
Path('infra/terraform.tfvars').write_text(''.join(f'{k} = {json.dumps(v)}\n' for k,v in values.items()))
PY
gcloud run jobs execute clarity-migrate --project="$GCP_PROJECT_ID" --region="$GCP_REGION" --wait
url="$(gcloud run services describe clarity --project="$GCP_PROJECT_ID" --region="$GCP_REGION" --format='value(status.url)')"
token="$(gcloud auth print-identity-token)"
curl --fail --silent --show-error --retry 6 --retry-all-errors --retry-delay 5 --max-time 15 \
  -H "Authorization: Bearer $token" "$url/api/health" | python3 -c 'import json,sys; assert json.load(sys.stdin).get("status")=="ok"'
unset token
# The Workload Identity provider restricts deployment to main and this workflow.
for name in GCP_PROJECT_ID GCP_REGION; do
  gh variable set "$name" --repo="$GITHUB_REPOSITORY" --body="${!name}"
done
gh variable set GCP_DEPLOY_SERVICE_ACCOUNT --repo="$GITHUB_REPOSITORY" --body="$deployer"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo="$GITHUB_REPOSITORY" --body="$provider"
gh variable set CLOUD_DEPLOY_ENABLED --repo="$GITHUB_REPOSITORY" --body=true
printf '\nCloud resources ready. Private service: %s\nPush main to run CI/CD.\n' "$url"
