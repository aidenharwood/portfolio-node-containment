import type { CharacterId } from '../ids.ts';
import type { QuestEvent } from '../quests/questProgress.ts';
import { failure, success, type Result } from '../result.ts';
import {
  CONTRACT_CADENCES,
  CONTRACTS_OFFERED,
  contractProgressFrom,
  type ContractCadence,
  type ContractDefinition,
  type ContractId,
} from './contract.ts';
import { contractPeriod, rollContracts, seedFrom } from './contractSchedule.ts';

export interface ContractEntry {
  readonly contractId: ContractId;
  readonly progress: number;
  readonly claimed: boolean;
}

export interface ContractBoard {
  readonly period: number;
  readonly entries: readonly ContractEntry[];
}

export interface ContractLedger {
  readonly daily: ContractBoard | null;
  readonly weekly: ContractBoard | null;
  readonly claimedTotal: number;
}

export type ContractCatalog = ReadonlyMap<ContractId, ContractDefinition>;

export const SWEEP_BONUS_COMMENDATIONS: Readonly<Record<ContractCadence, number>> = { daily: 2, weekly: 6 };

export const emptyContractLedger = (): ContractLedger => ({ daily: null, weekly: null, claimedTotal: 0 });

export const isContractComplete = (entry: ContractEntry, contract: ContractDefinition): boolean => entry.progress >= contract.objective.count;

export interface LedgerRefresh {
  readonly ledger: ContractLedger;
  readonly rolled: readonly ContractCadence[];
}

export function refreshContractLedger(
  ledger: ContractLedger,
  catalog: ContractCatalog,
  characterId: CharacterId,
  now: number,
  isEligible: (contract: ContractDefinition) => boolean,
): LedgerRefresh {
  let next = ledger;
  const rolled: ContractCadence[] = [];
  for (const cadence of CONTRACT_CADENCES) {
    const period = contractPeriod(cadence, now);
    const board = ledger[cadence];
    if (board && board.period === period && board.entries.length > 0) continue;
    const eligible = [...catalog.values()].filter((contract) => contract.cadence === cadence && isEligible(contract));
    const offered = rollContracts(eligible, CONTRACTS_OFFERED[cadence], seedFrom(`${characterId}:${cadence}:${period}`));
    if (board && board.period === period && offered.length === 0) continue;
    next = { ...next, [cadence]: { period, entries: offered.map((contract) => ({ contractId: contract.id, progress: 0, claimed: false })) } };
    if (offered.length > 0) rolled.push(cadence);
  }
  return { ledger: next, rolled };
}

export interface ContractAdvance {
  readonly ledger: ContractLedger;
  readonly progressed: readonly { readonly contract: ContractDefinition; readonly progress: number }[];
}

export function advanceContracts(ledger: ContractLedger, catalog: ContractCatalog, event: QuestEvent): ContractAdvance {
  const progressed: { contract: ContractDefinition; progress: number }[] = [];
  let next = ledger;
  for (const cadence of CONTRACT_CADENCES) {
    const board = ledger[cadence];
    if (!board) continue;
    let changed = false;
    const entries = board.entries.map((entry) => {
      const contract = catalog.get(entry.contractId);
      if (!contract || entry.claimed || isContractComplete(entry, contract)) return entry;
      const gained = contractProgressFrom(contract.objective, event);
      if (gained <= 0) return entry;
      changed = true;
      const progress = Math.min(contract.objective.count, entry.progress + gained);
      progressed.push({ contract, progress });
      return { ...entry, progress };
    });
    if (changed) next = { ...next, [cadence]: { ...board, entries } };
  }
  return { ledger: next, progressed };
}

export interface ContractClaim {
  readonly ledger: ContractLedger;
  readonly contract: ContractDefinition;
  readonly sweptBoard: boolean;
}

export function claimContract(
  ledger: ContractLedger,
  catalog: ContractCatalog,
  cadence: ContractCadence,
  contractId: ContractId,
): Result<ContractClaim> {
  const board = ledger[cadence];
  const entry = board?.entries.find((candidate) => candidate.contractId === contractId);
  const contract = catalog.get(contractId);
  if (!board || !entry || !contract) return failure('That contract is not on your board.');
  if (entry.claimed) return failure('You have already been paid for that contract.');
  if (!isContractComplete(entry, contract)) return failure(`${contract.name} is not finished yet.`);
  const entries = board.entries.map((candidate) => (candidate === entry ? { ...candidate, claimed: true } : candidate));
  return success({
    ledger: { ...ledger, [cadence]: { ...board, entries }, claimedTotal: ledger.claimedTotal + 1 },
    contract,
    sweptBoard: entries.every((candidate) => candidate.claimed),
  });
}
