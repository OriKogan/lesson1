/* =====================================================================
   BITON: THE RECKONING: bosses.js
   Each boss = BOSSES[key] (setup / update / think) + its special ACTIONS.
   Level-wide tricks (selfie flashes, syrup waves, elevator...) = GIMMICKS.
   Backgrounds = STAGES.
   ===================================================================== */
'use strict';

const BOSSES = {};
const GIMMICKS = {};
const STAGES = {};
const STAGE_OVERLAY = {};

/* =====================================================================
   CHAPTER 1: BITON
   ===================================================================== */
BOSSES.biton = {
  setup(f, lv) {
    f.ai.phoneT = 360; f.ai.excuseT = 160; f.flags.flops = 0; f.flags.quit = false;
    if (lv.mods.ultra) { f.headScale = 1.25; f.aura = '#ffb020'; f.speedMul = 1.15; later(8, () => doAction(f, 'powerUp')); }
  },
  update(f) { f.ai.phoneT--; f.ai.excuseT--; },
  think(f, dist) {
    const m = G.level.mods;
    if (m.rageQuit && !f.flags.quit && f.hp < f.maxHp * 0.3) { f.flags.quit = true; doAction(f, 'rageQuit'); return true; }
    if (m.flop && f.flags.flops < 2 && f.hp < f.maxHp * (f.flags.flops ? 0.22 : 0.5)) { f.flags.flops++; doAction(f, 'flop'); return true; }
    if (m.phone && f.ai.phoneT <= 0 && dist > 150) { f.ai.phoneT = 520 + rand(300); doAction(f, 'phone'); return true; }
    if (m.excuses && f.ai.excuseT <= 0 && dist > 130) { f.ai.excuseT = (m.ultra ? 80 : 140) + rand(110); doAction(f, 'excuse'); return true; }
    return false;
  },
};

ACTIONS.powerUp = {
  dur: 100, pose: 'flex', armor: true,
  start(f) { say(f, 'AAAAAAAAAAAAAA!!!', 100); },
  update(f, a) {
    if (a.t % 8 === 0) { G.shake = Math.max(G.shake, 5); sparkFx(f.x + rand(-40, 40), f.y - rand(20, 200), '#ffb020', 3); }
    if (a.t === 60) { popText(f.x, f.y - 280, 'ULTRA!', '#ffb020', 56); Sound.fx.boing(); }
  },
};
ACTIONS.phone = {
  dur: 160, pose: 'phone',
  start(f) {
    say(f, pick(['Hold on, my mom is calling.', 'One sec, the group chat is going crazy.', 'Wait wait, I HAVE to answer this.']), 150);
    if (!G.gim.phoneHint) { G.gim.phoneHint = true; hint('HE\'S ON HIS PHONE! FREE HITS!'); }
  },
  onHit(f) { say(f, 'HEY! I WAS ON THE PHONE!', 90); return { mult: 1.6 }; },
};
ACTIONS.excuse = {
  dur: 36, pose: 'throw',
  start(f, a) { a.relT = 14; },
  update(f, a) {
    if (a.t !== 14) return;
    const text = pick(EXCUSES), low = Math.random() < 0.45;
    ctx.font = `26px ${FONT_HEAD}`;
    const w = ctx.measureText(text).width + 10;
    spawnProj({ kind: 'excuse', text, color: low ? '#ffb347' : '#ff5a5a', owner: 'enemy', src: f, x: f.x + f.facing * 50, y: low ? GROUND - 28 : GROUND - 125,
      vx: f.facing * (G.level.mods.ultra ? 7.5 : 6.2), vy: 0, w, h: 30, dmg: 7, kb: 5, stun: 16, words: ['OOF!', 'RUDE!', 'EXCUSED!'] });
    Sound.fx.whoosh();
  },
};
ACTIONS.flop = {
  dur: 260, pose: 'lying',
  start(f) { f.lying = true; say(f, 'AHH MY KNEE!! TIMEOUT! TIMEOUT!', 150); popText(f.x + f.facing * 100, f.y - 150, 'FAKE INJURY?!', '#7dff6b', 32); Sound.fx.slip(); },
  update(f, a) {
    f.lying = true;
    f.hp = Math.min(f.maxHp, f.hp + 0.07);
    if (a.t > 0 && a.t % 75 === 0) say(f, pick(['ouchie...', 'I need a doctor...', 'tell my mom I was brave...']), 60);
    if (a.t === 30 && !G.gim.flopHint) { G.gim.flopHint = true; hint('HE\'S FAKING! KICK HIM WHILE HE\'S DOWN!'); }
  },
  onHit(f) { say(f, 'OK OK I\'M FINE!', 80); return { mult: 1.5 }; },
};
ACTIONS.rageQuit = {
  dur: 700, pose: 'run',
  start(f, a) {
    a.dir = f.x > W / 2 ? -1 : 1; f.noCollide = true;
    say(f, 'THIS GAME IS RIGGED! I\'M GOING HOME!', 150);
    popText(f.x, f.y - 270, 'RAGE QUIT!', '#ff4d4d', 40);
  },
  update(f, a) {
    f.facing = a.dir; f.vx = a.dir * 3.4;
    if (a.t % 12 === 0) G.particles.push({ type: 'sweat', x: f.x + rand(-20, 20), y: f.y - 220, vx: rand(-1.5, 1.5), vy: -2, t: 0, life: 30 });
    if ((a.dir > 0 && f.x >= W - 40) || (a.dir < 0 && f.x <= 40)) {
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.25);
      say(f, '...my mom says I have to finish.', 140);
      popText(f.x, f.y - 270, '+25% HP', '#7dff6b', 32);
      endAction(f);
    }
  },
  onHit(f) { say(f, 'FINE. FINE!!', 80); return {}; },
  end(f) { f.vx = 0; f.noCollide = false; },
};

/* =====================================================================
   CHAPTER 2: THE SELFIE SQUAD (Sir Hat-a-Lot + Mr. Shook)
   ===================================================================== */
BOSSES.hat = {
  setup(f) { f.ai.hatT = 160; f.ai.pointT = 260; f.flags.hats = 0; },
  update(f) { f.ai.hatT--; f.ai.pointT--; },
  think(f, dist) {
    const m = G.level.mods;
    if (f.ai.hatT <= 0 && dist > 130) { f.ai.hatT = (m.duo ? 300 : 210) + rand(150); doAction(f, 'throwHat'); return true; }
    if (m.point && f.ai.pointT <= 0 && dist > 150) { f.ai.pointT = (m.duo ? 360 : 260) + rand(200); doAction(f, 'point'); return true; }
    return false;
  },
};
BOSSES.shook = {
  setup(f) { f.ai.screamT = 220; f.ai.pointT = 330; },
  update(f) { f.ai.screamT--; f.ai.pointT--; },
  think(f, dist) {
    const m = G.level.mods;
    if (f.ai.screamT <= 0 && dist < 210) { f.ai.screamT = (m.duo ? 360 : 260) + rand(150); doAction(f, 'scream'); return true; }
    if (m.point && f.ai.pointT <= 0 && dist > 150) { f.ai.pointT = (m.duo ? 380 : 280) + rand(200); doAction(f, 'point'); return true; }
    return false;
  },
};

