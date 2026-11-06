import { GAME_CONTENT, type GroundItemSnapshot } from '@containment/shared';
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, RingGeometry, type Object3D } from 'three';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import { buildItemModel } from './itemModels.ts';

const GROUND_VOXEL_SIZE = 1 / 30;
const STACK_SPREAD = 0.18;

interface GroundItemView {
  readonly group: Group;
  readonly model: Group;
  readonly halo: Mesh;
  readonly seed: number;
}

const meshCache = new Map<string, VoxelMeshes>();

function meshesFor(itemId: string): VoxelMeshes | null {
  const cached = meshCache.get(itemId);
  if (cached) return cached;
  const item = GAME_CONTENT.items.get(itemId);
  if (!item) return null;
  const meshes = buildItemModel(item).mesh(GROUND_VOXEL_SIZE);
  meshCache.set(itemId, meshes);
  return meshes;
}

export class GroundItemLayer {
  readonly root = new Group();
  private readonly views = new Map<string, GroundItemView>();
  private readonly ownedHalo = new MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  private readonly publicHalo = new MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false, toneMapped: false });

  sync(items: ReadonlyMap<string, GroundItemSnapshot>, time: number): void {
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
      view.group.position.set(item.position.x + Math.cos(angle) * offset, 0, item.position.y + Math.sin(angle) * offset);
      view.model.position.y = 0.12 + Math.sin(time * 2 + view.seed) * 0.03;
      view.model.rotation.y = time * 0.8 + view.seed;
      view.halo.material = item.owned ? this.ownedHalo : this.publicHalo;
    }
    this.ownedHalo.opacity = 0.4 + Math.sin(time * 3) * 0.15;
  }

  pickables(): Object3D[] {
    return [...this.views.values()].map((view) => view.group);
  }

  private create(item: GroundItemSnapshot): GroundItemView | null {
    const meshes = meshesFor(item.itemId);
    if (!meshes) return null;
    const group = new Group();
    const model = createVoxelObject(meshes, { castShadow: true, receiveShadow: false });
    const halo = new Mesh(new RingGeometry(0.12, 0.2, 24), this.publicHalo);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.02;
    group.add(model, halo);
    group.userData.pick = { kind: 'groundItem', instanceId: item.id };
    this.root.add(group);
    const view = { group, model, halo, seed: (item.id.length * 7 + item.position.x) % 10 };
    this.views.set(item.id, view);
    return view;
  }
}
