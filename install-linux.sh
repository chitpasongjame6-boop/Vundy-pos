#!/usr/bin/env bash
# Run from the downloaded project: bash install-linux.sh
# This script NEVER sources .env, deletes a database, or copies Atlas credentials.
set +x
set -Eeuo pipefail
umask 077

log() { printf '\n[Vundy] %s\n' "$*"; }
die() { printf '\n[Vundy] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  printf '%s\n' \
    'Vundy POS local installer (Linux Mint 21/22, Ubuntu 22.04/24.04)' \
    'Usage: bash install-linux.sh [--lan | --localhost] [--port 3000]' \
    '' \
    'Default: localhost only, port 3000. Existing port/binding settings are kept.' \
    '--lan        Publish HTTP to the local network (trusted LAN only).' \
    '--localhost  Restrict access to this computer again.' \
    '--port N     Choose a port between 1024 and 65535.' \
    '--help       Show this help without changing anything.' \
    '' \
    'Installs Docker if needed; builds the app; creates an authenticated local' \
    'MongoDB replica set with persistent volumes; starts both on boot.' \
    'Initial install needs internet. Atlas data is NOT automatically migrated.' \
    'Existing .env and Atlas data are untouched. Read docs/setup.md first.'
}

read_setting() {
  # Read only plain installation settings; do not execute shell code from this file.
  awk -F= -v key="$2" '$1 == key { value=substr($0,index($0,"=")+1); sub(/\r$/, "", value); print value; exit }' "$1"
}

print_access_urls() {
  local config="$1" port bind address
  port="$(read_setting "$config" APP_PORT)"
  bind="$(read_setting "$config" BIND_ADDRESS)"
  printf '\n[Vundy] Open on this computer: http://localhost:%s\n' "$port"
  if [[ "$bind" == '0.0.0.0' ]]; then
    while IFS= read -r address; do
      [[ -n "$address" ]] || continue
      printf '[Vundy] LAN address: http://%s:%s\n' "$address" "$port"
    done < <(hostname -I 2>/dev/null | tr ' ' '\n' | awk '/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/ && /^[0-9.]+$/ { if (!seen[$0]++) print }')
  fi
  printf '%s\n' '[Vundy] 0.0.0.0 is a server listening address, NOT a browser URL.'
}

prepare_config() {
  local root="$1" bind_override="$2" port_override="$3"
  local config="$root/.env.linux.local" state="$root/.local-data/linux" bind port temp
  [[ ! -L "$config" && ! -L "$root/.local-data" && ! -L "$state" ]] || die 'Configuration directories must not be symlinks.'
  mkdir -p -- "$state"
  chmod 700 "$state"
  if [[ ! -e "$config" ]]; then
    log 'Generating new local-only passwords. Existing .env is not changed.'
    local root_password app_password owner_password staff_password secret pin
    root_password="$(openssl rand -hex 24)"
    app_password="$(openssl rand -hex 24)"
    owner_password="$(openssl rand -hex 12)"
    staff_password="$(openssl rand -hex 12)"
    secret="$(openssl rand -hex 32)"
    pin="$(openssl rand -hex 4)"
    (set -o noclobber; printf '%s\n' \
      '# Private local deployment credentials. Back up this file securely.' \
      'CONFIG_VERSION=1' 'BIND_ADDRESS=127.0.0.1' 'APP_PORT=3000' \
      "MONGO_ROOT_PASSWORD=$root_password" "MONGO_APP_PASSWORD=$app_password" \
      'OWNER_USERNAME=owner' "OWNER_PASSWORD=$owner_password" "OWNER_APPROVAL_PIN=$pin" \
      'STAFF_USERNAME=staff' "STAFF_PASSWORD=$staff_password" "SESSION_SECRET=$secret" \
      'R2_ACCOUNT_ID=' 'R2_BUCKET_NAME=' 'R2_ACCESS_KEY_ID=' 'R2_SECRET_ACCESS_KEY=' 'R2_PUBLIC_URL=' > "$config")
  fi
  chmod 600 "$config"
  [[ "$(read_setting "$config" CONFIG_VERSION)" == '1' ]] || die 'Unknown local configuration format; keep the existing file and review it.'
  # Generated DB passwords are URI-safe. Changing these later also requires a DB user rotation.
  local key value
  for key in MONGO_ROOT_PASSWORD MONGO_APP_PASSWORD; do
    value="$(read_setting "$config" "$key")"
    [[ "$value" =~ ^[a-f0-9]{48}$ ]] || die "Invalid $key in .env.linux.local; restore the original local credentials."
  done
  for key in OWNER_PASSWORD STAFF_PASSWORD SESSION_SECRET OWNER_APPROVAL_PIN; do
    [[ -n "$(read_setting "$config" "$key")" ]] || die "Missing $key in .env.linux.local."
  done
  bind="${bind_override:-$(read_setting "$config" BIND_ADDRESS)}"
  port="${port_override:-$(read_setting "$config" APP_PORT)}"
  [[ "$bind" == '127.0.0.1' || "$bind" == '0.0.0.0' ]] || die 'Invalid BIND_ADDRESS.'
  [[ "$port" =~ ^[1-9][0-9]{3,4}$ ]] && (( port >= 1024 && port <= 65535 )) || die 'Port must be 1024-65535.'
  temp="$(mktemp "$state/config.XXXXXXXX")"
  awk -v bind="$bind" -v port="$port" \
    '/^BIND_ADDRESS=/ { print "BIND_ADDRESS=" bind; next } /^APP_PORT=/ { print "APP_PORT=" port; next } { sub(/\r$/, ""); print }' \
    "$config" > "$temp"
  chmod 600 "$temp"
  mv -- "$temp" "$config"
  [[ ! -L "$state/mongo-keyfile" ]] || die 'Mongo keyfile must not be a symlink.'
  if [[ ! -e "$state/mongo-keyfile" ]]; then
    (set -o noclobber; openssl rand -base64 756 > "$state/mongo-keyfile")
  fi
  [[ -s "$state/mongo-keyfile" ]] || die 'Mongo keyfile is empty; restore it from your backup.'
  chmod 600 "$state/mongo-keyfile"
}