ACTIONS.throwHat = {
  dur: 30, pose: 'throw',
  start(f, a) { a.relT = 12; a.fItem = 'hat'; },
  update(f, a) {
    if (a.t !== 12) return;
    a.fItem = null; f.flags.hats++;
    const x0 = f.x, dir = f.facing;
    spawnProj({ kind: 'hat', owner: 'enemy', src: f, x: f.x + dir * 40, y: GROUND - 130, vx: dir * 9, vy: 0, w: 56, h: 26, dmg: 7, kb: 5, stun: 16, vr: 0.4, life: 320,
      words: ['HAT-TRICK!', 'BRIM SLAP!'],
      update(p) {
        p.x += p.vx;
        if (!p.back && Math.abs(p.x - x0) > 380) { p.back = true; p.hitSet.clear(); }
        if (p.back) {
          const tx = f.active && f.hp > 0 ? f.x : x0;
          p.vx = clamp(p.vx + Math.sign(tx - p.x) * 0.9, -11, 11);
          if (Math.abs(p.x - tx) < 30) p.dead = true;
        }
      } });
    Sound.fx.whoosh();
    if (f.flags.hats === 2) later(10, () => popText(f.x, f.y - 280, 'HE HAS INFINITE HATS?!', '#ffe14d', 32));
  },
};
ACTIONS.point = {
  dur: 50, pose: 'point',
  start(f) { say(f, pick(['IT WAS HIM!', 'NOT ME! HIM!', 'HE DID IT!', 'BLAME HIM!']), 70); },
  update(f, a) {
    if (a.t !== 18) return;
    spawnProj({ kind: 'finger', owner: 'enemy', src: f, x: f.x + f.facing * 60, y: GROUND - 122, vx: f.facing * 10, vy: 0, w: 60, h: 24, dmg: 8, kb: 6, stun: 18, words: ['POKED!', 'ACCUSED!', 'BLAMED!'] });
    Sound.fx.whoosh();
  },
};
ACTIONS.scream = {
  dur: 62, pose: 'scream',
  start(f) { say(f, 'WHAAAAAAT?!', 70); Sound.fx.scream(); },
  update(f, a) {
    f.headScale = 1 + 0.65 * Math.sin(PI * Math.min(1, a.t / 62));
    if (a.t !== 26) return;
    G.particles.push({ type: 'ring', x: f.x, y: f.y - 120, t: 0, life: 30, speed: 8, color: '#fff' });
    G.shake = 8;
    const p = G.player;
    if (p.hp > 0 && Math.abs(p.x - f.x) < 200 && p.invuln <= 0) {
      const landed = hitFighter(f, p, { dmg: 6, kb: 11, stun: 12, dir: p.x >= f.x ? 1 : -1, words: ['SHOOK!', 'WHAAAT!'] });
      if (landed && p.hp > 0) doAction(p, 'dizzy');
    }
  },
  end(f) { f.headScale = 1; },
};

/* selfie flash: block = eyes closed, taunt = perfect pose, otherwise blinded */
function selfieFlash(caption, opts = {}) {
  Sound.fx.shutter(); G.flash = 1;
  const p = G.player;
  let cap = caption;
  if (p.state === 'custom' && p.action && p.action.name === 'taunt') {
    p.meter = Math.min(100, p.meter + 40); G.stats.poses++;
    cap = pick(['NICE POSE!', 'MODEL MATERIAL', 'SLAY', 'PHOTOBOMB!']);
    popText(p.x, p.y - 270, 'PERFECT POSE! +40 METER', '#7dff6b', 28);
  } else if (p.state === 'block' || p.state === 'blockstun') {
    cap = pick(['EYES CLOSED. CLASSIC.', 'BLURRY.', 'BLINKED.']);
  } else if (p.hp > 0) {
    G.blind = 130; say(p, 'MY EYES!!', 70);
    if (opts.dmg) hitFighter(opts.src, p, { dmg: opts.dmg, kb: 6, stun: 20, unblockable: true, dir: p.x >= opts.src.x ? 1 : -1, words: ['FLASH!', 'CLICK!'] });
  }
  snapPolaroid(cap);
}

GIMMICKS.selfie = {
  setup() { G.gim.selfie = { t: 330, phase: 'idle' }; },
  update() {
    const s = G.gim.selfie;
    const shooter = G.bystander || G.enemies.find(e => e.benched && e.hp > 0);
    if (!shooter) { s.phase = 'idle'; s.t = Math.max(s.t, 200); return; }
    s.t--;
    if (s.phase === 'idle') {
      if (G.bystander) G.bystander.forcePose = G.player.state === 'hurt' ? 'taunt' : null;
      if (s.t <= 0) {
        s.phase = 'count'; s.t = 130; say(shooter, 'SELFIE!!', 40); Sound.fx.beep();
        if (!G.gim.selfieHint) { G.gim.selfieHint = true; hint('SELFIE! BLOCK TO SHUT YOUR EYES... OR TAUNT TO POSE (+METER)'); }
      }
    } else {
      if (G.bystander) G.bystander.forcePose = 'selfie';
      if (s.t === 120 || s.t === 80 || s.t === 40) {
        const n = s.t === 120 ? '3' : s.t === 80 ? '2' : '1';
        say(shooter, n + '...', 38, false); Sound.fx.beep();
        const a = bubbleAnchor(shooter); popText(a.x, a.y - 50, n, '#fff', 54);
      }
      if (s.t <= 0) { selfieFlash(pick(['#NOFILTER', 'CAUGHT IN 4K', 'NEW PROFILE PIC'])); s.phase = 'idle'; s.t = 420 + rand(240); }
    }
  },
};

