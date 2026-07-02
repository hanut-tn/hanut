#!/usr/bin/env bash
# Marque toutes les migrations comme déjà appliquées via le Supabase CLI.
# Utilise la connexion du projet lié (supabase link) — pas besoin d'URL psql.
# À exécuter UNE SEULE FOIS pour initialiser le tracking CLI.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Marquage des migrations comme appliquées..."
echo ""

for f in "$REPO_ROOT"/supabase/migrations/*.sql; do
  version="$(basename "$f" .sql)"
  supabase migration repair --status applied "$version"
done

echo ""
echo "Vérification :"
supabase migration list
