import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CARD_TITLES, INTRO_MS, SWITCH_MS, smooth, switchLight, nextCard, type CardIndex, type RoomPhase } from "./sequence";

export type CardBounds = { left: number; top: number; width: number; height: number };
export type RoomController = {
  enter: (index: CardIndex, skip: boolean) => void;
  move: (direction: number) => void;
  setReducedMotion: (reduced: boolean) => void;
  dispose: () => void;
};
type Hooks = {
  onState: (phase: RoomPhase, index: CardIndex) => void;
  onBounds: (bounds: CardBounds) => void;
  onFailure: () => void;
};

function seeded(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function cardTexture(index: CardIndex): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const rand = seeded(95);
  ctx.fillStyle = "#827f70";
  ctx.fillRect(0, 0, 1024, 1024);
  // Uneven enamel, fine pitting and scuffs are physical detail, not a UI overlay.
  for (let i = 0; i < 65000; i++) {
    const v = rand() > 0.5 ? 220 : 15;
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * 0.07})`;
    ctx.fillRect(rand() * 1024, rand() * 1024, 1 + rand() * 2, 1 + rand() * 2);
  }
  const edge = ctx.createRadialGradient(512, 380, 180, 512, 512, 690);
  edge.addColorStop(0, "rgba(0,0,0,0)"); edge.addColorStop(1, "rgba(12,10,7,0.43)");
  ctx.fillStyle = edge; ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = "rgba(218,210,184,0.34)"; ctx.lineWidth = 1;
  ctx.strokeRect(38, 38, 948, 948); ctx.strokeRect(45, 45, 934, 934);
  ctx.strokeStyle = "#e8e0c8"; ctx.fillStyle = "#e8e0c8";
  ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.save(); ctx.translate(512, 400);
  if (index === 0) {
    // Interlocking Y / V, with the same spare geometry as the other emblems.
    ctx.beginPath(); ctx.moveTo(-91, -87); ctx.lineTo(-28, 1); ctx.lineTo(-28, 95);
    ctx.moveTo(35, -87); ctx.lineTo(-28, 1);
    ctx.moveTo(5, -42); ctx.lineTo(63, 95); ctx.lineTo(123, -87); ctx.stroke();
  } else if (index === 1) {
    ctx.beginPath(); ctx.moveTo(-68, -96); ctx.lineTo(28, -96); ctx.lineTo(76, -48); ctx.lineTo(76, 96); ctx.lineTo(-68, 96); ctx.closePath();
    ctx.moveTo(28, -96); ctx.lineTo(28, -48); ctx.lineTo(76, -48);
    for (let y = -6; y < 80; y += 30) { ctx.moveTo(-35, y); ctx.lineTo(y === 54 ? 9 : 43, y); }
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-37, -96); ctx.lineTo(37, -96);
    ctx.moveTo(-27, -96); ctx.lineTo(-27, -20); ctx.lineTo(-92, 82); ctx.quadraticCurveTo(-100, 98, -79, 98);
    ctx.lineTo(79, 98); ctx.quadraticCurveTo(100, 98, 92, 82); ctx.lineTo(27, -20); ctx.lineTo(27, -96);
    ctx.moveTo(-49, 28); ctx.lineTo(49, 28); ctx.stroke();
    ctx.beginPath(); ctx.arc(-13, 63, 6, 0, Math.PI * 2); ctx.arc(17, 2, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.font = '400 91px Georgia, "Times New Roman", serif';
  ctx.textAlign = "center"; ctx.fillText(CARD_TITLES[index], 512, 663);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

export async function createRoom(host: HTMLElement, hooks: Hooks, initialReduced: boolean): Promise<RoomController> {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#080b0b");
  scene.fog = new THREE.FogExp2("#080b0b", 0.026);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  let disposed = false, reduced = initialReduced, entered = false;
  let index: CardIndex = 0, incoming: CardIndex = 1, direction = 1;
  let phase: RoomPhase = "ready", elapsed = 0, previous = 0, raf = 0;
  let cameraDistance = 7, frames = 0, slowFrames = 0, degraded = false;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 35);
  const target = new THREE.Vector3(0, 2.35, 0);
  const allTextures = new Set<THREE.Texture>();
  const loader = new THREE.TextureLoader();
  const maps = await Promise.allSettled([
    loader.loadAsync("/room/concrete-color.jpg"),
    loader.loadAsync("/room/concrete-normal.jpg"),
    loader.loadAsync("/room/concrete-roughness.jpg"),
  ]);
  function map(i: number, repeat: number) {
    const loaded = maps[i]; if (loaded.status !== "fulfilled") return null;
    const t = loaded.value.clone(); allTextures.add(loaded.value); allTextures.add(t);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    if (i === 0) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }
  const concrete = new THREE.MeshStandardMaterial({ color: "#777d78", map: map(0, 2.2), normalMap: map(1, 2.2), normalScale: new THREE.Vector2(0.4, 0.4), roughnessMap: map(2, 2.2), roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ color: "#5a605b", map: map(0, 3), normalMap: map(1, 3), normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: map(2, 3), roughness: 0.73 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: "#242824", metalness: 0.75, roughness: 0.42 });
  const agedMetal = new THREE.MeshStandardMaterial({ color: "#625d4c", metalness: 0.7, roughness: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: "#131612", roughness: 0.9 });
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) {
    const o = new THREE.Mesh(geometry, material); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  mesh(new THREE.BoxGeometry(10.4, 6.5, 0.2), concrete, 0, 3.25, -2.6);
  mesh(new THREE.BoxGeometry(10.4, 0.15, 16), floorMat, 0, -0.08, 3);
  mesh(new THREE.BoxGeometry(0.2, 6.5, 16), concrete, -5.2, 3.25, 3);
  mesh(new THREE.BoxGeometry(0.2, 6.5, 16), concrete, 5.2, 3.25, 3);
  mesh(new THREE.BoxGeometry(10.4, 0.2, 16), concrete, 0, 6.5, 3);
  // Cast-concrete construction joints, anchored corners and skirting.
  for (const x of [-4.7, -2.35, 0, 2.35, 4.7]) {
    mesh(new THREE.BoxGeometry(0.012, 6.5, 0.015), black, x, 3.25, -2.487);
    for (const y of [0.62, 2.55, 4.48]) {
      for (const dx of [-0.8, 0.8]) mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.007, 10), darkMetal, x + dx, y, -2.48).rotation.x = Math.PI / 2;
    }
  }
  mesh(new THREE.BoxGeometry(13, 0.13, 0.12), black, 0, 0.065, -2.4);
  // A weathered service door recedes into one side of the room.
  const door = mesh(new THREE.BoxGeometry(1.35, 2.8, 0.06), black, -4.1, 1.4, -2.42);
  for (const x of [-4.8, -3.4]) mesh(new THREE.BoxGeometry(0.065, 2.86, 0.08), darkMetal, x, 1.43, -2.37);
  mesh(new THREE.BoxGeometry(1.46, 0.06, 0.08), darkMetal, -4.1, 2.86, -2.37);
  mesh(new THREE.BoxGeometry(0.18, 0.035, 0.07), agedMetal, -3.62, 1.3, -2.32);
  door.receiveShadow = true;
  // Conduit: deliberately peripheral, never competing with the navigation.
  mesh(new THREE.CylinderGeometry(0.025, 0.025, 6.4, 10), darkMetal, 3.12, 3.2, -2.36);
  mesh(new THREE.BoxGeometry(0.26, 0.38, 0.1), darkMetal, 3.12, 1.75, -2.3);

  const lamp = new THREE.Group(); lamp.position.set(0, 3.98, 1.1); scene.add(lamp);
  mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.3, 10), black, 0, 1.48, 0, lamp);
  mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.15, 24), agedMetal, 0, 0.4, 0, lamp);
  const profile = [new THREE.Vector2(0.1, 0.35), new THREE.Vector2(0.14, 0.31), new THREE.Vector2(0.22, 0.24), new THREE.Vector2(0.34, 0.1), new THREE.Vector2(0.48, 0.01), new THREE.Vector2(0.49, 0)];
  const shadeMat = new THREE.MeshStandardMaterial({ color: "#333c38", metalness: 0.8, roughness: 0.32, side: THREE.DoubleSide });
  mesh(new THREE.LatheGeometry(profile, 64), shadeMat, 0, 0, 0, lamp);
  mesh(new THREE.TorusGeometry(0.481, 0.012, 8, 64), agedMetal, 0, 0.007, 0, lamp).rotation.x = Math.PI / 2;
  const reflector = mesh(new THREE.ConeGeometry(0.455, 0.29, 48, 1, true), new THREE.MeshStandardMaterial({ color: "#b6b0a0", metalness: 0.4, roughness: 0.4, side: THREE.BackSide }), 0, 0.13, 0, lamp);
  reflector.castShadow = false;
  const bulbMat = new THREE.MeshStandardMaterial({ color: "#edd5aa", emissive: "#ffc982", emissiveIntensity: 1.3, roughness: 0.24 });
  const bulb = mesh(new THREE.SphereGeometry(0.072, 20, 16), bulbMat, 0, 0.025, 0, lamp); bulb.castShadow = false; bulb.scale.set(0.82, 1.28, 0.82);
  mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.055, 16), agedMetal, 0, 0.13, 0, lamp);
  const glowCanvas = document.createElement("canvas"); glowCanvas.width = glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext("2d")!;
  const halo = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  halo.addColorStop(0, "rgba(255,225,177,0.4)"); halo.addColorStop(0.2, "rgba(255,221,162,0.14)"); halo.addColorStop(1, "rgba(255,205,140,0)");
  glowContext.fillStyle = halo; glowContext.fillRect(0, 0, 128, 128);
  const glowMap = new THREE.CanvasTexture(glowCanvas); glowMap.colorSpace = THREE.SRGBColorSpace; allTextures.add(glowMap);
  const glowMat = new THREE.SpriteMaterial({ map: glowMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 });
  const glow = new THREE.Sprite(glowMat); glow.position.set(0, 0.025, 0.07); glow.scale.set(0.38, 0.38, 1); lamp.add(glow);
  const spot = new THREE.SpotLight("#ffe6bf", 33, 13, Math.PI / 4.5, 0.82, 2);
  spot.position.set(0, 3.90, 1.1); spot.target.position.set(0, 1.05, -0.25); scene.add(spot, spot.target);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.00015; spot.shadow.normalBias = 0.025;
  spot.shadow.camera.near = 0.1; spot.shadow.camera.far = 12;
  const fill = new THREE.HemisphereLight("#738b92", "#222014", 0.28); scene.add(fill);
  // Local reflected light makes the metal housing legible; follows the same ignition.
  const bounce = new THREE.PointLight("#ddcfac", 4.0, 3); bounce.position.set(0.3, 4.7, 1.75); scene.add(bounce);
  const roomFill = new THREE.PointLight("#718c96", 22, 13, 2); roomFill.position.set(-4, 3, 3.5); scene.add(roomFill);

  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { strength: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vView; void main(){vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float strength;varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){float edge=pow(abs(dot(normalize(vNormal),normalize(vView))),2.);float lengthFade=pow(vUv.y,1.7)*(1.-smoothstep(.85,1.,vUv.y));gl_FragColor=vec4(.78,.70,.50,edge*lengthFade*.024*strength);}`,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 2.9, 5.2, 64, 1, true), beamMat);
  const beamDirection = spot.target.position.clone().sub(spot.position).normalize();
  beam.position.copy(spot.position).addScaledVector(beamDirection, 2.6);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDirection);
  scene.add(beam);

  const cards: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const group = new THREE.Group(); group.position.set(0, 1.96, 0); group.visible = i === 0; scene.add(group); cards.push(group);
    mesh(new RoundedBoxGeometry(2.7, 2.7, 0.09, 2, 0.024), agedMetal, 0, 0, 0, group);
    const texture = cardTexture(i as CardIndex); allTextures.add(texture);
    mesh(new THREE.PlaneGeometry(2.64, 2.64), new THREE.MeshStandardMaterial({ map: texture, metalness: 0.14, roughness: 0.71 }), 0, 0, 0.051, group);
    for (const x of [-1.23, 1.23]) for (const y of [-1.23, 1.23]) {
      mesh(new THREE.SphereGeometry(0.019, 12, 8), agedMetal, x, y, 0.058, group).scale.z = 0.35;
    }
    // Fine suspension wires give the square an actual place in the set.
    for (const x of [-0.99, 0.99]) mesh(new THREE.CylinderGeometry(0.003, 0.003, 3.15, 5), darkMetal, x, 2.94, -0.01, group);
  }

  const rand = seeded(832);
  const dustGeo = new THREE.BufferGeometry();
  const dust = new Float32Array(180 * 3);
  for (let i = 0; i < dust.length; i += 3) { dust[i] = (rand() - 0.5) * 5; dust[i + 1] = rand() * 4; dust[i + 2] = (rand() - 0.5) * 3; }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dust, 3));
  const dustMat = new THREE.PointsMaterial({ color: "#e7ddbd", size: 0.008, transparent: true, opacity: 0.17, depthWrite: false });
  const motes = new THREE.Points(dustGeo, dustMat); scene.add(motes);
  let lastBounds = "";
  function projectBounds() {
    camera.updateMatrixWorld();
    const a = new THREE.Vector3(-1.35, 3.31, 0.06).project(camera);
    const b = new THREE.Vector3(1.35, 0.61, 0.06).project(camera);
    const w = host.clientWidth, h = host.clientHeight;
    const bounds = { left: (a.x + 1) * w / 2, top: (1 - a.y) * h / 2, width: (b.x - a.x) * w / 2, height: (a.y - b.y) * h / 2 };
    const signature = Object.values(bounds).map(Math.round).join();
    if (signature !== lastBounds) { lastBounds = signature; hooks.onBounds(bounds); }
  }
  function positionCamera(progress: number) {
    const p = reduced ? 1 : smooth(progress);
    camera.position.set(0.15 * (1 - p), 2.55 + 0.2 * (1 - p), cameraDistance + 4 * (1 - p));
    camera.lookAt(target); projectBounds();
  }
  function setLight(level: number) {
    spot.intensity = 33 * level; bulbMat.emissiveIntensity = 1.3 * level; glowMat.opacity = 0.6 * level;
    beamMat.uniforms.strength.value = level; dustMat.opacity = 0.17 * level;
    bounce.intensity = 4.0 * level;
  }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    cameraDistance = Math.max(7.4, 3.75 / (2 * Math.tan(THREE.MathUtils.degToRad(21)) * camera.aspect));
    const mobile = w < 700;
    renderer.setPixelRatio(degraded ? 0.8 : Math.min(window.devicePixelRatio, mobile ? 1 : 1.5));
    renderer.setSize(w, h);
    const shadowSize = mobile ? 512 : 1024;
    if (spot.shadow.mapSize.x !== shadowSize) { spot.shadow.mapSize.set(shadowSize, shadowSize); spot.shadow.map?.dispose(); spot.shadow.map = null; }
    positionCamera(phase === "revealing" ? elapsed / INTRO_MS.reveal : 1);
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  // Browsers may suspend RAF while hidden; do not count that gap on resume.
  const visibilityChanged = () => { previous = 0; };
  document.addEventListener("visibilitychange", visibilityChanged);
  function finish() { phase = "ready"; setLight(1); positionCamera(1); hooks.onState(phase, index); }
  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = previous ? now - previous : 0; previous = now;
    if (document.hidden) return;
    // Sequence timing follows active wall-clock time, including slower rendered frames.
    if (entered) elapsed += dt;
    if (phase === "revealing") {
      positionCamera(elapsed / (reduced ? 200 : INTRO_MS.reveal));
      setLight(smooth(elapsed / (reduced ? 200 : 850)));
      if (elapsed >= (reduced ? 200 : INTRO_MS.reveal)) finish();
    } else if (phase === "switching") {
      if (reduced) {
        setLight(1); cards[index].visible = false; cards[incoming].visible = true;
        cards[incoming].position.x = 0;
      } else {
        const t = smooth((elapsed - 100) / 380);
        cards[index].position.x = -direction * t * 4.8;
        cards[incoming].position.x = direction * (1 - t) * 4.8;
        cards[incoming].visible = true;
        setLight(switchLight(elapsed));
      }
      if (elapsed >= (reduced ? 200 : SWITCH_MS)) { cards[index].visible = false; index = incoming; cards[index].position.x = 0; finish(); }
    }
    motes.visible = !reduced && !degraded;
    if (motes.visible && entered) motes.rotation.y += dt * 0.000006;
    renderer.render(scene, camera);
    if (entered && phase === "ready" && ++frames > 60 && !degraded) {
      if (dt > 33) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 90) { degraded = true; resize(); }
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(raf); observer.disconnect();
    document.removeEventListener("visibilitychange", visibilityChanged);
    renderer.domElement.removeEventListener("webglcontextlost", lost);
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
        geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
      }
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); allTextures.forEach(t => t.dispose());
    spot.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
  }
  function lost(event: Event) { event.preventDefault(); dispose(); hooks.onFailure(); }
  renderer.domElement.addEventListener("webglcontextlost", lost);
  // Warm programs and upload textures before allowing the camera reveal.
  // A rejected compile must release the same resources as a normal unmount.
  try {
    await renderer.compileAsync(scene, camera);
    if (disposed) throw new Error("WebGL context lost while preparing the room");
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  } catch (error) { dispose(); throw error; }
  return {
    enter(initial, skip) {
      entered = true; index = initial; elapsed = 0;
      cards.forEach((card, i) => { card.visible = i === index; card.position.x = 0; });
      if (skip) finish();
      else { phase = "revealing"; positionCamera(0); setLight(0); hooks.onState(phase, index); }
    },
    move(d) {
      if (phase !== "ready" || !entered) return;
      direction = d; incoming = nextCard(index, direction); elapsed = 0; phase = "switching";
      hooks.onState(phase, index);
    },
    setReducedMotion(value) { reduced = value; },
    dispose,
  };
}
