#!/usr/bin/env bash
# Initialise la table de tracking du Supabase CLI avec les migrations
# déjà appliquées manuellement — sans les réexécuter.
#
# Le CLI n'accepte que des versions numériques YYYYMMDDHHMMSS (14 chiffres) :
# on insère le préfixe numérique du nom de fichier, pas le nom complet.
#
# À exécuter UNE SEULE FOIS par environnement. Remplace tout tracking existant.
# Après ça, utilise uniquement : supabase db push
#
# Usage :
#   ./scripts/init-migration-tracking.sh <DATABASE_URL> [MAX_VERSION]
#
#   MAX_VERSION (optionnel) : ne marque que les migrations ≤ cette version.
#   Exemple : 20260732000000 → les suivantes resteront "pending" et seront
#   appliquées par le prochain `supabase db push`.

set -euo pipefail

DB_URL="${1:-}"
MAX_VERSION="${2:-99999999999999}"

if [[ -z "$DB_URL" ]]; then
  echo "❌  Usage : $0 <DATABASE_URL> [MAX_VERSION]"
  echo "    URL pooler : Dashboard → Connect → Session pooler (port 5432)"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

echo "🔗  Cible : ${DB_URL//:*@/:***@}"
echo "    Borne : ≤ $MAX_VERSION"
echo ""

# Construire la liste de versions (14 chiffres) bornée
values=""
count=0
for f in "$MIGRATIONS_DIR"/*.sql; do
  base="$(basename "$f" .sql)"
  version="${base:0:14}"
  if [[ ! "$version" =~ ^[0-9]{14}$ ]]; then
    echo "⚠️  Ignoré (préfixe non numérique 14 chiffres) : $base"
    continue
  fi
  if [[ "$version" > "$MAX_VERSION" ]]; then
    continue
  fi
  values+="('$version'),"
  (( count++ )) || true
done
values="${values%,}"

if [[ -z "$values" ]]; then
  echo "❌  Aucune migration à marquer."
  exit 1
fi

psql -v ON_ERROR_STOP=1 "$DB_URL" <<SQL
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text NOT NULL PRIMARY KEY
);
BEGIN;
DELETE FROM supabase_migrations.schema_migrations;
INSERT INTO supabase_migrations.schema_migrations (version) VALUES $values;
COMMIT;
SQL

echo ""
echo "✅  $count migrations marquées comme appliquées."
psql "$DB_URL" -c "SELECT COUNT(*) AS total_tracke FROM supabase_migrations.schema_migrations;"
echo "Prochaine étape : supabase db push --db-url \"\$DB_URL\" --dry-run"
