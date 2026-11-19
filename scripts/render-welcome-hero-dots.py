#!/usr/bin/env python3
"""Pixel-dome header used by the welcome email. Colors match badge v3 and the ticket email."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/email/welcome-hero-dots.png"

W, H = 1200, 460  # 2x of a 600x230 CSS header
BLUE = (61, 63, 226)  # #3D3FE2
DOT = (47, 48, 149)   # #2F3095

def main() -> None:
    img = Image.new("RGB", (W, H), BLUE)
    draw = ImageDraw.Draw(img)
    square, gap = 40, 6
    pitch = square + gap
    x_right, y_top = W - square, 0
    columns = {
        0: list(range(0, 9)),
        1: list(range(0, 8)),
        2: list(range(0, 7)),
        3: list(range(0, 6)),
        4: [0, 1, 2, 3, 4],
        5: [0, 1, 2, 3],
        6: [0, 1, 2],
        7: [0, 1],
        8: [0, 1],
        9: [0],
        10: [0],
    }
    extras = [(2, 8), (3, 7), (4, 6), (5, 5), (6, 4), (7, 3)]
    for ci, rows in columns.items():
        x = x_right - ci * pitch
        for ri in rows:
            y = y_top + ri * pitch
            if y + square > H:
                continue
            draw.rectangle([x, y, x + square - 1, min(y + square - 1, H - 1)], fill=DOT)
    for ci, ri in extras:
        x = x_right - ci * pitch
        y = y_top + ri * pitch
        if y + square <= H:
            draw.rectangle([x, y, x + square - 1, y + square - 1], fill=DOT)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} {img.size}")

if __name__ == "__main__":
    main()