GIMMICKS.tag = {
  setup() { const b = G.enemies[1]; b.active = false; b.benched = true; b.offscreenOK = true; b.x = W + 80; G.gim.tagCd = 500; },
  update() {
    const act = G.enemies.find(e => e.active && e.hp > 0), bench = G.enemies.find(e => e.benched && e.hp > 0);
    if (bench) bench.hp = Math.min(bench.maxHp, bench.hp + 0.04);
    if (--G.gim.tagCd > 0 || !act || !bench) return;
    if (act.free() && act.hp < act.maxHp * 0.5 && bench.hp > act.hp + 12) { doAction(act, 'tagOut', { partner: bench }); G.gim.tagCd = 600; }
  },
};
ACTIONS.tagOut = {
  dur: 400, pose: 'run',
  start(f, a) {
    a.dir = f.x < W / 2 ? -1 : 1; f.offscreenOK = true; f.noCollide = true; say(f, pick(['TAG ME OUT!', 'YOUR TURN, BRO!', 'I NEED A BREAK!']), 80);
    if (!G.gim.tagHint) { G.gim.tagHint = true; hint('TAGGED OUT! THE ONE WAITING OUTSIDE SLOWLY HEALS'); }
  },
  update(f, a) {
    f.facing = a.dir; f.vx = a.dir * 6;
    if (f.x < -60 || f.x > W + 60) {
      f.vx = 0; f.active = false; f.benched = true; f.x = a.dir < 0 ? -80 : W + 80;
      if (a.partner && a.partner.hp > 0) tagIn(a.partner, a.dir);
      endAction(f);
    }
  },
  onHit(f) { say(f, 'NOT FAIR, I WAS TAGGING OUT!', 60); return {}; },
  end(f) { f.noCollide = false; if (f.active) { f.offscreenOK = false; f.x = clamp(f.x, 36, W - 36); } },
};
function tagIn(f, side) {
  f.benched = false; f.active = true; f.offscreenOK = true; f.lying = false;
  f.x = side < 0 ? -40 : W + 40; f.y = GROUND - 1; f.vy = -13; f.state = 'idle';
  doAction(f, 'tagIn', { dir: side < 0 ? 1 : -1 });
}
ACTIONS.tagIn = {
  dur: 120, pose: 'jump',
  start(f, a) { f.facing = a.dir; say(f, pick(['TAG!', 'MY TURN!', 'I GOT THIS!']), 60); Sound.fx.tag(); },
  update(f, a) {
    f.vx = a.dir * 6.5;
    if (f.x > 60 && f.x < W - 60) f.offscreenOK = false;
    const p = G.player;
    if (!a.hit && p.hp > 0 && f.vy > 0 && overlap(f.hurtbox(), p.hurtbox())) { a.hit = true; hitFighter(f, p, { dmg: 8, kb: 7, stun: 18, dir: a.dir, words: ['TAG SLAM!'] }); }
    if (f.onGround && a.t > 5) { f.vx = 0; endAction(f); }
  },
  end(f) { f.offscreenOK = false; f.x = clamp(f.x, 36, W - 36); },
};

GIMMICKS.duo = {
  setup() { G.enemies.forEach((e, i) => { e.aggMul = 0.7; e.ai.t = 40 + i * 30; }); },
};
GIMMICKS.groupSelfie = {
  setup() { G.gim.gs = { t: 480 }; },
  update() {
    const gs = G.gim.gs, alive = G.enemies.filter(e => e.hp > 0);
    if (--gs.t > 0 || !alive.length) return;
    if (!alive.every(e => e.free())) { gs.t = 20; return; }
    gs.t = 720 + rand(250);
    if (alive.length === 2) alive.forEach((e, i) => doAction(e, 'groupPose', { lead: i === 0, solo: false }));
    else doAction(alive[0], 'groupPose', { lead: true, solo: true });
  },
};
ACTIONS.groupPose = {
  dur: 180, armor: true,
  start(f, a) {
    a.pose = a.solo ? 'selfie' : f.key === 'hat' ? 'groupPoint' : 'selfie';
    f.vx = 0;
    if (a.lead) say(f, a.solo ? 'Sad solo selfie... for my bro.' : 'GROUP SELFIEEEE!', 60);
    if (a.lead && !G.gim.gsHint) { G.gim.gsHint = true; hint('THEY\'RE POSING: FREE HITS! BUT BLOCK (OR TAUNT) ON 1!'); }
  },
  update(f, a) {
    if (!a.lead) return;
    if (a.t === 50 || a.t === 90 || a.t === 130) {
      const n = a.t === 50 ? '3' : a.t === 90 ? '2' : '1';
      say(f, n + '...', 36, false); Sound.fx.beep();
      popText(f.x, f.y - 300, n, '#fff', 60);
    }
    if (a.t === 170) {
      const p = G.player, near = G.enemies.some(e => e.hp > 0 && Math.abs(e.x - p.x) < 260);
      selfieFlash(a.solo ? '#SADSOLOSELFIE' : '#SQUADGOALS', { dmg: near ? 14 : 0, src: f });
    }
  },
};

/* =====================================================================
   CHAPTER 3: THE SILAN SOMMELIER
   ===================================================================== */
