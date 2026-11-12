#!/usr/bin/env bash
# Applies every migration and the seed to a throwaway PostgreSQL database, then runs the SQL role tests.
# Usage: PGHOST=127.0.0.1 PGUSER=postgres PGPASSWORD=... bash scripts/test-database.sh
set -euo pipefail
cd "$(dirname "$0")/.."
db="${JARVIS_TEST_DATABASE:-jarvis_role_tests}"
psql -q -d postgres -c "drop database if exists ${db}" -c "create database ${db}"
run() { psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$1"; }
run supabase/tests/support/local-supabase-shim.sql
for file in $(ls supabase/migrations/*.sql | sort); do run "$file"; done
run supabase/seed.sql
failed=0
for file in supabase/tests/*.sql; do
  if run "$file" >/tmp/jarvis-sql-test.log 2>&1; then echo "PASS $(basename "$file")"; else
    echo "FAIL $(basename "$file")"; grep -E 'ERROR|CONTEXT' /tmp/jarvis-sql-test.log | head -4; failed=1; fi
done
psql -q -d postgres -c "drop database ${db}"
exit $failed
