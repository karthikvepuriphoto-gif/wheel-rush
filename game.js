import * as THREE from './three.module.min.js';
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function rngf(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const fmt = t => { if (t == null || !isFinite(t)) return '--'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
const IS_TOUCH = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

/* ---------------- data ---------------- */
const COURSES = [
  { id: 'coast', name: 'Sunny Coast', icon: '🏖️', desc: 'Palm trees, ocean breeze and easy curves.', seed: 11, R: 520, a: .16, k: 3, b: .08, m: 5, hill: 6, sky: 0x8fd3ff, fog: 0xbfe6ff, ground: 0x7cc96a, edge: 0xf2d79b, deco: 'palm', rec: 74, obs: ['cone', 'cone', 'box', 'puddle'] },
  { id: 'city', name: 'Neon City', icon: '🏙️', desc: 'Tall buildings, barrels and puddles.', seed: 23, R: 560, a: .2, k: 4, b: .1, m: 2, hill: 2, sky: 0x9fb4d8, fog: 0xc7d3ea, ground: 0x5f6773, edge: 0x9aa2ad, deco: 'city', rec: 85, obs: ['cone', 'barrel', 'box', 'puddle'] },
  { id: 'desert', name: 'Canyon Desert', icon: '🌵', desc: 'Long fast straights past red rocks and cactus.', seed: 37, R: 640, a: .24, k: 2, b: .12, m: 3, hill: 14, sky: 0xffd9a0, fog: 0xffe6c2, ground: 0xe0a66a, edge: 0xd28b52, deco: 'cactus', rec: 92, obs: ['barrel', 'box', 'cone', 'tumble'] },
  { id: 'snow', name: 'Snowy Peaks', icon: '🏔️', desc: 'Pine forest, hills and snowballs on the road.', seed: 51, R: 600, a: .22, k: 5, b: .1, m: 3, hill: 22, sky: 0xcfe3f5, fog: 0xe6f0fa, ground: 0xf4f8fc, edge: 0xdfe8f2, deco: 'pine', rec: 100, obs: ['snowball', 'cone', 'barrel', 'puddle'] }
];
const CARS = [
  { id: 'zippy', name: 'Zippy', icon: '🚗', desc: 'Easy to steer. A great first car.', spd: 1, acc: 1, hnd: 1.1, cost: 0 },
  { id: 'cruiser', name: 'Cruiser', icon: '🚙', desc: 'Bigger boost tank, steady and strong.', spd: 1.05, acc: 1, hnd: 1, boost: 1.3, cost: 1500 },
  { id: 'rocket', name: 'Rocket', icon: '🏎️', desc: 'The fastest car. Needs good steering!', spd: 1.12, acc: 1.1, hnd: .95, cost: 4000 }
];
const COLORS = ['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#00c7be', '#0a84ff', '#5e5ce6', '#ff2d92', '#f2f2f7', '#1c1c1e'];
const SKEY = 'wheelrush_v1';
const DEF = { cash: 0, car: 'zippy', color: '#ff3b30', owned: ['zippy'], unlocked: ['coast'], best: {}, ghost: {}, wins: {},
  set: { steer: 'tilt', sens: 3, inv: false, diff: 'easy', pacerTT: true, pacerRace: false, tod: 'day', snd: true, cal: 0 } };
let S; try { S = JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { S = {}; }
S = Object.assign(JSON.parse(JSON.stringify(DEF)), S); S.set = Object.assign({}, DEF.set, S.set);
const save = () => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { } };

/* ---------------- renderer ---------------- */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_TOUCH ? 1.5 : 2));
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 3000);
let scene = new THREE.Scene();
let ROT = 0, softPaused = false; const VW = () => ROT ? innerHeight : innerWidth, VH = () => ROT ? innerWidth : innerHeight;
let state = 'menu', paused = false, rotDismissed = false, last = performance.now();
function setRot(a) { ROT = a; document.body.classList.toggle('rot90', a === 90); document.body.classList.toggle('rotm90', a === -90); resize(); }
function resize() {
  const pageP = IS_TOUCH && innerHeight > innerWidth; if (ROT && !pageP) { ROT = 0; document.body.classList.remove('rot90', 'rotm90'); }
  const w = VW(), h = VH(); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const portrait = IS_TOUCH && h > w;
  if (state === 'race' && portrait) { if (!paused) { paused = true; softPaused = true; sfx.engine(0); } $('tiltHint').classList.add('on'); }
  else if (softPaused && !portrait) { setTimeout(() => { if (softPaused && !(IS_TOUCH && VH() > VW())) { softPaused = false; paused = false; last = performance.now(); $('tiltHint').classList.remove('on'); } }, 250); }
  $('rotate').classList.toggle('need', portrait && !rotDismissed && state !== 'race');
}
addEventListener('resize', () => { resize(); setTimeout(resize, 120); }); addEventListener('orientationchange', () => setTimeout(resize, 200));
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (!e.target.closest('.cards,.set')) e.preventDefault(); }, { passive: false });

