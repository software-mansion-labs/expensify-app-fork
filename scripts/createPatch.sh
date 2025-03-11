# See if we're in the HybridApp repo
IS_HYBRID_APP_REPO=$(scripts/is-hybrid-app.sh)
NEW_DOT_FLAG="${STANDALONE_NEW_DOT:-false}"

OS="$(uname)"
if [[ "$OS" == "Darwin" || "$OS" == "Linux" ]]; then
  TEMP_PATCH_DIR=$(mktemp -d ./tmp-patches-XXX)
  find ./patches -type f -name '*.patch' -exec cp {} "$TEMP_PATCH_DIR" \;

  if [[ "$IS_HYBRID_APP_REPO" == "true" && "$NEW_DOT_FLAG" == "false" ]]; then
    find ./Mobile-Expensify/patches -type f -name '*.patch' -exec cp {} "$TEMP_PATCH_DIR" \;
  fi

  output=$(npx patch-package "$@" --patch-dir "$TEMP_PATCH_DIR" --error-on-fail --color=always)
  echo "$output"

  file_path=$(echo "$output" | grep 'Created file' | cut -d' ' -f4)
  mv "$file_path" patches
  rm -rf "$TEMP_PATCH_DIR"
else
  error "Unsupported OS: $OS"
fi
