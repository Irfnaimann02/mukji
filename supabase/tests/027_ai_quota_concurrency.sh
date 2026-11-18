#!/usr/bin/env bash
# Concurrency test for 027 (AI call limit), asked for in the review of #89.
# Fires 300 calls from 300 different users at the same moment against the
# scan-menu app-wide limit (200 a day). Passes only if exactly 200 are allowed.
#
# Run against a LOCAL / throwaway Postgres that already has 027 applied and an
# auth schema with auth.uid() (it creates 300 fake users and clears ai_usage).
# Never run it against the real Supabase project.
#
#   PGURL="postgresql://postgres@localhost:5432/test" bash supabase/tests/027_ai_quota_concurrency.sh
set -euo pipefail
: "${PGURL:?set PGURL to a local test database}"

psql "$PGURL" -q -v ON_ERROR_STOP=1 -c "
  insert into auth.users (id)
  select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid from generate_series(1, 300) g
  on conflict do nothing;
  delete from public.ai_usage where fn = 'scan-menu';"

call() {
  local u; u=$(printf '00000000-0000-0000-0000-%012d' "$1")
  psql "$PGURL" -q -At -c "select set_config('request.jwt.claim.sub', '$u', false); set role authenticated; select public.use_ai_quota('scan-menu');" | tail -1
}
export -f call; export PGURL

echo "300 users calling at once (limit 200):"
seq 1 300 | xargs -P 100 -I{} bash -c 'call {}' | sort | uniq -c

total=$(psql "$PGURL" -At -c "select coalesce(sum(calls), 0) from public.ai_usage where fn = 'scan-menu'")
echo "recorded: $total"
if [ "$total" -eq 200 ]; then echo "PASS: never over the limit"; else echo "FAIL: expected 200"; exit 1; fi