main() {
  local bind_override='' port_override=''
  while (( $# )); do
    case "$1" in
      --help|-h) usage; return 0 ;;
      --lan) bind_override='0.0.0.0'; shift ;;
      --localhost) bind_override='127.0.0.1'; shift ;;
      --port) [[ $# -ge 2 ]] || die '--port needs a number.'; port_override="$2"; shift 2 ;;
      *) die "Unknown option: $1 (use --help)" ;;
    esac
  done
  if [[ -n "$port_override" ]]; then
    [[ "$port_override" =~ ^[1-9][0-9]{3,4}$ ]] && (( port_override >= 1024 && port_override <= 65535 )) || die 'Port must be 1024-65535.'
  fi
  [[ "$(uname -s)" == 'Linux' ]] || die 'Run this script on Linux Mint, not Windows/Git Bash.'
  (( EUID != 0 )) || die 'Run as your normal Linux user: bash install-linux.sh (sudo is requested only where needed).'
  [[ -r /etc/os-release ]] || die 'Cannot detect the Linux distribution.'
  # /etc/os-release is trusted OS metadata, NOT application configuration.
  . /etc/os-release
  [[ "${ID:-}" == 'linuxmint' || "${ID:-}" == 'ubuntu' ]] || die 'This installer supports Ubuntu-based Linux Mint and Ubuntu.'
  local ubuntu_codename="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
  [[ "$ubuntu_codename" == 'jammy' || "$ubuntu_codename" == 'noble' ]] || die 'Supported bases: Ubuntu 22.04 (jammy) / 24.04 (noble), including Mint 21/22. LMDE is not supported.'
  case "$(uname -m)" in
    x86_64) grep -qE '^flags.*\bavx\b' /proc/cpuinfo || die 'MongoDB 8 requires an AVX-capable CPU.' ;;
    aarch64) ;;
    *) die 'A supported 64-bit x86_64 or ARM64 machine is required.' ;;
  esac
  command -v sudo >/dev/null || die 'sudo is required.'
  command -v systemctl >/dev/null && [[ -d /run/systemd/system ]] || die 'A normal systemd-based Linux Mint installation is required.'
  local root config state
  root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
  cd -- "$root"
  [[ -f package-lock.json && -f compose.local.yml && -f Dockerfile ]] || die 'Keep this script with the complete project folder.'
  config="$root/.env.linux.local"
  state="$root/.local-data/linux"
  [[ ! -L "$root/.local-data" && ! -L "$state" ]] || die 'Local state directories must not be symlinks.'
  mkdir -p -- "$state"
  exec 9>"$state/install.lock"
  flock -n 9 || die 'Another local installation is running.'
  sudo -v
  log 'Checking Docker and required tools...'
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl openssl
  if ! command -v docker >/dev/null; then
    local package
    for package in docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc; do
      if dpkg-query -W -f='${Status}' "$package" 2>/dev/null | grep -q 'install ok installed'; then
        die "Conflicting package $package exists. Review it manually; this installer will not uninstall existing containers/tools."
      fi
    done
    printf '%s\n' 'Types: deb' 'URIs: https://download.docker.com/linux/ubuntu' \
      "Suites: $ubuntu_codename" 'Components: stable' "Architectures: $(dpkg --print-architecture)" \
      'Signed-By: /etc/apt/keyrings/vundy-docker.asc' > "$state/docker.sources"
    [[ ! -e /etc/apt/sources.list.d/docker.list ]] || die 'An existing Docker apt repository needs review; it will not be overwritten.'
    if [[ -e /etc/apt/sources.list.d/docker.sources ]]; then
      cmp -s "$state/docker.sources" /etc/apt/sources.list.d/docker.sources || die 'An existing Docker apt repository needs review; it will not be overwritten.'
    fi
    curl --proto '=https' --tlsv1.2 -fsSL https://download.docker.com/linux/ubuntu/gpg -o "$state/docker.asc"
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo install -m 0644 "$state/docker.asc" /etc/apt/keyrings/vundy-docker.asc
    sudo install -m 0644 "$state/docker.sources" /etc/apt/sources.list.d/docker.sources
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
  sudo systemctl enable --now docker
  sudo docker info >/dev/null || die 'Docker daemon is unavailable.'
  sudo docker compose version >/dev/null || die 'Docker Compose v2 is required; install the Compose plugin for your existing Docker installation.'

  # Do not generate replacement credentials for an existing database volume.
  if sudo docker volume inspect vundy-local_mongo-data >/dev/null 2>&1; then
    [[ -s "$config" && -s "$state/mongo-keyfile" ]] || die 'Existing local DB found but credentials/keyfile are missing. Restore those files; DO NOT delete the database volume.'
  fi
  local container previous_root
  while IFS= read -r container; do
    [[ -n "$container" ]] || continue
    previous_root="$(sudo docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$container")"
    [[ "$previous_root" == "$root" ]] || die 'Another project folder already owns vundy-local. Run its installer instead.'
  done < <(sudo docker ps -aq --filter label=com.docker.compose.project=vundy-local)

  prepare_config "$root" "$bind_override" "$port_override"
  local -a compose=(sudo docker compose --env-file "$config" --project-name vundy-local -f "$root/compose.local.yml")
  # No credentials printed by `config -q`; never source the env file into a shell.
  "${compose[@]}" config -q
  if [[ "$(read_setting "$config" BIND_ADDRESS)" == '0.0.0.0' ]]; then
    log 'WARNING: LAN mode uses unencrypted HTTP. Use a trusted private LAN only. Docker published ports can bypass UFW; do not forward this port to the internet.'
  fi
  log 'Building the web app. First install requires internet and can take several minutes...'
  "${compose[@]}" build app
  log 'Starting authenticated local MongoDB and configuring replica set rs0...'
  "${compose[@]}" up -d mongo-init
  local init_id init_status
  init_id="$("${compose[@]}" ps -a -q mongo-init)"
  init_status="$(sudo docker wait "$init_id")"
  [[ "$init_status" == '0' ]] || die 'Mongo initialization failed. Inspect: sudo docker compose --env-file .env.linux.local -f compose.local.yml logs mongo-init mongo'
  log 'Synchronizing indexes (no data-loss/reset flags)...'
  "${compose[@]}" run --rm --no-deps schema
  log 'Starting the web app and checking database connectivity...'
  "${compose[@]}" up -d --no-deps app
  local app_id health attempt
  app_id="$("${compose[@]}" ps -a -q app)"
  for ((attempt=0; attempt<60; attempt++)); do
    health="$(sudo docker inspect --format '{{.State.Health.Status}}' "$app_id")"
    [[ "$health" == 'healthy' ]] && break
    [[ "$(sudo docker inspect --format '{{.State.Status}}' "$app_id")" != 'exited' ]] || break
    sleep 2
  done
  [[ "$health" == 'healthy' ]] || die 'The web app is not healthy yet. Inspect: sudo docker compose --env-file .env.linux.local -f compose.local.yml logs app'
  print_access_urls "$config"
  printf '%s\n' \
    'Login: usernames owner / staff. Passwords and owner PIN are in .env.linux.local (owner-readable only).' \
    'The app and MongoDB restart automatically on boot. MongoDB is NOT exposed on a host port.' \
    'This is a separate local database. Existing Atlas data/.env were not modified or imported.' \
    'Back up your data via Settings, plus .env.linux.local and .local-data/linux/mongo-keyfile.' \
    'For LAN access use this computer IP with the same port. Never expose this HTTP setup publicly.'
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  trap 'printf "\n[Vundy] Installation stopped at line %s. Data/config are kept; fix the error and rerun.\n" "$LINENO" >&2' ERR
  main "$@"
fi
