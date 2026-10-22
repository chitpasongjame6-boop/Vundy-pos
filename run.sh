#!/usr/bin/env bash
# Update origin/main -> install prerequisites -> npm ci -> build -> npm start.
set +x
set -Eeuo pipefail
umask 077

run_log() { printf '\n[Vundy] %s\n' "$*"; }
run_die() { printf '\n[Vundy] ERROR: %s\n' "$*" >&2; exit 1; }

run_usage() {
  printf '%s\n' \
    'Vundy POS: update source, build and start the local web app.' \
    'Usage: bash run.sh [--no-update] [--lan | --localhost] [--port 3000]' \
    '' \
    'Default: fetch origin/main and fast-forward a clean main branch first.' \
    'Stops on local edits, local-only commits, missing Git, or network errors.' \
    'Never resets/stashes edits, replaces credentials, or deletes a database.' \
    '--no-update  Build/install the files already here without fetching Git.' \
    '--lan        Publish HTTP to the trusted local network.' \
    '--localhost  Restrict access to this computer.' \
    '--port N     Use port 1024-65535. Existing settings are kept by default.' \
    '--help       Show help without fetching or installing anything.' \
    '' \
    'Runs install-linux.sh: Docker, npm ci, build, authenticated local' \
    'MongoDB replica set, schema/index checks and npm start.' \
    'Back up shop data via Settings before updating. Internet is required.'
}

update_source() {
  local root="$1" branch state target path
  cd -- "$root"
  command -v git >/dev/null || run_die 'Git is missing. Install it with: sudo apt-get update && sudo apt-get install -y git'
  [[ "$(git rev-parse --is-inside-work-tree 2>/dev/null || true)" == 'true' ]] ||
    run_die 'This folder has no Git history (possibly downloaded as ZIP). Keep the folder/data; use a Git clone for automatic updates, or bash run.sh --no-update to build these files.'
  [[ -z "$(git rev-parse --show-prefix)" ]] || run_die 'run.sh must be in the root of this Git repository.'
  branch="$(git symbolic-ref --quiet --short HEAD || true)"
  [[ "$branch" == 'main' ]] || run_die 'Automatic updates require branch main. Review git status and your branch first; no branch was switched.'
  for state in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
    [[ ! -e "$(git rev-parse --git-path "$state")" ]] || run_die 'A Git merge/rebase/cherry-pick is unfinished. Resolve it before updating.'
  done
  state="$(git status --porcelain --untracked-files=normal)"
  [[ -z "$state" ]] || run_die 'Local edits or untracked files exist. Review git status --short and preserve your work before updating. Nothing was stashed, reset or deleted.'
  git remote get-url origin >/dev/null 2>&1 || run_die 'Git remote origin is missing. Review the repository configuration before updating.'
  run_log 'Fetching latest source from origin/main...'
  GIT_TERMINAL_PROMPT=0 git fetch --quiet --no-tags origin refs/heads/main ||
    run_die 'Could not fetch origin/main. Check internet/Git access and retry; the running web app was not restarted.'
  target="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"
  git merge-base --is-ancestor HEAD "$target" ||
    run_die 'Local main has commits not present in origin/main. Resolve this manually; no reset/rebase or deployment was attempted.'
  # Ignored private files can otherwise be overwritten by a newly tracked path.
  while IFS= read -r -d '' path; do
    case "$path" in
      .env|.env*.local|.local-data|.local-data/*)
        run_die 'The incoming revision tracks private configuration/data paths. Update stopped to protect local files.' ;;
    esac
  done < <(git ls-tree -rz --name-only "$target")
  git merge --ff-only --no-edit "$target" || run_die 'Fast-forward update failed. Review git status; installation was not started.'
  run_log "Source ready: $(git rev-parse --short HEAD). Building this revision next."
}

run_main() {
  local update=1 root state port
  local -a install_args=()
  while (( $# )); do
    case "$1" in
      --help|-h) run_usage; return 0 ;;
      --no-update) update=0; shift ;;
      --lan|--localhost) install_args+=("$1"); shift ;;
      --port)
        [[ $# -ge 2 ]] || run_die '--port needs a number.'
        port="$2"
        [[ "$port" =~ ^[1-9][0-9]{3,4}$ ]] && (( port >= 1024 && port <= 65535 )) || run_die 'Port must be 1024-65535.'
        install_args+=("--port" "$port"); shift 2 ;;
      *) run_die "Unknown option: $1 (use --help)" ;;
    esac
  done
  [[ "$(uname -s)" == 'Linux' ]] || run_die 'Run this script on Linux Mint, not Windows/Git Bash.'
  (( EUID != 0 )) || run_die 'Run as your normal Linux user: bash run.sh (sudo is requested only where needed).'
  root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
  [[ -f "$root/install-linux.sh" ]] || run_die 'Keep run.sh with the complete project folder.'
  # Hold the same lock through fetch, build and startup. The installer inherits
  # FD 9, so direct installer runs cannot race an automatic source update.
  state="$root/.local-data/linux"
  [[ ! -L "$root/.local-data" && ! -L "$state" && ! -L "$state/install.lock" ]] || run_die 'Local state/lock paths must not be symlinks.'
  command -v flock >/dev/null || run_die 'flock is required (provided by util-linux on Linux Mint).'
  mkdir -p -- "$state"
  exec 9>"$state/install.lock"
  flock -n 9 || run_die 'Another update or installation is running.'
  if (( update )); then
    update_source "$root"
  else
    run_log 'Skipping Git update by request; building the files already in this folder.'
  fi
  # Execute the NEW installer after Git updates it. Do not source it or restart
  # run.sh recursively. All of this function was parsed before Git changed files.
  exec bash "$root/install-linux.sh" "${install_args[@]}"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  run_main "$@"
  exit 0
fi
