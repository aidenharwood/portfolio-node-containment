import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gridFit } from '../src/hud/fitLayout.ts';
import { inventoryColumns } from '../src/hud/tabs/inventoryLayout.ts';
import { skillLayout } from '../src/hud/tabs/skillsLayout.ts';

test('a grid fit reports the rows a count needs and the cell size each axis allows', () => {
  const fit = gridFit({ width: 226, height: 300 }, 28, 4, 4, 64);
  assert.equal(fit.rows, 7);
  assert.equal(fit.cellWidth, 53.5);
  assert.equal(fit.cellHeight, (300 - 24) / 7);
});

test('the inventory goes wide when the panel is short and tall when it is narrow', () => {
  assert.equal(inventoryColumns({ width: 226, height: 300 }), 4);
  assert.equal(inventoryColumns({ width: 337, height: 369 }), 7);
  assert.equal(inventoryColumns({ width: 358, height: 140 }), 7);
});

test('skills keep their names when there is room and shrink to fit when there is not', () => {
  assert.deepEqual(skillLayout({ width: 226, height: 300 }), { columns: 3, rows: 4, mode: 'full' });
  assert.deepEqual(skillLayout({ width: 358, height: 140 }), { columns: 5, rows: 2, mode: 'full' });
  assert.equal(skillLayout({ width: 226, height: 146 }).mode, 'tiny');
  for (const space of [{ width: 226, height: 146 }, { width: 160, height: 100 }, { width: 400, height: 80 }]) {
    const layout = skillLayout(space);
    assert.ok(layout.columns * layout.rows >= 10, `${JSON.stringify(space)} holds every skill`);
  }
});
