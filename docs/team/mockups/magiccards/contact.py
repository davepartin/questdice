# contact sheets: per hero (its 3 cards, card area cropped) and an overview of all heroes
import json, os
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)) + '/png/all/'
L = json.load(open(D + 'list.json'))
def crop(f): i = Image.open(f).convert('RGB'); return i.crop((20, 560, 780, 1700))  # card + float button at 2x
heroes = []
for e in L:
    if e['h'] not in heroes: heroes.append(e['h'])
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40)
except Exception: font = ImageFont.load_default()
rows = []
for hh in heroes:
    ims = [crop(e['f']) for e in L if e['h'] == hh and not e['p'].startswith('u:')]
    w, h = ims[0].size; sheet = Image.new('RGB', (w * 3 + 40, h + 90), (10, 12, 22)); dr = ImageDraw.Draw(sheet)
    dr.text((20, 20), hh.upper(), fill=(242, 193, 78), font=font)
    for i, im in enumerate(ims): sheet.paste(im, (10 + i * (w + 10), 80))
    sheet.save(D + f'sheet-{hh}.png'); rows.append(sheet)
u = [crop(e['f']) for e in L if e['p'].startswith('u:')]
if u:
    w, h = u[0].size; s = Image.new('RGB', (w * 3 + 40, h + 90), (10, 12, 22)); ImageDraw.Draw(s).text((20, 20), 'SHARED (POTION · HEAL · HEART CHANGE)', fill=(242, 193, 78), font=font)
    for i, im in enumerate(u): s.paste(im, (10 + i * (w + 10), 80))
    s.save(D + 'sheet-shared.png'); rows.append(s)
W = max(r.width for r in rows); ov = Image.new('RGB', (W, sum(r.height for r in rows)), (10, 12, 22)); y = 0
for r in rows: ov.paste(r, (0, y)); y += r.height
ov = ov.resize((ov.width // 2, ov.height // 2)); ov.save(D + 'overview-all-heroes.png'); print('ok', ov.size)
