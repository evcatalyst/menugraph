# Candy Wrapper Archive Source Panel Candidate Review

Generated: 2026-06-07T20:30:00Z
Run ID: cwa-source-panel-candidate-review-v1

This public-safe artifact summarizes private visual triage of source-page image candidates. It does not publish image URLs, screenshots, crops, OCR text, or verified ingredient claims.

## Why This Exists

Candy Wrapper Archive is valuable because the product pages already provide dated wrapper lineage. That does not automatically make a wrapper photo ingredient evidence. Ingredient photos are primary, nutrition panels are second, and product-front wrapper photos are only secondary story context until a readable ingredient or nutrition surface is confirmed.

## Current State

- Source packets: 49
- Private image candidates: 343
- Packets with explicit panel signal: 0
- Packets with wrapper context only: 49
- Packets needing manual source review: 0

## Operator Path

1. Open the private candidate review CSV or JSON for candidate image URLs.
2. For each packet, inspect ingredient-panel candidates first, nutrition-panel candidates second, and wrapper/front candidates last.
3. If a readable ingredient or nutrition panel is visible, crop that surface privately and fill the image-map template.
4. If only a wrapper front is visible, mark it as product context and add a back-panel/source-hunt gap.
5. Run native OCR only after a private crop path exists, then keep OCR text candidate-only until manual verification.
