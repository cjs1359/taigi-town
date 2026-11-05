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
