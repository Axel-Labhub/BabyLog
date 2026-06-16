from PIL import Image, ImageDraw
import math
import os

NORMAL_COLOR = (136, 136, 136, 255)
ACTIVE_COLOR = (255, 149, 0, 255)
BG_COLOR = (255, 255, 255, 0)
SIZE = 81

def draw_record_icon(draw, color):
    draw.rounded_rectangle([25, 30, 56, 70], radius=8, outline=color, width=3)
    draw.rectangle([35, 22, 46, 32], outline=color, width=3)
    draw.line([30, 45, 35, 45], fill=color, width=2)
    draw.line([30, 55, 35, 55], fill=color, width=2)

def draw_history_icon(draw, color):
    draw.ellipse([20, 20, 61, 61], outline=color, width=3)
    draw.line([40, 40, 40, 28], fill=color, width=3)
    draw.line([40, 40, 52, 40], fill=color, width=2)
    draw.ellipse([37, 37, 43, 43], fill=color)

def draw_baby_icon(draw, color):
    draw.ellipse([25, 22, 56, 53], outline=color, width=3)
    draw.ellipse([33, 32, 37, 36], fill=color)
    draw.ellipse([44, 32, 48, 36], fill=color)
    draw.arc([35, 38, 46, 46], 0, 180, fill=color, width=2)
    draw.rounded_rectangle([28, 53, 53, 72], radius=5, outline=color, width=3)

def draw_settings_icon(draw, color):
    draw.ellipse([30, 30, 51, 51], outline=color, width=3)
    center = (40, 40)
    for i in range(8):
        angle = i * math.pi / 4
        x1 = center[0] + 18 * math.cos(angle)
        y1 = center[1] + 18 * math.sin(angle)
        x2 = center[0] + 24 * math.cos(angle)
        y2 = center[1] + 24 * math.sin(angle)
        draw.line([x1, y1, x2, y2], fill=color, width=3)
    draw.ellipse([35, 35, 45, 45], fill=color)

ICONS = {
    'record': draw_record_icon,
    'history': draw_history_icon,
    'baby': draw_baby_icon,
    'settings': draw_settings_icon,
}

output_dir = '/workspace/babylog-miniprogram/miniprogram/assets/icons'
os.makedirs(output_dir, exist_ok=True)

for name, func in ICONS.items():
    img = Image.new('RGBA', (SIZE, SIZE), BG_COLOR)
    draw = ImageDraw.Draw(img)
    func(draw, NORMAL_COLOR)
    img.save(f'{output_dir}/{name}.png', 'PNG')
    img2 = Image.new('RGBA', (SIZE, SIZE), BG_COLOR)
    draw2 = ImageDraw.Draw(img2)
    func(draw2, ACTIVE_COLOR)
    img2.save(f'{output_dir}/{name}-active.png', 'PNG')
    print(f"OK {name}")

print("Done!")
