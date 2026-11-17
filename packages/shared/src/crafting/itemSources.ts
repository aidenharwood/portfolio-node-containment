import type { SkillId } from '../character/skills.ts';
import { containmentLevelFor } from '../combat/containment.ts';
import type { CreatureId } from '../combat/creatures.ts';
import { COMMENDATION_ITEM_ID } from '../contracts/contract.ts';
import type { GameContent } from '../content/gameContent.ts';
import { CURRENCY_ITEM_ID, type ShopId } from '../economy/shop.ts';
import type { DistrictId, ItemId, LevelId, NpcId, QuestId, WorldObjectId } from '../ids.ts';
import { dialogueEffects } from '../dialogue/dialogue.ts';
import type { Condition } from '../rules/conditions.ts';
import { givenItems, type GameEffect } from '../rules/effects.ts';
import type { TilePoint } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import type { CraftingStation } from './recipes.ts';

export interface SourceLocation {
  readonly levelId: LevelId;
  readonly levelName: string;
  readonly districtId: DistrictId | null;
  readonly districtName: string;
  readonly count: number;
}

export type ItemSource =
  | { readonly kind: 'drop'; readonly creatureId: CreatureId; readonly name: string; readonly level: number; readonly count: number; readonly chance: number; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'containment'; readonly creatureId: CreatureId; readonly name: string; readonly level: number; readonly count: number; readonly chance: number; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'gather'; readonly objectId: WorldObjectId; readonly name: string; readonly verb: string; readonly skill: SkillId; readonly level: number; readonly onlyDuring: QuestId | null; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'recipe'; readonly recipeId: string; readonly station: CraftingStation; readonly skill: SkillId; readonly level: number; readonly count: number }
  | { readonly kind: 'shop'; readonly shopId: ShopId; readonly name: string; readonly price: number; readonly currencyItemId: ItemId; readonly unlockedBy: QuestId | null; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'sell'; readonly shopId: ShopId; readonly name: string; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'quest'; readonly questId: QuestId; readonly name: string; readonly count: number; readonly giver: string | null; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'contract'; readonly contracts: number; readonly minCount: number; readonly maxCount: number }
  | { readonly kind: 'object'; readonly objectId: WorldObjectId; readonly name: string; readonly verb: string; readonly count: number; readonly onlyDuring: QuestId | null; readonly once: boolean; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'npc'; readonly npcId: NpcId; readonly name: string; readonly count: number; readonly locations: readonly SourceLocation[] }
  | { readonly kind: 'starter'; readonly count: number };

export type ItemSourceKind = ItemSource['kind'];

export const ITEM_SOURCE_KINDS: readonly ItemSourceKind[] = ['gather', 'recipe', 'drop', 'containment', 'shop', 'object', 'npc', 'quest', 'contract', 'sell', 'starter'];

export function placementLocations(content: GameContent, positionsIn: (level: ResolvedLevel) => readonly TilePoint[]): SourceLocation[] {
  const locations: SourceLocation[] = [];
  for (const level of content.levels.values()) {
    const counts = new Map<DistrictId | null, number>();
    for (const position of positionsIn(level)) {
      const districtId = level.layout.districtAt(position) ?? null;
      counts.set(districtId, (counts.get(districtId) ?? 0) + 1);
    }
    const here = [...counts].map(([districtId, count]) => ({
      levelId: level.id,
      levelName: level.name,
      districtId,
      districtName: districtId ? (content.districts.get(districtId)?.name ?? '') : '',
      count,
    }));
    locations.push(...here.sort((a, b) => a.districtName.localeCompare(b.districtName)));
  }
  return locations;
}

const questGate = (conditions: readonly Condition[] | undefined): QuestId | null =>
  conditions?.find((condition) => condition.type === 'questActive')?.questId ?? null;

const shopsOpenedBy = (effects: readonly GameEffect[] | undefined): string[] =>
  (effects ?? []).flatMap((effect) => (effect.type === 'openShop' ? [effect.shopId] : []));

