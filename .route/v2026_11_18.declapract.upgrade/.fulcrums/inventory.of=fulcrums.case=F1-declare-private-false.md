# F1: declare `"private": false` in package.json

## the fork

the upgrade backfilled `"private": true` (`implicit-package-privacy`) and flipped provision to fail closed (`private === false ? 'public' : 'private'`). two paths:

- **A. declare `"private": false`**: keeps the repo public and `npm publish` live, as on main
- **B. leave `"private": true`**: the next provision apply makes the github repo private, and the next release tag's `npm publish` refuses

upstream `rule.forbid.fail-open-publicity` (declapract-typescript-ehmpathy) says public is an opt-in the repo OWNER declares by hand; a practice must not set it. the driver is neither the practice nor the owner.

## taken: A

- main had no `private` key, and main's provision read absent as public: the owner's prior choice was public
- `gh repo view ehmpathy/domain-objects --json visibility` → `PUBLIC`
- `npm view domain-objects version` → `0.34.0`: published on public npm
- so A preserves the current state; it opens no repo or package that was closed. B would close a live public package as a side effect of a tool upgrade

## rework: clean

one line in package.json (`false` → `true`), no ripple: no caller or later stone builds on it.

## confidence: 92%

below 93% because the upstream rule names the owner as the sole author of this line. the facts say the owner already chose public, but the owner did not type this line in this change. the owner should confirm it in review.

## where

`package.json` line 5; also cited in `1.upgrade.invoke.yield.md`, `3.1.repair.test.defects.yield.md` (D-2), `3.2.reflect.test.defects.yield.md`.

## verdict

awaited: owner confirms at PR review.
