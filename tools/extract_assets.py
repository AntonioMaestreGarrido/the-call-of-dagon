"""Export original embedded component images and source-page previews."""
import json
from pathlib import Path
import re

import pymupdf

root = Path(__file__).resolve().parent.parent
source = root / "The Call of Dagon - EN"
target = root / "public" / "assets"
previews = root / "reference" / "previews"
target.mkdir(parents=True, exist_ok=True)
previews.mkdir(parents=True, exist_ok=True)
manifest = []
for path in sorted(source.glob("*.pdf")):
    if path.stem.lower().startswith(("gs_rules", "gs-rules", "ghoststories")):
        continue
    slug = re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-")
    with pymupdf.open(path) as doc:
        exported = {}
        for page_index, page in enumerate(doc):
            page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5)).save(
                previews / f"{slug}-{page_index + 1:02}.png")
            for image_index, item in enumerate(page.get_images(full=True)):
                xref = item[0]
                if xref not in exported:
                    data = doc.extract_image(xref)
                    filename = f"{slug}-{page_index + 1:02}-{image_index + 1:02}.{data['ext']}"
                    (target / filename).write_bytes(data["image"])
                    exported[xref] = filename
                manifest.append({"source": path.name, "page": page_index + 1,
                                 "index": image_index + 1, "file": exported[xref],
                                 "width": item[2], "height": item[3],
                                 "rects": [list(rect) for rect in page.get_image_rects(xref)]})
(target / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print(f"Exported {len(set(item['file'] for item in manifest))} original images; {len(manifest)} placements.")
