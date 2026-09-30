"""Extract local PDF text and metadata, without modifying the originals."""
import json
from html.parser import HTMLParser
from pathlib import Path

import fitz


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == "gg-markup-content":
            self.depth += 1
        if self.depth and tag in ("br", "p", "div"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag == "gg-markup-content":
            self.depth -= 1
            self.parts.append("\n\n")

    def handle_data(self, data):
        if self.depth:
            self.parts.append(data)


root = Path(__file__).resolve().parent.parent
source = root / "The Call of Dagon - EN"
output = root / "reference"
output.mkdir(exist_ok=True)
catalog = []
for path in sorted(source.glob("*.pdf")):
    with fitz.open(path) as document:
        pages = []
        texts = []
        for index, page in enumerate(document):
            text = page.get_text(sort=True)
            texts.append(f"\n--- PAGE {index + 1} ---\n{text}")
            pages.append({"page": index + 1, "width": page.rect.width,
                          "height": page.rect.height, "textLength": len(text),
                          "images": len(page.get_images())})
        (output / (path.stem + ".txt")).write_text("\n".join(texts), encoding="utf-8")
        catalog.append({"file": path.name, "pages": pages})
for path in source.glob("*.htm"):
    parser = ArticleParser()
    parser.feed(path.read_text(encoding="utf-8"))
    (output / "adaptation.txt").write_text("".join(parser.parts), encoding="utf-8")
(output / "catalog.json").write_text(json.dumps(catalog, indent=2), encoding="utf-8")
print(json.dumps([{ "file": item["file"], "pages": len(item["pages"]),
                    "textLength": sum(p["textLength"] for p in item["pages"])}
                  for item in catalog], indent=2))
