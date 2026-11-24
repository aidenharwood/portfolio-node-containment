import type { BuildingSpec } from './places.ts';

type Facing = 'north' | 'east' | 'south' | 'west';

export interface Recipe {
  readonly objects: { object: string; dx: number; dy: number; facing?: Facing }[];
  readonly npcs: { npc: string; dx: number; dy: number }[];
  readonly creatures: { creature: string; dx: number; dy: number }[];
  readonly elites: { creature: string; dx: number; dy: number }[];
  readonly late: { object: string; dx: number; dy: number; facing?: Facing; after: number }[];
  readonly anchors: Record<string, { dx: number; dy: number }>;
}

const S: Facing = 'south';

export function recipeOf(building: BuildingSpec): Recipe {
  const out: Recipe = { objects: [], npcs: [], creatures: [], elites: [], late: [], anchors: {} };
  const put = (object: string, dx: number, dy: number, facing?: Facing): void => void out.objects.push({ object, dx, dy, ...(facing ? { facing } : {}) });
  const npcs = building.npcs ?? [];
  const person = (index: number, dx: number, dy: number): void => {
    const npc = npcs[index];
    if (npc) out.npcs.push({ npc, dx, dy });
  };
  const beasts = (spots: readonly (readonly [number, number])[]): void => {
    (building.creatures ?? []).forEach((creature, index) => {
      const spot = spots[index % spots.length]!;
      out.creatures.push({ creature, dx: spot[0], dy: spot[1] });
    });
  };
  const { w, h } = building;
  switch (building.recipe) {
    case 'outpost':
      put('shelving', 1, 0, S); put('shelving', 2, 0, S); put('shelving', 3, 0, S);
      put('storage-locker', 6, 0, S); put('contract-board', 8, 0, S); put('notice-board', 10, 0, S); put('security-camera', 11, 0, S);
      put('counter', 1, 3); put('counter', 2, 3); put('counter', 3, 3);
      put(building.mail ?? 'market-mailbox', 9, 3);
      put('table', 10, 6); put('chair', 10, 5, S);
      person(0, 2, 2); person(1, 8, 5);
      out.anchors[building.anchor ?? 'outpost'] = { dx: 6, dy: 2 };
      break;
    case 'shop':
      put('shelving', 1, 0, S); put('shelving', 2, 0, S); put('shelving', 3, 0, S); put('shelving', 4, 0, S);
      put('notice-board', 6, 0, S); if (building.neon) put('neon-sign-cyan', 8, 0, S);
      put('vending-machine', 11, 0, S);
      put('counter', 1, 3); put('counter', 2, 3); put('counter', 3, 3);
      put('table', 9, 5); put('chair', 9, 4, S);
      person(0, 2, 2); person(1, 10, 3);
      break;
    case 'canteen':
      put('ward-cooker', 1, 0); put('shelving', 3, 0, S); if (building.neon) put('neon-sign', 6, 0, S);
      put('vending-machine', 11, 0, S);
      put('counter', 1, 3); put('counter', 2, 3); put('counter', 3, 3);
      put('table', 8, 3); put('chair', 8, 2, S); put('table', 10, 3); put('chair', 10, 2, S); put('table', 9, 6); put('chair', 9, 5, S);
      person(0, 2, 2); person(1, 7, 5);
      break;
    case 'workshop':
      put('ward-refinery', 1, 1); put('ward-fabricator', 4, 1); put('ward-synthesiser', 7, 1);
      put('shelving', 10, 0, S); put('shelving', 11, 0, S);
      put('table', 10, 5); put('chair', 10, 4, S);
      person(0, 2, 4); person(1, 8, 4);
      break;
    case 'clinic':
      put('bed', 1, 0); put('bed', 3, 0); put('bed', 5, 0); put('bed', 1, 5);
      put('shelving', 10, 0, S); put('shelving', 11, 0, S);
      put('lab-bench', 8, 3);
      person(0, 9, 4); person(1, 3, 3);
      break;
    case 'dormitory':
      for (const dx of [1, 3, 5, 7, 9, 11]) put('bed', dx, 0);
      put('bed', 1, 5); put('bed', 3, 5); put('bed', 9, 5); put('bed', 11, 5);
      put('storage-locker', 0, 3, 'east');
      person(0, 6, 3); person(1, 8, 3);
      beasts([[6, 3], [2, 3], [10, 3]]);
      break;
    case 'containment': {
      const cell = building.cell ?? 'containment-cell';
      put(cell, 1, 1); put(cell, 4, 1); put(cell, 7, 1);
      put('keycard-reader', 11, 0, S); put('security-camera', 0, 0, S);
      put('lab-bench', 10, 4);
      person(0, 9, 5); person(1, 2, 5);
      beasts([[2, 5], [9, 6], [3, 4]]);
      if (building.elite) out.elites.push({ creature: building.elite, dx: 6, dy: 4 });
      break;
    }
    case 'headhouse':
      put(building.lift ?? 'lift-door', 5, 0, S); put('notice-board', 2, 0, S); put('vending-machine', 8, 0, S); put('security-camera', 11, 0, S);
      put('street-bench', 2, 4, 'north');
      put('table', 9, 3); put('chair', 9, 2, S);
      person(0, 8, 5); person(1, 3, 6);
      beasts([[9, 6], [2, 6]]);
      out.anchors[building.anchor ?? 'lift-arrival'] = { dx: 5, dy: 2 };
      break;
    case 'lab':
      put('lab-bench', 2, 3); put('lab-bench', 3, 3); put('lab-bench', 4, 3); put('lab-bench', 5, 3);
      put('shelving', 9, 0, S); put('shelving', 10, 0, S); put('shelving', 11, 0, S);
      for (const [index, node] of (building.nodes ?? []).entries()) put(node, index === 0 ? 10 : 1, index === 0 ? 5 : 6);
      person(0, 7, 2); person(1, 3, 6);
      beasts([[8, 5], [2, 1]]);
      break;
    case 'office':
      put('shelving', 1, 0, S); put('shelving', 2, 0, S); put('notice-board', 6, 0, S); put('storage-locker', 9, 0, S); put('security-camera', 11, 0, S);
      put('table', 3, 3); put('table', 4, 3); put('chair', 3, 2, S); put('chair', 4, 2, S);
      if (building.lift) {
        out.late.push({ object: building.lift, dx: 7, dy: 0, facing: S, after: 4 });
        out.anchors[building.anchor ?? 'lift-arrival'] = { dx: 7, dy: 2 };
      }
      person(0, 8, 3); person(1, 2, 5);
      beasts([[9, 5], [2, 5]]);
      break;
    case 'home':
      put('bed', 1, 0); put('washer', 4, 0, S); put('shelving', 6, 0, S);
      put('table', 5, 3); put('chair', 5, 2, S);
      person(0, 2, 3);
      break;
    case 'hall':
      put('notice-board', 5, 0, S); put('table', 6, 1);
      for (const [dx, dy] of [[2, 4], [3, 4], [9, 4], [10, 4], [2, 6], [9, 6]] as const) put('street-bench', dx, dy, 'north');
      person(0, 6, 2); person(1, 4, 2);
      break;
    case 'yard': {
      const garden = building.theme === 'garden';
      if (!garden) { put('flood-mast', 1, 1); put('bollard', w - 2, h - 2); put('flood-mast', w - 2, 1); }
      put('barricade', Math.floor(w / 2) + 4, h - 3); put('barricade', 3, h - 3);
      if (garden) { put('allotment-bed', 2, 2); put('allotment-bed', w - 4, h - 2); put('reed-bed', Math.floor(w / 2), 2); }
      const spots: [number, number][] = [];
      for (let dy = 4; dy < h - 2; dy += 4) for (let dx = 5; dx < w - 4; dx += 6) spots.push([dx, dy]);
      beasts(spots);
      break;
    }
  }
  return out;
}
