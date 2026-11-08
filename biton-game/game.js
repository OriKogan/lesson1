/* =====================================================================
   BITON: THE RECKONING: game.js (engine, fighters, scenes, HUD)
   Boss behaviour and stage art live in bosses.js.
   ===================================================================== */
'use strict';

const W = 960, H = 540, GROUND = 468;
const GRAV = 0.65, JUMP_V = -13.5, WALK = 4.2;
const PI = Math.PI, TAU = PI * 2, DOWN = PI / 2;
const OUTLINE = '#141414';
const FONT_HEAD = "'Bangers', Impact, 'Arial Black', sans-serif";
const FONT_BODY = "'Patrick Hand', 'Comic Sans MS', 'Trebuchet MS', sans-serif";
const ANNOUNCER = { pitch: 0.5, rate: 0.9 };

/* ---------------- helpers ---------------- */
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* ---------------- canvas ---------------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * DPR; canvas.height = H * DPR;
}
window.addEventListener('resize', resize);

/* ---------------- save data ---------------- */
/* Campaign layout: every chapter is one friend, with several rounds. `unlocked`
   counts rounds beaten across the whole campaign (a global round index). */
const ROUNDS = CHAPTERS.map(ch => ch.levels.length);
const TOTAL_ROUNDS = ROUNDS.reduce((a, b) => a + b, 0);
function roundIndex(ci, li) { let g = li; for (let c = 0; c < ci; c++) g += ROUNDS[c]; return g; }
function roundFromIndex(g) {
  g = clamp(Math.floor(g) || 0, 0, TOTAL_ROUNDS - 1);
  let ci = 0; while (ci < ROUNDS.length - 1 && g >= ROUNDS[ci]) { g -= ROUNDS[ci]; ci++; }
  return { ci, li: g };
}

const Save = {
  data: { campaignVersion: 4, unlocked: 0, baby: false, bigHead: false, beaten: false, losses: {} },
  load() {
    try {
      const s = JSON.parse(localStorage.getItem('bitonGame.v1'));
      if (s && typeof s === 'object') {
        const n = Number(s.unlocked) || 0;
        if (s.campaignVersion === 3) {
          // v3 counted opponents beaten (one fight each): keep those friends beaten.
          s.unlocked = roundIndex(Math.min(n, CHAPTERS.length - 1), 0) + (n >= CHAPTERS.length ? ROUNDS[CHAPTERS.length - 1] : 0);
          s.losses = {};
        } else if (s.campaignVersion === 2) {
          s.unlocked = roundIndex(Math.max(0, Math.min(n - 1, CHAPTERS.length - 1)), 0);
          s.losses = {};
        } else if (s.campaignVersion !== 4) {
          // v1 was already a 12-round campaign, but the first three rounds were a different fight.
          s.unlocked = Math.max(0, n - 3); s.losses = {};
        }
        Object.assign(this.data, s);
      }
    } catch (e) { /* no storage */ }
    this.data.campaignVersion = 4;
    this.data.unlocked = clamp(Math.floor(Number(this.data.unlocked) || 0), 0, TOTAL_ROUNDS);
    if (this.data.unlocked < TOTAL_ROUNDS) this.data.beaten = false;
  },
  write() { try { localStorage.setItem('bitonGame.v1', JSON.stringify(this.data)); return true; } catch (e) { return false; } },
};

/* ---------------- input ---------------- */
const KEYMAP = {
  KeyA: ['left'], ArrowLeft: ['left'], KeyD: ['right'], ArrowRight: ['right'],
  KeyW: ['up'], ArrowUp: ['up'], Space: ['up', 'confirm'], KeyS: ['down'], ArrowDown: ['down'],
  KeyJ: ['punch', 'confirm'], KeyZ: ['punch'], KeyK: ['kick'], KeyX: ['kick'],
  KeyL: ['special'], KeyC: ['special'], KeyT: ['taunt'], KeyV: ['taunt'],
  Enter: ['confirm'], NumpadEnter: ['confirm'], Escape: ['back', 'pause'], Backspace: ['back'], KeyP: ['pause'],
  KeyM: ['mute'], KeyH: ['help'], KeyB: ['baby'], Digit1: ['opt1'], Digit2: ['opt2'], Digit3: ['opt3'],
};
const Input = {
  down: {}, pressed: {},
  press(a) { if (!this.down[a]) this.pressed[a] = true; this.down[a] = true; },
  release(a) { this.down[a] = false; },
  clear() { this.pressed = {}; },
};
const touchBindings = [];
function clearAllInput() {
  clearCombatInput(G.player); Input.down = {}; Input.clear(); G.click = null;
  for (const binding of touchBindings) { binding.pointers.clear(); binding.btn.classList.remove('on'); }
}
function combatControlsActive() {
  return G.sceneName === 'fight' && G.phase === 'fight' && !G.paused && !controlsHelp?.open;
}
function syncTouchControls() {
  document.body.classList.toggle('combat-controls-active', combatControlsActive());
  const menu = document.getElementById('menuBtn');
  if (menu) {
    menu.hidden = G.sceneName !== 'fight' || !['intro', 'fight'].includes(G.phase);
    const label = G.paused ? 'Resume' : 'Pause';
    if (menu.textContent !== label) menu.textContent = label;
    menu.setAttribute?.('aria-label', label + ' fight');
  }
  const mute = document.getElementById('muteBtn');
  if (mute) {
    const label = Sound.muted ? 'Sound off' : 'Sound on';
    if (mute.textContent !== label) mute.textContent = label;
    mute.setAttribute?.('aria-pressed', String(Boolean(Sound.muted)));
    mute.setAttribute?.('aria-label', Sound.muted ? 'Unmute sound' : 'Mute sound');
  }
}
function pauseForInterruption() {
  clearAllInput();
  // Closing help after returning must not silently restart a fight interrupted
  // by switching apps, locking the phone, or changing browser tabs.
  helpResumesFight = false;
  if (G.sceneName === 'fight' && ['intro', 'fight'].includes(G.phase)) {
    G.paused = true; G.pauseT = 0; G.pauseReason = 'interrupted';
  }
  syncTouchControls();
}
const controlsHelp = document.getElementById('controlsHelp');
let helpResumesFight = false;
let helpReturnFocus = null;
function openControlsHelp() {
  if (!controlsHelp || typeof controlsHelp.showModal !== 'function' || controlsHelp.open) return;
  helpReturnFocus = document.activeElement;
  helpResumesFight = G.sceneName === 'fight' && G.phase === 'fight' && !G.paused;
  if (helpResumesFight) { G.paused = true; G.pauseT = 0; }
  clearAllInput();
  controlsHelp.showModal();
  syncTouchControls();
}
document.getElementById('helpBtn')?.addEventListener('click', openControlsHelp);
controlsHelp?.addEventListener('close', () => {
  if (helpResumesFight && G.sceneName === 'fight' && G.phase === 'fight') G.paused = false;
  helpResumesFight = false;
  clearAllInput();
  if (helpReturnFocus?.isConnected && helpReturnFocus.getClientRects?.().length) helpReturnFocus.focus?.();
  else if (G.sceneName === 'lobby') document.getElementById('lobby')?.querySelector('[data-lobby-action="tab"]')?.focus();
  else canvas.focus?.();
  helpReturnFocus = null;
  syncTouchControls();
});
window.addEventListener('keydown', e => {
  if (controlsHelp?.open) return;
  if (G.sceneName === 'lobby' && !['KeyH', 'KeyM', 'Escape'].includes(e.code)) return;
  Sound.init();
  const acts = KEYMAP[e.code];
  if (!acts) return;
  e.preventDefault();
  if (!e.repeat) acts.forEach(a => Input.press(a));
});
window.addEventListener('keyup', e => { const acts = KEYMAP[e.code]; if (acts) acts.forEach(a => Input.release(a)); });
window.addEventListener('blur', pauseForInterruption);
window.addEventListener('pagehide', pauseForInterruption);
document.addEventListener?.('visibilitychange', () => { if (document.hidden) pauseForInterruption(); });

function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
canvas.addEventListener('pointerdown', e => {
  if (controlsHelp?.open) return;
  Sound.init();
  if (e.button === 0 && e.pointerType !== 'touch' && G.sceneName === 'fight' && G.phase === 'fight' && !G.paused) {
    e.preventDefault(); Input.pressed.punch = true;
  } else if (e.button === 0 || e.pointerType === 'touch') G.click = toGame(e);
});
document.querySelectorAll('[data-act]').forEach(btn => {
  const acts = btn.dataset.act.split(',');
  const utility = acts.every(a => ['pause', 'mute', 'help'].includes(a));
  const pointers = new Set();
  touchBindings.push({ btn, pointers });
  const on = e => {
    e.preventDefault();
    if (controlsHelp?.open || (!utility && !combatControlsActive())) return;
    Sound.init(); pointers.add(e.pointerId ?? 0);
    if (e.pointerId != null) btn.setPointerCapture?.(e.pointerId);
    acts.forEach(a => Input.press(a)); btn.classList.add('on');
  };
  const off = e => {
    e.preventDefault(); pointers.delete(e.pointerId ?? 0);
    if (pointers.size) return;
    acts.forEach(a => Input.release(a)); btn.classList.remove('on');
  };
  btn.addEventListener('pointerdown', on);
  ['pointerup', 'pointerleave', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, off));
  // Keyboard/assistive activation of a real button has no pointer event.
  btn.addEventListener('click', e => {
    if (e.detail === 0 && !controlsHelp?.open && (utility || combatControlsActive())) {
      Sound.init(); acts.forEach(a => { Input.pressed[a] = true; });
    }
  });
  btn.addEventListener('contextmenu', e => e.preventDefault());
});
let IS_TOUCH = ('ontouchstart' in window) || Boolean(window.matchMedia?.('(pointer: coarse)').matches);
try {
  const touchPreference = localStorage.getItem('biton.touchControls');
  if (touchPreference !== null) IS_TOUCH = touchPreference === '1';
} catch (e) { /* use device detection when storage is unavailable */ }
if (IS_TOUCH) document.body.classList.add('touch');
const touchControlsToggle = document.getElementById('touchControlsToggle');
if (touchControlsToggle) {
  touchControlsToggle.checked = IS_TOUCH;
  touchControlsToggle.addEventListener('change', () => {
    IS_TOUCH = touchControlsToggle.checked;
    document.body.classList.toggle('touch', IS_TOUCH);
    clearAllInput(); syncTouchControls();
    try { localStorage.setItem('biton.touchControls', IS_TOUCH ? '1' : '0'); } catch (e) { /* session-only preference */ }
  });
}

/* ---------------- images ---------------- */
const IMG = {};
function loadImages(done) {
  const list = Object.entries(CHARACTERS).filter(([, c]) => c.face).map(([k, c]) => [k, c.face]);
  if (PLAYER.face) list.push(['player', PLAYER.face]);
  let n = list.length;
  if (!n) return done();
  for (const [k, src] of list) {
    const im = new Image();
    im.onload = () => { IMG[k] = im; if (--n === 0) done(); };
    im.onerror = () => { if (--n === 0) done(); };
    im.src = src;
  }
}

/* ---------------- game state ---------------- */
const G = {
  scene: null, sceneName: '', sceneT: 0, t: 0, click: null, buttons: [], toast: null,
  ci: 0, li: 0, chapter: null, level: null,
  player: null, enemies: [], bystander: null, projectiles: [], particles: [], hazards: [], props: [], texts: [], timers: [],
  banner: null, shake: 0, flash: 0, blind: 0, dark: 0, darkTarget: 0, dim: 0,
  slowmo: 1, slowAcc: 0, hitstop: 0, timer: 0, phase: '', phaseT: 0,
  combo: 0, comboT: 0, bestCombo: 0, polaroid: null, gim: {}, stats: {}, paused: false, result: null, resultData: null,
  debug: {},
};
const Scenes = {};
function setScene(name, arg) {
  clearAllInput();
  if (typeof Lobby !== 'undefined' && name !== 'lobby') Lobby.hide();
  G.sceneName = name; G.scene = Scenes[name]; G.sceneT = 0; G.buttons = [];
  document.body.classList.toggle('in-fight', name === 'fight');
  if (G.scene.enter) G.scene.enter(arg);
  syncTouchControls();
}
function toast(text) { G.toast = { text, t: 0 }; }
function hint(text, dur = 180) { G.hint = { text, t: 0, dur }; }

/* =====================================================================
   FIGHTERS
   ===================================================================== */
const MOVES = {
  punch: { startup: 4, active: 4, recovery: 9, dmg: 6, kb: 3, stun: 14, box: [18, -150, 64, 44] },
  kick: { startup: 8, active: 5, recovery: 15, dmg: 10, kb: 7, stun: 20, box: [16, -100, 80, 70] },
};

class Fighter {
  constructor(key, x, facing, isPlayer = false) {
    const c = isPlayer ? PLAYER : CHARACTERS[key];
    this.key = key; this.c = c; this.name = c.name; this.look = c.look;
    this.img = IMG[key] || null;
    this.isPlayer = isPlayer;
    this.x = x; this.y = GROUND; this.vx = 0; this.vy = 0; this.facing = facing;
    this.maxHp = 100; this.hp = 100; this.hpLag = 100; this.meter = 0;
    this.state = 'idle'; this.st = 0; this.anim = rand(100);
    this.move = null; this.moveName = ''; this.hit = false; this.action = null;
    this.in = {};
    this.headRot = 0; this.headV = 0; this.squash = 0; this.headScale = 1; this.scale = 1;
    this.sticky = 0; this.wet = 0; this.tilted = 0; this.invuln = 0;
    this.dmgMul = 1; this.defMul = 1; this.speedMul = 1;
    this.active = true; this.benched = false; this.gone = false; this.headless = false; this.lying = false;
    this.floatY = 0; this.floatTarget = 0; this.aura = null; this.forcePose = null;
    this.bubble = null; this.flags = {}; this.ai = { t: 40, walkT: 0, walkDir: 0, blockT: 0, react: 0 };
    this.offscreenOK = false;
  }
  get onGround() { return this.y >= GROUND - 0.01; }
  hurtbox() {
    if (this.lying) return { x: this.facing > 0 ? this.x - 10 : this.x - 215, y: this.y - 50, w: 225, h: 50 };
    const top = 205 * (1 + (this.headScale - 1) * 0.4);
    return { x: this.x - 26, y: this.y - this.floatY - top, w: 52, h: top };
  }
  busy() { return this.state === 'attack' || this.state === 'hurt' || this.state === 'custom' || this.state === 'ko' || this.state === 'blockstun'; }
  free() { return !this.busy() && this.hp > 0 && this.active; }
}

function say(f, text, dur = 130, voice = true) {
  if (!f) return;
  f.bubble = { text, t: dur, dur };
  if (voice && f.c && f.c.voice) Sound.say(text, f.c.voice);
}

function startAttack(f, name) {
  f.state = 'attack'; f.move = MOVES[name]; f.moveName = name; f.st = 0; f.hit = false;
  Sound.fx.whoosh();
}

