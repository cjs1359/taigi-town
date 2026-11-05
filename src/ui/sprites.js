/**
 * Cute Taiwanese-town isometric sprites with offscreen caching.
 * Palette matches 生活島: paper #f7f4eb, ink #263e38, green #315f50, orange #cf704d.
 */
import { drawDiamond, shade } from './iso.js';

const CACHE = new Map();
const SPRITE_W = 200;
const SPRITE_H = 240;
const ANCHOR_Y = 170; // ground diamond center y inside sprite

export function hash2(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return (n ^ (n >>> 16)) >>> 0;
}

export function variantOf(x, y, n) {
  return hash2(x, y) % n;
}

function getCached(key, paint) {
  let c = CACHE.get(key);
  if (c) return c;
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const ctx = canvas.getContext('2d');
  paint(ctx, SPRITE_W / 2, ANCHOR_Y, 110, 55);
  CACHE.set(key, canvas);
  return canvas;
}

export function clearSpriteCache() {
  CACHE.clear();
}

/** Blit a cached sprite centered on tile (sx,sy). */
export function blitSprite(ctx, canvas, sx, sy, scale) {
  // Draw ~1.15 tiles wide so details read at tablet zoom
  const w = SPRITE_W * scale * 0.62;
  const h = SPRITE_H * scale * 0.62;
  const ax = sx - w / 2;
  const ay = sy - ANCHOR_Y * scale * 0.62;
  ctx.drawImage(canvas, ax, ay, w, h);
}

function softShadow(ctx, sx, sy, tw, th, alpha = 0.22) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(sx, sy + th * 0.18, tw * 0.42, th * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#263e38';
  ctx.fill();
  ctx.restore();
}

function bodyBox(ctx, sx, sy, tw, th, h, wall, wallL, wallR) {
  // left
  ctx.beginPath();
  ctx.moveTo(sx - tw / 2, sy - h);
  ctx.lineTo(sx, sy - h + th / 2);
  ctx.lineTo(sx, sy + th / 2);
  ctx.lineTo(sx - tw / 2, sy);
  ctx.closePath();
  ctx.fillStyle = wallL;
  ctx.fill();
  // right
  ctx.beginPath();
  ctx.moveTo(sx + tw / 2, sy - h);
  ctx.lineTo(sx, sy - h + th / 2);
  ctx.lineTo(sx, sy + th / 2);
  ctx.lineTo(sx + tw / 2, sy);
  ctx.closePath();
  ctx.fillStyle = wallR;
  ctx.fill();
  // top plate (under roof)
  drawDiamond(ctx, sx, sy - h, tw, th, wall, null);
}

function gabledRoof(ctx, sx, sy, tw, th, h, roofL, roofR, ridge) {
  // left roof plane
  ctx.beginPath();
  ctx.moveTo(sx - tw / 2 - 2, sy - h);
  ctx.lineTo(sx, sy - h - th * 0.55);
  ctx.lineTo(sx, sy - h + th * 0.15);
  ctx.lineTo(sx - tw / 2, sy - h + th * 0.35);
  ctx.closePath();
  ctx.fillStyle = roofL;
  ctx.fill();
  // right roof plane
  ctx.beginPath();
  ctx.moveTo(sx + tw / 2 + 2, sy - h);
  ctx.lineTo(sx, sy - h - th * 0.55);
  ctx.lineTo(sx, sy - h + th * 0.15);
  ctx.lineTo(sx + tw / 2, sy - h + th * 0.35);
  ctx.closePath();
  ctx.fillStyle = roofR;
  ctx.fill();
  // ridge line
  ctx.strokeStyle = ridge || shade(roofL, -25);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(sx, sy - h - th * 0.55);
  ctx.lineTo(sx, sy - h + th * 0.12);
  ctx.stroke();
  // tile suggestion lines
  ctx.strokeStyle = 'rgba(255,252,244,0.22)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(sx - (tw / 2 + 2) * (1 - t * 0.3), sy - h - th * 0.55 * (1 - t) + t * 2);
    ctx.lineTo(sx, sy - h - th * 0.55 + t * th * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + (tw / 2 + 2) * (1 - t * 0.3), sy - h - th * 0.55 * (1 - t) + t * 2);
    ctx.lineTo(sx, sy - h - th * 0.55 + t * th * 0.55);
    ctx.stroke();
  }
}

function flatRoof(ctx, sx, sy, tw, th, h, color, rim) {
  drawDiamond(ctx, sx, sy - h, tw + 4, th + 2, color, rim || 'rgba(38,62,56,0.25)');
}

