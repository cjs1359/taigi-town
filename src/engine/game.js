import { createMap, getCell, hasAdjacentRoad, inBounds, SIZE } from './map.js';
import { computeStats, applyTax } from './economy.js';
import { tickGrowth } from './growth.js';
import { checkTask } from './tasks.js';
import buildingsData from '../../data/buildings.json';
import tasksData from '../../data/tasks.json';
import activitiesData from '../../data/activities.json';
import wordsData from '../../data/words.json';

export { buildingsData, tasksData, activitiesData, wordsData };

const START_MONEY = 2200;

export function createNewGame({ name = '我的庄頭', teacherMode = false } = {}) {
  const cells = createMap();
  if (teacherMode) {
    // place study center near starter for teacher mode visibility
    const c = cells[10][10];
    if (c.kind === 'empty' || c.kind === 'road') {
      // keep road; put study center at (10,10) off the road strip slightly
    }
    cells[9][11].kind = 'facility';
    cells[9][11].facility = 'study-center';
    cells[9][11].terrain = 'grass';
  }
  return {
    name,
    month: 1,
    money: START_MONEY,
    population: 0,
    speed: 1, // 0 pause handled separately, 1 normal, 2 fast
    paused: false,
    teacherMode,
    difficulty: 'both',
    completedTasks: [],
    claimedBonuses: [], // activity ids that already gave build bonus
    learnedWords: ['tshia-thau', 'loo'],
    cells,
    tool: 'select',
    selected: null,
    message: '歡迎來到台語小庄頭！先鋪路、劃厝，再起設施。',
    lastTax: 0,
  };
}

export function hydrateGame(data) {
  return {
    name: data.name || '我的庄頭',
    month: data.month || 1,
    money: data.money ?? START_MONEY,
    population: data.population || 0,
    speed: data.speed ?? 1,
    paused: data.paused ?? true,
    teacherMode: !!data.teacherMode,
    difficulty: data.difficulty || 'both',
    completedTasks: data.completedTasks || [],
    claimedBonuses: data.claimedBonuses || [],
    learnedWords: data.learnedWords || [],
    cells: data.cells,
    tool: 'select',
    selected: null,
    message: '庄頭載入完成。',
    lastTax: 0,
  };
}

export function refreshStats(state) {
  const stats = computeStats(state.cells, buildingsData);
  state.population = stats.population;
  return stats;
}

export function costOf(tool, facilityId) {
  if (tool === 'road') return buildingsData.road.cost;
  if (tool === 'bulldoze') return 5;
  if (tool === 'residential' || tool === 'commercial' || tool === 'industrial') {
    return buildingsData.zones[tool].cost;
  }
  if (tool === 'facility' && facilityId) {
    return buildingsData.facilities[facilityId]?.cost ?? 0;
  }
  return 0;
}

function canBuildOn(cell) {
  if (!cell) return false;
  if (cell.terrain === 'water' || cell.terrain === 'hill') return false;
  return cell.kind === 'empty';
}

export function placeAt(state, x, y, opts = {}) {
  if (!inBounds(x, y)) return { ok: false, reason: '超出地圖' };
  const cell = getCell(state.cells, x, y);
  const tool = opts.tool || state.tool;

  if (tool === 'select') {
    state.selected = { x, y };
    return { ok: true, selected: true };
  }

  if (tool === 'bulldoze') {
    if (cell.kind === 'empty') return { ok: false, reason: '這裡沒有東西' };
    if (cell.facility === 'station') return { ok: false, reason: '車頭袂使拆' };
    if (cell.facility === 'study-center' && state.teacherMode) {
      return { ok: false, reason: '研習中心袂使拆' };
    }
    const cost = costOf('bulldoze');
    if (state.money < cost) return { ok: false, reason: '箍無夠' };
    state.money -= cost;
    cell.kind = 'empty';
    cell.zone = null;
    cell.level = 0;
    cell.facility = null;
    cell.growth = 0;
    state.message = `拆掉了（－${cost} 箍）`;
    refreshStats(state);
    return { ok: true, bulldozed: true };
  }

  if (tool === 'road') {
    if (cell.kind === 'road') return { ok: false, reason: '已經是路' };
    if (!canBuildOn(cell) && cell.kind !== 'empty') return { ok: false, reason: '這裡蓋袂落' };
    if (cell.terrain === 'water' || cell.terrain === 'hill') return { ok: false, reason: '水佮山蓋袂落' };
    const cost = costOf('road');
    if (state.money < cost) return { ok: false, reason: '箍無夠' };
    // allow overwrite empty only
    if (cell.kind !== 'empty') return { ok: false, reason: '請先拆掉' };
    state.money -= cost;
    cell.kind = 'road';
    cell.zone = null;
    cell.facility = null;
    cell.level = 0;
    learnWord(state, 'loo');
    state.message = `鋪了一格路（－${cost} 箍）`;
    return { ok: true, built: 'road' };
  }

  if (tool === 'residential' || tool === 'commercial' || tool === 'industrial') {
    if (!canBuildOn(cell)) return { ok: false, reason: '這裡劃袂落' };
    if (!hasAdjacentRoad(state.cells, x, y)) return { ok: false, reason: '愛倚路才劃會落' };
    const cost = costOf(tool);
    if (state.money < cost) return { ok: false, reason: '箍無夠' };
    state.money -= cost;
    cell.kind = 'zone';
    cell.zone = tool;
    cell.level = 0;
    cell.growth = 0;
    cell.facility = null;
    const wid = buildingsData.zones[tool].wordId;
    learnWord(state, wid);
    state.message = `劃了${buildingsData.zones[tool].hanji}（－${cost} 箍）`;
    return { ok: true, built: tool };
  }

  if (tool.startsWith('fac:')) {
    const fid = tool.slice(4);
    return placeFacility(state, x, y, fid);
  }

  return { ok: false, reason: '未知工具' };
}

