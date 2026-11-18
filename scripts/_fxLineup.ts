import { ACESFilmicToneMapping, Color, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
import { ProjectileLayer } from '../packages/client/src/render/projectileLayer.ts';
import { CharacterRig } from '../packages/client/src/render/models/characterModel.ts';
import { createCreatureRig } from '../packages/client/src/render/models/creatureModels.ts';
import { attackKeyTimes, heldWeaponOf, motionFor } from '../packages/client/src/render/models/weaponPoses.ts';
import { ParticleLayer, type ParticlePreset } from '../packages/client/src/render/particleLayer.ts';
import { setVoxelObjectFlash } from '../packages/client/src/render/voxel/voxelMaterials.ts';

const appearance = { physique: 'male', bodyType: 'average', height: 1, skinTone: '#c48a62', hairStyle: 'crop', hairColor: '#3b2618', eyeColor: '#3d6e9c', faceMark: 'none', augment: 'none' } as const;

const stage = (width = 1280, height = 800) => {
  document.getElementById('__lineup')?.remove();
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.domElement.id = '__lineup';
  renderer.domElement.style.cssText = 'position:fixed;left:0;top:0;z-index:100000';
  document.body.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color('#1b1d24');
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 4, 4);
  scene.add(key, new HemisphereLight(0xbfdcff, 0x101820, 1.1));
  return { renderer, scene };
};

export const swings = (gear: string[], samples = [0, 0.2, 0.35, 0.5, 0.62, 0.8], yaw = 1.2): string => {
  const { renderer, scene } = stage();
  samples.forEach((attack, index) => {
    const rig = new CharacterRig(appearance as never, gear as never);
    rig.root.position.x = (index - (samples.length - 1) / 2) * 1.25;
    rig.root.rotation.y = yaw;
    rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: attack });
    scene.add(rig.root);
  });
  const camera = new PerspectiveCamera(28, 1280 / 800, 0.1, 50);
  camera.position.set(0, 1.4, 9);
  camera.lookAt(0, 0.8, 0);
  renderer.render(scene, camera);
  return 'ok';
};

export const walk = (gear: string[]): string => {
  const { renderer, scene } = stage();
  [0, 0.25, 0.5, 0.75, 1, 1.25].forEach((phase, index) => {
    const rig = new CharacterRig(appearance as never, gear as never);
    rig.root.position.x = (index - 2.5) * 1.25;
    rig.root.rotation.y = 1.4;
    rig.animate({ moving: true, walkPhase: phase * Math.PI, time: 0 });
    scene.add(rig.root);
  });
  const camera = new PerspectiveCamera(28, 1280 / 800, 0.1, 50);
  camera.position.set(0, 1.4, 9);
  camera.lookAt(0, 0.8, 0);
  renderer.render(scene, camera);
  return 'ok';
};

export const creatures = (models: string[], attack: number | null, hurt: number | null): string => {
  const { renderer, scene } = stage();
  models.forEach((model, index) => {
    const rig = createCreatureRig(model as never);
    rig.root.position.x = (index - (models.length - 1) / 2) * 1.6;
    rig.root.rotation.y = 1.2;
    rig.animate({ moving: false, walkPhase: 0, time: 1, attackProgress: attack, hurtProgress: hurt });
    scene.add(rig.root);
  });
  const camera = new PerspectiveCamera(30, 1280 / 800, 0.1, 80);
  camera.position.set(0, 2.2, 16);
  camera.lookAt(0, 0.8, 0);
  renderer.render(scene, camera);
  return 'ok';
};

export const shots = (progress: number): string => {
  const { renderer, scene } = stage();
  const layer = new ProjectileLayer();
  scene.add(layer.root);
  const kinds = ['dart', 'bolt', 'tracer', 'pellets', 'spit', 'pulse', 'wave'] as const;
  const colors = [0xb6ff4f, 0x3fe0b0, 0xe8a21c, 0xc79bff, 0xc8ff7a, 0xd8322a, 0x7fd8ff];
  kinds.forEach((kind, index) => {
    const y = 6.5 - index * 0.9;
    layer.launch(kind, new Vector3(-4, y, 0), new Vector3(4, y, 0), colors[index]!, 0, 1000);
  });
  layer.update(progress * 1000);
  const camera = new PerspectiveCamera(40, 1280 / 800, 0.1, 50);
  camera.position.set(0, 3.9, 9);
  camera.lookAt(0, 3.9, 0);
  renderer.render(scene, camera);
  return 'ok';
};

