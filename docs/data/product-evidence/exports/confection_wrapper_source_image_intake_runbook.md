# Candy Wrapper Archive Source Image Intake

Generated: 2026-06-07T20:30:00Z
Run ID: cwa-source-image-intake-v1

This public-safe artifact summarizes private source-page image discovery for Candy Wrapper Archive pages. It publishes source-page URLs and counts only; image candidate URLs, cached HTML paths, screenshots, crops, OCR text, and verification decisions stay private.

## Why This Exists

CWA pages are high-yield package-history sources, but ingredient claims still require readable ingredient or nutrition panels. This intake narrows each source page to likely private image candidates before panel crop review.

## Current State

- Selected packets: 49
- Source pages with HTML: 49
- Source pages with image candidates: 49
- Private image candidates: 343

## Operator Path

1. Run with cached HTML or explicitly enable private network fetching.
2. Open the private candidate manifest for image URLs and visual review.
3. For each useful candidate, crop ingredient panel first and nutrition panel second.
4. Fill the CWA private image-map template, then run packet readiness and native OCR.
5. Keep all text candidate-only until manual verification.
