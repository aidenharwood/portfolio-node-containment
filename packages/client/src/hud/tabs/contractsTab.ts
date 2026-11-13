import { GAME_CONTENT, isContractComplete, type SelfState } from '@containment/shared';
import { h, replaceChildren } from '../../ui/dom.ts';
import { renderContractBoard } from '../contractBoardView.ts';
import type { PanelTab } from '../sidePanel.ts';

const COUNTDOWN_REFRESH_MS = 30_000;

export function createContractsTab(): PanelTab {
  const body = h('div', { className: 'contracts-body' });
  const element = h('div', { className: 'tab-contracts' },
    h('header', { className: 'tab-header' }, h('span', { className: 'tab-hint' }, 'Pick up and cash in contracts at the Contract Board in the Atrium Contract Hall.')),
    body,
  );
  let self: SelfState | null = null;
  let signalAttention: (() => void) | null = null;
  let readyBefore = 0;

  const render = () => {
    if (!self) return;
    replaceChildren(body, renderContractBoard(self, { onClaim: null, now: Date.now() }));
  };

  const timer = window.setInterval(render, COUNTDOWN_REFRESH_MS);

  return {
    id: 'contracts',
    label: 'Contracts',
    icon: 'contracts',
    element,
    update(current: SelfState) {
      self = current;
      const ready = [current.contracts.daily, current.contracts.weekly]
        .flatMap((board) => board?.entries ?? [])
        .filter((entry) => {
          const contract = GAME_CONTENT.contracts.get(entry.contractId);
          return !entry.claimed && contract !== undefined && isContractComplete(entry, contract);
        }).length;
      if (ready > readyBefore) signalAttention?.();
      readyBefore = ready;
      render();
    },
    bindAttention(signal) {
      signalAttention = signal;
    },
    dispose() {
      window.clearInterval(timer);
    },
  };
}
