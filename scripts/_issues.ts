import { GAME_CONTENT, findWorldDesignIssues, findTerminalIssues, findTramIssues } from '../packages/shared/src/index.ts';
import { findContentIssues } from '../packages/shared/src/content/contentIntegrity.ts';
const all = findContentIssues(GAME_CONTENT);
console.log('content issues', all.length);
for (const i of all.slice(0, 60)) console.log(' -', i);
console.log('terminal', findTerminalIssues(GAME_CONTENT));
console.log('tram', findTramIssues(GAME_CONTENT));