function windowPair(ctx, sx, sy, tw, th, h, rows, cols, wallSide = 'both') {
  const win = '#dfe9ef';
  const frame = '#3a5550';
  const glow = 'rgba(255,250,220,0.55)';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const oy = sy - h + th * 0.2 + r * (h / (rows + 1.1));
      if (wallSide === 'left' || wallSide === 'both') {
        const ox = sx - tw * 0.3 + c * 11;
        ctx.fillStyle = frame;
        ctx.fillRect(ox - 1, oy - 1, 8, 9);
        ctx.fillStyle = win;
        ctx.fillRect(ox, oy, 6, 7);
        ctx.fillStyle = glow;
        ctx.fillRect(ox + 1, oy + 1, 2, 2);
        // mullion
        ctx.strokeStyle = 'rgba(38,62,56,0.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(ox + 3, oy); ctx.lineTo(ox + 3, oy + 7);
        ctx.stroke();
      }
      if (wallSide === 'right' || wallSide === 'both') {
        const ox = sx + tw * 0.06 + c * 11;
        ctx.fillStyle = frame;
        ctx.fillRect(ox - 1, oy - 1, 8, 9);
        ctx.fillStyle = win;
        ctx.fillRect(ox, oy, 6, 7);
        ctx.fillStyle = glow;
        ctx.fillRect(ox + 1, oy + 1, 2, 2);
      }
    }
  }
}

