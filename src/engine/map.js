/** Grid map helpers for 台語小庄頭 */

export const SIZE = 24;

export function emptyCell(x, y) {
  return {
    x, y,
    terrain: 'grass', // grass | water | hill
    kind: 'empty', // empty | road | zone | facility
    zone: null, // residential | commercial | industrial
    level: 0, // 0 = zoned empty, 1-3 grown
    facility: null,
    growth: 0, // progress toward next level
  };
}

export function createMap() {
  const cells = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) {
      const c = emptyCell(x, y);
      // gentle river across lower-right, hills on edges
      if ((x + y > 38 && x > 16) || (x > 20 && y > 18)) c.terrain = 'water';
      if ((x < 2 && y < 4) || (x > 21 && y < 3) || (y === 0 && x > 8 && x < 14)) c.terrain = 'hill';
      row.push(c);
    }
    cells.push(row);
  }
  // starter road from mid-left to station
  const sy = 11;
  for (let x = 4; x <= 11; x++) {
    cells[sy][x].kind = 'road';
    cells[sy][x].terrain = 'grass';
  }
  // station at (11,11)
  const st = cells[sy][11];
  st.kind = 'facility';
  st.facility = 'station';
  st.terrain = 'grass';
  return cells;
}

export function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
}

export function getCell(cells, x, y) {
  if (!inBounds(x, y)) return null;
  return cells[y][x];
}

export function neighbors4(x, y) {
  return [
    [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
  ].filter(([a, b]) => inBounds(a, b));
}

export function hasAdjacentRoad(cells, x, y) {
  return neighbors4(x, y).some(([a, b]) => cells[b][a].kind === 'road');
}

export function distance(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function findFacilities(cells, facilityId) {
  const out = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = cells[y][x];
      if (c.kind === 'facility' && c.facility === facilityId) out.push({ x, y });
    }
  }
  return out;
}

export function countRoads(cells) {
  let n = 0;
  for (const row of cells) for (const c of row) if (c.kind === 'road') n++;
  return n;
}

export function countZones(cells, zone) {
  let n = 0;
  for (const row of cells) for (const c of row) {
    if (c.kind === 'zone' && c.zone === zone) n++;
  }
  return n;
}

export function maxZoneLevel(cells, zone) {
  let m = 0;
  for (const row of cells) for (const c of row) {
    if (c.kind === 'zone' && c.zone === zone) m = Math.max(m, c.level);
  }
  return m;
}

export function hasFacility(cells, facilityId) {
  return findFacilities(cells, facilityId).length > 0;
}

export function zoneNearFacility(cells, zone, facilityId, radius) {
  const facs = findFacilities(cells, facilityId);
  if (!facs.length) return false;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = cells[y][x];
      if (c.kind !== 'zone' || c.zone !== zone) continue;
      if (facs.some((f) => distance(x, y, f.x, f.y) <= radius)) return true;
    }
  }
  return false;
}

export function facilityNearFacility(cells, facilityId, nearId, radius) {
  const a = findFacilities(cells, facilityId);
  const b = findFacilities(cells, nearId);
  if (!a.length || !b.length) return false;
  return a.some((p) => b.some((q) => distance(p.x, p.y, q.x, q.y) <= radius));
}

export function serializeCells(cells) {
  return cells.map((row) => row.map((c) => ({
    t: c.terrain,
    k: c.kind,
    z: c.zone,
    l: c.level,
    f: c.facility,
    g: c.growth,
  })));
}

export function deserializeCells(data) {
  const cells = createMap();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = data[y]?.[x];
      if (!d) continue;
      const c = cells[y][x];
      c.terrain = d.t;
      c.kind = d.k;
      c.zone = d.z;
      c.level = d.l || 0;
      c.facility = d.f;
      c.growth = d.g || 0;
    }
  }
  return cells;
}
