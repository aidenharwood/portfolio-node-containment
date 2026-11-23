import type { DistrictLayout } from '../../../packages/shared/src/world/layoutSchema.ts';

export interface QuestPlacements {
  readonly objects?: DistrictLayout['objects'];
  readonly npcs?: DistrictLayout['npcs'];
}

export const QUEST_PLACEMENTS: Readonly<Record<string, QuestPlacements>> = {
  'arcade-mile': {
    objects: [
      { id: 'arcade-mile-quest-scrapped-cabinet', object: 'scrapped-cabinet', at: { room: 'ground', dx: 41, dy: 42 } },
    ],
  },
  'ballast-strand': {
    objects: [
      { id: 'ballast-strand-quest-spill-container', object: 'spill-container', at: { room: 'ground', dx: 42, dy: 39 } },
    ],
  },
  'boiler-bay': {
    objects: [
      { id: 'boiler-bay-quest-meridian-valve', object: 'meridian-valve', at: { room: 'ground', dx: 41, dy: 40 } },
    ],
  },
  brightside: {
    objects: [
      { id: 'brightside-quest-dark-billboard', object: 'dark-billboard', at: { room: 'ground', dx: 41, dy: 41 } },
    ],
  },
  'cargo-spill': {
    objects: [
      { id: 'cargo-spill-quest-spill-container-2', object: 'spill-container', at: { room: 'ground', dx: 47, dy: 39 } },
      { id: 'cargo-spill-quest-spill-container', object: 'spill-container', at: { room: 'ground', dx: 39, dy: 39 } },
    ],
  },
  'crater-shore': {
    objects: [
      { id: 'crater-shore-quest-cryo-pod', object: 'cryo-pod', at: { room: 'ground', dx: 44, dy: 40 } },
    ],
  },
  'data-docks': {
    objects: [
      { id: 'data-docks-quest-combine-camera', object: 'combine-camera', at: { room: 'ground', dx: 48, dy: 40 } },
    ],
  },
  'drop-edge': {
    objects: [
      { id: 'drop-edge-quest-drop-lookout', object: 'drop-lookout', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'engine-field': {
    objects: [
      { id: 'engine-field-quest-meridian-valve', object: 'meridian-valve', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'fallow-rows': {
    objects: [
      { id: 'fallow-rows-quest-magpie-nest', object: 'magpie-nest', at: { room: 'ground', dx: 41, dy: 40 } },
    ],
  },
  'firing-line': {
    objects: [
      { id: 'firing-line-quest-range-target-2', object: 'range-target', at: { room: 'ground', dx: 38, dy: 44 } },
      { id: 'firing-line-quest-range-target', object: 'range-target', at: { room: 'ground', dx: 45, dy: 38 } },
    ],
  },
  'glasshouse-alley': {
    npcs: [
      { id: 'glasshouse-alley-quest-reprint-sola', npc: 'reprint-sola', at: { room: 'ground', dx: 41, dy: 37 } },
    ],
  },
  harrowgate: {
    npcs: [
      { id: 'harrowgate-quest-reprint-adebayo', npc: 'reprint-adebayo', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'hollow-pylons': {
    objects: [
      { id: 'hollow-pylons-quest-pylon-tuner', object: 'pylon-tuner', at: { room: 'ground', dx: 41, dy: 38 } },
    ],
  },
  'keel-road': {
    objects: [
      { id: 'keel-road-quest-purser-locker', object: 'purser-locker', at: { room: 'ground', dx: 41, dy: 41 } },
    ],
  },
  'kestrel-commons': {
    objects: [
      { id: 'kestrel-commons-quest-returns-board', object: 'returns-board', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'kestrel-intake': {
    objects: [
      { id: 'kestrel-intake-quest-old-lift-book', object: 'old-lift-book', at: { room: 'processing', dx: 15, dy: 6 } },
    ],
  },
  'lantern-ward': {
    objects: [
      { id: 'lantern-ward-quest-combine-camera', object: 'combine-camera', at: { room: 'ground', dx: 45, dy: 41 } },
    ],
  },
  'last-post': {
    npcs: [
      { id: 'last-post-quest-reprint-cass', npc: 'reprint-cass', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'low-arcology': {
    objects: [
      { id: 'low-arcology-quest-combine-camera', object: 'combine-camera', at: { room: 'ground', dx: 34, dy: 39 } },
    ],
  },
  'mirror-mere': {
    objects: [
      { id: 'mirror-mere-quest-mere-reflection', object: 'mere-reflection', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'neon-row': {
    objects: [
      { id: 'neon-row-quest-smile-chart', object: 'smile-chart', at: { room: 'sato-clinic', dx: 5, dy: 4 } },
    ],
  },
  'night-market': {
    objects: [
      { id: 'night-market-quest-lins-old-stall', object: 'lins-old-stall', at: { room: 'ground', dx: 41, dy: 40 } },
    ],
  },
  'pylon-walk': {
    objects: [
      { id: 'pylon-walk-quest-pylon-tuner', object: 'pylon-tuner', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'quiet-peaks': {
    objects: [
      { id: 'quiet-peaks-quest-checkpoint-seal', object: 'checkpoint-seal', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'range-road': {
    objects: [
      { id: 'range-road-quest-range-target', object: 'range-target', at: { room: 'ground', dx: 41, dy: 43 } },
    ],
  },
  'reactor-scar': {
    objects: [
      { id: 'reactor-scar-quest-reactor-log', object: 'reactor-log', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'recruit-lines': {
    objects: [
      { id: 'recruit-lines-quest-cohort-bell-rope', object: 'cohort-bell-rope', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  rustwater: {
    npcs: [
      { id: 'rustwater-quest-reprint-marek', npc: 'reprint-marek', at: { room: 'ground', dx: 48, dy: 39 } },
      { id: 'rustwater-quest-archivist-okafor', npc: 'archivist-okafor', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'sealed-ground': {
    objects: [
      { id: 'sealed-ground-quest-checkpoint-seal', object: 'checkpoint-seal', at: { room: 'ground', dx: 37, dy: 39 } },
    ],
  },
  'site-kestrel': {
    objects: [
      { id: 'site-kestrel-quest-sulking-coat-cell', object: 'sulking-coat-cell', at: { room: 'holding-block-k', dx: 6, dy: 4 } },
    ],
    npcs: [
      { id: 'site-kestrel-quest-range-master-brandt', npc: 'range-master-brandt', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'spire-plaza': {
    objects: [
      { id: 'spire-plaza-quest-rigged-cabinet', object: 'rigged-cabinet', at: { room: 'plaza-arcade', dx: 6, dy: 4 } },
    ],
  },
  'the-bow': {
    objects: [
      { id: 'the-bow-quest-meridian-nameplate', object: 'meridian-nameplate', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'the-choir': {
    npcs: [
      { id: 'the-choir-quest-reprint-yusuf', npc: 'reprint-yusuf', at: { room: 'ground', dx: 48, dy: 39 } },
      { id: 'the-choir-quest-surveyor-idris', npc: 'surveyor-idris', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'the-lens': {
    objects: [
      { id: 'the-lens-quest-lens-mount', object: 'lens-mount', at: { room: 'ground', dx: 37, dy: 39 } },
    ],
  },
  'the-overpass': {
    objects: [
      { id: 'the-overpass-quest-cohort-billboard', object: 'cohort-billboard', at: { room: 'ground', dx: 41, dy: 38 } },
    ],
  },
  'tithe-barns': {
    objects: [
      { id: 'tithe-barns-quest-tithe-ledger', object: 'tithe-ledger', at: { room: 'ground', dx: 41, dy: 37 } },
    ],
  },
  undertow: {
    objects: [
      { id: 'undertow-quest-sola-camera', object: 'sola-camera', at: { room: 'ground', dx: 41, dy: 37 } },
    ],
  },
  'vigil-fields': {
    objects: [
      { id: 'vigil-fields-quest-pylon-tuner', object: 'pylon-tuner', at: { room: 'ground', dx: 45, dy: 39 } },
    ],
  },
  'white-noise': {
    objects: [
      { id: 'white-noise-quest-cass-locker', object: 'cass-locker', at: { room: 'ground', dx: 41, dy: 39 } },
    ],
  },
  'windpump-rise': {
    objects: [
      { id: 'windpump-rise-quest-windpump-housing', object: 'windpump-housing', at: { room: 'ground', dx: 41, dy: 42 } },
    ],
  },
};

export function withQuestPlacements<T extends { readonly id: string; readonly objects: DistrictLayout['objects']; readonly npcs: DistrictLayout['npcs'] }>(layout: T): T {
  const placements = QUEST_PLACEMENTS[layout.id];
  if (!placements) return layout;
  return { ...layout, objects: [...(placements.objects ?? []), ...layout.objects], npcs: [...(placements.npcs ?? []), ...layout.npcs] };
}
