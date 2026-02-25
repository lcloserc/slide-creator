#!/usr/bin/env bash
#
# Runs the SQL scripts against an existing database.
#
# This script does NOT create the database or users — see database/README.md
# for those steps. It only applies the schema and seed data.
#
# Connection is controlled via standard psql mechanisms:
#   - CLI flags:       ./database/setup.sh -U myuser -d mydb
#   - Environment:     PGUSER=myuser PGPASSWORD=secret ./database/setup.sh
#   - ~/.pgpass file
#   - pg_hba.conf trust/peer auth
#
# After running the SQL files, it regenerates the Prisma client.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

DB_NAME="${PGDATABASE:-slide_creator}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--database)  DB_NAME="$2"; shift 2 ;;
        -U|--user)      export PGUSER="$2"; shift 2 ;;
        -h|--host)      export PGHOST="$2"; shift 2 ;;
        -p|--port)      export PGPORT="$2"; shift 2 ;;
        -W|--password)  export PGPASSWORD="$2"; shift 2 ;;
        *)              echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "=== SlideCreator — applying schema & seed ==="
echo "    Database: $DB_NAME"
echo "    User:     ${PGUSER:-<default>}"
echo "    Host:     ${PGHOST:-localhost}:${PGPORT:-5432}"
echo ""

echo "--- Running 01_schema.sql ---"
psql -d "$DB_NAME" -f "$SCRIPT_DIR/01_schema.sql"
echo ""

echo "--- Running 02_seed.sql ---"
psql -d "$DB_NAME" -f "$SCRIPT_DIR/02_seed.sql"
echo ""

echo "--- Generating Prisma client ---"
(cd "$SCRIPT_DIR/../server" && npx prisma generate)
echo ""

echo "=== Done. ==="