export function placeFacility(state, x, y, facilityId) {
  const fac = buildingsData.facilities[facilityId];
  if (!fac) return { ok: false, reason: '無此設施' };
  if (fac.teacherOnly && !state.teacherMode) return { ok: false, reason: '只有教師模式看得到' };
  const cell = getCell(state.cells, x, y);
  if (!canBuildOn(cell)) return { ok: false, reason: '這裡起袂落' };
  if (!hasAdjacentRoad(state.cells, x, y)) return { ok: false, reason: '愛倚路才起會落' };
  // unique facilities (one of each)
  for (const row of state.cells) {
    for (const c of row) {
      if (c.facility === facilityId) return { ok: false, reason: '已經有這間矣' };
    }
  }
  const cost = fac.cost;
  if (state.money < cost) return { ok: false, reason: '箍無夠' };
  state.money -= cost;
  cell.kind = 'facility';
  cell.facility = facilityId;
  cell.zone = null;
  cell.level = 0;
  cell.growth = 0;
  learnWord(state, fac.wordId);
  // building bonus for linked activities
  const bonusGain = claimBuildingBonuses(state, facilityId);
  state.message = `起好${fac.hanji}（－${cost} 箍）` + (bonusGain ? `，小島加分＋${bonusGain}` : '');
  refreshStats(state);
  return { ok: true, built: facilityId, bonus: bonusGain };
}

function claimBuildingBonuses(state, facilityId) {
  let total = 0;
  for (const act of activitiesData) {
    if (act.buildingId !== facilityId) continue;
    if (act.teacherOnly) continue;
    if (state.claimedBonuses.includes(act.id)) continue;
    const bonus = act.bonus || 0;
    if (bonus > 0) {
      state.money += bonus;
      total += bonus;
      state.claimedBonuses.push(act.id);
    }
  }
  return total;
}

export function learnWord(state, wordId) {
  if (!wordId) return;
  if (!state.learnedWords.includes(wordId)) state.learnedWords.push(wordId);
}

export function monthTick(state) {
  const leveled = tickGrowth(state.cells, buildingsData);
  const stats = refreshStats(state);
  const before = state.money;
  state.money = applyTax(state.money, stats.taxPerMonth);
  state.lastTax = state.money - before;
  state.month += 1;

  // auto-complete tasks
  const newly = [];
  for (const task of tasksData) {
    if (state.completedTasks.includes(task.id)) continue;
    if (checkTask(state.cells, task)) {
      state.completedTasks.push(task.id);
      state.money += task.reward;
      newly.push(task);
      for (const w of task.words || []) learnWord(state, w);
    }
  }
  return { leveled, newly, tax: state.lastTax, stats };
}

export function tryCompleteTask(state, taskId) {
  if (state.completedTasks.includes(taskId)) return { ok: false, reason: '已經完成' };
  const task = tasksData.find((t) => t.id === taskId);
  if (!task) return { ok: false, reason: '無此任務' };
  if (!checkTask(state.cells, task)) return { ok: false, reason: '條件猶未達成' };
  state.completedTasks.push(taskId);
  state.money += task.reward;
  for (const w of task.words || []) learnWord(state, w);
  state.message = `任務完成！＋${task.reward} 箍`;
  return { ok: true, reward: task.reward, task };
}

export function wordById(id) {
  return wordsData.find((w) => w.id === id);
}

export function facilityInfo(id) {
  return buildingsData.facilities[id];
}

export function activitiesForFacility(facilityId, teacherMode) {
  return activitiesData.filter((a) => {
    if (a.buildingId !== facilityId) return false;
    if (a.teacherOnly && !teacherMode) return false;
    return true;
  });
}

export function listActivities(teacherMode) {
  return activitiesData.filter((a) => !a.teacherOnly || teacherMode);
}

export { SIZE, START_MONEY };

