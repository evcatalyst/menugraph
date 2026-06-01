# Mobile Design Notes

## Launch

Open the static app with the lab flag:

- `http://127.0.0.1:4173/?mobileLab=1`
- `http://127.0.0.1:4173/?mobileLab=1&mobileVariant=hybrid`
- `http://127.0.0.1:4173/?mobileLab=1&mobileVariant=cards`
- `http://127.0.0.1:4173/?mobileLab=1&mobileVariant=journey`
- `http://127.0.0.1:4173/?mobileLab=1&mobileVariant=chat`
- `http://127.0.0.1:4173/?mobileLab=1&mobileVariant=recipe`

The default app remains the existing desktop/tablet/mobile workbench unless `mobileLab=1` is present.

## Concepts Attempted

- Hybrid: a bottom-nav mobile shell that connects Discover, Data, Menus, Ask, and Inspire without rewriting the static app.
- Cards: starts in the menu-card deck, emphasizing image-led visual browsing and full-height detail sheets.
- Journey: starts with command/search, story sparks, and guided routes into price, food, and matched-source evidence.
- Chat: starts at the locked Ask surface so natural-language research feels like a first-class mobile mode.
- Recipe: starts in Cook From The Archive, where inspiration cards are explicitly framed as modern interpretation sketches grounded in visible menu evidence.

## Product Bets

- Bottom nav gives mobile users a stronger mental model than shrinking the existing lens tabs.
- Command search can route deterministic actions like price exploration, Ask drafts, and recipe inspiration without introducing an LLM.
- Evidence tray is a lightweight bridge between browsing, asking, comparing, and inspiring.
- Detail as a bottom sheet makes menu inspection feel native and keeps provenance close to the action.
- Recipe inspiration is useful only when caveats and source links are visible on every card.

## Tradeoffs

- The mobile lab is intentionally an experimental layer, not a replacement. It duplicates some presentation logic so the current desktop workbench stays reversible.
- Drag physics for the bottom sheet are represented as Half/Full states rather than a full gesture system.
- Inspiration cards use deterministic source fields such as `topDishes`, date/place/source, and menu links. They do not claim exact recipes.
- Ask still uses the existing shared-secret gate and retrieval path. The lab changes entry and layout, not security.

## Files Changed

- `docs/app.js`: mobile lab router, bottom nav, command routing, cards, detail sheet, evidence tray, Ask and Inspire surfaces.
- `docs/styles.css`: scoped `body.mobile-lab` shell and mobile-first styling.
- `tests/responsive.spec.js`: Playwright coverage for the mobile lab entrypoint and mode behavior.
- `scripts/capture-mobile-lab-screenshots.js`: Playwright capture helper for the required mobile states.
- `docs/MOBILE_DESIGN_NOTES.md`: this summary.

## Tests

Run:

- `npm test`
- `npm run test:e2e`

Added/updated Playwright coverage targets:

- no horizontal overflow in the lab shell,
- bottom nav mode switching,
- menu card detail sheet,
- Ask remains gated before unlock,
- recipe inspiration shows provenance and caveats,
- variant routing chooses the expected starting mode.

## Screenshots

Captured at 390x844 with `node scripts/capture-mobile-lab-screenshots.js` while `npm run dev` is running.

Outputs:

- `docs/mobile-lab-screenshots/discovery-home.png`
- `docs/mobile-lab-screenshots/detail-state.png`
- `docs/mobile-lab-screenshots/ask-state.png`
- `docs/mobile-lab-screenshots/recipe-state.png`

## Recommended Next Direction

Push the hybrid variant further: keep the bottom nav, add gesture-driven sheet states, let the evidence tray power a compare view, and make the command box parse a few more explicit intents such as decade/place filters and "ask about tray."
