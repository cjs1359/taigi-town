import './style.css';
import {
  createNewGame, hydrateGame, placeAt, monthTick, tryCompleteTask,
  refreshStats, buildingsData, tasksData, activitiesData, wordsData,
  wordById, facilityInfo, activitiesForFacility, listActivities, costOf, learnWord,
  seedDemoTown,
} from './engine/game.js';
import { listSlots, saveToSlot, loadFromSlot, exportCode, importCode } from './engine/save.js';
import { DIFFICULTIES } from './engine/tasks.js';
import { createRenderer } from './ui/render.js';
import { cardIllustration } from './ui/sprites.js';
import {
  unlockAudio, isMuted, setMuted,
  sfxBuild, sfxZone, sfxRoad, sfxCoin, sfxLevel, sfxError, sfxClick,
} from './ui/audio.js';

const app = document.getElementById('app');
const SUTIAN_SEARCH = 'https://sutian.moe.edu.tw/zh-hant/tshiau/?lui=tai_su&tsha=';

let state = null;
let renderer = null;
let tickTimer = null;
let currentSlot = 1;
let panelMode = null; // card | tasks | activities | passport | save | facilities | help
let drag = null;
let painting = false;

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function showHome() {
  stopTicks();
  state = null;
  const slots = typeof localStorage !== 'undefined' ? listSlots() : [];
  app.innerHTML = '';
  const root = el(`
    <div class="home">
      <div class="home-card">
        <div class="brand-row">
          <div class="brand-mark" aria-hidden="true">庄</div>
          <div>
            <div style="font-size:11px;letter-spacing:2px;color:var(--muted)">讀冊人 · 台語小庄頭</div>
            <h1>台語小庄頭</h1>
          </div>
        </div>
        <p class="tagline">鋪路、劃厝佮店頭、起設施，做伙學台語。蓋好的建築會連結生活島活動，閣有加分。</p>
        <div class="device-note">建議使用平板或電腦開啟。手機也能玩，不過畫面較細。</div>
        <div class="howto">
          <b>怎麼玩（約 20–30 分）</b><br>
          1. 用「路」從車頭往外鋪<br>
          2. 靠路边劃「厝／店頭／工場」，看著房子長大<br>
          3. 起市場、學堂、旅社等設施，完成台語任務卡賺箍<br>
          4. 「小島活動」一開始就能去；蓋好對應建築會加分並在建築上開捷徑
        </div>
        <label class="field">庄頭名
          <input id="town-name" maxlength="20" value="我的庄頭" />
        </label>
        <label class="check"><input type="checkbox" id="teacher-mode" /> 教師模式（顯示研習中心）</label>
        <div class="home-actions">
          <button class="primary" id="btn-new">開始新庄頭</button>
          <button class="secondary" id="btn-slots">讀取存檔</button>
          <button class="ghost" id="btn-import">匯入存檔代碼</button>
        </div>
        <div id="home-extra"></div>
      </div>
    </div>
  `);
  app.appendChild(root);

  root.querySelector('#btn-new').onclick = () => {
    unlockAudio(); sfxClick();
    const name = root.querySelector('#town-name').value.trim() || '我的庄頭';
    const teacherMode = root.querySelector('#teacher-mode').checked;
    state = createNewGame({ name, teacherMode });
    currentSlot = 1;
    startPlay();
  };

  root.querySelector('#btn-slots').onclick = () => {
    unlockAudio(); sfxClick();
    const box = root.querySelector('#home-extra');
    box.innerHTML = '<div class="slot-list"></div>';
    const list = box.querySelector('.slot-list');
    listSlots().forEach((s) => {
      const b = el(`<button class="slot" type="button">
        <div><b>欄位 ${s.slot}${s.empty ? '' : ' · ' + (s.name || '')}</b>
        <small>${s.empty ? '空的' : `第 ${s.month} 月 · ${s.money} 箍 · 人口 ${s.population}`}</small></div>
        <span>${s.empty ? '—' : '讀取'}</span>
      </button>`);
      b.disabled = s.empty;
      b.onclick = () => {
        const data = loadFromSlot(s.slot);
        if (!data) return;
        state = hydrateGame(data);
        currentSlot = s.slot;
        startPlay();
      };
      list.appendChild(b);
    });
  };

  root.querySelector('#btn-import').onclick = () => {
    unlockAudio(); sfxClick();
    const box = root.querySelector('#home-extra');
    box.innerHTML = `
      <label class="field">貼上存檔代碼
        <textarea id="import-code" placeholder="TTG1...."></textarea>
      </label>
      <button class="primary" id="do-import">匯入並開始</button>
    `;
    box.querySelector('#do-import').onclick = () => {
      try {
        const data = importCode(box.querySelector('#import-code').value);
        state = hydrateGame(data);
        startPlay();
      } catch (e) {
        alert(e.message || '匯入失敗');
      }
    };
  };
}

