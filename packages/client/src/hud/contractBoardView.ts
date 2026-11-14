import {
  COMMENDATION_ITEM_ID,
  CONTRACT_CADENCES,
  contractPeriod,
  contractPeriodEndsAt,
  countItem,
  GAME_CONTENT,
  isContractComplete,
  SWEEP_BONUS_COMMENDATIONS,
  type ContractCadence,
  type ContractDefinition,
  type ContractEntry,
  type SelfState,
} from '@containment/shared';
import { h } from '../ui/dom.ts';

const CADENCE_TITLE: Readonly<Record<ContractCadence, string>> = { daily: 'Daily contracts', weekly: 'Weekly contracts' };

export interface ContractBoardOptions {
  readonly onClaim: ((cadence: ContractCadence, contract: ContractDefinition) => void) | null;
  readonly now: number;
}

export function formatCountdown(milliseconds: number): string {
  const minutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${rest}m`;
  return `${rest}m`;
}

function objectiveTargets(contract: ContractDefinition): string {
  const objective = contract.objective;
  const names = objective.type === 'defeat' || objective.type === 'contain'
    ? objective.creatureIds.map((id) => GAME_CONTENT.creatures.get(id)?.name ?? id)
    : objective.itemIds.map((id) => GAME_CONTENT.items.get(id)?.name ?? id);
  const verb = { defeat: 'Defeat', contain: 'Contain', gather: 'Gather', craft: 'Craft' }[objective.type];
  const listed = names.length > 3 ? `${names.slice(0, 3).join(', ')} or similar` : names.join(' or ');
  return `${verb} ${objective.count} × ${listed}`;
}

function entryCard(cadence: ContractCadence, entry: ContractEntry, options: ContractBoardOptions): HTMLElement | null {
  const contract = GAME_CONTENT.contracts.get(entry.contractId);
  if (!contract) return null;
  const complete = isContractComplete(entry, contract);
  const share = Math.round((entry.progress / contract.objective.count) * 100);
  const state = entry.claimed ? 'claimed' : complete ? 'complete' : 'active';
  const onClaim = options.onClaim;
  return h('li', { className: `contract-card ${state}` },
    h('div', { className: 'contract-head' },
      h('span', { className: 'contract-name' }, contract.name),
      h('span', { className: 'contract-tier' }, `Tier ${contract.tier}`),
    ),
    h('p', { className: 'contract-brief' }, contract.brief),
    h('p', { className: 'contract-objective' }, objectiveTargets(contract)),
    h('div', { className: 'contract-progress', role: 'progressbar', ariaValueNow: String(entry.progress), ariaValueMax: String(contract.objective.count) },
      h('span', { style: { width: `${share}%` } }),
      h('em', {}, `${entry.progress} / ${contract.objective.count}`),
    ),
    h('p', { className: 'contract-reward' }, contract.rewardSummary),
    entry.claimed
      ? h('p', { className: 'contract-status' }, 'Paid')
      : onClaim
        ? h('button', { className: 'button small', type: 'button', disabled: !complete, onclick: () => onClaim(cadence, contract) }, complete ? 'Collect pay' : 'In progress')
        : complete && h('p', { className: 'contract-status' }, 'Ready: collect at the Contract Board'),
  );
}

export function renderContractBoard(self: SelfState, options: ContractBoardOptions): HTMLElement {
  const commendations = countItem(self.inventory, COMMENDATION_ITEM_ID);
  return h('div', { className: 'contract-board' },
    h('p', { className: 'contract-summary' },
      'Commendations ', h('strong', {}, commendations.toLocaleString()),
      ` · ${self.contracts.claimedTotal} contracts completed`),
    ...CONTRACT_CADENCES.map((cadence) => {
      const board = self.contracts[cadence];
      const current = board && board.period === contractPeriod(cadence, options.now) ? board : null;
      const resetsAt = contractPeriodEndsAt(cadence, contractPeriod(cadence, options.now));
      const unpaid = current?.entries.filter((entry) => !entry.claimed).length ?? 0;
      return h('section', { className: 'contract-section' },
        h('header', { className: 'contract-section-head' },
          h('h4', { className: 'subheading' }, CADENCE_TITLE[cadence]),
          h('span', { className: 'tab-hint' }, `New board in ${formatCountdown(resetsAt - options.now)}`),
        ),
        current && current.entries.length > 0
          ? h('ul', { className: 'contract-list' }, ...current.entries.map((entry) => entryCard(cadence, entry, options)))
          : h('p', { className: 'tab-hint' }, current ? 'No contracts match your standing yet.' : 'Visit a Contract Board to pick up this board.'),
        current && current.entries.length > 0 && h('p', { className: 'tab-hint' },
          unpaid === 0 ? 'Board cleared. Bonus paid.' : `Clear the whole board for ${SWEEP_BONUS_COMMENDATIONS[cadence]} bonus commendations.`),
      );
    }),
  );
}
