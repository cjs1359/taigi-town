/**
 * 台語小庄頭 v1.2 — Tainan old-town isometric sprites.
 * Inspired by the 臺南市美術館 / 湯德章紀念公園 area: Art Deco cream-tile facades,
 * 街屋 with 亭仔腳 arcades, red-brick Japanese-era public buildings, 孔廟 red walls.
 * Every building fits inside its own tile diamond (FOOTPRINT_MAX) so neighbours never overlap.
 */
import { drawDiamond, shade, TILE_W } from './iso.js';

const CACHE = new Map();
export const SPRITE_W = 200;
export const SPRITE_H = 240;
export const ANCHOR_Y = 175; // ground diamond centre y inside sprite
export const PAINT_TW = 110; // tile width used while painting
export const PAINT_TH = 55;
/** sprite px → world px at cam scale 1: footprint == exactly one tile */
export const BLIT = TILE_W / PAINT_TW;
export const FOOTPRINT_MAX = 0.9; // fraction of tile width a body may use

export function hash2(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return (n ^ (n >>> 16)) >>> 0;
}
export function variantOf(x, y, n) { return hash2(x, y) % n; }

function getCached(key, paint) {
  let c = CACHE.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = SPRITE_W; c.height = SPRITE_H;
  const ctx = c.getContext('2d');
  paint(ctx, SPRITE_W / 2, ANCHOR_Y, PAINT_TW, PAINT_TH);
  CACHE.set(key, c);
  return c;
}
export function clearSpriteCache() { CACHE.clear(); }

export function blitSprite(ctx, canvas, sx, sy, scale) {
  const k = BLIT * scale;
  ctx.drawImage(canvas, sx - (SPRITE_W / 2) * k, sy - ANCHOR_Y * k, SPRITE_W * k, SPRITE_H * k);
}

/* ───────────── geometry helpers ───────────── */
const INK = '#263e38';
const CREAM = '#f6eedb';
const WHITE = '#fbf8f0';
const BRICK = '#b8664c';
const ROOF_RED = '#c0573f';

function lot(ctx, sx, sy, tw, th, fill = '#e9e1cf') {
  drawDiamond(ctx, sx, sy, tw * 0.96, th * 0.96, fill, 'rgba(38,62,56,0.10)');
}
function shadow(ctx, sx, sy, tw, th, f, a = 0.18) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = INK;
  ctx.beginPath();
  // cast toward lower-right, stays inside tile
  ctx.moveTo(sx, sy - th * f / 2 + 4);
  ctx.lineTo(sx + tw * f / 2 + 2, sy + 2);
  ctx.lineTo(sx + 4, sy + th * f / 2 + 3);
  ctx.lineTo(sx - tw * f / 2 + 6, sy + 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
/** box with footprint f (fraction of tile), height h, base lift z */
function box(ctx, sx, sy, tw, th, f, h, base, z = 0, topCol) {
  const bw = tw * f, bh = th * f;
  const y0 = sy - z;
  const L = shade(base, -10), R = shade(base, -28);
  ctx.beginPath();
  ctx.moveTo(sx - bw / 2, y0 - h); ctx.lineTo(sx, y0 - h + bh / 2);
  ctx.lineTo(sx, y0 + bh / 2); ctx.lineTo(sx - bw / 2, y0); ctx.closePath();
  ctx.fillStyle = L; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx + bw / 2, y0 - h); ctx.lineTo(sx, y0 - h + bh / 2);
  ctx.lineTo(sx, y0 + bh / 2); ctx.lineTo(sx + bw / 2, y0); ctx.closePath();
  ctx.fillStyle = R; ctx.fill();
  drawDiamond(ctx, sx, y0 - h, bw, bh, topCol || shade(base, 8), null);
  ctx.strokeStyle = 'rgba(38,62,56,0.28)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(sx, y0 - h + bh / 2); ctx.lineTo(sx, y0 + bh / 2);
  ctx.stroke();
  return { bw, bh, y0 };
}
/** run fn in face-local coords: u 0..1 along face (left→front / front→right), v = px up */
function face(ctx, side, sx, sy, bw, bh, fn, z = 0) {
  ctx.save();
  if (side === 'L') ctx.setTransform(...mul(ctx.getTransform(), [bw / 2, bh / 2, 0, -1, sx - bw / 2, sy - z]));
  else ctx.setTransform(...mul(ctx.getTransform(), [bw / 2, -bh / 2, 0, -1, sx, sy + bh / 2 - z]));
  fn(ctx);
  ctx.restore();
}
function mul(m, [a, b, c, d, e, f]) {
  return [
    m.a * a + m.c * b, m.b * a + m.d * b,
    m.a * c + m.c * d, m.b * c + m.d * d,
    m.a * e + m.c * f + m.e, m.b * e + m.d * f + m.f,
  ];
}
/** rect on face: u0,du in 0..1; v0,dv in px (upwards) */
function fr(ctx, u0, v0, du, dv, col) { ctx.fillStyle = col; ctx.fillRect(u0, v0, du, dv); }

function windowsRow(ctx, v, hgt, n, col = '#a9cdd2', frame = '#4f6b64', margin = 0.12, shutter) {
  const span = 1 - margin * 2;
  const w = span / n * 0.5;
  for (let i = 0; i < n; i++) {
    const u = margin + (i + 0.25) * (span / n);
    fr(ctx, u - 0.012, v - 1, w + 0.024, hgt + 2, frame);
    fr(ctx, u, v, w, hgt, col);
    fr(ctx, u, v + hgt * 0.62, w * 0.45, hgt * 0.3, 'rgba(255,255,255,0.45)');
    if (shutter) {
      fr(ctx, u - w * 0.42, v, w * 0.36, hgt, shutter);
      fr(ctx, u + w * 1.06, v, w * 0.36, hgt, shutter);
    }
  }
}
/** 亭仔腳 arcade band at ground: pillars + dark recess + arches */
function arcade(ctx, hgt, bays, wallCol, archy = true) {
  fr(ctx, 0, 0, 1, hgt, 'rgba(60,48,40,0.55)');
  // shop interiors glow
  for (let i = 0; i < bays; i++) {
    const u = (i + 0.2) / bays;
    fr(ctx, u, 1, 0.6 / bays, hgt * 0.62, i % 2 ? '#e9c98e' : '#d9b27a');
  }
  for (let i = 0; i <= bays; i++) {
    const u = i / bays;
    fr(ctx, Math.min(0.95, Math.max(0, u - 0.025)), 0, 0.05, hgt, wallCol);
  }
  fr(ctx, 0, hgt - 2.2, 1, 2.6, wallCol);
  if (archy) {
    for (let i = 0; i < bays; i++) {
      const u = i / bays;
      fr(ctx, u + 0.02, hgt - 4, 0.12 / bays * 2, 2, wallCol);
      fr(ctx, u + 1 / bays - 0.02 - 0.24 / bays, hgt - 4, 0.24 / bays, 2, wallCol);
    }
  }
}
function band(ctx, v, col, t = 1.6) { fr(ctx, 0, v, 1, t, col); }
function verticalFins(ctx, v0, v1, n, col) {
  for (let i = 1; i < n; i++) fr(ctx, i / n - 0.008, v0, 0.016, v1 - v0, col);
}

