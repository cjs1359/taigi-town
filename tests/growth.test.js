import { describe, it, expect } from 'vitest';
import { createMap } from '../src/engine/map.js';
import { tickGrowth, LEVEL_THRESHOLDS } from '../src/engine/growth.js';
import buildings from '../data/buildings.json';

describe('growth', () => {
  it('does not grow without adjacent road', () => {
    const cells = createMap();
    // place zone far from road
    cells[2][2].kind = 'zone';
    cells[2][2].zone = 'residential';
    cells[2][2].level = 0;
    for (let i = 0; i < 30; i++) tickGrowth(cells, buildings);
    expect(cells[2][2].level).toBe(0);
  });

  it('grows to level 1 when next to road', () => {
    const cells = createMap();
    // road at y=11, x=4..11; put zone at (10,10) adjacent to (10,11) road? (10,11) may be empty
    cells[11][10].kind = 'road';
    cells[10][10].kind = 'zone';
    cells[10][10].zone = 'residential';
    cells[10][10].level = 0;
    cells[10][10].growth = 0;
    let hit = false;
    for (let i = 0; i < 20; i++) {
      tickGrowth(cells, buildings);
      if (cells[10][10].level >= 1) { hit = true; break; }
    }
    expect(hit).toBe(true);
    expect(LEVEL_THRESHOLDS[1]).toBeGreaterThan(0);
  });

  it('reaches level 3 with enough ticks near facilities', () => {
    const cells = createMap();
    cells[11][9].kind = 'road';
    cells[10][9].kind = 'zone';
    cells[10][9].zone = 'residential';
    cells[10][9].level = 0;
    // market nearby
    cells[10][8].kind = 'facility';
    cells[10][8].facility = 'market';
    cells[9][9].kind = 'facility';
    cells[9][9].facility = 'school';
    for (let i = 0; i < 80; i++) tickGrowth(cells, buildings);
    expect(cells[10][9].level).toBe(3);
  });
});
