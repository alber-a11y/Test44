#!/usr/bin/env bash
# Downloads CC0 source packs (KayKit by Kay Lousberg, www.kaylousberg.com) into .assets-src/
set -euo pipefail
DEST="${ASSETS_SRC:-.assets-src}"
mkdir -p "$DEST"
clone() { [ -d "$DEST/$2" ] || git clone --depth 1 "https://github.com/KayKit-Game-Assets/$1" "$DEST/$2"; }
clone KayKit-Medieval-Hexagon-Pack-1.0 hex
clone KayKit-Character-Pack-Adventures-1.0 adv
clone KayKit-Character-Pack-Skeletons-1.0 skel