function hipRoof(ctx, sx, sy, bw, bh, h, col, rise = 14) {
  const top = sy - h;
  const ov = 3;
  const ax = bw / 2 + ov, ay = bh / 2 + ov / 2;
  const peakL = [sx - ax * 0.25, top - rise - ay * 0.25 + 0];
  const peakR = [sx + ax * 0.25, top - rise + ay * 0.25 - ay * 0.5];
  // simpler: pyramid-ish hip with short ridge along x
  const N = [sx, top - ay], E = [sx + ax, top], S = [sx, top + ay], W = [sx - ax, top];
  const r1 = [sx - ax * 0.2, top - rise - ay * 0.1], r2 = [sx + ax * 0.2, top - rise + ay * 0.1];
  void peakL; void peakR;
  const poly = (pts, c) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
  poly([N, E, r2, r1], shade(col, 10));
  poly([W, N, r1], shade(col, 18));
  poly([W, S, r2, r1], shade(col, -6));
  poly([S, E, r2], shade(col, -22));
  ctx.strokeStyle = shade(col, -40); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(...r1); ctx.lineTo(...r2); ctx.moveTo(...r1); ctx.lineTo(...W); ctx.moveTo(...r2); ctx.lineTo(...S); ctx.lineTo(...r2); ctx.lineTo(...E); ctx.stroke();
  // tile courses
  ctx.strokeStyle = 'rgba(255,240,220,0.25)';
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(W[0] + (r1[0] - W[0]) * t, W[1] + (r1[1] - W[1]) * t);
    ctx.lineTo(S[0] + (r2[0] - S[0]) * t, S[1] + (r2[1] - S[1]) * t);
    ctx.stroke();
  }
}
function parapetRoof(ctx, sx, sy, bw, bh, h, base) {
  drawDiamond(ctx, sx, sy - h, bw, bh, shade(base, 10), null);
  drawDiamond(ctx, sx, sy - h, bw * 0.86, bh * 0.86, '#d9d0bd', null);
}
/** Art Deco stepped parapet centred on a face */
function decoCrown(ctx, v, col, steps = 3, w = 0.36) {
  for (let i = 0; i < steps; i++) {
    const ww = w * (1 - i / (steps + 0.5));
    fr(ctx, 0.5 - ww / 2, v + i * 4, ww, 4.2, i === steps - 1 ? shade(col, -6) : col);
  }
}
function rooftopPlants(ctx, sx, sy, h, n = 2) {
  for (let i = 0; i < n; i++) {
    const x = sx - 8 + i * 9, y = sy - h + 2 + i * 2;
    ctx.fillStyle = '#b8664c'; ctx.fillRect(x - 2, y - 2, 4, 3);
    ctx.fillStyle = i % 2 ? '#5f9a6a' : '#4a8058';
    ctx.beginPath(); ctx.arc(x, y - 4, 3.2, 0, Math.PI * 2); ctx.fill();
  }
}

/* ───────────── zones ───────────── */
const FACADES = [
  { wall: CREAM, trim: '#e3cfa6', accent: '#5c8a74' },
  { wall: '#f1e4cf', trim: '#d9b98a', accent: '#c0573f' },
  { wall: WHITE, trim: '#d8d2c2', accent: '#6a9cc4' },
  { wall: '#efd9c6', trim: '#c79a7a', accent: '#315f50' },
  { wall: '#e9e6d6', trim: '#b9b39b', accent: '#cf704d' },
];