function updateFighter(f) {
  f.anim++;
  if (f.sticky > 0) f.sticky--;
  if (f.wet > 0) f.wet--;
  if (f.invuln > 0) f.invuln--;
  if (f.tilted > 0) { f.tilted--; if (f.tilted % 8 === 0) steamFx(f.x + rand(-20, 20), f.y - f.floatY - 210); }
  if (f.bubble && --f.bubble.t <= 0) f.bubble = null;
  f.headV += -f.headRot * 0.22 - f.headV * 0.16;
  f.headRot += f.headV;
  f.squash *= 0.85;
  f.floatY += (f.floatTarget - f.floatY) * 0.08;
  f.hpLag = f.hpLag > f.hp ? f.hpLag - Math.max(0.15, (f.hpLag - f.hp) * 0.04) : f.hp;
  if (!f.active) return;

  const I = f.in || {};
  const sticky = f.sticky > 0;
  const spd = WALK * f.speedMul * (sticky ? 0.35 : 1);

  switch (f.state) {
    case 'attack': {
      f.st++;
      const m = f.move;
      if (f.st >= m.startup + m.active + m.recovery) { f.state = 'idle'; f.move = null; }
      if (f.onGround) f.vx *= 0.75;
      break;
    }
    case 'hurt': case 'blockstun':
      f.st--; f.vx *= f.wet > 0 ? 0.97 : 0.85;
      if (f.st <= 0) f.state = 'idle';
      break;
    case 'custom': {
      const a = f.action; a.t++;
      const def = ACTIONS[a.name];
      if (def.update) def.update(f, a);
      if (f.action === a && a.t >= a.dur) endAction(f);
      break;
    }
    case 'ko':
      f.vx *= f.onGround ? 0.88 : 0.99;
      if (f.onGround) f.lying = true;
      break;
    default: {
      if (f.hp <= 0) break;
      if (I.block && f.onGround) { f.state = 'block'; f.vx *= f.wet > 0 ? 0.97 : 0.5; }
      else if (I.attack) startAttack(f, I.attack);
      else {
        const mx = I.mx || 0;
        if (f.wet > 0) { f.vx += mx * 0.4; f.vx *= 0.985; f.vx = clamp(f.vx, -spd * 1.7, spd * 1.7); if (!mx && Math.abs(f.vx) > 2 && f.anim % 20 === 0) dropsFx(f.x, f.y - 4, '#7fd0ff', 2); }
        else f.vx = mx * spd;
        if (I.jump && f.onGround) { f.vy = JUMP_V * (sticky ? 0.62 : 1); Sound.fx.jump(); }
        f.state = !f.onGround ? 'jump' : (mx ? 'walk' : 'idle');
      }
    }
  }

  if (!f.onGround || f.vy < 0) {
    f.vy += GRAV; f.y += f.vy;
    if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; f.squash = 0.2; }
  }
  f.x += f.vx;
  if (!f.offscreenOK) f.x = clamp(f.x, 36, W - 36);
  if (f.lying) {
    const tip = f.x + f.facing * 222;
    if (tip > W - 6) f.x -= Math.min(7, tip - (W - 6)); else if (tip < 6) f.x += Math.min(7, 6 - tip);
  }
  if (f.sticky > 0 && f.onGround && Math.abs(f.vx) > 0.5 && f.anim % 14 === 0) dropsFx(f.x, f.y - 2, '#8a4a1c', 1);
}

