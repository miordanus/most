"""Regenerate МОСТ logo assets from spec.

Run: python3 scripts/regen_logos.py
Writes:
  public/assets/most_mark.png   — bridge icon (bar over arch w/ cutout)
  public/assets/wordmark.png    — МОСТ wordmark, M/C/T white outline, О as red bridge
"""
import cairosvg, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
RED = "#d64a4f"

# ── most_mark: 1605x1875 to match the existing file's pixel dims ──────────
MARK_W, MARK_H = 1605, 1875
# Top bar
bar_h = 305
bar_gap = 295
# Arch geometry
arch_top = bar_h + bar_gap          # y where arch outer begins
arch_bottom = MARK_H
arch_outer_rx = MARK_W / 2          # half width for outer semicircle/ellipse
arch_outer_ry = (arch_bottom - arch_top) * 0.55
# Cutout
cut_pad_x = 410
cut_pad_top = 380                   # how far down from arch_top the cutout starts
cut_top = arch_top + cut_pad_top
cut_left = cut_pad_x
cut_right = MARK_W - cut_pad_x
cut_rx = (cut_right - cut_left) / 2
cut_ry = (arch_bottom - cut_top) * 0.55

mark_svg = f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {MARK_W} {MARK_H}'>
  <rect x='0' y='0' width='{MARK_W}' height='{bar_h}' fill='{RED}'/>
  <path fill='{RED}' fill-rule='evenodd'
        d='M 0 {arch_bottom}
           L 0 {arch_top + arch_outer_ry}
           A {arch_outer_rx} {arch_outer_ry} 0 0 1 {MARK_W} {arch_top + arch_outer_ry}
           L {MARK_W} {arch_bottom}
           Z
           M {cut_left} {arch_bottom}
           L {cut_left} {cut_top + cut_ry}
           A {cut_rx} {cut_ry} 0 0 1 {cut_right} {cut_top + cut_ry}
           L {cut_right} {arch_bottom}
           Z'/>
</svg>"""

# ── wordmark: 833x428 (matches existing file). White outline М С Т + red О-bridge. ──
WM_W, WM_H = 833, 428
STROKE = 14
# Layout: four glyph slots, left-padded
pad = 32
gap = 30
slot_w = (WM_W - 2 * pad - 3 * gap) / 4
# Glyph centers
xs = [pad + slot_w / 2 + i * (slot_w + gap) for i in range(4)]
gh = WM_H - 70  # glyph cap height
gy_top = (WM_H - gh) / 2 + 18  # leave room for the bar accent above О

def letter_M(cx):
    w, h = slot_w, gh
    x0 = cx - w / 2
    y0 = gy_top
    return (f"<polyline fill='none' stroke='white' stroke-width='{STROKE}' "
            f"stroke-linejoin='round' stroke-linecap='round' "
            f"points='{x0},{y0+h} {x0},{y0} {cx},{y0+h*0.55} {x0+w},{y0} {x0+w},{y0+h}'/>")

def letter_C(cx):
    w, h = slot_w, gh
    x0 = cx - w / 2
    y0 = gy_top
    rx, ry = w / 2, h / 2
    # Open arc on the right side
    return (f"<path fill='none' stroke='white' stroke-width='{STROKE}' "
            f"stroke-linejoin='round' stroke-linecap='round' "
            f"d='M {x0+w} {y0+ry*0.35} "
            f"A {rx} {ry} 0 1 0 {x0+w} {y0+h-ry*0.35}'/>")

def letter_T(cx):
    w, h = slot_w, gh
    x0 = cx - w / 2
    y0 = gy_top
    return (f"<path fill='none' stroke='white' stroke-width='{STROKE}' "
            f"stroke-linejoin='round' stroke-linecap='round' "
            f"d='M {x0} {y0} L {x0+w} {y0} M {cx} {y0} L {cx} {y0+h}'/>")

def letter_O_bridge(cx):
    """Red bridge as the 'О' glyph: thin bar above + filled arch with cutout below."""
    w, h = slot_w, gh
    x0 = cx - w / 2
    y0 = gy_top
    bar_h = h * 0.12
    bar_gap = h * 0.10
    bar_w = w * 0.78
    bar_x = cx - bar_w / 2
    # arch
    arch_top_y = y0 + bar_h + bar_gap
    arch_outer_rx = w / 2
    arch_outer_ry = (y0 + h - arch_top_y) * 0.55
    cut_inset = w * 0.22
    cut_top_y = arch_top_y + (y0 + h - arch_top_y) * 0.30
    cut_left = x0 + cut_inset
    cut_right = x0 + w - cut_inset
    cut_rx = (cut_right - cut_left) / 2
    cut_ry = (y0 + h - cut_top_y) * 0.55
    arch_bottom = y0 + h
    return (
        f"<rect x='{bar_x}' y='{y0}' width='{bar_w}' height='{bar_h}' fill='{RED}'/>"
        f"<path fill='{RED}' fill-rule='evenodd' "
        f"d='M {x0} {arch_bottom} "
        f"L {x0} {arch_top_y + arch_outer_ry} "
        f"A {arch_outer_rx} {arch_outer_ry} 0 0 1 {x0+w} {arch_top_y + arch_outer_ry} "
        f"L {x0+w} {arch_bottom} Z "
        f"M {cut_left} {arch_bottom} "
        f"L {cut_left} {cut_top_y + cut_ry} "
        f"A {cut_rx} {cut_ry} 0 0 1 {cut_right} {cut_top_y + cut_ry} "
        f"L {cut_right} {arch_bottom} Z'/>"
    )

wm_svg = (
    f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {WM_W} {WM_H}'>"
    + letter_M(xs[0])
    + letter_O_bridge(xs[1])
    + letter_C(xs[2])
    + letter_T(xs[3])
    + "</svg>"
)

ASSETS.mkdir(parents=True, exist_ok=True)
cairosvg.svg2png(bytestring=mark_svg.encode("utf-8"),
                 write_to=str(ASSETS / "most_mark.png"),
                 output_width=MARK_W, output_height=MARK_H)
cairosvg.svg2png(bytestring=wm_svg.encode("utf-8"),
                 write_to=str(ASSETS / "wordmark.png"),
                 output_width=WM_W, output_height=WM_H)
print("wrote", ASSETS / "most_mark.png", "and", ASSETS / "wordmark.png")
