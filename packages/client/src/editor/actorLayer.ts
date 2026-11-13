import { Group } from 'three';
import { CharacterRig } from '../render/models/characterModel.ts';
import { createCreatureRig } from '../render/models/creatureModels.ts';
import type { EntityRig } from '../render/models/entityRig.ts';
import type { ActorSpec } from './actorSpecs.ts';

interface Actor {
  readonly rig: EntityRig;
  readonly seed: number;
  readonly look: string;
}

const rigOf = (spec: ActorSpec): EntityRig => (spec.kind === 'npc' ? new CharacterRig(spec.appearance, spec.gear) : createCreatureRig(spec.model));

const lookOf = (spec: ActorSpec): string => (spec.kind === 'npc' ? JSON.stringify([spec.appearance, spec.gear]) : spec.model);

export class ActorLayer {
  readonly root = new Group();
  private actors = new Map<string, Actor>();

  show(specs: readonly ActorSpec[]): void {
    const next = new Map<string, Actor>();
    for (const spec of specs) {
      const look = lookOf(spec);
      const existing = this.actors.get(spec.id);
      const actor = existing && existing.look === look ? existing : { rig: rigOf(spec), seed: spec.id.length, look };
      if (actor !== existing) this.root.add(actor.rig.root);
      actor.rig.root.position.set(spec.position.x, 0, spec.position.y);
      next.set(spec.id, actor);
    }
    for (const [id, actor] of this.actors) if (next.get(id) !== actor) this.root.remove(actor.rig.root);
    this.actors = next;
  }

  update(time: number): void {
    for (const actor of this.actors.values()) {
      actor.rig.animate({ moving: false, walkPhase: 0, time: time + actor.seed, attackProgress: null, attackMotion: null, hurtProgress: null });
    }
  }

  setVisible(on: boolean): void {
    this.root.visible = on;
  }

  dispose(): void {
    for (const actor of this.actors.values()) this.root.remove(actor.rig.root);
    this.actors = new Map();
  }
}
