import type { NpcQuestMarker } from '@containment/shared';
import { AdditiveBlending, BoxGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';

export type QuestMarkerKind = NonNullable<NpcQuestMarker> | 'target';

const MARKER_COLORS: Readonly<Record<QuestMarkerKind, readonly [number, number]>> = {
  available: [0xffd23f, 0xfff1a8],
  objective: [0x4fd8ff, 0xc8f6ff],
  target: [0xff5e3a, 0xffc4a8],
};

const BEACON_HEIGHT = 2.6;

export function createAreaBeacon(): Group {
  const beacon = new Group();
  beacon.name = 'objective-beacon';
  const column = new Mesh(
    new CylinderGeometry(0.32, 0.5, BEACON_HEIGHT, 20, 1, true),
    new MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide }),
  );
  column.position.y = BEACON_HEIGHT / 2;
  beacon.add(column, createGroundRing(0x4fd8ff, 0.55, 0.7), createGroundRing(0xc8f6ff, 0.9, 0.96));
  const marker = createQuestMarker('objective');
  marker.position.y = BEACON_HEIGHT + 0.2;
  beacon.add(marker);
  return beacon;
}

export function createQuestMarker(kind: QuestMarkerKind): Group {
  const [outer, inner] = MARKER_COLORS[kind];
  const model = new VoxelModel();
  for (let y = -4; y <= 4; y++) {
    const radius = 4 - Math.abs(y);
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (Math.abs(x) + Math.abs(z) <= radius) model.set(x, y, z, Math.abs(x) + Math.abs(z) + Math.abs(y) < 2 ? inner : outer, VOXEL_EMISSIVE);
      }
    }
  }
  const marker = createVoxelObject(model.mesh(0.035), { castShadow: false });
  marker.name = `marker:${kind}`;
  return marker;
}

export function createGroundRing(color: number, inner: number, outer: number): Mesh {
  const ring = new Mesh(
    new RingGeometry(inner, outer, 40),
    new MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 2;
  return ring;
}

export function createClickMarker(): { readonly group: Group; readonly material: MeshBasicMaterial } {
  const material = new MeshBasicMaterial({ color: 0xffd23f, transparent: true, depthWrite: false, toneMapped: false, blending: AdditiveBlending });
  const group = new Group();
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new Mesh(new BoxGeometry(0.5, 0.03, 0.08), material);
    bar.rotation.y = angle;
    group.add(bar);
  }
  group.visible = false;
  return { group, material };
}
