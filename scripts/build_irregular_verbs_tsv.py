from __future__ import annotations

import csv
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path("/Users/Ilya.Kalibrov/dutch")
SOURCE = ROOT / "Onregelmatige Werkwoorden Alfabetisch.pdf"
OUTPUT = ROOT / "output" / "flashcards" / "onregelmatige_werkwoorden.tsv"


ENGLISH_OVERRIDES = {
    "bewijzen": "to prove",
    "bidden": "to pray",
    "bijten": "to bite",
    "glijden": "to slip, to slide",
    "grijpen": "to grab",
    "hebben": "to have",
    "nemen": "to take",
    "schelden": "to curse",
    "scheppen": "to create",
    "scheren": "to shave",
    "steken": "to stab, to sting",
    "strijken": "to iron",
    "vragen": "to ask",
    "verlaten": "to leave",
    "wijzen": "to show, to point",
    "zingen": "to sing",
}


def clean_dutch(text: str) -> str:
    text = text.replace("–", "-")
    text = text.replace(" ,", ",")
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"(?<=[A-Za-z])\s+(?=[A-Za-z])", "", text)
    text = re.sub(r"\(\s*is\s*\)", "(is)", text)
    return text.strip()


def clean_english(text: str) -> str:
    text = text.replace("–", "-")
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\b([A-Za-z])\s+([A-Za-z])\b", r"\1\2", text)
    text = re.sub(r"\b([A-Za-z])\s+([A-Za-z]{2,})\b", r"\1\2", text)
    text = re.sub(r"\b([A-Za-z]{2,})\s+([A-Za-z])\b", r"\1\2", text)
    text = text.replace("show,to", "show, to")
    return text


def finalize_row(row: dict[str, str]) -> dict[str, str]:
    imperfectum = row["imperfectum"]
    perfectum = row["perfectum"]

    for marker in (" (is)", "(is)", " is", "is"):
        if imperfectum.endswith(marker):
            imperfectum = imperfectum[: -len(marker)].strip()
            helper = "(is)" if "(" in marker else "is"
            perfectum = f"{helper} {perfectum}".strip()
            break

    english = ENGLISH_OVERRIDES.get(row["infinitief"], row["english"])

    return {
        **row,
        "imperfectum": imperfectum,
        "perfectum": perfectum,
        "english": english,
    }


def header_positions(line: str) -> tuple[int, int, int, int]:
    matches = {match.group(1): match.start() for match in re.finditer(r"(infinitief|imperfectum|perfectum|Engels)", line)}
    return (
        matches["infinitief"],
        matches["imperfectum"],
        matches["perfectum"],
        matches["Engels"],
    )


def parse_pdf() -> list[dict[str, str]]:
    reader = PdfReader(str(SOURCE))
    rows: list[dict[str, str]] = []

    for page in reader.pages:
        starts: tuple[int, int, int, int] | None = None
        current: dict[str, str] | None = None
        lines = page.extract_text(extraction_mode="layout").splitlines()

        for line in lines:
            if "infinitief" in line and "imperfectum" in line and "perfectum" in line and "Engels" in line:
                starts = header_positions(line)
                continue

            if not starts or not line.strip() or line.startswith("Bijlage") or "van 6" in line:
                continue

            infinitief = clean_dutch(line[starts[0] : starts[1]].strip())
            imperfectum = clean_dutch(line[starts[1] : starts[2]].strip())
            perfectum = clean_dutch(line[starts[2] : starts[3]].strip())
            english = clean_english(line[starts[3] :].strip())

            if not any((infinitief, imperfectum, perfectum, english)):
                continue

            if infinitief:
                current = {
                    "infinitief": infinitief,
                    "imperfectum": imperfectum,
                    "perfectum": perfectum,
                    "english": english,
                }
                rows.append(current)
                continue

            if current is None:
                continue

            if imperfectum:
                current["imperfectum"] = f"{current['imperfectum']} / {imperfectum}".strip(" /")
            if perfectum:
                current["perfectum"] = f"{current['perfectum']} / {perfectum}".strip(" /")
            if english:
                current["english"] = f"{current['english']} {english}".strip()

    return [finalize_row(row) for row in rows]


def write_tsv(rows: list[dict[str, str]]) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow(
            [
                "DeckType",
                "Front",
                "Back",
                "Infinitief",
                "Imperfectum",
                "Perfectum",
                "English",
            ]
        )
        for row in rows:
            back = f"Imperfectum: {row['imperfectum']} | Perfectum: {row['perfectum']} | English: {row['english']}"
            writer.writerow(
                [
                    "irregular-verbs",
                    row["infinitief"],
                    back,
                    row["infinitief"],
                    row["imperfectum"],
                    row["perfectum"],
                    row["english"],
                ]
            )


def main() -> None:
    rows = parse_pdf()
    write_tsv(rows)
    print(f"Built {len(rows)} irregular verbs in {OUTPUT}")


if __name__ == "__main__":
    main()
