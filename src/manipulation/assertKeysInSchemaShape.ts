import { ConstraintError } from 'helpful-errors';

/**
 * .what = fails fast unless every declared key names a real field on the author's schema shape
 * .why =
 *   - a dobj declares its keys in one place (`static primary` / `static unique` / `static nested`)
 *     and its fields in another (`static schema`). the two can drift, and every drift produces the
 *     same defect: a contract that ADVERTISES a field the schema never carried. a `.ref` grain would
 *     pick a hole; a `.nested` entry would publish `x-domain-object: { nested: { board: 'Surfboard' } }`
 *     against a json-schema whose `properties` hold no `board` at all.
 *   - the `.nested` half is the one that hides longest. `hydrateNestedDomainObjects` no-ops on an
 *     absent key, so `.parse()` still succeeds and every in-repo test stays green — the lie surfaces
 *     first in a downstream consumer's codegen, which is precisely the audience the pragma exists to
 *     serve (`rule.forbid.failhide`: the failure travels the wrong channel, to the wrong reader).
 * .why extracted = it is the SECOND caller, and the two are the same primitive rather than two
 *   similar ones: identical logic, identical error family, with only the label text varied
 *   (`rule.prefer.wet-over-dry` — extract at the third caller, unless the near-duplicate IS the
 *   defect). here it is: `.ref` held this gate and `.nested` did not, and that asymmetry is the whole
 *   of the bug. one primitive makes a third surface that reads a declared key inherit the gate rather
 *   than re-earn it.
 * .note = `label` names the SURFACE the caller reached (`X.contract()`, `X.contract().ref('primary')`)
 *   and `declaredIn` names the STATIC that declared the key. both ride into the message, so it names
 *   the fix rather than the symptom (`rule.require.errors-name-the-fix`): the reader learns which of
 *   the two declarations to edit, not merely that they disagree.
 */
export const assertKeysInSchemaShape = (input: {
  dobjName: string;
  keys: readonly string[];
  shape: Record<string, unknown>;
  label: string;
  declaredIn: string;
}): void => {
  // fail loud on the first key with no schema field to back it (never advertise a hole)
  for (const key of input.keys)
    if (!(key in input.shape))
      throw new ConstraintError(
        `${input.label}: key '${key}' is declared in \`${input.declaredIn}\` but absent from \`static schema\`. add '${key}' to ${input.dobjName}'s schema, or drop it from \`${input.declaredIn}\``,
        {
          domainObject: input.dobjName,
          declaredIn: input.declaredIn,
          key,
        },
      );
};
