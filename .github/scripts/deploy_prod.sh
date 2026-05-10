#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib.sh"

require_env AWS_REGION

WEB_PREFIX="${WEB_DEPLOY_CONTRACT_PREFIX:-/smartlogix/web/deploy}"

BUCKET_NAME="$(get_param "$WEB_PREFIX" bucket_name)"
DISTRIBUTION_ID="$(get_param "$WEB_PREFIX" cloudfront_distribution_id)"
APP_URL="$(get_param "$WEB_PREFIX" app_url)"

aws s3 sync dist "s3://${BUCKET_NAME}" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

aws s3 cp dist/index.html "s3://${BUCKET_NAME}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" >/dev/null

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "app_url=${APP_URL}" >> "$GITHUB_OUTPUT"
fi

echo "Production frontend deployed: ${APP_URL}"