function door(ctx, sx, sy, tw, th, h, color = '#5a3a2a') {
  const dw = 9, dh = Math.min(22, h * 0.48);
  const ox = sx - 4;
  const oy = sy + th * 0.08 - dh;
  ctx.fillStyle = color;
  ctx.fillRect(ox, oy, dw, dh);
  ctx.fillStyle = shade(color, 25);
  ctx.fillRect(ox + 1, oy + 2, dw / 2 - 1.5, dh - 4);
  ctx.fillStyle = '#e8c97a';
  ctx.beginPath();
  ctx.arc(ox + dw - 2, oy + dh * 0.55, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

const WALL_PAL = [
  ['#f3e6d2', '#e2d0b4', '#ebe0cb'],
  ['#efe4d4', '#dccbb3', '#e8dcc8'],
  ['#e8f0e4', '#c9d8c4', '#dce8d6'],
  ['#f0e0d8', '#dcc4ba', '#e8d4cc'],
  ['#e4e8f0', '#c8cedc', '#d8dce8'],
  ['#f5edd8', '#e0d2b4', '#ece2c8'],
];
const ROOF_PAL = [
  ['#c45a45', '#a84838', '#d46852'], // red tile
  ['#b85a40', '#9a4834', '#c86850'],
  ['#8b6b4a', '#6f5338', '#a07a58'], // brown
  ['#6a7d8a', '#556878', '#7a8e9a'], // grey
  ['#5a7a62', '#486450', '#6a8a72'], // green
  ['#c47840', '#a86030', '#d08850'], // orange clay
];

function paintResidential(ctx, sx, sy, tw, th, level, variant) {
  softShadow(ctx, sx, sy, tw, th);
  const [wall, wallL, wallR] = WALL_PAL[variant % WALL_PAL.length];
  const [roof, roofL, roofR] = ROOF_PAL[variant % ROOF_PAL.length];

  if (level <= 1) {
    // 平房 / 三合院-ish
    const h = 28;
    const bw = tw * 0.78, bh = th * 0.78;
    bodyBox(ctx, sx, sy, bw, bh, h, wall, wallL, wallR);
    door(ctx, sx - 4, sy, bw, bh, h, variant % 2 ? '#6b3e2e' : '#3d4a5c');
    windowPair(ctx, sx, sy, bw, bh, h, 1, 1, 'right');
    // red-tile gable
    gabledRoof(ctx, sx, sy, bw + 6, bh + 2, h, roofL, roofR, shade(roof, -30));
    // eaves tiles hint
    ctx.strokeStyle = shade(roof, 20);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - bw / 2 - 2, sy - h);
    ctx.lineTo(sx, sy - h - bh * 0.55);
    ctx.lineTo(sx + bw / 2 + 2, sy - h);
    ctx.stroke();
    // little plant pot
    if (variant % 3 === 0) {
      ctx.fillStyle = '#cf704d';
      ctx.fillRect(sx + bw * 0.22, sy - 2, 3, 4);
      ctx.fillStyle = '#315f50';
      ctx.beginPath();
      ctx.ellipse(sx + bw * 0.22 + 1.5, sy - 4, 3, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (level === 2) {
    // 透天厝 with balcony
    const h = 52;
    const bw = tw * 0.72, bh = th * 0.72;
    bodyBox(ctx, sx, sy, bw, bh, h, wall, wallL, wallR);
    door(ctx, sx - 2, sy, bw, bh, h);
    windowPair(ctx, sx, sy, bw, bh, h, 2, 1, 'both');
    // balcony
    const by = sy - h * 0.48;
    ctx.fillStyle = shade(wall, -10);
    ctx.beginPath();
    ctx.moveTo(sx - bw * 0.35, by);
    ctx.lineTo(sx + bw * 0.05, by + bh * 0.2);
    ctx.lineTo(sx + bw * 0.05, by + bh * 0.32);
    ctx.lineTo(sx - bw * 0.35, by + bh * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e8c97a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx - bw * 0.35, by);
    ctx.lineTo(sx + bw * 0.05, by + bh * 0.2);
    ctx.stroke();
    // railing posts
    for (let i = 0; i < 3; i++) {
      const t = i / 2;
      const px = sx - bw * 0.35 + t * bw * 0.4;
      const py = by + t * bh * 0.2;
      ctx.fillStyle = '#fffcf4';
      ctx.fillRect(px, py - 4, 1.2, 4);
    }
    gabledRoof(ctx, sx, sy, bw + 4, bh + 2, h, roofL, roofR);
    // AC box
    if (variant % 2) {
      ctx.fillStyle = '#9aa8a0';
      ctx.fillRect(sx + bw * 0.18, sy - h * 0.35, 6, 4);
    }
  } else {
    // 公寓
    const h = 78;
    const bw = tw * 0.8, bh = th * 0.8;
    const wall2 = shade(wall, variant % 2 ? -8 : 8);
    bodyBox(ctx, sx, sy, bw, bh, h, wall2, shade(wall2, -18), shade(wall2, -8));
    windowPair(ctx, sx, sy, bw, bh, h, 3, 2, 'both');
    // entrance canopy
    ctx.fillStyle = shade(roof, 10);
    ctx.beginPath();
    ctx.moveTo(sx - 10, sy - 4);
    ctx.lineTo(sx + 4, sy + 4);
    ctx.lineTo(sx + 4, sy + 7);
    ctx.lineTo(sx - 10, sy - 1);
    ctx.closePath();
    ctx.fill();
    door(ctx, sx - 2, sy, bw, bh, h, '#2c3e50');
    flatRoof(ctx, sx, sy, bw, bh, h, shade(roof, 15), 'rgba(38,62,56,0.3)');
    // rooftop tank / parapet
    ctx.fillStyle = '#cfd8d4';
    drawDiamond(ctx, sx + 6, sy - h - 6, 10, 5, '#b0bcb8', null);
    ctx.fillStyle = '#cf704d';
    ctx.fillRect(sx - 8, sy - h - 10, 2.5, 8);
  }
}

function paintCommercial(ctx, sx, sy, tw, th, level, variant) {
  softShadow(ctx, sx, sy, tw, th);
  const walls = [
    ['#f6efe4', '#e0d4c2', '#ebe2d4'],
    ['#eef3f7', '#d2dbe4', '#e2eaf0'],
    ['#f7e8de', '#e2cbb8', '#efdcd0'],
  ][variant % 3];
  const [wall, wallL, wallR] = walls;
  const awning = ['#cf704d', '#315f50', '#c45a45', '#6a9cc4', '#d4b25a'][variant % 5];
  const h = 22 + level * 20;
  const bw = tw * 0.82, bh = th * 0.82;
  bodyBox(ctx, sx, sy, bw, bh, h, wall, wallL, wallR);

  // storefront glass
  ctx.fillStyle = '#b8d4e0';
  ctx.fillRect(sx - bw * 0.28, sy - h * 0.55, 10, Math.min(12, h * 0.4));
  ctx.fillRect(sx + 2, sy - h * 0.5, 8, Math.min(10, h * 0.35));
  ctx.strokeStyle = '#263e38';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(sx - bw * 0.28, sy - h * 0.55, 10, Math.min(12, h * 0.4));

  // 亭仔腳 awning
  ctx.fillStyle = awning;
  ctx.beginPath();
  ctx.moveTo(sx - bw / 2 - 3, sy - h * 0.55);
  ctx.lineTo(sx + bw / 2 + 3, sy - h * 0.55);
  ctx.lineTo(sx + bw / 2 + 6, sy - h * 0.55 + bh * 0.35);
  ctx.lineTo(sx - bw / 2 - 6, sy - h * 0.55 + bh * 0.35);
  ctx.closePath();
  ctx.fill();
  // awning stripes
  ctx.strokeStyle = shade(awning, 25);
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(sx + i * 6, sy - h * 0.55);
    ctx.lineTo(sx + i * 6, sy - h * 0.55 + bh * 0.32);
    ctx.stroke();
  }

  // signboard
  ctx.fillStyle = '#263e38';
  ctx.fillRect(sx - 10, sy - h - 8, 20, 7);
  ctx.fillStyle = '#fffcf4';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(['店', '買', '食', '茶', '雜'][variant % 5], sx, sy - h - 2.5);

  if (level >= 2) {
    windowPair(ctx, sx, sy, bw, bh, h, level >= 3 ? 2 : 1, 2, 'both');
  }
  if (level >= 3) {
    flatRoof(ctx, sx, sy, bw, bh, h, shade(awning, -20));
    // billboard
    ctx.fillStyle = '#cf704d';
    ctx.fillRect(sx - 6, sy - h - 16, 14, 8);
  } else {
    gabledRoof(ctx, sx, sy, bw, bh, h, shade(awning, -15), shade(awning, -30));
  }
}

function paintIndustrial(ctx, sx, sy, tw, th, level, variant) {
  softShadow(ctx, sx, sy, tw, th, 0.25);
  const wall = ['#d8c9a8', '#c4b696', '#b8c0a8'][variant % 3];
  const h = 24 + level * 18;
  const bw = tw * 0.88, bh = th * 0.88;
  bodyBox(ctx, sx, sy, bw, bh, h, wall, shade(wall, -20), shade(wall, -10));

  // sawtooth roofs
  const teeth = 1 + level;
  for (let i = 0; i < teeth; i++) {
    const t = (i + 0.5) / teeth - 0.5;
    const cx = sx + t * bw * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - 8, sy - h);
    ctx.lineTo(cx, sy - h - 10 - level * 2);
    ctx.lineTo(cx + 8, sy - h);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#8a9aa0' : '#6e7e86';
    ctx.fill();
    // glass face of sawtooth
    ctx.fillStyle = '#c5d8e0';
    ctx.beginPath();
    ctx.moveTo(cx, sy - h - 10 - level * 2);
    ctx.lineTo(cx + 8, sy - h);
    ctx.lineTo(cx + 3, sy - h + 2);
    ctx.closePath();
    ctx.fill();
  }

  // chimney
  ctx.fillStyle = '#7a6a5a';
  ctx.fillRect(sx + bw * 0.25, sy - h - 18 - level * 3, 5, 18 + level * 3);
  ctx.fillStyle = 'rgba(80,80,80,0.35)';
  ctx.beginPath();
  ctx.ellipse(sx + bw * 0.25 + 2.5, sy - h - 22 - level * 3, 4 + (variant % 3), 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // loading door
  ctx.fillStyle = '#5a5048';
  ctx.fillRect(sx - 8, sy - 12, 12, 12);
  // hazard stripes
  if (level >= 2) {
    ctx.fillStyle = '#d4b25a';
    ctx.fillRect(sx - bw * 0.35, sy - h * 0.4, 8, 3);
  }
}

/* —— Facilities —— */
function paintStation(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th);
  const h = 42;
  const bw = tw * 0.9, bh = th * 0.9;
  bodyBox(ctx, sx, sy, bw, bh, h, '#e8eef4', '#c5ced8', '#d5dee6');
  // platform
  ctx.fillStyle = '#b0b8c0';
  drawDiamond(ctx, sx, sy + 2, bw + 8, bh + 4, '#a8b0b8', null);
  // clock tower
  ctx.fillStyle = '#929fbd';
  ctx.fillRect(sx - 4, sy - h - 18, 8, 18);
  ctx.beginPath();
  ctx.arc(sx, sy - h - 18, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#fffcf4';
  ctx.fill();
  ctx.strokeStyle = '#263e38';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, sy - h - 18);
  ctx.lineTo(sx, sy - h - 22);
  ctx.moveTo(sx, sy - h - 18);
  ctx.lineTo(sx + 3, sy - h - 17);
  ctx.stroke();
  gabledRoof(ctx, sx, sy, bw, bh, h, '#6a7a8a', '#556878');
  // sign 車頭
  ctx.fillStyle = '#315f50';
  ctx.fillRect(sx - 12, sy - h * 0.55, 24, 8);
  ctx.fillStyle = '#fffcf4';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('車頭', sx, sy - h * 0.55 + 6);
}

function paintTemple(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th);
  const h = 34;
  const bw = tw * 0.78, bh = th * 0.78;
  bodyBox(ctx, sx, sy, bw, bh, h, '#f5e6d0', '#e0c8a8', '#ecd8b8');
  // swallowtail roof (燕尾脊)
  const roofY = sy - h;
  ctx.beginPath();
  ctx.moveTo(sx - bw / 2 - 8, roofY + 4);
  ctx.lineTo(sx - bw / 2 - 2, roofY - 4);
  ctx.lineTo(sx, roofY - bh * 0.7);
  ctx.lineTo(sx + bw / 2 + 2, roofY - 4);
  ctx.lineTo(sx + bw / 2 + 8, roofY + 4);
  ctx.lineTo(sx, roofY + bh * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#c45a45';
  ctx.fill();
  // gold ridge tips (swallow tails)
  ctx.fillStyle = '#e8c97a';
  ctx.beginPath();
  ctx.moveTo(sx - bw / 2 - 8, roofY + 4);
  ctx.lineTo(sx - bw / 2 - 14, roofY - 6);
  ctx.lineTo(sx - bw / 2 - 2, roofY - 4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx + bw / 2 + 8, roofY + 4);
  ctx.lineTo(sx + bw / 2 + 14, roofY - 6);
  ctx.lineTo(sx + bw / 2 + 2, roofY - 4);
  ctx.fill();
  // columns
  ctx.fillStyle = '#cf704d';
  ctx.fillRect(sx - bw * 0.28, sy - h + 2, 3, h - 4);
  ctx.fillRect(sx + bw * 0.18, sy - h + 4, 3, h - 6);
  // incense
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 2);
  ctx.lineTo(sx, sy - 10);
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,180,180,0.4)';
  ctx.beginPath();
  ctx.arc(sx, sy - 12, 2, 0, Math.PI * 2);
  ctx.fill();
}