/** Build a pleasant demo town for screenshots / QA (mutates state). */
export function seedDemoTown(state) {
  // Tainan-style planned town: central 圓環 with radiating boulevards, 2×2 blocks, generous greens.
  const cells = state.cells;
  for (const row of cells) {
    for (const c of row) {
      if (c.facility === 'study-center') continue;
      c.kind = 'empty'; c.zone = null; c.level = 0; c.facility = null; c.growth = 0;
    }
  }
  const ok = (x, y) => inBounds(x, y) && cells[y][x].terrain !== 'water' && cells[y][x].kind !== 'facility';
  const road = (x, y) => {
    if (!ok(x, y)) return;
    const c = cells[y][x];
    if (c.terrain === 'hill') c.terrain = 'grass';
    c.kind = 'road';
  };
  for (const L of [4, 7, 13, 16]) {
    for (let i = 4; i <= 16; i++) { road(L, i); road(i, L); }
  }
  for (let i = 2; i <= 18; i++) { road(10, i); road(i, 10); }
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) road(10 + dx, 10 + dy);
  const put = (x, y, what, level = 0) => {
    if (!inBounds(x, y)) return;
    const c = cells[y][x];
    if (c.terrain === 'water' || c.kind === 'road') return;
    if (c.terrain === 'hill') c.terrain = 'grass';
    if (what.startsWith('fac:')) { c.kind = 'facility'; c.facility = what.slice(4); c.zone = null; c.level = 0; }
    else { c.kind = 'zone'; c.zone = what; c.level = level; }
  };
  cells[10][10].kind = 'empty';
  cells[10][10].kind = 'empty';
  put(10, 10, 'fac:roundabout');
  // civic core around the roundabout
  put(8, 8, 'fac:museum'); put(9, 8, 'fac:police'); put(8, 9, 'fac:park');
  put(11, 8, 'commercial', 3); put(12, 8, 'commercial', 2); put(12, 9, 'commercial', 2);
  put(8, 11, 'fac:mood-park'); put(8, 12, 'fac:temple'); put(9, 12, 'fac:breakfast');
  put(12, 11, 'commercial', 3); put(11, 12, 'fac:inn'); put(12, 12, 'fac:hospital');
  // station at the end of the south boulevard
  put(11, 17, 'fac:station'); put(9, 17, 'fac:park');
  // outer blocks
  put(14, 8, 'fac:market'); put(15, 8, 'commercial', 1); put(14, 9, 'commercial', 2); put(15, 9, 'fac:park');
  put(14, 11, 'fac:industry-street'); put(15, 11, 'commercial', 1); put(14, 12, 'commercial', 2); put(15, 12, 'residential', 2);
  put(14, 14, 'industrial', 2); put(15, 14, 'industrial', 1); put(14, 15, 'fac:park'); put(15, 15, 'industrial', 3);
  put(11, 14, 'residential', 2); put(12, 14, 'residential', 3); put(11, 15, 'fac:park'); put(12, 15, 'residential', 1);
  put(8, 14, 'residential', 3); put(9, 14, 'residential', 2); put(8, 15, 'residential', 1); put(9, 15, 'fac:park');
  put(5, 14, 'fac:school'); put(6, 14, 'fac:park'); put(5, 15, 'residential', 1); put(6, 15, 'fac:home-hall');
  put(5, 11, 'residential', 2); put(6, 11, 'residential', 1); put(5, 12, 'fac:park'); put(6, 12, 'residential', 3);
  put(5, 8, 'residential', 1); put(6, 8, 'residential', 2); put(5, 9, 'residential', 2); put(6, 9, 'fac:park');
  put(5, 5, 'fac:weather'); put(6, 5, 'residential', 1); put(5, 6, 'fac:park'); put(6, 6, 'residential', 2);
  put(8, 5, 'residential', 2); put(9, 5, 'residential', 3); put(8, 6, 'fac:park'); put(9, 6, 'residential', 1);
  put(11, 5, 'residential', 1); put(12, 5, 'fac:park'); put(11, 6, 'residential', 3); put(12, 6, 'residential', 2);
  put(14, 5, 'fac:amusement'); put(15, 5, 'fac:park'); put(14, 6, 'residential', 2); put(15, 6, 'residential', 1);
  // riverside park strip
  for (const [x, y] of [[17, 11], [17, 12], [17, 9], [18, 11]]) put(x, y, 'fac:park');
  state.money = 3500;
  state.month = 36;
  state.paused = true;
  // claim some bonuses
  for (const a of activitiesData) {
    if (a.buildingId && a.bonus && !state.claimedBonuses.includes(a.id)) state.claimedBonuses.push(a.id);
  }
  state.completedTasks = tasksData.slice(0, 12).map((t) => t.id);
  refreshStats(state);
  state.message = '示範庄頭已就緒，繼續蓋你的台語小庄頭！';
  return state;
}
