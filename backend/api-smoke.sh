#!/usr/bin/env bash
# End-to-end smoke test incl. the four-eyes rule. Requires the API running on :3001.
set -e
B=http://localhost:3001/api
analyst=(-H "x-user-id: u-analyst" -H "x-user-name: Analyst" -H "x-user-role: ANALYST")
co=(-H "x-user-id: u-co" -H "x-user-name: Jason Mullen" -H "x-user-role: CO")

echo "# health";            curl -s $B/health; echo
echo "# control dashboard"; curl -s $B/controls/dashboard; echo
echo "# crosswalk (FATF)";  curl -s "$B/crosswalk?framework=FATF" | head -c 300; echo
echo "# board pack";        curl -s "$B/reports/board-pack?period=Q2%202026" | head -c 300; echo

echo "# open a case (analyst)"
CID=$(curl -s "${analyst[@]}" -H 'Content-Type: application/json' -X POST $B/cases \
  -d '{"title":"Smoke test","severity":"P2","source":"Oscilar TM","customerRef":"CUST-9999","corridor":"US → Pakistan","typologyId":"28","controls":["TM-1"]}' \
  | sed -E 's/.*"id":"([^"]+)".*/\1/'); echo "  -> $CID"

echo "# propose SAR (analyst)"
curl -s "${analyst[@]}" -H 'Content-Type: application/json' -X POST $B/cases/$CID/disposition \
  -d '{"disposition":"SAR","rationale":"Smoke-test rationale."}' >/dev/null && echo "  proposed"

echo "# four-eyes: analyst tries to file BEFORE approval (expect 403)"
curl -s "${analyst[@]}" -X POST $B/cases/$CID/sar -o /dev/null -w "  HTTP %{http_code}\n"

echo "# CO approves (independent reviewer)"
curl -s "${co[@]}" -X POST $B/cases/$CID/approve >/dev/null && echo "  approved"

echo "# now file SAR (expect 200/201)"
curl -s "${co[@]}" -H 'Content-Type: application/json' -X POST $B/cases/$CID/sar \
  -d '{"narrative":"Filed in smoke test."}' -o /dev/null -w "  HTTP %{http_code}\n"

echo "# audit chain integrity"; curl -s "${co[@]}" $B/audit/verify; echo