/* player controls */
function clearCombatInput(p) {
  if (!p) return;
  p.buf = null; p.jumpBuf = 0;
}
function captureCombatInput(p) {
  const P = Input.pressed;
  // Capture before hitstop/slow-motion can skip simulation. Buffers age only
  // on simulation ticks, so the impact freeze cannot swallow a fresh press.
  if (P.punch) p.buf = { a: 'punch', t: 8 };
  else if (P.kick) p.buf = { a: 'kick', t: 8 };
  else if (P.special) p.buf = { a: 'special', t: 12 };
  else if (P.taunt) p.buf = { a: 'taunt', t: 12 };
  if (P.up) p.jumpBuf = 8;
}
function playerControl(p) {
  const D = Input.down;
  const b = p.buf && p.buf.t-- > 0 ? p.buf : null;
  if (p.buf && !b) p.buf = null;
  const jump = p.jumpBuf > 0;
  if (jump) p.jumpBuf--;
  p.in = { mx: (D.right ? 1 : 0) - (D.left ? 1 : 0), jump: false, block: !!D.down, attack: null };
  if (G.debug.god) p.hp = p.maxHp;
  if (p.free() && b) {
    p.buf = null;
    if (b.a === 'punch' || b.a === 'kick') p.in.attack = b.a;
    else if (b.a === 'special') {
      if (p.meter >= 100) doAction(p, 'superMom');
      else if (p.meter >= 30) { p.meter -= 30; doAction(p, 'throwSlipper'); }
      else { Sound.fx.buzz(); popText(p.x, p.y - 230, 'NEED MORE METER', '#9cf', 20); }
    } else if (b.a === 'taunt' && p.onGround) doAction(p, 'taunt');
  }
  if (jump && p.free() && p.onGround && !p.in.block && !p.in.attack) {
    p.in.jump = true; p.jumpBuf = 0;
  }
  if (p.free() && p.onGround && p.state !== 'attack') {
    const e = nearestEnemy(p);
    if (e) p.facing = e.x >= p.x ? 1 : -1;
  }
}
function nearestEnemy(p) {
  let best = null, bd = 1e9;
  for (const e of G.enemies) {
    if (!e.active || e.hp <= 0) continue;
    const d = Math.abs(e.x - p.x);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

/* generic enemy AI; bosses add their own moves with BOSSES[key].think */
function aiControl(f) {
  f.in = {};
  if (!f.active || f.hp <= 0) return;
  const B = BOSSES[f.key] || {};
  if (B.update) B.update(f);
  if (!f.free()) return;
  const p = G.player;
  if (p.hp <= 0) return;
  const lv = G.level, ai = f.ai;
  const dx = p.x - f.x, dist = Math.abs(dx);
  f.facing = dx >= 0 ? 1 : -1;
  const tilt = f.tilted > 0;
  const agg = clamp((lv.aggression || 0.4) * (tilt ? 1.6 : 1) * (f.aggMul || 1), 0, 1);

  if (ai.blockT > 0) { ai.blockT--; f.in.block = true; return; }
  if (ai.react > 0) ai.react--;
  const threat = (p.state === 'attack' && p.st <= (p.move ? p.move.startup : 0) && dist < 140) ||
    G.projectiles.some(pr => pr.owner === 'player' && Math.abs(pr.x - f.x) < 170 && Math.sign(f.x - pr.x) === Math.sign(pr.vx || 1));
  if (!tilt && threat && ai.react <= 0) {
    ai.react = 24;
    if (Math.random() < (lv.block || 0.2) * (Save.data.baby ? 0.5 : 1)) { ai.blockT = 14 + rand(14); f.in.block = true; return; }
  }

  if (--ai.t <= 0) {
    ai.t = Math.round(lerp(34, 8, agg) + rand(12));
    if (B.think && B.think(f, dist, dx)) return;
    if (dist < 105) {
      if (Math.random() < 0.45 + agg * 0.5) f.in.attack = Math.random() < 0.6 ? 'punch' : 'kick';
      else if (Math.random() < 0.45) { ai.walkDir = -f.facing; ai.walkT = 10 + rand(14); }
      else ai.blockT = 10 + rand(12);
    } else {
      ai.walkDir = f.facing; ai.walkT = 14 + rand(26);
      if (Math.random() < 0.05 + agg * 0.05) f.in.jump = true;
    }
  }
  if (ai.walkT > 0) {
    ai.walkT--;
    f.in.mx = ai.walkDir;
    if (dist < 72 && ai.walkDir === f.facing) ai.walkT = 0;
  }
}

function separate(a, b, min = 50) {
  if (!a.active || !b.active || a.lying || b.lying || a.noCollide || b.noCollide || a.state === 'ko' || b.state === 'ko') return;
  const dx = b.x - a.x;
  if (Math.abs(dx) < min && Math.abs(a.y - b.y) < 110) {
    const push = (min - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
    a.x -= push; b.x += push;
    if (!a.offscreenOK) a.x = clamp(a.x, 36, W - 36);
    if (!b.offscreenOK) b.x = clamp(b.x, 36, W - 36);
  }
}

function checkMelee(att, targets) {
  if (att.state !== 'attack' || att.hit || !att.active) return;
  const m = att.move;
  if (att.st < m.startup || att.st >= m.startup + m.active) return;
  const b = m.box, fx = att.facing;
  const box = { x: fx > 0 ? att.x + b[0] : att.x - b[0] - b[2], y: att.y - att.floatY + b[1], w: b[2], h: b[3] };
  for (const t of targets) {
    if (t.hp <= 0 || !t.active || t.invuln > 0) continue;
    if (overlap(box, t.hurtbox())) {
      att.hit = true;
      const words = att.key === 'ilay' && att.moveName === 'punch' && att.flags.hasBottle ? ['BONK!', 'CLONK!', 'HYDRATED!'] : null;
      const weaponBonus = att.isPlayer && att.moveName === 'punch' ? (att.weaponDamageBonus || 0) : 0;
      hitFighter(att, t, { dmg: m.dmg + weaponBonus, kb: m.kb, stun: m.stun, dir: fx, x: box.x + box.w / 2, y: box.y + box.h / 2, sfx: att.moveName, words });
      break;
    }
  }
}

/* the one function every hit goes through */
function hitFighter(src, tgt, h) {
  if (G.phase !== 'fight') return false;
  if (tgt.hp <= 0 || tgt.invuln > 0) return false;
  const dir = h.dir || (src ? (tgt.x >= src.x ? 1 : -1) : 1);
  const hx = h.x ?? tgt.x, hy = h.y ?? tgt.y - 130;
  const blocked = (tgt.state === 'block' || tgt.state === 'blockstun') && !h.unblockable && tgt.facing === -dir;
  let dmg = h.dmg * (src ? src.dmgMul : 1) * tgt.defMul;
  if (tgt.tilted > 0) dmg *= 1.3;
  if (tgt.isPlayer) { dmg *= (G.level.dmgScale || 1); if (Save.data.baby) dmg *= 0.5; }

  if (blocked) {
    dmg *= 0.12;
    tgt.hp -= dmg; tgt.state = 'blockstun'; tgt.st = 9; tgt.vx = dir * (h.kb || 4) * 0.6;
    Sound.fx.block(); sparkFx(hx, hy, '#ffffff', 6);
    if (tgt.isPlayer) tgt.meter = Math.min(100, tgt.meter + 2);
  } else {
    let mult = 1, keep = false;
    if (tgt.state === 'custom' && tgt.action) {
      const def = ACTIONS[tgt.action.name];
      if (def.onHit) { const r = def.onHit(tgt, tgt.action, src, h) || {}; mult = r.mult || 1; keep = !!r.keep; }
      else keep = !!def.armor;
      if (!keep) endAction(tgt, true);
    }
    dmg *= mult;
    tgt.hp -= dmg;
    if (!keep) {
      tgt.state = 'hurt'; tgt.st = h.stun ?? 16; tgt.move = null;
      tgt.vx = dir * (h.kb ?? 4);
      if (h.launch) { tgt.vy = -h.launch; tgt.y -= 1; }
    }
    tgt.headV += (0.18 + dmg * 0.025) * (Math.random() < 0.5 ? -1 : 1);
    tgt.squash = 0.35;
    G.hitstop = Math.min(10, Math.round(3 + dmg * 0.35));
    G.shake = Math.max(G.shake, Math.min(14, 5 + dmg * 0.85));
    (Sound.fx[h.sfx] || (dmg >= 9 ? Sound.fx.kick : Sound.fx.punch))();
    sparkFx(hx, hy, '#ffe14d', 10);
    bloodFx(hx, hy, dir, dmg);
    popText(hx + rand(-10, 10), hy - 30, pick(h.words || HIT_WORDS), pick(['#ffe14d', '#ff6b3d', '#7cf', '#fff']), 30 + Math.min(20, dmg * 1.5));
    if (src && src.isPlayer) {
      G.combo++; G.comboT = 90; G.bestCombo = Math.max(G.bestCombo, G.combo);
      src.meter = Math.min(100, src.meter + 7);
    }
    if (tgt.isPlayer) {
      G.combo = 0; tgt.meter = Math.min(100, tgt.meter + 4); G.stats.hitsTaken++;
      if (src && Math.random() < 0.18) say(src, pick(src.c.taunts), 90);
      if (G.bystander && Math.random() < 0.4) say(G.bystander, pick(['LET\'S GOOO!', 'GOT HIM ON CAMERA!', 'WHAAAT!']), 70);
    } else if (Math.random() < 0.15 && tgt.hp > 0) say(tgt, pick(tgt.c.hurtLines), 80);
    const B = BOSSES[tgt.key];
    if (B && B.onHurt) B.onHurt(tgt, src, dmg);
  }
  if (tgt.hp <= 0) { tgt.hp = 0; knockOut(tgt, dir); }
  return !blocked;
}

function knockOut(f, dir) {
  if (f.state === 'ko') return;
  if (f.action) endAction(f, true);
  f.state = 'ko'; f.vx = dir * 6; f.vy = -7; f.y -= 1; f.bubble = null; f.tilted = 0;
  if (!f.headless) {
    f.headless = true;
    G.particles.push({ type: 'head', f, x: f.x, y: f.y - 175, vx: dir * rand(3, 6), vy: -rand(11, 14), rot: 0, vr: dir * rand(0.2, 0.4), t: 0, life: 1e9, bounces: 0 });
    Sound.fx.boing();
  }
  const alive = G.enemies.filter(e => e.hp > 0);
  if (f.isPlayer) endFight('lose', 'K.O.!');
  else if (!alive.length) endFight('win', 'K.O.!');
  else {
    G.shake = 12;
    later(50, () => { f.gone = true; sparkFx(f.x, f.y - 20, '#fff', 14); });
    const partner = alive[0];
    say(partner, 'NOOO! BRO! YOU\'LL PAY FOR THAT!', 140);
    if (partner.benched) tagIn(partner, f.x < W / 2 ? -1 : 1);
    partner.tilted = 400;
  }
}

/* =====================================================================
   ACTIONS (special moves). Boss actions are added in bosses.js
   ===================================================================== */
const ACTIONS = {};
function doAction(f, name, opts = {}) {
  const def = ACTIONS[name];
  if (f.action) endAction(f, true);
  f.state = 'custom'; f.move = null;
  f.action = Object.assign({ name, t: 0, dur: def.dur || 60, pose: def.pose || null }, opts);
  if (def.start) def.start(f, f.action);
}
function endAction(f, interrupted = false) {
  const a = f.action;
  if (!a) return;
  const def = ACTIONS[a.name];
  f.action = null; f.lying = false;
  if (f.state === 'custom') f.state = 'idle';
  if (def.end) def.end(f, a, interrupted);
}

ACTIONS.taunt = {
  dur: 56, pose: 'taunt',
  start(f) { say(f, pick(PLAYER.taunts), 70); G.stats.taunts++; },
  end(f, a, interrupted) {
    if (interrupted) { popText(f.x, f.y - 240, 'TAUNT FAILED', '#f66', 22); return; }
    f.meter = Math.min(100, f.meter + 20);
    const e = nearestEnemy(f);
    if (e) {
      e.tilted = 300; Sound.fx.steam();
      popText(e.x, e.y - 250, 'TILTED!', '#ff4d4d', 34);
      say(e, pick(e.c.tiltLines || ['Oh you\'re DEAD now.']), 100);
    }
  },
};
ACTIONS.throwSlipper = {
  dur: 24, pose: 'throw',
  start(f, a) { a.fItem = 'slipper'; },
  update(f, a) {
    if (a.t === 9) {
      a.fItem = null; Sound.fx.whoosh();
      spawnProj({ kind: 'slipper', owner: 'player', src: f, x: f.x + f.facing * 40, y: f.y - 125, vx: f.facing * 11, vy: 0, w: 34, h: 18, dmg: 9, kb: 6, stun: 18, vr: f.facing * 0.5, sfx: 'slipper', words: ['SLAP!', 'THWAP!', 'FLIP-FLOP!'] });
    }
  },
};
ACTIONS.superMom = {
  dur: 120, pose: 'phone',
  start(f, a) {
    f.meter = 0; f.invuln = 125; G.dim = 1;
    G.banner = { text: 'CALLING HIS MOM...', sub: 'ring ring', t: 0, dur: 70 };
    Sound.fx.ring(); a.target = nearestEnemy(f);
  },
  update(f, a) {
    if (a.t === 55) {
      const tg = a.target && a.target.hp > 0 ? a.target : nearestEnemy(f);
      if (!tg) return;
      G.banner = { text: '"WHY ARE YOU FIGHTING?! COME EAT!"', t: 0, dur: 80, small: true };
      spawnProj({ kind: 'bigSlipper', owner: 'player', src: f, x: tg.x, y: -120, vx: 0, vy: 2, g: 1.1, w: 120, h: 70, dmg: 26, kb: 3, stun: 50, unblockable: true, pierce: true, sfx: 'kick', words: ['MOM SMACK!', 'SLIPPER OF JUDGEMENT!'],
        onGround(p) { p.dead = true; G.shake = 22; Sound.fx.kick(); sparkFx(p.x, GROUND - 10, '#c9b38f', 20); } });
    }
    if (a.t > 100) G.dim = Math.max(0, G.dim - 0.08);
  },
  end() { G.dim = 0; },
  armor: true,
};
ACTIONS.dizzy = {
  dur: 55, pose: 'dizzy',
  start(f) { say(f, pick(['@#$%!', 'Where am I?', 'Mommy?']), 55, false); },
};
ACTIONS.forcefed = {
  dur: 80, pose: 'eat',
  start(f, a) { a.fItem = 'spoon'; say(f, 'MMMPH!!', 70); f.sticky = 170; Sound.fx.nom(); popText(f.x, f.y - 240, 'FORCE FED!', '#ffb347', 30); },
  update(f, a) { if (a.t % 20 === 0) dropsFx(f.x + f.facing * 10, f.y - 150, '#8a4a1c', 3); },
};

/* =====================================================================
   PROJECTILES, HAZARDS, PROPS, PARTICLES, TIMERS
   ===================================================================== */
function spawnProj(p) {
  p.t = 0; p.rot = p.rot || 0; p.g = p.g || 0; p.hitSet = new Set();
  G.projectiles.push(p);
  return p;
}
function updateProjectiles() {
  for (const p of G.projectiles) {
    p.t++;
    if (p.update) p.update(p);
    else { p.vy += p.g; p.x += p.vx; p.y += p.vy; }
    p.rot += p.vr || 0;
    const targets = p.owner === 'player' ? G.enemies : [G.player];
    const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
    if (!p.harmless) {
      for (const t of targets) {
        if (t.hp <= 0 || !t.active || t.invuln > 0 || p.hitSet.has(t)) continue;
        if (overlap(box, t.hurtbox())) {
          p.hitSet.add(t);
          hitFighter(p.src, t, { dmg: p.dmg, kb: p.kb ?? 5, stun: p.stun ?? 16, dir: Math.sign(p.vx) || (t.x >= p.x ? 1 : -1), unblockable: p.unblockable, x: p.x, y: p.y, words: p.words, sfx: p.sfx });
          if (p.onHit) p.onHit(p, t);
          if (!p.pierce) p.dead = true;
          break;
        }
      }
    }
    if (!p.dead && p.onGround && p.vy > 0 && p.y >= GROUND - (p.groundOff || 0)) p.onGround(p);
    if (p.x < -250 || p.x > W + 250 || p.y > H + 150 || p.t > (p.life || 900)) p.dead = true;
  }
  // a slipper can knock other things out of the air
  for (const a of G.projectiles) {
    if (a.dead || a.owner !== 'player' || a.kind !== 'slipper') continue;
    for (const b of G.projectiles) {
      if (b.dead || b.owner === 'player' || b.noClash) continue;
      if (overlap({ x: a.x - a.w / 2, y: a.y - a.h / 2, w: a.w, h: a.h }, { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h })) {
        a.dead = b.dead = true; sparkFx(a.x, a.y, '#fff', 12); popText(a.x, a.y - 20, 'CLASH!', '#fff', 28); Sound.fx.block();
      }
    }
  }
  G.projectiles = G.projectiles.filter(p => !p.dead);
}

function updateHazards() {
  const p = G.player;
  for (const h of G.hazards) {
    h.t++;
    if ((h.type === 'syrup' || h.type === 'water') && p.onGround && p.hp > 0 && Math.abs(p.x - h.x) < h.w / 2) {
      if (h.type === 'syrup') { if (!p.sticky) popText(p.x, p.y - 230, 'STICKY!', '#c8813a', 26); p.sticky = Math.max(p.sticky, 14); }
      else { if (!p.wet) { popText(p.x, p.y - 230, 'SLIPPERY!', '#7fd0ff', 26); Sound.fx.slip(); } p.wet = Math.max(p.wet, 14); }
    }
    if (h.type === 'wave') {
      h.x += h.vx;
      if (!h.hit && p.hp > 0 && p.y > GROUND - 55 && Math.abs(p.x - h.x) < 50) {
        h.hit = true;
        hitFighter(null, p, { dmg: 10, kb: 6, stun: 22, dir: Math.sign(h.vx), unblockable: true, words: ['SPLOOSH!', 'GLOOP!'], sfx: 'splat' });
        p.sticky = 160;
      }
      if (h.x < -150 || h.x > W + 150) h.dead = true;
    }
    if (h.life && h.t > h.life) h.dead = true;
  }
  G.hazards = G.hazards.filter(h => !h.dead);
}

function updateProps() {
  for (const o of G.props) {
    if (o.landed) continue;
    o.vy += 0.6; o.x += o.vx; o.y += o.vy; o.rot += o.vr;
    if (o.x < 30 || o.x > W - 30) { o.vx *= -0.6; o.x = clamp(o.x, 30, W - 30); }
    if (o.y >= GROUND - 8) { o.y = GROUND - 8; o.landed = true; o.rot = 0; Sound.fx.block(); }
  }
}

function later(n, fn) { G.timers.push({ n, fn }); }
function runTimers() {
  const list = G.timers; G.timers = [];
  for (const tm of list) { if (--tm.n <= 0) tm.fn(); else G.timers.push(tm); }
}

function sparkFx(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) G.particles.push({ type: 'spark', x, y, vx: rand(-6, 6), vy: rand(-6, 3), r: rand(2.5, 6), t: 0, life: 18 + rand(10), color });
}
function dropsFx(x, y, color, n = 4) {
  for (let i = 0; i < n; i++) G.particles.push({ type: 'drop', x, y, vx: rand(-3, 3), vy: rand(-6, -1), r: rand(2, 4.5), t: 0, life: 45, color });
}
function bloodFx(x, y, dir, damage) {
  // Stylized impact droplets. Bound the count during long exchanges.
  const existing = G.particles.filter(p => p.type === 'blood').length;
  const n = Math.min(180 - existing, 8 + Math.round(Math.min(12, damage)));
  for (let i = 0; i < n; i++) {
    G.particles.push({ type: 'blood', x, y, vx: dir * rand(1.5, 6.5) + rand(-2, 2),
      vy: rand(-7, 0.5), r: rand(1.8, 4.2), t: 0, life: 150,
      color: pick(['#c91331', '#e4203c', '#941829']), landed: false });
  }
}
function steamFx(x, y) { G.particles.push({ type: 'steam', x, y, vx: rand(-0.5, 0.5), vy: -1.2, r: 6, t: 0, life: 40 }); }
function zzzFx(x, y) { G.particles.push({ type: 'z', x, y, vx: 0.5, vy: -0.8, t: 0, life: 80 }); }
function confettiFx(n = 60) {
  const cols = ['#ff4d4d', '#ffe14d', '#4dd2ff', '#7dff6b', '#ff8ad8'];
  for (let i = 0; i < n; i++) G.particles.push({ type: 'confetti', x: rand(W), y: rand(-200, -10), vx: rand(-1, 1), vy: rand(1.5, 3.5), r: rand(4, 8), rot: rand(TAU), vr: rand(-0.2, 0.2), t: 0, life: 300, color: pick(cols) });
}
function popText(x, y, text, color = '#ffe14d', size = 32) {
  G.texts.push({ x, y, text, color, size, t: 0, dur: 55, rot: rand(-0.18, 0.18) });
}

function updateFx() {
  for (const p of G.particles) {
    p.t++;
    if (p.type === 'head') {
      p.vy += 0.55; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      const floor = GROUND - 34;
      if (p.y > floor) {
        p.y = floor; p.vy *= -0.55; p.vx *= 0.75; p.vr *= 0.7;
        if (Math.abs(p.vy) > 2) { p.bounces++; if (p.bounces < 4) Sound.fx.boing(); } else p.vy = 0;
      }
      if (p.x < 30 || p.x > W - 30) { p.vx *= -0.8; p.x = clamp(p.x, 30, W - 30); }
    } else if (p.type === 'confetti') { p.x += p.vx + Math.sin(p.t * 0.05) * 0.6; p.y += p.vy; p.rot += p.vr; }
    else {
      p.x += p.vx; p.y += p.vy;
      if (p.type === 'spark') { p.vx *= 0.9; p.vy *= 0.9; }
      if (p.type === 'drop' || p.type === 'shard' || p.type === 'sweat' || p.type === 'blood') { p.vy += 0.4; if (p.y > GROUND) { p.y = GROUND; p.vx = 0; p.vy = 0; if (p.type === 'blood') p.landed = true; } }
      if (p.type === 'steam') p.r += 0.4;
    }
  }
  G.particles = G.particles.filter(p => p.t < p.life);
  for (const t of G.texts) t.t++;
  G.texts = G.texts.filter(t => t.t < t.dur);
  G.shake *= 0.86; if (G.shake < 0.3) G.shake = 0;
  G.flash = Math.max(0, G.flash - 0.05);
  if (G.blind > 0) G.blind--;
  G.dark += (G.darkTarget - G.dark) * 0.1;
  if (G.banner && ++G.banner.t > G.banner.dur) G.banner = null;
  if (G.polaroid && ++G.polaroid.t > G.polaroid.dur) G.polaroid = null;
  if (G.hint && ++G.hint.t > G.hint.dur) G.hint = null;
}

function snapPolaroid(caption) {
  const c = document.createElement('canvas'); c.width = 240; c.height = 135;
  try { c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); } catch (e) { /* ignore */ }
  G.polaroid = { img: c, caption, t: 0, dur: 210, rot: rand(-0.14, 0.14) };
}

/* =====================================================================
   FIGHT FLOW
   ===================================================================== */
let fightSerial = 0;
const fightSession = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
function startFight() {
  const ch = CHAPTERS[G.ci], lv = ch.levels[G.li];
  lv.mods = lv.mods || {};
  G.chapter = ch; G.level = lv;
  G.player = new Fighter('player', 200, 1, true);
  G.player.meter = 50;
  if (typeof Progression !== 'undefined') {
    const loadout = Progression.getLoadout();
    G.player.look = { ...PLAYER.look, shirt: loadout.skin.shirt, pants: loadout.skin.pants, shoes: loadout.skin.shoes };
    G.player.weaponId = loadout.weapon.id;
    G.player.weaponColor = loadout.weapon.color;
    G.player.weaponDamageBonus = loadout.weapon.damageBonus;
  }
  G.enemies = lv.enemies.map((k, i) => {
    const e = new Fighter(k, lv.mods.duo ? 700 + i * 120 : 760, -1);
    e.maxHp = e.hp = e.hpLag = lv.hp; e.dmgMul = lv.dmg || 1;
    return e;
  });
  G.bystander = null;
  if (lv.bystander) { const b = new Fighter(lv.bystander, 840, -1); b.scale = 0.72; b.y = GROUND - 44; G.bystander = b; }
  Object.assign(G, {
    fightId: `${fightSession}-${++fightSerial}`, coinReward: null,
    projectiles: [], particles: [], hazards: [], props: [], texts: [], timers: [],
    timer: 99 * 60, phase: 'intro', phaseT: 0, combo: 0, comboT: 0, bestCombo: 0, slowmo: 1, slowAcc: 0, hitstop: 0,
    flash: 0, blind: 0, dark: 0, darkTarget: 0, dim: 0, polaroid: null, result: null, resultData: null, paused: false, pauseReason: '',
    gim: {}, stats: { taunts: 0, poses: 0, hitsTaken: 0 }, shake: 0, hint: null,
  });
  for (const e of G.enemies) { const B = BOSSES[e.key]; if (B && B.setup) B.setup(e, lv); }
  for (const k of Object.keys(lv.mods)) if (GIMMICKS[k] && GIMMICKS[k].setup) GIMMICKS[k].setup();
  G.banner = { text: `ROUND ${G.li + 1}`, sub: lv.name, t: 0, dur: 80 };
  Sound.play(lv.music || ch.music);
}

function simStep() {
  G.t++;
  const fighting = G.phase === 'fight';
  if (fighting && !G.debug.freezeTimer) { G.timer--; if (G.timer <= 0) timeOver(); }
  runTimers();
  if (fighting) { playerControl(G.player); G.enemies.forEach(aiControl); }
  else { G.player.in = {}; G.enemies.forEach(e => { e.in = {}; }); }
  if (fighting) for (const k of Object.keys(G.level.mods)) if (GIMMICKS[k] && GIMMICKS[k].update) GIMMICKS[k].update();
  updateFighter(G.player);
  G.enemies.forEach(updateFighter);
  if (G.bystander) { const b = G.bystander; b.anim++; if (b.bubble && --b.bubble.t <= 0) b.bubble = null; b.headV += -b.headRot * 0.22 - b.headV * 0.16; b.headRot += b.headV; }
  for (const e of G.enemies) separate(G.player, e);
  if (G.enemies.length === 2) separate(G.enemies[0], G.enemies[1], 34);
  if (fighting) { checkMelee(G.player, G.enemies); for (const e of G.enemies) checkMelee(e, [G.player]); }
  updateProjectiles(); updateHazards(); updateProps();
  if (G.comboT > 0 && --G.comboT === 0) G.combo = 0;
}

function timeOver() {
  const p = G.player;
  const ep = G.enemies.reduce((s, e) => s + e.hp / e.maxHp, 0) / G.enemies.length;
  endFight(p.hp / p.maxHp >= ep ? 'win' : 'lose', 'TIME!');
  G.banner = { text: 'TIME!', sub: 'The judges fell asleep.', t: 0, dur: 140 };
}

function endFight(result, text) {
  if (G.phase !== 'fight') return;
  G.phase = 'ko'; G.phaseT = 0; G.slowmo = 0.3; G.result = result;
  clearAllInput(); syncTouchControls();
  G.banner = { text, t: 0, dur: 140, big: true };
  Sound.stop(); Sound.fx.ko(); Sound.say(text === 'TIME!' ? 'Time!' : 'K O!', ANNOUNCER);
  G.projectiles = [];
}

function setupResult() {
  const lv = G.level, p = G.player, gi = roundIndex(G.ci, G.li);
  G.slowmo = 1;
  if (G.result === 'win') {
    const score = (p.hp / p.maxHp) * 0.7 + (G.timer / (99 * 60)) * 0.3;
    const r = RANKS.find(x => score >= x[0]);
    G.resultData = { rank: r[1], rankText: r[2], line: lv.defeat, hp: Math.round(p.hp), time: 99 - Math.ceil(G.timer / 60), combo: G.bestCombo, taunts: G.stats.taunts };
    if (Save.data.unlocked <= gi) Save.data.unlocked = gi + 1;
    Save.data.losses[gi] = 0; Save.write();
    Sound.fx.fanfare(); Sound.play('victory'); confettiFx();
  } else {
    Save.data.losses[gi] = (Save.data.losses[gi] || 0) + 1; Save.write();
    G.resultData = { tip: pick(LOSE_TIPS).replace('{boss}', G.enemies[0].name), line: lv.gloat, offerBaby: Save.data.losses[gi] >= 2 && !Save.data.baby };
    Sound.fx.sadTrombone();
  }
  if (typeof Progression !== 'undefined') {
    if (G.coinReward === null) {
      const earned = Progression.rewardFight({ fightId: G.fightId, opponent: `${G.enemies[0].key}-r${G.li + 1}`, won: G.result === 'win' });
      if (Progression.lastError !== 'save-failed') G.coinReward = earned;
    }
    G.resultData.coinReward = G.coinReward;
    G.resultData.rewardSaveFailed = G.coinReward === null;
  }
}

function resultInput() {
  const P = Input.pressed, click = G.click && !G.clickUsed;
  if (G.phaseT < 40) return;
  if (G.result === 'win') {
    if (P.confirm || click) {
      Sound.fx.select();
      if (G.li < G.chapter.levels.length - 1) { G.li++; setScene('intro'); }
      else setScene('roast');
    } else if (P.back) setScene('lobby');
  } else {
    if (P.baby && G.resultData.offerBaby) { Save.data.baby = true; Save.write(); toast('BABY MODE ON. No shame.'); Sound.say('Baby mode activated', ANNOUNCER); setScene('fight'); }
    else if (P.confirm || click) { Sound.fx.select(); setScene('fight'); }
    else if (P.back) setScene('lobby');
  }
}

function startLevel(ci, li, skipIntro) {
  G.ci = ci; G.li = li;
  setScene(skipIntro ? 'fight' : 'intro');
}

/* =====================================================================
   DRAWING
   ===================================================================== */
function txt(s, x, y, size = 24, color = '#fff', align = 'center', stroke = OUTLINE, font = FONT_HEAD, lw) {
  ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = lw ?? Math.max(2, size / 6); ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function wrap(s, maxW, size, font = FONT_BODY) {
  ctx.font = `${size}px ${font}`;
  const words = s.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function ellipse(x, y, rx, ry, fill, stroke, lw = 3) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function button(x, y, w, h, label, act, hot = false, size = 22) {
  rrect(x, y, w, h, 10);
  ctx.fillStyle = hot ? '#ffe14d' : 'rgba(0,0,0,0.55)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = hot ? OUTLINE : '#ffe14d'; ctx.stroke();
  txt(label, x + w / 2, y + h / 2 + 1, size, hot ? OUTLINE : '#fff', 'center', hot ? null : OUTLINE);
  if (act) G.buttons.push({ x, y, w, h, act });
}

/* ---------- poses ---------- */
function attackExt(f) {
  const m = f.move; if (!m) return 0;
  if (f.st < m.startup) return f.st / m.startup * 0.4;
  if (f.st < m.startup + m.active) return 1;
  return Math.max(0, 1 - (f.st - m.startup - m.active) / m.recovery);
}
function poseName(f) {
  if (f.forcePose) return f.forcePose;
  if (f.state === 'ko') return 'ko';
  if (f.state === 'custom' && f.action) return f.action.pose || 'idle';
  if (f.state === 'attack') return f.moveName;
  if (f.state === 'hurt') return 'hurt';
  if (f.state === 'block' || f.state === 'blockstun') return 'block';
  if (f.state === 'jump') return 'jump';
  if (f.key === 'ilay' && f.flags.hasBottle) return f.state === 'walk' ? 'walkBottle' : 'holdBottle';
  if (f.key === 'tom') return f.state === 'walk' ? 'walkJar' : 'holdJar';
  return f.state === 'walk' ? 'walk' : 'idle';
}
function computePose(f) {
  const t = f.anim;
  const P = {
    lean: 0, bodyY: Math.sin(t * 0.1) * 1.2, lying: f.lying,
    fl: [DOWN + 0.12, DOWN + 0.34], bl: [DOWN - 0.14, DOWN + 0.1],
    fa: [1.1, -0.6], ba: [1.3, -0.4],
    fItem: null, bItem: null, fingerF: false, fingerB: false, palms: false, bottle: null,
    headTilt: Math.sin(t * 0.05) * 0.05,
  };
  const pose = poseName(f);
  const a = f.action;
  const walkLegs = (sp, amp) => {
    const s = Math.sin(t * sp);
    P.fl = [DOWN + s * amp, DOWN + s * amp + 0.25 + Math.max(0, -s) * 0.7];
    P.bl = [DOWN - s * amp, DOWN - s * amp + 0.25 + Math.max(0, s) * 0.7];
    P.bodyY = -Math.abs(s) * 3;
    return s;
  };
  switch (pose) {
    case 'walk': walkLegs(0.24, 0.5); break;
    case 'run': { const s = walkLegs(0.4, 0.8); P.lean = 0.22; P.fa = [DOWN - s * 1.1, DOWN - s * 1.1 - 1.5]; P.ba = [DOWN + s * 1.1, DOWN + s * 1.1 - 1.5]; break; }
    case 'jump': P.fl = [0.75, 2.1]; P.bl = [1.25, 2.5]; P.fa = [0.5, -1.3]; P.ba = [0.8, -1.1]; break;
    case 'punch': { const e = attackExt(f); P.fa = [lerp(1.1, -0.05, e), lerp(-0.6, -0.05, e)]; P.lean = 0.12 * e; P.ba = [1.45, -0.2]; break; }
    case 'kick': { const e = attackExt(f); P.fl = [lerp(DOWN + 0.1, 0.05, e), lerp(DOWN + 0.3, -0.02, e)]; P.bl = [DOWN - 0.05, DOWN + 0.05]; P.lean = -0.2 * e; break; }
    case 'block': P.fa = [0.35, -1.5]; P.ba = [0.55, -1.4]; P.lean = -0.06; P.fl = [DOWN + 0.28, DOWN + 0.45]; P.bl = [DOWN - 0.28, DOWN - 0.05]; break;
    case 'hurt': P.lean = -0.35; P.fa = [-1.9, -2.3]; P.ba = [-1.3, -1.9]; P.fl = [DOWN + 0.3, DOWN + 0.55]; P.headTilt = -0.25; break;
    case 'taunt': {
      const w = Math.sin(t * 0.4);
      P.lean = w * 0.12; P.fa = [-0.9 + w * 0.2, -1.8 + Math.sin(t * 0.8) * 0.6]; P.ba = [2.1, 0.7];
      P.fl = [DOWN + 0.12 + w * 0.15, DOWN + 0.3]; P.bl = [DOWN - 0.1 + w * 0.15, DOWN + 0.1]; P.headTilt = w * 0.2; break;
    }
    case 'flex': { const w = Math.sin(t * 0.6); P.fa = [-0.3, -2.0 + w * 0.2]; P.ba = [-2.8, -1.2 - w * 0.2]; P.fl = [DOWN + 0.35, DOWN + 0.5]; P.bl = [DOWN - 0.35, DOWN - 0.1]; P.bodyY = 3; break; }
    case 'throw': { const k = a ? a.t / Math.max(1, a.relT || 9) : 1; if (k < 1) { P.fa = [-2.4, -2.7]; P.lean = -0.15; } else { P.fa = [0.15, 0.05]; P.lean = 0.15; } P.fItem = a && a.fItem; break; }
    case 'phone': P.fa = [1.15, -1.95]; P.fItem = 'phone'; P.headTilt = 0.28; P.ba = [1.5, 0.3]; break;
    case 'point': P.fa = [-0.08, -0.06]; P.fingerF = true; P.ba = [2.0, 0.6]; P.lean = 0.08; break;
    case 'groupPoint': P.fa = [0.55, 1.25]; P.ba = [0.75, 1.35]; P.fingerF = true; P.fingerB = true; P.headTilt = 0.2; break;
    case 'selfie': P.fa = [-1.25, -1.0]; P.fItem = 'phone'; P.ba = [-0.6, -1.6]; P.fingerB = true; P.headTilt = -0.15; break;
    case 'scream': P.fa = [0.85, -2.15]; P.ba = [1.05, -2.0]; P.lean = -0.1 + Math.sin(t * 0.9) * 0.05; break;
    case 'offer': walkLegs(0.2, 0.35); P.fa = [0.25, 0.05]; P.fItem = 'jar'; P.ba = [0.45, 0.05]; P.fingerB = true; P.lean = 0.08; break;
    case 'walkJar': walkLegs(0.24, 0.5); P.fa = [1.15, -0.8]; P.fItem = 'jar'; break;
    case 'holdJar': {
      P.fa = [1.15, -0.8]; P.fItem = 'jar';
      if (t % 220 < 90) { P.ba = [0.6, -0.05]; P.fingerB = true; } // points at the jar, like the photo
      break;
    }
    case 'eat': P.fa = [0.95, -2.3]; P.fItem = (a && a.fItem) || 'spoon'; P.ba = [1.3, -0.7]; if (f.key === 'tom') P.bItem = 'jar'; P.headTilt = -0.1 + Math.sin(t * 0.5) * 0.08; break;
    case 'lying': P.lying = true; P.fa = [0.4, 0.2]; P.ba = [1.9, 1.6]; P.fl = [DOWN, DOWN + 0.05]; P.bl = [DOWN - 0.2, DOWN + 0.4]; break;
    case 'ko': P.lying = true; P.fa = [-1.2 + Math.sin(t * 0.2) * 0.2, -1.4]; P.ba = [1.9, 1.6]; P.fl = [DOWN + Math.sin(t * 0.3) * 0.15, DOWN]; P.bl = [DOWN - 0.3, DOWN]; break;
    case 'holdBottle': case 'walkBottle': case 'levitate':
      if (pose === 'walkBottle') walkLegs(0.24, 0.45);
      if (pose === 'levitate') { P.fl = [DOWN + 0.08, DOWN + 0.22]; P.bl = [DOWN - 0.02, DOWN + 0.12]; }
      P.fa = [1.0, -0.35]; P.ba = [1.25, -0.2]; P.palms = true; P.bottle = 'hold'; P.headTilt = 0; break;
    case 'drink': P.fa = [0.85, -2.1]; P.ba = [1.5, 0.3]; P.bottle = 'drink'; P.headTilt = -0.2; break;
    case 'splash': P.fa = [0.15, -0.15]; P.ba = [1.4, -0.3]; P.bottle = 'splash'; P.lean = 0.1; break;
    case 'lecture': P.fa = [1.0, -1.6]; P.fingerF = true; P.ba = [1.25, -0.6]; P.bottle = 'back'; P.headTilt = 0; break;
    case 'dizzy': { const w = Math.sin(t * 0.25); P.lean = w * 0.2; P.fa = [1.6, 1.4]; P.ba = [1.6, 1.5]; P.headTilt = w * 0.3; break; }
    case 'peace': P.fa = [-1.2, -1.5]; P.fingerF = true; P.ba = [2.0, 0.7]; P.headTilt = 0.15; break;
    default: break;
  }
  return P;
}

/* ---------- body ---------- */
function limb(x, y, a1, a2, l1, l2, w, col, col2) {
  const x1 = x + Math.cos(a1) * l1, y1 = y + Math.sin(a1) * l1;
  const x2 = x1 + Math.cos(a2) * l2, y2 = y1 + Math.sin(a2) * l2;
  // Tapered volumes keep bent elbows and knees readable in every existing pose.
  limbSegment(x, y, x1, y1, w * 0.57, w * 0.48, col);
  limbSegment(x1, y1, x2, y2, w * 0.49, w * 0.36, col2 || col);
  if (col2) {
    ctx.save(); ctx.translate(x1, y1); ctx.rotate(a1);
    ctx.strokeStyle = shade(col, -30); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-1, -w * 0.42); ctx.lineTo(-1, w * 0.42); ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = shade(col, -25); ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1 - 3, y1 - 1); ctx.lineTo(x1 + 3, y1 + 2); ctx.stroke();
  }
  return { x: x2, y: y2, a: a2, jointX: x1, jointY: y1 };
}
function limbSegment(x1, y1, x2, y2, r1, r2, col) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
  ctx.beginPath(); ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
  ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
  ctx.arc(x2, y2, r2, a + PI / 2, a - PI / 2, true);
  ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
  ctx.arc(x1, y1, r1, a - PI / 2, a + PI / 2, true); ctx.closePath();
  const grad = ctx.createLinearGradient(x1 + nx * r1, y1 + ny * r1, x1 - nx * r1, y1 - ny * r1);
  grad.addColorStop(0, shade(col, -24)); grad.addColorStop(0.4, col);
  grad.addColorStop(0.78, shade(col, 15)); grad.addColorStop(1, col);
  ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.stroke();
}
function shade(hex, amt) {
  const rgb = hex.startsWith('rgb') ? hex.match(/[\d.]+/g).map(Number) : null;
  const n = rgb ? 0 : parseInt(hex.slice(1), 16);
  const r = clamp((rgb ? rgb[0] : n >> 16) + amt, 0, 255), g = clamp((rgb ? rgb[1] : (n >> 8) & 255) + amt, 0, 255), b = clamp((rgb ? rgb[2] : n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}
function hand(e, L, palm, finger, fingerAng) {
  if (palm) {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a);
    ellipse(0, 0, 7, 10, L.skin, OUTLINE, 2);
    ellipse(-3, -5, 3.3, 5.5, shade(L.skin, 9), OUTLINE, 1.5);
    ctx.strokeStyle = shade(L.skin, -35); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(1, -4); ctx.quadraticCurveTo(4, 0, 1, 4); ctx.stroke();
    ctx.restore(); return;
  }
  if (finger) {
    const fa = fingerAng ?? e.a;
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(fa) * 13, e.y + Math.sin(fa) * 13); ctx.stroke();
    ctx.strokeStyle = L.skin; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(fa) * 13, e.y + Math.sin(fa) * 13); ctx.stroke();
  }
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a);
  const skin = ctx.createLinearGradient(0, -8, 0, 8);
  skin.addColorStop(0, shade(L.skin, 18)); skin.addColorStop(0.65, L.skin); skin.addColorStop(1, shade(L.skin, -18));
  ellipse(0, 0, 8.5, 7.5, skin, OUTLINE, 2.1);
  ellipse(-2.5, 4.4, 4.5, 3, L.skin, OUTLINE, 1.5);
  ctx.strokeStyle = shade(L.skin, -35); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(1, -3.5); ctx.lineTo(1, 0); ctx.moveTo(4, -2.5); ctx.lineTo(4, 0); ctx.stroke();
  ctx.restore();
}
function sneaker(e, color, back = false) {
  ctx.save(); ctx.translate(e.x + 2, e.y + 1);
  // The shoe follows an extended kick, and settles flat when the shin is vertical.
  ctx.rotate(clamp(e.a - DOWN, -1.2, 0.75) * 0.78);
  const upper = back ? shade(color, -24) : color;
  const grad = ctx.createLinearGradient(0, -8, 0, 6);
  grad.addColorStop(0, shade(upper, 16)); grad.addColorStop(1, shade(upper, -23));
  ctx.beginPath(); ctx.moveTo(-8, -7); ctx.quadraticCurveTo(-3, -10, 3, -6);
  ctx.lineTo(7, -3); ctx.quadraticCurveTo(18, -2, 18, 4);
  ctx.lineTo(17, 7); ctx.lineTo(-10, 7); ctx.lineTo(-10, 0); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, 3.5); ctx.quadraticCurveTo(4, 5.5, 17, 3.5);
  ctx.lineTo(17, 7); ctx.lineTo(-9, 7); ctx.closePath(); ctx.fillStyle = back ? '#c5c6cc' : '#f1f0e8'; ctx.fill();
  ctx.strokeStyle = shade(upper, -55); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(5, -3); ctx.moveTo(2, -1.5); ctx.lineTo(7, -0.5); ctx.stroke();
  ctx.restore();
}

