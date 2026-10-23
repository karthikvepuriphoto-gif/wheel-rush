// Shaped F1 / NASCAR car models (front = +z). Shared geometry, per-colour materials.
import * as THREE from './three.module.min.js';
const G = {}; const geo = (k, f) => G[k] || (G[k] = f());
const numTexCache = {};
function numTex(n, bg, fg) { const k = n + bg + fg; if (numTexCache[k]) return numTexCache[k]; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.fillStyle = fg; g.font = 'bold 78px system-ui,Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return numTexCache[k] = t; }
const M = {
  tyre: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .9 }),
  carbon: new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: .45, metalness: .3 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: .25, metalness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x101820, roughness: .05, metalness: .2, clearcoat: 1 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35 }),
  visor: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .05, metalness: .8 }),
  tail: new THREE.MeshBasicMaterial({ color: 0xff2020 })
};
const paintCache = {};
function paint(color) { const k = String(color); return paintCache[k] || (paintCache[k] = new THREE.MeshPhysicalMaterial({ color, roughness: .32, metalness: .3, clearcoat: .8, clearcoatRoughness: .1 })); }
function along(g) { g.rotateX(Math.PI / 2); return g; } // lathe y-axis → +z
function wheel(g, x, z, r, w, rimCol) { const t = new THREE.Mesh(geo('tyre' + r + w, () => { const c = new THREE.CylinderGeometry(r, r, w, 22); c.rotateZ(Math.PI / 2); return c; }), M.tyre); t.position.set(x, r, z); g.add(t);
  const rim = new THREE.Mesh(geo('rim' + r + w, () => { const c = new THREE.CylinderGeometry(r * .62, r * .62, w + .02, 16); c.rotateZ(Math.PI / 2); return c; }), rimCol || M.rim); rim.position.copy(t.position); g.add(rim); t.userData.wheel = rim.userData.wheel = true; }

