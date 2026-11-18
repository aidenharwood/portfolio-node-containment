import { ACESFilmicToneMapping, DirectionalLight, HemisphereLight, PerspectiveCamera, PointLight, Scene, SRGBColorSpace, WebGLRenderer, Color } from 'three';
import { CharacterRig } from '../packages/client/src/render/models/characterModel.ts';

const appearance = {
  physique: 'male', bodyType: 'average', height: 1, skinTone: '#c48a62', hairStyle: 'crop', hairColor: '#3b2618',
  eyeColor: '#3d6e9c', faceMark: 'none', augment: 'none',
} as const;

export const lineup = (sets: string[][], opts: { yaw?: number; width?: number; height?: number; zoom?: number; attack?: number | null } = {}) => {
  document.getElementById('__lineup')?.remove();
  const width = opts.width ?? 800;
  const height = opts.height ?? 600;
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
  scene.background = new Color('#1b1d24');
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 4, 4);
  const rim = new PointLight(0x4fd8ff, 4, 8, 2);
  rim.position.set(-2, 2, -2);
  scene.add(key, new HemisphereLight(0xbfdcff, 0x101820, 1.1), rim);
  const spacing = 1.3;
  sets.forEach((gear, index) => {
    const rig = new CharacterRig(appearance as never, gear as never);
    rig.root.position.x = (index - (sets.length - 1) / 2) * spacing;
    rig.root.rotation.y = opts.yaw ?? 0.5;
    rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: opts.attack ?? null });
    scene.add(rig.root);
  });
  const camera = new PerspectiveCamera(28, width / height, 0.1, 50);
  const zoom = opts.zoom ?? 1;
  camera.position.set(0, 1.1, (sets.length * spacing * 1.9 + 2.5) / zoom);
  camera.lookAt(0, 0.7, 0);
  renderer.render(scene, camera);
  return 'ok';
};