function startPlay() {
  stopTicks();
  refreshStats(state);
  app.innerHTML = '';
  const root = el(`
    <div class="play">
      <header class="topbar">
        <div class="left">
          <button class="icon-btn" id="btn-home" title="回首頁">⌂</button>
          <span class="title">${escapeHtml(state.name)}</span>
          ${state.teacherMode ? '<span class="badge">教師模式</span>' : ''}
        </div>
        <div class="stats">
          <span class="stat-chip"><span class="label">月</span> <b id="stat-month">${state.month}</b></span>
          <span class="stat-chip"><span class="label">箍</span> <b id="stat-money">${state.money}</b></span>
          <span class="stat-chip"><span class="label">人</span> <b id="stat-pop">${state.population}</b></span>
          <span class="stat-chip"><span class="label">稅</span> <b id="stat-tax">0</b>/月</span>
        </div>
        <div class="right">
          <button class="icon-btn" id="btn-pause" aria-pressed="${state.paused}">${state.paused ? '▶' : '❚❚'}</button>
          <button class="icon-btn" id="btn-speed" title="速度">×${state.speed}</button>
          <button class="icon-btn" id="btn-mute" aria-pressed="${isMuted()}">${isMuted() ? '🔇' : '🔊'}</button>
          <button class="icon-btn" id="btn-tasks">任務</button>
          <button class="icon-btn" id="btn-islands">小島活動</button>
          <button class="icon-btn" id="btn-passport">護照</button>
          <button class="icon-btn" id="btn-save">存檔</button>
        </div>
      </header>
      <div class="stage">
        <div class="msg-bar" id="msg-bar">${escapeHtml(state.message)}</div>
        <canvas id="map" aria-label="庄頭地圖"></canvas>
        <div class="side-panel" id="side-panel" hidden></div>
        <div class="toast" id="toast"></div>
      </div>
      <nav class="toolbar" aria-label="建造工具">
        <button class="tool" data-tool="select" aria-pressed="true"><span class="emoji">👆</span>選取</button>
        <button class="tool" data-tool="road"><span class="emoji">🛤️</span>路<small>${buildingsData.road.cost}</small></button>
        <button class="tool" data-tool="residential"><span class="emoji">🏠</span>厝<small>${buildingsData.zones.residential.cost}</small></button>
        <button class="tool" data-tool="commercial"><span class="emoji">🏪</span>店頭<small>${buildingsData.zones.commercial.cost}</small></button>
        <button class="tool" data-tool="industrial"><span class="emoji">🏭</span>工場<small>${buildingsData.zones.industrial.cost}</small></button>
        <button class="tool" data-tool="facilities"><span class="emoji">🏛️</span>設施</button>
        <button class="tool" data-tool="bulldoze"><span class="emoji">🪓</span>拆除<small>5</small></button>
      </nav>
    </div>
  `);
  app.appendChild(root);

  const canvas = root.querySelector('#map');
  renderer = createRenderer(canvas);
  renderer.resize();
  const rect = canvas.getBoundingClientRect();
  renderer.centerOn(11, 11, rect.width, rect.height);
  renderer.draw(state);
  updateStats();

  window.addEventListener('resize', onResize);

  root.querySelector('#btn-home').onclick = () => {
    if (confirm('要回首頁嗎？記得先存檔。')) showHome();
  };
  root.querySelector('#btn-pause').onclick = () => {
    unlockAudio(); sfxClick();
    state.paused = !state.paused;
    root.querySelector('#btn-pause').textContent = state.paused ? '▶' : '❚❚';
    root.querySelector('#btn-pause').setAttribute('aria-pressed', String(state.paused));
    scheduleTicks();
  };
  root.querySelector('#btn-speed').onclick = () => {
    unlockAudio(); sfxClick();
    state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
    root.querySelector('#btn-speed').textContent = `×${state.speed}`;
    scheduleTicks();
  };
  root.querySelector('#btn-mute').onclick = () => {
    unlockAudio();
    setMuted(!isMuted());
    root.querySelector('#btn-mute').textContent = isMuted() ? '🔇' : '🔊';
    root.querySelector('#btn-mute').setAttribute('aria-pressed', String(isMuted()));
  };
  root.querySelector('#btn-tasks').onclick = () => { unlockAudio(); sfxClick(); openPanel('tasks'); };
  root.querySelector('#btn-islands').onclick = () => { unlockAudio(); sfxClick(); openPanel('activities'); };
  root.querySelector('#btn-passport').onclick = () => { unlockAudio(); sfxClick(); openPanel('passport'); };
  root.querySelector('#btn-save').onclick = () => { unlockAudio(); sfxClick(); openPanel('save'); };

  root.querySelectorAll('.tool').forEach((btn) => {
    btn.onclick = () => {
      unlockAudio(); sfxClick();
      const tool = btn.dataset.tool;
      if (tool === 'facilities') {
        openPanel('facilities');
        return;
      }
      state.tool = tool;
      root.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    };
  });

  bindMap(canvas);
  scheduleTicks();
  requestAnimationFrame(loop);
  window.__taigiTown = {
    getState: () => state,
    seedDemo: () => { seedDemoTown(state); updateStats(); setMsg(state.message); renderer?.draw(state); },
    placeAt: (x,y,tool) => { if (tool) state.tool = tool; const r = placeAt(state,x,y); updateStats(); return r; },
    openCard: (x,y) => { state.selected = { x, y }; openCard(x, y); },
    zoomTo: (scale, x=11, y=11) => {
      if (!renderer) return;
      renderer.cam.scale = scale;
      const rect = renderer.cam && document.querySelector('#map')?.getBoundingClientRect();
      if (rect) renderer.centerOn(x, y, rect.width, rect.height);
      renderer.draw(state);
    },
    getRenderer: () => renderer,
  };
}

