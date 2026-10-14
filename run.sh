#!/usr/bin/env bash
# Install/update local prerequisites -> npm ci -> build -> npm start (in Docker).
set -Eeuo pipefail
vundy_project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
exec bash "$vundy_project_dir/install-linux.sh" "$@"
