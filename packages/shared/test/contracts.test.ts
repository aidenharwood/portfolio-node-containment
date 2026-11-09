import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  advanceContracts,
  claimContract,
  contractPeriod,
  contractPeriodEndsAt,
  CONTRACTS_OFFERED,
  DAY_MS,
  emptyContractLedger,
  findContractIssues,
  GAME_CONTENT,
  refreshContractLedger,
  rollContracts,
  type ContractDefinition,
  type ContractLedger,
} from '../src/index.ts';

const MONDAY_NOON = Date.UTC(2026, 10, 9, 12);
const catalog = GAME_CONTENT.contracts;
const tierOne = (contract: ContractDefinition) => contract.tier === 1;

describe('contract schedule', () => {
  test('daily boards turn over at midnight UTC and weekly ones on Monday', () => {
    const today = contractPeriod('daily', MONDAY_NOON);
    assert.equal(contractPeriodEndsAt('daily', today), Date.UTC(2026, 10, 10));
    const week = contractPeriod('weekly', MONDAY_NOON);
    assert.equal(contractPeriodEndsAt('weekly', week), Date.UTC(2026, 10, 16));
    assert.equal(contractPeriod('weekly', Date.UTC(2026, 10, 9)), week);
    assert.equal(contractPeriod('weekly', Date.UTC(2026, 10, 8, 23, 59)), week - 1);
  });

  test('rolls are deterministic and favour the highest eligible tiers', () => {
    const pool = [...catalog.values()].filter((contract) => contract.cadence === 'daily');
    assert.deepEqual(rollContracts(pool, 3, 42), rollContracts(pool, 3, 42));
    const topTier = Math.max(...pool.map((contract) => contract.tier));
    for (const contract of rollContracts(pool, 3, 7)) assert.ok(contract.tier >= topTier - 2);
  });
});

describe('contract ledger', () => {
  test('rolls a full board per cadence and keeps it for the rest of the period', () => {
    const first = refreshContractLedger(emptyContractLedger(), catalog, 'character-1', MONDAY_NOON, tierOne);
    assert.deepEqual(first.rolled, ['daily', 'weekly']);
    assert.equal(first.ledger.daily?.entries.length, CONTRACTS_OFFERED.daily);
    assert.equal(first.ledger.weekly?.entries.length, CONTRACTS_OFFERED.weekly);
    const later = refreshContractLedger(first.ledger, catalog, 'character-1', MONDAY_NOON + 6 * 3_600_000, tierOne);
    assert.equal(later.ledger, first.ledger);
    const tomorrow = refreshContractLedger(first.ledger, catalog, 'character-1', MONDAY_NOON + DAY_MS, tierOne);
    assert.deepEqual(tomorrow.rolled, ['daily']);
    assert.equal(tomorrow.ledger.weekly, first.ledger.weekly);
  });

  test('a trainee with nothing eligible gets an empty board and no announcement', () => {
    const refreshed = refreshContractLedger(emptyContractLedger(), catalog, 'character-1', MONDAY_NOON, () => false);
    assert.deepEqual(refreshed.rolled, []);
    assert.deepEqual(refreshed.ledger.daily?.entries, []);
    const graduated = refreshContractLedger(refreshed.ledger, catalog, 'character-1', MONDAY_NOON + 60_000, tierOne);
    assert.deepEqual(graduated.rolled, ['daily', 'weekly']);
  });

  test('counts matching events, caps at the target and pays out once', () => {
    const contract = catalog.get('daily:yard-sweep')!;
    const ledger: ContractLedger = { ...emptyContractLedger(), daily: { period: 1, entries: [{ contractId: contract.id, progress: 0, claimed: false }] } };
    assert.equal(claimContract(ledger, catalog, 'daily', contract.id).ok, false);
    let current = ledger;
    for (let kill = 0; kill < contract.objective.count + 2; kill++) {
      current = advanceContracts(current, catalog, { type: 'defeated', creatureId: 'scrap-drone' }).ledger;
    }
    assert.equal(advanceContracts(current, catalog, { type: 'defeated', creatureId: 'gloam-mite' }).progressed.length, 0);
    assert.equal(current.daily?.entries[0]?.progress, contract.objective.count);
    const claimed = claimContract(current, catalog, 'daily', contract.id);
    assert.ok(claimed.ok);
    assert.equal(claimed.value.sweptBoard, true);
    assert.equal(claimed.value.ledger.claimedTotal, 1);
    assert.equal(claimContract(claimed.value.ledger, catalog, 'daily', contract.id).ok, false);
  });

  test('every contract references real, reachable content', () => {
    assert.deepEqual(findContractIssues(GAME_CONTENT), []);
  });
});
