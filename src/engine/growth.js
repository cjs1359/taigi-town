/** Zone growth 0→1→2→3 based on road adjacency + nearby facilities */

import { SIZE, neighbors4, distance } from './map.js';

const LEVEL_THRESHOLDS = [0, 8, 22, 45]; // growth points needed to reach level 1/2/3

function nearbyFacilityBonus(cells, x, y, buildings) {
  let bonus = 1;
  let found = 0;
  for (let yy = 0; yy < SIZE; yy++) {
    for (let xx = 0; xx < SIZE; xx++) {
      const c = cells[yy][xx];
      if (c.kind !== 'facility' || !c.facility) continue;
      const d = distance(x, y, xx, yy);
      if (d <= 5) {
        const fac = buildings.facilities[c.facility];
        if (fac) {
          bonus = Math.max(bonus, fac.growthBonus || 1);
          found++;
        }
      }
    }
  }
  if (found >= 2) bonus += 0.15;
  if (found >= 3) bonus += 0.15;
  return bonus;
}

function adjacentToRoad(cells, x, y) {
  return neighbors4(x, y).some(([a, b]) => cells[b][a].kind === 'road');
}

/**
 * Advance growth for one month tick.
 * Returns list of cells that leveled up: [{x,y,level}]
 */
export function tickGrowth(cells, buildings) {
  const leveled = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = cells[y][x];
      if (c.kind !== 'zone' || !c.zone) continue;
      if (!adjacentToRoad(cells, x, y)) continue;
      if (c.level >= 3) continue;

      const bonus = nearbyFacilityBonus(cells, x, y, buildings);
      const base = c.level === 0 ? 2.2 : 1.4;
      c.growth += base * bonus;

      const next = c.level + 1;
      const need = LEVEL_THRESHOLDS[next];
      if (c.growth >= need) {
        c.level = next;
        c.growth = 0;
        leveled.push({ x, y, level: next, zone: c.zone });
      }
    }
  }
  return leveled;
}

export { LEVEL_THRESHOLDS };
