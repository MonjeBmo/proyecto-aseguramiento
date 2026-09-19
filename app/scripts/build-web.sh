#!/usr/bin/env bash
# Exporta la build web y renombra assets/node_modules -> assets/vendor
# (Cloudflare omite carpetas node_modules al subir assets).
set -euo pipefail
cd "$(dirname "$0")/.."

npx expo export --platform web

if [ -d dist/assets/node_modules ]; then
  mv dist/assets/node_modules dist/assets/vendor
  grep -rl "assets/node_modules" dist --include='*.js' --include='*.html' --include='*.css' \
    | xargs -r sed -i 's#assets/node_modules#assets/vendor#g'
fi
echo "Build web lista en dist/"