function onResize() {
  if (!renderer) return;
  renderer.resize();
  renderer.draw(state);
}

function loop() {
  if (!state || !renderer) return;
  renderer.draw(state);
  requestAnimationFrame(loop);
  // keep API fresh each frame
  window.__taigiTown = {
    getState: () => state,
    seedDemo: () => { seedDemoTown(state); updateStats(); setMsg(state.message); },
    placeAt: (x,y,tool) => { if (tool) state.tool = tool; const r = placeAt(state,x,y); updateStats(); return r; },
    openCard: (x,y) => { state.selected = { x, y }; openCard(x, y); },
    zoomTo: (scale, x=11, y=11) => {
      if (!renderer) return;
      renderer.cam.scale = scale;
      const rect = document.querySelector('#map')?.getBoundingClientRect();
      if (rect) renderer.centerOn(x, y, rect.width, rect.height);
    },
    getRenderer: () => renderer,
  };
}

function bindMap(canvas) {
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    unlockAudio();
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    drag = { x: p.x, y: p.y, moved: false, button: e.button };
    if (e.button === 0 && state.tool !== 'select') {
      painting = true;
      applyPaint(p.x, p.y);
    } else if (e.button === 0 && state.tool === 'select') {
      const cell = renderer.pick(p.x, p.y);
      if (cell) {
        placeAt(state, cell.x, cell.y, { tool: 'select' });
        openCard(cell.x, cell.y);
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pos(e);
    renderer.cam.hover = renderer.pick(p.x, p.y);
    if (!drag) return;
    const dx = p.x - drag.x;
    const dy = p.y - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (painting && state.tool !== 'select') {
      applyPaint(p.x, p.y);
      drag.x = p.x; drag.y = p.y;
    } else if (drag.button === 0 || drag.button === 2 || e.buttons === 4) {
      renderer.pan(dx, dy);
      drag.x = p.x; drag.y = p.y;
    }
  });

  canvas.addEventListener('pointerup', () => { drag = null; painting = false; });
  canvas.addEventListener('pointercancel', () => { drag = null; painting = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = pos(e);
    renderer.zoomAt(e.deltaY > 0 ? 0.9 : 1.1, p.x, p.y);
  }, { passive: false });

  // keyboard pan
  window.addEventListener('keydown', onKey);
}