BOSSES.silan = {
  setup(f) { f.ai.jarT = 120; f.ai.offerT = 380; f.ai.eatT = 260; f.ai.lineT = 300; f.flags.sugar = 0; f.flags.sugarT = 0; },
  update(f) {
    f.ai.jarT--; f.ai.offerT--; f.ai.eatT--; f.ai.lineT--;
    f.speedMul = 1 + 0.22 * f.flags.sugar; f.aggMul = 1 + 0.25 * f.flags.sugar;
    if (f.flags.sugar > 0 && f.anim % 10 === 0) sparkFx(f.x + rand(-30, 30), f.y - rand(30, 200), '#fff6b0', 1);
    if (f.flags.sugar >= 3 && f.free() && ++f.flags.sugarT > 400) doAction(f, 'sugarCrash');
    if (G.level.mods.infomercial && f.ai.lineT <= 0 && f.free()) { f.ai.lineT = 330 + rand(200); say(f, pick(INFOMERCIAL_LINES), 110); }
  },
  think(f, dist) {
    const m = G.level.mods;
    if (m.eat && f.flags.sugar < 3 && f.ai.eatT <= 0 && dist > 150) { f.ai.eatT = 330 + rand(200); doAction(f, 'eat'); return true; }
    if (m.offer && f.ai.offerT <= 0 && dist > 110) { f.ai.offerT = 460 + rand(300); doAction(f, 'offer'); return true; }
    if (m.jars && f.ai.jarT <= 0 && dist > 140) { f.ai.jarT = (m.jarRain ? 170 : 120) + rand(110); doAction(f, 'throwJar'); return true; }
    return false;
  },
};
function spawnJar(src, x, y, vx, vy, opts = {}) {
  return spawnProj(Object.assign({
    kind: 'jar', owner: 'enemy', src, x, y, vx, vy, g: 0.5, w: 28, h: 34, dmg: 8, kb: 5, stun: 18, vr: 0.25 * (Math.sign(vx) || 1), groundOff: 10,
    words: ['SPLAT!', 'STICKY!', 'SWEET!'], sfx: 'splat',
    onHit(p, t) { t.sticky = Math.max(t.sticky, 150); breakJar(p, false); },
    onGround(p) { p.dead = true; breakJar(p, true); },
  }, opts));
}
function breakJar(p, puddle) {
  Sound.fx.glass(); Sound.fx.splat();
  for (let i = 0; i < 8; i++) G.particles.push({ type: 'shard', x: p.x, y: p.y, vx: rand(-4, 4), vy: rand(-6, -2), t: 0, life: 40 });
  dropsFx(p.x, p.y, '#8a4a1c', 8);
  if (puddle) G.hazards.push({ type: 'syrup', x: clamp(p.x, 60, W - 60), w: 130, t: 0, life: 560 });
}
ACTIONS.throwJar = {
  dur: 34, pose: 'throw',
  start(f, a) { a.relT = 14; a.fItem = 'jar'; },
  update(f, a) {
    if (a.t !== 14) return;
    a.fItem = null;
    const p = G.player, T = 44, g = 0.5;
    const sx = f.x + f.facing * 30, sy = GROUND - 150, tx = p.x + p.vx * 10;
    spawnJar(f, sx, sy, clamp((tx - sx) / T, -11, 11), (GROUND - 10 - sy - 0.5 * g * T * T) / T);
    Sound.fx.whoosh();
  },
};
ACTIONS.offer = {
  dur: 150, pose: 'offer',
  start(f) { say(f, pick(OFFER_LINES), 120); if (!G.gim.offerHint) { G.gim.offerHint = true; hint('HE WANTS TO FEED YOU. BLOCK = "NO THANKS". OR JUST HIT HIM.'); } },
  update(f) {
    const p = G.player, dir = p.x >= f.x ? 1 : -1;
    f.facing = dir; f.vx = dir * 2.6 * f.speedMul;
    if (Math.abs(p.x - f.x) < 66 && p.hp > 0 && p.invuln <= 0 && p.y > GROUND - 60) {
      f.vx = 0;
      if (p.state === 'block' || p.state === 'blockstun') { say(p, 'NO THANKS!', 60); Sound.fx.block(); p.vx = dir * 6; endAction(f); return; }
      if (p.state === 'custom' && p.action && ACTIONS[p.action.name].armor) return;
      doAction(p, 'forcefed');
      f.hp = Math.min(f.maxHp, f.hp + 6);
      say(f, 'See? Delicious.', 90); popText(f.x, f.y - 270, '+6 HP', '#7dff6b', 26);
      endAction(f);
    }
  },
  end(f) { f.vx = 0; },
};
ACTIONS.eat = {
  dur: 100, pose: 'eat',
  start(f) { say(f, 'nom nom nom...', 90); },
  update(f, a) { if (a.t % 25 === 0) Sound.fx.nom(); },
  onHit(f) { say(f, 'HEY! THAT WAS MY SPOON!', 80); return {}; },
  end(f, a, interrupted) {
    if (interrupted) return;
    f.flags.sugar = Math.min(3, f.flags.sugar + 1); f.flags.sugarT = 0;
    popText(f.x, f.y - 270, `SUGAR x${f.flags.sugar}`, '#ffe14d', 36);
    if (!G.gim.sugarHint) { G.gim.sugarHint = true; hint('EVERY SPOON MAKES HIM FASTER. INTERRUPT HIM WHILE HE EATS!'); }
    say(f, f.flags.sugar >= 3 ? 'MAXIMUM SUGAR! I CAN SEE THROUGH TIME!' : pick(['I CAN TASTE COLORS!', 'MORE. SPEED.', 'SWEEEEET!']), 100);
    Sound.fx.boing();
  },
};
ACTIONS.sugarCrash = {
  dur: 240, pose: 'lying',
  start(f) { f.lying = true; say(f, '...sugar... crash...', 100); popText(f.x + f.facing * 100, f.y - 150, 'SUGAR CRASH!', '#9cf', 36); hint('HE\'S ASLEEP. GO WILD.'); },
  update(f, a) { f.lying = true; if (a.t % 30 === 0) zzzFx(f.x + f.facing * 175, f.y - 80); if (a.t % 60 === 0) Sound.fx.snore(); },
  onHit() { return { mult: 1.3, keep: true }; },
  end(f) { f.flags.sugar = 0; f.flags.sugarT = 0; say(f, 'Wha-? Who? Silan?', 80); },
};

GIMMICKS.jarRain = {
  setup() { G.gim.rainT = 240; },
  update() {
    if (--G.gim.rainT > 0) return;
    G.gim.rainT = 170 + rand(80);
    const p = G.player, n = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const x = clamp(p.x + rand(-230, 230), 50, W - 50);
      G.hazards.push({ type: 'shadow', x, t: 0, life: 84 });
      later(55, () => spawnJar(G.enemies[0], x, -30, 0, 9, { g: 0.55, vr: 0.3 }));
    }
  },
};
GIMMICKS.wave = {
  setup() { G.gim.waveT = 540; },
  update() {
    G.gim.waveT--;
    if (G.gim.waveT === 70) {
      const d = G.gim.waveDir = Math.random() < 0.5 ? 1 : -1;
      G.banner = { text: 'SYRUP WAVE!', sub: d > 0 ? '>>> JUMP! >>>' : '<<< JUMP! <<<', t: 0, dur: 70 };
      Sound.fx.beep();
    }
    if (G.gim.waveT <= 0) {
      G.gim.waveT = 560 + rand(200);
      const d = G.gim.waveDir || 1;
      G.hazards.push({ type: 'wave', x: d > 0 ? -90 : W + 90, vx: d * 7, t: 0 });
      Sound.fx.splash();
    }
  },
};

/* =====================================================================
   CHAPTER 4: THE HYDRATION MONK
   ===================================================================== */
