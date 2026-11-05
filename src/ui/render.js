import { SIZE, neighbors4 } from '../engine/map.js';
import { buildingsData } from '../engine/game.js';
import { isoToScreen, screenToIso, drawDiamond, shade, TILE_W, TILE_H } from './iso.js';
import {
  getZoneSprite, getFacilitySprite, blitSprite, variantOf, hash2,
  drawTree, drawFlower, drawCherry, drawGolden, GROUND_FACILITIES,
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
  let showLevels = true;
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

  /** tile-local point: u along +x, v along +y, both 0..1 */
  function P(sx, sy, tw, th, u, v) {
    return [sx + (u - v) * tw / 2, sy + (u + v - 1) * th / 2];
  }
  function quad(sx, sy, tw, th, u0, v0, u1, v1, fill) {
    const a = P(sx, sy, tw, th, u0, v0), b = P(sx, sy, tw, th, u1, v0);
    const c = P(sx, sy, tw, th, u1, v1), d = P(sx, sy, tw, th, u0, v1);
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function isRoadish(cells, x, y) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return false;
    const c = cells[y][x];
    return c.kind === 'road' || (c.kind === 'facility' && c.facility === 'roundabout');
  }
  function roadAxes(cells, x, y) {
    const ex = isRoadish(cells, x + 1, y) || isRoadish(cells, x - 1, y);
    const ey = isRoadish(cells, x, y + 1) || isRoadish(cells, x, y - 1);
    return { ex: ex || !ey, ey };
  }

  const A0 = 0.24, A1 = 0.76; // asphalt band inside a road tile; rest is sidewalk / planting strip
  function drawRoad(sx, sy, tw, th, cells, x, y) {
    drawDiamond(ctx, sx, sy, tw, th, COLORS.sidewalk, null);
    const { ex, ey } = roadAxes(cells, x, y);
    const asph = COLORS.road;
    const n = isRoadish(cells, x, y - 1), so = isRoadish(cells, x, y + 1);
    const w = isRoadish(cells, x - 1, y), e = isRoadish(cells, x + 1, y);
    if (ex) quad(sx, sy, tw, th, w ? 0 : A0, A0, e ? 1 : A1, A1, asph);
    if (ey) quad(sx, sy, tw, th, A0, n ? 0 : A0, A1, so ? 1 : A1, asph);
    // curb lines
    ctx.strokeStyle = 'rgba(38,62,56,0.10)'; ctx.lineWidth = 1;
    // planting strip pits (soil) where the side faces a non-road tile
    const pit = '#cdbf9f';
    if (ex && !n) quad(sx, sy, tw, th, 0.38, 0.04, 0.62, 0.16, pit);
    if (ex && !so) quad(sx, sy, tw, th, 0.38, 0.84, 0.62, 0.96, pit);
    if (ey && !w) quad(sx, sy, tw, th, 0.04, 0.38, 0.16, 0.62, pit);
    if (ey && !e) quad(sx, sy, tw, th, 0.84, 0.38, 0.96, 0.62, pit);
    // lane dashes
    ctx.strokeStyle = COLORS.roadLine;
    ctx.lineWidth = 1.1 * cam.scale;
    ctx.setLineDash([3 * cam.scale, 3.5 * cam.scale]);
    ctx.beginPath();
    if (ex && !ey) { ctx.moveTo(...P(sx, sy, tw, th, 0.05, 0.5)); ctx.lineTo(...P(sx, sy, tw, th, 0.95, 0.5)); }
    if (ey && !(ex && (w || e))) { ctx.moveTo(...P(sx, sy, tw, th, 0.5, 0.05)); ctx.lineTo(...P(sx, sy, tw, th, 0.5, 0.95)); }
    ctx.stroke();
    ctx.setLineDash([]);
    // zebra crossing at junctions
    if (ex && ey && (w || e) && (n || so)) {
      ctx.fillStyle = 'rgba(255,252,244,0.75)';
      for (let i = 0; i < 4; i++) {
        const u = A0 + 0.04 + i * 0.13;
        quad(sx, sy, tw, th, u, A0 - 0.02, u + 0.06, A0 + 0.08, 'rgba(255,252,244,0.75)');
      }
    }
  }

  /** street-tree positions for a road tile: [u, v, species] */
  function streetTrees(cells, x, y) {
    const out = [];
    const { ex, ey } = roadAxes(cells, x, y);
    const n = isRoadish(cells, x, y - 1), so = isRoadish(cells, x, y + 1);
    const w = isRoadish(cells, x - 1, y), e = isRoadish(cells, x + 1, y);
    const sp = (k) => ((x + y + k) % 2 === 0 ? 'cherry' : 'golden');
    if (ex && !ey) {
      if (!n) out.push([0.5, 0.1, sp(0)]);
      if (!so) out.push([0.5, 0.9, sp(1)]);
    } else if (ey && !ex) {
      if (!w) out.push([0.1, 0.5, sp(0)]);
      if (!e) out.push([0.9, 0.5, sp(1)]);
    } else {
      // corners of junctions get a tree where both sides are non-road
      if (!n && !w) out.push([0.1, 0.1, sp(0)]);
      if (!n && !e) out.push([0.9, 0.1, sp(1)]);
      if (!so && !w) out.push([0.1, 0.9, sp(1)]);
      if (!so && !e) out.push([0.9, 0.9, sp(0)]);
    }
    return out;
  }

  function drawEmptyDecor(sx, sy, tw, th, x, y) {
    const h = hash2(x + 3, y * 7);
    // trees on empty grass — denser near edges / some clusters
    const edge = (x < 3 || y < 3 || x > SIZE - 4 || y > SIZE - 4);
    const treeChance = edge ? 2 : 6;
    if (h % treeChance === 0) {
      const sc = (0.55 + (h % 5) * 0.08) * cam.scale;
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
    if (!showLevels) return;
    // small level pip on the front corner of the lot (never on the facade)
    const r = 4.2 * cam.scale;
    const px = sx + tw * 0.3, py = sy + th * 0.24;
    ctx.fillStyle = 'rgba(255,252,244,0.92)';
    ctx.strokeStyle = 'rgba(38,62,56,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#263e38';
    ctx.font = `700 ${Math.max(8, 6.5 * cam.scale)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(level), px, py + 0.5);
  }

  function drawFacility(sx, sy, tw, th, facilityId, showLabel, x, y, labelOnly = false) {
    if (!labelOnly) {
      const spr = getFacilitySprite(facilityId, 0);
      blitSprite(ctx, spr, sx, sy, cam.scale);
    }
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

    state_ = state;
    const objs = [];
    const vis = (sx, sy) => !(sx < -90 * cam.scale || sy < -60 || sx > w + 90 * cam.scale || sy > h + 140 * cam.scale);
    for (let sum = 0; sum <= SIZE * 2; sum++) {
      for (let x = 0; x < SIZE; x++) {
        const y = sum - x;
        if (y < 0 || y >= SIZE) continue;
        const cell = state.cells[y][x];
        const { sx, sy, tw, th } = isoToScreen(x, y, cam.originX, cam.originY, cam.scale);
        if (!vis(sx, sy)) continue;
        if (cell.terrain === 'water') drawWater(sx, sy, tw, th, x, y, state.cells, time);
        else if (cell.terrain === 'hill') drawHill(sx, sy, tw, th, x, y);
        else drawGrass(sx, sy, tw, th, x, y);

        if (cell.kind === 'road') {
          drawRoad(sx, sy, tw, th, state.cells, x, y);
          for (const [u, v, sp] of streetTrees(state.cells, x, y)) {
            const [tx, ty] = P(sx, sy, tw, th, u, v);
            objs.push({ k: x + y + u + v - 1, f: () => drawStreetTree(tx, ty, sp, x * 7 + y * 3 + u * 5, time) });
          }
        } else if (cell.kind === 'zone') {
          if (cell.level <= 0) drawZoneEmpty(sx, sy, tw, th, cell.zone);
          else objs.push({ k: x + y, f: () => drawZoneBuilt(sx, sy, tw, th, cell.zone, cell.level, x, y) });
        } else if (cell.kind === 'facility') {
          if (cell.facility === 'roundabout') roundabouts.push({ sx, sy, tw, th, x, y });
          const showLabel = (cam.hover && cam.hover.x === x && cam.hover.y === y)
            || (state.selected && state.selected.x === x && state.selected.y === y);
          objs.push({ k: x + y, f: () => drawFacility(sx, sy, tw, th, cell.facility, false, x, y) });
          if (showLabel) labels.push(() => drawFacility(sx, sy, tw, th, cell.facility, true, x, y, true));
        } else if (cell.kind === 'empty' && cell.terrain === 'grass') {
          objs.push({ k: x + y - 0.01, f: () => drawEmptyDecor(sx, sy, tw, th, x, y) });
        }
        if (cam.hover && cam.hover.x === x && cam.hover.y === y) {
          drawDiamond(ctx, sx, sy, tw, th, COLORS.hover, 'rgba(207,112,77,0.75)');
        }
        if (state.selected && state.selected.x === x && state.selected.y === y) {
          drawDiamond(ctx, sx, sy, tw, th, COLORS.select, 'rgba(49,95,80,0.85)');
        }
      }
    }
    for (const rb of roundabouts) drawRoundaboutLawn(rb, time);
    roundabouts.length = 0;
    objs.sort((a, b) => a.k - b.k);
    for (const o of objs) o.f();
    drawPetals(time);
    drawTraffic(state.cells, time);
    for (const l of labels) l();
    labels.length = 0;
  }

  const labels = [];
  const roundabouts = [];
  /** big round lawn spanning into the ring road (湯德章紀念公園-style 圓環) */
  function drawRoundaboutLawn({ sx, sy, tw, th, x, y }, time) {
    const ring = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]
      .every(([dx, dy]) => isRoadish(state_.cells, x + dx, y + dy));
    const R = ring ? 0.92 : 0.47;
    ctx.fillStyle = COLORS.road;
    if (ring) { ctx.beginPath(); ctx.ellipse(sx, sy, tw * 1.22, th * 1.22, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#efe6d0';
    ctx.beginPath(); ctx.ellipse(sx, sy, tw * R, th * R, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9cc584';
    ctx.beginPath(); ctx.ellipse(sx, sy, tw * (R - 0.06), th * (R - 0.06), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#efe6d0'; ctx.lineWidth = 2.2 * cam.scale;
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7 + 0.25;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * tw * (R - 0.06), sy + Math.sin(a) * th * (R - 0.06)); ctx.stroke();
    }
    if (ring) {
      // dashed lane around
      ctx.strokeStyle = COLORS.roadLine; ctx.lineWidth = 1.1 * cam.scale;
      ctx.setLineDash([3 * cam.scale, 3.5 * cam.scale]);
      ctx.beginPath(); ctx.ellipse(sx, sy, tw * 1.07, th * 1.07, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      const trees = [];
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI * 2 / 10 + 0.1;
        trees.push([sx + Math.cos(a) * tw * 0.7, sy + Math.sin(a) * th * 0.7, i]);
      }
      trees.sort((a, b) => a[1] - b[1]);
      for (const [tx, ty, i] of trees) {
        if (Math.abs(ty - sy) < th * 0.2 && Math.abs(tx - sx) < tw * 0.3) continue;
        const sway = Math.sin(time * 0.0012 + i) * 0.5 * cam.scale;
        if (i % 2) drawCherry(ctx, tx, ty, 0.6 * cam.scale, i, sway);
        else drawGolden(ctx, tx, ty, 0.6 * cam.scale, i, sway);
      }
    }
  }
  let state_ = null;
  const petals = [];
  function drawStreetTree(tx, ty, sp, seed, time) {
    const s = 0.62 * cam.scale;
    const sway = Math.sin(time * 0.0012 + seed) * 0.5 * cam.scale;
    if (sp === 'cherry') drawCherry(ctx, tx, ty, s, seed | 0, sway);
    else drawGolden(ctx, tx, ty, s, seed | 0, sway);
    if (((seed * 13) | 0) % 3 === 0 && petals.length < 60) petals.push([tx, ty, sp, seed]);
  }
  function drawPetals(time) {
    for (const [tx, ty, sp, seed] of petals) {
      const t = ((time * 0.00025 + seed * 0.37) % 1);
      const px = tx + Math.sin(t * 6 + seed) * 5 * cam.scale + t * 6 * cam.scale;
      const py = ty - 14 * cam.scale + t * 15 * cam.scale;
      ctx.globalAlpha = 1 - t * 0.6;
      ctx.fillStyle = sp === 'cherry' ? '#f7b6c8' : '#f4d23e';
      ctx.beginPath(); ctx.ellipse(px, py, 1.3 * cam.scale, 0.8 * cam.scale, t * 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    petals.length = 0;
  }

  return {
    cam, resize, centerOn, pan, zoomAt, pick, draw,
    setShowLevels: (v) => { showLevels = !!v; },
    TILE_W, TILE_H,
  };
}
