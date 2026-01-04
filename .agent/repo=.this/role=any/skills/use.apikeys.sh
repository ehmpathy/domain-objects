#!/usr/bin/env bash
######################################################################
# .what = export api keys for integration tests
# .why = enables running integration tests that require api keys
#
# usage:
#   source .agent/repo=.this/role=any/skills/use.apikeys.sh
#
# note:
#   - must be called with `source` to export vars to current shell
#   - loads from ~/.config/rhachet/apikeys.env if available
#   - falls back to .env.local (gitignored) in repo root
######################################################################

# fail if not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "error: this script must be sourced, not executed"
  echo "usage: source ${BASH_SOURCE[0]}"
  exit 1
fi

# try loading from user config first
if [[ -f ~/.config/rhachet/apikeys.env ]]; then
  source ~/.config/rhachet/apikeys.env
  echo "✓ loaded api keys from ~/.config/rhachet/apikeys.env"

# fallback to local gitignored file
elif [[ -f .env.local ]]; then
  source .env.local
  echo "✓ loaded api keys from .env.local"

else
  echo "⚠ no api keys file found"
  echo ""
  echo "create one of:"
  echo "  ~/.config/rhachet/apikeys.env"
  echo "  .env.local (in repo root)"
  echo ""
  echo "with contents like:"
  echo "  export OPENAI_API_KEY=sk-..."
  echo "  export ANTHROPIC_API_KEY=sk-..."
  return 1
fi

# read required keys from json config if present
APIKEYS_CONFIG=".agent/repo=.this/role=any/skills/use.apikeys.json"
if [[ -f "$APIKEYS_CONFIG" ]]; then
  # extract required keys using jq
  REQUIRED_KEYS=$(jq -r '.apikeys.required[]?' "$APIKEYS_CONFIG" 2>/dev/null)

  # verify each required key is set
  for KEY in $REQUIRED_KEYS; do
    if [[ -z "${!KEY}" ]]; then
      echo "⚠ $KEY not set (required by $APIKEYS_CONFIG)"
      return 1
    fi
    echo "✓ $KEY set"
  done
fi
