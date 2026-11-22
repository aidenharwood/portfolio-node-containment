import { findContentIssues, GAME_CONTENT } from '../../packages/shared/src/index.ts';
const issues = findContentIssues(GAME_CONTENT);
const groups = new Map<string, string[]>();
for (const issue of issues) {
  const key = issue.replace(/[0-9]+/g, '#').replace(/"[^"]*"/g, '"_"').slice(0, 90);
  groups.set(key, [...(groups.get(key) ?? []), issue]);
}
console.log('issues', issues.length);
for (const [key, list] of [...groups].sort((a, b) => b[1].length - a[1].length)) console.log(list.length + ' × ' + list[0]);
