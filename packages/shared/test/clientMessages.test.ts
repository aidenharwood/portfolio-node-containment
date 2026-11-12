import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientMessageSchema } from '../src/protocol/clientMessages.ts';

test('walk targets beyond tile 1024 are well formed', () => {
  const parsed = clientMessageSchema.safeParse({ type: 'world.walk', target: { x: 1100, y: 2048 } });
  assert.equal(parsed.success, true);
});

test('walk targets with negative or fractional tiles are rejected', () => {
  assert.equal(clientMessageSchema.safeParse({ type: 'world.walk', target: { x: -1, y: 0 } }).success, false);
  assert.equal(clientMessageSchema.safeParse({ type: 'world.walk', target: { x: 1.5, y: 0 } }).success, false);
});
