#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1; then
  echo "Installe Node.js 22.12 ou plus récent, puis relance ce fichier."
  exit 1
fi
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major<22||(major===22&&minor<12)){console.error("Node.js 22.12 ou plus récent est nécessaire.");process.exit(1)}'
echo "Ouvre http://localhost:8787 dans ton navigateur. Ctrl+C pour arrêter."
exec node --env-file-if-exists=.env.local server/index.js
