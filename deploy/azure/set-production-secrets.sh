#!/usr/bin/env bash
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" == 'true' ]]; then
  echo 'This script must be run from a trusted operator workstation, not GitHub Actions.' >&2
  exit 1
fi

if [[ -z "${AZURE_KEY_VAULT:-}" ]]; then
  echo 'Missing required environment variable: AZURE_KEY_VAULT' >&2
  exit 1
fi

umask 077

code_secret_file="$(mktemp)"
cookie_secret_file="$(mktemp)"

cleanup() {
  rm -f "${code_secret_file}" "${cookie_secret_file}"
}

trap cleanup EXIT

read -rsp 'Access gate code secret: ' access_gate_code_secret
echo

read -rsp 'Access gate cookie secret: ' access_gate_cookie_secret
echo

if (( ${#access_gate_code_secret} < 32 )); then
  echo 'Access gate code secret must be at least 32 characters.' >&2
  exit 1
fi

if (( ${#access_gate_cookie_secret} < 32 )); then
  echo 'Access gate cookie secret must be at least 32 characters.' >&2
  exit 1
fi

if [[ "${access_gate_code_secret}" == "${access_gate_cookie_secret}" ]]; then
  echo 'Access gate secrets must be different.' >&2
  exit 1
fi

printf '%s' "${access_gate_code_secret}" > "${code_secret_file}"
printf '%s' "${access_gate_cookie_secret}" > "${cookie_secret_file}"

unset access_gate_code_secret
unset access_gate_cookie_secret

az keyvault secret set \
  --vault-name "${AZURE_KEY_VAULT}" \
  --name 'access-gate-code-secret' \
  --file "${code_secret_file}" \
  --encoding utf-8 \
  --output none

az keyvault secret set \
  --vault-name "${AZURE_KEY_VAULT}" \
  --name 'access-gate-cookie-secret' \
  --file "${cookie_secret_file}" \
  --encoding utf-8 \
  --output none

echo 'Production access-gate secrets were written to Azure Key Vault.'