function mergeLocations(locations: readonly SourceLocation[]): SourceLocation[] {
  const merged = new Map<string, SourceLocation>();
  for (const location of locations) {
    const key = `${location.levelId}|${location.districtId ?? ''}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, count: existing.count + location.count } : location);
  }
  return [...merged.values()];
}

const levelOf = (source: ItemSource): number => ('level' in source ? source.level : 0);

const nameOf = (source: ItemSource): string => ('name' in source ? source.name : '');

export function itemSources(content: GameContent): ReadonlyMap<ItemId, readonly ItemSource[]> {
  const sources = new Map<ItemId, ItemSource[]>();
  const add = (itemId: ItemId, source: ItemSource) => {
    const list = sources.get(itemId) ?? [];
    list.push(source);
    sources.set(itemId, list);
  };

  const byLevel = <T extends { readonly position: TilePoint }>(pick: (level: ResolvedLevel) => readonly T[], keyOf: (placement: T) => string) => {
    const index = new Map<string, Map<LevelId, TilePoint[]>>();
    for (const level of content.levels.values()) {
      for (const placement of pick(level)) {
        const perLevel = index.get(keyOf(placement)) ?? new Map<LevelId, TilePoint[]>();
        perLevel.set(level.id, [...(perLevel.get(level.id) ?? []), placement.position]);
        index.set(keyOf(placement), perLevel);
      }
    }
    return (keys: Iterable<string>) => placementLocations(content, (level) => [...keys].flatMap((key) => index.get(key)?.get(level.id) ?? []));
  };
  const objectsAt = byLevel((level) => level.objects, (placement) => placement.objectId);
  const creaturesAt = byLevel((level) => level.creatures, (placement) => placement.creatureId);
  const npcsAt = byLevel((level) => level.npcs, (placement) => placement.npcId);
  const objectLocations = (objectId: WorldObjectId) => objectsAt([objectId]);
  const creatureLocations = (creatureId: CreatureId) => creaturesAt([creatureId]);
  const npcLocations = (npcIds: ReadonlySet<NpcId>) => npcsAt(npcIds);

  for (const creature of content.creatures.values()) {
    const locations = creatureLocations(creature.id);
    for (const entry of creature.loot) {
      add(entry.itemId, { kind: 'drop', creatureId: creature.id, name: creature.name, level: creature.level, count: entry.count, chance: entry.chance, locations });
    }
    for (const entry of creature.containment?.loot ?? []) {
      add(entry.itemId, { kind: 'containment', creatureId: creature.id, name: creature.name, level: containmentLevelFor(creature), count: entry.count, chance: entry.chance, locations });
    }
  }

  for (const object of content.worldObjects.values()) {
    const locations = objectLocations(object.id);
    for (const interaction of object.interactions) {
      const gather = interaction.gather;
      const onlyDuring = questGate(interaction.conditions);
      if (gather) add(gather.itemId, { kind: 'gather', objectId: object.id, name: object.name, verb: interaction.verb, skill: gather.skill, level: gather.level, onlyDuring, locations });
      for (const given of givenItems(interaction.effects)) {
        add(given.itemId, { kind: 'object', objectId: object.id, name: object.name, verb: interaction.verb, count: given.count, onlyDuring, once: interaction.oncePerCharacter ?? false, locations });
      }
    }
  }

  for (const recipe of content.recipes.values()) {
    add(recipe.output.itemId, { kind: 'recipe', recipeId: recipe.id, station: recipe.station, skill: recipe.skill, level: recipe.level, count: recipe.output.count });
  }

  const npcsByDialogue = new Map<string, Set<NpcId>>();
  const vendorsByShop = new Map<string, Set<NpcId>>();
  const vendorObjectsByShop = new Map<string, Set<WorldObjectId>>();
  const register = <T>(map: Map<string, Set<T>>, key: string, value: T) => map.set(key, (map.get(key) ?? new Set<T>()).add(value));
  for (const npc of content.npcs.values()) {
    if (npc.dialogueId) register(npcsByDialogue, npc.dialogueId, npc.id);
    if (npc.shopId) register(vendorsByShop, npc.shopId, npc.id);
  }
  for (const object of content.worldObjects.values()) {
    for (const interaction of object.interactions) {
      for (const shopId of shopsOpenedBy(interaction.effects)) register(vendorObjectsByShop, shopId, object.id);
    }
  }

  for (const dialogue of content.dialogues.values()) {
    const speakers = npcsByDialogue.get(dialogue.id) ?? new Set<NpcId>();
    const effects = dialogueEffects(dialogue);
    for (const shopId of shopsOpenedBy(effects)) for (const npcId of speakers) register(vendorsByShop, shopId, npcId);
    const gifts = givenItems(effects);
    for (const npcId of speakers) {
      const npc = content.npcs.get(npcId);
      if (!npc) continue;
      const locations = npcLocations(new Set([npcId]));
      const counted = new Map<ItemId, number>();
      for (const gift of gifts) counted.set(gift.itemId, Math.max(gift.count, counted.get(gift.itemId) ?? 0));
      for (const [itemId, count] of counted) add(itemId, { kind: 'npc', npcId, name: npc.name, count, locations });
    }
  }

  for (const shop of content.shops.values()) {
    const vendorNpcs = vendorsByShop.get(shop.id) ?? new Set<NpcId>();
    const vendorObjects = vendorObjectsByShop.get(shop.id) ?? new Set<WorldObjectId>();
    const locations = mergeLocations([...npcLocations(vendorNpcs), ...objectsAt(vendorObjects)]);
    for (const listing of shop.listings) {
      add(listing.itemId, {
        kind: 'shop',
        shopId: shop.id,
        name: shop.name,
        price: listing.price,
        currencyItemId: shop.currency?.itemId ?? CURRENCY_ITEM_ID,
        unlockedBy: listing.afterQuest ?? null,
        locations,
      });
    }
    if (shop.buysCategories.length > 0) add(CURRENCY_ITEM_ID, { kind: 'sell', shopId: shop.id, name: shop.name, locations });
  }

  for (const quest of content.quests.values()) {
    const giver = quest.offeredBy ? content.npcs.get(quest.offeredBy) : undefined;
    const locations = giver ? npcLocations(new Set([giver.id])) : [];
    const grants = new Map<ItemId, number>();
    for (const given of givenItems([...quest.steps.flatMap((step) => step.onComplete ?? []), ...quest.rewards])) {
      grants.set(given.itemId, (grants.get(given.itemId) ?? 0) + given.count);
    }
    for (const [itemId, count] of grants) add(itemId, { kind: 'quest', questId: quest.id, name: quest.name, count, giver: giver?.name ?? null, locations });
  }

  const contractRewards = new Map<ItemId, number[]>();
  for (const contract of content.contracts.values()) {
    const grants = [...givenItems(contract.rewards), ...(contract.commendations > 0 ? [{ itemId: COMMENDATION_ITEM_ID, count: contract.commendations }] : [])];
    for (const grant of grants) contractRewards.set(grant.itemId, [...(contractRewards.get(grant.itemId) ?? []), grant.count]);
  }
  for (const [itemId, counts] of contractRewards) {
    add(itemId, { kind: 'contract', contracts: counts.length, minCount: Math.min(...counts), maxCount: Math.max(...counts) });
  }

  for (const itemId of content.newCharacter.kit.equipment) add(itemId, { kind: 'starter', count: 1 });
  for (const grant of content.newCharacter.kit.items) add(grant.itemId, { kind: 'starter', count: grant.count });

  for (const list of sources.values()) {
    list.sort((a, b) => ITEM_SOURCE_KINDS.indexOf(a.kind) - ITEM_SOURCE_KINDS.indexOf(b.kind) || levelOf(a) - levelOf(b) || nameOf(a).localeCompare(nameOf(b)));
  }
  return sources;
}
