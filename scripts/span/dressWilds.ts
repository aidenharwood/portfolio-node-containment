import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import landSource from '../../packages/shared/src/content/land/the-span.json' with { type: 'json' };
import { drawLand } from '../../packages/shared/src/world/landPlan.ts';
import { parseLandPlan } from '../../packages/shared/src/world/landSchema.ts';
import { DISTRICT_LAYOUT_SCHEMA } from '../../packages/shared/src/world/layoutSchema.ts';
import { printLayout } from '../../packages/shared/src/world/printLayout.ts';
import { buildDistrict } from '../../packages/shared/src/world/layout.ts';
import { registerFurnishingKit } from '../../packages/shared/src/content/furnishingKit.ts';
import { CITY_KIT } from '../../packages/shared/src/content/catalog/cityKit.ts';
import { LANDMARK_KIT } from '../../packages/shared/src/content/catalog/landmarks.ts';
import { TRANSIT_KIT } from '../../packages/shared/src/content/catalog/transit.ts';
import { SPAN_KIT } from '../../packages/shared/src/content/span/objects.ts';
import { WILD_KIT } from '../../packages/shared/src/content/span/wilds.ts';
import { dressWild, isDressed, WILD_POIS } from './wilds.ts';
import { knowSquares } from './megastructures.ts';
import { LAYOUT_SOURCES } from '../../packages/shared/src/content/districts/layouts/index.ts';

registerFurnishingKit(CITY_KIT);
registerFurnishingKit(LANDMARK_KIT);
registerFurnishingKit(TRANSIT_KIT);
registerFurnishingKit(SPAN_KIT);
registerFurnishingKit(WILD_KIT);

knowSquares(Object.entries(LAYOUT_SOURCES).flatMap(([id, source]) => {
  const square = (source as { square?: { column: number; row: number } }).square;
  return square ? [[id, square] as const] : [];
}));

const OUT = join(import.meta.dirname, '../../packages/shared/src/content/districts/layouts');
const land = drawLand(parseLandPlan(landSource));
const only = new Set(process.argv.slice(2));
let dressed = 0;
const failed: string[] = [];
for (const id of Object.keys(WILD_POIS)) {
  if (only.size > 0 && !only.has(id)) continue;
  const path = join(OUT, id + '.json');
  const layout = DISTRICT_LAYOUT_SCHEMA.parse(JSON.parse(readFileSync(path, 'utf8')));
  if (isDressed(layout)) continue;
  try {
    const next = dressWild(layout, land);
    buildDistrict(next, land, {});
    writeFileSync(path, printLayout(next));
    dressed++;
  } catch (error) {
    failed.push((error as Error).message);
  }
}
console.log('dressed ' + dressed + ' wild squares');
for (const reason of failed) console.log('failed: ' + reason);
if (failed.length > 0) process.exitCode = 1;
