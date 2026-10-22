# Machine recording under human direction

This source workflow adds legible research records to the machine index. It adds no authoring controls to the human reading interface.

Read `../reference/intake-schema.json`. A concept, paper, experiment, theorem, source note or correction requires an exact identity, original body, source locators, human request reference, evidence disposition, earned claim, claim ceiling and missing evidence. An experiment additionally needs an episode and execution status. Capture declarations retain their original class; an original capture requires its SHA-256.

1. A bot prepares the input JSON at the human's request.
2. Run `node scripts/stage-encyclopedia-record.cjs input.json proposal.json`. The resulting **PROPOSED** packet retains exact original JSON bytes and their digest. Browser/standalone callers may use the read-only `TD613Reference.prepareImport(jsonText)` instead.
3. A human reviews the exact packet. Run `node scripts/admit-encyclopedia-record.cjs proposal.json --human-review-ref <exact-review-reference>` only under that separate direction. The reference is a declared review locator; these tools cannot authenticate human identity or infer authority from a string.
4. Accession writes a new `intake/admitted/R-*.json` without overwrite. Private inputs remain outside the public source index. A correction uses a fresh ID and `supersedes`, preserving prior contents and observer states.
5. Rebuild/check with `node scripts/build-encyclopedia-reference.mjs [--check]`. The admitted record reaches both the complete standalone HTML and small online/GitHub mirrors. Review the PR, source evidence, privacy and actual claim ceilings before merge; deployment still follows its separate operator gate.

Schema acceptance, source-index admission, GitHub merge, deployment and scientific adjudication carry distinct authority. No step calls a provider, acquires a paper, executes an experiment or manufactures empirical credit. A bot can record a held or failed episode honestly, alongside original responses and measurement locators.