function paintMarket(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th, 0.18);
  // open stalls + umbrellas
  const colors = ['#cf704d', '#315f50', '#d4b25a', '#6a9cc4'];
  for (let i = 0; i < 3; i++) {
    const ox = sx + (i - 1) * 14;
    const oy = sy + (i % 2) * 4;
    // umbrella
    ctx.beginPath();
    ctx.ellipse(ox, oy - 22, 14, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.strokeStyle = shade(colors[i], -30);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox - 12, oy - 22);
    ctx.lineTo(ox + 12, oy - 22);
    ctx.stroke();
    // pole
    ctx.strokeStyle = '#5a4a3a';
    ctx.beginPath();
    ctx.moveTo(ox, oy - 22);
    ctx.lineTo(ox, oy);
    ctx.stroke();
    // stall table
    ctx.fillStyle = '#c4a882';
    ctx.fillRect(ox - 10, oy - 5, 20, 5);
  }
  // crates
  ctx.fillStyle = '#8b6b4a';
  ctx.fillRect(sx - 18, sy + 2, 6, 5);
  ctx.fillRect(sx + 12, sy + 4, 5, 4);
}

function paintSchool(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th);
  const h = 44;
  const bw = tw * 0.85, bh = th * 0.85;
  bodyBox(ctx, sx, sy, bw, bh, h, '#f0f4ec', '#d0dcc8', '#e0e8d8');
  windowPair(ctx, sx, sy, bw, bh, h, 2, 2, 'both');
  flatRoof(ctx, sx, sy, bw, bh, h, '#6f8f78');
  // flag pole
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx + bw * 0.35, sy - h);
  ctx.lineTo(sx + bw * 0.35, sy - h - 20);
  ctx.stroke();
  // flag
  ctx.fillStyle = '#cf704d';
  ctx.beginPath();
  ctx.moveTo(sx + bw * 0.35, sy - h - 20);
  ctx.lineTo(sx + bw * 0.35 + 12, sy - h - 16);
  ctx.lineTo(sx + bw * 0.35, sy - h - 12);
  ctx.closePath();
  ctx.fill();
  // clock
  ctx.beginPath();
  ctx.arc(sx, sy - h * 0.7, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fffcf4';
  ctx.fill();
  ctx.strokeStyle = '#263e38';
  ctx.stroke();
  door(ctx, sx, sy, bw, bh, h, '#315f50');
}