BOSSES.monk = {
  setup(f, lv) {
    f.flags.hasBottle = true;
    Object.assign(f.ai, { drinkT: 320, splashT: 220, lectureT: 380, laserT: 220, lineT: 420 });
    if (lv.mods.ascend) { f.aura = '#78e6ff'; later(8, () => doAction(f, 'ascendIntro')); }
  },
  update(f) {
    f.ai.drinkT--; f.ai.splashT--; f.ai.lectureT--; f.ai.laserT--;
    if (G.level.mods.laser) Sound.setTempo(1 + (1 - f.hp / f.maxHp) * 0.6);
    if (--f.ai.lineT <= 0 && f.free() && f.flags.hasBottle) { f.ai.lineT = 450 + rand(300); say(f, pick(f.c.taunts), 90); }
  },
  think(f, dist) {
    const m = G.level.mods;
    if (!f.flags.hasBottle) { doAction(f, 'chaseBottle'); return true; }
    if (m.drink && f.ai.drinkT <= 0 && f.hp < f.maxHp * 0.9 && dist > 120) { f.ai.drinkT = 400 + rand(240); doAction(f, 'drink'); return true; }
    if (m.laser && f.ai.laserT <= 0) { f.ai.laserT = 250 + rand(150); doAction(f, 'laser'); return true; }
    if (m.lecture && f.ai.lectureT <= 0 && dist > 180) { f.ai.lectureT = 460 + rand(240); doAction(f, 'lecture'); return true; }
    if (m.splash && f.ai.splashT <= 0 && dist > 110) { f.ai.splashT = 240 + rand(160); doAction(f, 'splash'); return true; }
    return false;
  },
};
ACTIONS.ascendIntro = {
  dur: 100, pose: 'levitate', armor: true,
  start(f) { f.floatTarget = 50; say(f, 'The bottle has chosen me.', 100, false); },
  end(f) { f.floatTarget = 0; },
};
ACTIONS.drink = {
  dur: 110, pose: 'drink',
  start(f) { say(f, '*sip*', 80, false); },
  update(f, a) {
    f.hp = Math.min(f.maxHp, f.hp + 0.11);
    if (a.t % 28 === 0) Sound.fx.sip();
    if (a.t === 10 && !G.gim.drinkHint) { G.gim.drinkHint = true; hint('HIT HIM WHILE HE DRINKS TO KNOCK THE BOTTLE AWAY!'); }
  },
  onHit(f, a, src, h) {
    f.flags.hasBottle = false;
    G.props.push({ kind: 'bottle', x: f.x, y: f.y - 160, vx: (h.dir || 1) * rand(4, 7), vy: -11, rot: 0, vr: 0.4, landed: false });
    popText(f.x, f.y - 270, 'DISARMED!', '#ffe14d', 38);
    later(20, () => say(f, 'My bottle.', 90));
    return { mult: 1.3 };
  },
};
ACTIONS.chaseBottle = {
  dur: 900, pose: 'run',
  start(f) { f.defMul = 1.5; f.flags.chaseHits = 0; f.noCollide = true; },
  update(f, a) {
    const b = G.props.find(o => o.kind === 'bottle');
    if (!b) { f.flags.hasBottle = true; endAction(f); return; }
    if (a.t % 12 === 0) G.particles.push({ type: 'sweat', x: f.x + rand(-20, 20), y: f.y - 220, vx: rand(-1.5, 1.5), vy: -2, t: 0, life: 30 });
    if (!b.landed) { f.vx = 0; return; }
    const dx = b.x - f.x;
    f.facing = dx >= 0 ? 1 : -1; f.vx = f.facing * 4.4;
    if (Math.abs(dx) < 14) {
      f.vx = 0; G.props = G.props.filter(o => o !== b); f.flags.hasBottle = true;
      say(f, '...we are together again.', 110); Sound.fx.sip();
      endAction(f);
    }
  },
  onHit(f) { if (++f.flags.chaseHits === 1) popText(f.x, f.y - 290, 'HE DOESN\'T EVEN CARE', '#fff', 28); return { keep: true }; },
  end(f) { f.defMul = 1; f.vx = 0; f.noCollide = false; },
};
function addWet(x) {
  const ex = G.hazards.find(h => h.type === 'water' && Math.abs(h.x - x) < 70);
  if (ex) { ex.t = 0; ex.w = Math.min(220, ex.w + 20); }
  else G.hazards.push({ type: 'water', x: clamp(x, 60, W - 60), w: 110, t: 0, life: 480 });
}
ACTIONS.splash = {
  dur: 44, pose: 'splash',
  update(f, a) {
    if (a.t !== 16) return;
    Sound.fx.splash();
    for (let i = 0; i < 5; i++) {
      spawnProj({ kind: 'drop', owner: 'enemy', src: f, x: f.x + f.facing * 60, y: GROUND - 115, vx: f.facing * rand(3, 9), vy: rand(-7, -3), g: 0.4, w: 14, h: 16, dmg: 3, kb: 2, stun: 8, noClash: true,
        words: ['SPLOOSH!', 'SPLISH!'], sfx: 'splash',
        onGround(p) { p.dead = true; dropsFx(p.x, GROUND - 4, '#7fd0ff', 3); addWet(p.x); } });
    }
  },
};
ACTIONS.lecture = {
  dur: 150, pose: 'lecture',
  start(f) { say(f, pick(LECTURE_LINES), 150); if (!G.gim.lectureHint) { G.gim.lectureHint = true; hint('JUMP OVER THE LECTURE!'); } },
  update(f, a) {
    if (a.t !== 30 && a.t !== 70 && a.t !== 110) return;
    const text = pick(LECTURE_WORDS);
    ctx.font = `24px ${FONT_HEAD}`;
    const w = ctx.measureText(text).width + 24;
    spawnProj({ kind: 'word', text, owner: 'enemy', src: f, x: f.x + f.facing * 50, y: GROUND - 20, vx: f.facing * 5.5, vy: 0, w, h: 36, dmg: 8, kb: 6, stun: 18, words: ['EDUCATED!', 'LEARNED!', 'CLASS DISMISSED!'] });
    Sound.fx.beep();
  },
};
ACTIONS.laser = {
  dur: 130, pose: 'levitate',
  start(f, a) {
    f.floatTarget = 60; a.high = Math.random() < 0.5; a.dir = G.player.x >= f.x ? 1 : -1;
    a.y = a.high ? GROUND - 150 : GROUND - 34;
    say(f, a.high ? 'Behold.' : 'Kneel.', 60);
  },
  update(f, a) {
    f.facing = a.dir;
    if (a.t === 20) Sound.fx.laserCharge();
    if (a.t === 72) { Sound.fx.laser(); G.shake = 10; }
    if (a.t >= 72 && a.t < 98 && !a.hit) {
      const x0 = f.x + f.facing * 40;
      const box = f.facing > 0 ? { x: x0, y: a.y - 13, w: W, h: 26 } : { x: 0, y: a.y - 13, w: x0, h: 26 };
      const p = G.player;
      if (p.hp > 0 && overlap(box, p.hurtbox())) { a.hit = true; hitFighter(f, p, { dmg: 13, kb: 8, stun: 22, dir: f.facing, x: p.x, y: a.y, words: ['HYDRO BEAM!', 'H2-OWW!', 'ZAP!'] }); }
    }
  },
  draw(f, a) {
    const x0 = f.x + f.facing * 40, x1 = f.facing > 0 ? W : 0, by = f.y - f.floatY - 108;
    if (a.t >= 20 && a.t < 72) {
      ctx.save(); ctx.globalAlpha = 0.35 + 0.3 * Math.sin(a.t * 0.8); ctx.strokeStyle = '#7ff'; ctx.lineWidth = 3; ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.moveTo(x0, a.y); ctx.lineTo(x1, a.y); ctx.stroke(); ctx.restore();
      ellipse(x0, by, 4 + (a.t - 20) * 0.25, 4 + (a.t - 20) * 0.25, 'rgba(160,255,255,0.8)');
      txt(a.high ? 'BLOCK!' : 'JUMP!', (x0 + x1) / 2, a.y - 26, 26, '#7ff');
    }
    if (a.t >= 72 && a.t < 98) {
      const k = 1 - (a.t - 72) / 26;
      ctx.save();
      const g = ctx.createLinearGradient(0, a.y - 18, 0, a.y + 18);
      g.addColorStop(0, 'rgba(120,255,255,0)'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, 'rgba(120,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), a.y - 18 * k - 4, Math.abs(x1 - x0), 36 * k + 8);
      ctx.strokeStyle = 'rgba(160,255,255,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x0, a.y); ctx.stroke();
      ctx.restore();
    }
  },
  end(f) { f.floatTarget = 0; },
};

GIMMICKS.elevator = {
  setup() { Object.assign(G.gim, { floor: 1, floorT: 420, floorIdx: 0, floorName: null }); },
  update() {
    if (G.level.variant !== 'dark' && --G.gim.floorT <= 0) {
      G.gim.floorT = 480 + rand(120);
      const name = FLOOR_NAMES[G.gim.floorIdx++ % FLOOR_NAMES.length];
      G.gim.floor = parseInt(name.match(/\d+/)[0], 10);
      G.gim.floorName = { text: name, t: 0 };
      Sound.fx.ding();
    }
    if (G.gim.floorName && ++G.gim.floorName.t > 160) G.gim.floorName = null;
  },
};
GIMMICKS.lightsOut = {
  setup() { G.gim.lightsT = 700; G.gim.darkEnd = 0; },
  update() {
    if (--G.gim.lightsT === 0) {
      G.darkTarget = 0.93; G.gim.darkEnd = 240; Sound.fx.buzz();
      const m = G.enemies[0]; if (m && m.hp > 0) say(m, 'Do not panic. Hydrate.', 110);
    }
    if (G.gim.darkEnd > 0 && --G.gim.darkEnd === 0) { G.darkTarget = 0; G.gim.lightsT = 800 + rand(300); Sound.fx.ding(); }
  },
};

/* =====================================================================
   STAGES (backgrounds)
   ===================================================================== */
function drawStage(lv) {
  const s = STAGES[lv.stage];
  if (s) s(lv.variant, G.sceneT);
  else { ctx.fillStyle = '#333'; ctx.fillRect(0, 0, W, H); }
}
function cloud(x, y, col) {
  ctx.fillStyle = col;
  [[0, 0, 40], [35, -14, 32], [70, 0, 38], [35, 8, 34]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, r * 0.7, 0, TAU); ctx.fill(); });
}