function onKey(e) {
  if (!state || !renderer) return;
  const step = 28;
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (e.key === 'w' || e.key === 'ArrowUp') renderer.pan(0, step);
  if (e.key === 's' || e.key === 'ArrowDown') renderer.pan(0, -step);
  if (e.key === 'a' || e.key === 'ArrowLeft') renderer.pan(step, 0);
  if (e.key === 'd' || e.key === 'ArrowRight') renderer.pan(-step, 0);
  if (e.key === ' ') { e.preventDefault(); document.getElementById('btn-pause')?.click(); }
  if (e.key === 'Escape') { state.tool = 'select'; closePanel(); }
}

function applyPaint(sx, sy) {
  const cell = renderer.pick(sx, sy);
  if (!cell) return;
  const result = placeAt(state, cell.x, cell.y);
  if (!result.ok) {
    if (result.reason && result.reason !== '已經是路') {
      // avoid spamming while drag-painting roads
      if (state.tool !== 'road' || result.reason !== '已經是路') {
        setMsg(result.reason);
        if (result.reason === '箍無夠' || result.reason.includes('袂')) sfxError();
      }
    }
    return;
  }
  if (result.built === 'road') sfxRoad();
  else if (result.built === 'residential' || result.built === 'commercial' || result.built === 'industrial') sfxZone();
  else if (result.built) { sfxBuild(); if (result.bonus) sfxCoin(); }
  updateStats();
  setMsg(state.message);
  autoCheckTasksQuiet();
}

function openCard(x, y) {
  const cell = state.cells[y][x];
  const panel = document.getElementById('side-panel');
  panel.hidden = false;
  panelMode = 'card';

  let title = '空地';
  let tailo = '';
  let mandarin = '';
  let word = null;
  let extra = '';

  if (cell.terrain === 'water') { title = '溪水'; mandarin = '河流'; }
  else if (cell.terrain === 'hill') { title = '山埔'; mandarin = '山丘'; }
  else if (cell.kind === 'road') {
    word = wordById('loo');
    title = word.hanji; tailo = word.tailo; mandarin = word.mandarin;
  } else if (cell.kind === 'zone') {
    const z = buildingsData.zones[cell.zone];
    word = wordById(z.wordId);
    title = z.hanji;
    tailo = z.tailo;
    mandarin = z.mandarin;
    const lv = cell.level;
    extra = `<p>等級：${lv === 0 ? '空地（等待成長）' : lv}／3</p>`;
    if (lv > 0) {
      const info = z.levels[lv - 1];
      extra += `<p>型態：${info.name} · 人口 ${info.pop} · 稅 ${info.tax}/月</p>`;
    }
  } else if (cell.kind === 'facility') {
    const fac = facilityInfo(cell.facility);
    word = wordById(fac.wordId);
    title = fac.hanji;
    tailo = fac.tailo;
    mandarin = fac.mandarin;
    const acts = activitiesForFacility(cell.facility, state.teacherMode);
    if (acts.length) {
      extra += `<div class="link-row"><b style="font-size:12px;color:var(--muted)">建築捷徑（小島活動）</b>`;
      for (const a of acts) {
        const claimed = state.claimedBonuses.includes(a.id);
        extra += `<a href="${a.url}" target="_blank" rel="noopener">${a.name}${claimed ? ' · 已加分' : ''}<span>↗</span></a>`;
      }
      extra += `</div>`;
    }
    if (word) learnWord(state, word.id);
  }

  const sutian = word
    ? `${SUTIAN_SEARCH}${encodeURIComponent(word.hanji)}`
    : 'https://sutian.moe.edu.tw/zh-hant/';

  let illus = '';
  try {
    if (cell.kind === 'zone') illus = cardIllustration('zone', cell.zone, null, cell.level || 1);
    else if (cell.kind === 'facility') illus = cardIllustration('facility', null, cell.facility, 1);
    else if (cell.kind === 'road') illus = cardIllustration('road');
  } catch (_) { illus = ''; }

  panel.innerHTML = `
    <div class="panel-bar"><span>建築詞卡</span>
      <button class="icon-btn" id="panel-close" aria-label="關閉">×</button>
    </div>
    <div class="panel-body">
      <div class="card-hero">
        ${illus ? `<img src="${illus}" alt="" width="84" height="84">` : ''}
        <div class="meta">
          <h2>${escapeHtml(title)}</h2>
          ${tailo ? `<p class="tailo">${escapeHtml(tailo)}</p>` : ''}
          ${mandarin ? `<p class="mandarin">${escapeHtml(mandarin)}</p>` : ''}
        </div>
      </div>
      ${extra}
      <div class="link-row">
        <a href="${sutian}" target="_blank" rel="noopener">查辭典聽發音<span>↗</span></a>
      </div>
      <p style="font-size:12px;color:#5a6b62">格子 (${x}, ${y})</p>
    </div>
  `;
  panel.querySelector('#panel-close').onclick = closePanel;
}

