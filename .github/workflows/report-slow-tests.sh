#!/usr/bin/env bash
######################################################################
# .what = rank test files by wall-clock duration from a jest --json report
#
# .why  = jest 30 dropped the perfStats key that the prior report filtered on
#         (`perfStats.runtime`), so the filter matched zero rows and the report
#         went silent-green for its whole life. endTime-startTime
#         (epoch ms) is the only per-file duration jest 30 still emits, so read
#         the wall-clock span instead — and fail LOUD if a future schema change
#         zeroes it again, never silent-green.
#
# usage:
#   report-slow-tests.sh [jest-results.json]
#
# guarantee:
#   - exit 0 = report written to $GITHUB_STEP_SUMMARY (or /dev/null locally)
#   - exit 0 = empty shard (0 test files) — a legitimate state, stated explicitly
#   - exit 1 = non-empty report yielded zero real durations (schema drift)
######################################################################
set -eu

results="${1:-jest-results.json}"

total=$(jq '.testResults | length' "$results")
durations=$(jq -r '.testResults[] | "\((.endTime // 0) - (.startTime // 0)):\(.name)"' "$results" | sort -t: -k1 -rn)

summary="${GITHUB_STEP_SUMMARY:-/dev/null}"

# an empty shard (no matched files) is legitimate — say so explicitly, never fail.
if [[ "$total" -eq 0 ]]; then
  echo "slow-test report: 0 test files in $results (empty shard)" >> "$summary"
  exit 0
fi

# a non-empty testResults that yields zero real durations means the jest --json duration
# schema changed again — the silent death this check exists to catch. fail loud, never silent-green.
nonzero=$(printf '%s\n' "$durations" | awk -F: '$1 > 0' | wc -l | tr -d ' ')
if [[ "$nonzero" -eq 0 ]]; then
  echo "::error::slow-test report parsed 0 durations from $total test files — the jest --json duration schema likely changed; read endTime/startTime from one entry of $results to see what moved"
  exit 1
fi

# a ranked table into the step summary — annotations cannot be sorted, and a diagnosis
# needs the order (the single slowest file sets the suite's wall-clock floor).
{
  echo "### slowest test files"
  echo ""
  echo "| duration | file |"
  echo "| --- | --- |"
  printf '%s\n' "$durations" | while IFS=: read -r ms name; do
    [ -z "$name" ] && continue
    printf '| %ds | %s |\n' "$((ms / 1000))" "$name"
  done
} >> "$summary"

# inline annotations flag the outliers at their file (the 30s/10s thresholds are inherited).
printf '%s\n' "$durations" | while IFS=: read -r ms name; do
  [ -z "$name" ] && continue
  seconds=$((ms / 1000))
  if [[ $seconds -ge 30 ]]; then
    echo "::warning file=${name}::slow test: ${seconds}s"
  elif [[ $seconds -ge 10 ]]; then
    echo "::notice file=${name}::test duration: ${seconds}s"
  fi
done