function paintHospital(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th);
  const h = 48;
  const bw = tw * 0.82, bh = th * 0.82;
  bodyBox(ctx, sx, sy, bw, bh, h, '#f7f4f4', '#e0d8d8', '#ece4e4');
  windowPair(ctx, sx, sy, bw, bh, h, 2, 2, 'both');
  flatRoof(ctx, sx, sy, bw, bh, h, '#d07a7a');
  // red cross
  ctx.fillStyle = '#c04040';
  ctx.fillRect(sx - 2, sy - h * 0.65 - 8, 4, 14);
  ctx.fillRect(sx - 6, sy - h * 0.65 - 4, 12, 4);
  door(ctx, sx, sy, bw, bh, h, '#d07a7a');
}

function paintInn(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th);
  const h = 54;
  const bw = tw * 0.78, bh = th * 0.78;
  bodyBox(ctx, sx, sy, bw, bh, h, '#f0e8f4', '#d8cce0', '#e4d8ec');
  windowPair(ctx, sx, sy, bw, bh, h, 2, 1, 'both');
  gabledRoof(ctx, sx, sy, bw, bh, h, '#7a6a9a', '#5a4a7a');
  // neon-ish sign
  ctx.fillStyle = '#9a8fc0';
  ctx.fillRect(sx - 11, sy - h * 0.5, 22, 7);
  ctx.fillStyle = '#fffcf4';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('旅社', sx, sy - h * 0.5 + 5.5);
  door(ctx, sx, sy, bw, bh, h, '#5a3a6a');
}

