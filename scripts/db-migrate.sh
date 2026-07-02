#!/usr/bin/env bash
# ⚠️  DÉPRÉCIÉ — utilise supabase db push à la place.
#
# Ce script réapplique TOUTES les migrations depuis zéro (DB vierge uniquement).
# Il ne peut pas être utilisé sur une base existante.
#
# Remplacements :
#   Appliquer des migrations incrémentales → supabase db push
#   Réinitialiser une base locale          → supabase db reset
#   Vérifier l'état des migrations         → supabase migration list
#
# Ce script reste disponible avec --force pour les cas exceptionnels
# (ex: initialiser une toute nouvelle base vierge sans CLI).

if [ "${1:-}" != "--force" ]; then
  echo ""
  echo "⚠️  Ce script est déprécié."
  echo ""
  echo "   Appliquer de nouvelles migrations :"
  echo "     supabase db push"
  echo ""
  echo "   Vérifier l'état :"
  echo "     supabase migration list"
  echo ""
  echo "   Pour forcer l'ancien comportement (DB vierge uniquement) :"
  echo "     $0 --force <DATABASE_URL>"
  echo ""
  exit 1
fi

shift   # retire --force, le reste est la DB_URL

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
