#!/usr/bin/env bash
set -euo pipefail
: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_REGION:?Set GCP_REGION}"
: "${APP_IMAGE:?Set APP_IMAGE to an immutable image digest}"
: "${TOOLS_IMAGE:?Set TOOLS_IMAGE to an immutable image digest}"
: "${RELEASE_ID:?Set RELEASE_ID}"
: "${GCP_DEPLOY_SERVICE_ACCOUNT:?Set GCP_DEPLOY_SERVICE_ACCOUNT}"
[[ "$RELEASE_ID" =~ ^[a-z0-9-]{1,40}$ ]] || { echo 'Invalid release ID' >&2; exit 1; }
for image in "$APP_IMAGE" "$TOOLS_IMAGE"; do
  [[ "$image" =~ @sha256:[a-f0-9]{64}$ ]] || { echo 'Deployment requires immutable image digests' >&2; exit 1; }
done
flags=(--project="$GCP_PROJECT_ID" --region="$GCP_REGION" --quiet)
revision="clarity-${RELEASE_ID}"
service_url="$(gcloud run services describe clarity "${flags[@]}" --format='value(status.url)')"
# Pin the current revision before deployment, including after a previous partial run.
previous="$(gcloud run services describe clarity "${flags[@]}" --format=json | python3 -c 'import json,sys; t=[x for x in json.load(sys.stdin)["status"].get("traffic",[]) if x.get("percent",0)>0]; assert len(t)==1 and t[0]["percent"]==100, "Expected one active revision"; print(t[0]["revisionName"])')"
gcloud run services update-traffic clarity "${flags[@]}" --to-revisions="${previous}=100"
# Migrations must be additive/backwards compatible with the still-serving revision.
gcloud run jobs update clarity-migrate "${flags[@]}" --image="$TOOLS_IMAGE"
gcloud run jobs execute clarity-migrate "${flags[@]}" --wait
gcloud run deploy clarity "${flags[@]}" --image="$APP_IMAGE" --no-traffic --tag=candidate --revision-suffix="$RELEASE_ID"
candidate_url="$(gcloud run services describe clarity "${flags[@]}" --format=json | python3 -c 'import json,sys; print(next(t["url"] for t in json.load(sys.stdin)["status"]["traffic"] if t.get("tag")=="candidate"))')"
# The audience is always the service origin, even for a tagged revision URL.
probe() {
  local token
  token="$(gcloud auth print-identity-token --impersonate-service-account="$GCP_DEPLOY_SERVICE_ACCOUNT" --audiences="$service_url" --include-email)" || return 1
  curl --fail --silent --show-error --retry 6 --retry-all-errors --retry-delay 5 \
    --max-time 15 -H "Authorization: Bearer $token" "$1/api/health" | \
    python3 -c 'import json,sys; assert json.load(sys.stdin).get("status")=="ok"' || return 1
  # Exercise application imports and database queries, not only the lightweight probe.
  curl --fail --silent --show-error --max-time 20 -H "Authorization: Bearer $token" "$1/api/tickets" | \
    python3 -c 'import json,sys; assert isinstance(json.load(sys.stdin), list)'
}
probe "$candidate_url"
rollback() {
  echo "Release failed after promotion; restoring ${previous}" >&2
  gcloud run services update-traffic clarity "${flags[@]}" --to-revisions="${previous}=100"
}
trap rollback ERR
gcloud run services update-traffic clarity "${flags[@]}" --to-revisions="${revision}=100"
if ! probe "$service_url"; then
  rollback
  exit 1
fi
trap - ERR
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf 'Deployed `%s` to %s\n\nPrevious revision: `%s`\n' "$revision" "$service_url" "$previous" >> "$GITHUB_STEP_SUMMARY"
fi