function paintBreakfast(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th);
  const h = 30;
  const bw = tw * 0.8, bh = th * 0.8;
  bodyBox(ctx, sx, sy, bw, bh, h, '#fff6ea', '#ead8c4', '#f2e6d4');
  // orange awning
  ctx.fillStyle = '#cf704d';
  ctx.beginPath();
  ctx.moveTo(sx - bw / 2 - 2, sy - h * 0.6);
  ctx.lineTo(sx + bw / 2 + 2, sy - h * 0.6);
  ctx.lineTo(sx + bw / 2 + 4, sy - h * 0.6 + 10);
  ctx.lineTo(sx - bw / 2 - 4, sy - h * 0.6 + 10);
  ctx.closePath();
  ctx.fill();
  gabledRoof(ctx, sx, sy, bw, bh, h, '#d4a060', '#b88848');
  // steam
  ctx.strokeStyle = 'rgba(100,100,100,0.35)';
  ctx.beginPath();
  ctx.moveTo(sx + 8, sy - h - 2);
  ctx.quadraticCurveTo(sx + 10, sy - h - 8, sx + 7, sy - h - 12);
  ctx.stroke();
  door(ctx, sx, sy, bw, bh, h, '#8b5a3a');
  // table outside
  ctx.fillStyle = '#c4a070';
  ctx.fillRect(sx + 8, sy - 2, 8, 3);
}

function paintMoodPark(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th, 0.12);
  // grass patch
  drawDiamond(ctx, sx, sy, tw * 0.9, th * 0.9, '#8fbc8f', null);
  // trees
  drawTree(ctx, sx - 10, sy - 4, 0.7, 0);
  drawTree(ctx, sx + 12, sy + 2, 0.55, 1);
  // bench
  ctx.fillStyle = '#8b6b4a';
  ctx.fillRect(sx - 8, sy + 2, 14, 2.5);
  ctx.fillRect(sx - 7, sy + 4.5, 2, 3);
  ctx.fillRect(sx + 3, sy + 4.5, 2, 3);
  // heart flower
  ctx.fillStyle = '#c594a6';
  ctx.beginPath();
  ctx.arc(sx + 2, sy - 8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function paintAmusement(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th, 0.15);
  // ferris wheel
  const cx = sx, cy = sy - 42;
  ctx.strokeStyle = '#cf704d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
    ctx.stroke();
    // gondola
    ctx.fillStyle = ['#cf704d', '#315f50', '#d4b25a', '#6a9cc4', '#c45a45', '#9a8fc0'][i];
    ctx.fillRect(cx + Math.cos(a) * 26 - 3.5, cy + Math.sin(a) * 26 - 3, 7, 5);
  }
  // legs
  ctx.strokeStyle = '#6a5a4a';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(sx - 12, sy + 4);
  ctx.moveTo(cx, cy);
  ctx.lineTo(sx + 12, sy + 4);
  ctx.stroke();
}

