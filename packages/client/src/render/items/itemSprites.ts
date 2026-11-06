import type { ItemDefinition } from '@containment/shared';
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  HemisphereLight,
  OrthographicCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import { buildItemModel } from './itemModels.ts';

const SPRITE_PIXELS = 96;
const ITEM_VOXEL_SIZE = 1 / 16;
const FRAME_PADDING = 1.08;
const VIEW_DIRECTION = new Vector3(0.75, 0.62, 1).normalize();

class ItemSpriteStudio {
  private renderer: WebGLRenderer | null = null;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 50);
  private readonly cache = new Map<string, string>();

  constructor() {
    const key = new DirectionalLight(0xffffff, 2.4);
    key.position.set(2, 4, 3);
    const rim = new PointLight(0x4fd8ff, 3, 6, 2);
    rim.position.set(-1.5, 1, -1.5);
    this.scene.add(key, rim, new HemisphereLight(0xcfe8ff, 0x1a2228, 1.3));
  }

  spriteFor(item: ItemDefinition): string {
    const cached = this.cache.get(item.id);
    if (cached) return cached;
    const renderer = this.ensureRenderer();
    const object = createVoxelObject(buildItemModel(item).mesh(ITEM_VOXEL_SIZE), { castShadow: false, receiveShadow: false });
    this.scene.add(object);

    this.frame(new Box3().setFromObject(object));

    renderer.clear();
    renderer.render(this.scene, this.camera);
    const url = renderer.domElement.toDataURL('image/png');
    this.scene.remove(object);
    object.traverse((child) => {
      if ('geometry' in child && child.geometry && typeof (child.geometry as { dispose?: () => void }).dispose === 'function') {
        (child.geometry as { dispose: () => void }).dispose();
      }
    });
    this.cache.set(item.id, url);
    return url;
  }

  private frame(bounds: Box3): void {
    const center = bounds.getCenter(new Vector3());
    this.camera.position.copy(center).addScaledVector(VIEW_DIRECTION, 10);
    this.camera.lookAt(center);
    this.camera.updateMatrixWorld();
    const projected = new Box3();
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          projected.expandByPoint(new Vector3(x, y, z).applyMatrix4(this.camera.matrixWorldInverse));
        }
      }
    }
    const halfExtent = (Math.max(projected.max.x - projected.min.x, projected.max.y - projected.min.y) / 2) * FRAME_PADDING;
    const centerX = (projected.min.x + projected.max.x) / 2;
    const centerY = (projected.min.y + projected.max.y) / 2;
    this.camera.left = centerX - halfExtent;
    this.camera.right = centerX + halfExtent;
    this.camera.top = centerY + halfExtent;
    this.camera.bottom = centerY - halfExtent;
    this.camera.updateProjectionMatrix();
  }

  private ensureRenderer(): WebGLRenderer {
    if (!this.renderer) {
      this.renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(SPRITE_PIXELS, SPRITE_PIXELS, false);
      this.renderer.outputColorSpace = SRGBColorSpace;
      this.renderer.toneMapping = ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.25;
      this.renderer.setClearColor(0x000000, 0);
    }
    return this.renderer;
  }
}

const studio = new ItemSpriteStudio();

export const itemIconUrl = (item: ItemDefinition): string => studio.spriteFor(item);
