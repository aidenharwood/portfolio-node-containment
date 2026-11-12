import { Group } from 'three';
import { CharacterRig } from '../render/models/characterModel.ts';
import { createCreatureRig } from '../render/models/creatureModels.ts';
import type { EntityRig } from '../render/models/entityRig.ts';
import type { ActorSpec } from './actorSpecs.ts';

interface Actor {
  readonly rig: EntityRig;
  readonly seed: number;
}

const rigOf = (spec: ActorSpec): EntityRig => (spec.kind === 'npc' ? new CharacterRig(spec.appearance, spec.gear) : createCreatureRig(spec.model));

export class ActorLayer {
  readonly root = new Group();
  private actors: Actor[] = [];

  show(specs: readonly ActorSpec[]): void {
    this.clear();
    for (const spec of specs) {
      const rig = rigOf(spec);
      rig.root.position.set(spec.position.x + 0.5, 0, spec.position.y + 0.5);
      this.root.add(rig.root);
      this.actors.push({ rig, seed: spec.id.length });
    }
  }

  update(time: number): void {
    for (const actor of this.actors) {
      actor.rig.animate({ moving: false, walkPhase: 0, time: time + actor.seed, attackProgress: null, attackMotion: null, hurtProgress: null });
    }
  }

  setVisible(on: boolean): void {
    this.root.visible = on;
  }

  dispose(): void {
    this.clear();
  }

  private clear(): void {
    for (const actor of this.actors) this.root.remove(actor.rig.root);
    this.actors = [];
  }
}
