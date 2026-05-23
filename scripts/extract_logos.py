"""Extract the brand assets from the supplied PDFs.

Run: python3 scripts/extract_logos.py

Pipeline:
  1. pdftoppm renders each PDF page at 600 dpi to a temp PNG (lossless raster).
  2. We crop to the bounding box of non-black pixels (PDF page bg is black).
  3. Black becomes transparent; the red/white artwork is preserved unmodified.
  4. Writes public/assets/most_mark.png + public/assets/wordmark.png.

The two source PDFs live in this repo's data/ folder (committed so the asset
is reproducible without the original chat upload).
"""
from __future__ import annotations
import pathlib, subprocess, tempfile
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
DATA = ROOT / "data"

JOBS = [
    # (source pdf,           output file,                 max dim)
    (DATA / "logo_mark.pdf",     ASSETS / "most_mark.png", 2400),
    (DATA / "logo_wordmark.pdf", ASSETS / "wordmark.png",  2400),
]


def render(pdf: pathlib.Path, dpi: int = 600) -> Image.Image:
    with tempfile.TemporaryDirectory() as td:
        out = pathlib.Path(td) / "p"
        subprocess.run(
            ["pdftoppm", "-png", "-r", str(dpi), str(pdf), str(out)],
            check=True,
        )
        png = next(pathlib.Path(td).glob("p-*.png"))
        return Image.open(png).convert("RGBA").copy()


def crop_and_transparent(im: Image.Image) -> Image.Image:
    # Treat near-black as background; everything else is content.
    px = im.load()
    w, h = im.size
    # Build alpha: 0 for near-black, original otherwise.
    bg_threshold = 20
    bbox_left, bbox_top, bbox_right, bbox_bottom = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r > bg_threshold or g > bg_threshold or b > bg_threshold:
                if x < bbox_left: bbox_left = x
                if y < bbox_top: bbox_top = y
                if x > bbox_right: bbox_right = x
                if y > bbox_bottom: bbox_bottom = y
                px[x, y] = (r, g, b, 255)
            else:
                px[x, y] = (0, 0, 0, 0)
    if bbox_right <= bbox_left or bbox_bottom <= bbox_top:
        return im
    # Tight crop, small breathing margin.
    pad = 8
    bbox = (
        max(0, bbox_left - pad),
        max(0, bbox_top - pad),
        min(w, bbox_right + 1 + pad),
        min(h, bbox_bottom + 1 + pad),
    )
    return im.crop(bbox)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    for src, dest, max_dim in JOBS:
        if not src.exists():
            print(f"skip: {src} not found")
            continue
        im = crop_and_transparent(render(src))
        # Downscale only if larger than max_dim on long side.
        long_side = max(im.size)
        if long_side > max_dim:
            scale = max_dim / long_side
            new = (round(im.size[0] * scale), round(im.size[1] * scale))
            im = im.resize(new, Image.LANCZOS)
        im.save(dest, "PNG", optimize=True)
        print(f"wrote {dest} {im.size}")


if __name__ == "__main__":
    main()