STAGES.schoolyard = (v, t) => {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  if (v === 'sunset') { sky.addColorStop(0, '#3b2a6b'); sky.addColorStop(0.55, '#ff6f61'); sky.addColorStop(1, '#ffc36b'); }
  else if (v === 'ultra') { sky.addColorStop(0, '#140000'); sky.addColorStop(1, '#8a1010'); }
  else { sky.addColorStop(0, '#59b7ff'); sky.addColorStop(1, '#cdeeff'); }
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
  if (v === 'sunset') ellipse(800, 300, 70, 70, '#ffdd88');
  else if (!v) ellipse(840, 80, 38, 38, '#fff6b0');
  if (v !== 'ultra') for (let i = 0; i < 4; i++) cloud(((i * 290 + t * (0.2 + i * 0.05)) % (W + 300)) - 150, 50 + i * 30, v === 'sunset' ? 'rgba(255,200,210,0.8)' : 'rgba(255,255,255,0.92)');
  // school
  ctx.fillStyle = v === 'ultra' ? '#3a1d1d' : v === 'sunset' ? '#c9a27a' : '#ead7ad';
  ctx.fillRect(150, 170, 660, GROUND - 170);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.strokeRect(150, 170, 660, GROUND - 170);
  ctx.fillStyle = '#b5523b'; ctx.fillRect(138, 152, 684, 22); ctx.strokeRect(138, 152, 684, 22);
  rrect(330, 182, 300, 34, 6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  txt('BITON HIGH SCHOOL', 480, 200, 22, '#2f6fd6', 'center', null);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
    const x = 180 + c * 105, y = 232 + r * 76;
    ctx.fillStyle = v === 'ultra' ? (((c + r + Math.floor(t / 20)) % 3) ? '#2a0d0d' : '#ff6a00') : v === 'sunset' ? '#ffcf8f' : '#8fd3ff';
    ctx.fillRect(x, y, 70, 48); ctx.strokeRect(x, y, 70, 48);
    ctx.beginPath(); ctx.moveTo(x + 35, y); ctx.lineTo(x + 35, y + 48); ctx.stroke();
  }
  ctx.fillStyle = '#7a4a2a'; ctx.fillRect(445, 392, 70, GROUND - 392); ctx.strokeRect(445, 392, 70, GROUND - 392);
  // fence
  ctx.strokeStyle = 'rgba(50,50,50,0.45)'; ctx.lineWidth = 1.5;
  for (let x = -110; x < W + 110; x += 18) {
    ctx.beginPath(); ctx.moveTo(x, 362); ctx.lineTo(x + 106, GROUND); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 106, 362); ctx.lineTo(x, GROUND); ctx.stroke();
  }
  ctx.fillStyle = '#6b6b6b'; ctx.fillRect(0, 356, W, 6);
  for (let x = 0; x < W; x += 160) ctx.fillRect(x + 4, 356, 6, GROUND - 356);
  // hoop
  ctx.fillStyle = '#555'; ctx.fillRect(56, 205, 10, GROUND - 205);
  ctx.fillStyle = '#fff'; ctx.fillRect(28, 168, 80, 54); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.strokeRect(28, 168, 80, 54);
  ctx.strokeStyle = '#e8463a'; ctx.strokeRect(52, 186, 32, 24);
  ellipse(84, 226, 20, 5, null, '#ff7a1a', 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(84 + i * 8, 228); ctx.lineTo(84 + i * 5, 256); ctx.stroke(); }
  // ground
  ctx.fillStyle = v === 'ultra' ? '#2b1414' : '#6f7378'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = OUTLINE; ctx.fillRect(0, GROUND, W, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, GROUND + 34); ctx.lineTo(W, GROUND + 34); ctx.stroke();
  ellipse(W / 2, GROUND + 40, 130, 18, null, 'rgba(255,255,255,0.45)', 3);
  if (v === 'ultra') {
    for (let i = 0; i < 30; i++) {
      const x = (i * 97 + t * (0.4 + (i % 3) * 0.3)) % W, y = H - ((t * 1.3 + i * 53) % H);
      ellipse(x, y, 2.5, 2.5, i % 2 ? '#ffb020' : '#ff5a1a');
    }
    if (t % 240 < 8) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath();
      let x = 300 + (Math.floor(t / 240) * 211) % 400, y = 0; ctx.moveTo(x, y);
      while (y < 330) { x += rand(-30, 30); y += 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(300, GROUND + 5); ctx.lineTo(330, GROUND + 25); ctx.lineTo(320, GROUND + 50); ctx.moveTo(650, GROUND + 4); ctx.lineTo(620, GROUND + 30); ctx.lineTo(660, GROUND + 60); ctx.stroke();
  }
};

