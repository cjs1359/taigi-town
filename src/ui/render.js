import { SIZE, neighbors4 } from '../engine/map.js';
import { buildingsData } from '../engine/game.js';
import { isoToScreen, screenToIso, drawDiamond, shade, TILE_W, TILE_H } from './iso.js';
import {
  getZoneSprite, getFacilitySprite, blitSprite, variantOf, hash2,
  drawTree, drawFlower,
} from './sprites.js';

const COLORS = {
  grass: '#c8d9a8',
  grassAlt: '#bdd29c',
  grassDeep: '#b3c892',
  water: '#7eb6c6',
  waterDeep: '#5f9aab',
  waterShore: '#a8d0c0',
  hill: '#8faf78',
  road: '#d5cebc',
  roadEdge: '#ebe4d4',
  roadLine: '#fffcf4',
  sidewalk: '#e8e2d4',
  grid: 'rgba(38,62,56,0.10)',
  hover: 'rgba(207,112,77,0.32)',
  select: 'rgba(49,95,80,0.38)',
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const cam = {
    originX: 0,
    originY: 0,
    scale: 2.0,
    hover: null,
  };
  let t0 = performance.now();

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
    cam.originY = viewH / 2 - sy + 20;
  }

  function pan(dx, dy) {
    cam.originX += dx;
    cam.originY += dy;
  }

  function zoomAt(factor, sx, sy) {
    const before = screenToIso(sx, sy, cam.originX, cam.originY, cam.scale);
    cam.scale = Math.max(0.7, Math.min(2.4, cam.scale * factor));
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

  function drawGrass(sx, sy, tw, th, x, y) {
    const h = hash2(x, y);
    const fills = [COLORS.grass, COLORS.grassAlt, COLORS.grassDeep];
    const fill = fills[h % 3];
    drawDiamond(ctx, sx, sy, tw, th, fill, COLORS.grid);
    // subtle blade / speckles
    if (h % 5 === 0) {
      ctx.fillStyle = 'rgba(49,95,80,0.12)';
      ctx.fillRect(sx - 2, sy - 1, 1.5, 2.5);
      ctx.fillRect(sx + 3, sy, 1.2, 2);
    }
  }

  function drawWater(sx, sy, tw, th, x, y, cells, time) {
    const phase = ((x * 0.7 + y * 0.9) + time * 0.0015);
    const deep = (Math.sin(phase) + 1) * 0.5 > 0.55;
    drawDiamond(ctx, sx, sy, tw, th, deep ? COLORS.waterDeep : COLORS.water, null);
    // shoreline if next to grass
    const shore = neighbors4(x, y).some(([nx, ny]) => {
      const c = cells[ny][nx];
      return c && c.terrain !== 'water';
    });
    if (shore) {
      ctx.strokeStyle = COLORS.waterShore;
      ctx.lineWidth = 2 * cam.scale;
      ctx.beginPath();
      ctx.moveTo(sx, sy - th / 2);
      ctx.lineTo(sx + tw / 2, sy);
      ctx.lineTo(sx, sy + th / 2);
      ctx.lineTo(sx - tw / 2, sy);
      ctx.closePath();
      ctx.stroke();
    }
    // wave shimmer
    ctx.strokeStyle = 'rgba(255,252,244,0.45)';
    ctx.lineWidth = 1.2 * cam.scale;
    const wy = sy + Math.sin(phase * 2) * 2 * cam.scale;
    ctx.beginPath();
    ctx.moveTo(sx - tw * 0.25, wy);
    ctx.quadraticCurveTo(sx, wy - 2 * cam.scale, sx + tw * 0.25, wy + 1 * cam.scale);
    ctx.stroke();
    if ((x + y) % 3 === 0) {
      ctx.fillStyle = 'rgba(255,252,244,0.4)';
      ctx.beginPath();
      ctx.arc(sx + Math.cos(phase) * 6, sy, 1.5 * cam.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHill(sx, sy, tw, th, x, y) {
    // soft green mound (not grey box)
    drawDiamond(ctx, sx, sy, tw, th, '#a8c48a', COLORS.grid);
    ctx.save();
    // stacked ellipses
    ctx.fillStyle = '#7fa86a';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 4 * cam.scale, tw * 0.32, th * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6f985c';
    ctx.beginPath();
    ctx.ellipse(sx - 2, sy - 10 * cam.scale, tw * 0.22, th * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,252,244,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx - 4, sy - 12 * cam.scale, tw * 0.1, th * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    // tiny tree on some hills
    if (hash2(x, y) % 3 === 0) {
      drawTree(ctx, sx + 4, sy - 8 * cam.scale, 0.45 * cam.scale, hash2(x, y) % 4);
    }
    ctx.restore();
  }

  function roadNeighbors(cells, x, y) {
    const n = { n: false, s: false, e: false, w: false };
    if (y > 0 && cells[y - 1][x].kind === 'road') n.n = true;
    if (y < SIZE - 1 && cells[y + 1][x].kind === 'road') n.s = true;
    if (x < SIZE - 1 && cells[y][x + 1].kind === 'road') n.e = true;
    if (x > 0 && cells[y][x - 1].kind === 'road') n.w = true;
    return n;
  }

  function drawRoad(sx, sy, tw, th, cells, x, y) {
    // sidewalk ring
    drawDiamond(ctx, sx, sy, tw, th, COLORS.sidewalk, null);
    drawDiamond(ctx, sx, sy, tw * 0.78, th * 0.78, COLORS.road, null);
    const nb = roadNeighbors(cells, x, y);
    ctx.strokeStyle = COLORS.roadLine;
    ctx.lineWidth = 1.4 * cam.scale;
    ctx.setLineDash([4 * cam.scale, 4 * cam.scale]);
    ctx.beginPath();
    // dashed center along dominant axis
    if (nb.e || nb.w || (!nb.n && !nb.s)) {
      // along x (screen: left-right-ish in iso = SE-NW)
      ctx.moveTo(sx - tw * 0.22, sy);
      ctx.lineTo(sx + tw * 0.22, sy);
    }
    if (nb.n || nb.s) {
      ctx.moveTo(sx, sy - th * 0.22);
      ctx.lineTo(sx, sy + th * 0.22);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawEmptyDecor(sx, sy, tw, th, x, y) {
    const h = hash2(x + 3, y * 7);
    // trees on empty grass — denser near edges / some clusters
    const nearTown = (x > 5 && x < 18 && y > 5 && y < 18);
    const edge = (x < 3 || y < 3 || x > SIZE - 4 || y > SIZE - 4);
    const treeChance = edge ? 2 : nearTown ? 5 : 8;
    if (h % treeChance === 0 && !(nearTown && h % 11 === 0)) {
      const sc = (0.6 + (h % 5) * 0.1) * cam.scale;
      drawTree(ctx, sx + ((h % 5) - 2) * 2, sy - 2, sc, h % 4);
      if (edge && h % 4 === 0) drawTree(ctx, sx + 10, sy + 4, sc * 0.75, (h + 1) % 4);
      return;
    }
    if (h % 11 === 0) {
      drawFlower(ctx, sx - 4, sy + 2, h % 5);
      drawFlower(ctx, sx + 5, sy, (h + 2) % 5);
    } else if (h % 17 === 0) {
      drawFlower(ctx, sx, sy + 1, h % 5);
    }
  }

  function drawZoneEmpty(sx, sy, tw, th, zone) {
    const z = buildingsData.zones[zone];
    const base = z?.color || '#888';
    drawDiamond(ctx, sx, sy, tw, th, shade(base, 45), 'rgba(38,62,56,0.18)');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx, sy - th / 2);
    ctx.lineTo(sx + tw / 2, sy);
    ctx.lineTo(sx, sy + th / 2);
    ctx.lineTo(sx - tw / 2, sy);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,252,244,0.5)';
    ctx.lineWidth = 1;
    for (let i = -tw; i < tw; i += 7) {
      ctx.beginPath();
      ctx.moveTo(sx + i, sy - th);
      ctx.lineTo(sx + i + th, sy + th);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawZoneBuilt(sx, sy, tw, th, zone, level, x, y) {
    const v = variantOf(x, y, 6);
    const spr = getZoneSprite(zone, level, v);
    blitSprite(ctx, spr, sx, sy, cam.scale);
    // small level pip under building
    ctx.fillStyle = 'rgba(255,252,244,0.9)';
    ctx.beginPath();
    ctx.arc(sx, sy + th * 0.38, 6 * cam.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#263e38';
    ctx.font = `700 ${Math.max(9, 10 * cam.scale)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(level), sx, sy + th * 0.38 + 0.5);
  }

  function drawFacility(sx, sy, tw, th, facilityId, showLabel, x, y) {
    const v = variantOf(x, y, 3);
    const spr = getFacilitySprite(facilityId, v);
    blitSprite(ctx, spr, sx, sy, cam.scale);
    if (showLabel) {
      const fac = buildingsData.facilities[facilityId];
      const label = fac?.hanji || facilityId;
      ctx.font = `700 ${Math.max(11, 12 * cam.scale)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const padX = 8 * cam.scale;
      const padY = 3 * cam.scale;
      const textW = ctx.measureText(label).width;
      const bx = sx - textW / 2 - padX;
      const by = sy + th * 0.42;
      const bw = textW + padX * 2;
      const bh = 16 * cam.scale + padY;
      ctx.fillStyle = 'rgba(255,252,244,0.96)';
      ctx.strokeStyle = 'rgba(38,62,56,0.22)';
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, bw, bh, 8 * cam.scale);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#263e38';
      ctx.fillText(label, sx, by + padY);
    }
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

  function drawClouds(w, h, time) {
    const clouds = [
      { x: 0.15, y: 0.12, s: 1, sp: 0.008 },
      { x: 0.55, y: 0.08, s: 1.3, sp: 0.005 },
      { x: 0.8, y: 0.18, s: 0.9, sp: 0.006 },
    ];
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (const c of clouds) {
      const cx = ((c.x + time * c.sp * 0.0001) % 1.3) * w - w * 0.1;
      const cy = c.y * h;
      const s = c.s * 40;
      ctx.fillStyle = '#fffcf4';
      ctx.beginPath();
      ctx.ellipse(cx, cy, s, s * 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - s * 0.5, cy + 4, s * 0.6, s * 0.35, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + s * 0.45, cy + 2, s * 0.55, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function collectRoads(cells) {
    const roads = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (cells[y][x].kind === 'road') roads.push({ x, y });
      }
    }
    return roads;
  }

  function drawTraffic(cells, time) {
    const roads = collectRoads(cells);
    if (roads.length < 2) return;
    const nCars = Math.min(5, Math.floor(roads.length / 8) + 1);
    for (let i = 0; i < nCars; i++) {
      const idx = Math.floor((time * 0.0004 + i * 0.37) * roads.length) % roads.length;
      const r = roads[idx];
      const next = roads[(idx + 1) % roads.length];
      const { sx, sy, tw, th } = isoToScreen(r.x, r.y, cam.originX, cam.originY, cam.scale);
      const colors = ['#cf704d', '#315f50', '#6a9cc4', '#d4b25a', '#c45a45'];
      // scooter / tiny car
      ctx.fillStyle = colors[i % colors.length];
      const cw = 8 * cam.scale, ch = 4 * cam.scale;
      ctx.fillRect(sx - cw / 2, sy - ch / 2, cw, ch);
      // person dot
      if (i % 2 === 0) {
        ctx.fillStyle = '#263e38';
        ctx.beginPath();
        ctx.arc(sx + tw * 0.15, sy - th * 0.1, 2 * cam.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cf704d';
        ctx.fillRect(sx + tw * 0.15 - 1.5 * cam.scale, sy - th * 0.1 + 2 * cam.scale, 3 * cam.scale, 3 * cam.scale);
      }
      void next;
    }
  }

  function draw(state) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const time = performance.now() - t0;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // soft paper wash
    const grd = ctx.createRadialGradient(w * 0.45, h * 0.4, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    grd.addColorStop(0, 'rgba(203,228,219,0.3)');
    grd.addColorStop(0.6, 'rgba(240,220,180,0.12)');
    grd.addColorStop(1, 'rgba(247,244,235,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    drawClouds(w, h, time);

    for (let sum = 0; sum <= SIZE * 2; sum++) {
      for (let x = 0; x < SIZE; x++) {
        const y = sum - x;
        if (y < 0 || y >= SIZE) continue;
        const cell = state.cells[y][x];
        const { sx, sy, tw, th } = isoToScreen(x, y, cam.originX, cam.originY, cam.scale);

        // skip offscreen for perf
        if (sx < -80 || sy < -100 || sx > w + 80 || sy > h + 100) continue;

        if (cell.terrain === 'water') {
          drawWater(sx, sy, tw, th, x, y, state.cells, time);
        } else if (cell.terrain === 'hill') {
          drawHill(sx, sy, tw, th, x, y);
        } else {
          drawGrass(sx, sy, tw, th, x, y);
        }

        if (cell.kind === 'road') {
          drawRoad(sx, sy, tw, th, state.cells, x, y);
        } else if (cell.kind === 'zone') {
          if (cell.level <= 0) drawZoneEmpty(sx, sy, tw, th, cell.zone);
          else drawZoneBuilt(sx, sy, tw, th, cell.zone, cell.level, x, y);
        } else if (cell.kind === 'facility') {
          const showLabel = (cam.hover && cam.hover.x === x && cam.hover.y === y)
            || (state.selected && state.selected.x === x && state.selected.y === y);
          drawFacility(sx, sy, tw, th, cell.facility, showLabel, x, y);
        } else if (cell.kind === 'empty' && cell.terrain === 'grass') {
          drawEmptyDecor(sx, sy, tw, th, x, y);
        }

        if (cam.hover && cam.hover.x === x && cam.hover.y === y) {
          drawDiamond(ctx, sx, sy, tw, th, COLORS.hover, 'rgba(207,112,77,0.75)');
        }
        if (state.selected && state.selected.x === x && state.selected.y === y) {
          drawDiamond(ctx, sx, sy, tw, th, COLORS.select, 'rgba(49,95,80,0.85)');
        }
      }
    }

    drawTraffic(state.cells, time);
  }

  return {
    cam, resize, centerOn, pan, zoomAt, pick, draw,
    TILE_W, TILE_H,
  };
}
