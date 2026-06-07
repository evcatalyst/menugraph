# Confection Wrapper Item Panel Triage

Generated: 2026-06-08T02:15:00Z
Run ID: confection-wrapper-item-panel-triage-v1

This queue turns item-level Candy Wrapper Archive candidates into private capture/OCR work. It remains public-safe: URLs are source references, private paths stay blank, and no ingredient text is verified.

## Rules

- Capture item pages or source images privately only.
- Treat direct image URLs as private capture references, not public embeds.
- Classify wrapper front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility before OCR.
- Run OCR only on readable ingredient, nutrition, net-weight, maker, or useful package text surfaces.
- Do not promote ingredient claims without corrected transcription, reviewer attribution, and manual verification.

## Operator Flow

1. Start with high-priority item rows.
2. Capture item page and/or source image under `.cache/ingredient-ocr/runs/<run-id>/`.
3. Fill a private copy of the image-map template with local crop paths.
4. Run native OCR against that private image map.
5. Keep OCR output candidate-only until manual correction and review.

## First Rows

- Tootsie Roll: 1940s Tootsie Roll; https://www.candywrapperarchive.com/candy-collector/1940s-tootsie-roll/; Privately capture the linked source image and item page, then classify wrapper text, net weight, maker, and panel readability before OCR.
- Tootsie Roll: 1960s Tootsie Roll; https://www.candywrapperarchive.com/candy-collector/1960s-tootsie-roll-2/; Privately capture the linked source image and item page, then classify wrapper text, net weight, maker, and panel readability before OCR.
- Kit Kat Bar: 1960s Kit Kat; https://www.candywrapperarchive.com/candy-collector/1960s-kit-kat/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
- Kit Kat Bar: 1970s Kit Kat; https://www.candywrapperarchive.com/candy-collector/1970s-kit-kat/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
- Milky Way Bar: 1939 Milky Way; https://www.candywrapperarchive.com/candy-collector/1939-milky-way/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
- Milky Way Bar: 1940s Milky Way; https://www.candywrapperarchive.com/candy-collector/1940s-milky-way/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
- Snickers Bar: 1939 Snickers; https://www.candywrapperarchive.com/candy-collector/1940s-snickers/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
- Snickers Bar: 1940s Snickers; https://www.candywrapperarchive.com/candy-collector/1940s-snickers-2/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
- Twix Bar: 2002 Twix; https://www.candywrapperarchive.com/candy-collector/2002-twix/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
- Twix Bar: 2003 Twix; https://www.candywrapperarchive.com/candy-collector/2003-twix/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
- Kit Kat Bar: 2000 Kit Kat; https://www.candywrapperarchive.com/candy-collector/2000-kit-kat/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
- Kit Kat Bar: 2002 Kit Kat; https://www.candywrapperarchive.com/candy-collector/2002-kit-kat/; Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.
