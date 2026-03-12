from __future__ import annotations

import csv
import random
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile


ROOT = Path("/Users/Ilya.Kalibrov/dutch")
SOURCE = ROOT / "Woordenlijst_Dutch_English.docx"
OUTPUT_DIR = ROOT / "output" / "flashcards"
SEED = 20260312

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def extract_rows(path: Path) -> list[dict[str, str]]:
    with ZipFile(path) as archive:
        document_xml = archive.read("word/document.xml")

    root = ET.fromstring(document_xml)
    rows: list[dict[str, str]] = []
    chapter = ""

    first_table = root.find(".//w:tbl", NS)
    if first_table is None:
        raise ValueError("No table found in the source document.")

    for tr in first_table.findall("w:tr", NS):
        cells = []
        for tc in tr.findall("w:tc", NS):
            texts = [t.text for t in tc.findall(".//w:t", NS) if t.text]
            cells.append(" ".join(texts).strip())

        compact_cells = [cell for cell in cells if cell]
        if len(compact_cells) == 1 and compact_cells[0].startswith("Hoofdstuk "):
            chapter = compact_cells[0]
            continue

        if len(cells) < 2:
            continue

        left, right = cells[0].strip(), cells[1].strip()
        if not left or not right:
            continue
        if left == "Nederlands" and right == "English":
            continue
        if left.startswith("Hoofdstuk ") and not right:
            chapter = left
            continue
        if left.startswith("Hoofdstuk ") and right == left:
            chapter = left
            continue
        if left.startswith("Hoofdstuk "):
            chapter = left
            continue

        rows.append(
            {
                "chapter": chapter or "Hoofdstuk ?",
                "dutch": left,
                "english": right,
            }
        )

    return rows


def looks_like_idiom(text: str) -> bool:
    noun_with_article_suffixes = (", de", ", het")
    if text.endswith(noun_with_article_suffixes):
        return False

    idiom_markers = [
        " – ",
        "(",
        ")",
        "geen ",
        "het komt",
        "er is",
        "dan wordt",
        "van – tot",
        "uit de –",
        "met alle",
        "onder – of banken",
        "voor het –",
    ]
    return "," in text or any(marker in text for marker in idiom_markers)


def choose_group(dutch: str, english: str) -> str:
    dutch_l = dutch.lower()
    english_l = english.lower()

    connector_words = [
        "since",
        "because",
        "therefore",
        "after that",
        "provided",
        "unless",
        "although",
        "meanwhile",
        "so that",
        "as long as",
        "by the way",
        "moreover",
        "for the sake of",
        "thanks to",
        "hence",
        "at all times",
        "as one goes",
        "if / in case",
        "especially",
        "in particular",
    ]
    if any(word in english_l for word in connector_words):
        return "Connectors and framing"

    if looks_like_idiom(dutch):
        return "Idioms and fixed expressions"

    mind_words = [
        "mind",
        "spirit",
        "emotion",
        "feeling",
        "sensitive",
        "tense",
        "surprise",
        "annoy",
        "confus",
        "hope",
        "conviction",
        "belief",
        "worry",
        "concern",
        "moved",
        "speechless",
        "hesitat",
        "addicted",
        "reason",
        "sense",
    ]
    if any(word in english_l for word in mind_words):
        return "Mind, emotion, and reaction"

    communication_words = [
        "claim",
        "assert",
        "suggest",
        "expression",
        "utterance",
        "reply",
        "counterargument",
        "convince",
        "persuade",
        "interpret",
        "view",
        "opinion",
        "discuss",
        "talk",
        "mention",
        "appeal",
        "call upon",
        "tone",
        "jargon",
        "say",
        "scrutinize",
        "emphasize",
    ]
    if any(word in english_l for word in communication_words):
        return "Communication and ideas"

    society_words = [
        "market",
        "manager",
        "leadership",
        "majority",
        "countryside",
        "purchase",
        "acquisition",
        "maintenance",
        "support",
        "requirement",
        "demand",
        "priority",
        "resistance",
        "achievement",
        "performance",
        "appointment",
        "guide",
        "preschooler",
        "group",
        "circle",
        "work",
        "effort",
        "commitment",
        "approach",
        "setup",
    ]
    if any(word in english_l for word in society_words):
        return "Society, work, and structure"

    action_words = [
        "to ",
        "reduce",
        "increase",
        "invent",
        "observe",
        "perceive",
        "create",
        "deviate",
        "control",
        "throw",
        "pile",
        "roll up",
        "handle",
        "promote",
        "furnish",
        "set up",
        "maintain",
        "devote",
        "conquer",
        "weaken",
        "demonstrate",
        "complete",
        "expose",
        "take over",
        "consider",
        "remove",
        "continue",
        "devour",
        "perform",
    ]
    if any(word in english_l for word in action_words):
        return "Actions and change"

    concrete_words = [
        "breath",
        "inhalation",
        "exhalation",
        "beauty",
        "access",
        "event",
        "needle",
        "scar",
        "wrinkle",
        "depth",
        "building",
        "snapshot",
        "care",
        "photo",
        "touch",
        "origin",
        "reality",
        "poll",
        "tone",
    ]
    if any(word in english_l for word in concrete_words):
        return "Things, qualities, and descriptions"

    return "Things, qualities, and descriptions"