function openPanel(mode) {
  panelMode = mode;
  const panel = document.getElementById('side-panel');
  panel.hidden = false;
  if (mode === 'tasks') renderTasksPanel(panel);
  else if (mode === 'activities') renderActivitiesPanel(panel);
  else if (mode === 'passport') renderPassportPanel(panel);
  else if (mode === 'save') renderSavePanel(panel);
  else if (mode === 'facilities') renderFacilitiesPanel(panel);
}

function closePanel() {
  const panel = document.getElementById('side-panel');
  if (panel) panel.hidden = true;
  panelMode = null;
}

function renderTasksPanel(panel) {
  const diffs = DIFFICULTIES.map((d) =>
    `<button type="button" data-diff="${d.id}" class="${state.difficulty === d.id ? 'active' : ''}">${d.label}</button>`
  ).join('');
  const diff = DIFFICULTIES.find((d) => d.id === state.difficulty) || DIFFICULTIES[0];
  let cards = '';
  for (const t of tasksData) {
    const done = state.completedTasks.includes(t.id);
    const prompt = [];
    if (diff.showHanji) prompt.push(`<div class="prompt">${escapeHtml(t.hanji)}</div>`);
    if (diff.showTailo) prompt.push(`<div class="prompt roman">${escapeHtml(t.tailo)}</div>`);
    cards += `<div class="task-card ${done ? 'done' : ''}">
      <div class="task-meta"><span>${t.id.toUpperCase()}</span><span>+${t.reward} 箍${done ? ' · 完成' : ''}</span></div>
      ${prompt.join('')}
      <p style="font-size:11px;color:var(--muted);margin:4px 0 0">${escapeHtml(t.mandarin)}</p>
      ${done ? '' : `<button class="secondary" style="margin-top:8px" data-check="${t.id}">檢查完成</button>`}
    </div>`;
  }
  panel.innerHTML = `
    <div class="panel-bar"><span>台語任務卡</span>
      <button class="icon-btn" id="panel-close">×</button></div>
    <div class="panel-body">
      <p>完成條件後按「檢查完成」，或等每個月自動結算。</p>
      <div class="diff-switch">${diffs}</div>
      ${cards}
    </div>`;
  panel.querySelector('#panel-close').onclick = closePanel;
  panel.querySelectorAll('[data-diff]').forEach((b) => {
    b.onclick = () => { state.difficulty = b.dataset.diff; renderTasksPanel(panel); };
  });
  panel.querySelectorAll('[data-check]').forEach((b) => {
    b.onclick = () => {
      const r = tryCompleteTask(state, b.dataset.check);
      if (r.ok) { sfxCoin(); toast(`任務完成！＋${r.reward} 箍`); updateStats(); }
      else { sfxError(); toast(r.reason); }
      renderTasksPanel(panel);
    };
  });
}