function drawEquippedWeapon(arm, f) {
  const id = f.weaponId;
  if (!id || id === 'bare' || id === 'default') return;
  const color = f.weaponColor || ({ gloves: '#e53545', bat: '#f4b441', pan: '#75879e' })[id];
  if (!color) return;
  ctx.save(); ctx.translate(arm.x, arm.y);
  if (id === 'gloves') {
    ctx.rotate(arm.a);
    const fill = ctx.createLinearGradient(0, -13, 0, 13);
    fill.addColorStop(0, shade(color, 28)); fill.addColorStop(0.5, color); fill.addColorStop(1, shade(color, -37));
    rrect(-15, -8.5, 14, 17, 4); ctx.fillStyle = shade(color, -34); ctx.fill();
    ctx.lineWidth = 2.3; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ellipse(5, -2, 14, 12.5, fill, OUTLINE, 2.5);
    ellipse(0, 8, 7.5, 5.5, color, OUTLINE, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(1, -10); ctx.quadraticCurveTo(9, -12, 13, -6); ctx.stroke();
    rrect(-13, -5, 9, 10, 2); ctx.fillStyle = '#f5efe3'; ctx.fill();
  } else {
    const extend = poseName(f) === 'punch' ? attackExt(f) : 0;
    ctx.rotate(arm.a + lerp(-0.9, 0.08, extend));
    if (id === 'bat') {
      const fill = ctx.createLinearGradient(0, -10, 0, 10);
      fill.addColorStop(0, shade(color, 34)); fill.addColorStop(0.48, color); fill.addColorStop(1, shade(color, -28));
      ctx.beginPath(); ctx.moveTo(8, -4); ctx.quadraticCurveTo(21, -5, 28, -10);
      ctx.lineTo(50, -10); ctx.quadraticCurveTo(59, -10, 59, 0); ctx.quadraticCurveTo(59, 10, 50, 10);
      ctx.lineTo(28, 10); ctx.quadraticCurveTo(21, 5, 8, 4); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.4; ctx.stroke();
      rrect(-10, -4, 26, 8, 3); ctx.fillStyle = '#343441'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#aaa8b4'; ctx.lineWidth = 1.3;
      for (let x = -6; x < 13; x += 5) { ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x + 2, 3); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.42)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(29, -6); ctx.lineTo(49, -6); ctx.stroke();
    } else if (id === 'pan') {
      rrect(-9, -5, 38, 10, 4); ctx.fillStyle = '#333540'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
      const metal = ctx.createRadialGradient(36, -9, 2, 43, 0, 25);
      metal.addColorStop(0, shade(color, 65)); metal.addColorStop(0.6, color); metal.addColorStop(1, shade(color, -43));
      ellipse(43, 0, 21, 23, metal, OUTLINE, 2.5);
      ellipse(43, 0, 16, 18, shade(color, -42), '#b6c4d2', 1.8);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(43, 0, 12, -2.7, -0.9); ctx.stroke();
      ellipse(26, 0, 2, 2, '#c3c7ce');
    }
  }
  ctx.restore();
  if (id === 'bat' || id === 'pan') hand(arm, f.look, false, false);
}

