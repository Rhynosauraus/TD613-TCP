# Encyclopedia navigation repair · review state

Parent: `9741c9bcb8146a0bda78281a8057431f1da7d435`.

The existing 532-entry lexicon interrupted reading every 20 entries and replaced browser history on section changes. The candidate defaults to 100 entries with 25/50/100 selection, offers pagination above and below the list, and adds an unboxed persistent back arrow, reading-location links, adjacent headwords, and an evidence-label explanation. Back/forward and reload retain reading filters, selected headword, page size, reader state, focus target, and scroll position. Direct entry has a local return fallback; the cover’s back link leads to Aperture.

Only the encyclopedia presentation, its focused test suite, this review note, and one test invocation in the existing validation workflow change. Canonical audit JSON, formula maps and retained mathematical implementation before the reading-interface boundary are byte-identical to the parent. Aperture’s canonical instrument and release manifest remain untouched.

## Reproduce

```sh
npm ci
node --test tests/encyclopedia-navigation.test.mjs
node --test tests/sitewide-browser-epoch.test.mjs
node tests/aperture-canonical-route.test.mjs
node scripts/aperture-check-sync.mjs
node tests/workflow-estate.test.mjs
node tests/tcp-smoke.test.mjs
node tests/vercel-deploy-hygiene.test.mjs
git diff --check
```

The focused suite executes the actual complete HTML using JSDOM, including desktop/mobile media branches. Canvas, scrolling, dialog platform calls and media queries are stubbed. It witnesses DOM state, computed finite results, focus targets and history transactions; it supplies no rendered-layout, trusted-browser-gesture, screen-reader or physical-iOS evidence.

## Required rendered witness · HELD

The interactive browser-control tool used for the preceding release is unavailable in this session. The root AGENTS.md browser-witness rule therefore remains unsatisfied. Keep this candidate unmerged and unreleased until the actual candidate route is exercised at desktop and approximately 390px, including keyboard focus, scrolling, same-tab reload, native back/forward, direct record entry, search from a dossier and return across a page boundary. Check that the header arrow fits, the paper reader and pagination remain reachable, and the accepted cover/composition remain visually intact. Physical iOS and human aesthetic acceptance retain their own evidence status.

No #405 release gesture is authorized by this review note. The operator has requested the navigation update; a future release must still satisfy exact-head CI, browser witnessing and the existing #405 release law.


## Live browser timing correction

The first #405 release of PR #1585 completed successfully. A subsequent trusted browser click showed the 100-entry Lexicon while its location line and back label still described the cover. The capture listener scheduled a microtask; Chromium can checkpoint that microtask before the later bubbling renderer, so history was recorded too early. The repair moves history commit to the next task, after the entire click dispatch. The actual-HTML suite now injects immediate microtask execution as an adversarial ordering control: the historical implementation fails the desktop return scenario; the repaired implementation passes all seven scenarios. This synthetic scheduling control is separate from the observed browser failure and subsequent live verification.

The earlier premerge HOLD described the initial review disposition. The actual release workflow explicitly assigns premerge authority to the fast contract lane and keeps deep browser diagnostics manual. The operator subsequently authorized #405 release. Live browser verification remains required for claims of observed behavior; physical iOS and approximately 390px rendered behavior remain unobserved in this browser environment.
