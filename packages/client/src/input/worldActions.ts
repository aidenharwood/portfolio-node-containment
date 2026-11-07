import { GAME_CONTENT, type TileKindId, type TilePoint } from '@containment/shared';
import type { MenuAction } from '../hud/contextMenu.ts';
import type { GameConnection } from '../net/gameConnection.ts';
import type { PickTarget } from '../render/pickTarget.ts';

export interface ActionContext {
  readonly connection: GameConnection;
  readonly selfEntityId: string | null;
  examine(text: string): void;
  markClick(tile: TilePoint, tone: 'walk' | 'interact'): void;
}

const TERRAIN_INFO: Readonly<Record<TileKindId, { readonly name: string; readonly examine: string }>> = {
  void: { name: 'Darkness', examine: 'Nothing. Not even the absence of something.' },
  wall: { name: 'Bulkhead Wall', examine: 'Reinforced site plating. It has been rated for things you would rather not think about.' },
  glass: { name: 'Observation Glass', examine: 'Layered containment glass. Your reflection looks slightly less tired than you are.' },
  door: { name: 'Doorway', examine: 'A pressure doorway, latched open.' },
  plating: { name: 'Deck Plating', examine: 'Riveted deck plating, scuffed by a thousand boots.' },
  concrete: { name: 'Concrete Floor', examine: 'Poured concrete with old drill marks.' },
  grate: { name: 'Floor Grate', examine: 'An open grate over glowing service ducts.' },
  rust: { name: 'Rusted Floor', examine: 'Corroded plating. It flakes under your boots.' },
  carpet: { name: 'Carpet', examine: 'Institutional carpet. Its pattern is designed to hide stains, and it is working hard.' },
  hazard: { name: 'Hazard Markings', examine: 'Yellow and black stripes: the universal language of "probably not".' },
  coolant: { name: 'Coolant Channel', examine: 'Glowing reactor coolant. Cold enough to burn. Do not drink, bathe in or fall into.' },
  soil: { name: 'Growing Soil', examine: 'Damp, dark soil laced with root threads. Some of the threads are moving.' },
};

export function actionsForTarget(target: PickTarget | null, context: ActionContext): MenuAction[] {
  if (!target) return [];
  switch (target.kind) {
    case 'tile':
      return [walkHere(target.tile, context)];

    case 'terrain': {
      const info = TERRAIN_INFO[target.terrain];
      return [{ verb: 'Examine', subject: info.name, subjectTone: 'object', run: () => context.examine(info.examine) }];
    }

    case 'entity': {
      const { entity } = target;
      if (entity.id === context.selfEntityId) return [walkHere(entity.to, context)];
      if (entity.kind === 'creature') {
        const creature = entity.creatureId ? GAME_CONTENT.creatures.get(entity.creatureId) : undefined;
        const instanceId = entity.id.replace(/^creature:/, '');
        const subject = creature ? `${entity.name} (level ${creature.level})` : entity.name;
        return [
          {
            verb: 'Attack',
            subject,
            subjectTone: 'creature',
            run: () => {
              context.markClick(entity.to, 'interact');
              context.connection.send({ type: 'world.interact', targetKind: 'creature', instanceId, interactionIndex: 0 });
            },
          },
          { verb: 'Examine', subject: entity.name, subjectTone: 'creature', run: () => context.examine(creature?.examine ?? entity.name) },
        ];
      }
      if (entity.kind === 'player') {
        return [
          walkHere(entity.to, context),
          { verb: 'Examine', subject: entity.name, subjectTone: 'player', run: () => context.examine(`${entity.name}, a fellow Directorate operative.`) },
        ];
      }
      const npc = entity.npcId ? GAME_CONTENT.npcs.get(entity.npcId) : undefined;
      const instanceId = entity.id.replace(/^npc:/, '');
      const actions: MenuAction[] = [];
      if (npc?.dialogueId) {
        actions.push({
          verb: 'Talk-to',
          subject: entity.name,
          subjectTone: 'npc',
          run: () => {
            context.markClick(entity.to, 'interact');
            context.connection.send({ type: 'world.interact', targetKind: 'npc', instanceId, interactionIndex: 0 });
          },
        });
      }
      if (npc?.shopId) {
        actions.push({
          verb: 'Trade',
          subject: entity.name,
          subjectTone: 'npc',
          run: () => {
            context.markClick(entity.to, 'interact');
            context.connection.send({ type: 'world.interact', targetKind: 'npc', instanceId, interactionIndex: 1 });
          },
        });
      }
      actions.push({ verb: 'Examine', subject: entity.name, subjectTone: 'npc', run: () => context.examine(npc?.examine ?? entity.name) });
      return actions;
    }

    case 'groundItem': {
      const item = GAME_CONTENT.items.get(target.item.itemId);
      const name = `${item?.name ?? target.item.itemId}${target.item.quantity > 1 ? ` (${target.item.quantity})` : ''}`;
      return [
        {
          verb: 'Take',
          subject: name,
          subjectTone: 'item',
          run: () => {
            context.markClick(target.item.position, 'interact');
            context.connection.send({ type: 'world.pickup', groundItemId: target.item.id });
          },
        },
        walkHere(target.item.position, context),
        { verb: 'Examine', subject: name, subjectTone: 'item', run: () => context.examine(item?.examine ?? name) },
      ];
    }

    case 'object': {
      const { definition, instanceId, placement } = target;
      return [
        ...definition.interactions.map((interaction, interactionIndex) => ({
          verb: interaction.verb,
          subject: definition.name,
          subjectTone: 'object' as const,
          run: () => {
            context.markClick(placement.position, 'interact');
            context.connection.send({ type: 'world.interact', targetKind: 'object', instanceId, interactionIndex });
          },
        })),
        { verb: 'Examine', subject: definition.name, subjectTone: 'object' as const, run: () => context.examine(definition.examine) },
      ];
    }
  }
}

function walkHere(tile: TilePoint, context: ActionContext): MenuAction {
  return {
    verb: 'Walk here',
    run: () => {
      context.markClick(tile, 'walk');
      context.connection.send({ type: 'world.walk', target: tile });
    },
  };
}
