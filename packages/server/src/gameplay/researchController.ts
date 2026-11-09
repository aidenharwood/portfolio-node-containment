import {
  deriveCombatProfile,
  equipmentStats,
  hasLineOfSight,
  isWithinStudyReach,
  samePoint,
  STUDY_TICKS,
  studiedFlag,
  studyBlocker,
  studyExperience,
  type CreatureDefinition,
  type GameContent,
  type InstanceId,
  type NoticeTone,
} from '@containment/shared';
import type { Creature } from '../world/creature.ts';
import type { LevelInstance } from '../world/levelInstance.ts';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { EffectRunner } from './effectRunner.ts';

export interface ResearchHost {
  notify(player: Player, tone: NoticeTone, text: string): void;
  sendActivity(player: Player, label: string | null, ticksPerAction?: number, remaining?: number | null): void;
}

export class ResearchController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly effects: EffectRunner;
  private readonly host: ResearchHost;

  constructor(content: GameContent, world: World, effects: EffectRunner, host: ResearchHost) {
    this.content = content;
    this.world = world;
    this.effects = effects;
    this.host = host;
  }

  study(player: Player, instanceId: InstanceId): void {
    const level = this.world.levelOf(player);
    const creature = level.creatureByInstance(instanceId);
    if (!creature?.isAlive || !level.isInterestOf(player, creature.position)) return;
    const blocker = studyBlocker(creature.definition, this.analysisOf(player));
    if (blocker) {
      this.host.notify(player, 'warning', blocker);
      return;
    }
    player.pendingInteraction = null;
    player.activity = { kind: 'study', creatureEntityId: creature.entityId, dueTick: null, lastApproach: null };
  }

  tick(tick: number): void {
    for (const level of this.world.instances()) {
      for (const player of level.players.values()) {
        if (player.activity?.kind === 'study') this.advance(player, level, tick);
      }
    }
  }

  stop(player: Player): void {
    if (player.activity?.kind !== 'study') return;
    const started = player.activity.dueTick !== null;
    player.activity = null;
    if (started) this.host.sendActivity(player, null);
  }

  private advance(player: Player, level: LevelInstance, tick: number): void {
    const activity = player.activity;
    if (activity?.kind !== 'study') return;
    const creature = level.creatures.get(activity.creatureEntityId);
    if (!creature?.isAlive) {
      this.host.notify(player, 'info', 'Your subject is gone. The study is abandoned.');
      return this.stop(player);
    }
    const sightline = (from: { x: number; y: number }, to: { x: number; y: number }) => hasLineOfSight(level.layout, from, to);
    if (!isWithinStudyReach(player.position, creature.position, sightline)) {
      if (activity.dueTick !== null) {
        player.activity = { ...activity, dueTick: null };
        this.host.sendActivity(player, null);
      }
      this.approach(player, creature);
      return;
    }
    if (activity.dueTick === null) {
      player.path = [];
      this.world.face(player, creature.position);
      player.activity = { ...activity, dueTick: tick + STUDY_TICKS, lastApproach: null };
      this.host.sendActivity(player, `Studying ${creature.definition.name}`, STUDY_TICKS);
      return;
    }
    if (tick < activity.dueTick) return;
    this.stop(player);
    this.complete(player, creature.definition);
  }

  private approach(player: Player, creature: Creature): void {
    const activity = player.activity;
    if (activity?.kind !== 'study') return;
    const stale = !activity.lastApproach || !samePoint(activity.lastApproach, creature.position);
    if (player.path.length > 0 && !stale) return;
    if (!this.world.approach(player, creature.position)) {
      this.host.notify(player, 'warning', "You can't get a clear look at that.");
      return this.stop(player);
    }
    player.activity = { ...activity, lastApproach: creature.position };
  }

  private complete(player: Player, creature: CreatureDefinition): void {
    const blocker = studyBlocker(creature, this.analysisOf(player));
    if (blocker) {
      this.host.notify(player, 'warning', blocker);
      return;
    }
    const firstStudy = player.addFlag(studiedFlag(creature.id));
    const label = creature.designation ? `${creature.designation} (${creature.name})` : creature.name;
    if (firstStudy) this.host.notify(player, 'success', `${label} catalogued. Its weakness to ${creature.weakness} attacks is now in your bestiary.`);
    else this.host.notify(player, 'info', `You add field notes on ${creature.name}.`);
    this.effects.awardExperience(player, 'research', studyExperience(creature, firstStudy), true);
  }

  private analysisOf(player: Player): number {
    return deriveCombatProfile(player.record.skills, equipmentStats(player.record.equipment, this.content.items)).analysis;
  }
}