function drawFighter(f) {
  if (f.gone) return;
  const L = f.look, P = computePose(f);
  ctx.save();
  ctx.translate(f.x, f.y - f.floatY);
  if (f.scale !== 1) ctx.scale(f.scale, f.scale);
  ctx.scale(f.facing, 1);
  if (f.invuln > 0 && f.isPlayer && Math.floor(f.invuln / 4) % 2 && f.state !== 'custom') ctx.globalAlpha = 0.5;
  if (P.lying) { ctx.translate(0, -24); ctx.rotate(PI / 2); }
  if (f.aura) {
    ctx.save(); ctx.globalAlpha = 0.25 + Math.sin(f.anim * 0.3) * 0.1;
    ellipse(0, -110, 62 + Math.sin(f.anim * 0.5) * 6, 125, f.aura); ctx.restore();
  }
  ctx.translate(0, -70); ctx.rotate(P.lean); ctx.translate(0, 70);
  const hipY = -70 + P.bodyY;
  const sh = -124 + P.bodyY;
  const pants = L.pants, sleeve = L.shirt;
  const showEquipment = !P.fItem && !P.bItem && !P.bottle && !P.palms && !P.fingerF && !P.fingerB;

  // back leg + back arm
  const bLeg = limb(-9, hipY, P.bl[0], P.bl[1], 35, 35, 19, shade(pants, -22));
  sneaker(bLeg, L.shoes, true);
  if (L.backpack) {
    rrect(-38, sh - 3, 25, 58, 9); ctx.fillStyle = '#252933'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
    rrect(-36, sh + 23, 20, 22, 5); ctx.fillStyle = '#171b24'; ctx.fill();
    ctx.strokeStyle = '#535965'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#c7c7bd'; ctx.fillRect(-25, sh + 25, 2, 5);
  }
  const bArm = limb(-20, sh + 3, P.ba[0], P.ba[1], 27, 25, 15.5, shade(sleeve, -23), shade(L.skin, -17));
  if (P.bItem) drawItem(P.bItem, bArm, f);
  if (P.bottle !== 'back') hand(bArm, L, P.palms, P.fingerB, P.fingerB ? bArm.a : undefined);
  if (showEquipment && f.weaponId === 'gloves') drawEquippedWeapon(bArm, f);

  // front leg
  const fLeg = limb(9, hipY, P.fl[0], P.fl[1], 35, 35, 19, pants);
  sneaker(fLeg, L.shoes);

  // torso
  const shirtFill = ctx.createLinearGradient(-27, sh, 27, sh + 20);
  shirtFill.addColorStop(0, shade(sleeve, -25)); shirtFill.addColorStop(0.34, sleeve);
  shirtFill.addColorStop(0.7, shade(sleeve, 13)); shirtFill.addColorStop(1, shade(sleeve, -14));
  ctx.beginPath(); ctx.moveTo(-10, sh - 12); ctx.quadraticCurveTo(-21, sh - 10, -27, sh + 1);
  ctx.lineTo(-24, sh + 19); ctx.lineTo(-21, sh + 49); ctx.quadraticCurveTo(-22, sh + 58, -17, sh + 59);
  ctx.quadraticCurveTo(0, sh + 62, 19, sh + 58); ctx.lineTo(22, sh + 21); ctx.lineTo(27, sh + 2);
  ctx.quadraticCurveTo(21, sh - 10, 10, sh - 12); ctx.closePath();
  ctx.fillStyle = shirtFill; ctx.fill(); ctx.lineWidth = 2.8; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // Collar, seams and soft folds give each shirt a fitted silhouette.
  ctx.save();
  ctx.strokeStyle = shade(sleeve, -35); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-10, sh - 10); ctx.quadraticCurveTo(0, sh + 3, 10, sh - 10); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-21, sh + 3); ctx.lineTo(-17, sh + 13); ctx.moveTo(-17, sh + 54); ctx.quadraticCurveTo(0, sh + 57, 18, sh + 53); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(17, sh + 18); ctx.quadraticCurveTo(12, sh + 24, 15, sh + 29); ctx.moveTo(-18, sh + 36); ctx.lineTo(-11, sh + 41); ctx.stroke();
  ctx.restore();
  drawShirtMark(L, sh, f);
  if (L.backpack) {
    ctx.strokeStyle = '#1b1d23'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-17, sh - 6); ctx.quadraticCurveTo(-12, sh + 19, -8, sh + 51); ctx.stroke();
    ctx.strokeStyle = '#555b65'; ctx.lineWidth = 1.5; ctx.stroke();
    rrect(-12, sh + 32, 6, 8, 1.5); ctx.fillStyle = '#8c919a'; ctx.fill();
  }

  // neck + head
  rrect(-8, sh - 21, 16, 19, 5); ctx.fillStyle = L.skin; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ellipse(0, sh - 17, 7, 4, shade(L.skin, -32));
  if (!f.headless) drawHead(f, 3, sh - 12, P.headTilt);

  // front arm (drawn over the head so hands can grab cheeks etc.)
  const fArm = limb(20, sh + 3, P.fa[0], P.fa[1], 27, 25, 15.5, sleeve, L.skin);
  if (L.bracelet) { ctx.save(); ctx.translate(fArm.x - Math.cos(fArm.a) * 9, fArm.y - Math.sin(fArm.a) * 9); ctx.rotate(fArm.a); ctx.fillStyle = '#222'; ctx.fillRect(-2, -6, 4, 12); ctx.restore(); }
  if (L.watch) { ctx.save(); ctx.translate(fArm.x - Math.cos(fArm.a) * 8, fArm.y - Math.sin(fArm.a) * 8); ctx.rotate(fArm.a); ctx.fillStyle = '#3a2a1e'; ctx.fillRect(-3, -6, 6, 12); ctx.restore(); }
  if (P.bottle) drawBottle(P.bottle, fArm, bArm);
  if (P.bottle === 'hold') hand(bArm, L, true);
  if (P.fItem) drawItem(P.fItem, fArm, f);
  hand(fArm, L, P.palms, P.fingerF, P.fingerF ? fArm.a : undefined);
  if (showEquipment) drawEquippedWeapon(fArm, f);
  ctx.restore();

  // status effects drawn unmirrored
  const hy = f.y - f.floatY - (P.lying ? 60 : 230 * (1 + (f.headScale - 1) * 0.6));
  if ((poseName(f) === 'dizzy' || (f.state === 'hurt' && f.st > 30)) && !f.headless) {
    for (let i = 0; i < 3; i++) { const an = f.anim * 0.15 + i * TAU / 3; txt('★', f.x + Math.cos(an) * 30, hy + 10 + Math.sin(an) * 8, 18, '#ffe14d'); }
  }
  if (f.tilted > 0 && !f.headless) txt('TILTED', f.x, hy - 4, 16, '#ff4d4d');
  if (f.sticky > 0 && f.isPlayer) txt('STICKY', f.x, f.y + 22 > H ? f.y - 10 : f.y + 18, 13, '#e0a060');
}

function drawShirtMark(L, sh, f) {
  const m = L.shirtMark;
  ctx.save();
  if (m === 'B' || m === 'star') {
    ctx.scale(f.facing, 1);
    ellipse(0, sh + 22, 13, 13, '#fff', OUTLINE, 2);
    txt(m === 'B' ? 'B' : '★', 0, sh + 23, m === 'B' ? 20 : 18, m === 'B' ? L.shirt : '#e2b400', 'center', null);
  } else if (m === 'eye') {
    ctx.translate(0, sh + 26);
    for (let i = 0; i < 10; i++) { const an = i * TAU / 10; ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.moveTo(Math.cos(an) * 10, Math.sin(an) * 10); ctx.lineTo(Math.cos(an + 0.3) * 15, Math.sin(an + 0.3) * 15); ctx.lineTo(Math.cos(an + 0.6) * 10, Math.sin(an + 0.6) * 10); ctx.fill(); }
    ellipse(0, 0, 11, 11, '#ffd21f');
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, -8, 9, 0); ctx.quadraticCurveTo(0, 8, -9, 0); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#333'; ctx.lineWidth = 1.2; ctx.stroke();
    ellipse(0, 0, 3.6, 3.6, '#4d7fd6');
    txt('✦', -12, -18, 9, '#ff7a3d', 'center', null); txt('✦', 12, -16, 9, '#ff7a3d', 'center', null);
  } else if (m === 'knit') {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
    for (let y = sh; y < sh + 56; y += 5) { ctx.beginPath(); ctx.moveTo(-20, y); ctx.lineTo(20, y); ctx.stroke(); }
    ctx.fillStyle = shade(L.shirt, -18); ctx.beginPath(); ctx.moveTo(-10, sh - 9); ctx.lineTo(0, sh + 8); ctx.lineTo(10, sh - 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  } else if (m === 'ship') {
    ctx.translate(10, sh + 12); ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(6, 6); ctx.lineTo(4, 9); ctx.lineTo(-4, 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -6); ctx.lineTo(5, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke();
  } else if (m === 'chain') {
    ctx.strokeStyle = '#c9c9c9'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12, sh - 8); ctx.quadraticCurveTo(0, sh + 14, 12, sh - 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-9, sh - 9); ctx.quadraticCurveTo(0, sh + 2, 9, sh - 9); ctx.stroke();
  }
  ctx.restore();
}

/* A transparent photo head or native cartoon, inside the mirrored fighter transform. */
function drawHead(f, x, y, tilt) {
  const hs = (f.headScale || 1) * (Save.data.bigHead ? 1.7 : 1);
  const h = 92 * hs;
  ctx.save();
  ctx.translate(x, y - h * 0.4);
  ctx.rotate(f.headRot + tilt);
  ctx.scale(1 + f.squash * 0.6, 1 - f.squash * 0.45);
  headGraphic(f, h);
  ctx.restore();
}
function headGraphic(f, h) {
  const img = f.img;
  if (img) {
    const ih = h, iw = h * img.width / img.height;
    ctx.save(); ctx.scale(f.facing || 1, 1);
    // The alpha silhouette meets the neck directly, with no oval sticker backing.
    ctx.shadowColor = 'rgba(22,15,12,0.28)'; ctx.shadowBlur = h * 0.018; ctx.shadowOffsetY = h * 0.015;
    if (f.state === 'hurt' && f.st > 8) ctx.filter = 'brightness(1.22) saturate(0.72)';
    else if (f.tilted > 0) ctx.filter = 'saturate(1.3) sepia(0.12)';
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  } else cartoonHead(f, h);
}
function cartoonHead(f, h) {
  const L = { hair: '#2b211d', ...f.look }, rx = h * 0.36, ry = h * 0.44;
  const hurt = f.state === 'hurt' || f.state === 'ko', mad = f.state === 'attack' || f.tilted > 0;
  ellipse(-rx * 0.96, 4, rx * 0.17, ry * 0.2, shade(L.skin, -9), OUTLINE, 2.2);
  ellipse(rx * 0.96, 4, rx * 0.17, ry * 0.2, L.skin, OUTLINE, 2.2);
  ellipse(-rx * 0.97, 5, rx * 0.075, ry * 0.11, shade(L.skin, -34));
  ellipse(rx * 0.97, 5, rx * 0.075, ry * 0.11, shade(L.skin, -30));
  const skin = ctx.createRadialGradient(-rx * 0.28, -ry * 0.3, rx * 0.1, 0, ry * 0.1, ry * 1.15);
  skin.addColorStop(0, shade(L.skin, 22)); skin.addColorStop(0.65, L.skin); skin.addColorStop(1, shade(L.skin, -24));
  ctx.beginPath(); ctx.moveTo(0, -ry);
  ctx.bezierCurveTo(rx * 0.8, -ry, rx * 1.06, -ry * 0.35, rx * 0.94, ry * 0.22);
  ctx.bezierCurveTo(rx * 0.85, ry * 0.75, rx * 0.42, ry, 0, ry);
  ctx.bezierCurveTo(-rx * 0.51, ry, -rx * 0.92, ry * 0.61, -rx * 0.96, ry * 0.13);
  ctx.bezierCurveTo(-rx * 1.05, -ry * 0.47, -rx * 0.73, -ry, 0, -ry); ctx.closePath();
  ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.6; ctx.stroke();
  ellipse(-rx * 0.55, ry * 0.35, rx * 0.18, ry * 0.09, 'rgba(213,104,86,0.16)');
  ellipse(rx * 0.57, ry * 0.35, rx * 0.18, ry * 0.09, 'rgba(213,104,86,0.16)');
  ctx.fillStyle = L.hair; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  if (L.hairStyle === 'messy') {
    ctx.beginPath(); ctx.moveTo(-rx * 1.02, -ry * 0.15);
    for (let i = 0; i <= 8; i++) { const px = -rx + (i / 8) * rx * 2; const py = -ry * (0.75 + (i % 2 ? 0.45 : 0.15)) - Math.sin(i) * 3; ctx.lineTo(px, py); }
    ctx.lineTo(rx * 1.02, -ry * 0.15); ctx.quadraticCurveTo(0, -ry * 0.55, -rx * 1.02, -ry * 0.15); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-rx, -ry * 0.1); ctx.quadraticCurveTo(-rx * 0.9, -ry * 1.15, rx * 0.2, -ry * 1.05); ctx.quadraticCurveTo(rx * 1.1, -ry * 0.9, rx, -ry * 0.2);
    ctx.quadraticCurveTo(rx * 0.2, -ry * 0.75, -rx * 0.3, -ry * 0.45); ctx.quadraticCurveTo(-rx * 0.7, -ry * 0.4, -rx, -ry * 0.1); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle = shade(L.hair, 23); ctx.lineWidth = h * 0.035; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-rx * 0.67, -ry * 0.64); ctx.quadraticCurveTo(-rx * 0.2, -ry * 0.91, rx * 0.42, -ry * 0.88); ctx.stroke();
  if (L.cap) {
    ctx.fillStyle = L.cap; ctx.beginPath(); ctx.ellipse(0, -ry * 0.62, rx * 0.95, ry * 0.42, 0, PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-rx * 0.95, -ry * 0.6, rx * 0.5, ry * 0.1, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = shade(L.cap, 28); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -ry * 1.02); ctx.quadraticCurveTo(-rx * 0.15, -ry * 0.82, -rx * 0.1, -ry * 0.63); ctx.stroke();
  }
  const ey = -ry * 0.05;
  if (L.shades) {
    ctx.fillStyle = '#111'; rrect(-rx * 0.82, ey - 9, rx * 0.72, 17, 6); ctx.fill(); rrect(rx * 0.1, ey - 9, rx * 0.72, 17, 6); ctx.fill();
    ctx.fillRect(-rx * 0.15, ey - 6, rx * 0.3, 3);
    ctx.strokeStyle = '#4c6074'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-rx * 0.65, ey - 4); ctx.lineTo(-rx * 0.48, ey + 4); ctx.moveTo(rx * 0.27, ey - 4); ctx.lineTo(rx * 0.44, ey + 4); ctx.stroke();
  } else {
    for (const s of [-1, 1]) {
      if (hurt) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; const cx = s * rx * 0.42; ctx.beginPath(); ctx.moveTo(cx - 6, ey - 6); ctx.lineTo(cx + 6, ey + 6); ctx.moveTo(cx + 6, ey - 6); ctx.lineTo(cx - 6, ey + 6); ctx.stroke(); }
      else {
        ellipse(s * rx * 0.42, ey, rx * 0.22, ry * 0.18, '#fffaf2', OUTLINE, 1.8);
        ellipse(s * rx * 0.42 + rx * 0.08, ey + 1, rx * 0.09, rx * 0.105, '#383029');
        ellipse(s * rx * 0.42 + rx * 0.1, ey - ry * 0.045, rx * 0.035, rx * 0.035, '#fff');
      }
      ctx.strokeStyle = L.hair; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s * rx * 0.2, ey - ry * 0.28 + (mad ? 6 : 0)); ctx.lineTo(s * rx * 0.68, ey - ry * (mad ? 0.18 : 0.34)); ctx.stroke();
    }
  }
  ctx.strokeStyle = shade(L.skin, -46); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(rx * 0.06, ry * 0.03); ctx.quadraticCurveTo(rx * 0.25, ry * 0.26, rx * 0.07, ry * 0.28); ctx.stroke();
  const my = ry * 0.45;
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
  if (hurt) ellipse(0, my, rx * 0.2, ry * 0.15, '#5a1a1a', OUTLINE, 2.5);
  else if (mad) { rrect(-rx * 0.42, my - 6, rx * 0.84, 12, 4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-rx * 0.42, my); ctx.lineTo(rx * 0.42, my); ctx.stroke(); }
  else {
    ctx.beginPath(); ctx.moveTo(-rx * 0.45, my - 6); ctx.quadraticCurveTo(0, my + 16, rx * 0.45, my - 6); ctx.closePath(); ctx.fillStyle = '#6a1f1f'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-rx * 0.3, my - 5, rx * 0.25, 6); ctx.fillRect(rx * 0.05, my - 5, rx * 0.25, 6);
  }
  if (f.tilted > 0) { ctx.save(); ctx.globalAlpha = 0.3; ellipse(-rx * 0.55, ry * 0.25, 8, 5, '#ff3030'); ellipse(rx * 0.55, ry * 0.25, 8, 5, '#ff3030'); ctx.restore(); }
}