STAGES.street = (v, t) => {
  const sky = ctx.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, '#060c1f'); sky.addColorStop(1, '#1c2b50');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
  for (let i = 0; i < 40; i++) ellipse((i * 137) % W, (i * 53) % 70 + 5, 1.2, 1.2, `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t * 0.05 + i)})`);
  ctx.fillStyle = '#cfcfd5'; ctx.fillRect(0, 78, W, GROUND - 78);
  ctx.fillStyle = '#e2e2e6'; ctx.beginPath(); ctx.moveTo(250, 78); ctx.lineTo(330, 78); ctx.lineTo(520, 330); ctx.lineTo(470, 330); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#bdbdc4'; ctx.fillRect(0, 78, W, 14);
  for (const wx of [40, 380, 700]) {
    const wy = 130, ww = 230, wh = 220;
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
    const g = ctx.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#0f1420'); g.addColorStop(1, '#232a3a');
    ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
    if (wx === 700) { ctx.fillStyle = 'rgba(255,220,120,0.5)'; ctx.fillRect(wx + 140, wy + 150, 18, 10); }
    ctx.strokeStyle = 'rgba(235,235,235,0.85)'; ctx.lineWidth = 2;
    for (let x = wx + 12; x < wx + ww; x += 14) { ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x, wy + wh); ctx.stroke(); }
    ctx.lineWidth = 3; const my = wy + wh * 0.32;
    for (let x = wx; x < wx + ww - 1; x += 46) {
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + 23, my - 22); ctx.lineTo(x + 46, my); ctx.lineTo(x + 23, my + 22); ctx.closePath(); ctx.stroke();
    }
    ctx.fillStyle = '#e9e9e9'; ctx.fillRect(wx + ww / 2 - 3, wy, 6, wh);
  }
  // street lamp
  ctx.fillStyle = '#333'; ctx.fillRect(W - 40, 120, 8, GROUND - 120);
  const lg = ctx.createRadialGradient(W - 60, 130, 5, W - 60, 130, 160); lg.addColorStop(0, 'rgba(255,230,150,0.55)'); lg.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = lg; ctx.fillRect(W - 230, 0, 230, 320);
  ellipse(W - 60, 128, 20, 10, '#ffe9a8', OUTLINE, 2);
  if (v === 'party') {
    const cols = ['#ff4d4d', '#ffe14d', '#4dd2ff', '#7dff6b', '#ff8ad8'];
    for (let s = 0; s < 2; s++) {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 100 + s * 18); ctx.quadraticCurveTo(W / 2, 170 + s * 18, W, 100 + s * 18); ctx.stroke();
      for (let i = 0; i <= 20; i++) {
        const k = i / 20, x = k * W, y = (1 - k) * (1 - k) * (100 + s * 18) + 2 * (1 - k) * k * (170 + s * 18) + k * k * (100 + s * 18);
        ellipse(x, y + 6, 5, 7, (i + Math.floor(t / 15) + s) % 3 ? cols[(i + s) % 5] : '#555');
      }
    }
    rrect(W / 2 - 150, 360, 300, 50, 10); ctx.fillStyle = '#ff4df0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
    txt('#SQUADGOALS', W / 2, 386, 32, '#fff');
    ellipse(110, 250, 44, 44, null, '#fffbe6', 9);
    ctx.fillStyle = '#333'; ctx.fillRect(107, 294, 6, GROUND - 294);
  }
  ctx.fillStyle = '#8b8d93'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = OUTLINE; ctx.fillRect(0, GROUND, W, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x - 30, H); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, GROUND + 36); ctx.lineTo(W, GROUND + 36); ctx.stroke();
};