function paintResidential(ctx, sx, sy, tw, th, level, variant) {
  lot(ctx, sx, sy, tw, th);
  const P = FACADES[variant % FACADES.length];
  const brick = variant % 3 === 1;
  if (level <= 1) {
    // 平房: one-storey red-brick / cream house with tiled hip roof and front garden
    const f = 0.62, h = 20;
    shadow(ctx, sx, sy, tw, th, f + 0.08);
    const wall = brick ? BRICK : P.wall;
    const { bw, bh } = box(ctx, sx, sy - 4, tw, th, f, h, wall);
    face(ctx, 'L', sx, sy - 4, bw, bh, (c) => {
      fr(c, 0.38, 0, 0.2, 13, '#6b4a36');
      windowsRow(c, 6, 7, 1, '#a9cdd2', '#4f6b64', 0.62, P.accent);
      band(c, 0, shade(wall, -25), 1.4);
    });
    face(ctx, 'R', sx, sy - 4, bw, bh, (c) => windowsRow(c, 6, 7, 2, '#a9cdd2', '#4f6b64', 0.14, P.accent));
    hipRoof(ctx, sx, sy - 4, bw, bh, h, variant % 2 ? ROOF_RED : '#b4553f', 12);
    // garden hedge in front corner
    ctx.fillStyle = '#5f9a6a';
    ctx.beginPath(); ctx.ellipse(sx + tw * 0.3, sy + 4, 6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2a7b8';
    ctx.beginPath(); ctx.arc(sx + tw * 0.3, sy + 2, 1.6, 0, Math.PI * 2); ctx.fill();
  } else if (level === 2) {
    // 透天 街屋: 3 storeys, 亭仔腳 arcade, balcony, cream tile
    const f = 0.7, h = 50;
    shadow(ctx, sx, sy, tw, th, f + 0.06);
    const wall = brick ? '#c97b5c' : P.wall;
    const { bw, bh } = box(ctx, sx, sy, tw, th, f, h, wall);
    for (const side of ['L', 'R']) {
      face(ctx, side, sx, sy, bw, bh, (c) => {
        arcade(c, 15, 2, shade(wall, 6));
        band(c, 16.5, P.trim, 1.6);
        windowsRow(c, 21, 8, 2, '#a9cdd2', '#4f6b64', 0.1, side === 'L' ? P.accent : null);
        band(c, 31.5, P.trim, 1.2);
        windowsRow(c, 35, 8, 2, '#a9cdd2', '#4f6b64', 0.1);
        band(c, h - 3, shade(P.trim, -8), 3);
      });
    }
    parapetRoof(ctx, sx, sy, bw, bh, h, wall);
    rooftopPlants(ctx, sx, sy, h, 2);
    // little 鐵窗 balcony rail on front corner
    ctx.strokeStyle = 'rgba(38,62,56,0.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(sx - bw * 0.28, sy - 20 + bh * 0.22); ctx.lineTo(sx, sy - 20 + bh / 2); ctx.stroke();
  } else {
    // 公寓: 4-storey Art Deco apartment with vertical 十三溝-style lines and stepped crown
    const f = 0.76, h = 66;
    shadow(ctx, sx, sy, tw, th, f + 0.04);
    const wall = brick ? '#e8d3b4' : P.wall;
    const { bw, bh } = box(ctx, sx, sy, tw, th, f, h, wall);
    for (const side of ['L', 'R']) {
      face(ctx, side, sx, sy, bw, bh, (c) => {
        arcade(c, 14, 3, shade(wall, 6));
        for (let fl = 0; fl < 3; fl++) {
          const v = 19 + fl * 14;
          windowsRow(c, v, 8.5, 3, '#a9cdd2', '#4f6b64', 0.08);
          band(c, v - 3, P.trim, 1.1);
        }
        verticalFins(c, 16, h - 2, 3, shade(wall, 14));
        band(c, h - 4, P.trim, 4);
        decoCrown(c, h, wall, 3, 0.34);
      });
    }
    parapetRoof(ctx, sx, sy, bw, bh, h, wall);
    rooftopPlants(ctx, sx, sy, h, 3);
  }
}

function paintCommercial(ctx, sx, sy, tw, th, level, variant) {
  lot(ctx, sx, sy, tw, th, '#ece4d2');
  const P = FACADES[(variant + 2) % FACADES.length];
  const awn = ['#cf704d', '#315f50', '#c0573f', '#6a9cc4', '#d4a23a'][variant % 5];
  if (level <= 2) {
    const f = level === 1 ? 0.68 : 0.74;
    const h = level === 1 ? 32 : 48;
    shadow(ctx, sx, sy, tw, th, f + 0.06);
    const { bw, bh } = box(ctx, sx, sy, tw, th, f, h, P.wall);
    for (const side of ['L', 'R']) {
      face(ctx, side, sx, sy, bw, bh, (c) => {
        arcade(c, 15, level + 1, shade(P.wall, 6));
        // signboard band
        fr(c, 0.08, 17, 0.84, 5, awn);
        fr(c, 0.12, 18.2, 0.76, 2.4, 'rgba(255,252,244,0.55)');
        windowsRow(c, 25, 7, level + 1, '#a9cdd2', '#4f6b64', 0.1);
        if (level === 2) windowsRow(c, 37, 7, 3, '#a9cdd2', '#4f6b64', 0.1);
        band(c, h - 3, P.trim, 3);
        if (level === 2) decoCrown(c, h, P.wall, 2, 0.4);
      });
    }
    parapetRoof(ctx, sx, sy, bw, bh, h, P.wall);
    if (level === 1) rooftopPlants(ctx, sx, sy, h, 1);
  } else {
    // 百貨: 5-storey Art Deco department store (inspired by 林百貨): cream tile, arcade, rooftop shrine
    const f = 0.82, h = 80;
    shadow(ctx, sx, sy, tw, th, f + 0.04);
    const wall = '#f0dfbf';
    const { bw, bh } = box(ctx, sx, sy, tw, th, f, h, wall);
    for (const side of ['L', 'R']) {
      face(ctx, side, sx, sy, bw, bh, (c) => {
        arcade(c, 15, 4, '#f6ead2');
        band(c, 16, '#c9a979', 2);
        for (let fl = 0; fl < 4; fl++) {
          const v = 21 + fl * 14;
          windowsRow(c, v, 9, 4, '#9cc3c9', '#5b5244', 0.06);
        }
        verticalFins(c, 18, h - 4, 4, '#fbf3df');
        band(c, h - 5, '#c9a979', 5);
      });
    }
    parapetRoof(ctx, sx, sy, bw, bh, h, wall);
    // rooftop shrine (small red roof) + railings
    box(ctx, sx + 6, sy - h + 2, tw, th, 0.14, 7, '#e9dcc6', 0);
    hipRoof(ctx, sx + 6, sy - h + 2, tw * 0.14, th * 0.14, 7, ROOF_RED, 5);
    ctx.strokeStyle = 'rgba(38,62,56,0.45)'; ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(sx - bw / 2 + 3, sy - h - 2); ctx.lineTo(sx, sy - h + bh / 2 - 3); ctx.lineTo(sx + bw / 2 - 3, sy - h - 2);
    ctx.stroke();
  }
}

function paintIndustrial(ctx, sx, sy, tw, th, level, variant) {
  lot(ctx, sx, sy, tw, th, '#e4dccb');
  const f = 0.66 + level * 0.06;
  const h = 18 + level * 8;
  shadow(ctx, sx, sy, tw, th, f + 0.06);
  const wall = variant % 2 ? BRICK : '#c98a68';
  const { bw, bh } = box(ctx, sx, sy, tw, th, f, h, wall);
  for (const side of ['L', 'R']) {
    face(ctx, side, sx, sy, bw, bh, (c) => {
      for (let i = 0; i < 6; i++) band(c, 3 + i * (h / 6), 'rgba(255,240,220,0.13)', 0.8);
      windowsRow(c, h * 0.45, 7, 2 + level, '#cfe0dc', '#5a4a40', 0.1);
      if (side === 'R') fr(c, 0.2, 0, 0.26, 12, '#5a4c44');
      band(c, h - 2.5, '#efe0c8', 2.5);
    });
  }
  // sawtooth skylights (warehouse / 倉庫 style)
  const teeth = 1 + level;
  for (let i = 0; i < teeth; i++) {
    const t = (i + 0.5) / teeth;
    const cx = sx - bw / 2 * (1 - t) + bw / 2 * t * 0;
    const px = sx + (t - 0.5) * bw * 0.8;
    const py = sy - h + (t - 0.5) * bh * -0.0;
    void cx;
    ctx.beginPath();
    ctx.moveTo(px - 9, py + 3); ctx.lineTo(px - 2, py - 9); ctx.lineTo(px + 9, py - 3); ctx.lineTo(px + 2, py + 9 - 6);
    ctx.closePath();
    ctx.fillStyle = '#8a7d72'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - 2, py - 9); ctx.lineTo(px + 9, py - 3); ctx.lineTo(px + 9, py + 1); ctx.lineTo(px - 2, py - 5);
    ctx.closePath();
    ctx.fillStyle = '#bcd6da'; ctx.fill();
  }
  // brick chimney (modest)
  if (level >= 2) {
    ctx.fillStyle = '#9a5240';
    ctx.fillRect(sx + bw * 0.22, sy - h - 16 - level * 3, 4.5, 16 + level * 3);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(sx + bw * 0.22 + 4, sy - h - 22 - level * 3, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/* ───────────── facilities ───────────── */
function label(ctx, x, y, text, bg = '#315f50') {
  ctx.font = 'bold 8px "Noto Sans TC", sans-serif';
  const w = Math.max(16, ctx.measureText(text).width + 6);
  ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - 5, w, 9);
  ctx.fillStyle = '#fffcf4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function paintStation(ctx, sx, sy, tw, th) {
  // Japanese-era / Art Deco style station: long cream hall + clock tower
  lot(ctx, sx, sy, tw, th, '#e2dccd');
  shadow(ctx, sx, sy, tw, th, 0.88);
  const { bw, bh } = box(ctx, sx, sy, tw, th, 0.84, 30, WHITE);
  for (const side of ['L', 'R']) {
    face(ctx, side, sx, sy, bw, bh, (c) => {
      arcade(c, 13, 4, '#fdfaf2');
      windowsRow(c, 17, 7, 4, '#9cc3c9', '#4f6b64', 0.08);
      band(c, 27, '#c9b48a', 3);
    });
  }
  parapetRoof(ctx, sx, sy, bw, bh, 30, WHITE);
  // clock tower
  const t = box(ctx, sx, sy - 30 + 2, tw, th, 0.22, 26, '#f3ead6');
  face(ctx, 'L', sx, sy - 28, t.bw, t.bh, (c) => { verticalFins(c, 0, 24, 3, '#fffaf0'); });
  hipRoof(ctx, sx, sy - 28, t.bw, t.bh, 26, '#4f6b64', 9);
  ctx.fillStyle = '#fffcf4'; ctx.beginPath(); ctx.arc(sx - t.bw * 0.25, sy - 28 - 17 + t.bh * 0.25, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke();
  label(ctx, sx + bw * 0.22, sy - 4 + bh * 0.05, '車頭');
}

/** 重簷燕尾脊 roof — dark tiles, gold ridge, upswept swallowtail tips (孔廟 signature). */
function swallowRoof(ctx, sx, sy, bw, bh, h, {
  col = '#4a4038', rise = 11, tips = 9, gold = '#f0d078', double = false, tower = true,
} = {}) {
  const top = sy - h;
  const ov = 5;
  const ax = bw / 2 + ov, ay = bh / 2 + ov / 2;
  const N = [sx, top - ay], E = [sx + ax, top], S = [sx, top + ay], W = [sx - ax, top];
  const poly = (pts, c) => {
    ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p);
    ctx.closePath(); ctx.fillStyle = c; ctx.fill();
  };
  // lower eave (outer) — flat-ish hip
  const lowRise = Math.max(4, rise * 0.4);
  const lr1 = [sx - ax * 0.2, top - lowRise - ay * 0.08];
  const lr2 = [sx + ax * 0.2, top - lowRise + ay * 0.08];
  poly([N, E, lr2, lr1], shade(col, 6));
  poly([W, N, lr1], shade(col, 14));
  poly([W, S, lr2, lr1], shade(col, -10));
  poly([S, E, lr2], shade(col, -26));
  // tile courses
  ctx.strokeStyle = 'rgba(255,240,220,0.2)'; ctx.lineWidth = 0.7;
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    ctx.beginPath();
    ctx.moveTo(W[0] + (lr1[0] - W[0]) * t, W[1] + (lr1[1] - W[1]) * t);
    ctx.lineTo(S[0] + (lr2[0] - S[0]) * t, S[1] + (lr2[1] - S[1]) * t);
    ctx.stroke();
  }
  // eave underside trim (warm wood)
  ctx.strokeStyle = '#a87848'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(...W); ctx.lineTo(...S); ctx.lineTo(...E); ctx.stroke();

  if (double) {
    // vertical gap so 重簷 reads clearly
    const lift = lowRise + 6;
    const uax = ax * 0.7, uay = ay * 0.7;
    const uTop = top - lift;
    const uN = [sx, uTop - uay], uE = [sx + uax, uTop], uS = [sx, uTop + uay], uW = [sx - uax, uTop];
    // red wall band between eaves (visible 重簷 gap)
    ctx.fillStyle = '#c4523f';
    ctx.beginPath();
    ctx.moveTo(sx - uax * 0.85, uTop + 2);
    ctx.lineTo(sx + uax * 0.85, uTop + 2);
    ctx.lineTo(sx + ax * 0.55, top - lowRise - 1);
    ctx.lineTo(sx - ax * 0.55, top - lowRise - 1);
    ctx.closePath(); ctx.fill();
    const urise = rise + 2;
    const ur1 = [sx - uax * 0.22, uTop - urise - uay * 0.1];
    const ur2 = [sx + uax * 0.22, uTop - urise + uay * 0.1];
    poly([uN, uE, ur2, ur1], shade(col, 10));
    poly([uW, uN, ur1], shade(col, 18));
    poly([uW, uS, ur2, ur1], shade(col, -6));
    poly([uS, uE, ur2], shade(col, -22));
    ctx.strokeStyle = '#a87848'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(...uW); ctx.lineTo(...uS); ctx.lineTo(...uE); ctx.stroke();
    drawSwallowRidge(ctx, sx, uTop, uax, uay, urise, tips + 2, gold, tower);
  } else {
    drawSwallowRidge(ctx, sx, top, ax, ay, rise, tips, gold, tower);
  }
}

function drawSwallowRidge(ctx, sx, top, ax, ay, rise, tips, gold, tower) {
  const r1 = [sx - ax * 0.22, top - rise - ay * 0.1];
  const r2 = [sx + ax * 0.22, top - rise + ay * 0.1];
  // dark ridge beam
  ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...r1); ctx.lineTo(...r2); ctx.stroke();
  // gold overlay ridge
  ctx.strokeStyle = gold; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(...r1); ctx.lineTo(...r2); ctx.stroke();

  // dramatically upswept 燕尾 tips
  const tipL = [sx - ax * 1.05, top - ay * 0.02 - tips];
  const tipR = [sx + ax * 1.05, top + ay * 0.02 - tips];
  const midL = [sx - ax * 0.58, top - rise * 0.45 - ay * 0.08];
  const midR = [sx + ax * 0.58, top - rise * 0.45 + ay * 0.08];
  ctx.strokeStyle = '#1e1a16'; ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(tipL[0], tipL[1]);
  ctx.quadraticCurveTo(midL[0] - 2, midL[1] - 6, r1[0], r1[1]);
  ctx.lineTo(r2[0], r2[1]);
  ctx.quadraticCurveTo(midR[0] + 2, midR[1] - 6, tipR[0], tipR[1]);
  ctx.stroke();
  // cream/gold tip fins
  for (const [tip, dir] of [[tipL, -1], [tipR, 1]]) {
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1] - 1);
    ctx.lineTo(tip[0] + dir * 5, tip[1] + 3);
    ctx.lineTo(tip[0] + dir * 1.5, tip[1] + 9);
    ctx.lineTo(tip[0] - dir * 2.5, tip[1] + 4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5f9a6a';
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1] + 2);
    ctx.lineTo(tip[0] + dir * 3, tip[1] + 4);
    ctx.lineTo(tip[0] + dir * 0.5, tip[1] + 8);
    ctx.closePath(); ctx.fill();
  }
  // 通天筒 / 寶塔 ridge ornament
  if (tower) {
    const cx = (r1[0] + r2[0]) / 2, cy = (r1[1] + r2[1]) / 2 - 1;
    ctx.fillStyle = gold;
    ctx.fillRect(cx - 2, cy - 11, 4, 11);
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 11); ctx.lineTo(cx, cy - 18); ctx.lineTo(cx + 5, cy - 11);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5f9a6a';
    ctx.fillRect(cx - 3, cy - 8, 6, 1.8);
    ctx.fillRect(cx - 2.5, cy - 5, 5, 1.5);
    // twin 通天筒
    for (const dx of [-7, 7]) {
      ctx.fillStyle = '#e8e0c8';
      ctx.fillRect(cx + dx - 1.2, cy - 7, 2.4, 7);
      ctx.fillStyle = gold;
      ctx.beginPath(); ctx.arc(cx + dx, cy - 8, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function paintTemple(ctx, sx, sy, tw, th) {
  // 臺南孔廟 inspired compound in ONE tile:
  // cream courtyard, red 宮牆, front 大成門, raised 大成殿 with 重簷燕尾脊.
  lot(ctx, sx, sy, tw, th, '#ebe1cc');
  shadow(ctx, sx, sy, tw, th, 0.84, 0.12);

  const WALL = '#c4523f';
  const WALL_DK = '#9b3b2e';
  const GOLD = '#f0d078';

  // low red enclosing wall — perimeter only, open cream courtyard
  const wf = 0.84;
  // draw wall as a hollow ring: outer box then punch courtyard
  box(ctx, sx, sy, tw, th, wf, 6, WALL, 0, WALL);
  drawDiamond(ctx, sx, sy - 6, tw * wf * 0.78, th * wf * 0.78, '#ebe1cc', null);
  // cream coping on wall top edge
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2;
  const wax = tw * wf / 2, way = th * wf / 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 6 - way); ctx.lineTo(sx + wax, sy - 6);
  ctx.lineTo(sx, sy - 6 + way); ctx.lineTo(sx - wax, sy - 6); ctx.closePath();
  ctx.stroke();

  // old tree in back-left courtyard corner
  drawTree(ctx, sx - tw * 0.2, sy - 16, 0.68, 2);

  // raised stone 臺基 under the hall
  const plat = 0.55;
  drawDiamond(ctx, sx + 3, sy - 11, tw * plat, th * plat, '#cfc3ad', 'rgba(38,62,56,0.2)');
  drawDiamond(ctx, sx + 3, sy - 13, tw * plat * 0.9, th * plat * 0.9, '#e4d9c4', null);
  // front steps onto platform
  ctx.fillStyle = '#d8cdb8';
  ctx.beginPath();
  ctx.moveTo(sx + 3 - 10, sy - 3); ctx.lineTo(sx + 3 + 10, sy - 3);
  ctx.lineTo(sx + 3 + 7, sy + 5); ctx.lineTo(sx + 3 - 7, sy + 5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(38,62,56,0.25)'; ctx.lineWidth = 0.8; ctx.stroke();

  // front gate 大成門 — sits clearly in front, own swallowtail roof
  const gx = sx - 12, gy = sy + 8;
  const gate = box(ctx, gx, gy, tw, th, 0.3, 13, WALL);
  face(ctx, 'R', gx, gy, gate.bw, gate.bh, (c) => {
    fr(c, 0.12, 0, 0.76, 11, '#5a241c');
    // twin doors
    fr(c, 0.2, 0, 0.28, 10, '#7a3428');
    fr(c, 0.52, 0, 0.28, 10, '#7a3428');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      fr(c, 0.26 + i * 0.08, 2 + j * 2.2, 0.035, 0.8, GOLD);
      fr(c, 0.58 + i * 0.08, 2 + j * 2.2, 0.035, 0.8, GOLD);
    }
    fr(c, 0.22, 10.5, 0.56, 1.8, GOLD);
  });
  face(ctx, 'L', gx, gy, gate.bw, gate.bh, (c) => {
    fr(c, 0.15, 0, 0.08, 12, GOLD);
    fr(c, 0.75, 0, 0.08, 12, GOLD);
    fr(c, 0.3, 5, 0.4, 3.5, '#5a241c');
  });
  swallowRoof(ctx, gx, gy, gate.bw, gate.bh, 13, {
    col: '#3f3830', rise: 7, tips: 8, gold: GOLD, double: false, tower: false,
  });

  // main hall 大成殿
  const hx = sx + 5, hy = sy - 13;
  const hh = 26;
  const hall = box(ctx, hx, hy, tw, th, 0.48, hh, WALL);
  face(ctx, 'L', hx, hy, hall.bw, hall.bh, (c) => {
    band(c, 0, WALL_DK, 1.6);
    for (let i = 0; i < 3; i++) fr(c, 0.1 + i * 0.32, 0, 0.08, hh - 2, GOLD);
    fr(c, 0.22, 5, 0.56, 10, '#7a2e24');
    windowsRow(c, 8, 6, 2, '#3a1814', GOLD, 0.18);
    band(c, hh - 3, GOLD, 2.2);
  });
  face(ctx, 'R', hx, hy, hall.bw, hall.bh, (c) => {
    fr(c, 0.04, 0, 0.92, hh - 2, '#5a241c');
    for (let i = 0; i < 4; i++) fr(c, 0.06 + i * 0.24, 0, 0.08, hh - 1, GOLD);
    // 匾額
    fr(c, 0.25, hh - 9, 0.5, 5, GOLD);
    fr(c, 0.3, hh - 8, 0.4, 3, WALL_DK);
    band(c, 0, WALL_DK, 1.5);
  });

  // 重簷燕尾脊 — dark roof vs red walls is the key silhouette
  swallowRoof(ctx, hx, hy, hall.bw, hall.bh, hh, {
    col: '#3f3830', rise: 11, tips: 12, gold: GOLD, double: true, tower: true,
  });

  // red lanterns under eaves
  for (const [lx, ly] of [[hx - hall.bw * 0.38, hy - hh + 5], [hx + hall.bw * 0.3, hy - hh + 7]]) {
    ctx.strokeStyle = 'rgba(60,40,30,0.5)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(lx, ly - 5); ctx.lineTo(lx, ly - 1); ctx.stroke();
    ctx.fillStyle = '#cf704d';
    ctx.beginPath(); ctx.ellipse(lx, ly + 1, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.fillRect(lx - 1.8, ly - 2.2, 3.6, 1.5);
    ctx.fillRect(lx - 1.2, ly + 3.6, 2.4, 1.2);
  }

  // incense burner in courtyard (front-left of hall)
  ctx.fillStyle = '#6a5a42';
  ctx.beginPath();
  ctx.moveTo(sx - 9, sy + 3); ctx.lineTo(sx - 2, sy + 3); ctx.lineTo(sx - 0.5, sy + 6.5); ctx.lineTo(sx - 10.5, sy + 6.5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a7a58'; ctx.fillRect(sx - 8.2, sy + 0.2, 5.8, 3.2);
  ctx.strokeStyle = 'rgba(190,190,190,0.6)'; ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(sx - 5.5, sy + 0.2);
  ctx.quadraticCurveTo(sx - 9, sy - 5, sx - 4, sy - 10);
  ctx.quadraticCurveTo(sx - 1, sy - 13, sx - 3.5, sy - 16);
  ctx.stroke();

  // greenery by gate
  ctx.fillStyle = '#5f9a6a';
  ctx.beginPath(); ctx.ellipse(sx + tw * 0.26, sy + 9, 4.8, 2.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2a7b8';
  ctx.beginPath(); ctx.arc(sx + tw * 0.26, sy + 7.4, 1.5, 0, Math.PI * 2); ctx.fill();
}

function paintMarket(ctx, sx, sy, tw, th) {
  lot(ctx, sx, sy, tw, th, '#e9e0cc');
  shadow(ctx, sx, sy, tw, th, 0.8);
  // open market hall: arcade pillars + long roof
  const { bw, bh } = box(ctx, sx, sy, tw, th, 0.76, 22, CREAM);
  for (const side of ['L', 'R']) face(ctx, side, sx, sy, bw, bh, (c) => { arcade(c, 17, 4, '#fbf3e2', false); band(c, 18, '#cf704d', 4); });
  hipRoof(ctx, sx, sy, bw, bh, 22, '#8a6a4a', 10);
  const cols = ['#cf704d', '#315f50', '#d4a23a'];
  for (let i = 0; i < 3; i++) {
    const ox = sx - 22 + i * 22, oy = sy + 10 + (i % 2) * 2;
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.ellipse(ox, oy - 8, 7, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(ox, oy - 8); ctx.lineTo(ox, oy); ctx.stroke();
  }
  label(ctx, sx, sy - 22 - 16, '市場', '#cf704d');
}

function redBrickPublic(ctx, sx, sy, tw, th, { f = 0.8, h = 36, wall = BRICK, trim = '#f3ead6', roof = '#4f6b64', tower = false, cross = false } = {}) {
  lot(ctx, sx, sy, tw, th, '#e6decd');
  shadow(ctx, sx, sy, tw, th, f + 0.06);
  const { bw, bh } = box(ctx, sx, sy, tw, th, f, h, wall);
  for (const side of ['L', 'R']) {
    face(ctx, side, sx, sy, bw, bh, (c) => {
      band(c, 0, trim, 2);
      windowsRow(c, 6, 9, 4, '#a9cdd2', trim, 0.07);
      band(c, h * 0.5 - 1, trim, 2.2);
      windowsRow(c, h * 0.5 + 4, 9, 4, '#a9cdd2', trim, 0.07);
      band(c, h - 3, trim, 3);
    });
  }
  hipRoof(ctx, sx, sy, bw, bh, h, roof, 13);
  if (tower) {
    const t = box(ctx, sx - bw * 0.18, sy - h + 4, tw, th, 0.18, 12, trim);
    hipRoof(ctx, sx - bw * 0.18, sy - h + 4, t.bw, t.bh, 12, roof, 9);
  }
  if (cross) {
    ctx.fillStyle = '#c04040';
    ctx.fillRect(sx + bw * 0.2 - 2, sy - h * 0.62 - 6, 4, 12);
    ctx.fillRect(sx + bw * 0.2 - 6, sy - h * 0.62 - 2, 12, 4);
  }
  return { bw, bh };
}
function paintSchool(ctx, sx, sy, tw, th) {
  redBrickPublic(ctx, sx, sy, tw, th, { h: 34, tower: true });
  ctx.strokeStyle = '#777'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx + tw * 0.34, sy + 6); ctx.lineTo(sx + tw * 0.34, sy - 26); ctx.stroke();
  ctx.fillStyle = '#cf704d';
  ctx.beginPath(); ctx.moveTo(sx + tw * 0.34, sy - 26); ctx.lineTo(sx + tw * 0.34 + 9, sy - 23); ctx.lineTo(sx + tw * 0.34, sy - 20); ctx.fill();
}
function paintHospital(ctx, sx, sy, tw, th) {
  redBrickPublic(ctx, sx, sy, tw, th, { h: 40, wall: WHITE, trim: '#c9b48a', roof: '#6d7f86', cross: true });
}
function paintPolice(ctx, sx, sy, tw, th) {
  // Art Deco civic hall (like the 1931 former police station that became 美術館1館): brown/cream tile, stepped central gable
  lot(ctx, sx, sy, tw, th, '#e6decd');
  shadow(ctx, sx, sy, tw, th, 0.86);
  const wall = '#d8b48c';
  const { bw, bh } = box(ctx, sx, sy, tw, th, 0.82, 28, wall);
  for (const side of ['L', 'R']) {
    face(ctx, side, sx, sy, bw, bh, (c) => {
      band(c, 0, '#efe2c6', 2.5);
      windowsRow(c, 8, 12, 4, '#9cc3c9', '#efe2c6', 0.07);
      verticalFins(c, 3, 26, 8, 'rgba(255,245,225,0.35)');
      band(c, 25, '#efe2c6', 3);
      decoCrown(c, 28, '#efe2c6', 4, 0.42);
    });
  }
  parapetRoof(ctx, sx, sy, bw, bh, 28, wall);
  ctx.fillStyle = '#cf704d'; ctx.beginPath(); ctx.arc(sx - bw * 0.25, sy - 28 - 12 + bh * 0.25, 2.4, 0, Math.PI * 2); ctx.fill();
  label(ctx, sx + bw * 0.25, sy - 2, '派出所', '#4f6b64');
}
function paintInn(ctx, sx, sy, tw, th) {
  // 3-storey Japanese-era hotel with corner balcony
  lot(ctx, sx, sy, tw, th, '#e9e1cf');
  shadow(ctx, sx, sy, tw, th, 0.8);
  const wall = '#efe2d6';
  const { bw, bh } = box(ctx, sx, sy, tw, th, 0.74, 46, wall);
  for (const side of ['L', 'R']) face(ctx, side, sx, sy, bw, bh, (c) => {
    arcade(c, 14, 3, '#fbf3e6');
    windowsRow(c, 19, 8, 3, '#a9cdd2', '#6a5a7a', 0.08, '#8f7fb0');
    windowsRow(c, 32, 8, 3, '#a9cdd2', '#6a5a7a', 0.08, '#8f7fb0');
    band(c, 43, '#c9b0a0', 3);
  });
  hipRoof(ctx, sx, sy, bw, bh, 46, '#6a5a7a', 11);
  label(ctx, sx - bw * 0.25, sy - 2, '旅社', '#7a6a9a');
}
function paintBreakfast(ctx, sx, sy, tw, th) {
  lot(ctx, sx, sy, tw, th, '#ece2cc');
  shadow(ctx, sx, sy, tw, th, 0.72);
  const { bw, bh } = box(ctx, sx, sy, tw, th, 0.66, 30, '#fff4e2');
  for (const side of ['L', 'R']) face(ctx, side, sx, sy, bw, bh, (c) => {
    arcade(c, 14, 2, '#fffaf0');
    fr(c, 0.05, 15, 0.9, 5, '#cf704d');
    windowsRow(c, 22, 6, 2, '#a9cdd2', '#8b5a3a', 0.12);
  });
  parapetRoof(ctx, sx, sy, bw, bh, 30, '#fff4e2');
  // tables outside
  ctx.fillStyle = '#c4a070';
  ctx.fillRect(sx + tw * 0.2, sy + 8, 7, 2.5); ctx.fillRect(sx - tw * 0.28, sy + 6, 7, 2.5);
  ctx.strokeStyle = 'rgba(120,120,120,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx + 6, sy - 32); ctx.quadraticCurveTo(sx + 9, sy - 38, sx + 5, sy - 43); ctx.stroke();
}
function greenLot(ctx, sx, sy, tw, th, col = '#a6c78f') {
  drawDiamond(ctx, sx, sy, tw * 0.94, th * 0.94, col, 'rgba(38,62,56,0.10)');
  drawDiamond(ctx, sx, sy, tw * 0.94, th * 0.94, null, 'rgba(255,252,244,0.5)');
}
function paintMoodPark(ctx, sx, sy, tw, th) {
  greenLot(ctx, sx, sy, tw, th);
  ctx.fillStyle = '#e6dcc4';
  ctx.beginPath(); ctx.ellipse(sx, sy + 2, tw * 0.22, th * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  for (const [dx, dy, c] of [[-14, 4, '#f2a7b8'], [12, 8, '#f4d35e'], [2, -6, '#e98b9c'], [20, -2, '#f2a7b8']]) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + dx, sy + dy, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  drawCherry(ctx, sx - tw * 0.22, sy - 2, 1.0, 1);
  drawGolden(ctx, sx + tw * 0.2, sy + 3, 0.9, 2);
  ctx.fillStyle = '#8b6b4a'; ctx.fillRect(sx - 6, sy + 6, 12, 2.4);
}
function paintAmusement(ctx, sx, sy, tw, th) {
  greenLot(ctx, sx, sy, tw, th, '#b4cf9a');
  const cx = sx, cy = sy - 34, r = 24;
  ctx.strokeStyle = '#cf704d'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
    ctx.fillStyle = ['#cf704d', '#315f50', '#d4a23a', '#6a9cc4'][i % 4];
    ctx.fillRect(cx + Math.cos(a) * r - 3, cy + Math.sin(a) * r - 2, 6, 5);
  }
  ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx - 12, sy + 6); ctx.moveTo(cx, cy); ctx.lineTo(sx + 12, sy + 6); ctx.stroke();
}
function paintPark(ctx, sx, sy, tw, th) {
  greenLot(ctx, sx, sy, tw, th);
  ctx.strokeStyle = '#efe6d0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(sx - tw * 0.4, sy); ctx.quadraticCurveTo(sx, sy - 6, sx + tw * 0.4, sy); ctx.stroke();
  drawTree(ctx, sx - 14, sy - 8, 0.95, 2);
  drawGolden(ctx, sx + 16, sy + 6, 0.85, 1);
  ctx.fillStyle = '#8b6b4a'; ctx.fillRect(sx - 2, sy + 6, 10, 2.2);
}
function paintWeather(ctx, sx, sy, tw, th) {
  // round observatory with central tower (inspired by 原臺南測候所's round plan)
  lot(ctx, sx, sy, tw, th, '#e6decd');
  ctx.fillStyle = 'rgba(38,62,56,0.16)';
  ctx.beginPath(); ctx.ellipse(sx + 4, sy + 4, 34, 16, 0, 0, Math.PI * 2); ctx.fill();
  const r = 30, ry = 15, h = 18;
  ctx.fillStyle = '#efe6d2';
  ctx.beginPath(); ctx.ellipse(sx, sy, r, ry, 0, 0, Math.PI); ctx.lineTo(sx - r, sy - h); ctx.ellipse(sx, sy - h, r, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
  for (let i = 1; i < 6; i++) {
    const a = Math.PI * i / 6; const x = sx + Math.cos(a) * r; const y = sy + Math.sin(a) * ry;
    ctx.fillStyle = '#7fa9b0'; ctx.fillRect(x - 2, y - 13, 4, 6);
  }
  ctx.fillStyle = '#5f7c80';
  ctx.beginPath(); ctx.ellipse(sx, sy - h, r + 2, ry + 1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = WHITE; ctx.fillRect(sx - 5, sy - h - 22, 10, 22);
  ctx.fillStyle = '#5f7c80';
  ctx.beginPath(); ctx.moveTo(sx - 7, sy - h - 22); ctx.lineTo(sx, sy - h - 30); ctx.lineTo(sx + 7, sy - h - 22); ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx, sy - h - 30); ctx.lineTo(sx, sy - h - 38); ctx.stroke();
}
function paintIndustryStreet(ctx, sx, sy, tw, th) {
  // row of three narrow 街屋 shophouses
  lot(ctx, sx, sy, tw, th, '#ece4d2');
  shadow(ctx, sx, sy, tw, th, 0.84);
  const cols = [CREAM, '#efd9c6', WHITE];
  const { bw, bh } = box(ctx, sx, sy, tw, th, 0.8, 36, '#f1e4cf');
  face(ctx, 'L', sx, sy, bw, bh, (c) => {
    for (let i = 0; i < 3; i++) {
      fr(c, i / 3, 0, 1 / 3, 36 + (i % 2) * 0, cols[i]);
      fr(c, i / 3, 0, 1 / 3, 13, 'rgba(60,48,40,0.5)');
      fr(c, i / 3 + 0.03, 15, 1 / 3 - 0.06, 4, ['#cf704d', '#315f50', '#6a9cc4'][i]);
      fr(c, i / 3 + 0.09, 23, 0.14, 8, '#a9cdd2');
      fr(c, i / 3, 0, 0.012, 36, 'rgba(38,62,56,0.25)');
      decoCrown(c, 36, cols[i], 2, 0.2);
    }
  });
  face(ctx, 'R', sx, sy, bw, bh, (c) => { arcade(c, 13, 3, '#fbf3e2'); windowsRow(c, 20, 8, 3); });
  parapetRoof(ctx, sx, sy, bw, bh, 36, '#f1e4cf');
}
function paintHomeHall(ctx, sx, sy, tw, th) {
  // 三合院-like family hall: low red-brick with tiled roof and courtyard
  lot(ctx, sx, sy, tw, th, '#e8dcc6');
  shadow(ctx, sx, sy, tw, th, 0.8);
  const { bw, bh } = box(ctx, sx - 2, sy - 3, tw, th, 0.58, 20, BRICK);
  face(ctx, 'R', sx - 2, sy - 3, bw, bh, (c) => { fr(c, 0.4, 0, 0.2, 12, '#6b4a36'); windowsRow(c, 6, 7, 2, '#a9cdd2', '#efe2c6', 0.05); });
  hipRoof(ctx, sx - 2, sy - 3, bw, bh, 20, ROOF_RED, 11);
  label(ctx, sx + tw * 0.2, sy - 4, '親情館', '#c58e9c');
}
function paintStudyCenter(ctx, sx, sy, tw, th) {
  redBrickPublic(ctx, sx, sy, tw, th, { h: 30, wall: '#d9dcc4', trim: '#fbf7ee', roof: '#4f6b64' });
  label(ctx, sx + tw * 0.2, sy - 2, '研習', '#7d8a5e');
}
function paintMuseum(ctx, sx, sy, tw, th) {
  // 美術館: white stacked boxes under a pentagon-lattice shade canopy (inspired by 臺南市美術館2館)
  lot(ctx, sx, sy, tw, th, '#efe9dc');
  shadow(ctx, sx, sy, tw, th, 0.9, 0.12);
  const b1 = box(ctx, sx - 6, sy + 1, tw, th, 0.5, 18, WHITE);
  face(ctx, 'R', sx - 6, sy + 1, b1.bw, b1.bh, (c) => fr(c, 0.1, 0, 0.8, 10, '#9cc3c9'));
  const b2 = box(ctx, sx + 10, sy - 2, tw, th, 0.4, 32, '#fdfbf6');
  face(ctx, 'L', sx + 10, sy - 2, b2.bw, b2.bh, (c) => fr(c, 0.2, 12, 0.6, 6, '#c9dfe0'));
  const b3 = box(ctx, sx - 2, sy - 18, tw, th, 0.34, 18, '#f7f4ec');
  face(ctx, 'R', sx - 2, sy - 18, b3.bw, b3.bh, (c) => fr(c, 0.1, 4, 0.8, 8, '#a9cdd2'));
  // rooftop terrace greens
  ctx.fillStyle = '#7fae74';
  ctx.beginPath(); ctx.ellipse(sx - 10, sy - 17, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  // canopy columns
  ctx.strokeStyle = '#c9c4b6'; ctx.lineWidth = 1.4;
  const ch = 52;
  for (const [dx, dy] of [[-tw * 0.38, 0], [tw * 0.38, 0], [0, th * 0.36], [0, -th * 0.36]]) {
    ctx.beginPath(); ctx.moveTo(sx + dx, sy + dy); ctx.lineTo(sx + dx, sy + dy - ch); ctx.stroke();
  }
  // pentagon canopy (flattened to iso) with fractal triangle lattice
  const cx = sx, cy = sy - ch, R = tw * 0.44;
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.5]);
  }
  ctx.fillStyle = 'rgba(236,232,220,0.86)';
  ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(150,145,130,0.9)'; ctx.lineWidth = 0.7;
  const tri = (a, b, c2, d) => {
    if (d === 0) { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c2); ctx.closePath(); ctx.stroke(); return; }
    const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const ab = m(a, b), bc = m(b, c2), ca = m(c2, a);
    tri(a, ab, ca, d - 1); tri(ab, b, bc, d - 1); tri(ca, bc, c2, d - 1);
  };
  for (let i = 0; i < 5; i++) tri([cx, cy], pts[i], pts[(i + 1) % 5], 2);
  ctx.strokeStyle = 'rgba(120,115,100,0.9)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.stroke();
  // dappled light on ground
  ctx.fillStyle = 'rgba(255,250,230,0.5)';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(sx - 24 + i * 10, sy + 10 - (i % 2) * 4, 1.6, 0, Math.PI * 2); ctx.fill(); }
}
function paintRoundabout(ctx, sx, sy, tw, th) {
  // centre of the 圓環: flower bed + sculpture (lawn & ring trees are drawn by the renderer)
  ctx.fillStyle = '#efe6d0';
  ctx.beginPath(); ctx.ellipse(sx, sy, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2a7b8';
  ctx.beginPath(); ctx.ellipse(sx, sy, 17, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4d35e';
  ctx.beginPath(); ctx.ellipse(sx, sy, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8f9c96'; ctx.fillRect(sx - 4, sy - 6, 8, 6);
  ctx.fillStyle = '#6d7c76';
  ctx.beginPath(); ctx.moveTo(sx - 3, sy - 6); ctx.quadraticCurveTo(sx - 8, sy - 26, sx + 2, sy - 36);
  ctx.quadraticCurveTo(sx + 4, sy - 22, sx + 3, sy - 6); ctx.fill();
}
function paintGeneric(ctx, sx, sy, tw, th, color, text) {
  redBrickPublic(ctx, sx, sy, tw, th, { h: 30, wall: shade(color, 30), trim: '#fbf7ee', roof: shade(color, -30) });
  if (text) label(ctx, sx + tw * 0.2, sy - 2, text, color);
}

/* ───────────── trees ───────────── */
export function drawTree(ctx, sx, sy, scale = 1, variant = 0) {
  const s = scale;
  ctx.fillStyle = 'rgba(38,62,56,0.15)';
  ctx.beginPath(); ctx.ellipse(sx + 2 * s, sy + 1.5 * s, 8 * s, 3.2 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b5344';
  ctx.beginPath(); ctx.moveTo(sx - 1.8 * s, sy + 1 * s); ctx.lineTo(sx - 1 * s, sy - 10 * s); ctx.lineTo(sx + 1 * s, sy - 10 * s); ctx.lineTo(sx + 1.8 * s, sy + 1 * s); ctx.fill();
  const g = ['#4a7a58', '#3f6f52', '#5a8f62', '#467a5a'][variant % 4];
  for (const [dx, dy, r, c] of [[2, -12, 9, shade(g, -14)], [-2, -16, 8.5, g], [3, -19, 6.5, shade(g, 12)], [-3, -20, 4.5, shade(g, 32)]]) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx + dx * s, sy + dy * s, r * s, r * 0.85 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
}
/** 櫻花 cherry blossom: soft pink layered canopy with dark trunk */
export function drawCherry(ctx, sx, sy, s = 1, v = 0, sway = 0) {
  ctx.fillStyle = 'rgba(38,62,56,0.14)';
  ctx.beginPath(); ctx.ellipse(sx + 2 * s, sy + 1.5 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5d4038'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy + 1 * s); ctx.lineTo(sx + 0.5 * s, sy - 8 * s);
  ctx.moveTo(sx + 0.5 * s, sy - 7 * s); ctx.lineTo(sx - 4 * s + sway, sy - 12 * s);
  ctx.moveTo(sx + 0.5 * s, sy - 8 * s); ctx.lineTo(sx + 4 * s + sway, sy - 13 * s); ctx.stroke();
  const pinks = ['#f6b9c9', '#f3a3b9', '#fbd3dd', '#ee8faa'];
  const o = v % 2;
  for (const [dx, dy, r, i] of [[-4, -13, 6.5, 1], [4, -14, 6.5, 0], [0, -18, 7, 0], [-5, -18, 4.5, 2], [5, -19, 4.5, 2], [0, -21.5, 4, 2], [-1, -14, 4, 3]]) {
    ctx.fillStyle = pinks[(i + o) % 4];
    ctx.beginPath(); ctx.ellipse(sx + dx * s + sway, sy + dy * s, r * s, r * 0.82 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff3f6';
  for (const [dx, dy] of [[-3, -19], [3, -16], [6, -20], [-6, -15]]) {
    ctx.beginPath(); ctx.arc(sx + dx * s + sway, sy + dy * s, 0.9 * s, 0, Math.PI * 2); ctx.fill();
  }
}
/** 阿勃勒 golden shower tree: green canopy with hanging yellow flower chains */
export function drawGolden(ctx, sx, sy, s = 1, v = 0, sway = 0) {
  ctx.fillStyle = 'rgba(38,62,56,0.14)';
  ctx.beginPath(); ctx.ellipse(sx + 2 * s, sy + 1.5 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6f5a46';
  ctx.beginPath(); ctx.moveTo(sx - 1.6 * s, sy + 1 * s); ctx.lineTo(sx - 0.8 * s, sy - 11 * s); ctx.lineTo(sx + 0.8 * s, sy - 11 * s); ctx.lineTo(sx + 1.6 * s, sy + 1 * s); ctx.fill();
  for (const [dx, dy, r, c] of [[0, -16, 8.5, '#5f8f4e'], [-4, -18, 5.5, '#76a35a'], [4, -19, 5, '#e7c43a'], [0, -22, 5, '#f2d34b']]) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx + dx * s + sway, sy + dy * s, r * s, r * 0.8 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  // hanging racemes
  const cols = ['#f7d43a', '#ffe36b', '#eebc22'];
  for (let i = 0; i < 6; i++) {
    const dx = -7 + i * 2.8, top = -15 + (i % 2) * 2;
    const len = 5 + ((i + v) % 3) * 1.6;
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = cols[(i + k) % 3];
      ctx.beginPath(); ctx.arc(sx + (dx + sway * 1.3 / s) * s, sy + (top + k * len / 4 + 2) * s, (1.4 - k * 0.15) * s, 0, Math.PI * 2); ctx.fill();
    }
  }
}
export function drawFlower(ctx, sx, sy, variant = 0) {
  const cols = ['#cf704d', '#e8c97a', '#f2a7b8', '#7baf7a', '#6a9cc4'];
  ctx.fillStyle = '#315f50'; ctx.fillRect(sx, sy - 3, 1, 4);
  ctx.fillStyle = cols[variant % cols.length];
  ctx.beginPath(); ctx.arc(sx + 0.5, sy - 4, 2, 0, Math.PI * 2); ctx.fill();
}

/* ───────────── public API ───────────── */
export function getZoneSprite(zone, level, variant) {
  return getCached(`z:${zone}:${level}:${variant}`, (ctx, sx, sy, tw, th) => {
    if (zone === 'residential') paintResidential(ctx, sx, sy, tw, th, level, variant);
    else if (zone === 'commercial') paintCommercial(ctx, sx, sy, tw, th, level, variant);
    else paintIndustrial(ctx, sx, sy, tw, th, level, variant);
  });
}
const FAC_PAINT = {
  station: paintStation, temple: paintTemple, market: paintMarket, school: paintSchool,
  hospital: paintHospital, inn: paintInn, breakfast: paintBreakfast, 'mood-park': paintMoodPark,
  amusement: paintAmusement, park: paintPark, police: paintPolice, weather: paintWeather,
  'industry-street': paintIndustryStreet, 'home-hall': paintHomeHall, 'study-center': paintStudyCenter,
  museum: paintMuseum, roundabout: paintRoundabout,
};
export const GROUND_FACILITIES = new Set(['park', 'mood-park', 'roundabout']);
export function getFacilitySprite(id, variant = 0) {
  return getCached(`f:${id}:${variant}`, (ctx, sx, sy, tw, th) => {
    const p = FAC_PAINT[id];
    if (p) p(ctx, sx, sy, tw, th);
    else paintGeneric(ctx, sx, sy, tw, th, '#a3af83', '');
  });
}
export function listSpriteKeys() {
  const out = [];
  for (const z of ['residential', 'commercial', 'industrial']) for (let l = 1; l <= 3; l++) for (let v = 0; v < 6; v++) out.push(['z', z, l, v]);
  for (const id of Object.keys(FAC_PAINT)) out.push(['f', id, 0, 0]);
  return out;
}

export function cardIllustration(kind, zone, facility, level = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3eddf';
  ctx.beginPath();
  const rr = 12;
  ctx.moveTo(rr, 0); ctx.arcTo(96, 0, 96, 96, rr); ctx.arcTo(96, 96, 0, 96, rr); ctx.arcTo(0, 96, 0, 0, rr); ctx.arcTo(0, 0, 96, 0, rr);
  ctx.closePath(); ctx.fill();
  drawDiamond(ctx, 48, 72, 76, 38, '#c5d6a8', null);
  let spr = null;
  if (kind === 'zone') spr = getZoneSprite(zone, Math.max(1, level), 0);
  else if (kind === 'facility') spr = getFacilitySprite(facility, 0);
  if (spr) {
    const k = 76 / PAINT_TW;
    ctx.drawImage(spr, 48 - (SPRITE_W / 2) * k, 72 - ANCHOR_Y * k, SPRITE_W * k, SPRITE_H * k);
  } else if (kind === 'road') {
    drawDiamond(ctx, 48, 72, 76, 38, '#e8e2d4', null);
    drawDiamond(ctx, 48, 72, 76 * 0.6, 38, '#cfc7b4', null);
    drawCherry(ctx, 30, 70, 1.1, 0);
    drawGolden(ctx, 66, 72, 1.1, 1);
  }
  return canvas.toDataURL('image/png');
}
