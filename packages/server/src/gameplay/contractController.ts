import {
  advanceContracts,
  areConditionsMet,
  claimContract,
  COMMENDATION_ITEM_ID,
  refreshContractLedger,
  SWEEP_BONUS_COMMENDATIONS,
  type ContractCadence,
  type ContractId,
  type GameContent,
  type NoticeTone,
  type QuestEvent,
} from '@containment/shared';
import type { Player } from '../world/player.ts';
import { conditionContextFor } from './playerContext.ts';
import type { EffectRunner } from './effectRunner.ts';

const CADENCE_LABEL: Readonly<Record<ContractCadence, string>> = { daily: 'daily', weekly: 'weekly' };

export interface ContractHost {
  notify(player: Player, tone: NoticeTone, text: string): void;
}

export class ContractController {
  private readonly content: GameContent;
  private readonly effects: EffectRunner;
  private readonly host: ContractHost;
  private readonly now: () => number;

  constructor(content: GameContent, effects: EffectRunner, host: ContractHost, now: () => number) {
    this.content = content;
    this.effects = effects;
    this.host = host;
    this.now = now;
  }

  refresh(player: Player, announce: boolean): void {
    const context = conditionContextFor(player, this.content);
    const { ledger, rolled } = refreshContractLedger(player.record.contracts, this.content.contracts, player.record.id, this.now(), (contract) =>
      areConditionsMet(contract.requires, context),
    );
    if (ledger === player.record.contracts) return;
    player.update({ contracts: ledger });
    if (announce && rolled.length > 0) {
      this.host.notify(player, 'info', `New ${rolled.map((cadence) => CADENCE_LABEL[cadence]).join(' and ')} contracts are up on the Contract Board in the Atrium Contract Hall.`);
    }
  }

  open(player: Player): void {
    this.refresh(player, false);
    player.contractsOpen = true;
    player.send({ type: 'contracts.opened' });
  }

  close(player: Player): void {
    if (!player.contractsOpen) return;
    player.contractsOpen = false;
    player.send({ type: 'contracts.closed' });
  }

  handle(player: Player, event: QuestEvent): void {
    if (event.type !== 'defeated' && event.type !== 'contained' && event.type !== 'gathered' && event.type !== 'crafted') return;
    const { ledger, progressed } = advanceContracts(player.record.contracts, this.content.contracts, event);
    if (progressed.length === 0) return;
    player.update({ contracts: ledger });
    for (const { contract, progress } of progressed) {
      const done = progress >= contract.objective.count;
      player.send({
        type: 'chat.message',
        channel: 'quest',
        text: done ? `Contract complete: ${contract.name}. Collect your pay at the Contract Board.` : `Contract ${contract.name}: ${progress}/${contract.objective.count}`,
      });
    }
  }

  claim(player: Player, cadence: ContractCadence, contractId: ContractId): void {
    if (!player.contractsOpen) return;
    this.refresh(player, false);
    const claimed = claimContract(player.record.contracts, this.content.contracts, cadence, contractId);
    if (!claimed.ok) {
      this.host.notify(player, 'warning', claimed.error);
      return;
    }
    const { contract, sweptBoard } = claimed.value;
    player.update({ contracts: claimed.value.ledger });
    this.effects.apply(player, contract.rewards);
    this.host.notify(player, 'success', `${contract.name} paid out: ${contract.rewardSummary}.`);
    if (sweptBoard) {
      const bonus = SWEEP_BONUS_COMMENDATIONS[cadence];
      this.effects.apply(player, [{ type: 'giveItem', itemId: COMMENDATION_ITEM_ID, count: bonus }]);
      this.host.notify(player, 'success', `Every ${CADENCE_LABEL[cadence]} contract cleared. The Directorate adds ${bonus} bonus commendations.`);
    }
  }
}
