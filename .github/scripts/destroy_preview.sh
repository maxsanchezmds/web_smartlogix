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

aws s3 rm "s3://${BUCKET_NAME}/${PREVIEW_PREFIX}" --recursive >/dev/null || true
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/${PREVIEW_PREFIX}/" "/${PREVIEW_PREFIX}/*" >/dev/null

echo "Preview frontend removed for PR ${PR_NUMBER}"
