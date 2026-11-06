import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import type { CharacterRig } from './models/characterModel.ts';
import { VOXEL_EMISSIVE } from './voxel/voxelKinds.ts';
import { createVoxelObject } from './voxel/voxelMaterials.ts';
import { VoxelModel } from './voxel/voxelModel.ts';
import { noise3 } from './voxel/palette.ts';

export interface PortraitSubject {
  readonly canvas: HTMLCanvasElement;
  readonly rig: CharacterRig;
  readonly zoom: number;
  readonly pedestal: boolean;
  yaw(): number;
  pose(time: number, delta: number): void;
}

class PortraitStudio {
  private renderer: WebGLRenderer | null = null;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(28, 1, 0.1, 50);
  private readonly stage = new Group();
  private readonly pedestal = buildPedestal();
  private readonly rimLight = new PointLight(0x4fd8ff, 6, 6, 2);
  private readonly subjects = new Set<PortraitSubject>();
  private frame = 0;
  private lastFrame = performance.now();

  constructor() {
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(2, 4, 4);
    const fill = new HemisphereLight(0xbfdcff, 0x101820, 1.1);
    this.rimLight.position.set(-1.2, 1.6, -1.5);
    this.scene.add(key, fill, this.rimLight, this.stage, this.pedestal);
  }

  register(subject: PortraitSubject): void {
    this.subjects.add(subject);
    if (this.subjects.size === 1) this.frame = requestAnimationFrame(this.tick);
  }

  unregister(subject: PortraitSubject): void {
    this.subjects.delete(subject);
    if (this.subjects.size === 0) cancelAnimationFrame(this.frame);
  }

  private ensureRenderer(): WebGLRenderer {
    if (!this.renderer) {
      this.renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
      this.renderer.outputColorSpace = SRGBColorSpace;
      this.renderer.toneMapping = ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      this.renderer.setClearColor(0x000000, 0);
    }
    return this.renderer;
  }

  private readonly tick = (now: number): void => {
    const renderer = this.ensureRenderer();
    const delta = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const time = now / 1000;
    const neededWidth = Math.max(...[...this.subjects].map((subject) => subject.canvas.width), 1);
    const neededHeight = Math.max(...[...this.subjects].map((subject) => subject.canvas.height), 1);
    if (renderer.domElement.width < neededWidth || renderer.domElement.height < neededHeight) {
      renderer.setPixelRatio(1);
      renderer.setSize(Math.max(neededWidth, renderer.domElement.width), Math.max(neededHeight, renderer.domElement.height), false);
    }
    const canvasHeight = renderer.domElement.height;

    for (const subject of this.subjects) {
      const { canvas } = subject;
      const context = canvas.getContext('2d');
      if (!context) continue;
      subject.pose(time, delta);
      this.stage.add(subject.rig.root);
      subject.rig.root.rotation.y = subject.yaw();
      this.pedestal.visible = subject.pedestal;
      this.pedestal.rotation.y = time * 0.3;
      this.rimLight.intensity = 5 + Math.sin(time * 2) * 1.5;

      const height = subject.rig.height;
      this.camera.aspect = canvas.width / canvas.height;
      this.camera.position.set(0, height * 0.62, (height * 2.6) / subject.zoom);
      this.camera.lookAt(0, height * 0.5, 0);
      this.camera.updateProjectionMatrix();

      renderer.setViewport(0, canvasHeight - canvas.height, canvas.width, canvas.height);
      renderer.setScissor(0, canvasHeight - canvas.height, canvas.width, canvas.height);
      renderer.setScissorTest(true);
      renderer.clear();
      renderer.render(this.scene, this.camera);
      this.stage.remove(subject.rig.root);

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    }
    this.frame = requestAnimationFrame(this.tick);
  };
}

function buildPedestal(): Group {
  const model = new VoxelModel();
  for (let x = -14; x <= 14; x++) {
    for (let z = -14; z <= 14; z++) {
      const distance = Math.hypot(x, z);
      if (distance <= 12) model.set(x, -1, z, distance > 10.5 ? 0x2f4250 : noise3(x, 0, z) > 0.5 ? 0x15212a : 0x1a2730);
      if (distance > 12.6 && distance <= 13.6 && (Math.atan2(z, x) * 6) % 2 > 0.4) model.set(x, -1, z, 0x4fd8ff, VOXEL_EMISSIVE);
    }
  }
  return createVoxelObject(model.mesh(0.045), { castShadow: false, receiveShadow: false });
}

export const portraitStudio = new PortraitStudio();
