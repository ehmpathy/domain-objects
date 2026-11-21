#!/bin/bash

# .what = halt every commit if .husky/check.timestamps.sh differs from the practice's copy
# .why  = the timestamp hook has zero exemptions, by design. a timestamp in a tracked file a
#         privacy leak that ships to every clone and fork, forever. an edit
#         that softens the hook (an exemption, a skip, a looser pattern) lets it back in, so
#         this lock refuses the commit until the hook is reverted
# .how  = compare the git blob id of the hook (on disk, and in the index) to the blob id the
#         practice declared; halt with a constraint error (exit 2) on any mismatch, or with a
#         malfunction error (exit 1) when git cannot read the index
#
# ⛔ do not edit this lock or its expected id by hand to let a changed hook through. the only
#    sanctioned change to the timestamp hook is a practice upgrade, which rewrites both at once.

# the blob id of the declared hook (stamped by the practice on apply)
TIMESTAMPS_LOCK_EXPECTED='afea02deb1cb378e08af49b86070c37cacd5b032'

# the hook under lock; $0 is the hook dir whether sourced by pre-commit or run direct
TIMESTAMPS_LOCK_HOOK="$(dirname -- "$0")/check.timestamps.sh"

# halt with the revert instruction
timestamps_lock_halt() {
  printf '✋ ConstraintError: .husky/check.timestamps.sh was changed. revert the hook, zero exceptions — remove all timestamps\n' >&2
  printf '   ├─ why: the timestamp hook never takes an exemption. a timestamp is a privacy leak\n' >&2
  printf '   ├─ expected: %s\n' "$TIMESTAMPS_LOCK_EXPECTED" >&2
  printf '   ├─ found: %s (%s)\n' "$1" "$2" >&2
  printf '   └─ fix: npx declapract apply --practice husky\n' >&2
  exit 2
}

# halt when the index cannot be read; the hook may be intact, so never say it was changed
timestamps_lock_malfunction() {
  printf '💥 MalfunctionError: the git index is unreadable, so the lock cannot verify .husky/check.timestamps.sh\n' >&2
  printf '   ├─ found: unreadable (in the index)\n' >&2
  printf '   ├─ why: a failed read halts the commit, never reads as "not staged"\n' >&2
  printf '   └─ fix: repair the git index (git status names the fault), then commit again\n' >&2
  exit 1
}

# halt if the hook is absent
[ -f "$TIMESTAMPS_LOCK_HOOK" ] || timestamps_lock_halt 'absent' 'on disk'

# halt if the hook on disk differs
TIMESTAMPS_LOCK_DISK=$(git hash-object -- "$TIMESTAMPS_LOCK_HOOK")
[ "$TIMESTAMPS_LOCK_DISK" = "$TIMESTAMPS_LOCK_EXPECTED" ] || timestamps_lock_halt "$TIMESTAMPS_LOCK_DISK" 'on disk'

# halt if the hook in the index differs (a staged edit, then a revert on disk, still commits the edit)
# the index read stands alone, so a failed read halts rather than reads as "not staged"
TIMESTAMPS_LOCK_STAGE=$(git ls-files -s -- "$TIMESTAMPS_LOCK_HOOK") || timestamps_lock_malfunction
TIMESTAMPS_LOCK_INDEX=$(printf '%s\n' "$TIMESTAMPS_LOCK_STAGE" | awk '{ print $2 }')
[ -z "$TIMESTAMPS_LOCK_INDEX" ] || [ "$TIMESTAMPS_LOCK_INDEX" = "$TIMESTAMPS_LOCK_EXPECTED" ] || timestamps_lock_halt "$TIMESTAMPS_LOCK_INDEX" 'in the index'
