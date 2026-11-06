import {
  addItem,
  levelForExperience,
  removeItem,
  SKILL_INFO,
  type SkillId,
  type CraftingStation,
  type GameContent,
  type GameEffect,
  type NoticeTone,
  type QuestEvent,
  type QuestId,
  type TilePoint,
  type ZoneLocation,
} from '@containment/shared';
import type { Player } from '../world/player.ts';

export interface EffectHost {
  startQuest(player: Player, questId: QuestId): void;
  raiseQuestEvent(player: Player, event: QuestEvent): void;
  teleport(player: Player, location: ZoneLocation): void;
  notify(player: Player, tone: NoticeTone, text: string): void;
  openShop(player: Player, shopId: string, keeperInstanceId: string | null): void;
  dropToGround(owner: Player, itemId: string, quantity: number, position: TilePoint): void;
  openCrafting(player: Player, station: CraftingStation): void;
  openStorage(player: Player): void;
}

export class EffectRunner {
  private readonly content: GameContent;
  private readonly host: EffectHost;

  constructor(content: GameContent, host: EffectHost) {
    this.content = content;
    this.host = host;
  }

  apply(player: Player, effects: readonly GameEffect[]): void {
    for (const effect of effects) this.applyOne(player, effect);
  }

  private applyOne(player: Player, effect: GameEffect): void {
    switch (effect.type) {
      case 'giveItem':
        return this.giveItem(player, effect.itemId, effect.count ?? 1);
      case 'takeItem':
        return this.takeItem(player, effect.itemId, effect.count ?? 1);
      case 'grantExperience':
        return this.grantExperience(player, effect.skill, effect.amount);
      case 'startQuest':
        return this.host.startQuest(player, effect.questId);
      case 'emitSignal':
        return this.host.raiseQuestEvent(player, { type: 'signal', signal: effect.signal });
      case 'setFlag':
        if (!player.hasFlag(effect.flag)) player.update({ flags: [...player.record.flags, effect.flag] });
        return;
      case 'notify':
        return this.host.notify(player, 'info', effect.text);
      case 'teleport':
        return this.host.teleport(player, { zoneId: effect.zoneId, position: effect.position });
      case 'openShop':
        return this.host.openShop(player, effect.shopId, player.dialogue?.npcInstanceId ?? null);
      case 'openCrafting':
        return this.host.openCrafting(player, effect.station);
      case 'openStorage':
        return this.host.openStorage(player);
    }
  }

  private giveItem(player: Player, itemId: string, count: number): void {
    const outcome = addItem(player.record.inventory, this.content.items, itemId, count);
    player.update({ inventory: outcome.inventory });
    if (outcome.overflow > 0) {
      const name = this.content.items.get(itemId)?.name ?? itemId;
      this.host.dropToGround(player, itemId, outcome.overflow, player.position);
      this.host.notify(player, 'warning', `Your inventory is full. ${outcome.overflow} × ${name} falls to the floor.`);
    }
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }

  private takeItem(player: Player, itemId: string, count: number): void {
    const outcome = removeItem(player.record.inventory, itemId, count);
    if (!outcome.ok) return;
    player.update({ inventory: outcome.value });
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });
  }

  private grantExperience(player: Player, skill: SkillId, amount: number): void {
    this.awardExperience(player, skill, amount, true);
  }

  awardExperience(player: Player, skill: SkillId, amount: number, announce: boolean): void {
    const before = player.record.skills[skill];
    const after = before + Math.max(0, Math.floor(amount));
    if (after === before) return;
    player.update({ skills: { ...player.record.skills, [skill]: after } });
    if (announce) player.send({ type: 'chat.message', channel: 'system', text: `+${amount} ${SKILL_INFO[skill].name} XP` });
    const newLevel = levelForExperience(after);
    if (newLevel > levelForExperience(before)) {
      this.host.notify(player, 'success', `${SKILL_INFO[skill].name} advanced to level ${newLevel}.`);
    }
  }
}