function paintPark(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th, 0.1);
  drawDiamond(ctx, sx, sy, tw * 0.95, th * 0.95, '#9bc49b', null);
  drawTree(ctx, sx - 8, sy, 0.65, 2);
  drawTree(ctx, sx + 10, sy - 2, 0.5, 0);
  // path
  ctx.fillStyle = '#d9d2c0';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // flowers
  for (const [fx, fy, col] of [[-14, 4, '#cf704d'], [6, 8, '#e8c97a'], [14, 0, '#c594a6']]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(sx + fx, sy + fy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintGenericFacility(ctx, sx, sy, tw, th, color, label) {
  softShadow(ctx, sx, sy, tw, th);
  const h = 40;
  const bw = tw * 0.82, bh = th * 0.82;
  bodyBox(ctx, sx, sy, bw, bh, h, shade(color, 40), shade(color, 10), shade(color, 25));
  windowPair(ctx, sx, sy, bw, bh, h, 1, 1, 'both');
  gabledRoof(ctx, sx, sy, bw, bh, h, shade(color, -10), shade(color, -25));
  if (label) {
    ctx.fillStyle = color;
    ctx.fillRect(sx - 11, sy - h * 0.5, 22, 7);
    ctx.fillStyle = '#fffcf4';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, sx, sy - h * 0.5 + 5.5);
  }
}

function paintPolice(ctx, sx, sy, tw, th) {
  paintGenericFacility(ctx, sx, sy, tw, th, '#7caaa9', '派出所');
  // light
  ctx.fillStyle = '#cf704d';
  ctx.beginPath();
  ctx.arc(sx, sy - 40, 3, 0, Math.PI * 2);
  ctx.fill();
}

function paintWeather(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th);
  const h = 28;
  bodyBox(ctx, sx, sy, tw * 0.6, th * 0.6, h, '#e0f0ec', '#c0d8d0', '#d0e4dc');
  // dome
  ctx.beginPath();
  ctx.arc(sx, sy - h - 4, 12, Math.PI, 0);
  ctx.fillStyle = '#a8d4e0';
  ctx.fill();
  // antenna
  ctx.strokeStyle = '#555';
  ctx.beginPath();
  ctx.moveTo(sx, sy - h - 16);
  ctx.lineTo(sx, sy - h - 28);
  ctx.stroke();
  ctx.fillStyle = '#cf704d';
  ctx.beginPath();
  ctx.arc(sx, sy - h - 28, 2, 0, Math.PI * 2);
  ctx.fill();
}

function paintIndustryStreet(ctx, sx, sy, tw, th) {
  softShadow(ctx, sx, sy, tw, th);
  const h = 36;
  bodyBox(ctx, sx, sy, tw * 0.85, th * 0.85, h, '#f2e8dc', '#dcc8b4', '#e8d8c8');
  // row of shop signs
  const cols = ['#cf704d', '#315f50', '#6a9cc4'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = cols[i];
    ctx.fillRect(sx - 16 + i * 12, sy - h * 0.55, 10, 5);
  }
  gabledRoof(ctx, sx, sy, tw * 0.85, th * 0.85, h, '#bf956b', '#a07850');
}

function paintHomeHall(ctx, sx, sy, tw, th) {
  paintGenericFacility(ctx, sx, sy, tw, th, '#c58e9c', '親情');
}

function paintStudyCenter(ctx, sx, sy, tw, th) {
  paintGenericFacility(ctx, sx, sy, tw, th, '#a3af83', '研習');
}