function renderActivitiesPanel(panel) {
  const acts = listActivities(state.teacherMode);
  const groups = {};
  for (const a of acts) {
    (groups[a.group] ||= []).push(a);
  }
  let html = '';
  for (const [g, list] of Object.entries(groups)) {
    html += `<h3 style="font-size:13px;margin:14px 0 8px">${escapeHtml(g)}</h3><div class="link-row">`;
    for (const a of list) {
      const built = a.buildingId && state.cells.some((row) => row.some((c) => c.facility === a.buildingId));
      const claimed = state.claimedBonuses.includes(a.id);
      const badge = built
        ? (claimed ? '<span class="badge">已蓋·已加分</span>' : '<span class="badge bonus">已蓋·可加分</span>')
        : '<span class="badge">開放中</span>';
      html += `<a href="${a.url}" target="_blank" rel="noopener"><span>${escapeHtml(a.name)} ${badge}</span><span>↗</span></a>`;
    }
    html += `</div>`;
  }
  panel.innerHTML = `
    <div class="panel-bar"><span>小島活動</span>
      <button class="icon-btn" id="panel-close">×</button></div>
    <div class="panel-body">
      <p>活動一開始就全部開放。蓋好對應建築會得到加分，並在建築詞卡出現捷徑。</p>
      ${html}
    </div>`;
  panel.querySelector('#panel-close').onclick = closePanel;
}

function renderPassportPanel(panel) {
  const learned = state.learnedWords
    .map((id) => wordById(id))
    .filter(Boolean);
  const pills = learned.map((w) => `
    <div class="word-pill">
      <b>${escapeHtml(w.hanji)}</b>
      <small>${escapeHtml(w.tailo)}</small>
      <div style="margin-top:4px"><a href="${SUTIAN_SEARCH}${encodeURIComponent(w.hanji)}" target="_blank" rel="noopener">聽發音</a></div>
    </div>`).join('');
  panel.innerHTML = `
    <div class="panel-bar"><span>學習護照</span>
      <button class="icon-btn" id="panel-close">×</button></div>
    <div class="panel-body">
      <p>遇過的詞 ${learned.length} · 完成任務 ${state.completedTasks.length}/${tasksData.length}</p>
      <div class="passport-grid">${pills || '<p>猶未收著詞，去點建築看詞卡。</p>'}</div>
    </div>`;
  panel.querySelector('#panel-close').onclick = closePanel;
}

function renderSavePanel(panel) {
  const slots = listSlots();
  panel.innerHTML = `
    <div class="panel-bar"><span>存檔</span>
      <button class="icon-btn" id="panel-close">×</button></div>
    <div class="panel-body">
      <p>存檔在這台瀏覽器。清掉瀏覽資料會消失，建議匯出代碼備份。</p>
      <div class="slot-list" id="save-slots"></div>
      <button class="secondary" id="btn-export" style="width:100%;margin-top:10px">匯出存檔代碼</button>
      <label class="field">匯入代碼
        <textarea id="save-import"></textarea>
      </label>
      <button class="primary" id="btn-do-import" style="width:100%">匯入到目前庄頭</button>
    </div>`;
  const list = panel.querySelector('#save-slots');
  slots.forEach((s) => {
    const row = el(`<div class="slot">
      <div><b>欄位 ${s.slot}</b><small>${s.empty ? '空的' : `${s.name} · 第${s.month}月`}</small></div>
      <div style="display:flex;gap:6px">
        <button class="icon-btn" data-save="${s.slot}">存</button>
        <button class="icon-btn" data-load="${s.slot}" ${s.empty ? 'disabled' : ''}>讀</button>
      </div>
    </div>`);
    list.appendChild(row);
  });
  panel.querySelector('#panel-close').onclick = closePanel;
  panel.querySelectorAll('[data-save]').forEach((b) => {
    b.onclick = () => {
      refreshStats(state);
      saveToSlot(Number(b.dataset.save), state);
      currentSlot = Number(b.dataset.save);
      toast(`已存到欄位 ${currentSlot}`);
      sfxClick();
      renderSavePanel(panel);
    };
  });
  panel.querySelectorAll('[data-load]').forEach((b) => {
    b.onclick = () => {
      const data = loadFromSlot(Number(b.dataset.load));
      if (!data) return;
      state = hydrateGame(data);
      currentSlot = Number(b.dataset.load);
      startPlay();
    };
  });
  panel.querySelector('#btn-export').onclick = async () => {
    const code = exportCode(state);
    try {
      await navigator.clipboard.writeText(code);
      toast('存檔代碼已複製');
    } catch {
      prompt('請複製存檔代碼', code);
    }
  };
  panel.querySelector('#btn-do-import').onclick = () => {
    try {
      const data = importCode(panel.querySelector('#save-import').value);
      state = hydrateGame(data);
      startPlay();
    } catch (e) {
      alert(e.message || '匯入失敗');
    }
  };
}

