# Repository instructions

Before creating or modifying any web UI, read `design.md` and the currently loaded `index.css`. Follow the design standards and reuse existing PageHeader, button, input, table and modal patterns. Do not use the legacy blue theme in `styles.css` as a reference.

Keep user-requested local validation separate from production publication. A passing build is not evidence of visual verification. Report unverified states honestly.


## UI changes: mandatory implementation and release gates

- Use `components/ui/Input`, `SearchInput`, `Select`, `Button`/`IconButton`, `Field`, `Tag` and `WorkspaceDialog`. Date inputs use `Input type="date"`; it renders the shared calendar. Never copy private controls from acceptance pages or use browser-native date/select controls in business screens.
- Public control styles belong in `@layer components`. Search icons belong inside SearchInput's flex layout; do not repair spacing with absolute icons and local padding overrides.
- `Button variant="plain"` is reserved for navigation, tabs, drag handles, color choices and text/list actions; ordinary actions use primary/secondary/ghost and shared sizes. File/checkbox/radio controls are deliberate native exceptions.
- Before delivery, run `npm run check:release`: web types, existing business checks, UI contract self-test and scan, production build, and fixture-backed browser regression. Add the affected business path to `tests/ui/` when adding a UI capability. A new entry point must be added to the contract scanner.
- Check desktop 1304×880 and mobile 390×844, open controls, long/empty content, scrolling/fixed actions, keyboard focus/Escape, validation and failed-save input retention. Inspect screenshots; automatic geometry checks do not replace visual review.
- Independently remove duplicate or nonfunctional copy. Record what was removed and why necessary instructions remain in the verification report.
- Deploy a staged build, verify it, then promote that same build and verify the public domain. Record actual test evidence and deployment; do not say CI ran unless it actually did.
