#!/usr/bin/env bash
#
# Résumé & CV Builder — launcher.
#
#   ./start.sh            install if needed, start the dev server, open a browser
#   ./start.sh --built    build once, then serve the static dist/ folder
#   ./start.sh --check    run the diagnostics only and exit
#   ./start.sh --clean    delete node_modules and reinstall from scratch
#   ./start.sh --port N   use port N instead of 5180
#
# Every failure below prints what went wrong, why, and the specific command to
# fix it. A launcher that just says "Error" is worse than no launcher.

set -uo pipefail

# Run from the folder this script lives in, wherever it was invoked from.
cd "$(dirname "$0")" || exit 1
PROJECT_DIR="$(pwd)"

# ---------------------------------------------------------------- appearance

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  B=$'\033[1m'; DIM=$'\033[2m'; R=$'\033[0m'
  RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; CYN=$'\033[36m'
else
  B=''; DIM=''; R=''; RED=''; GRN=''; YLW=''; CYN=''
fi

# Named `section`, not `head`, so the real /usr/bin/head stays reachable.
say()     { printf '%s\n' "$*"; }
ok()      { printf '  %s✓%s %s\n' "$GRN" "$R" "$*"; }
warn()    { printf '  %s!%s %s\n' "$YLW" "$R" "$*"; }
section() { printf '\n%s%s%s\n' "$B" "$*" "$R"; }

# Print a boxed failure with a fix, then stop.
fail() {
  printf '\n%s%s──────────────────────────────────────────────────────────%s\n' "$B" "$RED" "$R"
  printf '%s%s  %s%s\n' "$B" "$RED" "$1" "$R"
  printf '%s%s──────────────────────────────────────────────────────────%s\n\n' "$B" "$RED" "$R"
  shift
  for line in "$@"; do printf '  %s\n' "$line"; done
  printf '\n'
  hold
  exit 1
}

# Keep a double-clicked Terminal window open so the message can be read.
hold() {
  if [ -t 0 ]; then
    printf '%sPress Return to close this window.%s ' "$DIM" "$R"
    read -r _ || true
  fi
}

# --------------------------------------------------------------- arguments

MODE="dev"

# PORT may arrive from the environment — the suite launcher one level up sets it
# so the dashboard's iframe knows where to point. When it does, the port is an
# assignment rather than a preference, so the free-port hunt below is skipped:
# a server that quietly moved to 5181 is a tab the dashboard can never reach.
if [ -n "${PORT:-}" ]; then PORT_FIXED="yes"; else PORT_FIXED="no"; fi
PORT="${PORT:-5180}"

CLEAN="no"
# Set when we give up on Node and fall back to serving a pre-built dist/.
# Kept separate from MODE so it cannot clobber --check or --built.
NO_NODE="no"

while [ $# -gt 0 ]; do
  case "$1" in
    --built|--build|--static) MODE="built" ;;
    --check|--doctor)         MODE="check" ;;
    --clean)                  CLEAN="yes" ;;
    --port)                   PORT="${2:-5180}"; PORT_FIXED="yes"; shift ;;
    --port=*)                 PORT="${1#*=}"; PORT_FIXED="yes" ;;
    -h|--help)
      say "Usage: ./start.sh [--built] [--check] [--clean] [--port N]"
      exit 0 ;;
    *) warn "Ignoring unrecognised option: $1" ;;
  esac
  shift
done

clear 2>/dev/null || true
say "${B}Résumé & CV Builder${R}"
say "${DIM}${PROJECT_DIR}${R}"

# --------------------------------------------------------------- 1. checks

section "Checking your setup"

# Are we actually in the project?
if [ ! -f package.json ] || [ ! -f vite.config.js ]; then
  fail "This script is not sitting in the project folder." \
       "Expected to find package.json and vite.config.js next to start.sh." \
       "" \
       "Currently in: $PROJECT_DIR" \
       "" \
       "Move start.sh back into the Resume_design folder and try again."
fi
ok "Project files found"

