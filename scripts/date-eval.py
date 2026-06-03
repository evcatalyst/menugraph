#!/usr/bin/env python3
"""Evaluate menu date-estimation predictions.

Input can be CSV or JSONL with these columns/keys:

  menu_id, true_year, lower_year, upper_year, point_year, confidence, method

The script is dependency-free so it can run on the local Mac mini without
creating a Python environment or downloading packages.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any


CONFIDENCE_ORDER = {"A": 4, "B": 3, "C": 2, "D": 1, "X": 0}


def parse_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        number = int(float(str(value)))
    except ValueError:
        return None
    if 1700 <= number <= 2100:
        return number
    return None


def normalize_confidence(value: Any) -> str:
    text = str(value or "").strip().upper()
    return text if text in CONFIDENCE_ORDER else "X"


def decade(year: int | None) -> int | None:
    return None if year is None else (year // 10) * 10


def load_rows(path: Path) -> list[dict[str, Any]]:
    if path.suffix.lower() == ".jsonl":
        rows = []
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
        return rows

    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    true_year = parse_int(row.get("true_year") or row.get("year"))
    lower = parse_int(row.get("lower_year") or row.get("lower"))
    upper = parse_int(row.get("upper_year") or row.get("upper"))
    point = parse_int(row.get("point_year") or row.get("point") or row.get("estimated_year"))
    confidence = normalize_confidence(row.get("confidence"))
    method = str(row.get("method") or row.get("methods") or "unknown").strip() or "unknown"
    return {
        "menu_id": str(row.get("menu_id") or row.get("id") or "").strip(),
        "true_year": true_year,
        "lower_year": lower,
        "upper_year": upper,
        "point_year": point,
        "confidence": confidence,
        "method": method,
        "covered": lower is not None and upper is not None and true_year is not None and lower <= true_year <= upper,
        "mae": abs(point - true_year) if point is not None and true_year is not None else None,
        "decade_match": decade(point) == decade(true_year) if point is not None and true_year is not None else None,
        "interval_width": upper - lower + 1 if lower is not None and upper is not None and upper >= lower else None,
    }


def mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def pct(value: float | None) -> float | None:
    return None if value is None else round(value * 100, 2)


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    eligible = [row for row in rows if row["true_year"] is not None]
    maes = [row["mae"] for row in eligible if row["mae"] is not None]
    coverable = [row for row in eligible if row["lower_year"] is not None and row["upper_year"] is not None]
    decade_rows = [row for row in eligible if row["decade_match"] is not None]
    widths = [row["interval_width"] for row in eligible if row["interval_width"] is not None]

    summary = {
        "total_rows": len(rows),
        "eligible_rows": len(eligible),
        "point_prediction_rows": len(maes),
        "interval_prediction_rows": len(coverable),
        "mean_absolute_error": round(mean(maes), 3) if maes else None,
        "median_absolute_error": statistics.median(maes) if maes else None,
        "interval_coverage_pct": pct(mean([1.0 if row["covered"] else 0.0 for row in coverable])),
        "decade_accuracy_pct": pct(mean([1.0 if row["decade_match"] else 0.0 for row in decade_rows])),
        "mean_interval_width": round(mean(widths), 3) if widths else None,
        "by_confidence": {},
        "by_method": {},
    }

    for field in ("confidence", "method"):
        buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in eligible:
            buckets[row[field]].append(row)
        output_key = f"by_{field}"
        for key, bucket_rows in sorted(buckets.items()):
            bucket_maes = [row["mae"] for row in bucket_rows if row["mae"] is not None]
            bucket_coverable = [row for row in bucket_rows if row["lower_year"] is not None and row["upper_year"] is not None]
            bucket_decades = [row for row in bucket_rows if row["decade_match"] is not None]
            summary[output_key][key] = {
                "rows": len(bucket_rows),
                "mae": round(mean(bucket_maes), 3) if bucket_maes else None,
                "coverage_pct": pct(mean([1.0 if row["covered"] else 0.0 for row in bucket_coverable])),
                "decade_accuracy_pct": pct(mean([1.0 if row["decade_match"] else 0.0 for row in bucket_decades])),
            }

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate date-estimation predictions.")
    parser.add_argument("--input", required=True, help="CSV or JSONL file with predictions and true_year labels.")
    parser.add_argument("--output", help="Optional path for metrics JSON.")
    args = parser.parse_args()

    rows = [normalize_row(row) for row in load_rows(Path(args.input))]
    metrics = summarize(rows)
    text = json.dumps(metrics, indent=2, sort_keys=True)

    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()

