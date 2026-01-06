"""Summarize the JSON output from tools/audit_form_dex_entries.py.

Usage:
  python tools/summarize_form_dex_audit.py tools/form_dex_audit.json
"""

from __future__ import annotations

import json
import sys
from typing import Any


def main(argv: list[str]) -> int:
    path = argv[1] if len(argv) > 1 else "tools/form_dex_audit.json"
    with open(path, "r", encoding="utf-8") as f:
        data: list[dict[str, Any]] = json.load(f)

    flagged = [r for r in data if (r.get("heuristic") or {}).get("suspicious")]
    multi = [r for r in data if (r.get("variety_count") or 0) > 1]

    print(f"Report: {path}")
    print(f"- Species scanned: {len(data)}")
    print(f"- Species with >1 variety: {len(multi)}")
    print(f"- Heuristic flagged: {len(flagged)}")

    print("\nFirst 40 flagged:")
    for r in flagged[:40]:
        ex = (r.get("heuristic") or {}).get("example") or {}
        ex_version = ex.get("version")
        ex_token = ex.get("token")
        print(
            f"- {int(r.get('species_id')):>4} {r.get('species_name')}: "
            f"tokens={r.get('tokens')} example={ex_version}({ex_token})"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