/* ---------------- textures ---------------- */
function roadTex(night) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = night ? '#2a2d33' : '#3b3f46'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2500; i++) { const v = 50 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v},${v},${v + 4},.5)`; g.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); }
  g.fillStyle = '#ffffff'; g.fillRect(10, 0, 9, 512); g.fillRect(237, 0, 9, 512);   // bold white edges
  g.fillStyle = '#ffd60a'; for (let y = 0; y < 512; y += 128) { g.fillRect(84, y, 7, 70); g.fillRect(165, y, 7, 70); } // dashed lanes
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function curbTex() { const c = document.createElement('canvas'); c.width = 8; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#e53935'; g.fillRect(0, 0, 8, 32); g.fillStyle = '#fff'; g.fillRect(0, 32, 8, 32); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }

/* ---------------- audio ---------------- */
let AC = null, eng = null, master = null;
function ensureAudio() { if (AC) { if (AC.state === 'suspended') AC.resume(); return; } try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = S.set.snd ? .5 : 0; master.connect(AC.destination);
  const o = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain(); o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g); g.connect(master); o.start(); o2.start(); eng = { o, o2, g, f }; } catch (e) { } }
function tone(freq, dur, type = 'sine', vol = .3, slide = 0) { if (!AC) return; const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02); }
function noise(dur, vol = .3, fq = 800) { if (!AC) return; const n = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = n; f.type = 'lowpass'; f.frequency.value = fq; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(); }
const sfx = {
  engine(v, boost) { if (!eng) return; const t = AC.currentTime; eng.o.frequency.setTargetAtTime(45 + v * 2.2 + (boost ? 25 : 0), t, .1); eng.o2.frequency.setTargetAtTime(22 + v * 1.1, t, .1); eng.g.gain.setTargetAtTime(v > 0 ? .07 + v / 900 : 0, t, .1); eng.f.frequency.setTargetAtTime(500 + v * 18, t, .1); },
  bump() { noise(.25, .45, 500); tone(140, .2, 'square', .15, -60); }, splash() { noise(.4, .35, 2500); },
  coin() { tone(988, .08, 'square', .12); setTimeout(() => tone(1319, .15, 'square', .12), 70); }, boostUp() { tone(500, .25, 'triangle', .2, 700); },
  boost() { noise(.6, .25, 1500); tone(200, .6, 'sawtooth', .12, 400); }, beep(hi) { tone(hi ? 880 : 440, hi ? .5 : .2, 'square', .18); },
  lap() { [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, .15, 'triangle', .2), i * 90)); }, win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .25, 'triangle', .25), i * 140)); }
};
$('bMute').onclick = () => { S.set.snd = !S.set.snd; save(); if (master) master.gain.value = S.set.snd ? .5 : 0; $('bMute').textContent = S.set.snd ? '🔊' : '🔇'; };

/* ---------------- input (tilt code reused from Tilt Rider) ---------------- */
const keys = {}; const touch = { l: 0, r: 0, brk: 0, boost: 0 };
addEventListener('keydown', e => { keys[e.code] = true; if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'race') { paused ? resume() : pause(); } if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function bindHold(id, k) { const el = $(id); const on = e => { e.preventDefault(); touch[k] = 1; el.classList.add('down'); ensureAudio(); try { el.setPointerCapture(e.pointerId); } catch (x) { } }, off = () => { touch[k] = 0; el.classList.remove('down'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off); el.addEventListener('contextmenu', e => e.preventDefault()); }
bindHold('cLeft', 'l'); bindHold('cRight', 'r'); bindHold('cBrake', 'brk'); bindHold('cBoost', 'boost');
const tilt = { raw: null, val: 0, has: false, g: null, g0: null, src: '', lockA: null, deg: 0, landT: 0 };
function orientAngle() { if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle; return typeof window.orientation === 'number' ? window.orientation : 0; }
const wrap180 = d => { while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
const gAng = g => Math.atan2(g.y, g.x) * 180 / Math.PI;
function onOrient(e) { if (e.beta == null && e.gamma == null) return; const a = tilt.lockA != null ? tilt.lockA : orientAngle(); let v; if (a === 90) v = e.beta; else if (a === -90 || a === 270) v = -e.beta; else if (a === 180) v = -e.gamma; else v = e.gamma; tilt.raw = v; if (!tilt.has) { tilt.has = true; updateCtlMode(); } }
function onMotion(e) { const a = e.accelerationIncludingGravity; if (!a || a.x == null || a.y == null) return; if (Math.hypot(a.x, a.y) < 2.5) return;
  if (!tilt.g) tilt.g = { x: a.x, y: a.y }; else { tilt.g.x += (a.x - tilt.g.x) * .5; tilt.g.y += (a.y - tilt.g.y) * .5; }
  tilt.src = 'motion'; if (!tilt.has) { tilt.has = true; updateCtlMode(); }
  if (tilt.g0 == null) tilt.g0 = gAng(tilt.g);
  const pageP = IS_TOUCH && innerHeight > innerWidth, sideways = Math.abs(tilt.g.x) > Math.abs(tilt.g.y) * 1.4;
  if (pageP && sideways && !ROT && !softPaused) { if (!tilt.landT) tilt.landT = performance.now(); else if (performance.now() - tilt.landT > 700) { setRot(tilt.g.x < 0 ? 90 : -90); tilt.g0 = gAng(tilt.g); } } else tilt.landT = 0; }
addEventListener('deviceorientation', onOrient); addEventListener('devicemotion', onMotion);
async function requestTilt() { try { if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') { const r = await DeviceOrientationEvent.requestPermission(); if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) { try { await DeviceMotionEvent.requestPermission(); } catch (x) { } } return r === 'granted'; } } catch (e) { return false; } return true; }
function recenter() { if (tilt.g) { tilt.g0 = gAng(tilt.g); banner('Steering centered ✓', 900); } else if (tilt.raw != null) { S.set.cal = tilt.raw; save(); banner('Steering centered ✓', 900); } else banner('No tilt sensor on this device', 1400); }
function tiltDeg() { let d = tilt.src === 'motion' && tilt.g ? wrap180(gAng(tilt.g) - tilt.g0) : wrap180(tilt.raw - S.set.cal); return S.set.inv ? -d : d; }
function useTilt() { return S.set.steer === 'tilt' && tilt.has; }
function updateCtlMode() { document.body.classList.toggle('touchsteer', IS_TOUCH && !useTilt()); }
function readInput(dt) {
  let steer = 0, wheelDeg = 0;
  if (useTilt()) { const full = clamp(32 - S.set.sens * 2, 12, 30), DZ = 3; let d = tiltDeg(); tilt.deg = d; wheelDeg = clamp(d, -100, 100); d = Math.abs(d) < DZ ? 0 : d - Math.sign(d) * DZ;
    let n = clamp(d / (full - DZ), -1, 1); n = .45 * n + .55 * n * Math.abs(n);
    tilt.val = lerp(tilt.val, n, Math.min(1, dt * 7)); steer = tilt.val; }
  else { const t = (keys.ArrowRight || keys.KeyD || touch.r ? 1 : 0) - (keys.ArrowLeft || keys.KeyA || touch.l ? 1 : 0); tilt.val = lerp(tilt.val, t, Math.min(1, dt * 5)); steer = tilt.val; wheelDeg = steer * 90; }
  if (WR.autopilot) { steer = autoSteer(player); tilt.val = steer; wheelDeg = steer * 90; }
  return { steer, wheelDeg, brake: !!(keys.Space || keys.ArrowDown || keys.KeyS || touch.brk), boost: !!(keys.ShiftLeft || keys.ShiftRight || keys.KeyB || keys.ArrowUp || touch.boost) };
}

/* ---------------- track ---------------- */
const RW = 8; // half road width (m)
let C, T = null; // course, track data
function buildTrack(c) {
  const rnd = rngf(c.seed), ph = rnd() * 6.28, ph2 = rnd() * 6.28, pts = [];
  for (let i = 0; i < 24; i++) { const th = i / 24 * Math.PI * 2; const r = c.R * (1 + c.a * Math.sin(c.k * th + ph) + c.b * Math.cos(c.m * th + ph2));
    pts.push(new THREE.Vector3(Math.cos(th) * r, c.hill * Math.sin(th * 2 + ph2) + c.hill * .5 * Math.sin(th * 3), Math.sin(th) * r)); }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal'); const L = curve.getLength(), ds = 2, N = Math.round(L / ds);
  const P = [], TG = [], RT = [], CV = [];
  for (let i = 0; i < N; i++) { const u = i / N; P.push(curve.getPointAt(u)); TG.push(curve.getTangentAt(u)); }
  for (let i = 0; i < N; i++) { const t = TG[i]; RT.push(new THREE.Vector3(-t.z, 0, t.x).normalize()); }
  for (let i = 0; i < N; i++) { const a = TG[(i - 3 + N) % N], b = TG[(i + 3) % N]; CV.push((a.x * b.z - a.z * b.x) / (6 * ds)); }
  return { L: N * ds, N, ds, P, TG, RT, CV };
}
function idx(s) { const f = ((s % T.L) + T.L) % T.L / T.ds; const i = Math.floor(f); return [i % T.N, (i + 1) % T.N, f - i]; }
const _v = new THREE.Vector3();
function posAt(s, x, out = new THREE.Vector3()) { const [i, j, f] = idx(s); out.lerpVectors(T.P[i], T.P[j], f); _v.lerpVectors(T.RT[i], T.RT[j], f).normalize(); return out.addScaledVector(_v, x); }
function dirAt(s, out = new THREE.Vector3()) { const [i, j, f] = idx(s); return out.lerpVectors(T.TG[i], T.TG[j], f).normalize(); }
function curvAt(s) { const [i, j, f] = idx(s); return lerp(T.CV[i], T.CV[j], f); }
function ribbon(x0, x1, y, vScale, mat) { const N = T.N, pos = new Float32Array((N + 1) * 6), uv = new Float32Array((N + 1) * 4), ind = [];
  for (let k = 0; k <= N; k++) { const i = k % N, p = T.P[i], r = T.RT[i]; pos.set([p.x + r.x * x0, p.y + y, p.z + r.z * x0, p.x + r.x * x1, p.y + y, p.z + r.z * x1], k * 6); uv.set([0, k * T.ds / vScale, 1, k * T.ds / vScale], k * 4);
    if (k < N) { const a = k * 2; ind.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(ind); g.computeVertexNormals(); mat.side = THREE.DoubleSide; const m = new THREE.Mesh(g, mat); scene.add(m); return m; }

/* ---------------- models ---------------- */
function carModel(color, ghost) {
  const g = new THREE.Group(); const mp = o => ghost ? new THREE.MeshBasicMaterial({ color: o.color || 0x88ddff, transparent: true, opacity: .35, depthWrite: false }) : new THREE.MeshStandardMaterial(o);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, .6, 4.2), mp({ color, roughness: .35, metalness: .4 })); body.position.y = .55; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, .55, 2), mp({ color: 0x223344, roughness: .1, metalness: .6 })); cab.position.set(0, 1.1, -.2); g.add(cab);
  const wg = new THREE.CylinderGeometry(.38, .38, .3, 12); wg.rotateZ(Math.PI / 2); const wm = mp({ color: 0x111111, roughness: .8 });
  for (const [x, z] of [[-.95, 1.35], [.95, 1.35], [-.95, -1.35], [.95, -1.35]]) { const w = new THREE.Mesh(wg, wm); w.position.set(x, .38, z); g.add(w); }
  if (!ghost) { const tl = new THREE.Mesh(new THREE.BoxGeometry(1.6, .15, .05), new THREE.MeshBasicMaterial({ color: 0xff2020 })); tl.position.set(0, .7, -2.11); g.add(tl);
    const sp = new THREE.Mesh(new THREE.BoxGeometry(1.8, .08, .4), mp({ color: 0x111111 })); sp.position.set(0, 1.05, -2); g.add(sp); }
  return g;
}
function obstacleModel(type) {
  let m;
  if (type === 'cone') { m = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(.35, .9, 12), new THREE.MeshStandardMaterial({ color: 0xff6a00 })); c.position.y = .45; m.add(c); const s = new THREE.Mesh(new THREE.CylinderGeometry(.24, .28, .12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff })); s.position.y = .45; m.add(s); }
  else if (type === 'barrel') { m = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 1.1, 14), new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: .5 })); m.geometry.translate(0, .55, 0); }
  else if (type === 'box') { m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xc8935a, roughness: .9 })); m.geometry.translate(0, .5, 0); }
  else if (type === 'puddle') { m = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshStandardMaterial({ color: 0x5aa9e6, roughness: .05, metalness: .3, transparent: true, opacity: .75 })); m.geometry.rotateX(-Math.PI / 2); m.geometry.translate(0, .04, 0); m.scale.set(1, 1, 1.6); }
  else if (type === 'snowball') { m = new THREE.Mesh(new THREE.SphereGeometry(.6, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 })); m.geometry.translate(0, .55, 0); }
  else { m = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 0), new THREE.MeshStandardMaterial({ color: 0xa47a3c, wireframe: true })); m.geometry.translate(0, .6, 0); }
  return m;
}
function decoInstances(kind, rnd, night) {
  const list = []; for (let s = 0; s < T.L; s += 14) for (const side of [-1, 1]) { if (rnd() < .45) continue; const x = side * (RW + 7 + rnd() * 60); const p = posAt(s, x); list.push([p, rnd()]); }
  const dummy = new THREE.Object3D(); const add = (geo, mat, f) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([p, r], i) => { f(dummy, p, r); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); scene.add(im); };
  if (kind === 'palm') { const tr = new THREE.CylinderGeometry(.25, .4, 8, 6); tr.translate(0, 4, 0); add(tr, new THREE.MeshStandardMaterial({ color: 0x8d6e4a }), (d, p, r) => { d.position.copy(p); d.rotation.set(0, r * 6, (r - .5) * .3); d.scale.setScalar(.8 + r * .5); });
    const lf = new THREE.ConeGeometry(3, 2, 7); lf.translate(0, 8.5, 0); add(lf, new THREE.MeshStandardMaterial({ color: 0x2e9e4f }), (d, p, r) => { d.position.copy(p); d.rotation.set(0, r * 6, (r - .5) * .3); d.scale.setScalar(.8 + r * .5); }); }
  else if (kind === 'pine') { const tr = new THREE.ConeGeometry(2.4, 9, 8); tr.translate(0, 4.5, 0); add(tr, new THREE.MeshStandardMaterial({ color: 0x1f5e3a }), (d, p, r) => { d.position.copy(p); d.rotation.set(0, 0, 0); d.scale.setScalar(.7 + r * .8); });
    const sn = new THREE.ConeGeometry(1.3, 3, 8); sn.translate(0, 8, 0); add(sn, new THREE.MeshStandardMaterial({ color: 0xffffff }), (d, p, r) => { d.position.copy(p); d.scale.setScalar(.7 + r * .8); }); }
  else if (kind === 'cactus') { const tr = new THREE.CylinderGeometry(.5, .6, 5, 8); tr.translate(0, 2.5, 0); add(tr, new THREE.MeshStandardMaterial({ color: 0x3f8f3a }), (d, p, r) => { d.position.copy(p); d.scale.setScalar(.6 + r); });
    const rk = new THREE.DodecahedronGeometry(3, 0); add(rk, new THREE.MeshStandardMaterial({ color: 0xb5562e, flatShading: true }), (d, p, r) => { d.position.copy(p).add(new THREE.Vector3(6, 0, 4)); d.rotation.set(r, r * 3, 0); d.scale.set(1 + r * 2, .6 + r * 2.5, 1 + r); }); }
  else { const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, .5, 0); const wt = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#4a5568'; g.fillRect(0, 0, 64, 128); for (let y = 6; y < 128; y += 14) for (let x = 6; x < 64; x += 14) { g.fillStyle = Math.random() < (night ? .55 : .3) ? '#ffe9a8' : '#2b3442'; g.fillRect(x, y, 8, 9); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    add(bg, new THREE.MeshStandardMaterial({ map: wt, emissive: night ? 0xffffff : 0x000000, emissiveMap: wt, emissiveIntensity: night ? .6 : 0 }), (d, p, r) => { d.position.copy(p); d.rotation.set(0, r * 3, 0); d.scale.set(8 + r * 8, 14 + r * 50, 8 + r * 8); }); }
}

/* ---------------- race setup ---------------- */
let player, racers = [], obstacles = [], pickups = [], mode = 'race', curC = 0, raceTime = 0, countT = 0, LAPS = 2;
let ghostRec = [], ghostPlay = null, ghostMesh = null, hood, pacer = null, miniPath = null, endT = 0;
const DIFF = { easy: { vmax: 46, ai: .9, drift: .25, assist: 1 }, normal: { vmax: 52, ai: 1, drift: .6, assist: .5 } };
function carStats() { const c = CARS.find(x => x.id === S.car) || CARS[0]; return c; }
function recordFor(ci) { const c = COURSES[ci], b = S.best[c.id]; return b && b < c.rec ? { t: b, mine: true } : { t: c.rec, mine: false }; }
function setupRace(ci, m) {
  curC = ci; mode = m; C = COURSES[ci]; scene = new THREE.Scene(); T = buildTrack(C);
  const tod = S.set.tod === 'auto' ? ['day', 'sunset', 'night'][ci % 3] : S.set.tod, night = tod === 'night', sunset = tod === 'sunset';
  const sky = new THREE.Color(C.sky); if (sunset) sky.lerp(new THREE.Color(0xff9a5a), .55); if (night) sky.set(0x0d1630);
  scene.background = sky; const fogC = night ? new THREE.Color(0x101a36) : new THREE.Color(C.fog).lerp(sky, sunset ? .5 : 0);
  scene.fog = new THREE.Fog(fogC, 120, night ? 420 : 650);
  scene.add(new THREE.HemisphereLight(night ? 0x6677aa : 0xffffff, night ? 0x111122 : 0x667755, night ? .9 : 1.25));
  const sun = new THREE.DirectionalLight(sunset ? 0xffb37a : 0xffffff, night ? .25 : 1.6); sun.position.set(200, 400, 100); scene.add(sun);
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: night ? new THREE.Color(C.ground).multiplyScalar(.35) : C.ground, roughness: 1 })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -Math.max(0, C.hill * 1.5) - .3; scene.add(gnd);
  const rt = roadTex(night); ribbon(-RW - 14, RW + 14, -.08, 10, new THREE.MeshStandardMaterial({ color: night ? new THREE.Color(C.edge).multiplyScalar(.4) : C.edge, roughness: 1 }));
  ribbon(-RW, RW, 0, 22, new THREE.MeshStandardMaterial({ map: rt, roughness: .85, emissive: night ? 0xffffff : 0, emissiveMap: night ? rt : null, emissiveIntensity: night ? .25 : 0 }));
  const ct = curbTex(); ribbon(-RW - 1, -RW, .02, 4, new THREE.MeshStandardMaterial({ map: ct })); ribbon(RW, RW + 1, .02, 4, new THREE.MeshStandardMaterial({ map: ct }));
  if (C.id === 'coast') { const sea = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ color: night ? 0x0b2a4a : 0x2a8fd6, roughness: .2, metalness: .2 })); sea.rotation.x = -Math.PI / 2; sea.position.y = gnd.position.y - .5; scene.add(sea); gnd.geometry = new THREE.CircleGeometry(C.R * 1.6, 48); }
  const rnd = rngf(C.seed * 7); decoInstances(C.deco, rnd, night);
  // start/finish arch
  const arch = new THREE.Group(); const pm = new THREE.MeshStandardMaterial({ color: 0xffffff }); for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.6, 7, .6), pm); p.position.set(sx * (RW + 1.5), 3.5, 0); arch.add(p); }
  const bc = document.createElement('canvas'); bc.width = 256; bc.height = 32; const bg = bc.getContext('2d'); for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { bg.fillStyle = (i + j) % 2 ? '#111' : '#fff'; bg.fillRect(i * 8, j * 8, 8, 8); }
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; const ban = new THREE.Mesh(new THREE.BoxGeometry(2 * RW + 3.6, 1.4, .3), new THREE.MeshBasicMaterial({ map: bt })); ban.position.y = 7; arch.add(ban);
  arch.position.copy(T.P[0]); arch.lookAt(T.P[0].clone().add(T.TG[0])); scene.add(arch);
  // obstacles & pickups
  obstacles = []; pickups = []; const orng = rngf(C.seed * 13), dens = S.set.diff === 'easy' ? 70 : 52;
  for (let s = 220; s < T.L - 80; s += dens * (0.7 + orng() * .6)) {
    const n = orng() < .3 ? 2 : 1; const lanes = [-5, -1.7, 1.7, 5].sort(() => orng() - .5);
    for (let k = 0; k < n; k++) { const type = C.obs[Math.floor(orng() * C.obs.length)], x = lanes[k] + (orng() - .5); const m = obstacleModel(type); scene.add(m); obstacles.push({ s, x, type, m, hit: false, fly: null }); }
    const pt = orng() < .35 ? 'boost' : 'coin', px = lanes[2]; for (let q = 0; q < (pt === 'coin' ? 4 : 1); q++) pickups.push({ s: s + 22 + q * 5, x: px, type: pt, taken: false });
  }
  const coinG = new THREE.CylinderGeometry(.5, .5, .12, 18); coinG.rotateX(Math.PI / 2); const coinM = new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: .8, roughness: .25, emissive: 0x664400 });
  const bG = new THREE.OctahedronGeometry(.6), bM = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x0088aa, emissiveIntensity: 1 });
  for (const p of pickups) { p.m = new THREE.Mesh(p.type === 'coin' ? coinG : bG, p.type === 'coin' ? coinM : bM); scene.add(p.m); posAt(p.s, p.x, p.m.position).y += 1; }
  for (const o of obstacles) { posAt(o.s, o.x, o.m.position); o.m.lookAt(o.m.position.clone().add(dirAt(o.s))); o.home = o.m.position.clone(); }
  // cars
  const cs = carStats(), D = DIFF[S.set.diff];
  player = { s: 0, x: 0, v: 0, xd: 0, vmax: D.vmax * cs.spd, acc: 14 * cs.acc, hnd: cs.hnd, boost: .5, boostCap: cs.boost || 1, boostT: 0, wob: 0, lapStart: 0, lap: 0, laps: [], best: null, coins: 0, done: false, finishT: 0, isP: true, heading: 0 };
  racers = [player];
  if (mode === 'race') { const names = ['Bolt', 'Sunny', 'Pip', 'Turbo', 'Maple'], cols = ['#0a84ff', '#34c759', '#ffd60a', '#ff2d92', '#ff9500'];
    for (let i = 0; i < 5; i++) { const r = { s: -8 - i * 8 - (i % 2) * 4, x: (i % 2 ? 3.5 : -3.5), v: 0, xd: 0, tx: (i % 2 ? 3.5 : -3.5), vmax: D.vmax * cs.spd * D.ai * (0.93 + i * .025), wob: 0, name: names[i], lap: 0, done: false, finishT: 0, m: carModel(cols[i]) }; r.vmax = Math.min(r.vmax, D.vmax * 1.02); scene.add(r.m); racers.push(r); }
    player.s = -48; player.x = -3.5; player.lapStart = 0; }
  LAPS = mode === 'race' ? 2 : 3;
  // ghost
  ghostRec = []; ghostPlay = mode === 'tt' ? S.ghost[C.id] || null : null; ghostMesh = null;
  if (ghostPlay) { ghostMesh = carModel(0x88ddff, true); scene.add(ghostMesh); }
  // hood + mirrors attached to camera
  scene.add(camera); while (camera.children.length) camera.remove(camera.children[0]);
  hood = new THREE.Group(); const hm = new THREE.Mesh(new THREE.BoxGeometry(2.1, .3, 2.6), new THREE.MeshStandardMaterial({ color: S.color, roughness: .3, metalness: .5 })); hm.position.set(0, -1.0, -2.3); hm.rotation.x = .06; hood.add(hm);
  camera.add(hood); camera.add(new THREE.PointLight(0xffffff, night ? 2 : 0, 0)); if (night) { const hl = new THREE.SpotLight(0xfff4d0, 60, 160, .5, .6, 1); hl.position.set(0, -.6, -1); hl.target.position.set(0, -2, -40); camera.add(hl); camera.add(hl.target); }
  // pacer lights
  const pOn = mode === 'tt' ? S.set.pacerTT : S.set.pacerRace; pacer = null;
  if (pOn) { const sp = 3, n = Math.floor(T.L / sp), im = new THREE.InstancedMesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), n * 2), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) for (const k of [0, 1]) { posAt(i * sp, (k ? 1 : -1) * (RW + .5), d.position); d.position.y += .3; d.updateMatrix(); im.setMatrixAt(i * 2 + k, d.matrix); im.setColorAt(i * 2 + k, new THREE.Color(0x4a4f58)); }
    scene.add(im); const rec = recordFor(ci); pacer = { im, n, sp, rec, col: new THREE.Color(rec.mine ? 0xffc400 : 0x00e5ff), dim: new THREE.Color(0x4a4f58), s: 0, lastLo: -1 }; }
  // minimap path
  miniPath = T.P.filter((_, i) => i % 4 === 0); const xs = miniPath.map(p => p.x), zs = miniPath.map(p => p.z); miniPath.box = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
}

/* ---------------- game flow ---------------- */
function banner(t, ms = 1200) { const b = $('banner'); b.textContent = t; clearTimeout(b._t); if (ms) b._t = setTimeout(() => b.textContent = '', ms); }
function pop(t, col = '#fff') { const d = document.createElement('div'); d.className = 'pop'; d.style.color = col; d.textContent = t; $('pops').appendChild(d); setTimeout(() => d.remove(), 1000); }
function startRace(ci, m) {
  tilt.lockA = orientAngle(); softPaused = false; $('tiltHint').classList.remove('on');
  setupRace(ci, m); state = 'race'; paused = false; raceTime = 0; countT = 3.99; endT = 0;
  showScreen(null); $('hud').classList.remove('hidden'); updateCtlMode(); $('count').textContent = ''; banner('', 0);
  $('hPos').style.display = m === 'race' ? '' : 'none'; $('hGap').style.display = pacer ? '' : 'none'; $('hBest').querySelector('b').textContent = fmt(S.best[C.id]);
  last = performance.now(); resize();
}
function fastStart() { countT = 0.01; }
function lapDone(p, t) {
  const lt = t - p.lapStart; p.laps.push(lt); p.lapStart = t; p.lap++;
  if (!p.isP) return;
  const isBest = !S.best[C.id] || lt < S.best[C.id]; sfx.lap();
  if (mode === 'tt') { if (isBest) { S.best[C.id] = lt; S.ghost[C.id] = ghostRec.slice(); save(); banner('🏆 New best lap ' + fmt(lt) + '!', 2000); if (pacer && lt < COURSES[curC].rec) { pacer.rec = { t: lt, mine: true }; pacer.col.set(0xffc400); } } else banner('Lap ' + fmt(lt), 1500); }
  else { if (isBest) { S.best[C.id] = lt; S.ghost[C.id] = ghostRec.slice(); save(); } banner(p.lap < LAPS ? 'Lap ' + (p.lap + 1) + '/' + LAPS + (p.lap === LAPS - 1 ? ' — final lap!' : '') : '🏁', 1500); }
  ghostRec = []; $('hBest').querySelector('b').textContent = fmt(S.best[C.id]);
  if (pacer && mode === 'race' && pacer.rec.t !== recordFor(curC).t) pacer.rec = recordFor(curC);
}
function finish() {
  state = 'result'; sfx.engine(0); const p = player; const pos = racers.slice().sort((a, b) => (b.done - a.done) || (a.done ? a.finishT - b.finishT : b.s - a.s)).indexOf(p) + 1;
  let earn = p.coins * 10, html = '';
  if (mode === 'race') { earn += [0, 600, 400, 250, 150, 100, 80][pos]; if (pos <= 3) { const nx = COURSES[curC + 1]; if (nx && !S.unlocked.includes(nx.id)) { S.unlocked.push(nx.id); html += `<p>🔓 Unlocked <b>${nx.name}</b>!</p>`; } S.wins[C.id] = Math.min(S.wins[C.id] || 9, pos); }
    const order = racers.slice().sort((a, b) => (b.done - a.done) || (a.done ? a.finishT - b.finishT : b.s - a.s));
    html = `<p style="font-size:24px;font-weight:900">${['', '🥇 1st place!', '🥈 2nd place!', '🥉 3rd place!', '4th place', '5th place', '6th place'][pos]}</p><table>` + order.map((r, i) => `<tr class="${r.isP ? 'you' : ''}"><td>${i + 1}</td><td>${r.isP ? 'You' : r.name}</td><td>${r.done ? fmt(r.finishT) : 'still racing'}</td></tr>`).join('') + '</table>' + html; }
  else { const b = Math.min(...p.laps); earn += 200; html = `<p>Laps: ${p.laps.map(fmt).join(' · ')}</p><p>Best this run: <b>${fmt(b)}</b> · Course best: <b>${fmt(S.best[C.id])}</b></p><p>Record pace: ${fmt(COURSES[curC].rec)}${S.best[C.id] < COURSES[curC].rec ? ' — <b>you beat it! 🏆</b>' : ''}</p>`;
    const nx = COURSES[curC + 1]; if (nx && b < COURSES[curC].rec * 1.25 && !S.unlocked.includes(nx.id)) { S.unlocked.push(nx.id); html += `<p>🔓 Unlocked <b>${nx.name}</b>!</p>`; } }
  S.cash += earn; save(); html += `<p>💰 +${earn} (coins ${p.coins})</p>`;
  $('rTitle').textContent = mode === 'race' ? 'Race finished!' : 'Time Trial done!'; $('rBody').innerHTML = html; $('hud').classList.add('hidden'); showScreen('sResult'); sfx.win();
}
function pause() { if (state !== 'race') return; paused = true; $('pSens').value = S.set.sens; showScreen('sPause'); sfx.engine(0); }
function resume() { paused = false; showScreen(null); last = performance.now(); }
$('bPause').onclick = pause; $('pResume').onclick = resume; $('pCenter').onclick = () => { recenter(); };
$('pSens').oninput = e => { S.set.sens = +e.target.value; save(); };
$('pRestart').onclick = () => startRace(curC, mode); $('pQuit').onclick = () => goMenu('sTitle');
$('rAgain').onclick = () => startRace(curC, mode); $('rMenu').onclick = () => goMenu('sTitle');

/* ---------------- AI / physics ---------------- */
function obstacleAhead(r, range) { let best = null; for (const o of obstacles) { if (o.hit || o.type === 'puddle' && !r.isP) continue; let d = ((o.s - r.s) % T.L + T.L) % T.L; if (d > 2 && d < range && Math.abs(o.x - r.x) < 2.2 && (!best || d < best.d)) best = { o, d }; } return best; }
function autoSteer(p) { // used by AI drivers and the test autopilot
  let tx = p.tx != null ? p.tx : 0; const ob = obstacleAhead(p, 45);
  if (ob) { const cand = [-5.5, -2, 2, 5.5].filter(x => !obstacles.some(o => !o.hit && Math.abs(o.x - x) < 2.3 && (((o.s - p.s) % T.L + T.L) % T.L) < 50)); if (cand.length) tx = cand.sort((a, b) => Math.abs(a - p.x) - Math.abs(b - p.x))[0]; p.tx = tx; }
  return clamp((tx - p.x) * .5 - p.xd * .25, -1, 1);
}
function stepCar(r, dt, inp) {
  const D = DIFF[S.set.diff]; const P = r.isP;
  let vmax = r.vmax, steer;
  if (P) { steer = inp.steer; if (inp.boost && r.boost > .02 && countT <= 0) { if (r.boostT <= 0) sfx.boost(); r.boostT = .15; r.boost = Math.max(0, r.boost - dt * .22 / r.boostCap); } }
  else { steer = autoSteer(r); if (Math.random() < dt * .25) r.tx = clamp(r.tx + (Math.random() - .5) * 5, -5.5, 5.5); }
  if (r.boostT > 0) { r.boostT -= dt; vmax *= 1.35; }
  const off = Math.abs(r.x) > RW + .3; if (off) vmax = Math.min(vmax, 24);
  if (r.wob > 0) { r.wob -= dt; vmax *= .8; }
  if (P && inp.brake) r.v = Math.max(0, r.v - 30 * dt);
  else if (r.v < vmax) r.v = Math.min(vmax, r.v + (r.acc || 14) * dt * (1 - r.v / (vmax * 1.15)) * 1.6); else r.v = Math.max(vmax, r.v - 12 * dt);
  const grip = clamp(r.v / 18, .3, 1) * (r.hnd || 1);
  const target = steer * 9.5 * grip - curvAt(r.s) * r.v * r.v * .05 * (P ? D.drift : 0);
  r.xd = lerp(r.xd, target, Math.min(1, dt * 6)) + (r.wob > 0 ? Math.sin(r.wob * 30) * 2.5 * dt * 6 : 0) * 0;
  if (P && Math.abs(r.x) > RW - 1 && Math.sign(r.x) === Math.sign(r.xd)) r.xd *= (1 - D.assist * .5); // gentle road assist
  r.x += r.xd * dt; if (Math.abs(r.x) > RW + 4) { r.x = Math.sign(r.x) * (RW + 4); r.xd = 0; }
  if (P && off) r.x -= Math.sign(r.x) * D.assist * 1.2 * dt;
  r.s += r.v * dt; r.heading = Math.atan2(r.xd, Math.max(5, r.v));
}
function hitObstacles(p) {
  for (const o of obstacles) { if (o.hit) continue; const d = ((o.s - p.s) % T.L + T.L) % T.L; const dd = d > T.L / 2 ? d - T.L : d;
    if (Math.abs(dd) < 2.4 && Math.abs(o.x - p.x) < (o.type === 'puddle' ? 1.8 : 1.4)) { o.hit = true;
      if (o.type === 'puddle') { p.v *= .85; p.wob = .6; if (p.isP) { sfx.splash(); pop('💦 Splash!', '#7fd4ff'); } }
      else { p.v *= .67; p.wob = 1; o.fly = { vx: (o.x < p.x ? -1 : 1) * (4 + Math.random() * 3), vy: 7, vz: p.v * .4, t: 0 }; if (p.isP) { sfx.bump(); pop('Bump!', '#ffb36b'); } }
      o.hitT = raceTime; } }
}
function respawnObs(dt) { for (const o of obstacles) { if (o.hit && raceTime - o.hitT > 12) { const d = ((o.s - player.s) % T.L + T.L) % T.L; if (d > 120 && d < T.L - 30) { o.hit = false; o.fly = null; o.m.position.copy(o.home); o.m.rotation.set(0, 0, 0); o.m.lookAt(o.home.clone().add(dirAt(o.s))); o.m.visible = true; } }
  if (o.fly) { const f = o.fly; f.t += dt; f.vy -= 20 * dt; o.m.position.x += f.vx * dt; o.m.position.y = Math.max(o.home.y, o.m.position.y + f.vy * dt); o.m.rotation.x += dt * 8; if (f.t > 2.5) { o.m.visible = false; o.fly = null; } } } }
function carCollide() { for (const r of racers) { if (r.isP) continue; const p = player, ds = r.s - p.s; if (Math.abs(ds) < 4.2 && Math.abs(r.x - p.x) < 2) { const push = Math.sign(p.x - r.x || 1), ov = 2 - Math.abs(r.x - p.x); p.x += push * ov * .5; r.x -= push * ov * .5; if (!r.isP) r.tx = clamp(r.x - push * 2, -5.5, 5.5); if (ds > 0) { p.v = Math.min(p.v, r.v * .97); } else r.v = Math.min(r.v, p.v * .97); if (!p.bumpT || raceTime - p.bumpT > .6) { p.bumpT = raceTime; sfx.bump(); p.wob = Math.max(p.wob, .3); } } } }

/* ---------------- main loop ---------------- */
const WR = window.WR = { autopilot: false, ts: 1 };
const camPos = new THREE.Vector3(), lookP = new THREE.Vector3(), dv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
let lastBeep = 4;
function update(dt) {
  const inp = readInput(dt);
  $('wheel').style.transform = `translateX(-50%) rotate(${inp.wheelDeg.toFixed(1)}deg)`; WR.wheelDeg = inp.wheelDeg;
  if (countT > 0) { countT -= dt; const n = Math.ceil(countT); $('count').textContent = countT > 0 ? n : 'GO!'; if (n !== lastBeep) { lastBeep = n; sfx.beep(n <= 0); } if (countT <= 0) { setTimeout(() => $('count').textContent = '', 700); } return inp; }
  raceTime += dt;
  for (const r of racers) { if (r.done && !r.isP) { r.v = lerp(r.v, 20, dt); r.s += r.v * dt; continue; } const prevLap = Math.floor(r.s / T.L); stepCar(r, dt, inp); hitObstacles(r);
    if (prevLap < 0 && r.s >= 0 && r.isP) { r.lapStart = raceTime; ghostRec = []; }
    if (Math.floor(r.s / T.L) > prevLap && prevLap >= 0) { if (r.isP) lapDone(r, raceTime); else r.lap++; if (r.lap >= LAPS && !r.done) { r.done = true; r.finishT = raceTime; if (r.isP) { endT = 1.2; } } } }
  carCollide(); respawnObs(dt);
  const p = player;
  if (!p.done && p.s >= 0) { if (!ghostRec.length || raceTime - ghostRec.tt >= .1) { ghostRec.push([+(p.s % T.L).toFixed(2), +p.x.toFixed(2)]); ghostRec.tt = raceTime; } }
  for (const k of pickups) { if (k.taken) { if (raceTime - k.tk > 15) { k.taken = false; k.m.visible = true; } continue; } const d = ((k.s - p.s) % T.L + T.L) % T.L; if ((d < 2 || d > T.L - 1.5) && Math.abs(k.x - p.x) < 1.9) { k.taken = true; k.tk = raceTime; k.m.visible = false; if (k.type === 'coin') { p.coins++; sfx.coin(); } else { p.boost = Math.min(1, p.boost + .4); sfx.boostUp(); pop('⚡ Boost!', '#5ff'); } } }
  p.boost = Math.min(1, p.boost + dt * .02);
  if (endT > 0) { endT -= dt; if (endT <= 0) finish(); }
  return inp;
}
function render(inp, rdt) {
  if (!T || !player) return; const p = player;
  // cockpit camera at driver eye, looking far ahead along the track
  posAt(p.s, p.x - .35, camPos); camPos.y += 1.35; const fwd = dirAt(p.s, dv); const rt = new THREE.Vector3(-fwd.z, 0, fwd.x);
  posAt(p.s + 28, p.x * .7, lookP); lookP.y += .9; lookP.addScaledVector(rt, Math.tan(p.heading) * 28);
  if (p.wob > 0) { camPos.y += Math.sin(p.wob * 40) * .06; lookP.x += Math.sin(p.wob * 25) * .5; }
  camera.position.copy(camPos); camera.up.copy(up); camera.lookAt(lookP); camera.rotateZ(-(inp ? inp.steer : 0) * .03 + (p.wob > 0 ? Math.sin(p.wob * 22) * .04 : 0));
  camera.fov = 70 + (p.boostT > 0 ? 8 : 0) + p.v * .05; camera.updateProjectionMatrix();
  for (const r of racers) { if (r.isP) continue; posAt(r.s, r.x, r.m.position); const d = dirAt(r.s); r.m.lookAt(r.m.position.clone().add(d)); r.m.rotateY(r.heading || 0); if (r.wob > 0) r.m.rotateY(Math.sin(r.wob * 25) * .15); }
  if (ghostMesh && ghostPlay) { const lt = raceTime - p.lapStart, i = Math.floor(lt / .1); const g = ghostPlay[Math.min(i, ghostPlay.length - 1)]; if (g && countT <= 0) { ghostMesh.visible = true; WR.ghostVis = true; posAt(g[0] + Math.floor(Math.max(0, p.s) / T.L) * 0, g[1], ghostMesh.position); ghostMesh.lookAt(ghostMesh.position.clone().add(dirAt(g[0]))); } else ghostMesh.visible = false; }
  for (const k of pickups) if (!k.taken) k.m.rotation.y += rdt * 3;
  // pacer lights
  if (pacer) { const lt = countT > 0 ? 0 : raceTime - p.lapStart, ps = (lt / pacer.rec.t) * T.L; pacer.s = ps; const band = 36, n = pacer.n, head = Math.floor(ps / pacer.sp);
    const lo = head - Math.ceil(band / pacer.sp) - 2; if (pacer.lastLo >= 0) for (let i = pacer.lastLo; i <= pacer.lastLo + band / pacer.sp + 4; i++) { const j = ((i % n) + n) % n; pacer.im.setColorAt(j * 2, pacer.dim); pacer.im.setColorAt(j * 2 + 1, pacer.dim); }
    const tmp = new THREE.Color(); for (let i = lo; i <= head; i++) { const j = ((i % n) + n) % n, a = 1 - (head - i) / (band / pacer.sp); if (i * pacer.sp > ps || i < 0 && lt <= 0) continue; tmp.copy(pacer.dim).lerp(pacer.col, clamp(a, 0, 1)); if (i === head) tmp.set(0xffffff); pacer.im.setColorAt(j * 2, tmp); pacer.im.setColorAt(j * 2 + 1, tmp); }
    pacer.lastLo = lo; pacer.im.instanceColor.needsUpdate = true;
    const sl = ((p.s % T.L) + T.L) % T.L, gap = lt - pacer.rec.t * (sl / T.L); WR.gap = gap;
    if (countT <= 0 && p.s > 0) { const e = $('hGap'); e.querySelector('b').textContent = (gap > 0 ? '+' : '−') + Math.abs(gap).toFixed(1); e.classList.toggle('ahead', gap <= 0); e.classList.toggle('behind', gap > 0); $('hGapL').textContent = pacer.rec.mine ? 'YOUR BEST' : 'RECORD'; } }
  renderer.render(scene, camera);
  // HUD
  $('spd').textContent = Math.round(p.v * 2.237); $('boostFill').style.width = (p.boost * 100).toFixed(0) + '%'; $('cBoost').classList.toggle('empty', p.boost < .03);
  $('hLap').querySelector('b').textContent = Math.min(LAPS, p.lap + 1) + '/' + LAPS; $('hTime').querySelector('b').textContent = fmt(raceTime);
  if (mode === 'race') { const pos = racers.slice().sort((a, b) => b.s - a.s).indexOf(p) + 1; $('hPos').querySelector('b').textContent = pos + '/' + racers.length; }
  if (inp) sfx.engine(state === 'race' && !paused ? p.v : 0, p.boostT > 0);
  drawMini();
}
const mc = $('mini'), mg = mc.getContext('2d');
function drawMini() { if (!miniPath) return; const [x0, x1, z0, z1] = miniPath.box, sc = 150 / Math.max(x1 - x0, z1 - z0), W = 170; const P = q => [10 + (q.x - x0) * sc + (150 - (x1 - x0) * sc) / 2, 10 + (q.z - z0) * sc + (150 - (z1 - z0) * sc) / 2];
  mg.clearRect(0, 0, W, W); mg.fillStyle = 'rgba(0,0,0,.4)'; mg.beginPath(); mg.arc(85, 85, 84, 0, 7); mg.fill(); mg.strokeStyle = '#fff'; mg.lineWidth = 5; mg.beginPath(); miniPath.forEach((q, i) => { const [a, b] = P(q); i ? mg.lineTo(a, b) : mg.moveTo(a, b); }); mg.closePath(); mg.stroke();
  const dot = (s, col, r) => { const [a, b] = P(posAt(s, 0)); mg.fillStyle = col; mg.beginPath(); mg.arc(a, b, r, 0, 7); mg.fill(); };
  if (pacer) dot(pacer.s, '#' + pacer.col.getHexString(), 4); for (const r of racers) if (!r.isP) dot(r.s, '#' + r.m.children[0].material.color.getHexString(), 4); dot(player.s, '#ff3b30', 6); mg.strokeStyle = '#fff'; mg.lineWidth = 2; mg.stroke(); }
function loop(now) {
  requestAnimationFrame(loop); let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state === 'race') { let inp = null; if (!paused) for (let k = 0; k < WR.ts; k++) { inp = update(dt); if (state !== 'race') break; } render(inp || { steer: 0 }, dt); }
  else if (state !== 'result' && T) { camera.position.set(Math.cos(now / 9000) * 50 + T.P[0].x, 25, Math.sin(now / 9000) * 50 + T.P[0].z); camera.lookAt(T.P[0]); renderer.render(scene, camera); }
  else if (state !== 'result') renderer.render(scene, camera);
}

/* ---------------- menus ---------------- */
function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('show', s.id === id)); document.querySelectorAll('.cashv').forEach(e => e.textContent = S.cash.toLocaleString()); }
let pickMode = 'race';
function goMenu(id) { state = 'menu'; paused = false; sfx.engine(0); $('hud').classList.add('hidden'); showScreen(id); if (id === 'sTracks') renderTracks(); if (id === 'sGarage') renderGarage(); if (id === 'sSettings') renderSettings(); resize(); }
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => goMenu(b.dataset.go)));
$('bStart').addEventListener('click', async () => {
  ensureAudio(); const ok = await requestTilt(); if (!ok && S.set.steer === 'tilt') { S.set.steer = 'touch'; save(); }
  goMenu('sTitle'); $('bMute').textContent = S.set.snd ? '🔊' : '🔇';
  try { if (IS_TOUCH && document.documentElement.requestFullscreen && screen.orientation && screen.orientation.lock) document.documentElement.requestFullscreen().then(() => screen.orientation.lock('landscape')).catch(() => { }); } catch (e) { }
});
$('bRaceMode').onclick = () => { pickMode = 'race'; goMenu('sTracks'); }; $('bTTMode').onclick = () => { pickMode = 'tt'; goMenu('sTracks'); };
$('bGarage').onclick = () => goMenu('sGarage'); $('bSettings').onclick = () => goMenu('sSettings');
$('rotGo').onclick = () => { rotDismissed = true; resize(); }; $('rotLock').onclick = () => { rotDismissed = true; setRot(tilt.g && tilt.g.x > 0 ? -90 : 90); };
const ART = ['linear-gradient(#8fd3ff,#2a8fd6)', 'linear-gradient(#5b6b8c,#232a3a)', 'linear-gradient(#ffd9a0,#c46a35)', 'linear-gradient(#e6f0fa,#7fa7c9)'];
function renderTracks() { $('trTitle').textContent = pickMode === 'race' ? '🏁 Race — pick a course' : '⏱ Time Trial — pick a course'; const el = $('trackList'); el.innerHTML = '';
  COURSES.forEach((c, i) => { const un = S.unlocked.includes(c.id), cost = 1000 * i, b = document.createElement('button'); b.className = 'card'; const rec = recordFor(i);
    b.innerHTML = `<div class="art" style="background:${ART[i]}">${c.icon}</div><div class="inf"><h3>${c.name}</h3><p>${c.desc}</p><div class="meta"><span>${'★'.repeat(i + 1)}${'☆'.repeat(3 - i)}</span><span>${rec.mine ? '🏆 ' : '⚡ '}${fmt(rec.t)}</span></div></div>` + (un ? '' : `<div class="lock"><b>🔒</b>Finish top 3 on ${COURSES[i - 1].name}<br>or unlock for 💰${cost.toLocaleString()}</div>`);
    b.onclick = () => { if (un) startRace(i, pickMode); else if (S.cash >= cost) { S.cash -= cost; S.unlocked.push(c.id); save(); renderTracks(); showScreen('sTracks'); } else banner('Need 💰' + cost.toLocaleString(), 1300); }; el.appendChild(b); }); }
function renderGarage() { const el = $('carList'); el.innerHTML = '';
  CARS.forEach(c => { const own = S.owned.includes(c.id), b = document.createElement('button'); b.className = 'card' + (S.car === c.id ? ' sel' : '');
    b.innerHTML = `<div class="art" style="background:${S.color}33">${c.icon}</div><div class="inf"><h3>${c.name}</h3><p>${c.desc}</p><div class="meta"><span>Speed ${'▮'.repeat(Math.round(c.spd * 10 - 7))}</span><span>${own ? (S.car === c.id ? '✓ Driving' : 'Tap to drive') : '💰' + c.cost}</span></div></div>`;
    b.onclick = () => { if (own) S.car = c.id; else if (S.cash >= c.cost) { S.cash -= c.cost; S.owned.push(c.id); S.car = c.id; } else { banner('Need 💰' + c.cost, 1200); return; } save(); renderGarage(); showScreen('sGarage'); }; el.appendChild(b); });
  const ce = $('colors'); ce.innerHTML = ''; COLORS.forEach(col => { const b = document.createElement('button'); b.style.background = col; if (col === S.color) b.className = 'sel'; b.onclick = () => { S.color = col; save(); renderGarage(); }; ce.appendChild(b); }); }
function seg(label, key, opts) { const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<span>${label}</span>`; const s = document.createElement('div'); s.className = 'seg';
  opts.forEach(([v, t]) => { const b = document.createElement('button'); b.textContent = t; if (S.set[key] === v) b.className = 'on'; b.onclick = () => { S.set[key] = v; save(); updateCtlMode(); if (key === 'snd' && master) master.gain.value = v ? .5 : 0; renderSettings(); }; s.appendChild(b); }); r.appendChild(s); return r; }