def tagify(value: str) -> str:
    return (
        value.lower()
        .replace(",", "")
        .replace("(", "")
        .replace(")", "")
        .replace(" ", "_")
        .replace("-", "_")
    )


def build_outputs(rows: list[dict[str, str]]) -> None:
    rng = random.Random(SEED)
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)

    for row in rows:
        group = choose_group(row["dutch"], row["english"])
        row["group"] = group
        row["tags"] = f"{tagify(group)} {tagify(row['chapter'])}"
        grouped[group].append(row)

    group_order = [
        "Connectors and framing",
        "Mind, emotion, and reaction",
        "Communication and ideas",
        "Actions and change",
        "Society, work, and structure",
        "Things, qualities, and descriptions",
        "Idioms and fixed expressions",
    ]

    for items in grouped.values():
        rng.shuffle(items)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    deck_path = OUTPUT_DIR / "dutch_english_flashcards.tsv"
    reverse_path = OUTPUT_DIR / "english_dutch_flashcards.tsv"
    guide_path = OUTPUT_DIR / "study_cards.md"

    with deck_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow(["Front", "Back", "Group", "Chapter", "Tags"])
        for group in group_order:
            for row in grouped.get(group, []):
                writer.writerow(
                    [row["dutch"], row["english"], row["group"], row["chapter"], row["tags"]]
                )

    with reverse_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow(["Front", "Back", "Group", "Chapter", "Tags"])
        for group in group_order:
            for row in grouped.get(group, []):
                writer.writerow(
                    [row["english"], row["dutch"], row["group"], row["chapter"], row["tags"]]
                )

    lines = [
        "# Dutch-English Study Cards",
        "",
        "Source: `Woordenlijst_Dutch_English.docx`",
        "",
        "These cards are shuffled within each theme so you are not studying in alphabetical order.",
        "The group names are heuristic and meant to make review easier, not to replace the original chapter structure.",
        "",
    ]

    card_number = 1
    for group in group_order:
        items = grouped.get(group, [])
        if not items:
            continue
        lines.append(f"## {group}")
        lines.append("")
        for row in items:
            lines.append(f"### Card {card_number}")
            lines.append(f"- Dutch: **{row['dutch']}**")
            lines.append(f"- English: {row['english']}")
            lines.append(f"- Chapter: {row['chapter']}")
            lines.append("")
            card_number += 1

    guide_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    rows = extract_rows(SOURCE)
    build_outputs(rows)
    print(f"Built {len(rows)} flashcards in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
