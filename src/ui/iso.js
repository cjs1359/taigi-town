/** Isometric projection + drawing helpers */

export const TILE_W = 54;
export const TILE_H = 27;

export function isoToScreen(x, y, originX, originY, scale = 1) {
  const tw = TILE_W * scale;
  const th = TILE_H * scale;
  return {
    sx: (x - y) * (tw / 2) + originX,
    sy: (x + y) * (th / 2) + originY,
    tw, th,
  };
}

export function screenToIso(sx, sy, originX, originY, scale = 1) {
  const tw = TILE_W * scale;
  const th = TILE_H * scale;
  const dx = sx - originX;
  const dy = sy - originY;
  const x = (dx / (tw / 2) + dy / (th / 2)) / 2;
  const y = (dy / (th / 2) - dx / (tw / 2)) / 2;
  return { x, y };
}

export function drawDiamond(ctx, sx, sy, tw, th, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(sx, sy - th / 2);
  ctx.lineTo(sx + tw / 2, sy);
  ctx.lineTo(sx, sy + th / 2);
  ctx.lineTo(sx - tw / 2, sy);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

export function drawBlock(ctx, sx, sy, tw, th, height, top, sideL, sideR) {
  // top
  drawDiamond(ctx, sx, sy - height, tw, th, top, null);
  // left face
  ctx.beginPath();
  ctx.moveTo(sx - tw / 2, sy - height);
  ctx.lineTo(sx, sy - height + th / 2);
  ctx.lineTo(sx, sy + th / 2);
  ctx.lineTo(sx - tw / 2, sy);
  ctx.closePath();
  ctx.fillStyle = sideL;
  ctx.fill();
  // right face
  ctx.beginPath();
  ctx.moveTo(sx + tw / 2, sy - height);
  ctx.lineTo(sx, sy - height + th / 2);
  ctx.lineTo(sx, sy + th / 2);
  ctx.lineTo(sx + tw / 2, sy);
  ctx.closePath();
  ctx.fillStyle = sideR;
  ctx.fill();
  // outline top
  drawDiamond(ctx, sx, sy - height, tw, th, null, 'rgba(38,62,56,0.25)');
}

export function shade(hex, amt) {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
