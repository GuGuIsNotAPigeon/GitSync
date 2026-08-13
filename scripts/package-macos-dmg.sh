#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION=$(node -p "require('./package.json').version")
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  ARCH="aarch64"
fi

APP_DIR="src-tauri/target"
if [ -n "$TARGET" ]; then
  APP_DIR="$APP_DIR/$TARGET"
fi
APP_PATH="$APP_DIR/release/bundle/macos/GitSync.app"
BUNDLE_DIR="$APP_DIR/release/bundle"

ARGS=(--ci --bundles app)
if [ -n "$TARGET" ]; then
  ARGS+=(--target "$TARGET")
fi

SIGNED=0
APPLE_ID="${APPLE_ID:-}"
APPLE_PASSWORD="${APPLE_PASSWORD:-}"
APPLE_TEAM_ID="${APPLE_TEAM_ID:-}"
if [ -n "${APPLE_CERTIFICATE:-}" ]; then
  SIGNED=1
  export APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD
  if [ -n "${APPLE_SIGNING_IDENTITY:-}" ]; then
    export APPLE_SIGNING_IDENTITY
  else
    unset APPLE_SIGNING_IDENTITY
  fi
  # Tauri 会在 build 时签名，DMG 的公证放到最后统一处理。
  unset APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID
else
  unset APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD APPLE_SIGNING_IDENTITY APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID
fi

npm run tauri build -- "${ARGS[@]}"

if [ "$SIGNED" -eq 0 ]; then
  echo "::warning::未配置 Apple secrets，使用 ad-hoc 签名；DMG 可打开但会提示未验证开发者"
  codesign --force --deep --sign - "$APP_PATH"
fi

codesign --verify --deep --strict --verbose=2 "$APP_PATH"

STAGING=$(mktemp -d)
trap 'rm -rf "$STAGING"' EXIT
ditto "$APP_PATH" "$STAGING/GitSync.app"
ln -s /Applications "$STAGING/Applications"
mkdir -p "$BUNDLE_DIR/dmg"
DMG="$BUNDLE_DIR/dmg/GitSync_${VERSION}_${ARCH}.dmg"
hdiutil create -volname GitSync -srcfolder "$STAGING" -ov -format UDZO -imagekey zlib-level=9 "$DMG"
rm -rf "$STAGING"
trap - EXIT

if [ "$SIGNED" -eq 1 ]; then
  if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo "::error::APPLE_CERTIFICATE 已配置，但缺少 APPLE_ID / APPLE_PASSWORD / APPLE_TEAM_ID，无法公证"
    exit 1
  fi
  xcrun notarytool submit "$DMG" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait
  xcrun stapler staple "$DMG"
fi

echo "DMG: $DMG"
