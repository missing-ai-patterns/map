#!/usr/bin/env bash
set -euo pipefail

map_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
map_install_dir="${MAP_INSTALL_DIR:-${HOME}/.local/bin}"
map_executable="${map_repo_root}/tooling/packages/cli/dist/map.js"
map_link="${map_install_dir}/map"

if ! command -v node >/dev/null 2>&1; then
  echo "error: Node.js 20 or newer is required" >&2
  exit 1
fi

map_node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( map_node_major < 20 )); then
  echo "error: Node.js 20 or newer is required; found $(node --version)" >&2
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  map_package_manager=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  map_package_manager=(corepack pnpm)
else
  echo "error: pnpm or corepack is required to build MAP" >&2
  exit 1
fi

mkdir -p "${map_install_dir}"
if [[ -e "${map_link}" || -L "${map_link}" ]]; then
  map_existing_target="$(readlink "${map_link}" 2>/dev/null || true)"
  if [[ "${map_existing_target}" != "${map_executable}" ]]; then
    echo "error: ${map_link} already exists and was not created by this checkout" >&2
    echo "Choose another location with MAP_INSTALL_DIR=/path/to/bin." >&2
    exit 1
  fi
fi

echo "Building MAP from ${map_repo_root}"
(
  cd "${map_repo_root}/tooling"
  "${map_package_manager[@]}" install --frozen-lockfile
  "${map_package_manager[@]}" build
)

if [[ ! -L "${map_link}" ]]; then
  ln -s "${map_executable}" "${map_link}"
fi

map_version="$("${map_link}" --version | tr -d '[:space:]')"
echo "Installed MAP ${map_version} as ${map_link}"
case ":${PATH}:" in
  *":${map_install_dir}:"*) ;;
  *)
    echo "Add this directory to PATH:"
    echo "  export PATH=\"${map_install_dir}:\$PATH\""
    ;;
esac
