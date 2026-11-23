import type { DistrictLayout } from '../../packages/shared/src/world/layoutSchema.ts';
import type { LandMap } from '../../packages/shared/src/world/landPlan.ts';
import { buildDistrict } from '../../packages/shared/src/world/layout.ts';
import { WARD_SPOTS } from '../../packages/shared/src/content/catalog/nodes.ts';
import { CITY_KIT_OBJECTS } from '../../packages/shared/src/content/catalog/cityKit.ts';
import { SPAN_CREATURES } from '../../packages/shared/src/content/span/creatures.ts';

const NODE_LEVEL = new Map<string, number>([...WARD_SPOTS, ...CITY_KIT_OBJECTS].flatMap((object) => object.interactions.flatMap((interaction) => (interaction.gather ? [[object.id, interaction.gather.level] as const] : []))));
const CREATURE = new Map(SPAN_CREATURES.map((creature) => [creature.id, creature]));

export function safeNodes(layout: DistrictLayout, land?: LandMap): DistrictLayout {
  const district = buildDistrict(layout, land, {});
  const unsafe = new Set<string>();
  for (const object of district.objects) {
    const level = NODE_LEVEL.get(object.objectId);
    if (level === undefined) continue;
    for (const placement of district.creatures ?? []) {
      const creature = CREATURE.get(placement.creatureId);
      if (!creature?.aggressive || creature.level <= level + 5) continue;
      const reach = creature.aggroRadius + creature.attack.range + creature.wanderRadius + 2;
      if (Math.max(Math.abs(object.position.x - placement.position.x), Math.abs(object.position.y - placement.position.y)) <= reach) unsafe.add(object.instanceId);
    }
  }
  return { ...layout, objects: layout.objects.filter((object) => !unsafe.has(object.id)) };
}
