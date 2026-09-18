#!/usr/bin/env bash
#
# Résumé & CV Builder — macOS double-click launcher.
#
# Finder runs `.command` files in a new Terminal window. This file exists only
# so there is something double-clickable; all the real work is in start.sh.
#
# If double-clicking ever stops working ("permission denied"), the executable
# bit was lost — usually by copying through a zip, a USB stick or Google Drive.
# Fix it once from Terminal:
#
#     chmod +x "/path/to/Resume_design/start.command" "/path/to/Resume_design/start.sh"

cd "$(dirname "$0")" || exit 1

if [ ! -f start.sh ]; then
  echo "start.sh is missing from this folder — it must sit next to start.command."
  echo "Folder: $(pwd)"
  echo
  read -r -p "Press Return to close. " _
  exit 1
fi

# Not executable (common after a zip round-trip)? Run it through bash anyway
# rather than failing with a bare "permission denied".
if [ -x start.sh ]; then
  exec ./start.sh "$@"
else
  exec bash ./start.sh "$@"
fi