export function buildF1(color, num = 7) {
  const g = new THREE.Group(), P = paint(color);
  const body = new THREE.Mesh(geo('f1body', () => along(new THREE.LatheGeometry([[0, -2.35], [.22, -2.3], [.34, -1.8], [.42, -1.0], [.46, -.2], [.44, .5], [.36, 1.2], [.24, 1.9], [.12, 2.5], [0, 2.62]].map(([r, y]) => new THREE.Vector2(r, y)), 18))), P);
  body.scale.set(1.15, .62, 1); body.position.y = .42; g.add(body);
  const pod = geo('f1pod', () => { const c = new THREE.CapsuleGeometry(.3, 1.3, 6, 12); c.rotateX(Math.PI / 2); return c; });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(pod, P); p.scale.set(1.15, .8, 1); p.position.set(s * .62, .38, -.45); g.add(p); }
  const cover = new THREE.Mesh(geo('f1cover', () => along(new THREE.LatheGeometry([[0, -1.9], [.12, -1.8], [.26, -1.0], [.3, -.3], [.18, .15], [0, .25]].map(([r, y]) => new THREE.Vector2(r, y)), 14))), P);
  cover.scale.set(.9, 1.3, 1); cover.position.set(0, .66, -.2); g.add(cover);
  // nose stripe + numbers
  const st = new THREE.Mesh(geo('f1stripe', () => new THREE.BoxGeometry(.14, .02, 2.2)), M.white); st.position.set(0, .7, 1.2); st.rotation.x = .1; g.add(st);
  const nm = new THREE.MeshBasicMaterial({ map: numTex(num, '#ffffff', '#111'), transparent: true });
  for (const s of [-1, 1]) { const n = new THREE.Mesh(geo('num', () => new THREE.PlaneGeometry(.42, .42)), nm); n.position.set(s * .97, .42, -.45); n.rotation.y = s * Math.PI / 2; g.add(n); }
  // wings
  const fw = new THREE.Mesh(geo('f1fw', () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.25, .09, .55, .02); sh.lineTo(.55, 0); sh.quadraticCurveTo(.25, .03, 0, 0); const e = new THREE.ExtrudeGeometry(sh, { depth: 2.1, bevelEnabled: false }); e.rotateY(Math.PI / 2); e.translate(-1.05, 0, .28); return e; }), M.carbon);
  fw.position.set(0, .12, 2.3); g.add(fw); const fw2 = fw.clone(); fw2.material = P; fw2.position.set(0, .2, 2.15); fw2.scale.set(.92, 1, .7); g.add(fw2);
  const ep = geo('f1ep', () => new THREE.BoxGeometry(.04, .26, .62));
  for (const s of [-1, 1]) { const e = new THREE.Mesh(ep, P); e.position.set(s * 1.06, .22, 2.32); g.add(e); }
  const rw = new THREE.Mesh(geo('f1rw', () => new THREE.BoxGeometry(1.15, .05, .38)), P); rw.position.set(0, 1.0, -2.25); rw.rotation.x = -.15; g.add(rw);
  const rw2 = new THREE.Mesh(geo('f1rw2', () => new THREE.BoxGeometry(1.15, .04, .22)), M.carbon); rw2.position.set(0, .86, -2.15); g.add(rw2);
  const rep = geo('f1rep', () => new THREE.BoxGeometry(.04, .5, .55));
  for (const s of [-1, 1]) { const e = new THREE.Mesh(rep, M.carbon); e.position.set(s * .6, .88, -2.2); g.add(e); }
  const pil = new THREE.Mesh(geo('f1pil', () => new THREE.BoxGeometry(.06, .4, .1)), M.carbon); pil.position.set(0, .72, -2.2); g.add(pil);
  // suspension arms
  const arm = geo('f1arm', () => { const c = new THREE.CylinderGeometry(.025, .025, .8, 5); c.rotateZ(Math.PI / 2); return c; });
  for (const z of [1.55, -1.5]) for (const s of [-1, 1]) { const a = new THREE.Mesh(arm, M.carbon); a.position.set(s * .55, .42, z); g.add(a); }
  // halo + helmet (cockpit)
  const halo = new THREE.Group(); halo.name = 'halo';
  const hr = new THREE.Mesh(geo('halo', () => { const t = new THREE.TorusGeometry(.34, .04, 8, 20, Math.PI); t.rotateX(-Math.PI / 2); return t; }), M.carbon); hr.position.set(0, .86, .15); halo.add(hr);
  const hs = new THREE.Mesh(geo('halos', () => new THREE.CylinderGeometry(.035, .035, .3, 6)), M.carbon); hs.position.set(0, .78, .5); hs.rotation.x = .5; halo.add(hs); g.add(halo);
  const helm = new THREE.Group(); helm.name = 'helmet';
  const hm = new THREE.Mesh(geo('helm', () => new THREE.SphereGeometry(.19, 16, 12)), new THREE.MeshPhysicalMaterial({ color: 0xffd23f, roughness: .2, clearcoat: 1 })); hm.position.set(0, .86, -.05); helm.add(hm);
  const vz = new THREE.Mesh(geo('visor', () => new THREE.SphereGeometry(.195, 16, 8, -1, 2, 1.2, .6)), M.visor); vz.position.copy(hm.position); helm.add(vz); g.add(helm);
  wheel(g, -.98, 1.55, .34, .34); wheel(g, .98, 1.55, .34, .34); wheel(g, -.98, -1.5, .38, .44); wheel(g, .98, -1.5, .38, .44);
  const tl = new THREE.Mesh(geo('f1tl', () => new THREE.BoxGeometry(.12, .08, .03)), M.tail); tl.position.set(0, .45, -2.36); g.add(tl);
  g.userData.style = 'f1'; return g;
}

