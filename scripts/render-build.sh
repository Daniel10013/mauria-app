#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "render-build: PWD=$(pwd)"
echo "render-build: next.config* ->"
ls -la next.config* 2>/dev/null || echo "(nenhum next.config*)"
if [[ ! -f next.config.js ]]; then
  echo "ERRO: next.config.js não existe neste diretório."
  echo "      O Render está a fazer checkout de um commit/repo onde esse ficheiro não está em src/app/"
  echo "      (fork desatualizado ou branch/repo errado no painel)."
  exit 1
fi
if [[ -f next.config.ts ]]; then
  echo "AVISO: next.config.ts também existe; a remover para evitar transpile TS no CI."
  rm -f next.config.ts
fi
npm install --include=dev
npm run build
