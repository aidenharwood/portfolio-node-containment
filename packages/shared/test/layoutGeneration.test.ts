import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOT = join(import.meta.dirname, '../../..');
const LAYOUTS = join(ROOT, 'packages/shared/src/content/districts/layouts');

function generate(script: string): { dir: string; files: string[] } {
  const dir = mkdtempSync(join(tmpdir(), 'span-layouts-'));
  execFileSync(process.execPath, ['--no-warnings=ExperimentalWarning', join(ROOT, 'scripts/span', script)], { cwd: ROOT, env: { ...process.env, SPAN_LAYOUT_OUT: dir }, stdio: 'pipe' });
  return { dir, files: readdirSync(dir).sort() };
}

function differing(dir: string, files: readonly string[]): string[] {
  return files.filter((name) => !readFileSync(join(dir, name)).equals(readFileSync(join(LAYOUTS, name))));
}

test('cutSquares regenerates every committed layout and the index byte for byte', { timeout: 300_000 }, () => {
  const { dir, files } = generate('cutSquares.ts');
  try {
    const committed = readdirSync(LAYOUTS).filter((name) => name.endsWith('.json') || name === 'index.ts').sort();
    assert.deepEqual(files, committed);
    assert.deepEqual(differing(dir, files), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeBelow regenerates every committed facility level byte for byte', { timeout: 120_000 }, () => {
  const { dir, files } = generate('writeBelow.ts');
  try {
    assert.ok(files.length > 0);
    assert.deepEqual(differing(dir, files), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
