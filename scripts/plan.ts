import { GAME_CONTENT } from '../packages/shared/src/index.ts';
import { asciiPlan, issuesFor } from '../packages/shared/src/world/planModel.ts';

const [districtId, room] = process.argv.slice(2);

if (!districtId || !GAME_CONTENT.districts.has(districtId)) {
  console.error(`Usage: npm run plan -- <district> [room]\nDistricts: ${[...GAME_CONTENT.districts.keys()].sort().join(', ')}`);
  process.exit(1);
}

const district = GAME_CONTENT.districts.get(districtId);
if (room !== undefined && !district?.rooms?.[room]) {
  console.error(`District "${districtId}" has no room "${room}". Rooms: ${Object.keys(district?.rooms ?? {}).join(', ')}`);
  process.exit(1);
}

console.log(asciiPlan(GAME_CONTENT, districtId, room));
const rect = room === undefined ? undefined : district?.rooms?.[room];
const issues = issuesFor(GAME_CONTENT, districtId).filter(
  (issue) => !rect || !issue.tile || (issue.tile.x >= rect.x && issue.tile.y >= rect.y && issue.tile.x < rect.x + rect.width && issue.tile.y < rect.y + rect.height),
);
console.log('');
if (issues.length === 0) console.log('no issues');
for (const issue of issues) console.log(issue.tile ? `! ${issue.tile.x},${issue.tile.y}  ${issue.message}` : `! ${issue.message}`);
