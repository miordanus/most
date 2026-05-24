"""Audit and propose updates from the printed-menu xlsx vs menu.dishes.

Usage:
    python3 scripts/menu/ingest_xlsx_report.py \\
        --xlsx "/path/to/Приложение к меню.xlsx" \\
        --dishes-json tmp/dishes.json \\
        --out tmp/ingest-report.md

Produces a markdown report — DOES NOT WRITE TO THE DB.

The companion step (apply-after-review) is a small set of UPDATE statements
generated separately once the founder confirms the mapping.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import openpyxl


# --- normalisation -----------------------------------------------------------

_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_SPACE_RE = re.compile(r"\s+")


def normalise(name: str) -> str:
    """Lowercase, strip punctuation, collapse spaces, unify ё→е."""
    if name is None:
        return ""
    s = unicodedata.normalize("NFKC", str(name)).strip().lower()
    s = s.replace("ё", "е")
    s = _PUNCT_RE.sub(" ", s)
    s = _SPACE_RE.sub(" ", s).strip()
    return s


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, normalise(a), normalise(b)).ratio()


# --- data --------------------------------------------------------------------

@dataclass
class XlsxRow:
    idx: int
    name: str
    ingredients: str | None
    weight_raw: Any
    kcal: int | None
    protein: int | None
    fat: int | None
    carbs: int | None

    @property
    def weight_g(self) -> int | None:
        """Pick a single integer weight (first number in the cell), or None."""
        if self.weight_raw is None:
            return None
        s = str(self.weight_raw).strip()
        if s in ("", "-"):
            return None
        m = re.match(r"\s*(\d+)", s)
        return int(m.group(1)) if m else None

    @property
    def weight_label(self) -> str | None:
        if self.weight_raw is None:
            return None
        s = str(self.weight_raw).strip()
        return s or None


@dataclass
class DishRow:
    id: str
    name: str
    category: str
    ingredients: str | None
    weight_g: int | None
    kcal: int | None
    name_source: str | None
    ingredients_source: str | None
    nutrition_source: str | None


def load_xlsx(path: Path) -> list[XlsxRow]:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    rows: list[XlsxRow] = []
    # Skip header rows (row 1 is blank-ish, row 2 is header).
    for i, raw in enumerate(ws.iter_rows(min_row=3, values_only=True), start=3):
        if not raw or not raw[0]:
            continue
        name, ingredients, weight, kcal, protein, fat, carbs, *_ = list(raw) + [None] * 7
        if name is None:
            continue
        rows.append(
            XlsxRow(
                idx=i,
                name=str(name).strip(),
                ingredients=str(ingredients).strip() if ingredients else None,
                weight_raw=weight,
                kcal=int(kcal) if isinstance(kcal, (int, float)) else None,
                protein=int(protein) if isinstance(protein, (int, float)) else None,
                fat=int(fat) if isinstance(fat, (int, float)) else None,
                carbs=int(carbs) if isinstance(carbs, (int, float)) else None,
            )
        )
    return rows


def load_dishes(path: Path) -> list[DishRow]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    out: list[DishRow] = []
    for r in raw:
        out.append(
            DishRow(
                id=r["id"],
                name=r["name"],
                category=r.get("category") or "",
                ingredients=r.get("ingredients"),
                weight_g=r.get("weight_g"),
                kcal=r.get("kcal"),
                name_source=r.get("name_source"),
                ingredients_source=r.get("ingredients_source"),
                nutrition_source=r.get("nutrition_source"),
            )
        )
    return out


# --- matching ----------------------------------------------------------------

EXACT = 1.0
HIGH = 0.85   # confident auto-match
MID = 0.70    # needs review
# below MID: treat as no match


def rank_candidates(x: XlsxRow, dishes: list[DishRow]) -> list[tuple[float, DishRow]]:
    scored = [(similarity(x.name, d.name), d) for d in dishes]
    scored.sort(key=lambda t: t[0], reverse=True)
    return scored


# --- bad-match detection -----------------------------------------------------
# A dish row has ingredients_source='xlsx' / nutrition_source='xlsx', meaning
# something was copied from the spreadsheet at some point. Verify the copied
# ingredients still match an xlsx row whose NAME is close to the dish's name.

def detect_bad_existing_matches(
    dishes: list[DishRow], xlsx: list[XlsxRow]
) -> list[tuple[DishRow, XlsxRow | None, float]]:
    """For dishes claiming xlsx provenance, find which xlsx row their stored
    ingredients came from (by ingredients-text similarity) and check whether
    the names also agree."""
    bad: list[tuple[DishRow, XlsxRow | None, float]] = []
    for d in dishes:
        if d.ingredients_source != "xlsx" or not d.ingredients:
            continue
        # Find xlsx row whose ingredients text best matches this dish's stored ingredients.
        best_x: XlsxRow | None = None
        best_score = 0.0
        for x in xlsx:
            if not x.ingredients:
                continue
            s = similarity(d.ingredients, x.ingredients)
            if s > best_score:
                best_score = s
                best_x = x
        if best_x is None:
            bad.append((d, None, 0.0))
            continue
        # If the dish's NAME doesn't agree with that xlsx row's name, it's a bad match.
        name_sim = similarity(d.name, best_x.name)
        if name_sim < HIGH:
            bad.append((d, best_x, name_sim))
    return bad


# --- report ------------------------------------------------------------------

def fmt_diff(label: str, old: Any, new: Any) -> str | None:
    """Return a 'label: old -> new' line if they differ, else None."""
    if old == new:
        return None
    return f"  - {label}: `{old!r}` → `{new!r}`"


def build_report(xlsx: list[XlsxRow], dishes: list[DishRow]) -> str:
    by_xlsx_idx_match: dict[int, tuple[float, DishRow]] = {}
    auto: list[tuple[XlsxRow, DishRow, float]] = []
    review: list[tuple[XlsxRow, list[tuple[float, DishRow]]]] = []
    nomatch_xlsx: list[XlsxRow] = []

    for x in xlsx:
        ranked = rank_candidates(x, dishes)
        if not ranked:
            nomatch_xlsx.append(x)
            continue
        top_score, top = ranked[0]
        if top_score >= HIGH:
            auto.append((x, top, top_score))
            by_xlsx_idx_match[x.idx] = (top_score, top)
        elif top_score >= MID:
            review.append((x, ranked[:3]))
        else:
            nomatch_xlsx.append(x)

    matched_dish_ids = {m.id for _, m in by_xlsx_idx_match.values()}
    nomatch_dishes = [d for d in dishes if d.id not in matched_dish_ids]

    bad_existing = detect_bad_existing_matches(dishes, xlsx)

    # ------------------------------------------------------------------
    out: list[str] = []
    out.append("# Menu xlsx ingest report\n")
    out.append(f"Generated against {len(xlsx)} xlsx rows and {len(dishes)} dish rows.\n")
    out.append("**No changes applied** — this is a proposal you confirm before any UPDATE runs.\n")

    # ----- Bad existing matches first — these are the urgent fix -------
    out.append("\n## 1. Suspected bad existing matches (URGENT)\n")
    out.append(
        "Dishes that currently have `ingredients_source='xlsx'` but whose stored "
        "ingredients appear to belong to a different xlsx row (name disagrees with "
        "the row that best matches the stored ingredients text).\n"
    )
    if not bad_existing:
        out.append("_None found._\n")
    else:
        for d, x, name_sim in bad_existing:
            out.append(f"\n### `{d.id}` — {d.name}")
            if x is None:
                out.append("  - Stored ingredients don't match ANY xlsx row.")
            else:
                out.append(f"  - Stored ingredients best-match xlsx row {x.idx}: **{x.name}** (name sim {name_sim:.2f})")
                out.append(f"  - DB ingredients: `{(d.ingredients or '')[:140]}…`")
                out.append(f"  - That xlsx row's ingredients: `{(x.ingredients or '')[:140]}…`")
                out.append(f"  - **Fix**: revert this dish's ingredients/nutrition to unknown, OR re-map to the correct xlsx row.")

    # ----- Confident auto-applies --------------------------------------
    out.append("\n## 2. Confident matches — auto-apply candidates\n")
    out.append(
        f"{len(auto)} xlsx rows match an existing dish with name similarity ≥ {HIGH}. "
        "For each, the proposed UPDATE writes ingredients, weight, kcal, p/f/c and sets sources to `'real'`.\n"
    )
    for x, d, score in sorted(auto, key=lambda t: t[0].name):
        diffs: list[str] = []
        for line in [
            fmt_diff("ingredients", d.ingredients, x.ingredients),
            fmt_diff("weight_g", d.weight_g, x.weight_g),
            fmt_diff("kcal", d.kcal, x.kcal),
        ]:
            if line:
                diffs.append(line)
        out.append(f"\n### `{d.id}` ← xlsx#{x.idx}  ({score:.2f})  {d.name}")
        if diffs:
            out.extend(diffs)
        else:
            out.append("  - No field changes (just source-flag promotion to `real`).")

    # ----- Needs decision ----------------------------------------------
    out.append("\n## 3. Ambiguous — needs decision\n")
    out.append(
        f"{len(review)} xlsx rows had a best candidate with similarity in [{MID}, {HIGH}). "
        "Pick one (or 'skip').\n"
    )
    for x, candidates in sorted(review, key=lambda t: t[0].name):
        out.append(f"\n### xlsx#{x.idx} — **{x.name}**")
        for sc, d in candidates:
            out.append(f"  - {sc:.2f} `{d.id}` {d.name}  (category={d.category})")

    # ----- Unmatched xlsx rows ----------------------------------------
    out.append("\n## 4. xlsx rows with no DB dish (would need INSERT)\n")
    if not nomatch_xlsx:
        out.append("_None._\n")
    else:
        for x in nomatch_xlsx:
            out.append(f"  - xlsx#{x.idx} **{x.name}** — kcal {x.kcal}, weight {x.weight_label!r}")

    # ----- Dishes with no xlsx counterpart ----------------------------
    out.append("\n## 5. Dishes with no xlsx counterpart\n")
    out.append(
        "These dishes stay as-is. Their ingredients/nutrition either came from elsewhere "
        "(mockup or manual) or are missing. Listed for awareness.\n"
    )
    for d in sorted(nomatch_dishes, key=lambda d: d.name):
        flags = []
        if d.ingredients_source == "unknown":
            flags.append("ingr=unknown")
        if d.nutrition_source == "unknown":
            flags.append("nutr=unknown")
        out.append(f"  - `{d.id}` {d.name} — {', '.join(flags) if flags else 'sourced'}")

    # ----- Summary -----------------------------------------------------
    out.append("\n## Summary counts\n")
    out.append(f"- xlsx rows: {len(xlsx)}")
    out.append(f"- dishes: {len(dishes)}")
    out.append(f"- auto-match candidates: {len(auto)}")
    out.append(f"- ambiguous (needs review): {len(review)}")
    out.append(f"- xlsx with no dish: {len(nomatch_xlsx)}")
    out.append(f"- dishes with no xlsx: {len(nomatch_dishes)}")
    out.append(f"- suspected bad existing matches: {len(bad_existing)}")

    return "\n".join(out) + "\n"


# --- CLI ---------------------------------------------------------------------

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--xlsx", required=True, type=Path)
    p.add_argument("--dishes-json", required=True, type=Path,
                   help="JSON array of dish rows (export from menu.dishes).")
    p.add_argument("--out", required=True, type=Path)
    args = p.parse_args()

    xlsx = load_xlsx(args.xlsx)
    dishes = load_dishes(args.dishes_json)
    report = build_report(xlsx, dishes)
    args.out.write_text(report, encoding="utf-8")
    print(f"Wrote {args.out} — {len(report.splitlines())} lines.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
