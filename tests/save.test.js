import { describe, it, expect, beforeEach } from 'vitest';
import { createMap } from '../src/engine/map.js';
import { exportCode, importCode, saveToSlot, loadFromSlot, listSlots } from '../src/engine/save.js';

const mem = new Map();
beforeEach(() => {
  mem.clear();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
});

function sampleState() {
  const cells = createMap();
  cells[10][10].kind = 'zone';
  cells[10][10].zone = 'commercial';
  cells[10][10].level = 2;
  return {
    name: '測試庄',
    month: 5,
    money: 999,
    population: 12,
    teacherMode: false,
    difficulty: 'tailo',
    completedTasks: ['t02'],
    claimedBonuses: ['market'],
    learnedWords: ['loo'],
    cells,
  };
}

describe('save', () => {
  it('round-trips export/import', () => {
    const code = exportCode(sampleState());
    expect(code.startsWith('TTG1.')).toBe(true);
    const loaded = importCode(code);
    expect(loaded.name).toBe('測試庄');
    expect(loaded.month).toBe(5);
    expect(loaded.money).toBe(999);
    expect(loaded.cells[10][10].zone).toBe('commercial');
    expect(loaded.cells[10][10].level).toBe(2);
    expect(loaded.completedTasks).toContain('t02');
  });

  it('saves and loads slots', () => {
    saveToSlot(2, sampleState());
    const slots = listSlots();
    expect(slots[1].empty).toBe(false);
    expect(slots[1].name).toBe('測試庄');
    const loaded = loadFromSlot(2);
    expect(loaded.money).toBe(999);
  });
});