function drawBottle(mode, fArm, bArm) {
  ctx.save();
  if (mode === 'hold') {
    const mx = (fArm.x + bArm.x) / 2, my = (fArm.y + bArm.y) / 2, ang = Math.atan2(fArm.y - bArm.y, fArm.x - bArm.x);
    ctx.translate(mx - 4, my); ctx.rotate(ang * 0.3); bottleShape(74, 20);
  } else if (mode === 'drink') { ctx.translate(fArm.x, fArm.y); ctx.rotate(-2.4); ctx.translate(14, 0); bottleShape(46); }
  else if (mode === 'splash') { ctx.translate(fArm.x + 18, fArm.y); ctx.rotate(-0.1); bottleShape(46); }
  else if (mode === 'back') { ctx.translate(bArm.x, bArm.y); ctx.rotate(-0.3); bottleShape(40); }
  ctx.restore();
}
function bottleShape(len, th = 16) {
  rrect(-len / 2, -th / 2, len - 8, th, 7); ctx.fillStyle = '#fbfbfb'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
  rrect(len / 2 - 10, -5, 10, 10, 2); ctx.fillStyle = '#1a1a1a'; ctx.fill();
  ctx.strokeStyle = '#e8463a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-len * 0.3, -2); ctx.bezierCurveTo(-len * 0.2, -6, -len * 0.1, 3, 0, -2); ctx.bezierCurveTo(len * 0.05, -5, len * 0.1, 1, len * 0.15, -2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-len * 0.4, -5, len * 0.5, 2);
}
function jarShape(s = 1) {
  ctx.save(); ctx.scale(s, s);
  rrect(-11, -14, 22, 28, 5); ctx.fillStyle = '#e9c98f'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = '#f6f2e6'; ctx.fillRect(-10, -4, 20, 11);
  ctx.fillStyle = '#2f8f3a'; ctx.font = `bold 6px ${FONT_HEAD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SYRUP', 0, 2);
  rrect(-9, -18, 18, 6, 2); ctx.fillStyle = '#d9b200'; ctx.fill(); ctx.stroke();
  ctx.restore();
}
function slipperShape(s = 1) {
  ctx.save(); ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 8, 0, 0, TAU); ctx.fillStyle = '#2f7fe0'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(7, 0); ctx.lineTo(-6, 6); ctx.stroke();
  ctx.restore();
}
function hatShape(s = 1) {
  ctx.save(); ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, 4, 30, 9, 0, 0, TAU); ctx.fillStyle = '#9a917f'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
  rrect(-17, -14, 34, 18, 8); ctx.fillStyle = '#b5ab96'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3d3a33'; ctx.fillRect(-17, -2, 34, 5);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = -14; i < 15; i += 5) for (let j = -11; j < 0; j += 4) ctx.fillRect(i, j, 2, 2);
  ctx.restore();
}
function drawItem(item, arm, f) {
  ctx.save(); ctx.translate(arm.x, arm.y);
  if (item === 'phone') { ctx.rotate(arm.a + DOWN); rrect(-6, -16, 12, 20, 3); ctx.fillStyle = '#111'; ctx.fill(); ctx.fillStyle = '#5ab4ff'; ctx.fillRect(-4, -14, 8, 14); }
  else if (item === 'jar') { ctx.translate(Math.cos(arm.a) * 8, -6); jarShape(); }
  else if (item === 'spoon') { ctx.rotate(arm.a - 0.6); ctx.strokeStyle = '#bbb'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 0); ctx.stroke(); ellipse(22, 0, 6, 4, '#8a4a1c', '#888', 2); }
  else if (item === 'slipper') { ctx.rotate(f.anim * 0.3); slipperShape(); }
  else if (item === 'hat') { ctx.rotate(-0.2); hatShape(0.8); }
  ctx.restore();
}

/* ---------- projectiles ---------- */
const PROJ_DRAW = {
  slipper(p) { ctx.translate(p.x, p.y); ctx.rotate(p.rot); slipperShape(); },
  bigSlipper(p) { ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.t * 0.2) * 0.15); slipperShape(4); },
  excuse(p) {
    ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.t * 0.3) * 0.08);
    txt(p.text, 0, 0, 26, p.color || '#ff5a5a', 'center', OUTLINE, FONT_HEAD, 5);
  },
  hat(p) { ctx.translate(p.x, p.y); ctx.rotate(p.rot); hatShape(); },
  finger(p) {
    ctx.translate(p.x, p.y); ctx.scale(Math.sign(p.vx) || 1, 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-30 - i * 8, -8 + i * 8); ctx.lineTo(-60 - i * 8, -8 + i * 8); ctx.stroke(); }
    ellipse(-6, 0, 16, 13, '#f0c4a4', OUTLINE, 3);
    rrect(4, -5, 30, 10, 5); ctx.fillStyle = '#f0c4a4'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
  },
  jar(p) { ctx.translate(p.x, p.y); ctx.rotate(p.rot); jarShape(1.2); },
  drop(p) { ellipse(p.x, p.y, 6, 8, '#7fd0ff', '#2a6fa8', 2); },
  word(p) {
    ctx.translate(p.x, p.y);
    rrect(-p.w / 2, -p.h / 2, p.w, p.h, 6); ctx.fillStyle = '#2f6fd6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
    txt(p.text, 0, 2, 24, '#fff', 'center', null);
  },
};
function drawProjectile(p) { ctx.save(); (PROJ_DRAW[p.kind] || (() => {}))(p); ctx.restore(); }

function drawHazard(h) {
  if (h.type === 'syrup' || h.type === 'water') {
    const a = h.life ? Math.min(1, (h.life - h.t) / 60) : 1;
    ctx.save(); ctx.globalAlpha = a;
    if (h.type === 'syrup') { ellipse(h.x, GROUND + 3, h.w / 2, 9, '#7a3d12', '#4a2408', 2); ellipse(h.x - h.w * 0.15, GROUND + 1, h.w * 0.18, 3, 'rgba(255,220,150,0.6)'); }
    else { ellipse(h.x, GROUND + 3, h.w / 2, 8, 'rgba(120,200,255,0.65)', 'rgba(40,110,170,0.8)', 2); ellipse(h.x + h.w * 0.1, GROUND + 1, h.w * 0.2, 2.5, 'rgba(255,255,255,0.8)'); }
    ctx.restore();
  } else if (h.type === 'shadow') {
    ctx.save(); ctx.globalAlpha = 0.25 + (h.t / h.life) * 0.4; ellipse(h.x, GROUND + 3, 14 + h.t * 0.4, 6, '#000'); ctx.restore();
  } else if (h.type === 'wave') {
    ctx.save(); ctx.translate(h.x, GROUND);
    const dir = Math.sign(h.vx);
    ctx.scale(dir, 1);
    ctx.beginPath(); ctx.moveTo(-90, 6); ctx.quadraticCurveTo(-40, -10, -10, -45); ctx.quadraticCurveTo(20, -70, 40, -40); ctx.quadraticCurveTo(28, -40, 30, -25); ctx.quadraticCurveTo(50, -5, 60, 6); ctx.closePath();
    ctx.fillStyle = '#7a3d12'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3d1c06'; ctx.stroke();
    ellipse(-15, -38, 14, 4, 'rgba(255,220,160,0.7)');
    ctx.restore();
    txt('SYRUP!', h.x, GROUND - 90, 20, '#ffcf8a');
  }
}

function drawParticle(p) {
  const k = 1 - p.t / p.life;
  if (p.type === 'spark') ellipse(p.x, p.y, p.r * k + 0.5, p.r * k + 0.5, p.color);
  else if (p.type === 'drop') ellipse(p.x, p.y, p.r, p.r * 1.2, p.color);
  else if (p.type === 'blood') {
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 3);
    if (!p.landed) {
      ctx.strokeStyle = p.color; ctx.lineWidth = p.r * 1.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x - p.vx * 1.4, p.y - p.vy * 1.4); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ellipse(p.x, p.y, p.r * (p.landed ? 2.2 : 1), p.r * (p.landed ? 0.45 : 1.1), p.color);
    ctx.restore();
  }
  else if (p.type === 'steam') { ctx.save(); ctx.globalAlpha = 0.5 * k; ellipse(p.x, p.y, p.r, p.r, '#ff9a9a'); ctx.restore(); }
  else if (p.type === 'z') { ctx.save(); ctx.globalAlpha = k; txt('Z', p.x, p.y, 18 + p.t * 0.2, '#cfe3ff'); ctx.restore(); }
  else if (p.type === 'shard') { ctx.fillStyle = 'rgba(220,240,255,0.9)'; ctx.fillRect(p.x, p.y, 4, 4); }
  else if (p.type === 'ring') { ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = p.color || '#fff'; ctx.lineWidth = 6 * k + 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.t * p.speed, p.t * p.speed * 0.5, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  else if (p.type === 'confetti') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
  else if (p.type === 'sweat') { ellipse(p.x, p.y, 3, 5, '#9fd8ff', '#3a7fb0', 1.5); }
  else if (p.type === 'head') {
    const f = p.f;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    headGraphic({ img: f.img, look: f.look, facing: f.facing, state: 'ko', tilted: 0, anim: 0, st: 0 }, 92 * (f.headScale || 1) * (Save.data.bigHead ? 1.7 : 1));
    ctx.restore();
  }
}

function drawBubble(text, x, y, t, dur) {
  const lines = wrap(text, 200, 19);
  ctx.font = `19px ${FONT_BODY}`;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 22, h = lines.length * 21 + 14;
  const pop = Math.min(1, (dur - t) / 6 + 0.4);
  const bx = clamp(x - w / 2, 6, W - w - 6), by = clamp(y - h, 90, H - h - 10);
  ctx.save();
  ctx.translate(bx + w / 2, by + h); ctx.scale(pop, pop); ctx.translate(-(bx + w / 2), -(by + h));
  rrect(bx, by, w, h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
  const tx = clamp(x, bx + 14, bx + w - 14);
  ctx.beginPath(); ctx.moveTo(tx - 8, by + h - 2); ctx.lineTo(tx, by + h + 12); ctx.lineTo(tx + 8, by + h - 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(tx - 8, by + h); ctx.lineTo(tx, by + h + 12); ctx.lineTo(tx + 8, by + h); ctx.stroke();
  lines.forEach((l, i) => txt(l, bx + w / 2, by + 18 + i * 21, 19, '#111', 'center', null, FONT_BODY));
  ctx.restore();
}
function bubbleAnchor(f) {
  if (f.benched) return { x: f.x < 0 ? 60 : W - 60, y: GROUND - 230 };
  const hs = (f.headScale || 1) * (Save.data.bigHead ? 1.7 : 1);
  if (f.lying) return { x: f.x + f.facing * 160, y: f.y - 75 };
  return { x: f.x, y: f.y - f.floatY - (140 + 92 * hs) * f.scale - 12 };
}

/* portrait: a head on its own, for menus and dialogue */
function portrait(key, x, y, h, rot = 0, dim = false) {
  const isP = key === 'p' || key === 'player';
  const c = isP ? PLAYER : CHARACTERS[key];
  const f = { img: IMG[isP ? 'player' : key] || null, look: c.look, facing: 1, state: 'idle', tilted: 0, anim: G.sceneT, st: 0 };
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (dim) ctx.globalAlpha = 0.45;
  if (f.img) {
    const halo = ctx.createRadialGradient(0, -h * 0.08, h * 0.05, 0, 0, h * 0.5);
    halo.addColorStop(0, shade(c.look.shirt, 24)); halo.addColorStop(1, shade(c.look.shirt, -40));
    ellipse(0, h * 0.025, h * 0.43, h * 0.47, halo, 'rgba(255,255,255,0.25)', Math.max(1.3, h * 0.014));
  }
  headGraphic(f, h);
  ctx.restore();
}

/* ---------- HUD ---------- */
function hpBar(x, y, w, h, f, rtl) {
  const pct = clamp(f.hp / f.maxHp, 0, 1), lag = clamp(f.hpLag / f.maxHp, 0, 1);
  rrect(x - 3, y - 3, w + 6, h + 6, 6); ctx.fillStyle = OUTLINE; ctx.fill();
  ctx.fillStyle = '#5a0d0d'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fff';
  if (rtl) ctx.fillRect(x + w - w * lag, y, w * lag, h); else ctx.fillRect(x, y, w * lag, h);
  const grad = ctx.createLinearGradient(0, y, 0, y + h); grad.addColorStop(0, pct > 0.3 ? '#fff27a' : '#ff8a5c'); grad.addColorStop(1, pct > 0.3 ? '#e8b400' : '#d6331f');
  ctx.fillStyle = grad;
  if (rtl) ctx.fillRect(x + w - w * pct, y, w * pct, h); else ctx.fillRect(x, y, w * pct, h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y + 2, w, 3);
}
function drawHUD() {
  const p = G.player;
  txt(p.name, 22, 14, 22, '#fff', 'left');
  if (Save.data.baby) txt('BABY MODE', 80, 14, 17, '#ff8ad8', 'left');
  hpBar(20, 28, 370, 22, p, false);
  rrect(18, 58, 234, 14, 5); ctx.fillStyle = OUTLINE; ctx.fill();
  const mc = p.meter >= 100 ? (Math.floor(G.sceneT / 6) % 2 ? '#ff4df0' : '#ffe14d') : '#4dc3ff';
  ctx.fillStyle = mc; ctx.fillRect(20, 60, 230 * p.meter / 100, 10);
  ctx.fillStyle = '#fff'; ctx.fillRect(20 + 230 * 0.3, 60, 2, 10);
  txt(p.meter >= 100 ? (IS_TOUCH ? 'SUPER READY!' : 'MOM READY! [L]') : p.meter >= 30 ? (IS_TOUCH ? 'SPECIAL READY' : 'SLIPPER [L]') : 'METER', 258, 66, 15, p.meter >= 100 ? '#ff8af0' : '#bfe9ff', 'left');

  const es = G.enemies;
  if (es.length === 1) { txt(es[0].name, W - 22, 14, 22, '#fff', 'right'); hpBar(W - 390, 28, 370, 22, es[0], true); }
  else es.forEach((e, i) => {
    const y = 26 + i * 32;
    txt(e.name + (e.benched ? '  (TAGGED OUT)' : e.hp <= 0 ? '  (K.O.)' : ''), W - 22, y - 9, 16, e.hp <= 0 ? '#888' : '#fff', 'right');
    hpBar(W - 390, y, 370, 13, e, true);
  });

  ellipse(W / 2, 40, 31, 31, '#1d1d1d', '#ffe14d', 3);
  txt(String(Math.max(0, Math.ceil(G.timer / 60))), W / 2, 42, 34, G.timer < 600 && G.sceneT % 30 < 15 ? '#ff5a5a' : '#fff');
  txt(`${G.chapter.title}  -  ${G.level.name}`, W / 2, 86, 15, '#ffe14d');

  if (G.combo >= 2) {
    let title = '';
    for (const [n, tt] of COMBO_TITLES) if (G.combo >= n) title = tt;
    const pop = 1 + Math.max(0, (G.comboT - 80) / 10) * 0.3;
    ctx.save(); ctx.translate(24, 108); ctx.scale(pop, pop);
    txt(`${G.combo} HITS`, 0, 0, 32, '#ffe14d', 'left'); txt(title, 0, 28, 20, '#ff6b3d', 'left');
    ctx.restore();
  }
  if (G.hint && G.phase === 'fight') {
    const hk = G.hint, pop = hk.t < 6 ? 0.6 + hk.t * 0.07 : 1;
    ctx.font = `24px ${FONT_HEAD}`;
    const w = ctx.measureText(hk.text).width + 40;
    ctx.save(); ctx.translate(W / 2, H - 31); ctx.scale(pop, pop);
    rrect(-w / 2, -19, w, 38, 10); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
    txt(hk.text, 0, 1, 24, OUTLINE, 'center', null);
    ctx.restore();
  } else if (G.level.mods.tutorial && G.phase === 'fight' && G.t < 900) {
    const s = IS_TOUCH ? 'Move close, then use PUNCH. Hold BLOCK when they attack.'
      : 'MOVE CLOSE + LEFT CLICK TO PUNCH    H: ALL CONTROLS';
    rrect(W / 2 - 330, H - 46, 660, 32, 10); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
    txt(s, W / 2, H - 29, 17, '#fff', 'center', null, FONT_BODY);
  }
}

function drawBanner() {
  const b = G.banner; if (!b) return;
  const k = b.t / b.dur;
  const s = b.t < 8 ? 2.2 - b.t * 0.15 : 1;
  const a = k > 0.85 ? (1 - k) / 0.15 : 1;
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
  ctx.translate(W / 2, H * 0.4); ctx.scale(s, s); ctx.rotate(-0.04);
  const size = b.big ? 110 : b.small ? 30 : 70;
  txt(b.text, 0, 0, size, b.big ? '#ff4d4d' : '#ffe14d', 'center', OUTLINE, FONT_HEAD, size / 6);
  if (b.sub) txt(b.sub, 0, size * 0.75, 30, '#fff');
  ctx.restore();
}

function drawPolaroid() {
  const p = G.polaroid; if (!p) return;
  const slide = Math.min(1, p.t / 12), fade = p.t > p.dur - 20 ? (p.dur - p.t) / 20 : 1;
  ctx.save(); ctx.globalAlpha = fade;
  ctx.translate(W - 150 + (1 - slide) * 300, H - 135); ctx.rotate(p.rot);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-127, -92, 262, 200);
  ctx.fillStyle = '#fbfaf5'; ctx.fillRect(-132, -98, 262, 200);
  ctx.drawImage(p.img, -121, -87, 240, 135);
  txt(p.caption, -1, 72, 24, '#222', 'center', null, FONT_BODY);
  ctx.restore();
}

/* =====================================================================
   SCENES
   ===================================================================== */
function drawStripes(c1, c2, speed = 0.5) {
  ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(G.sceneT * 0.002 * speed);
  ctx.fillStyle = c2;
  for (let i = 0; i < 16; i++) { ctx.rotate(TAU / 16); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -90); ctx.lineTo(900, 90); ctx.closePath(); if (i % 2) ctx.fill(); }
  ctx.restore();
}

Scenes.title = {
  enter() { this.b = 0; Sound.play('title'); },
  update() {
    if (Input.pressed.baby) {
      if (++this.b >= 5) { this.b = 0; Save.data.bigHead = !Save.data.bigHead; Save.write(); Sound.fx.boing(); toast(Save.data.bigHead ? 'BIG HEAD MODE: ON' : 'BIG HEAD MODE: OFF'); }
    }
    if (Input.pressed.confirm || G.click) { Sound.init(); Sound.fx.select(); setScene('lobby'); }
  },
  draw() {
    drawStripes('#ff5a36', '#ff7a45');
    const keys = ['p', ...Object.keys(CHARACTERS)];
    keys.forEach((k, i) => {
      const x = 95 + i * (W - 190) / Math.max(1, keys.length - 1), y = 420 + Math.sin(G.sceneT * 0.08 + i) * 14;
      portrait(k, x, y, Math.min(120, 720 / keys.length), Math.sin(G.sceneT * 0.05 + i * 2) * 0.15);
    });
    ctx.save(); ctx.translate(W / 2, 135); ctx.rotate(-0.05 + Math.sin(G.sceneT * 0.03) * 0.02);
    txt('BITON', 0, 0, 130, '#ffe14d', 'center', OUTLINE, FONT_HEAD, 16);
    txt('THE RECKONING', 0, 85, 52, '#fff', 'center', OUTLINE, FONT_HEAD, 9);
    ctx.restore();
    txt(TITLE_JOKES[Math.floor(G.sceneT / 180) % TITLE_JOKES.length], W / 2, 262, 24, '#fff', 'center', OUTLINE, FONT_BODY, 5);
    if (G.sceneT % 60 < 42) txt(IS_TOUCH ? 'TAP TO START' : 'PRESS ENTER TO START', W / 2, 315, 34, '#fff');
    if (Save.data.bigHead) txt('BIG HEAD MODE', W - 20, H - 18, 18, '#ffe14d', 'right');
    txt(IS_TOUCH ? 'Use Sound to mute or unmute' : 'M: sound on/off', 20, H - 18, 16, '#fff', 'left', OUTLINE, FONT_BODY, 4);
  },
};

Scenes.lobby = {
  enter() { if (typeof Lobby !== 'undefined') Lobby.show(); Sound.play('title'); },
  update() { if (Input.pressed.back) setScene('title'); },
  draw() {},
};

Scenes.map = {
  enter() { this.sel = Math.min(Save.data.unlocked, TOTAL_ROUNDS - 1); Sound.play('title'); },
  update() {
    const P = Input.pressed, max = Math.min(Save.data.unlocked, TOTAL_ROUNDS - 1);
    const cur = roundFromIndex(this.sel);
    if (P.right) { this.sel = Math.min(max, this.sel + 1); Sound.fx.move(); }
    if (P.left) { this.sel = Math.max(0, this.sel - 1); Sound.fx.move(); }
    if (P.down && cur.ci < CHAPTERS.length - 1) { this.sel = Math.min(max, roundIndex(cur.ci + 1, Math.min(cur.li, ROUNDS[cur.ci + 1] - 1))); Sound.fx.move(); }
    if (P.up && cur.ci > 0) { this.sel = roundIndex(cur.ci - 1, Math.min(cur.li, ROUNDS[cur.ci - 1] - 1)); Sound.fx.move(); }
    if (P.baby) { Save.data.baby = !Save.data.baby; Save.write(); Sound.fx.select(); toast(Save.data.baby ? 'BABY MODE ON. No shame.' : 'BABY MODE OFF. Respect.'); }
    if (P.back || P.pause) { setScene('lobby'); return; }
    if (P.confirm) { const r = roundFromIndex(this.sel); Sound.fx.select(); startLevel(r.ci, r.li); }
  },
  draw() {
    drawStripes('#26355e', '#2d3f70', 0.3);
    txt('PICK YOUR ROUND', W / 2, 46, 46, '#ffe14d');
    const max = Save.data.unlocked;
    const rowStep = Math.min(98, 380 / CHAPTERS.length);
    CHAPTERS.forEach((ch, c) => {
      const y = 108 + c * rowStep;
      rrect(30, y - rowStep * 0.42, W - 60, rowStep * 0.86, 14); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      const locked = roundIndex(c, 0) > max;
      ch.bosses.forEach((k, i) => portrait(k, 80 + i * 44, y + 2, Math.min(70, rowStep * 0.74), -0.08 + i * 0.16, locked));
      txt(ch.title, 175, y - 13, 20, '#ffe14d', 'left');
      txt(ch.subtitle, 175, y + 13, 24, locked ? '#aaa' : '#fff', 'left');
      if (locked) txt(`Beat ${CHAPTERS[c - 1].bosses.map(k => CHARACTERS[k].name).join(' & ')} first`, 345, y + 13, 14, '#bbb', 'left', OUTLINE, FONT_BODY, 3);
      ch.levels.forEach((lv, l) => {
        const g = roundIndex(c, l), x = 560 + l * 140;
        const isSel = g === this.sel, done = g < max, open = g <= max;
        const r = isSel ? 25 + Math.sin(G.sceneT * 0.2) * 2 : 22;
        ellipse(x, y - 8, r, r, done ? '#ffd23f' : open ? '#ff5a36' : '#555', isSel ? '#fff' : OUTLINE, isSel ? 5 : 3);
        txt(done ? '★' : open ? String(l + 1) : '?', x, y - 6, 26, done ? OUTLINE : '#fff', 'center', done ? null : OUTLINE);
        txt(open ? lv.name : 'LOCKED', x, y + 27, 13, open ? '#fff' : '#888');
        if (open) G.buttons.push({ x: x - 68, y: y - rowStep * 0.42, w: 136, h: rowStep * 0.86, act: 'level', g });
      });
    });
    button(30, H - 52, 300, 40, `BABY MODE: ${Save.data.baby ? 'ON' : 'OFF'}${IS_TOUCH ? '' : '  [B]'}`, 'baby', Save.data.baby, 20);
    button(W - 230, H - 52, 200, 40, IS_TOUCH ? 'LOBBY' : 'LOBBY  [ESC]', 'back', false, 20);
    if (Save.data.beaten) txt('CHAMPION OF THE FRIEND GROUP', W / 2, H - 32, 22, '#ffe14d');
    else txt(IS_TOUCH ? 'TAP A ROUND' : 'ARROWS + ENTER', W / 2, H - 32, 20, '#fff');
  },
  click(b) { if (b.act === 'level') { const r = roundFromIndex(b.g); this.sel = b.g; Sound.fx.select(); startLevel(r.ci, r.li); return true; } return false; },
};

Scenes.intro = {
  enter() {
    const ch = CHAPTERS[G.ci], lv = ch.levels[G.li];
    lv.mods = lv.mods || {};
    G.chapter = ch; G.level = lv;
    this.beats = [];
    if (G.li === 0) this.beats.push({ card: 'chapter' });
    this.beats.push({ card: 'level' });
    lv.intro.forEach(([who, text]) => this.beats.push({ who, text }));
    this.i = 0; this.startBeat();
    Sound.play(lv.music || ch.music);
  },
  startBeat() {
    this.chars = 0; this.bt = 0;
    const b = this.beats[this.i];
    if (b && b.who && CHARACTERS[b.who] && CHARACTERS[b.who].voice) Sound.say(b.text, CHARACTERS[b.who].voice);
  },
  next() { this.i++; if (this.i >= this.beats.length) setScene('fight'); else this.startBeat(); },
  update() {
    const b = this.beats[this.i], go = Input.pressed.confirm || G.click;
    this.bt++;
    if (Input.pressed.back || Input.pressed.pause) { setScene('fight'); return; }
    if (b.card) { if (this.bt > 110 || (go && this.bt > 15)) this.next(); return; }
    this.chars = Math.min(b.text.length, this.chars + 1.3);
    if (go) { if (this.chars < b.text.length) this.chars = b.text.length; else this.next(); }
  },
  draw() {
    const lv = G.level, ch = G.chapter, b = this.beats[this.i];
    drawStage(lv);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
    if (b.card) {
      const s = Math.min(1, this.bt / 12);
      ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(s, s); ctx.rotate(-0.04);
      if (b.card === 'chapter') {
        ch.bosses.forEach((k, i) => portrait(k, (i - (ch.bosses.length - 1) / 2) * 170, -40, 170, Math.sin(this.bt * 0.1 + i) * 0.1));
        txt(ch.title, 0, 95, 40, '#fff'); txt(ch.subtitle, 0, 150, 72, '#ffe14d', 'center', OUTLINE, FONT_HEAD, 11);
      } else { txt(`${ch.subtitle}  -  ROUND ${G.li + 1} OF ${ch.levels.length}`, 0, 0, 48, '#fff'); txt(lv.name, 0, 70, 80, '#ffe14d', 'center', OUTLINE, FONT_HEAD, 12); }
      ctx.restore();
      return;
    }
    const enemiesHere = [...new Set([...lv.enemies, ...(lv.bystander ? [lv.bystander] : [])])];
    const talkBob = Math.sin(this.bt * 0.5) * 4;
    portrait('p', 170, 230 + (b.who === 'p' ? talkBob : 0), 210, -0.05, b.who !== 'p');
    enemiesHere.forEach((k, i) => portrait(k, W - 170 - i * 170, 225 + (b.who === k ? talkBob : 0), 210, 0.05, b.who !== k));
    rrect(40, 365, W - 80, 150, 16); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; ctx.stroke();
    const name = b.who === 'n' ? '' : b.who === 'p' ? PLAYER.name : CHARACTERS[b.who].name;
    if (name) { const nx = b.who === 'p' ? 70 : W - 70 - Math.min(380, name.length * 15); rrect(nx, 345, Math.min(380, name.length * 15) + 20, 38, 10); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.stroke(); txt(name, nx + 10, 365, 24, OUTLINE, 'left', null); }
    const shown = b.text.slice(0, Math.floor(this.chars));
    const lines = wrap(shown, W - 140, 28);
    lines.forEach((l, i) => txt(l, b.who === 'n' ? W / 2 : 70, 412 + i * 32, 28, b.who === 'n' ? '#555' : '#111', b.who === 'n' ? 'center' : 'left', null, FONT_BODY));
    if (this.chars >= b.text.length && this.bt % 40 < 26) txt('▼', W - 70, 495, 22, '#ff5a36', 'center', null);
    txt(IS_TOUCH ? 'Tap to continue' : 'ENTER: next   ESC: skip', W - 50, 25, 16, '#fff', 'right', OUTLINE, FONT_BODY, 4);
    if (IS_TOUCH) button(W - 190, H - 62, 160, 42, 'SKIP INTRO', 'back', false, 20);
  },
};

Scenes.fight = {
  enter() { startFight(); },
  update() {
    if (G.phase === 'result') { clearCombatInput(G.player); G.phaseT++; resultInput(); updateFx(); return; }
    if (Input.pressed.pause && !G.paused && ['intro', 'fight'].includes(G.phase)) { clearAllInput(); G.paused = true; G.pauseT = 0; G.pauseReason = ''; Sound.fx.select(); return; }
    if (G.paused) {
      clearCombatInput(G.player);
      G.pauseT++;
      if (Input.pressed.back && G.pauseT > 2) { G.paused = false; setScene('map'); }
      else if (Input.pressed.confirm || Input.pressed.pause) { G.paused = false; G.pauseReason = ''; clearAllInput(); }
      return;
    }
    G.phaseT++;
    if (G.phase === 'intro') {
      if (G.phaseT === 80) { G.banner = { text: 'YALLA! FIGHT!', t: 0, dur: 60 }; Sound.fx.beepHi(); Sound.say('Fight!', ANNOUNCER); }
      if (G.phaseT >= 115) G.phase = 'fight';
    }
    if (G.phase === 'fight') captureCombatInput(G.player);
    else clearCombatInput(G.player);
    if (G.hitstop > 0) G.hitstop--;
    else { G.slowAcc += G.slowmo; while (G.slowAcc >= 1) { G.slowAcc -= 1; simStep(); } }
    updateFx();
    if (G.phase === 'ko' && G.phaseT > 150) { G.phase = 'result'; G.phaseT = 0; setupResult(); }
  },
  draw() { drawFight(); },
  click(b) { return false; },
};

function drawFight() {
  const lv = G.level;
  ctx.save();
  if (G.shake) ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
  drawStage(lv);
  for (const h of G.hazards) drawHazard(h);
  if (G.bystander) { drawShadow(G.bystander, 0.72); drawFighter(G.bystander); }
  const all = [...G.enemies, G.player];
  for (const f of all) if (f.active && !f.gone) drawShadow(f, 1);
  for (const o of G.props) { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); bottleShape(46); ctx.restore(); }
  for (const f of G.enemies) if (f.state === 'ko' || f.lying) drawFighter(f);
  for (const f of G.enemies) if (f.active && f.state !== 'ko' && !f.lying) drawFighter(f);
  drawFighter(G.player);
  for (const e of G.enemies) if (e.benched && e.hp > 0) drawBenchPeek(e);
  for (const p of G.projectiles) drawProjectile(p);
  for (const p of G.particles) drawParticle(p);
  if (STAGE_OVERLAY[lv.stage]) STAGE_OVERLAY[lv.stage](lv);
  for (const f of all) if (f.action && ACTIONS[f.action.name].draw) ACTIONS[f.action.name].draw(f, f.action);
  for (const t of G.texts) {
    const k = t.t / t.dur, s = t.t < 6 ? 0.5 + t.t * 0.15 : 1;
    ctx.save(); ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; ctx.translate(t.x, t.y - t.t * 0.8); ctx.rotate(t.rot); ctx.scale(s, s);
    txt(t.text, 0, 0, t.size, t.color); ctx.restore();
  }
  for (const f of [...all, G.bystander]) if (f && f.bubble && !f.gone) { const a = bubbleAnchor(f); drawBubble(f.bubble.text, a.x, a.y, f.bubble.t, f.bubble.dur); }
  ctx.restore();
  if (G.dim > 0) { ctx.fillStyle = `rgba(0,0,30,${0.5 * G.dim})`; ctx.fillRect(0, 0, W, H); }
  drawHUD();
  drawBanner();
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, G.flash)})`; ctx.fillRect(0, 0, W, H); }
  if (G.blind > 0) { ctx.fillStyle = `rgba(255,255,248,${Math.min(0.96, G.blind / 70)})`; ctx.fillRect(0, 0, W, H); if (G.blind > 40) txt('MY EYES!!', W / 2, H / 2, 60, '#ff5a5a'); }
  drawPolaroid();
  if (G.paused) drawPause();
  if (G.phase === 'result') drawResult();
}
function drawShadow(f, s) {
  const lift = (GROUND - f.y) + f.floatY;
  ctx.save(); ctx.globalAlpha = 0.28 * Math.max(0.3, 1 - lift / 250);
  ellipse(f.x + (f.lying ? f.facing * 105 : 0), (f.scale !== 1 ? f.y : GROUND) + 3, (f.lying ? 115 : 34) * s * Math.max(0.5, 1 - lift / 300), 7 * s, '#000');
  ctx.restore();
}
function drawBenchPeek(e) {
  const left = e.x < 0, x = left ? 18 : W - 18, y = GROUND - 175 + Math.sin(e.anim * 0.05) * 6;
  ctx.save(); ctx.translate(x, y); ctx.rotate(left ? 0.35 : -0.35);
  headGraphic({ img: e.img, look: e.look, facing: left ? 1 : -1, state: 'idle', tilted: 0, anim: e.anim, st: 0 }, 80);
  ctx.restore();
  txt(`${Math.round(e.hp / e.maxHp * 100)}%`, left ? 50 : W - 50, y - 55, 16, '#7dff6b');
}
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
  txt('PAUSED', W / 2, 110, 80, '#ffe14d');
  const lines = IS_TOUCH
    ? ['Hold LEFT / RIGHT to move close', 'Tap PUNCH or KICK. Hold BLOCK to defend.', 'JUMP avoids low attacks', 'SPECIAL uses 30 meter. At 100: CALL HIS MOM', 'TAUNT fills your meter', G.pauseReason === 'interrupted' ? 'Fight paused while you were away. Tap RESUME when ready.' : 'HELP explains controls. SOUND mutes or unmutes.']
    : ['A / D  or  ARROWS: move', 'W / SPACE: jump      S: block', 'LEFT CLICK / J: punch      K: kick', 'L: slipper (costs 30% meter). At 100%: CALL HIS MOM', 'T: taunt (fills meter, makes him TILTED)', G.pauseReason === 'interrupted' ? 'Paused while you were away. Press P or choose RESUME.' : 'H: help      M: sound on/off'];
  lines.forEach((l, i) => txt(l, W / 2, 190 + i * 36, 24, '#fff', 'center', OUTLINE, FONT_BODY, 4));
  button(W / 2 - 250, 430, 230, 50, IS_TOUCH ? 'RESUME' : 'RESUME [P]', 'confirm', true);
  button(W / 2 + 20, 430, 230, 50, IS_TOUCH ? 'QUIT FIGHT' : 'QUIT [ESC]', 'back');
}
function drawResult() {
  const d = G.resultData; if (!d) return;
  const k = Math.min(1, G.phaseT / 20);
  ctx.fillStyle = `rgba(0,0,0,${0.6 * k})`; ctx.fillRect(0, 0, W, H);
  const boss = G.enemies[0];
  if (d.coinReward != null) txt(`+${d.coinReward} COINS`, W / 2, 138, 27, '#ffe14d');
  else if (d.rewardSaveFailed) txt('COINS COULD NOT BE SAVED - CHECK BROWSER STORAGE', W / 2, 138, 22, '#ffb48a');
  if (G.result === 'win') {
    ctx.save(); ctx.translate(W / 2, 90); ctx.scale(k, k); txt('YOU WIN!', 0, 0, 90, '#ffe14d', 'center', OUTLINE, FONT_HEAD, 14); ctx.restore();
    ellipse(190, 250, 70, 70, '#ff5a36', '#fff', 6);
    txt(d.rank, 190, 255, 100, '#fff');
    txt(d.rankText, 190, 345, 22, '#ffe14d');
    portrait(boss.key, 420, 250, 120, Math.sin(G.phaseT * 0.2) * 0.2);
    drawBubble(`"${d.line}"`, 640, 215, 0, 100);
    txt(`TIME ${d.time}s     HP LEFT ${d.hp}     BEST COMBO ${d.combo}     TAUNTS ${d.taunts}`, W / 2, 395, 22, '#fff', 'center', OUTLINE, FONT_BODY, 4);
    if (G.phaseT > 40) {
      const last = G.li >= G.chapter.levels.length - 1;
      button(W / 2 - 260, 440, 250, 54, (last ? 'ROAST TIME!' : 'NEXT ROUND') + (IS_TOUCH ? '' : ' [ENTER]'), 'confirm', true);
      button(W / 2 + 10, 440, 250, 54, IS_TOUCH ? 'LOBBY' : 'LOBBY [ESC]', 'back');
    }
  } else {
    ctx.save(); ctx.translate(W / 2, 90); ctx.scale(k, k); txt('YOU LOSE...', 0, 0, 86, '#ff5a5a', 'center', OUTLINE, FONT_HEAD, 14); ctx.restore();
    portrait(boss.key, 260, 245, 150, Math.sin(G.phaseT * 0.15) * 0.15);
    drawBubble(`"${d.line}"`, 560, 215, 0, 100);
    txt(d.tip, W / 2, 360, 26, '#fff', 'center', OUTLINE, FONT_BODY, 5);
    if (G.phaseT > 40) {
      if (d.offerBaby) {
        button(W / 2 - 390, 430, 250, 54, IS_TOUCH ? 'RETRY' : 'RETRY [ENTER]', 'confirm', true);
        button(W / 2 - 125, 430, 250, 54, IS_TOUCH ? 'BABY MODE' : 'BABY MODE [B]', 'baby');
        button(W / 2 + 140, 430, 250, 54, IS_TOUCH ? 'LOBBY' : 'LOBBY [ESC]', 'back');
        txt('(baby mode: they hit half as hard. we won\'t tell anyone.)', W / 2, 505, 18, '#ff8ad8', 'center', OUTLINE, FONT_BODY, 3);
      } else {
        button(W / 2 - 260, 440, 250, 54, IS_TOUCH ? 'RETRY' : 'RETRY [ENTER]', 'confirm', true);
        button(W / 2 + 10, 440, 250, 54, IS_TOUCH ? 'LOBBY' : 'LOBBY [ESC]', 'back');
      }
    }
  }
}

