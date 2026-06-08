# CWA Ingredient Packet Private Run Handoff

Generated: 2026-06-07T20:30:00Z

This public-safe handoff describes how to start a private OCR run for selected Candy Wrapper Archive source packets. It treats CWA as the first source-site priority for confection wrapper lineage because the item pages already carry dated package photos. It does not include private local paths, images, OCR text, or verified ingredient claims.

## Current Handoff

- Selected packets: 49
- Selected surfaces: 245
- Primary ingredient/nutrition surfaces: 98
- Products: Butterfinger Bar (8); Reese's Peanut Butter Cups (7); Hershey's Milk Chocolate Bar (6); Kit Kat Bar (6); Snickers Bar (6); M&M's Milk Chocolate Candies (5); Twix Bar (5); Milky Way Bar (4); Tootsie Roll (2)

## Private Operator Commands

Use the private runbook path printed by the scaffold command. It contains the exact local command paths for the private fillable template and OCR outputs.

The command sequence is:

1. `node scripts/build-confection-wrapper-ingredient-packet-audit.js --template=<private-template> ...`
2. `node scripts/build-image-map-from-template.js --template=<private-template> --output=<private-image-map>`
3. `node scripts/run-ingredient-ocr.js --queue=<packet-ocr-queue> --image-map=<private-image-map> ...`
