import { describe, it, expect } from 'vitest';
import { createMap } from '../src/engine/map.js';
import { checkTask, evaluateCheck } from '../src/engine/tasks.js';
import tasks from '../data/tasks.json';

describe('tasks', () => {
  it('detects hasFacility', () => {
    const cells = createMap();
    expect(hasStarterStation(cells)).toBe(true);
    const marketTask = tasks.find((t) => t.id === 't02');
    expect(checkTask(cells, marketTask)).toBe(false);
    cells[10][10].kind = 'facility';
    cells[10][10].facility = 'market';
    expect(checkTask(cells, marketTask)).toBe(true);
  });

  it('detects nearFacility for inn by station', () => {
    const cells = createMap();
    const task = tasks.find((t) => t.id === 't01');
    expect(checkTask(cells, task)).toBe(false);
    cells[11][9].kind = 'facility';
    cells[11][9].facility = 'inn';
    expect(checkTask(cells, task)).toBe(true);
  });

  it('detects zoneCount', () => {
    const cells = createMap();
    for (let i = 0; i < 10; i++) {
      cells[5][i].kind = 'zone';
      cells[5][i].zone = 'residential';
    }
    expect(evaluateCheck(cells, { type: 'zoneCount', zone: 'residential', min: 10 })).toBe(true);
  });
});

function hasStarterStation(cells) {
  return evaluateCheck(cells, { type: 'hasFacility', facility: 'station' });
}
