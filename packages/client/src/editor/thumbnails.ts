import { ACESFilmicToneMapping, Box3, DirectionalLight, HemisphereLight, Mesh, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer, type Object3D } from 'three';
import type { PaletteEntry } from './editController.ts';
import { modelOf } from './itemModels.ts';

const SIZE = 112;
const VIEW_DIRECTION = new Vector3(1, 0.85, 1.25).normalize();

type Ready = (url: string | null) => void;

class ThumbnailStudio {
  private renderer: WebGLRenderer | null = null;
  private failed = false;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 0.01, 200);
  private readonly cache = new Map<string, string | null>();
  private readonly queue: { entry: PaletteEntry; ready: Ready }[] = [];
  private readonly waiting = new Map<string, Ready[]>();
  private scheduled = false;

  constructor() {
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 6, 4);
    const fill = new DirectionalLight(0x9fd8ff, 0.8);
    fill.position.set(-4, 2, -2);
    this.scene.add(new HemisphereLight(0xdfefff, 0x1a242c, 1.4), key, fill);
  }

  request(entry: PaletteEntry, ready: Ready): void {
    if (this.cache.has(entry.label)) {
      ready(this.cache.get(entry.label) ?? null);
      return;
    }
    const pending = this.waiting.get(entry.label);
    if (pending) {
      pending.push(ready);
      return;
    }
    this.waiting.set(entry.label, [ready]);
    this.queue.push({ entry, ready: (url) => this.finish(entry.label, url) });
    this.schedule();
  }

  private finish(label: string, url: string | null): void {
    this.cache.set(label, url);
    for (const ready of this.waiting.get(label) ?? []) ready(url);
    this.waiting.delete(label);
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    window.setTimeout(() => {
      this.scheduled = false;
      const started = performance.now();
      while (this.queue.length > 0 && performance.now() - started < 24) {
        const job = this.queue.shift();
        if (job) job.ready(this.draw(job.entry));
      }
      if (this.queue.length > 0) this.schedule();
    }, 16);
  }

  private rendererNow(): WebGLRenderer | null {
    if (this.renderer || this.failed) return this.renderer;
    try {
      const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(SIZE, SIZE, false);
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.setClearColor(0x000000, 0);
      this.renderer = renderer;
    } catch {
      this.failed = true;
    }
    return this.renderer;
  }

  private draw(entry: PaletteEntry): string | null {
    const model = modelOf(entry);
    const renderer = model ? this.rendererNow() : null;
    if (!model || !renderer) return null;
    this.scene.add(model);
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    if (box.isEmpty()) {
      this.release(entry, model);
      return null;
    }
    const centre = box.getCenter(new Vector3());
    const radius = Math.max(0.3, box.getSize(new Vector3()).length() / 2);
    const distance = radius / Math.sin((this.camera.fov * Math.PI) / 360);
    this.camera.position.copy(centre).addScaledVector(VIEW_DIRECTION, distance);
    this.camera.near = distance / 50;
    this.camera.far = distance * 4;
    this.camera.lookAt(centre);
    this.camera.updateProjectionMatrix();
    renderer.render(this.scene, this.camera);
    const url = renderer.domElement.toDataURL('image/png');
    this.release(entry, model);
    return url;
  }

  private release(entry: PaletteEntry, model: Object3D): void {
    this.scene.remove(model);
    if (entry.collection !== 'objects' && entry.collection !== 'setPieces') return;
    model.traverse((child) => {
      if (child instanceof Mesh) child.geometry.dispose();
    });
  }
}

let studio: ThumbnailStudio | null = null;

export function requestThumbnail(entry: PaletteEntry, ready: Ready): void {
  studio ??= new ThumbnailStudio();
  studio.request(entry, ready);
}
