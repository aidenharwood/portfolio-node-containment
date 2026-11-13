import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GAME_CONTENT } from '../packages/shared/src/index.ts';
import { parseLayout } from '../packages/shared/src/world/layout.ts';

const LAYOUTS = new URL('../packages/shared/src/content/districts/layouts/', import.meta.url);
const OUTPUT = new URL('../packages/shared/test/fixtures/worldBaseline.json', import.meta.url);

const kept = (ids: readonly string[]): string[] => ids.filter((id) => !id.startsWith('furn-')).sort();

const baseline: Record<string, unknown> = {};
for (const name of readdirSync(LAYOUTS).filter((file) => file.endsWith('.json')).sort()) {
  const layout = parseLayout(JSON.parse(readFileSync(new URL(name, LAYOUTS), 'utf8')));
  baseline[layout.id] = {
    areas: layout.areas.map((area) => ('id' in area ? area.id : area.room)).sort(),
    anchors: Object.keys(layout.anchors).sort(),
    npcs: layout.npcs.map((npc) => npc.id).sort(),
    objects: kept(layout.objects.map((object) => object.id)),
    assemblies: kept(layout.assemblies.map((assembly) => assembly.id)),
    creatures: layout.creatures.length,
    nodes: layout.objects.filter((object) => GAME_CONTENT.worldObjects.get(object.object)?.interactions.some((interaction) => interaction.gather !== undefined)).length,
    landmarks: [...(layout.furnish.landmarks ?? [])].sort(),
  };
}

writeFileSync(OUTPUT, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`wrote ${Object.keys(baseline).length} districts to ${OUTPUT.pathname}`);