Scenes.roast = {
  enter() { this.sel = 0; this.chosen = -1; this.t = 0; this.hurt = 0; this.target = 0; Sound.play('victory'); },
  update() {
    const P = Input.pressed, opts = G.chapter.roast.options;
    if (this.chosen < 0) {
      if (P.up) { this.sel = (this.sel + opts.length - 1) % opts.length; Sound.fx.move(); }
      if (P.down) { this.sel = (this.sel + 1) % opts.length; Sound.fx.move(); }
      let pickIdx = P.confirm ? this.sel : P.opt1 ? 0 : P.opt2 ? 1 : P.opt3 ? 2 : -1;
      if (pickIdx >= 0 && pickIdx < opts.length) this.choose(pickIdx);
    } else {
      this.t++;
      this.hurt = Math.min(this.target, this.hurt + 1.5);
      if (this.t === 70) Sound.fx.boing();
      if (this.t > 90 && (P.confirm || G.click)) this.next();
    }
  },
  choose(i) { this.chosen = i; this.sel = i; this.t = 0; this.target = Math.round(rand(82, 113)); Sound.fx.crowd(); },
  next() {
    Sound.fx.select();
    if (G.ci < CHAPTERS.length - 1) setScene('lobby');
    else { Save.data.beaten = true; Save.write(); setScene('credits'); }
  },
  click(b) { if (b.act === 'roast' && this.chosen < 0) { this.choose(b.i); return true; } return false; },
  draw() {
    drawStripes('#7a1fa2', '#8e2bbd', 0.6);
    const ch = G.chapter, opts = ch.roast.options;
    txt('ROAST TIME!', W / 2, 50, 64, '#ffe14d', 'center', OUTLINE, FONT_HEAD, 10);
    const shakeAmt = this.chosen >= 0 && this.t > 20 && this.t < 70 ? 6 : 0;
    ch.bosses.forEach((k, i) => portrait(k, W - 140 - i * 150 + rand(-shakeAmt, shakeAmt), 190, 170, Math.sin(G.sceneT * 0.05 + i) * 0.1));
    portrait('p', 130, 190, 150, -0.08);
    if (this.chosen < 0) {
      txt('Pick your roast:', 300, 120, 28, '#fff', 'left', OUTLINE, FONT_BODY, 5);
      opts.forEach((o, i) => {
        const y = 300 + i * 68, sel = i === this.sel;
        rrect(70, y, W - 140, 56, 12); ctx.fillStyle = sel ? '#ffe14d' : 'rgba(0,0,0,0.5)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = sel ? OUTLINE : '#ffe14d'; ctx.stroke();
        txt(`${i + 1}. ${o[0]}`, 90, y + 29, 24, sel ? '#111' : '#fff', 'left', null, FONT_BODY);
        G.buttons.push({ x: 70, y, w: W - 140, h: 56, act: 'roast', i });
      });
    } else {
      const o = opts[this.chosen];
      drawBubble(o[0], 360, 175, 0, 100);
      if (this.t > 45) drawBubble(o[1], W - 300, 110, 0, 100);
      txt('FEELINGS HURT', W / 2, 330, 32, '#fff');
      rrect(W / 2 - 250, 355, 500, 34, 8); ctx.fillStyle = OUTLINE; ctx.fill();
      ctx.fillStyle = this.hurt > 100 ? '#ff4df0' : '#ff5a36'; ctx.fillRect(W / 2 - 246, 359, 492 * Math.min(1, this.hurt / 100), 26);
      txt(`${Math.round(this.hurt)}%`, W / 2, 373, 26, '#fff');
      if (this.hurt >= this.target && this.target > 100) txt('CRITICAL ROAST!', W / 2, 425, 48, '#ffe14d');
      if (this.t > 90) txt(IS_TOUCH ? 'TAP TO CONTINUE' : 'ENTER TO CONTINUE', W / 2, 495, 26, '#fff');
    }
  },
};

