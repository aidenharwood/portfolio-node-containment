import {
  availableOptions,
  fillDialogueTemplate,
  selectEntryNode,
  type DialogueDefinition,
  type DialogueNode,
  type GameContent,
} from '@containment/shared';
import type { Npc } from '../world/npc.ts';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { EffectHost, EffectRunner } from './effectRunner.ts';
import { conditionContextFor, dialogueTemplateValuesFor } from './playerContext.ts';

export class DialogueController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly effects: EffectRunner;
  private readonly host: EffectHost;

  constructor(content: GameContent, world: World, effects: EffectRunner, host: EffectHost) {
    this.content = content;
    this.world = world;
    this.effects = effects;
    this.host = host;
  }

  open(player: Player, npc: Npc): void {
    const dialogue = npc.definition.dialogueId ? this.content.dialogues.get(npc.definition.dialogueId) : undefined;
    const entryNode = dialogue ? selectEntryNode(dialogue, conditionContextFor(player, this.content)) : null;
    if (!dialogue || !entryNode) {
      player.send({ type: 'chat.message', channel: 'system', text: `${npc.definition.name} has nothing to say to you.` });
      return;
    }

    this.close(player);
    npc.engagedWith = player.entityId;
    this.world.faceNpc(npc, player.position, this.world.levelOf(player));
    player.dialogue = { dialogueId: dialogue.id, nodeId: entryNode, npcInstanceId: npc.placement.instanceId };
    this.enterNode(player, dialogue, entryNode);
    this.host.raiseQuestEvent(player, { type: 'talkedTo', npcId: npc.definition.id });
  }

  continue(player: Player): void {
    const active = this.activeNode(player);
    if (!active || (active.node.options?.length ?? 0) > 0) return;
    this.moveTo(player, active.dialogue, active.node.next ?? null);
  }

  choose(player: Player, optionIndex: number): void {
    const active = this.activeNode(player);
    if (!active) return;
    const choice = availableOptions(active.node, conditionContextFor(player, this.content)).find(
      (candidate) => candidate.index === optionIndex,
    );
    if (!choice) return;
    if (choice.option.effects) this.effects.apply(player, choice.option.effects);
    if (player.dialogue) this.moveTo(player, active.dialogue, choice.option.next);
  }

  close(player: Player): void {
    if (!player.dialogue) return;
    const npc = this.world.findLevelOf(player)?.npcs.get(player.dialogue.npcInstanceId);
    if (npc?.engagedWith === player.entityId) npc.engagedWith = null;
    player.dialogue = null;
    player.send({ type: 'dialogue.closed' });
  }

  private moveTo(player: Player, dialogue: DialogueDefinition, nodeId: string | null): void {
    if (nodeId === null || !dialogue.nodes[nodeId]) {
      this.close(player);
      return;
    }
    this.enterNode(player, dialogue, nodeId);
  }

  private enterNode(player: Player, dialogue: DialogueDefinition, nodeId: string): void {
    const node = dialogue.nodes[nodeId] as DialogueNode;
    const session = player.dialogue;
    if (!session) return;
    player.dialogue = { ...session, nodeId };
    if (node.effects) this.effects.apply(player, node.effects);
    if (player.dialogue?.nodeId !== nodeId) return;

    const npc = this.world.findLevelOf(player)?.npcs.get(session.npcInstanceId);
    const context = conditionContextFor(player, this.content);
    const options = availableOptions(node, context);
    const values = dialogueTemplateValuesFor(player);
    player.send({
      type: 'dialogue.opened',
      view: {
        speakerName: node.speaker === 'npc' ? (npc?.definition.name ?? '') : player.record.name,
        speakerTitle: node.speaker === 'npc' ? (npc?.definition.title ?? '') : '',
        speaker: node.speaker,
        text: fillDialogueTemplate(node.text, values),
        options:
          options.length > 0
            ? options.map(({ index, option }) => ({ index, text: fillDialogueTemplate(option.text, values) }))
            : null,
      },
    });
  }

  private activeNode(player: Player): { dialogue: DialogueDefinition; node: DialogueNode } | null {
    const session = player.dialogue;
    const dialogue = session ? this.content.dialogues.get(session.dialogueId) : undefined;
    const node = session && dialogue ? dialogue.nodes[session.nodeId] : undefined;
    return dialogue && node ? { dialogue, node } : null;
  }
}
