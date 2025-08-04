#!/usr/bin/env python3
"""
图标生成脚本
生成不同尺寸的PNG图标
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    """创建指定尺寸的图标"""
    # 创建透明背景
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 计算缩放比例
    scale = size / 128
    
    # 绘制背景圆形
    center = size // 2
    radius = int(60 * scale)
    draw.ellipse([center - radius, center - radius, center + radius, center + radius], 
                 fill=(26, 115, 232, 255))  # #1a73e8
    
    # 绘制播放按钮
    play_points = [
        (int(50 * scale), int(40 * scale)),
        (int(50 * scale), int(88 * scale)),
        (int(85 * scale), int(64 * scale))
    ]
    draw.polygon(play_points, fill=(255, 255, 255, 255))
    
    # 绘制字幕线条
    line_height = int(4 * scale)
    line_y = int(95 * scale)
    
    # 第一条线
    draw.rounded_rectangle([int(25 * scale), line_y, int(103 * scale), line_y + line_height], 
                          radius=int(2 * scale), fill=(255, 255, 255, 255))
    
    # 第二条线
    line_y = int(103 * scale)
    draw.rounded_rectangle([int(25 * scale), line_y, int(85 * scale), line_y + line_height], 
                          radius=int(2 * scale), fill=(255, 255, 255, 255))
    
    # 第三条线
    line_y = int(111 * scale)
    draw.rounded_rectangle([int(25 * scale), line_y, int(95 * scale), line_y + line_height], 
                          radius=int(2 * scale), fill=(255, 255, 255, 255))
    
    # 绘制下载箭头
    arrow_x = int(100 * scale)
    arrow_y = int(25 * scale)
    arrow_size = int(20 * scale)
    
    # 箭头杆
    draw.rectangle([arrow_x - int(5 * scale), arrow_y, 
                   arrow_x + int(5 * scale), arrow_y + arrow_size], 
                  fill=(255, 255, 255, 255))
    
    # 箭头头部
    arrow_head = [
        (arrow_x - int(10 * scale), arrow_y + arrow_size - int(5 * scale)),
        (arrow_x + int(10 * scale), arrow_y + arrow_size - int(5 * scale)),
        (arrow_x, arrow_y + arrow_size + int(10 * scale))
    ]
    draw.polygon(arrow_head, fill=(255, 255, 255, 255))
    
    return img

def generate_icons():
    """生成所有尺寸的图标"""
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        img = create_icon(size)
        filename = f'icon{size}.png'
        filepath = os.path.join('icons', filename)
        img.save(filepath, 'PNG')
        print(f'生成图标: {filepath}')

if __name__ == '__main__':
    generate_icons()
    print('图标生成完成！')