/** Population, tax, costs */

export function computeStats(cells, buildings) {
  let population = 0;
  let taxPerMonth = 0;
  let roads = 0;
  let facilities = 0;
  const built = new Set();

  for (const row of cells) {
    for (const c of row) {
      if (c.kind === 'road') roads++;
      if (c.kind === 'facility' && c.facility) {
        facilities++;
        built.add(c.facility);
      }
      if (c.kind === 'zone' && c.zone && c.level > 0) {
        const z = buildings.zones[c.zone];
        const lv = z.levels[c.level - 1];
        if (lv) {
          population += lv.pop;
          taxPerMonth += lv.tax;
        }
      }
    }
  }
  return { population, taxPerMonth, roads, facilities, builtFacilities: [...built] };
}

export function canAfford(money, cost) {
  return money >= cost;
}

export function applyTax(money, taxPerMonth) {
  return money + Math.max(0, Math.floor(taxPerMonth));
}
