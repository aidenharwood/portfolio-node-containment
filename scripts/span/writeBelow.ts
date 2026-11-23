import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DISTRICT_LAYOUT_SCHEMA } from '../../packages/shared/src/world/layoutSchema.ts';
import { printLayout } from '../../packages/shared/src/world/printLayout.ts';
import { registerFurnishingKit } from '../../packages/shared/src/content/furnishingKit.ts';
import { CITY_KIT } from '../../packages/shared/src/content/catalog/cityKit.ts';
import { LANDMARK_KIT } from '../../packages/shared/src/content/catalog/landmarks.ts';
import { SPAN_KIT } from '../../packages/shared/src/content/span/objects.ts';
import { WILD_KIT } from '../../packages/shared/src/content/span/wilds.ts';
import { BELOW } from './below.ts';
import { safeNodes } from './safeNodes.ts';
import { withQuestPlacements } from './extras/quests.ts';

registerFurnishingKit(CITY_KIT);
registerFurnishingKit(LANDMARK_KIT);
registerFurnishingKit(SPAN_KIT);
registerFurnishingKit(WILD_KIT);

const OUT = process.env.SPAN_LAYOUT_OUT ?? join(import.meta.dirname, '../../packages/shared/src/content/districts/layouts');
const only = new Set(process.argv.slice(2));
for (const source of BELOW) {
  if (only.size > 0 && !only.has(source.id)) continue;
  writeFileSync(join(OUT, source.id + '.json'), printLayout(withQuestPlacements(safeNodes(DISTRICT_LAYOUT_SCHEMA.parse(source)))));
  console.log('wrote ' + source.id);
}
