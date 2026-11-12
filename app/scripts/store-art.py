#!/usr/bin/env python3
"""Store art: framed screenshots (App Store 6.9", Google Play phone), the Play feature graphic and 512 icon.

    python3 scripts/store-art.py <raw-shots-dir>

<raw-shots-dir> holds ios/<name>.png and android/<name>.png (full-screen captures, 9:41 status bar), named after
SLIDES below. Output lands in ../store (repo root): ios/ at 1320x2868, android/ at 1080x1920. Needs Pillow.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

APP = Path(__file__).resolve().parent.parent
OUT = APP.parent / 'store'
FONTS = APP / 'node_modules' / '@expo-google-fonts'
SERIF = str(FONTS / 'instrument-serif' / '400Regular' / 'InstrumentSerif_400Regular.ttf')
SANS = str(FONTS / 'plus-jakarta-sans' / '600SemiBold' / 'PlusJakartaSans_600SemiBold.ttf')
INK, INK2 = (15, 27, 45), (28, 46, 74)
GLOW = {'gold': (226, 181, 74, 120), 'mint': (60, 203, 152, 105), 'stamp': (228, 87, 46, 110)}
STAMP = (228, 87, 46)

# name, headline, subline, glow — order = store order. Every line matches what the app does today.
SLIDES = [
    ('status', 'Every date that\nkeeps you here.', 'I-94, work permit, OPT, passport and visa, counted down for you.', 'gold'),
    ('family', 'Your whole house,\nat a glance.', 'Every visa in the family, each with its own clocks.', 'mint'),
    ('clock', 'Know exactly\nwhat to do next.', 'Plain English for every date, with the official rule behind it.', 'stamp'),
    ('travel', 'Travel without\nthe guesswork.', 'Log trips, count days abroad, see the H-1B time you win back.', 'mint'),
    ('cases', 'Every receipt,\nin one place.', 'Each USCIS step explained, for the whole family.', 'gold'),
    ('radar', 'Rule changes,\nbefore they hit.', 'New rules and fees that touch your visa, from the Federal Register.', 'stamp'),
]


def backdrop(w, h, glow):
    """Ink gradient with a soft coloured glow in the top-right: the app's hero-card look."""
    top, bottom = Image.new('RGB', (w, h), INK2), Image.new('RGB', (w, h), INK)
    img = Image.composite(bottom, top, Image.linear_gradient('L').resize((w, h)))
    k = 4  # blur a quarter-size layer, then scale it up: same look, a fraction of the time
    halo = Image.new('RGBA', (w // k, h // k), (0, 0, 0, 0))
    r = w * 0.55 / k
    ImageDraw.Draw(halo).ellipse((w / k - r * 1.2, -r * 0.6, w / k + r * 0.8, r * 1.4), fill=GLOW[glow])
    halo = halo.filter(ImageFilter.GaussianBlur(w * 0.18 / k)).resize((w, h), Image.BICUBIC)
    img.paste(halo, (0, 0), halo)
    return img


def rounded(shot, radius):
    mask = Image.new('L', shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *shot.size), radius, fill=255)
    out = shot.convert('RGBA')
    out.putalpha(mask)
    return out


def text_block(draw, x, y, w, head, sub, head_px, sub_px):
    serif, sans = ImageFont.truetype(SERIF, head_px), ImageFont.truetype(SANS, sub_px)
    for line in head.split('\n'):
        draw.text((x, y), line, font=serif, fill='white')
        y += int(head_px * 1.04)
    y += int(sub_px * 0.7)
    words, line = sub.split(), ''
    for word in words:  # wrap the subline to the width
        trial = f'{line} {word}'.strip()
        if draw.textlength(trial, font=sans) > w and line:
            draw.text((x, y), line, font=sans, fill=(255, 255, 255, 205))
            y += int(sub_px * 1.42)
            line = word
        else:
            line = trial
    draw.text((x, y), line, font=sans, fill=(255, 255, 255, 205))
    return y + int(sub_px * 1.42)


def frame(raw, size, glow, head, sub, head_px, sub_px, margin, shot_w, radius):
    w, h = size
    img = backdrop(w, h, glow)
    draw = ImageDraw.Draw(img, 'RGBA')
    bottom = text_block(draw, margin, int(margin * 1.05), w - margin * 2, head, sub, head_px, sub_px)
    shot = Image.open(raw).convert('RGB')
    shot = shot.resize((shot_w, round(shot.height * shot_w / shot.width)), Image.LANCZOS)
    top = max(bottom + margin // 2, h - shot.height)  # sit on the bottom edge, or bleed past it
    left = (w - shot_w) // 2
    shadow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((left, top + 30, left + shot_w, top + shot.height + 30), radius, fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    img.paste(shadow, (0, 0), shadow)
    framed = rounded(shot, radius)
    ImageDraw.Draw(framed).rounded_rectangle((0, 0, framed.width - 1, framed.height - 1), radius, outline=(255, 255, 255, 70), width=4)
    img.paste(framed, (left, top), framed)
    return img


def shots(raw_dir):
    for platform, size, head_px, sub_px, margin, shot_w, radius in [
        ('ios', (1320, 2868), 150, 46, 110, 1040, 120),     # App Store 6.9" (1320x2868)
        ('android', (1080, 1920), 104, 34, 76, 700, 64),    # Play phone, 9:16
    ]:
        (OUT / platform).mkdir(parents=True, exist_ok=True)
        for i, (name, head, sub, glow) in enumerate(SLIDES, 1):
            raw = raw_dir / platform / f'{name}.png'
            if not raw.exists():
                print('skip (no raw shot):', raw)
                continue
            out = OUT / platform / f'{i:02d}-{name}.jpg'
            frame(raw, size, glow, head, sub, head_px, sub_px, margin, shot_w, radius).save(out, quality=92)
            print('wrote', out.relative_to(OUT.parent))


def play_graphics():
    OUT.mkdir(exist_ok=True)
    Image.open(APP / 'assets/images/icon.png').convert('RGB').resize((512, 512), Image.LANCZOS).save(OUT / 'play-icon-512.png')
    g = backdrop(1024, 500, 'gold')
    halo = Image.new('RGBA', g.size, (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse((-160, 180, 360, 700), fill=GLOW['mint'][:3] + (80,))
    halo = halo.filter(ImageFilter.GaussianBlur(90))
    g.paste(halo, (0, 0), halo)
    mark = Image.open(APP / 'assets/images/splash-icon.png').convert('RGBA').crop((119, 120, 904, 904)).resize((300, 300), Image.LANCZOS)
    g.paste(mark, (92, 100), mark)
    d = ImageDraw.Draw(g, 'RGBA')
    serif = ImageFont.truetype(SERIF, 132)
    d.text((452, 112), 'manend', font=serif, fill='white')
    d.text((452 + d.textlength('manend', font=serif), 112), 'i', font=serif, fill=STAMP)  # the i, the one who stays
    sans = ImageFont.truetype(SANS, 34)
    d.text((458, 286), 'Every date that keeps you here.', font=sans, fill=(255, 255, 255, 220))
    d.text((458, 334), 'Visa status, counted down.', font=sans, fill=(255, 255, 255, 170))
    g.save(OUT / 'play-feature-graphic.png')
    print('wrote store/play-icon-512.png, store/play-feature-graphic.png')


if __name__ == '__main__':
    play_graphics()
    if len(sys.argv) > 1:
        shots(Path(sys.argv[1]))
