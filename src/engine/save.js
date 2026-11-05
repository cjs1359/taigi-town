/** localStorage slots + export/import save codes */

import { serializeCells, deserializeCells } from './map.js';

const PREFIX = 'taigi-town.save.v1.';
const META = 'taigi-town.meta.v1';

export function listSlots() {
  const slots = [];
  for (let i = 1; i <= 3; i++) {
    const raw = localStorage.getItem(PREFIX + i);
    if (!raw) {
      slots.push({ slot: i, empty: true });
      continue;
    }
    try {
      const data = JSON.parse(raw);
      slots.push({
        slot: i,
        empty: false,
        name: data.name || `庄頭 ${i}`,
        month: data.month ?? 0,
        money: data.money ?? 0,
        population: data.population ?? 0,
        savedAt: data.savedAt,
      });
    } catch {
      slots.push({ slot: i, empty: true });
    }
  }
  return slots;
}

export function saveToSlot(slot, state) {
  const payload = {
    version: 1,
    name: state.name,
    month: state.month,
    money: state.money,
    population: state.population,
    speed: state.speed,
    paused: state.paused,
    teacherMode: state.teacherMode,
    difficulty: state.difficulty,
    completedTasks: state.completedTasks,
    claimedBonuses: state.claimedBonuses,
    learnedWords: state.learnedWords,
    cells: serializeCells(state.cells),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(PREFIX + slot, JSON.stringify(payload));
  localStorage.setItem(META, JSON.stringify({ lastSlot: slot }));
  return payload;
}

export function loadFromSlot(slot) {
  const raw = localStorage.getItem(PREFIX + slot);
  if (!raw) return null;
  const data = JSON.parse(raw);
  return {
    ...data,
    cells: deserializeCells(data.cells),
  };
}

export function clearSlot(slot) {
  localStorage.removeItem(PREFIX + slot);
}

/** Compact export: base64(JSON) */
export function exportCode(state) {
  const data = {
    version: 1,
    name: state.name,
    month: state.month,
    money: state.money,
    population: state.population,
    teacherMode: state.teacherMode,
    difficulty: state.difficulty,
    completedTasks: state.completedTasks,
    claimedBonuses: state.claimedBonuses,
    learnedWords: state.learnedWords,
    cells: serializeCells(state.cells),
  };
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return 'TTG1.' + btoa(bin);
}

export function importCode(code) {
  const trimmed = code.trim();
  if (!trimmed.startsWith('TTG1.')) throw new Error('存檔代碼格式不對');
  const bin = atob(trimmed.slice(5));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  const data = JSON.parse(json);
  if (data.version !== 1) throw new Error('存檔版本不符');
  return {
    ...data,
    cells: deserializeCells(data.cells),
    speed: 1,
    paused: true,
  };
}

// Don't pollute slot 0 — override saveToSlot call above by fixing exportCode