Scenes.credits = {
  enter() { Sound.play('victory'); this.y = H + 20; G.particles = []; },
  update() {
    this.y -= 0.9;
    if (G.sceneT % 90 === 0) confettiFx(25);
    updateFx();
    if ((Input.pressed.confirm || G.click) && G.sceneT > 60) setScene('title');
    if (this.y < -CREDITS.length * 44 - 40) setScene('title');
  },
  draw() {
    drawStripes('#13203f', '#18284e', 0.3);
    for (const p of G.particles) drawParticle(p);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H - 118); ctx.clip();
    CREDITS.forEach((l, i) => {
      const y = this.y + i * 44; if (y < -30 || y > H + 30) return;
      const big = i === 0 || l === 'THE END';
      txt(l, W / 2, y, big ? 52 : 26, big ? '#ffe14d' : '#fff', 'center', OUTLINE, big ? FONT_HEAD : FONT_BODY, big ? 8 : 4);
    });
    ctx.restore();
    const cast = [...Object.keys(CHARACTERS), 'p'];
    cast.forEach((k, i) => {
      const x = 90 + i * (W - 180) / Math.max(1, cast.length - 1), y = H - 60 + Math.abs(Math.sin(G.sceneT * 0.12 + i)) * -30;
      portrait(k, x, y, 80, Math.sin(G.sceneT * 0.12 + i) * 0.3);
    });
  },
};

/* =====================================================================
   MAIN LOOP
   ===================================================================== */
function update() {
  if (controlsHelp?.open) { Input.clear(); G.click = null; return; }
  if (Input.pressed.help) { openControlsHelp(); return; }
  G.sceneT++;
  if (G.click) {
    const b = G.buttons.find(b => G.click.x >= b.x && G.click.x <= b.x + b.w && G.click.y >= b.y && G.click.y <= b.y + b.h);
    if (b) {
      G.clickUsed = true;
      if (!(G.scene.click && G.scene.click(b))) Input.pressed[b.act] = true;
    }
  }
  if (Input.pressed.mute) toast(Sound.toggleMute() ? 'SOUND OFF' : 'SOUND ON');
  G.scene.update();
  syncTouchControls();
  if (G.toast && ++G.toast.t > 120) G.toast = null;
}
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  G.buttons = [];
  G.scene.draw();
  if (G.toast) { const a = G.toast.t > 100 ? (120 - G.toast.t) / 20 : 1; ctx.save(); ctx.globalAlpha = a; rrect(W / 2 - 200, 100, 400, 46, 12); ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill(); txt(G.toast.text, W / 2, 124, 26, '#ffe14d'); ctx.restore(); }
}
let lastT = 0, acc = 0;
function frame(now) {
  if (!lastT) lastT = now;
  acc += Math.min(100, now - lastT); lastT = now;
  let n = 0;
  while (acc >= 1000 / 60) {
    update(); Input.clear(); G.click = null; G.clickUsed = false;
    acc -= 1000 / 60;
    if (++n > 4) { acc = 0; break; }
  }
  draw();
  requestAnimationFrame(frame);
}

function boot() {
  resize(); Save.load();
  if (typeof Progression !== 'undefined') Progression.init(Save);
  if (typeof Lobby !== 'undefined') Lobby.mount();
  const params = new URLSearchParams(location.search);
  G.debug.god = params.has('god'); G.debug.freezeTimer = params.has('notimer');
  const fonts = document.fonts ? Promise.race([Promise.all([document.fonts.load(`40px Bangers`), document.fonts.load(`20px 'Patrick Hand'`)]), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
  fonts.catch(() => {}).then(() => loadImages(() => {
    if (params.has('level')) { const r = roundFromIndex(parseInt(params.get('level'), 10) || 0); startLevel(r.ci, r.li, params.has('fight')); }
    else setScene('lobby');
    requestAnimationFrame(frame);
  }));
}
window.addEventListener('load', boot);