function renderSettings() { const el = $('setList'); el.innerHTML = '';
  el.append(seg('Steering', 'steer', [['tilt', '🔄 Turn device'], ['touch', '👆 Buttons']]), seg('Turn sensitivity', 'sens', [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']]), seg('Flip steering', 'inv', [[false, 'Normal'], [true, 'Flipped']]),
    seg('Difficulty', 'diff', [['easy', '😊 Easy'], ['normal', '😎 Normal']]), seg('Record lights in Time Trial', 'pacerTT', [[true, 'On'], [false, 'Off']]), seg('Record lights in Race', 'pacerRace', [[true, 'On'], [false, 'Off']]),
    seg('Time of day', 'tod', [['day', '☀️ Day'], ['sunset', '🌅 Sunset'], ['night', '🌙 Night'], ['auto', '🔀 Mix']]), seg('Sound', 'snd', [[true, '🔊 On'], [false, '🔇 Off']]));
  const r = document.createElement('div'); r.className = 'row'; r.innerHTML = '<span>Hold the device like a wheel, then</span>'; const b = document.createElement('button'); b.className = 'mid'; b.textContent = '🎯 Center steering'; b.onclick = recenter; r.appendChild(b); el.appendChild(r); }

Object.defineProperties(WR, Object.getOwnPropertyDescriptors({ get state() { return state; }, get paused() { return paused; }, get softPaused() { return softPaused; }, player: () => player, racers: () => racers, tilt, S, startRace, fastStart, get T() { return T; }, get pacer() { return pacer; }, get mode() { return mode; }, obstacles: () => obstacles, get raceTime() { return raceTime; }, RW }));
// menu backdrop
setupRace(0, 'tt'); state = 'menu'; resize(); requestAnimationFrame(loop);
