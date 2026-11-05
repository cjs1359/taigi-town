import { SIZE } from '../engine/map.js';
import { buildingsData } from '../engine/game.js';
import { isoToScreen, screenToIso, drawDiamond, drawBlock, shade, TILE_W, TILE_H } from './iso.js';

const COLORS = {
  grass: '#c5d6a8',
  grassAlt: '#b9cd9a',
  water: '#8eb9c4',
  waterDeep: '#6f9eab',
  hill: '#a8b88a',
  road: '#d9d2c0',
  roadLine: '#cfc5ae',
  grid: 'rgba(38,62,56,0.12)',
  hover: 'rgba(207,112,77,0.35)',
  select: 'rgba(49,95,80,0.4)',
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const cam = {
    originX: 0,
    originY: 0,
    scale: 1,
    hover: null,
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function centerOn(x, y, viewW, viewH) {
    const { sx, sy } = isoToScreen(x, y, 0, 0, cam.scale);
    cam.originX = viewW / 2 - sx;
    cam.originY = viewH / 2 - sy;
  }

  function pan(dx, dy) {
    cam.originX += dx;
    cam.originY += dy;
  }

  function zoomAt(factor, sx, sy) {
    const before = screenToIso(sx, sy, cam.originX, cam.originY, cam.scale);
    cam.scale = Math.max(0.55, Math.min(1.8, cam.scale * factor));
    const after = isoToScreen(before.x, before.y, 0, 0, cam.scale);
    cam.originX = sx - after.sx;
    cam.originY = sy - after.sy;
  }

  function pick(sx, sy) {
    const { x, y } = screenToIso(sx, sy, cam.originX, cam.originY, cam.scale);
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= SIZE || iy >= SIZE) return null;
    return { x: ix, y: iy };
  }

  function drawTerrain(sx, sy, tw, th, terrain, x, y) {
    if (terrain === 'water') {
      drawDiamond(ctx, sx, sy, tw, th, (x + y) % 2 ? COLORS.water : COLORS.waterDeep, null);
      return;
    }
    if (terrain === 'hill') {
      drawDiamond(ctx, sx, sy, tw, th, COLORS.hill, COLORS.grid);
      drawBlock(ctx, sx, sy, tw * 0.7, th * 0.7, 8 * cam.scale, '#9aab7c', '#87956c', '#a8b88a');
      return;
    }
    const fill = (x + y) % 2 ? COLORS.grass : COLORS.grassAlt;
    drawDiamond(ctx, sx, sy, tw, th, fill, COLORS.grid);
  }

  function drawRoad(sx, sy, tw, th) {
    drawDiamond(ctx, sx, sy, tw, th, COLORS.road, COLORS.roadLine);
    // center dash
    ctx.strokeStyle = 'rgba(255,252,244,0.55)';
    ctx.lineWidth = 1.5 * cam.scale;
    ctx.beginPath();
    ctx.moveTo(sx - tw * 0.15, sy);
    ctx.lineTo(sx + tw * 0.15, sy);
    ctx.stroke();
  }

  function drawZone(sx, sy, tw, th, zone, level) {
    const z = buildingsData.zones[zone];
    const base = z?.color || '#888';
    if (level <= 0) {
      drawDiamond(ctx, sx, sy, tw, th, shade(base, 40), 'rgba(38,62,56,0.2)');
      // hatch
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx, sy - th / 2);
      ctx.lineTo(sx + tw / 2, sy);
      ctx.lineTo(sx, sy + th / 2);
      ctx.lineTo(sx - tw / 2, sy);
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,252,244,0.45)';
      ctx.lineWidth = 1;
      for (let i = -tw; i < tw; i += 6) {
        ctx.beginPath();
        ctx.moveTo(sx + i, sy - th);
        ctx.lineTo(sx + i + th, sy + th);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    const h = (6 + level * 10) * cam.scale;
    const top = shade(base, 20 + level * 5);
    const left = shade(base, -15);
    const right = shade(base, -5);
    drawDiamond(ctx, sx, sy, tw, th, shade(base, 30), null);
    drawBlock(ctx, sx, sy, tw * 0.78, th * 0.78, h, top, left, right);
    // windows
    if (level >= 2) {
      ctx.fillStyle = 'rgba(255,252,244,0.7)';
      const wy = sy - h + th * 0.15;
      ctx.fillRect(sx - 4 * cam.scale, wy, 3 * cam.scale, 3 * cam.scale);
      ctx.fillRect(sx + 2 * cam.scale, wy, 3 * cam.scale, 3 * cam.scale);
      if (level >= 3) {
        ctx.fillRect(sx - 4 * cam.scale, wy + 6 * cam.scale, 3 * cam.scale, 3 * cam.scale);
        ctx.fillRect(sx + 2 * cam.scale, wy + 6 * cam.scale, 3 * cam.scale, 3 * cam.scale);
      }
    }
    // level badge small under building, not covering
    ctx.fillStyle = '#263e38';
    ctx.font = `600 ${Math.max(9, 10 * cam.scale)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(level), sx, sy + th * 0.42);
  }

  function drawFacility(sx, sy, tw, th, facilityId) {
    const fac = buildingsData.facilities[facilityId];
    const color = fac?.color || '#cf704d';
    drawDiamond(ctx, sx, sy, tw, th, shade(color, 45), null);
    const h = 18 * cam.scale;
    drawBlock(ctx, sx, sy, tw * 0.85, th * 0.85, h, shade(color, 25), shade(color, -20), shade(color, -8));
    // roof accent
    ctx.beginPath();
    ctx.moveTo(sx, sy - h - th * 0.35);
    ctx.lineTo(sx + tw * 0.28, sy - h);
    ctx.lineTo(sx, sy - h + th * 0.12);
    ctx.lineTo(sx - tw * 0.28, sy - h);
    ctx.closePath();
    ctx.fillStyle = shade(color, -30);
    ctx.fill();
    // label below tile so it never covers the building body much
    const label = fac?.hanji || facilityId;
    ctx.font = `600 ${Math.max(10, 11 * cam.scale)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const padX = 6 * cam.scale;
    const padY = 2 * cam.scale;
    const textW = ctx.measureText(label).width;
    const bx = sx - textW / 2 - padX;
    const by = sy + th * 0.38;
    const bw = textW + padX * 2;
    const bh = 14 * cam.scale + padY;
    ctx.fillStyle = 'rgba(255,252,244,0.92)';
    ctx.strokeStyle = 'rgba(38,62,56,0.18)';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bw, bh, 8 * cam.scale);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#263e38';
    ctx.fillText(label, sx, by + padY + 1);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(state) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // soft paper background already in CSS; add faint vignette on canvas
    const grd = ctx.createRadialGradient(w * 0.45, h * 0.4, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    grd.addColorStop(0, 'rgba(203,228,219,0.25)');
    grd.addColorStop(1, 'rgba(247,244,235,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // paint back-to-front
    for (let sum = 0; sum <= SIZE * 2; sum++) {
      for (let x = 0; x < SIZE; x++) {
        const y = sum - x;
        if (y < 0 || y >= SIZE) continue;
        const cell = state.cells[y][x];
        const { sx, sy, tw, th } = isoToScreen(x, y, cam.originX, cam.originY, cam.scale);

        drawTerrain(sx, sy, tw, th, cell.terrain, x, y);

        if (cell.kind === 'road') drawRoad(sx, sy, tw, th);
        else if (cell.kind === 'zone') drawZone(sx, sy, tw, th, cell.zone, cell.level);
        else if (cell.kind === 'facility') drawFacility(sx, sy, tw, th, cell.facility);

        if (cam.hover && cam.hover.x === x && cam.hover.y === y) {
          drawDiamond(ctx, sx, sy, tw, th, COLORS.hover, 'rgba(207,112,77,0.8)');
        }
        if (state.selected && state.selected.x === x && state.selected.y === y) {
          drawDiamond(ctx, sx, sy, tw, th, COLORS.select, 'rgba(49,95,80,0.9)');
        }
      }
    }
  }

  return {
    cam, resize, centerOn, pan, zoomAt, pick, draw,
    TILE_W, TILE_H,
  };
}
