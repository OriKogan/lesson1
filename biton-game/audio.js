/* =====================================================================
   audio.js: every sound is synthesized live with the Web Audio API,
   so there are no audio files to download. Press M in game to mute.
   ===================================================================== */
const Sound = (() => {
  let ac = null, master, sfxBus, musicBus, noiseBuf;
  let muted = false;
  try { muted = localStorage.getItem('biton.muted') === '1'; } catch (e) { /* storage blocked */ }

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 0.22; musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (pending) { const p = pending; pending = null; cur = null; play(p); }
  }

  function tone({ f = 440, f2 = 0, d = 0.15, type = 'square', v = 0.3, delay = 0, bus, attack = 0.005, vib = 0 }) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    if (vib) {
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 6; lg.gain.value = vib; lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t + d + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + d + 0.05);
  }

  function noise({ d = 0.1, v = 0.3, freq = 1200, f2 = 0, q = 1, type = 'lowpass', delay = 0, bus, attack = 0.003 }) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(freq, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(fl); fl.connect(g); g.connect(bus || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + d + 0.05);
  }

  const fx = {
    punch() { noise({ d: 0.08, v: 0.5, freq: 1800 }); tone({ f: 170, f2: 60, d: 0.1, type: 'sine', v: 0.6 }); },
    kick() { noise({ d: 0.12, v: 0.5, freq: 900 }); tone({ f: 120, f2: 40, d: 0.16, type: 'sine', v: 0.75 }); },
    block() { tone({ f: 900, f2: 600, d: 0.06, v: 0.12 }); noise({ d: 0.05, v: 0.2, freq: 4000, type: 'highpass' }); },
    whoosh() { noise({ d: 0.12, v: 0.12, freq: 500, f2: 2500, type: 'bandpass', q: 2 }); },
    jump() { tone({ f: 220, f2: 520, d: 0.12, v: 0.08 }); },
    boing() { tone({ f: 160, f2: 700, d: 0.22, type: 'sine', v: 0.45 }); tone({ f: 700, f2: 180, d: 0.3, type: 'sine', v: 0.35, delay: 0.2 }); },
    shutter() { noise({ d: 0.03, v: 0.6, freq: 3000, type: 'highpass' }); noise({ d: 0.06, v: 0.45, freq: 2000, type: 'highpass', delay: 0.08 }); },
    beep() { tone({ f: 880, d: 0.09, v: 0.12 }); },
    beepHi() { tone({ f: 1320, d: 0.2, v: 0.14 }); },
    ding() { tone({ f: 1318, d: 1.2, type: 'sine', v: 0.3 }); tone({ f: 1046, d: 1.4, type: 'sine', v: 0.25, delay: 0.28 }); },
    splat() { noise({ d: 0.25, v: 0.5, freq: 700, f2: 120 }); tone({ f: 300, f2: 80, d: 0.2, type: 'triangle', v: 0.3 }); },
    glass() { for (let i = 0; i < 5; i++) tone({ f: 2200 + Math.random() * 2400, d: 0.09, type: 'triangle', v: 0.1, delay: i * 0.025 }); },
    splash() { noise({ d: 0.35, v: 0.35, freq: 2600, f2: 500, type: 'bandpass', q: 0.8 }); },
    sip() { tone({ f: 300, f2: 700, d: 0.1, type: 'sine', v: 0.2 }); tone({ f: 300, f2: 750, d: 0.1, type: 'sine', v: 0.2, delay: 0.16 }); },
    nom() { tone({ f: 220, f2: 150, d: 0.08, type: 'triangle', v: 0.3 }); tone({ f: 240, f2: 160, d: 0.08, type: 'triangle', v: 0.3, delay: 0.12 }); },
    snore() { noise({ d: 0.7, v: 0.15, freq: 300, type: 'lowpass', attack: 0.3 }); },
    select() { tone({ f: 660, d: 0.06, v: 0.12 }); tone({ f: 990, d: 0.09, v: 0.12, delay: 0.06 }); },
    move() { tone({ f: 440, d: 0.04, v: 0.07 }); },
    buzz() { tone({ f: 110, d: 0.18, type: 'sawtooth', v: 0.12 }); },
    ko() { tone({ f: 140, f2: 40, d: 0.7, type: 'sawtooth', v: 0.3 }); noise({ d: 0.6, v: 0.45, freq: 600, f2: 80 }); },
    sadTrombone() {
      [392, 370, 349, 330].forEach((f, i) => tone({ f, d: i === 3 ? 1.1 : 0.38, type: 'sawtooth', v: 0.18, delay: i * 0.42, attack: 0.03, vib: i === 3 ? 8 : 0 }));
    },
    fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone({ f, d: i === 3 ? 0.6 : 0.14, type: 'square', v: 0.12, delay: i * 0.12 })); },
    ring() { for (let i = 0; i < 6; i++) tone({ f: i % 2 ? 480 : 620, d: 0.1, type: 'sine', v: 0.2, delay: i * 0.11 + (i > 2 ? 0.3 : 0) }); },
    crowd() { noise({ d: 1.4, v: 0.25, freq: 500, f2: 900, type: 'bandpass', q: 3, attack: 0.4 }); noise({ d: 1.2, v: 0.15, freq: 900, f2: 600, type: 'bandpass', q: 4, attack: 0.3, delay: 0.1 }); },
    laserCharge() { tone({ f: 200, f2: 1400, d: 0.8, type: 'sawtooth', v: 0.06 }); },
    laser() { tone({ f: 1400, f2: 250, d: 0.5, type: 'square', v: 0.12 }); noise({ d: 0.4, v: 0.2, freq: 3000, type: 'highpass' }); },
    scream() { tone({ f: 500, f2: 950, d: 0.55, type: 'sawtooth', v: 0.12, vib: 30 }); },
    slip() { tone({ f: 900, f2: 200, d: 0.3, type: 'sine', v: 0.2 }); },
    steam() { noise({ d: 0.4, v: 0.12, freq: 5000, type: 'highpass' }); },
    slipper() { noise({ d: 0.1, v: 0.6, freq: 1200, type: 'bandpass' }); tone({ f: 600, f2: 200, d: 0.08, v: 0.2 }); },
    tag() { tone({ f: 330, f2: 660, d: 0.1, v: 0.15 }); tone({ f: 660, d: 0.15, v: 0.15, delay: 0.1 }); },
  };

  /* ---------------- music sequencer ---------------- */
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const midi = s => { const m = s.match(/^([A-G]#?)(\d)$/); return m ? 12 * (+m[2] + 1) + NOTE[m[1]] : 0; };
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);
  const seq = s => s.trim().split(/\s+/).map(t => (t === '.' ? 0 : t === '-' ? -1 : midi(t)));

  const TRACKS = {
    title: { bpm: 140, lead: { w: 'square', v: 0.1 }, bass: { w: 'triangle', v: 0.3 },
      L: seq('E5 . G5 . A5 . . E5 G5 . A5 . C6 . A5 . E5 . G5 . A5 . . G5 E5 . D5 . C5 . D5 .'),
      B: seq('A2 . A3 . A2 . A3 . A2 . A3 . A2 . A3 . F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .'),
      D: 'k.h.s.h.k.k.s.h.k.h.s.h.k.k.s.ss' },
    biton: { bpm: 150, lead: { w: 'square', v: 0.09 }, bass: { w: 'triangle', v: 0.32 },
      L: seq('A4 . . A4 C5 . A4 . G4 . E4 . G4 . A4 . A4 . . A4 C5 . D5 . E5 . D5 . C5 . G4 .'),
      B: seq('A2 . A2 . A2 . A2 . G2 . G2 . G2 . G2 . F2 . F2 . F2 . F2 . E2 . E2 . G2 . G2 .'),
      D: 'k.h.s.h.k.k.s.h.k.h.s.h.k.k.s.ss' },
    ultra: { bpm: 172, lead: { w: 'sawtooth', v: 0.06 }, bass: { w: 'square', v: 0.12 },
      L: seq('E5 E5 . E5 G5 . E5 . D5 . C5 . D5 . E5 . A5 . G5 . E5 . D5 . C5 D5 E5 . B4 . . .'),
      B: seq('E2 E2 E3 E2 E2 E3 E2 E3 C2 C2 C3 C2 C2 C3 C2 C3 D2 D2 D3 D2 D2 D3 D2 D3 B1 B1 B2 B1 B1 B2 B1 B2'),
      D: 'k.hks.hkk.hks.hsk.hks.hkk.hksss' },
    selfie: { bpm: 118, lead: { w: 'square', v: 0.08 }, bass: { w: 'triangle', v: 0.32 },
      L: seq('E5 . G5 . E5 . C5 . D5 . . . . . . . E5 . G5 . A5 . G5 . E5 . D5 . C5 . . .'),
      B: seq('C3 . C3 C3 . . C3 . A2 . A2 A2 . . A2 . F2 . F2 F2 . . F2 . G2 . G2 G2 . . G2 .'),
      D: 'k.h.s.h.k.h.s.hhk.h.s.h.kkh.s.h.' },
    silan: { bpm: 176, lead: { w: 'square', v: 0.08 }, bass: { w: 'triangle', v: 0.34 },
      L: seq('E5 . E5 F5 G5 . E5 . C5 . C5 . D5 . . . F5 . F5 E5 D5 . B4 . C5 . E5 . C5 . . .'),
      B: seq('C3 . G2 . C3 . G2 . C3 . G2 . G2 . B2 . F2 . C3 . F2 . C3 . G2 . D3 . C3 . G2 .'),
      D: 'k.s.k.s.k.s.k.s.k.s.k.s.k.s.kss' },
    infomercial: { bpm: 132, lead: { w: 'square', v: 0.08 }, bass: { w: 'triangle', v: 0.3 },
      L: seq('C5 E5 G5 C6 . . G5 . A5 . G5 . E5 . . . F5 A5 C6 F6 . . C6 . D6 . C6 . G5 . . .'),
      B: seq('C3 . C3 . E3 . G3 . C3 . C3 . G2 . G2 . F2 . F2 . A2 . C3 . G2 . G2 . B2 . D3 .'),
      D: 'k.h.s.h.k.h.s.h.k.h.s.h.k.hss.s' },
    elevator: { bpm: 96, lead: { w: 'sine', v: 0.16 }, bass: { w: 'triangle', v: 0.3 },
      L: seq('E5 . . D5 . . C5 . . . A4 . . . . . D5 . . C5 . . B4 . . . G4 . . . . .'),
      B: seq('A2 . . . E3 . . A2 . . . E3 . . . D3 . . . A2 . . G2 . . . D3 . . . . .'),
      D: 'h..h..h.h..h..h.h..h..h.h..h..h.' },
    ascension: { bpm: 120, lead: { w: 'sawtooth', v: 0.05 }, bass: { w: 'square', v: 0.1 },
      L: seq('A4 . C5 . E5 . A5 . G5 . E5 . C5 . D5 . F4 . A4 . D5 . F5 . E5 . D5 . G#4 . B4 .'),
      B: seq('A1 . A2 . A1 . A2 . A1 . A2 . A1 . A2 . D2 . D3 . D2 . D3 . E2 . E3 . E2 . E3 .'),
      D: 'k...s...k.k.s...k...s...k.k.s.ss' },
    victory: { bpm: 128, lead: { w: 'square', v: 0.09 }, bass: { w: 'triangle', v: 0.3 },
      L: seq('C5 . E5 . G5 . C6 . . . G5 . C6 . . . A5 . F5 . A5 . C6 . B5 . G5 . D6 . . .'),
      B: seq('C3 . G2 . C3 . G2 . C3 . G2 . C3 . G2 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 .'),
      D: 'k.h.s.h.k.h.s.h.k.h.s.h.k.k.s.ss' },
  };

  let cur = null, pending = null, step = 0, nextT = 0, timer = null, tempo = 1;
  function playStep(tr, i, t, spb) {
    const l = tr.L[i % tr.L.length], b = tr.B[i % tr.B.length];
    if (l > 0) note(l, t, spb * 1.6, tr.lead.w, tr.lead.v);
    if (b > 0) note(b, t, spb * 1.8, tr.bass.w, tr.bass.v);
    const dch = tr.D[i % tr.D.length];
    if (dch === 'k') { drumTone(150, 45, t, 0.14, 0.7); }
    else if (dch === 's') { drumNoise(t, 0.12, 0.35, 1800, 'bandpass'); }
    else if (dch === 'h') { drumNoise(t, 0.03, 0.12, 7000, 'highpass'); }
  }
  function note(m, t, d, w, v) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = w; o.frequency.value = freq(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
  }
  function drumTone(f, f2, t, d, v) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
  }
  function drumNoise(t, d, v, f, type) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
    const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(musicBus); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  }
  function sched() {
    const tr = TRACKS[cur]; if (!tr || !ac) return;
    const spb = 60 / (tr.bpm * tempo) / 4;
    while (nextT < ac.currentTime + 0.12) { playStep(tr, step, nextT, spb); nextT += spb; step = (step + 1) % 32; }
  }
  function play(name) {
    if (cur === name) return;
    stop(); cur = name; tempo = 1;
    if (!ac) { pending = name; return; }
    step = 0; nextT = ac.currentTime + 0.06; timer = setInterval(sched, 25);
  }
  function stop() { if (timer) clearInterval(timer); timer = null; cur = null; pending = null; }
  function setTempo(x) { tempo = x; }

  /* ---------------- text to speech (announcer + the Monk) ---------------- */
  function say(text, opt = {}) {
    if (muted || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = opt.pitch ?? 1; u.rate = opt.rate ?? 1; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* speech not available */ }
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.7;
    if (muted && window.speechSynthesis) speechSynthesis.cancel();
    try { localStorage.setItem('biton.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    return muted;
  }

  return { init, fx, play, stop, setTempo, say, toggleMute, get muted() { return muted; } };
})();
