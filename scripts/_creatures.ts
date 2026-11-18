import { ACESFilmicToneMapping, CircleGeometry, Mesh, MeshStandardMaterial, PlaneGeometry, Color, DirectionalLight, HemisphereLight, PerspectiveCamera, PointLight, Scene, SRGBColorSpace, WebGLRenderer, Box3, Vector3, Group } from 'three';
import { createCreatureRig } from '../packages/client/src/render/models/creatureModels.ts';
import { CharacterRig } from '../packages/client/src/render/models/characterModel.ts';

const appearance = { physique: 'male', bodyType: 'average', height: 1, skinTone: '#c48a62', hairStyle: 'crop', hairColor: '#3b2618', eyeColor: '#3d6e9c', faceMark: 'none', augment: 'none' } as const;

export const ALL = ['trainingDrone', 'crateWisp', 'canalRat', 'pigeon', 'strayDog', 'gutterMite', 'siltEel', 'scrapCrawler', 'rustling', 'lineMimic', 'scrapMagpie', 'lamplighter', 'mothLantern', 'glassHound', 'hullKnocker', 'tideWraith', 'redTwin', 'cellBreaker', 'cordonStalker', 'vaultEcho', 'warden'];

export const sheet = (keys: string[], opts: { cols?: number; cell?: number; views?: number[]; human?: boolean; attack?: number | null; time?: number; moving?: boolean } = {}): string => {
  document.getElementById('__lineup')?.remove();
  const views = opts.views ?? [0.7, Math.PI / 2, 0];
  const cell = opts.cell ?? 300;
  const cols = opts.cols ?? 1;
  const rows = Math.ceil(keys.length / cols);
  const width = cell * views.length * cols;
  const height = cell * rows + 0;
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.setScissorTest(true);
  renderer.domElement.id = '__lineup';
  renderer.domElement.style.cssText = 'position:fixed;left:0;top:0;z-index:100000';
  document.body.append(renderer.domElement);
  const labels = document.createElement('div');
  labels.id = '__labels';
  document.getElementById('__labels')?.remove();
  labels.style.cssText = 'position:fixed;left:0;top:0;z-index:100001;font:13px monospace;color:#9fe';
  document.body.append(labels);
  keys.forEach((key, index) => {
    const scene = new Scene();
    scene.background = new Color(index % 2 ? '#1f2129' : '#1b1d24');
    const keyLight = new DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(2, 4, 4);
    const rim = new PointLight(0x4fd8ff, 4, 8, 2);
    rim.position.set(-2, 2, -2);
    scene.add(keyLight, new HemisphereLight(0xbfdcff, 0x101820, 1.1), rim);
    const rig = createCreatureRig(key as never);
    rig.animate({ moving: opts.moving ?? false, walkPhase: 0.4, time: opts.time ?? 0.5, attackProgress: opts.attack ?? null, hurtProgress: null });
    const holder = new Group();
    holder.add(rig.root);
    scene.add(holder);
    let human: CharacterRig | null = null;
    if (opts.human !== false) {
      human = new CharacterRig(appearance as never, [] as never);
      human.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: null });
      scene.add(human.root);
    }
    const box = new Box3().setFromObject(rig.root);
    const size = box.getSize(new Vector3());
    const span = Math.max(size.x, size.y, size.z, 0.5);
    if (human) human.root.position.set(-(span * 0.5 + 0.45), 0, -span * 0.3);
    const col = index % cols;
    const row = Math.floor(index / cols);
    views.forEach((yaw, v) => {
      holder.rotation.y = yaw;
      const frame = new Box3().setFromObject(holder);
      if (human) frame.union(new Box3().setFromObject(human.root));
      const fc = frame.getCenter(new Vector3());
      const fs = frame.getSize(new Vector3());
      const x = (col * views.length + v) * cell;
      const y = height - (row + 1) * cell;
      renderer.setViewport(x, y, cell, cell);
      renderer.setScissor(x, y, cell, cell);
      const camera = new PerspectiveCamera(30, 1, 0.02, 80);
      const fit = Math.max(fs.x, fs.y, fs.z * 0.6) * 0.62 / Math.tan((15 * Math.PI) / 180) + fs.z * 0.5;
      camera.position.set(fc.x, fc.y + fit * 0.3, fc.z + fit);
      camera.lookAt(fc);
      renderer.render(scene, camera);
    });
    const tag = document.createElement('div');
    tag.textContent = key;
    tag.style.cssText = `position:absolute;left:${col * views.length * cell + 6}px;top:${row * cell + 4}px`;
    labels.append(tag);
  });
  return `${width}x${height}`;
};

