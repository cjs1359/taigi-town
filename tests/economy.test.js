import { describe, it, expect } from 'vitest';
import { createMap } from '../src/engine/map.js';
import { computeStats, applyTax, canAfford } from '../src/engine/economy.js';
import buildings from '../data/buildings.json';

describe('economy', () => {
  it('counts tax from grown zones', () => {
    const cells = createMap();
    cells[10][10].kind = 'zone';
    cells[10][10].zone = 'residential';
    cells[10][10].level = 2;
    const stats = computeStats(cells, buildings);
    expect(stats.population).toBe(buildings.zones.residential.levels[1].pop);
    expect(stats.taxPerMonth).toBe(buildings.zones.residential.levels[1].tax);
  });

  it('applies tax to money', () => {
    expect(applyTax(100, 25)).toBe(125);
    expect(canAfford(50, 40)).toBe(true);
    expect(canAfford(30, 40)).toBe(false);
  });
});