function renderFacilitiesPanel(panel) {
  const facs = Object.values(buildingsData.facilities).filter((f) => {
    if (f.starter) return false;
    if (f.teacherOnly && !state.teacherMode) return false;
    return true;
  });
  const btns = facs.map((f) => `
    <button type="button" data-fac="${f.id}">
      <b>${escapeHtml(f.hanji)}</b>
      <small>${escapeHtml(f.tailo)} · ${f.cost} 箍</small>
    </button>`).join('');
  panel.innerHTML = `
    <div class="panel-bar"><span>選設施</span>
      <button class="icon-btn" id="panel-close">×</button></div>
    <div class="panel-body">
      <p>選好以後，在地圖靠路边的空地點一下。每種設施只能蓋一間。</p>
      <div class="fac-menu">${btns}</div>
    </div>`;
  panel.querySelector('#panel-close').onclick = closePanel;
  panel.querySelectorAll('[data-fac]').forEach((b) => {
    b.onclick = () => {
      state.tool = `fac:${b.dataset.fac}`;
      document.querySelectorAll('.tool').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.tool === 'facilities')));
      toast(`點地圖來起「${buildingsData.facilities[b.dataset.fac].hanji}」`);
      sfxClick();
      closePanel();
    };
  });
}

function autoCheckTasksQuiet() {
  for (const task of tasksData) {
    if (state.completedTasks.includes(task.id)) continue;
    const r = tryCompleteTask(state, task.id);
    if (r.ok) {
      sfxCoin();
      toast(`任務完成：${task.hanji} ＋${r.reward}`);
      updateStats();
    }
  }
}

function scheduleTicks() {
  stopTicks();
  if (!state || state.paused) return;
  const ms = state.speed === 3 ? 1200 : state.speed === 2 ? 2200 : 4000;
  tickTimer = setInterval(() => {
    if (!state || state.paused) return;
    const { leveled, newly, tax } = monthTick(state);
    updateStats();
    if (leveled.length) { sfxLevel(); toast(`${leveled.length} 棟升級了`); }
    if (newly.length) { sfxCoin(); toast(`自動完成 ${newly.length} 張任務`); }
    if (tax > 0) setMsg(`第 ${state.month} 月 · 收稅 ＋${tax} 箍`);
  }, ms);
}

function stopTicks() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}

function updateStats() {
  const stats = refreshStats(state);
  const m = document.getElementById('stat-month');
  const money = document.getElementById('stat-money');
  const pop = document.getElementById('stat-pop');
  const tax = document.getElementById('stat-tax');
  if (m) m.textContent = state.month;
  if (money) money.textContent = state.money;
  if (pop) pop.textContent = state.population;
  if (tax) tax.textContent = stats.taxPerMonth;
}

function setMsg(text) {
  state.message = text;
  const bar = document.getElementById('msg-bar');
  if (bar) bar.textContent = text;
}

function toast(text) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// boot
showHome();
