import { GAME_CONTENT, type GroundItemSnapshot } from '@containment/shared';
import { AdditiveBlending, Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, RingGeometry, Vector3, type Object3D } from 'three';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import { buildItemModel } from './itemModels.ts';

const GROUND_VOXEL_SIZE = 1 / 30;
const STACK_SPREAD = 0.18;
const FLOOR_CLEARANCE = 0.005;
const PICK_SIZE = 0.62;
const PICK_HEIGHT = 0.3;

interface GroundItemView {
  readonly group: Group;
  readonly halo: Mesh;
}

const meshCache = new Map<string, VoxelMeshes>();
const pickGeometry = new BoxGeometry(PICK_SIZE, PICK_HEIGHT, PICK_SIZE).translate(0, PICK_HEIGHT / 2, 0);
const pickMaterial = new MeshBasicMaterial({ visible: false });

function meshesFor(itemId: string): VoxelMeshes | null {
  const cached = meshCache.get(itemId);
  if (cached) return cached;
  const item = GAME_CONTENT.items.get(itemId);
  if (!item) return null;
  const meshes = buildItemModel(item).mesh(GROUND_VOXEL_SIZE);
  meshCache.set(itemId, meshes);
  return meshes;
}

const hashOf = (text: string): number => {
  let hash = 0;
  for (let index = 0; index < text.length; index++) hash = (hash * 31 + text.charCodeAt(index)) | 0;
  return Math.abs(hash);
};

function layFlat(model: Object3D, seed: number): Group {
  const resting = new Group();
  resting.add(model);
  const size = new Box3().setFromObject(model).getSize(new Vector3());
  const thinnest = Math.min(size.x, size.y, size.z);
  if (thinnest === size.x && thinnest < size.y) model.rotation.z = Math.PI / 2;
  else if (thinnest === size.z && thinnest < size.y) model.rotation.x = Math.PI / 2;
  resting.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(resting);
  const centre = bounds.getCenter(new Vector3());
  model.position.set(-centre.x, -bounds.min.y + FLOOR_CLEARANCE, -centre.z);
  resting.rotation.y = ((seed % 360) / 360) * Math.PI * 2;
  return resting;
}

export class GroundItemLayer {
  readonly root = new Group();
  private readonly views = new Map<string, GroundItemView>();
  private readonly ownedHalo = new MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
  private readonly publicHalo = new MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });

  sync(items: ReadonlyMap<string, GroundItemSnapshot>, ground: (x: number, y: number) => number = () => 0): void {
    for (const [id, view] of this.views) {
      if (items.has(id)) continue;
      view.group.removeFromParent();
      this.views.delete(id);
    }

    const perTile = new Map<string, number>();
    for (const item of items.values()) {
      const view = this.views.get(item.id) ?? this.create(item);
      if (!view) continue;
      const tileKey = `${item.position.x},${item.position.y}`;
      const slot = perTile.get(tileKey) ?? 0;
      perTile.set(tileKey, slot + 1);
      const angle = slot * 2.4;
      const offset = slot === 0 ? 0 : STACK_SPREAD;
      view.group.position.set(item.position.x + Math.cos(angle) * offset, ground(item.position.x, item.position.y), item.position.y + Math.sin(angle) * offset);
      view.halo.material = item.owned ? this.ownedHalo : this.publicHalo;
    }
  }

  pickables(): Object3D[] {
    return [...this.views.values()].map((view) => view.group);
  }

  private create(item: GroundItemSnapshot): GroundItemView | null {
    const meshes = meshesFor(item.itemId);
    if (!meshes) return null;
    const group = new Group();
    const model = createVoxelObject(meshes, { castShadow: true, receiveShadow: false });
    const resting = layFlat(model, hashOf(item.id));
    const halo = new Mesh(new RingGeometry(0.16, 0.22, 24), this.publicHalo);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.01;
    const pickProxy = new Mesh(pickGeometry, pickMaterial);
    group.add(resting, halo, pickProxy);
    group.userData.pick = { kind: 'groundItem', instanceId: item.id };
    this.root.add(group);
    const view = { group, halo };
    this.views.set(item.id, view);
    return view;
  }
}
