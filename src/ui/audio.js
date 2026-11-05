const STORAGE_KEY = 'taigi-town.audio.v1';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { muted: false, volume: 0.4 };
    const p = JSON.parse(raw);
    return { muted: Boolean(p.muted), volume: Math.min(1, Math.max(0, Number(p.volume) ?? 0.4)) };
  } catch {
    return { muted: false, volume: 0.4 };
  }
}

function savePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

let prefs = loadPrefs();
let ctx = null;
let master = null;
let unlocked = false;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = prefs.muted ? 0 : prefs.volume;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  unlocked = true;
}

export function isMuted() { return prefs.muted; }
export function setMuted(muted) {
  prefs = { ...prefs, muted: Boolean(muted) };
  savePrefs(prefs);
  if (master) master.gain.setTargetAtTime(prefs.muted ? 0 : prefs.volume, ctx?.currentTime || 0, 0.02);
}

function tone(freq, dur, type = 'sine', peak = 0.18) {
  if (!unlocked || !ensureCtx() || prefs.muted) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export function sfxBuild() { tone(420, 0.08, 'triangle', 0.15); setTimeout(() => tone(560, 0.1, 'triangle', 0.12), 40); }
export function sfxZone() { tone(330, 0.09, 'sine', 0.12); }
export function sfxRoad() { tone(180, 0.06, 'square', 0.06); }
export function sfxCoin() { tone(880, 0.07, 'sine', 0.1); setTimeout(() => tone(1170, 0.1, 'sine', 0.1), 50); }
export function sfxLevel() { tone(520, 0.08); setTimeout(() => tone(660, 0.08), 60); setTimeout(() => tone(780, 0.12), 120); }
export function sfxError() { tone(140, 0.12, 'sawtooth', 0.08); }
export function sfxClick() { tone(600, 0.04, 'sine', 0.08); }