export const closeups = (keys: string[], opts: Parameters<typeof sheet>[1] = {}): string => sheet(keys, { human: false, ...opts });

export const gameView = (keys: string[], opts: { width?: number; height?: number; pitch?: number; distance?: number; human?: boolean; rows?: number } = {}): string => {
  document.getElementById('__lineup')?.remove();
  document.getElementById('__labels')?.remove();
  const width = opts.width ?? 1400;
  const height = opts.height ?? 700;
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.domElement.id = '__lineup';
  renderer.domElement.style.cssText = 'position:fixed;left:0;top:0;z-index:100000';
  document.body.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color('#0e1014');
  const keyLight = new DirectionalLight(0xc8d8ff, 1.1);
  keyLight.position.set(2, 5, 3);
  scene.add(keyLight, new HemisphereLight(0x8fb0d8, 0x0a0c10, 0.8));
  for (const [x, color] of [[-6, 0xff4fa8], [0, 0x4fd8ff], [6, 0xffb35a]] as const) {
    const neon = new PointLight(color, 6, 9, 1.6);
    neon.position.set(x, 2.2, -2.5);
    scene.add(neon);
  }
  const floor = new Mesh(new PlaneGeometry(60, 40), new MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.45, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  for (let i = 0; i < 14; i++) {
    const puddle = new Mesh(new CircleGeometry(0.5 + (i % 3) * 0.35, 20), new MeshStandardMaterial({ color: 0x1a1d23, roughness: 0.12, metalness: 0.35 }));
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(((i * 7.3) % 22) - 11, 0.003, ((i * 3.7) % 8) - 4);
    scene.add(puddle);
  }
  const items: { root: Group; width: number }[] = [];
  if (opts.human !== false) {
    const human = new CharacterRig(appearance as never, [] as never);
    human.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: null });
    items.push({ root: human.root, width: 0.8 });
  }
  for (const key of keys) {
    const rig = createCreatureRig(key as never);
    rig.animate({ moving: false, walkPhase: 0, time: 0.5, attackProgress: null, hurtProgress: null });
    rig.root.rotation.y = 0.6;
    const size = new Box3().setFromObject(rig.root).getSize(new Vector3());
    items.push({ root: rig.root, width: Math.max(size.x, size.z) + 0.25 });
  }
  const rows = opts.rows ?? 1;
  const perRow = Math.ceil(items.length / rows);
  for (let r = 0; r < rows; r++) {
    const row = items.slice(r * perRow, (r + 1) * perRow);
    const total = row.reduce((sum, item) => sum + item.width, 0);
    let x = -total / 2;
    for (const item of row) {
      item.root.position.set(x + item.width / 2, 0, (r - (rows - 1) / 2) * 3);
      x += item.width;
      scene.add(item.root);
    }
  }
  const pitch = ((opts.pitch ?? 52) * Math.PI) / 180;
  const distance = opts.distance ?? 11;
  const camera = new PerspectiveCamera(40, width / height, 0.1, 200);
  camera.position.set(0, Math.sin(pitch) * distance + 0.5, Math.cos(pitch) * distance);
  camera.lookAt(0, 0.5, 0);
  renderer.render(scene, camera);
  return `${width}x${height}`;
};
