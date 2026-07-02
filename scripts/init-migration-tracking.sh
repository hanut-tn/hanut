#!/usr/bin/env bash
# Peuple la table de tracking du Supabase CLI avec toutes les migrations
# déjà appliquées manuellement — sans les réexécuter.
#
# À exécuter UNE SEULE FOIS sur la prod pour initialiser le tracking.
# Après ça, utilise uniquement : supabase db push
#
# Usage :
#   ./scripts/init-migration-tracking.sh "postgresql://postgres:PASSWORD@HOST:5432/postgres"

set -euo pipefail

DB_URL="${1:-}"
if [[ -z "$DB_URL" ]]; then
  echo "❌  Usage : $0 <DATABASE_URL>"
  echo "    Récupère l'URL dans : Supabase Dashboard → Settings → Database → Connection string → URI"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

echo "🔗  Cible : ${DB_URL//:*@/:***@}"
echo ""

# Créer le schema et la table de tracking si absents
psql "$DB_URL" -c "CREATE SCHEMA IF NOT EXISTS supabase_migrations;"
psql "$DB_URL" -c "
  CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version text NOT NULL PRIMARY KEY
  );
"

echo "✓ Table de tracking prête"
echo ""

# Marquer toutes les migrations comme appliquées (sans les réexécuter)
count=0
for f in "$MIGRATIONS_DIR"/*.sql; do
  version="$(basename "$f" .sql)"
  psql "$DB_URL" -c "
    INSERT INTO supabase_migrations.schema_migrations (version)
    VALUES ('$version')
    ON CONFLICT DO NOTHING;
  " -q
  echo "  ✓ $version"
  (( count++ )) || true
done

echo ""
echo "✅  $count migrations marquées comme appliquées."
echo ""
echo "Vérification :"
psql "$DB_URL" -c "SELECT COUNT(*) AS total_tracke FROM supabase_migrations.schema_migrations;"
echo ""
echo "Prochaine étape : supabase db push --dry-run"
