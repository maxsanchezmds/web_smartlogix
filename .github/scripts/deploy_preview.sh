#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib.sh"

require_env AWS_REGION
require_env PR_NUMBER

WEB_PREFIX="${WEB_DEPLOY_CONTRACT_PREFIX:-/smartlogix/web/deploy}"
PREVIEW_PREFIX="previews/pr-${PR_NUMBER}"

BUCKET_NAME="$(get_param "$WEB_PREFIX" bucket_name)"
DISTRIBUTION_ID="$(get_param "$WEB_PREFIX" cloudfront_distribution_id)"
APP_URL="$(get_param "$WEB_PREFIX" app_url)"
PREVIEW_URL="${APP_URL}/${PREVIEW_PREFIX}/"

aws s3 sync dist "s3://${BUCKET_NAME}/${PREVIEW_PREFIX}" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

aws s3 cp dist/index.html "s3://${BUCKET_NAME}/${PREVIEW_PREFIX}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/${PREVIEW_PREFIX}/*" >/dev/null

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "preview_url=${PREVIEW_URL}"
    echo "preview_prefix=${PREVIEW_PREFIX}"
  } >> "$GITHUB_OUTPUT"
fi

echo "Preview frontend deployed: ${PREVIEW_URL}"