export const keyed = (gear: string[], yaw = 1.2): string => {
  const motion = motionFor(heldWeaponOf(gear as never));
  const keys = attackKeyTimes(motion).filter((key) => key > 0 && key < 1);
  return swings(gear, [0, ...keys], yaw);
};

export const creatures2 = (models: string[], attack: number | null, hurt: number | null, flash = false): string => {
  const { renderer, scene } = stage();
  models.forEach((model, index) => {
    const rig = createCreatureRig(model as never);
    rig.root.position.x = (index - (models.length - 1) / 2) * 1.6;
    rig.root.rotation.y = 1.2;
    rig.animate({ moving: false, walkPhase: 0, time: 1, attackProgress: attack, hurtProgress: hurt });
    if (flash) setVoxelObjectFlash(rig.root, true);
    scene.add(rig.root);
  });
  const camera = new PerspectiveCamera(30, 1280 / 800, 0.1, 80);
  camera.position.set(0, 2.2, 16);
  camera.lookAt(0, 0.8, 0);
  renderer.render(scene, camera);
  return 'ok';
};

export const fx = (seconds: number): string => {
  const { renderer, scene } = stage();
  const layer = new ParticleLayer();
  scene.add(layer.root);
  const presets: [ParticlePreset, number][] = [['sparks', 0xfff1c8], ['puff', 0x9aa0a6], ['debris', 0x8a6a42], ['chips', 0x8a7a6a], ['motes', 0xffd23f], ['ring', 0x7fd8ff], ['droplets', 0xc8ff7a]];
  presets.forEach(([preset, color], index) => layer.emit(preset, new Vector3((index - 3) * 1.6, 1, 0), { color }));
  for (let t = 0; t < seconds; t += 0.02) layer.update(0.02);
  const camera = new PerspectiveCamera(40, 1280 / 800, 0.1, 50);
  camera.position.set(0, 1.4, 9);
  camera.lookAt(0, 0.8, 0);
  renderer.render(scene, camera);
  return 'ok';
};

export const impacts = (afterMs: number): string => {
  const { renderer, scene } = stage();
  const particles = new ParticleLayer();
  const layer = new ProjectileLayer((kind, at, travel, color) => {
    const back = travel.clone().negate();
    if (kind === 'pulse') particles.emit('ring', at, { color });
    else if (kind === 'wave') particles.emit('ring', at, { color, ringAxis: travel });
    else if (kind === 'spit') particles.emit('droplets', at, { color });
    else particles.emit('sparks', at, { color, direction: back, count: kind === 'pellets' ? 1 : kind === 'tracer' ? 10 : 8 });
  });
  scene.add(layer.root, particles.root);
  const kinds = ['dart', 'bolt', 'tracer', 'pellets', 'spit', 'pulse', 'wave'] as const;
  const colors = [0xb6ff4f, 0x3fe0b0, 0xe8a21c, 0xc79bff, 0xc8ff7a, 0xd8322a, 0x7fd8ff];
  kinds.forEach((kind, index) => layer.launch(kind, new Vector3(-4, 6.5 - index * 0.9, 0), new Vector3(2, 6.5 - index * 0.9, 0), colors[index]!, 0, 1000));
  layer.update(1001);
  for (let t = 0; t < afterMs; t += 20) { layer.update(1001 + t); particles.update(0.02); }
  const camera = new PerspectiveCamera(40, 1280 / 800, 0.1, 50);
  camera.position.set(0, 3.9, 9);
  camera.lookAt(0, 3.9, 0);
  renderer.render(scene, camera);
  return 'ok';
};