export function drawTree(ctx, sx, sy, scale = 1, variant = 0) {
  const s = scale;
  // soft shadow
  ctx.fillStyle = 'rgba(38,62,56,0.15)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2 * s, 7 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // trunk with taper
  ctx.fillStyle = '#6b5344';
  ctx.beginPath();
  ctx.moveTo(sx - 2 * s, sy + 2 * s);
  ctx.lineTo(sx - 1.2 * s, sy - 10 * s);
  ctx.lineTo(sx + 1.2 * s, sy - 10 * s);
  ctx.lineTo(sx + 2 * s, sy + 2 * s);
  ctx.closePath();
  ctx.fill();
  const greens = ['#4a7a58', '#315f50', '#5a8f62', '#3d6b4a'];
  const g = greens[variant % greens.length];
  // layered canopy
  ctx.fillStyle = shade(g, -15);
  ctx.beginPath();
  ctx.ellipse(sx + 1 * s, sy - 12 * s, 10 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(sx - 2 * s, sy - 16 * s, 9 * s, 7.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(g, 30);
  ctx.beginPath();
  ctx.ellipse(sx - 3 * s, sy - 18 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  if (variant % 3 === 1) {
    ctx.fillStyle = '#f0b8c8';
    for (const [dx, dy] of [[-5, -18], [4, -20], [0, -12], [6, -14], [-7, -14]]) {
      ctx.beginPath();
      ctx.arc(sx + dx * s, sy + dy * s, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (variant % 3 === 2) {
    // pine-ish stacked triangles
    ctx.fillStyle = shade(g, -5);
    for (let i = 0; i < 3; i++) {
      const top = sy - (22 - i * 5) * s;
      ctx.beginPath();
      ctx.moveTo(sx, top - 6 * s);
      ctx.lineTo(sx + (9 - i) * s, top + 4 * s);
      ctx.lineTo(sx - (9 - i) * s, top + 4 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function drawFlower(ctx, sx, sy, variant = 0) {
  const cols = ['#cf704d', '#e8c97a', '#c594a6', '#7baf7a', '#6a9cc4'];
  ctx.fillStyle = '#315f50';
  ctx.fillRect(sx, sy - 3, 1, 4);
  ctx.fillStyle = cols[variant % cols.length];
  ctx.beginPath();
  ctx.arc(sx + 0.5, sy - 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffcf4';
  ctx.beginPath();
  ctx.arc(sx + 0.5, sy - 4, 0.7, 0, Math.PI * 2);
  ctx.fill();
}

export function getZoneSprite(zone, level, variant) {
  const key = `z:${zone}:${level}:${variant}`;
  return getCached(key, (ctx, sx, sy, tw, th) => {
    if (zone === 'residential') paintResidential(ctx, sx, sy, tw, th, level, variant);
    else if (zone === 'commercial') paintCommercial(ctx, sx, sy, tw, th, level, variant);
    else paintIndustrial(ctx, sx, sy, tw, th, level, variant);
  });
}

export function getFacilitySprite(id, variant = 0) {
  const key = `f:${id}:${variant}`;
  return getCached(key, (ctx, sx, sy, tw, th) => {
    switch (id) {
      case 'station': paintStation(ctx, sx, sy, tw, th); break;
      case 'temple': paintTemple(ctx, sx, sy, tw, th); break;
      case 'market': paintMarket(ctx, sx, sy, tw, th); break;
      case 'school': paintSchool(ctx, sx, sy, tw, th); break;
      case 'hospital': paintHospital(ctx, sx, sy, tw, th); break;
      case 'inn': paintInn(ctx, sx, sy, tw, th); break;
      case 'breakfast': paintBreakfast(ctx, sx, sy, tw, th); break;
      case 'mood-park': paintMoodPark(ctx, sx, sy, tw, th); break;
      case 'amusement': paintAmusement(ctx, sx, sy, tw, th); break;
      case 'park': paintPark(ctx, sx, sy, tw, th); break;
      case 'police': paintPolice(ctx, sx, sy, tw, th); break;
      case 'weather': paintWeather(ctx, sx, sy, tw, th); break;
      case 'industry-street': paintIndustryStreet(ctx, sx, sy, tw, th); break;
      case 'home-hall': paintHomeHall(ctx, sx, sy, tw, th); break;
      case 'study-center': paintStudyCenter(ctx, sx, sy, tw, th); break;
      default: paintGenericFacility(ctx, sx, sy, tw, th, '#a3af83', ''); break;
    }
  });
}

/** Tiny illustration for word card (returns data URL). */
export function cardIllustration(kind, zone, facility, level = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3eddf';
  ctx.beginPath();
  const rr = 12;
  ctx.moveTo(rr, 0);
  ctx.arcTo(96, 0, 96, 96, rr);
  ctx.arcTo(96, 96, 0, 96, rr);
  ctx.arcTo(0, 96, 0, 0, rr);
  ctx.arcTo(0, 0, 96, 0, rr);
  ctx.closePath();
  ctx.fill();
  // ground diamond
  drawDiamond(ctx, 48, 70, 64, 32, '#c5d6a8', null);
  if (kind === 'zone') {
    const paint = zone === 'residential' ? paintResidential
      : zone === 'commercial' ? paintCommercial : paintIndustrial;
    paint(ctx, 48, 70, 56, 28, Math.max(1, level), 0);
  } else if (kind === 'facility') {
    const spr = getFacilitySprite(facility, 0);
    ctx.drawImage(spr, 48 - 45, 70 - 75, 90, 105);
  } else if (kind === 'road') {
    drawDiamond(ctx, 48, 70, 64, 32, '#d9d2c0', null);
  }
  return canvas.toDataURL('image/png');
}
