#!/usr/bin/env bash
# Applique le schéma de base + toutes les migrations sur une DB cible.
# Contourne le problème de préfixes de date dupliqués de supabase db push.
#
# Usage :
#   ./scripts/db-migrate.sh "postgresql://postgres:PASSWORD@HOST:5432/postgres"
#
# Exemples :
#   # Staging Supabase (récupérer l'URL dans : Dashboard → Settings → Database → URI)
#   ./scripts/db-migrate.sh "postgresql://postgres:monpassword@db.xxxx.supabase.co:5432/postgres"
#
#   # Local (après supabase start)
#   ./scripts/db-migrate.sh "postgresql://postgres:postgres@localhost:54322/postgres"

set -euo pipefail

DB_URL="${1:-}"
if [[ -z "$DB_URL" ]]; then
  echo "❌  Usage : $0 <DATABASE_URL>"
  echo "    Exemple : $0 \"postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres\""
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

echo "🗄️  Cible : ${DB_URL//:*@/:***@}"   # masque le mot de passe dans les logs
echo ""

# ── Migrations dans l'ordre alphabétique ──────────────────────────────────
count=0
for file in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  name="$(basename "$file")"
  echo "→ $name"
  psql -v ON_ERROR_STOP=1 "$DB_URL" -f "$file"
  echo "✓ $name"
  (( count++ )) || true
done

echo ""
echo "✅ $count migration(s) appliquée(s) avec succès."
