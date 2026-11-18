import { GAME_CONTENT } from '../packages/shared/src/index.ts';
const [id, axisText, y0, y1] = process.argv.slice(2);
const d = GAME_CONTENT.districts.get(id!)!;
const axis = Number(axisText);
const bad: string[] = [];
for (let y = Number(y0); y <= Number(y1); y++) {
  const row = d.map[y]!;
  for (let x = 0; x < row.length; x++) {
    const mx = Math.round(2 * axis - x);
    if (mx < 0 || mx >= row.length) continue;
    if (row[x] !== row[mx]) bad.push(`${x},${y}:${row[x]}/${row[mx]}`);
  }
}
console.log(id, 'asymmetric tiles', bad.length, bad.slice(0, 10).join(' '));
