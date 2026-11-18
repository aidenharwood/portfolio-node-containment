import {
  addItem,
  countItem,
  CURRENCY_ITEM_ID,
  equippedStyleSkill,
  locate,
  levelForExperience,
  masteryFlag,
  SKILL_IDS,
  SKILL_LEVEL_CAP,
  removeItem,
  SKILL_INFO,
  skillGuide,
  skillUnlocksBetween,
  summariseUnlocks,
  type SkillId,
  type CraftingStation,
  type DistrictId,
  type EntityCue,
  type GameContent,
  type GameEffect,
  type MarketAccess,
  type NoticeTone,
  type QuestEvent,
  type QuestId,
  type TilePoint,
  type WorldLocation,
} from '@containment/shared';
import type { Player } from '../world/player.ts';

export interface EffectHost {
  startQuest(player: Player, questId: QuestId): void;
  raiseQuestEvent(player: Player, event: QuestEvent): void;
  teleport(player: Player, location: WorldLocation): void;
  notify(player: Player, tone: NoticeTone, text: string): void;
  openShop(player: Player, shopId: string, keeperInstanceId: string | null): void;
  dropToGround(owner: Player, itemId: string, quantity: number, position: TilePoint): void;
  openCrafting(player: Player, station: CraftingStation): void;
  openStorage(player: Player): void;
  openMarket(player: Player, access: MarketAccess): void;
  openContracts(player: Player): void;
  openTramMap(player: Player): void;
  discoverStation(player: Player, stationId: string): void;
  cue(player: Player, cue: EntityCue, instanceId?: string): void;
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
      case 'grantStyleExperience':
        return this.grantExperience(player, equippedStyleSkill(player.record.equipment, this.content.items), effect.amount);
      case 'startQuest':
        return this.host.startQuest(player, effect.questId);
      case 'emitSignal':
        return this.host.raiseQuestEvent(player, { type: 'signal', signal: effect.signal });
      case 'setFlag':
        player.addFlag(effect.flag);
        return;
      case 'notify':
        return this.host.notify(player, 'info', effect.text);
      case 'teleport':
        return this.teleport(player, effect.districtId, effect.position);
      case 'openShop':
        return this.host.openShop(player, effect.shopId, player.dialogue?.npcInstanceId ?? null);
      case 'openCrafting':
        return this.host.openCrafting(player, effect.station);
      case 'openStorage':
        return this.host.openStorage(player);
      case 'openMarket':
        return this.host.openMarket(player, effect.access ?? 'trade');
      case 'openContracts':
        return this.host.openContracts(player);
      case 'restoreIntegrity':
        return player.setIntegrity(player.maxIntegrity);
      case 'grantMasteryMantles':
        return this.grantMasteryMantles(player);
      case 'openTramMap':
        return this.host.openTramMap(player);
      case 'discoverStation':
        return this.host.discoverStation(player, effect.stationId);
    }
  }

  private teleport(player: Player, districtId: DistrictId, position: TilePoint): void {
    const location = locate(this.content, districtId, position);
    if (!location) {
      console.warn(`Teleport to unknown district "${districtId}".`);
      this.host.notify(player, 'warning', 'That route is not available.');
      return;
    }
    this.host.teleport(player, location);
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

  private grantMasteryMantles(player: Player): void {
    const claimable = SKILL_IDS.filter((skill) => levelForExperience(player.record.skills[skill]) >= SKILL_LEVEL_CAP && !player.hasFlag(masteryFlag(skill)));
    let claimed = 0;
    for (const skill of claimable) {
      const mantle = [...this.content.items.values()].find((item) => item.mastery === skill);
      if (!mantle) continue;
      player.addFlag(masteryFlag(skill));
      this.giveItem(player, mantle.id, 1);
      claimed++;
    }
    if (claimed === 0) this.host.notify(player, 'info', `No mastery to claim yet.${this.closestMastery(player)}`);
  }

  private closestMastery(player: Player): string {
    const open = SKILL_IDS.filter((skill) => !player.hasFlag(masteryFlag(skill)));
    if (open.length === 0) return '';
    const level = (skill: SkillId) => levelForExperience(player.record.skills[skill]);
    const best = open.reduce((top, skill) => (level(skill) > level(top) ? skill : top));
    return ` Closest: ${SKILL_INFO[best].name} ${level(best)}/${SKILL_LEVEL_CAP}.`;
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
      const unlocked = skillUnlocksBetween(skillGuide(this.content, skill), levelForExperience(before), newLevel);
      const suffix = unlocked.length > 0 ? ` Unlocked: ${summariseUnlocks(unlocked)}.` : '';
      this.host.notify(player, 'success', `${SKILL_INFO[skill].name} advanced to level ${newLevel}.${suffix}`);
      this.host.cue(player, 'levelUp');
      this.host.raiseQuestEvent(player, { type: 'standingChanged' });
    }
  }
}
