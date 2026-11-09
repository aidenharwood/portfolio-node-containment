import type { GameConnection } from '../net/gameConnection.ts';
import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { renderContractBoard } from './contractBoardView.ts';
import { preserveScroll } from './quantityActions.ts';

export class ContractBoardWindow {
  readonly element = h('section', { className: 'contract-window panel', hidden: true, role: 'dialog', ariaLabel: 'Contract Board' });
  private readonly connection: GameConnection;
  private readonly world: WorldState;
  private open = false;
  private readonly unsubscribers: (() => void)[];

  constructor(connection: GameConnection, world: WorldState) {
    this.connection = connection;
    this.world = world;
    this.unsubscribers = [
      connection.on('contracts.opened', () => this.show()),
      connection.on('contracts.closed', () => this.hide()),
      world.on('selfChanged', () => this.render()),
    ];
  }

  get isOpen(): boolean {
    return this.open;
  }

  requestClose(): void {
    if (this.open) this.connection.send({ type: 'contracts.close' });
    this.hide();
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  private show(): void {
    this.open = true;
    this.element.hidden = false;
    this.render();
  }

  private hide(): void {
    this.open = false;
    this.element.hidden = true;
  }

  private render(): void {
    const self = this.world.self;
    if (!this.open || !self) return;
    preserveScroll(this.element, ['.contract-window-body'], () => replaceChildren(
      this.element,
      h('header', { className: 'shop-header' },
        h('div', {},
          h('h3', {}, 'Contract Board'),
          h('p', { className: 'shop-greeting' }, 'Fresh daily work every midnight, Site time. The big jobs go up on Mondays. Spend commendations here too.'),
        ),
        h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close contract board', onclick: () => this.requestClose() }, '×'),
      ),
      h('div', { className: 'contract-window-body' },
        renderContractBoard(self, {
          now: Date.now(),
          onClaim: (cadence, contract) => this.connection.send({ type: 'contracts.claim', cadence, contractId: contract.id }),
        }),
      ),
    ));
  }
}
