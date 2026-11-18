import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseLayout } from '../packages/shared/src/world/layout.ts';
import { printLayout } from '../packages/shared/src/world/printLayout.ts';
const dir = new URL('../packages/shared/src/content/districts/layouts/', import.meta.url);
for (const name of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
  const url = new URL(name, dir);
  writeFileSync(url, printLayout(parseLayout(JSON.parse(readFileSync(url, 'utf8')))));
}
