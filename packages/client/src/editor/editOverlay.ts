import { BoxGeometry, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, type Object3D } from 'three';

export interface OverlayBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const SELECTED = 0xffd23f;
const VALID = 0x6fe39a;
const INVALID = 0xff5a4a;

export class EditOverlay {
  readonly root = new Group();
  private readonly selection: LineSegments;
  private readonly selectionMaterial = new LineBasicMaterial({ color: SELECTED, toneMapped: false, depthTest: false, transparent: true });
  private readonly ghostFloor: Mesh;
  private readonly ghostFloorMaterial = new MeshBasicMaterial({ color: VALID, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
  private readonly ghostOutline: LineSegments;
  private readonly ghostOutlineMaterial = new LineBasicMaterial({ color: VALID, toneMapped: false, depthTest: false, transparent: true });
  private readonly ghostModelHolder = new Group();
  private ghostKey = '';
  private selectionTop = 0;

  constructor() {
    const unitBox = new EdgesGeometry(new BoxGeometry(1, 1, 1));
    this.selection = new LineSegments(unitBox, this.selectionMaterial);
    this.selection.renderOrder = 10;
    this.selection.visible = false;
    const floor = new PlaneGeometry(1, 1);
    floor.rotateX(-Math.PI / 2);
    this.ghostFloor = new Mesh(floor, this.ghostFloorMaterial);
    this.ghostFloor.visible = false;
    this.ghostOutline = new LineSegments(unitBox, this.ghostOutlineMaterial);
    this.ghostOutline.renderOrder = 10;
    this.ghostOutline.visible = false;
    this.root.add(this.selection, this.ghostFloor, this.ghostOutline, this.ghostModelHolder);
  }

  showSelection(box: OverlayBox | null, tall: boolean): void {
    this.selection.visible = box !== null;
    if (!box) return;
    const height = tall ? 1.6 : 0.12;
    this.selection.scale.set(box.width + 0.08, height, box.height + 0.08);
    this.selection.position.set(box.x + (box.width - 1) / 2, height / 2, box.y + (box.height - 1) / 2);
    this.selectionTop = height;
  }

  selectionAnchor(): { x: number; y: number; z: number } | null {
    if (!this.selection.visible) return null;
    return { x: this.selection.position.x, y: this.selectionTop + 0.15, z: this.selection.position.z };
  }

  showGhost(box: OverlayBox | null, valid: boolean, model?: { readonly key: string; build(): Object3D | null }): void {
    const visible = box !== null;
    this.ghostFloor.visible = visible;
    this.ghostOutline.visible = visible;
    this.ghostModelHolder.visible = visible && model !== undefined;
    if (!box) return;
    const colour = valid ? VALID : INVALID;
    this.ghostFloorMaterial.color.setHex(colour);
    this.ghostOutlineMaterial.color.setHex(colour);
    this.ghostFloor.scale.set(box.width, 1, box.height);
    this.ghostFloor.position.set(box.x + (box.width - 1) / 2, 0.04, box.y + (box.height - 1) / 2);
    this.ghostOutline.scale.set(box.width, 1.4, box.height);
    this.ghostOutline.position.set(box.x + (box.width - 1) / 2, 0.7, box.y + (box.height - 1) / 2);
    if (model && model.key !== this.ghostKey) {
      this.ghostKey = model.key;
      this.ghostModelHolder.clear();
      const built = model.build();
      if (built) this.ghostModelHolder.add(built);
    }
    this.ghostModelHolder.position.set(box.x, 0, box.y);
  }

  dispose(): void {
    this.selection.geometry.dispose();
    this.ghostFloor.geometry.dispose();
    this.selectionMaterial.dispose();
    this.ghostFloorMaterial.dispose();
    this.ghostOutlineMaterial.dispose();
  }
}