function kitchenBack(studio) {
  if (!studio) {
    ctx.fillStyle = '#f3f1ec'; ctx.fillRect(0, 0, W, GROUND);
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 130;
      ctx.fillStyle = '#fbfbfb'; ctx.fillRect(x, 60, 124, 170); ctx.strokeStyle = '#b9bdc3'; ctx.lineWidth = 3; ctx.strokeRect(x, 60, 124, 170);
      ctx.fillStyle = '#c9ccd1'; ctx.fillRect(x + (i % 2 ? 8 : 108), 120, 6, 50);
    }
    ctx.fillStyle = '#fbfbfb'; ctx.fillRect(600, 70, 230, 140); ctx.strokeStyle = '#b9bdc3'; ctx.strokeRect(600, 70, 230, 140);
    ctx.fillStyle = '#c9ccd1'; ctx.fillRect(600, 196, 230, 14);
    ctx.fillStyle = '#fdfdfd'; ctx.fillRect(0, 232, W, 150);
    ctx.fillStyle = 'rgba(210,215,222,0.5)';
    for (let x = -100; x < W; x += 160) { ctx.beginPath(); ctx.moveTo(x, 382); ctx.lineTo(x + 40, 232); ctx.lineTo(x + 70, 232); ctx.lineTo(x + 30, 382); ctx.closePath(); ctx.fill(); }
  }
  ctx.fillStyle = '#262626'; ctx.fillRect(0, 378, W, 16);
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(0, 394, W, GROUND - 394);
  ctx.strokeStyle = '#c9ccd1'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 120) { ctx.strokeRect(x + 4, 398, 112, GROUND - 402); ctx.beginPath(); ctx.moveTo(x + 40, 404); ctx.lineTo(x + 80, 404); ctx.stroke(); }
  if (!studio) {
    ctx.fillStyle = '#111'; ctx.fillRect(600, 372, 220, 8);
    for (const [x, w, h] of [[640, 70, 48], [740, 60, 40]]) {
      ctx.fillStyle = '#a9adb3'; ctx.fillRect(x, 372 - h, w, h); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.strokeRect(x, 372 - h, w, h);
      ellipse(x + w / 2, 372 - h, w / 2 + 3, 6, '#c3c7cc', OUTLINE, 2.5); ellipse(x + w / 2, 372 - h - 7, 6, 4, '#333');
    }
    ellipse(890, 376, 50, 9, '#fff', '#bbb', 2);
    for (let i = 0; i < 4; i++) ellipse(868 + i * 15, 370, 9, 6, '#6b3a1f');
  }
}
STAGES.kitchen = () => {
  kitchenBack(false);
  ctx.fillStyle = '#ddd6cc'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = OUTLINE; ctx.fillRect(0, GROUND, W, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x, H); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, GROUND + 36); ctx.lineTo(W, GROUND + 36); ctx.stroke();
};
function silanPrice() {
  const e = G.sceneName === 'fight' && G.enemies[0];
  return (29.9 * (e ? Math.max(0, e.hp) / e.maxHp : 1)).toFixed(2);
}
STAGES.infomercial = (v, t) => {
  const g = ctx.createRadialGradient(W / 2, 260, 40, W / 2, 260, 620); g.addColorStop(0, '#3d7bff'); g.addColorStop(1, '#0b1f66');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  ctx.save(); ctx.translate(W / 2, 260); ctx.rotate(t * 0.004); ctx.fillStyle = 'rgba(255,230,80,0.1)';
  for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(800, -70); ctx.lineTo(800, 70); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.save(); ctx.translate(W / 2, 130); ctx.rotate(-0.03);
  ctx.fillStyle = '#d6201f'; ctx.fillRect(-300, -28, 600, 56); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.strokeRect(-300, -28, 600, 56);
  txt('BUT WAIT... THERE\'S MORE!', 0, 2, 40, t % 40 < 20 ? '#ffe14d' : '#fff');
  ctx.restore();
  ctx.save(); ctx.translate(110, 230); ctx.rotate(-0.2);
  ellipse(0, 0, 62, 62, '#d6201f', '#fff', 5); txt('AS SEEN', 0, -14, 20, '#fff'); txt('ON TV', 0, 14, 26, '#ffe14d');
  ctx.restore();
  ctx.save(); ctx.translate(W - 120, 240); ctx.rotate(Math.sin(t * 0.08) * 0.1);
  ctx.beginPath();
  for (let i = 0; i < 24; i++) { const r = i % 2 ? 58 : 80, an = i * TAU / 24; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  ctx.closePath(); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
  txt('NOW ONLY', 0, -18, 18, '#d6201f', 'center', null); txt(`₪${silanPrice()}`, 0, 12, 30, '#d6201f', 'center', null);
  ctx.restore();
  kitchenBack(true);
  for (let r = 0; r < 3; r++) for (let c = 0; c <= 2 - r; c++) { ctx.save(); ctx.translate(380 + c * 34 + r * 17, 360 - r * 38); jarShape(1.1); ctx.restore(); }
  for (let r = 0; r < 3; r++) for (let c = 0; c <= 2 - r; c++) { ctx.save(); ctx.translate(510 + c * 34 + r * 17, 360 - r * 38); jarShape(1.1); ctx.restore(); }
  ctx.fillStyle = '#16245e'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = OUTLINE; ctx.fillRect(0, GROUND, W, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, GROUND + 6, W, 20);
};
STAGE_OVERLAY.infomercial = () => {
  ctx.fillStyle = '#d6201f'; ctx.fillRect(0, H - 22, W, 22);
  const s = '  CALL NOW: 1-800-SILAN  *  100% DATES  *  OPERATORS ARE STANDING BY  *  SIDE EFFECTS MAY INCLUDE SPEED  *  ';
  ctx.font = `18px ${FONT_HEAD}`;
  const w = ctx.measureText(s).width, off = (G.sceneT * 2) % w;
  for (let x = -off; x < W; x += w) txt(s, x, H - 10, 18, '#fff', 'left', null);
};

STAGES.elevator = (v, t) => {
  ctx.fillStyle = '#8e8b87'; ctx.fillRect(0, 0, W, GROUND);
  for (let i = 0; i < 9; i++) {
    const x = i * 120;
    ctx.fillStyle = i % 2 ? '#97948f' : '#8b8884'; ctx.fillRect(x, 40, 120, GROUND - 40);
    ctx.save(); ctx.beginPath(); ctx.rect(x, 40, 120, GROUND - 40); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 2;
    for (let y = -80; y < GROUND; y += 110) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120, y + 110); ctx.moveTo(x + 120, y); ctx.lineTo(x, y + 110); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 2, 40, 4, GROUND - 40);
    ctx.fillStyle = '#3557c4'; ctx.fillRect(x + 4, 40, 2, GROUND - 40);
    ctx.fillStyle = '#151515'; ctx.fillRect(x - 15, 165, 30, 34); ctx.fillRect(x - 15, 365, 30, 34);
  }
  ctx.fillStyle = '#4a4845'; ctx.fillRect(0, 0, W, 40);
  ctx.fillStyle = '#efe9d8'; ctx.fillRect(W / 2 - 140, 8, 280, 20);
  rrect(W / 2 - 62, 98, 124, 46, 8); ctx.fillStyle = '#0d0d0d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#555'; ctx.stroke();
  const dark = v === 'dark';
  const label = dark ? (t % 50 < 25 ? 'STUCK' : '??') : `▲ ${G.sceneName === 'fight' && G.gim.floor ? G.gim.floor : 1}`;
  txt(label, W / 2, 122, dark ? 26 : 30, '#ff3b2f', 'center', null);
  ctx.fillStyle = '#a3a3a3'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = OUTLINE; ctx.fillRect(0, GROUND, W, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 26) for (let y = GROUND + 10; y < H; y += 18) { ctx.beginPath(); ctx.moveTo(x + ((y / 18) % 2) * 13, y); ctx.lineTo(x + ((y / 18) % 2) * 13 + 9, y - 5); ctx.stroke(); }
  if (dark) { ctx.fillStyle = `rgba(0,0,25,${0.35 + (t % 97 < 4 ? 0.35 : 0)})`; ctx.fillRect(0, 0, W, H); }
};
const darkCv = document.createElement('canvas'); darkCv.width = W; darkCv.height = H;
const dctx = darkCv.getContext('2d');
STAGE_OVERLAY.elevator = () => {
  if (G.dark > 0.02) {
    dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H);
    dctx.fillStyle = `rgba(0,0,10,${G.dark})`; dctx.fillRect(0, 0, W, H);
    dctx.globalCompositeOperation = 'destination-out';
    const holes = [[G.player.x, G.player.y - 100, 95]];
    const m = G.enemies[0]; if (m && m.hp > 0) holes.push([m.x + m.facing * 36, m.y - m.floatY - 110, 130]);
    for (const [x, y, r] of holes) {
      const g = dctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, TAU); dctx.fill();
    }
    ctx.drawImage(darkCv, 0, 0, W, H);
    if (G.dark > 0.5) txt('ELEVATOR STUCK', W / 2, 170, 30, '#ff3b2f');
  }
  const fn = G.gim.floorName;
  if (fn) {
    const a = fn.t > 130 ? (160 - fn.t) / 30 : Math.min(1, fn.t / 10);
    ctx.save(); ctx.globalAlpha = a; rrect(W / 2 - 220, 152, 440, 34, 8); ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill();
    txt(fn.text, W / 2, 170, 22, '#ffe14d'); ctx.restore();
  }
};
