#!/bin/bash

# .what = block commit of files that embed a clock time (HH:MM, HH:MM:SS, a T-dash form, any zone)
#         in ANY staged file but .ts/.sh — prose included: readmes, docs, briefs, yields, dreams
# .why  = a timestamp in a tracked file is a privacy leak that ships to every clone and fork,
#         forever; it also churns every diff
# .how  = scan staged files (except .ts/.sh) for the pattern; halt with a
#         constraint error (exit 2) if any are found
#
# ⛔ NEVER ADD AN EXEMPTION TO THIS HOOK. NOT A PATH, NOT A DIR, NOT A FILE, NOT A PATTERN.
#    this hook exists to block EVERY timestamp in every tracked file. that is the whole point.
#    an exemption is how the leak gets back in — one dir today, every dir tomorrow.
#    a file that "needs" a timestamp removes it or masks it (e.g. `[timestamp]`, a fixed clock).
#    the .ts/.sh skip below is code that computes time, not data that records it; it may never
#    widen. check.timestamps.lock.sh halts every commit if this file differs from the practice.

# fail fast on errors and unbound vars (safe here: scan pipelines end in `head`
# so a no-match grep does not abort, and all vars are assigned before use)
set -eu

# the time-of-day forms, each a valid clock (hour 00-23, minute + second 00-59):
#   - colon clock, with or without seconds: 14:30, 14:30:00, T14:30Z, 14:30:00+05:00
#   - dash clock after a lead T, as in a filename-safe iso stamp: T14-30-00Z, T14-30Z
# a clock with no lead T needs a left edge with no digit or colon before the hour, so a
# `file.ts:12:34` line:col ref and a `5432:5432` port map do not match (a lead T, as in
# `2026-09-20T14:30`, marks a clock on its own); the right edge forbids a digit after,
# so a longer number never reads as a clock
CLOCK_COLON='([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?'
CLOCK_DASH='T([01][0-9]|2[0-3])-[0-5][0-9](-[0-5][0-9])?'
ZONE='(Z|[+-][0-9][0-9]:?[0-9][0-9])?'
TIMESTAMP_PATTERN="(T${CLOCK_COLON}|${CLOCK_DASH}|(^|[^0-9:])${CLOCK_COLON})${ZONE}([^0-9]|$)"

# an iso-8601 DURATION is a fixed span, not an instant — a valid, stable value to assert on.
# a duration carries a lead `P` designator and a `T` with NO date part (PT12:30:00,
# P1DT02:15:30, P3Y6M4DT12:30:05), unlike a stamp (2026-08-08T14:30:00Z). strip durations
# before the timestamp scan, so a duration-only line falls through and a line with a real
# stamp still halts (the stamp survives the strip).
DURATION_PATTERN='P([0-9]+[YMWD])*T([0-9]+[HMS])*[0-9][0-9]:[0-9][0-9](:[0-9][0-9])?'

# collect staged files (added/copied/modified); skip deletions
# core.quotepath=off emits a non-ascii path raw, so `git show` below can read it
staged=$(git -c core.quotepath=off diff --cached --name-only --diff-filter=ACM)

# scan each staged file for a raw timestamp
# note: the here-doc feeds the loop in the current shell (no pipe subshell),
#       so `exit 2` halts the commit directly and a clean pass falls through
while IFS= read -r file; do
  # skip empty lines
  [ -n "$file" ] || continue

  # skip exempt code files (.ts and .sh legitimately carry time logic)
  case "$file" in
    *.ts | *.sh) continue ;;
  esac

  # read the staged blob; fail loud if git cannot read it
  # (git's own stderr flows straight to the terminal, never into the scanned content)
  if ! content=$(git show ":$file"); then
    printf '💥 MalfunctionError: check.timestamps could not read the staged blob\n' >&2
    printf '   └─ %s\n' "$file" >&2
    exit 1
  fi

  # halt if the staged content embeds a raw timestamp. strip iso durations first (sed is
  # line-by-line, so line numbers are preserved): a duration-only line loses its HH:MM:SS run
  # and falls through; a line that also holds a real stamp still matches (the stamp wins)
  match=$(printf '%s\n' "$content" | sed -E "s/$DURATION_PATTERN//g" | grep -nIE "$TIMESTAMP_PATTERN" | head -n 1)
  if [ -n "$match" ]; then
    printf '✋ ConstraintError: timestamps are forbidden in tracked files, prose and docs included. remove them, zero exceptions\n' >&2
    printf '   ├─ why: a timestamp is a privacy leak, and churns every diff\n' >&2
    printf '   └─ %s:%s\n' "$file" "$match" >&2
    exit 2
  fi
done <<EOF
$staged
EOF