const gameCamera = () => {
  const camera = new PerspectiveCamera(40, 1280 / 800, 0.1, 80);
  const pitch = (52 * Math.PI) / 180;
  camera.position.set(0, 11 * Math.sin(pitch), 11 * Math.cos(pitch));
  camera.lookAt(0, 0.6, 0);
  return camera;
};

export const fxGame = (seconds: number): string => {
  const { renderer, scene } = stage();
  const layer = new ParticleLayer();
  scene.add(layer.root);
  const presets: [ParticlePreset, number][] = [['sparks', 0xfff1c8], ['puff', 0x9aa0a6], ['debris', 0x8a6a42], ['chips', 0x8a7a6a], ['motes', 0xffd23f], ['ring', 0x7fd8ff], ['droplets', 0xc8ff7a]];
  presets.forEach(([preset, color], index) => layer.emit(preset, new Vector3((index - 3) * 1.4, 0.7, 0), { color }));
  for (let t = 0; t < seconds; t += 0.02) layer.update(0.02);
  renderer.render(scene, gameCamera());
  return 'ok';
};

export const death = (models: string[], t: number): string => {
  const { renderer, scene } = stage();
  const layer = new ParticleLayer();
  scene.add(layer.root);
  models.forEach((model, index) => {
    const rig = createCreatureRig(model as never);
    rig.root.position.x = (index - (models.length - 1) / 2) * 2.4;
    rig.root.rotation.y = 1.2;
    const dying = Math.min(1, t);
    rig.animate({ moving: false, walkPhase: 0, time: 1, attackProgress: null, hurtProgress: null, dying });
    if (!rig.airborne) {
      rig.root.rotation.z = -dying * 1.4;
      rig.root.position.y = -dying * 0.15;
    }
    if (t >= 1) {
      const at = rig.root.position.clone();
      at.y += rig.height * 0.45;
      if (rig.spirit) layer.emit('motes', at, { colors: [rig.accent ?? 0xffffff], count: 28, spawnBox: new Vector3(0.3, rig.height * 0.9, 0.3) });
      else layer.emit('debris', at, { colors: rig.palette?.() ?? [0x9aa0a6] });
      rig.root.scale.setScalar(0);
      for (let s = 0; s < (t - 1) * 0.7; s += 0.02) layer.update(0.02);
    }
    scene.add(rig.root);
  });
  renderer.render(scene, gameCamera());
  return 'ok';
};

export const work = (gears: string[][], yaw = 1.2): string => {
  const { renderer, scene } = stage();
  gears.forEach((gear, index) => [0, 0.3, 0.45].forEach((progress, frame) => {
    const rig = new CharacterRig(appearance as never, gear as never);
    rig.root.position.x = (index * 3 + frame - 2.5) * 1.25;
    rig.root.rotation.y = yaw;
    rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: progress, attackMotion: 'work' });
    scene.add(rig.root);
  }));
  const camera = new PerspectiveCamera(28, 1280 / 800, 0.1, 50);
  camera.position.set(0, 1.4, 10);
  camera.lookAt(0, 0.8, 0);
  renderer.render(scene, camera);
  return 'ok';
};

export const topDown = (gear: string[], samples: number[]): string => {
  const { renderer, scene } = stage();
  const layer = new ParticleLayer();
  scene.add(layer.root);
  const tip = new Vector3();
  samples.forEach((attack, index) => {
    const rig = new CharacterRig(appearance as never, gear as never);
    rig.root.position.x = (index - (samples.length - 1) / 2) * 1.8;
    scene.add(rig.root);
    for (let t = Math.max(0, attack - 0.12); t <= attack + 1e-6; t += 0.02) {
      rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: t });
      if (rig.muzzle(tip)) layer.emit('trail', tip.clone(), { color: 0x3fe0b0 });
    }
    rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: attack });
  });
  layer.update(0.001);
  const camera = new PerspectiveCamera(35, 1280 / 800, 0.1, 50);
  camera.position.set(0, 7, 0.01);
  camera.lookAt(0, 0.5, 0);
  renderer.render(scene, camera);
  return 'ok';
};
