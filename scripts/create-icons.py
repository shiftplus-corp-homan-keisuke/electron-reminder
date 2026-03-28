#!/usr/bin/env python3
"""
Generate placeholder icons for Electron Reminder app.
No external dependencies - pure Python stdlib only.
"""

import struct
import zlib
import math
import os

# ────────────────────────────────────────────────
# PNG writer
# ────────────────────────────────────────────────


def _png_chunk(name: bytes, data: bytes) -> bytes:
    full = name + data
    return (
        struct.pack(">I", len(data))
        + full
        + struct.pack(">I", zlib.crc32(full) & 0xFFFFFFFF)
    )


def make_png(
    width: int, height: int, pixels: list[list[tuple[int, int, int, int]]]
) -> bytes:
    """pixels[y][x] = (r, g, b, a)"""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = _png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))

    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type = None
        for r, g, b, a in row:
            raw += bytes([r, g, b, a])

    idat = _png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    iend = _png_chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ────────────────────────────────────────────────
# Bell icon renderer
# ────────────────────────────────────────────────

# Zinc-800 / white palette  (Windows 11 friendly)
BG = (24, 24, 27, 255)  # zinc-900
FG = (244, 244, 245, 255)  # zinc-100
TRANSP = (0, 0, 0, 0)


def _in_rounded_rect(px: float, py: float, w: float, h: float, r: float) -> bool:
    """Check if (px, py) is inside a rounded rectangle centered at origin."""
    ax, ay = abs(px), abs(py)
    if ax > w / 2 or ay > h / 2:
        return False
    cx = max(ax - (w / 2 - r), 0.0)
    cy = max(ay - (h / 2 - r), 0.0)
    return cx * cx + cy * cy <= r * r


def _dist(ax: float, ay: float, bx: float, by: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)


def bell_pixel(x: int, y: int, size: int) -> tuple[int, int, int, int]:
    """Return RGBA for a bell icon pixel."""
    # Map to [-1, 1] with a small margin
    scale = 2.0 / size
    px = (x + 0.5) * scale - 1.0
    py = (y + 0.5) * scale - 1.0

    # Rounded square background
    if not _in_rounded_rect(px, py, 1.80, 1.80, 0.30):
        return TRANSP

    # ── Bell geometry (normalized coords, Y+ downward) ──
    # Bell arc body: circle segment in upper half
    bell_cx, bell_top = 0.0, -0.55
    arc_r = 0.52
    arc_cy = bell_top + arc_r  # center of arc circle

    in_arc_circle = _dist(px, py, bell_cx, arc_cy) < arc_r
    in_upper_half = py < arc_cy  # only upper part

    # Bell trapezoid body
    bell_y0, bell_y1 = arc_cy, 0.55
    if bell_y0 <= py <= bell_y1:
        t = (py - bell_y0) / (bell_y1 - bell_y0)
        hw = 0.38 + t * 0.10  # slight flare at bottom
        in_body = abs(px - bell_cx) < hw
    else:
        in_body = False

    # Clapper (small circle under bottom edge)
    in_clapper = _dist(px, py, bell_cx, 0.70) < 0.12

    # Handle (small circle on top)
    in_handle = _dist(px, py, bell_cx, bell_top - 0.06) < 0.08

    if (in_arc_circle and in_upper_half) or in_body or in_clapper or in_handle:
        return FG

    return BG


def render_icon(size: int) -> bytes:
    pixels = [[bell_pixel(x, y, size) for x in range(size)] for y in range(size)]
    return make_png(size, size, pixels)


# ────────────────────────────────────────────────
# ICO writer (single PNG entry, Vista+ compatible)
# ────────────────────────────────────────────────


def make_ico(png_data: bytes) -> bytes:
    """Wrap a 256×256 PNG inside an ICO container."""
    # ICO header: reserved=0, type=1 (icon), count=1
    header = struct.pack("<HHH", 0, 1, 1)
    # Directory entry offset = header(6) + entry(16) = 22
    offset = 6 + 16
    # width/height = 0 means 256 in ICO spec
    directory = struct.pack("<BBBBHHII", 0, 0, 0, 0, 1, 32, len(png_data), offset)
    return header + directory + png_data


# ────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(script_dir, "..", "resources")
    os.makedirs(out_dir, exist_ok=True)

    tasks = [
        ("icon.png", 256),
        ("tray-icon@2x.png", 32),
        ("tray-icon.png", 16),
    ]

    png_256 = None
    for filename, size in tasks:
        data = render_icon(size)
        path = os.path.join(out_dir, filename)
        with open(path, "wb") as f:
            f.write(data)
        print(f"✓ {path}  ({size}x{size})")
        if size == 256:
            png_256 = data

    # ICO (256×256 PNG embedded)
    ico_path = os.path.join(out_dir, "icon.ico")
    with open(ico_path, "wb") as f:
        f.write(make_ico(png_256))
    print(f"✓ {ico_path}  (ICO containing 256×256 PNG)")


if __name__ == "__main__":
    main()