# Node.js
if ! command -v node >/dev/null 2>&1; then
  # Common case on macOS: node exists but the GUI shell has no PATH for it.
  for guess in /usr/local/bin/node /opt/homebrew/bin/node "$HOME/.nvm/versions/node"/*/bin/node; do
    if [ -x "$guess" ]; then
      PATH="$(dirname "$guess"):$PATH"
      export PATH
      warn "Found Node at $guess and added it to PATH for this run"
      break
    fi
  done
fi

if ! command -v node >/dev/null 2>&1; then
  # Last resort: no Node, but maybe a previous build and a Python to serve it.
  if [ -f dist/index.html ] && command -v python3 >/dev/null 2>&1; then
    warn "Node.js is not installed, but a previous build exists in dist/"
    say ""
    say "  Serving that build instead. It will work, but you will not be able to"
    say "  rebuild after changing any source file until Node is installed."
    say "  Install Node from https://nodejs.org when you want to edit."
    say ""
    NO_NODE="yes"
  else
    fail "Node.js is not installed." \
         "This app is built with Vite, which needs Node.js to run." \
         "" \
         "Install it — pick one:" \
         "" \
         "  ${CYN}1.${R} Download the LTS installer from  ${B}https://nodejs.org${R}" \
         "     (the big green button; accept every default)" \
         "" \
         "  ${CYN}2.${R} If you use Homebrew:   ${B}brew install node${R}" \
         "" \
         "Then close this window, open it again, and run ./start.sh" \
         "" \
         "You need Node 18 or newer. Check with:  node -v"
  fi
fi

if [ "$NO_NODE" != "yes" ]; then
  NODE_V="$(node -v 2>/dev/null)"
  NODE_MAJOR="$(printf '%s' "$NODE_V" | sed 's/^v//' | cut -d. -f1)"

  if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 18 ] 2>/dev/null; then
    fail "Node.js $NODE_V is too old." \
         "Vite 5 needs Node 18 or newer. Yours reports: $NODE_V" \
         "" \
         "Install a current version from ${B}https://nodejs.org${R} (choose LTS)," \
         "or if you use nvm:" \
         "" \
         "  ${B}nvm install --lts && nvm use --lts${R}" \
         "" \
         "Then run ./start.sh again."
  fi
  ok "Node $NODE_V"

  if ! command -v npm >/dev/null 2>&1; then
    fail "npm is missing." \
         "Node is installed but npm is not on your PATH, which usually means a" \
         "partial or unusual install." \
         "" \
         "Reinstalling Node from ${B}https://nodejs.org${R} fixes this — npm ships with it."
  fi
  ok "npm $(npm -v)"
fi

# ------------------------------------------------------------ 2. dependencies

if [ "$NO_NODE" != "yes" ]; then
  if [ "$CLEAN" = "yes" ]; then
    section "Cleaning"
    rm -rf node_modules package-lock.json
    ok "Removed node_modules and package-lock.json"
  fi

  section "Checking dependencies"

  NEED_INSTALL="no"
  if [ ! -d node_modules ]; then
    NEED_INSTALL="yes"
    warn "Not installed yet"
  elif [ ! -d node_modules/vite ] || [ ! -d node_modules/react ]; then
    NEED_INSTALL="yes"
    warn "Installed but incomplete"
  elif [ package.json -nt node_modules ]; then
    NEED_INSTALL="yes"
    warn "package.json is newer than node_modules — dependencies changed"
  else
    ok "Up to date"
  fi

  if [ "$NEED_INSTALL" = "yes" ]; then
    say ""
    say "  Installing. First time takes a minute or two; after that it is instant."
    say "  ${DIM}Everything is downloaded into ./node_modules — nothing is installed"
    say "  system-wide, and deleting this folder removes all of it.${R}"
    say ""

    LOG="$(mktemp -t resume-install)" || LOG="/tmp/resume-install.log"
    if npm install 2>&1 | tee "$LOG"; then
      ok "Dependencies installed"
    else
      say ""
      fail "npm install failed." \
           "The last lines of the log:" \
           "" \
           "$(tail -n 15 "$LOG" 2>/dev/null | sed 's/^/    /')" \
           "" \
           "Most common causes, in order:" \
           "" \
           "  ${CYN}·${R} ${B}No internet connection.${R} npm downloads from registry.npmjs.org." \
           "  ${CYN}·${R} ${B}A corporate proxy or VPN.${R} Try again off the VPN, or set:" \
           "      npm config set proxy http://your-proxy:port" \
           "  ${CYN}·${R} ${B}A half-finished earlier install.${R} Run:  ./start.sh --clean" \
           "  ${CYN}·${R} ${B}No write permission here.${R} Do not run this from a read-only" \
           "      folder such as a mounted disk image." \
           "" \
           "Full log: $LOG"
    fi
  fi
fi

# ----------------------------------------------------------------- 3. port

# Find a free port so a second copy, or something else on 5180, is not fatal.
port_busy() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$1" >/dev/null 2>&1
  else
    return 1
  fi
}

if [ "$PORT_FIXED" = "yes" ]; then
  # Asked for a specific port, so take it or fail loudly rather than drifting.
  # --strictPort on the vite invocations below turns a busy port into an error.
  if port_busy "$PORT"; then
    warn "Port $PORT is already in use — vite will refuse to start on it"
  fi
else
  ORIGINAL_PORT="$PORT"
  TRIES=0
  while port_busy "$PORT" && [ "$TRIES" -lt 20 ]; do
    PORT=$((PORT + 1))
    TRIES=$((TRIES + 1))
  done
  if [ "$PORT" != "$ORIGINAL_PORT" ]; then
    warn "Port $ORIGINAL_PORT was busy — using $PORT instead"
  fi
fi

if [ "$MODE" = "check" ]; then
  section "Diagnostics"
  say "  Project     $PROJECT_DIR"
  say "  Node        $(node -v 2>/dev/null || echo 'not installed')"
  say "  npm         $(npm -v 2>/dev/null || echo 'not installed')"
  say "  Deps        $([ -d node_modules ] && echo installed || echo missing)"
  say "  Built dist  $([ -f dist/index.html ] && echo present || echo 'not built yet')"
  say "  Free port   $PORT"
  say ""
  if [ "$NO_NODE" = "yes" ]; then
    warn "No Node.js. ./start.sh can only serve the existing dist/ folder."
  else
    ok "Everything needed to start is in place."
  fi
  hold
  exit 0
fi

# ----------------------------------------------------------------- 4. launch

URL="http://localhost:$PORT"

open_browser() {
  # The suite launcher sets NO_BROWSER because it opens the dashboard itself;
  # six apps each opening their own tab is six tabs nobody asked for.
  [ -z "${NO_BROWSER:-}" ] || return 0
  ( sleep 2
    if command -v open >/dev/null 2>&1; then open "$1"
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1"
    fi ) >/dev/null 2>&1 &
}

banner() {
  say ""
  say "${GRN}${B}  The app is running.${R}"
  say ""
  say "     ${B}$URL${R}"
  say ""
  say "  ${DIM}A browser tab should open by itself. If not, copy that address in."
  say "  Keep this window open while you work — closing it stops the server."
  say "  Press Ctrl+C here when you are finished.${R}"
  say ""
}

# No Node at all: serve the pre-built dist/ with Python. This ignores --built
# on purpose — there is nothing to build with.
if [ "$NO_NODE" = "yes" ]; then
  section "Serving the existing build"
  open_browser "$URL"
  banner
  cd dist || exit 1
  python3 -m http.server "$PORT" --bind 127.0.0.1
  say ""
  say "${DIM}Server stopped.${R}"
  exit 0
fi

case "$MODE" in
  built)
    section "Building"
    if ! npm run build; then
      say ""
      fail "The build failed." \
           "The compiler output is above — it names the file and line." \
           "" \
           "If you have not edited anything, this is unexpected. Try:" \
           "" \
           "  ${B}./start.sh --clean${R}     reinstall dependencies and retry" \
           "" \
           "If you have been editing, the error above is in your change." \
           "A syntax slip in a .jsx file is the usual cause."
    fi
    ok "Built into dist/"
    open_browser "$URL"
    banner
    npx vite preview --port "$PORT" --strictPort
    ;;

  *)
    section "Starting the development server"
    say "  ${DIM}Edits to files in src/ appear in the browser immediately.${R}"
    # No open_browser here: vite.config.js already sets server.open, so calling
    # it too would give you two tabs.
    banner
    npx vite --port "$PORT" --strictPort
    ;;
esac

STATUS=$?
if [ "$STATUS" -ne 0 ] && [ "$STATUS" -ne 130 ]; then
  say ""
  fail "The server stopped unexpectedly (exit code $STATUS)." \
       "Whatever went wrong is printed above." \
       "" \
       "Things to try:" \
       "" \
       "  ${B}./start.sh --clean${R}       reinstall dependencies" \
       "  ${B}./start.sh --port 5300${R}   if something else grabbed the port" \
       "  ${B}./start.sh --check${R}       print diagnostics and stop"
fi

say ""
say "${DIM}Server stopped. Your work is saved in the browser — run this script"
say "again any time to pick it up.${R}"
