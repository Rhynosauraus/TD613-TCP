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