export function buildNascar(color, num = 7) {
  const g = new THREE.Group(), P = paint(color);
  const body = new THREE.Mesh(geo('nbody', () => { const sh = new THREE.Shape(); sh.moveTo(-2.45, .28); sh.lineTo(-2.5, .72); sh.quadraticCurveTo(-2.2, .8, -1.5, .82); sh.lineTo(1.25, .84); sh.quadraticCurveTo(2.1, .78, 2.45, .62); sh.quadraticCurveTo(2.62, .45, 2.45, .24); sh.lineTo(-2.45, .24);
    const e = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: true, bevelThickness: .16, bevelSize: .14, bevelSegments: 5, curveSegments: 14 }); e.translate(0, 0, -.8); e.rotateY(-Math.PI / 2); e.computeVertexNormals(); return e; }), P); g.add(body);
  const cab = new THREE.Mesh(geo('ncab', () => { const sh = new THREE.Shape(); sh.moveTo(-1.55, .8); sh.quadraticCurveTo(-1.0, 1.32, -.5, 1.36); sh.lineTo(.35, 1.36); sh.quadraticCurveTo(.8, 1.3, 1.25, .82); sh.lineTo(-1.55, .8);
    const e = new THREE.ExtrudeGeometry(sh, { depth: 1.3, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 3, curveSegments: 10 }); e.translate(0, 0, -.65); e.rotateY(-Math.PI / 2); return e; }), M.glass); cab.name = 'cabin'; g.add(cab);
  const roof = new THREE.Mesh(geo('nroof', () => new THREE.BoxGeometry(1.32, .06, .9)), P); roof.position.set(0, 1.42, -.05); roof.name = 'cabin2'; g.add(roof);
  const sp = new THREE.Mesh(geo('nspoil', () => new THREE.BoxGeometry(1.9, .22, .05)), M.carbon); sp.position.set(0, 1.0, -2.45); sp.rotation.x = -.5; g.add(sp);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(geo('nstripe', () => new THREE.BoxGeometry(.18, .02, 1.3)), M.white); st.position.set(s * .25, 1.0, 1.75); st.rotation.x = -.13; g.add(st); }
  const nm = new THREE.MeshBasicMaterial({ map: numTex(num, '#ffffff', '#111'), transparent: true });
  for (const s of [-1, 1]) { const n = new THREE.Mesh(geo('nnum', () => new THREE.PlaneGeometry(.62, .62)), nm); n.position.set(s * .97, .62, 0); n.rotation.y = s * Math.PI / 2; g.add(n); }
  const rn = new THREE.Mesh(geo('nnum', () => new THREE.PlaneGeometry(.62, .62)), nm); rn.rotation.x = -Math.PI / 2; rn.position.set(0, 1.46, -.05); rn.name = 'cabin3'; g.add(rn);
  const grill = new THREE.Mesh(geo('ngrill', () => new THREE.BoxGeometry(1.2, .14, .04)), M.carbon); grill.position.set(0, .42, 2.62); g.add(grill);
  for (const s of [-1, 1]) { const t = new THREE.Mesh(geo('ntl', () => new THREE.BoxGeometry(.4, .1, .03)), M.tail); t.position.set(s * .6, .68, -2.62); g.add(t); }
  wheel(g, -.86, 1.55, .36, .34, M.rim); wheel(g, .86, 1.55, .36, .34, M.rim); wheel(g, -.86, -1.6, .36, .34, M.rim); wheel(g, .86, -1.6, .36, .34, M.rim);
  g.userData.style = 'nascar'; return g;
}

export function buildCar(style, color, num, ghost) {
  const g = style === 'nascar' ? buildNascar(color, num) : buildF1(color, num);
  if (ghost) { const gm = new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: .32, depthWrite: false }); g.traverse(o => { if (o.isMesh) o.material = gm; }); }
  else g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function makeEnv(renderer) { // simple sky/ground gradient env map for reflections
  const es = new THREE.Scene(); const sg = new THREE.SphereGeometry(50, 32, 16), cols = [], c = new THREE.Color(); const pos = sg.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 50; if (y > 0) c.setRGB(.55 + .3 * y, .7 + .2 * y, 1); else c.setRGB(.35, .32, .3); cols.push(c.r, c.g, c.b); }
  sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); es.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  for (const [x, z] of [[20, 10], [-25, -5], [5, -30]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 14), new THREE.MeshBasicMaterial({ color: 0xffffff })); b.position.set(x, 30, z); b.lookAt(0, 0, 0); es.add(b); }
  const pm = new THREE.PMREMGenerator(renderer); const t = pm.fromScene(es, .02).texture; pm.dispose(); return t;
}
