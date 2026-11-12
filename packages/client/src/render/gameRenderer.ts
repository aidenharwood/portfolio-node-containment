import type { GameSettings } from '../state/gameSettings.ts';
import { GAME_CONTENT, WEAPON_KIND_INFO, type EntityId, type Facing, type ItemId, type NpcQuestMarker, type TilePoint } from '@containment/shared';
import { Group, MathUtils, Plane, Raycaster, Scene, Vector2, Vector3, MeshBasicMaterial, Mesh, OctahedronGeometry, type Object3D } from 'three';
import type { ClientEntity, CombatHitEvent, WorldState } from '../state/worldState.ts';
import { CameraRig } from './cameraRig.ts';
import { CharacterRig } from './models/characterModel.ts';
import { createCreatureRig } from './models/creatureModels.ts';
import { attackDurationMs, type EntityRig } from './models/entityRig.ts';
import { createAreaBeacon, createClickMarker, createContainmentField, createGroundRing, createQuestMarker, setContainmentFieldOpacity, type QuestMarkerKind } from './models/markerModels.ts';
import { GroundItemLayer } from './items/groundItemLayer.ts';
import { ProjectileLayer } from './projectileLayer.ts';
import { RouteLayer } from './routeLayer.ts';
import { EncounterLayer } from './encounterLayer.ts';
import { objectCoversTile, samePickTarget, type ClickMarker, type PickTarget } from './pickTarget.ts';
import { hex } from './voxel/palette.ts';
import { copyAmbience, createBlendedAmbience, easeAmbience, sampleAmbience } from './world/ambienceBlend.ts';
import { SceneLook } from './sceneLook.ts';
import { LevelScene } from './world/levelScene.ts';
import { objectModelOrigin } from './world/chunkView.ts';

export interface RenderOverlay {
  readonly hover: PickTarget | null;
  readonly clickMarker: ClickMarker | null;
  readonly objectiveObjectIds: ReadonlySet<string>;
  readonly npcMarkers: ReadonlyMap<string, NpcQuestMarker>;
  readonly objectiveCreatureIds: ReadonlySet<string>;
  readonly objectiveBeacons: readonly TilePoint[];
  readonly guidanceRoute: readonly TilePoint[];
}

export interface ScreenAnchor {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
}

interface EntityView {
  readonly rig: EntityRig;
  readonly character: CharacterRig | null;
  gear: readonly ItemId[];
  yaw: number;
  marker: Group | null;
  markerKind: QuestMarkerKind | null;
  readonly scale: number;
}

const FOOTPRINT_MODEL_SCALE: Readonly<Record<number, number>> = { 1: 1, 2: 1.75 };

const CONTAINMENT_FIELD = 'containment-field';
const ENRAGE_MARK = 'enrage-mark';
const HURT_ANIMATION_MS = 300;
const MUZZLE_REACH = 0.5;
const DEATH_ANIMATION_MS = 700;
const AMBIENCE_EASE_PER_SECOND = 3;

const animationProgress = (startedAt: number, duration: number, now: number): number | null => {
  const progress = (now - startedAt) / duration;
  return progress >= 0 && progress < 1 ? progress : null;
};

const FACING_YAW: Readonly<Record<Facing, number>> = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 };

export class GameRenderer {
  readonly cameraRig = new CameraRig();
  private readonly canvas: HTMLCanvasElement;
  private readonly world: WorldState;
  private readonly look: SceneLook;
  private readonly scene = new Scene();
  private readonly entities = new Map<EntityId, EntityView>();
  private readonly hoverRing = createGroundRing(0xffd23f, 0.34, 0.42);
  private readonly selfRing = createGroundRing(0x4fd8ff, 0.3, 0.36);
  private readonly click = createClickMarker();
  private readonly beacons: Group[] = [];
  private readonly raycaster = new Raycaster();
  private readonly groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  private zone: LevelScene | null = null;
  private readonly ambience = createBlendedAmbience();
  private readonly ambienceTarget = createBlendedAmbience();
  private ambienceTile: string | null = null;
  private readonly groundItems = new GroundItemLayer();
  private readonly projectiles = new ProjectileLayer();
  private readonly route = new RouteLayer();
  private readonly encounters = new EncounterLayer();
  private readonly stopHitListener: () => void;
  private lastFrame = performance.now();

  constructor(canvas: HTMLCanvasElement, world: WorldState) {
    this.canvas = canvas;
    this.world = world;
    this.look = new SceneLook(canvas, this.scene, this.cameraRig.camera);
    this.stopHitListener = world.onCombatHit((event) => this.launchProjectile(event));
    this.scene.add(this.projectiles.root, this.groundItems.root, this.hoverRing, this.selfRing, this.click.group, this.route.mesh, this.encounters.mesh);

  }

  resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.look.resize(width, height);
    this.cameraRig.resize(width, height);
  }

  applyGraphics(settings: GameSettings): void {
    if (this.look.applyGraphics(settings)) this.resize();
  }

  private followAmbience(focus: Vector3, delta: number, snap: boolean): void {
    const level = this.world.zone?.definition;
    if (!level) return;
    const tile = { x: Math.round(focus.x), y: Math.round(focus.z) };
    const key = `${tile.x},${tile.y}`;
    if (key !== this.ambienceTile) {
      this.ambienceTile = key;
      sampleAmbience(level, tile, this.ambienceTarget);
    }
    if (snap) copyAmbience(this.ambience, this.ambienceTarget);
    else easeAmbience(this.ambience, this.ambienceTarget, 1 - Math.exp(-delta * AMBIENCE_EASE_PER_SECOND));
    this.look.applyAmbience(this.ambience);
  }

  get loading(): boolean {
    return this.zone?.loading ?? false;
  }

  rebuildZone(): void {
    if (this.zone) {
      this.scene.remove(this.zone.root);
      this.zone.dispose();
    }
    for (const view of this.entities.values()) this.scene.remove(view.rig.root);
    this.entities.clear();
    const active = this.world.zone;
    if (!active) return;
    this.zone = new LevelScene(active);
    this.scene.add(this.zone.root);
    this.look.resetLights();

    const start = this.world.selfEntity?.to ?? active.definition.spawn;
    this.cameraRig.follow(new Vector3(start.x, 0.8, start.y));
    this.cameraRig.snapToFocus();
    this.zone.stream(start);
    this.ambienceTile = null;
    this.followAmbience(new Vector3(start.x, 0, start.y), 0, true);
  }

  render(now: number, overlay: RenderOverlay): void {
    const delta = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const time = now / 1000;
    if (!this.zone) {
      this.look.renderPlain(this.scene, this.cameraRig.camera);
      return;
    }

    this.syncEntities(now, delta, overlay);
    this.groundItems.sync(this.world.groundItems, now / 1000);
    this.projectiles.update(now);
    const self = this.world.selfEntity;
    if (self) {
      const position = this.world.renderPosition(self, now);
      this.cameraRig.follow(new Vector3(position.x, 0.8, position.y));
      this.selfRing.visible = true;
      this.selfRing.position.set(position.x, 0.02, position.y);
    } else {
      this.selfRing.visible = false;
    }
    this.cameraRig.update(delta);

    const focus = this.cameraRig.focusPoint;
    this.zone.stream({ x: focus.x, y: focus.z });
    this.followAmbience(focus, delta, false);
    this.look.aimKeyLight(focus);
    this.zone.update(time, overlay.objectiveObjectIds, this.world.depletedObjects, this.world.usedObjects, { open: this.world.openDoors, self: this.world.selfEntity?.to ?? null });
    this.zone.updateCutaway(this.cameraRig.camera.position, focus);
    this.look.updateLights(this.zone.lights, delta, time, focus);
    this.updateHover(overlay.hover, now);
    this.updateClickMarker(overlay.clickMarker, now);
    this.updateBeacons(overlay.objectiveBeacons, time);
    this.route.update(overlay.guidanceRoute, time);
    this.encounters.update(this.world.telegraphs.values(), this.world.hazards.values(), now);

    this.look.render(this.cameraRig.camera, delta);
  }

  pick(canvasX: number, canvasY: number): PickTarget | null {
    return this.pickAll(canvasX, canvasY)[0] ?? null;
  }

  pickAll(canvasX: number, canvasY: number): PickTarget[] {
    if (!this.zone) return [];
    const pointer = new Vector2((canvasX / this.canvas.clientWidth) * 2 - 1, -(canvasY / this.canvas.clientHeight) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.cameraRig.camera);

    const selfId = this.world.selfEntityId;
    const candidates: Object3D[] = [
      ...[...this.entities.entries()].filter(([id]) => id !== selfId).map(([, view]) => view.rig.root),
      ...[...this.zone.objects.values()].filter((view) => view.definition.interactions.length > 0).map((view) => view.group),
      ...this.groundItems.pickables(),
    ];
    const groundPoint = this.raycaster.ray.intersectPlane(this.groundPlane, new Vector3());
    const groundDistance = groundPoint ? groundPoint.distanceTo(this.raycaster.ray.origin) : Infinity;
    const targets: PickTarget[] = [];
    const add = (target: PickTarget) => {
      if (!targets.some((existing) => samePickTarget(existing, target))) targets.push(target);
    };

    for (const hit of this.raycaster.intersectObjects(candidates, true)) {
      if (hit.distance > groundDistance + 0.01) break;
      const target = this.targetFor(hit.object);
      if (target) add(target);
    }
    if (!groundPoint) return targets;

    const tile = { x: Math.round(groundPoint.x), y: Math.round(groundPoint.z) };
    for (const item of this.world.groundItems.values()) {
      if (item.position.x === tile.x && item.position.y === tile.y) add({ kind: 'groundItem', item });
    }
    for (const view of this.zone.objects.values()) {
      if (view.definition.interactions.length > 0 && objectCoversTile(view.placement, view.definition, tile)) add({ kind: 'object', instanceId: view.instanceId, placement: view.placement, definition: view.definition });
    }
    const walkTarget = this.world.walkTargetFor(tile);
    if (walkTarget) add({ kind: 'tile', tile: walkTarget });
    return targets;
  }

  anchorFor(entityId: EntityId, now: number, extraHeight = 0.25): ScreenAnchor | null {
    const view = this.entities.get(entityId);
    const entity = this.world.entities.get(entityId);
    if (!view || !entity) return null;
    const position = this.world.bodyPosition(entity, now);
    return this.project(new Vector3(position.x, view.rig.height * view.scale + extraHeight, position.y));
  }

  dispose(): void {
    this.stopHitListener();
    this.projectiles.dispose();
    this.zone?.dispose();
    this.look.dispose();
  }

  private project(point: Vector3): ScreenAnchor {
    const projected = point.clone().project(this.cameraRig.camera);
    return {
      x: (projected.x * 0.5 + 0.5) * this.canvas.clientWidth,
      y: (-projected.y * 0.5 + 0.5) * this.canvas.clientHeight,
      visible: projected.z < 1,
    };
  }

  private launchProjectile(event: CombatHitEvent): void {
    if (!event.projectile) return;
    const attacker = this.world.entities.get(event.attackerId);
    const target = this.world.entities.get(event.targetId);
    if (!attacker || !target) return;
    const now = performance.now();
    const muzzle = this.world.bodyPosition(attacker, now);
    const impact = this.world.bodyPosition(target, now);
    const attackerView = this.entities.get(attacker.id);
    const targetView = this.entities.get(target.id);
    const attackerHeight = attackerView ? attackerView.rig.height * attackerView.scale : 1.2;
    const targetHeight = targetView ? targetView.rig.height * targetView.scale : 1.2;
    const from = new Vector3(muzzle.x, attackerHeight * 0.55, muzzle.y);
    const to = new Vector3(impact.x, targetHeight * 0.55, impact.y);
    if (attacker.kind !== 'creature') from.lerp(to, Math.min(0.45, MUZZLE_REACH / Math.max(0.001, from.distanceTo(to))));
    this.projectiles.launch(event.projectile, from, to, this.projectileColor(attacker), now, Math.max(1, event.impactAt - event.at));
  }

  private projectileColor(attacker: ClientEntity): number {
    if (attacker.kind === 'creature') return 0xc8ff7a;
    for (const itemId of attacker.gear) {
      const equipment = GAME_CONTENT.items.get(itemId)?.equipment;
      if (equipment?.slot === 'primary' && equipment.visual.emissive) return hex(equipment.visual.emissive);
    }
    return 0x8fdcf5;
  }

  private targetFor(object: Object3D): PickTarget | null {
    for (let node: Object3D | null = object; node; node = node.parent) {
      const pick = node.userData.pick as { kind: string; entityId?: EntityId; instanceId?: string } | undefined;
      if (!pick) continue;
      if (pick.kind === 'entity' && pick.entityId) {
        const entity = this.world.entities.get(pick.entityId);
        return entity ? { kind: 'entity', entity } : null;
      }
      if (pick.kind === 'groundItem' && pick.instanceId) {
        const item = this.world.groundItems.get(pick.instanceId);
        return item ? { kind: 'groundItem', item } : null;
      }
      if (pick.kind === 'object' && pick.instanceId) {
        const view = this.zone?.objects.get(pick.instanceId);
        return view ? { kind: 'object', instanceId: view.instanceId, placement: view.placement, definition: view.definition } : null;
      }
    }
    return null;
  }

  private syncEntities(now: number, delta: number, overlay: RenderOverlay): void {
    for (const [id, view] of this.entities) {
      if (!this.world.entities.has(id)) {
        this.scene.remove(view.rig.root);
        this.entities.delete(id);
      }
    }
    for (const entity of this.world.entities.values()) {
      const view = this.entities.get(entity.id) ?? this.createEntityView(entity);
      if (view.character && entity.appearance && view.gear !== entity.gear) {
        view.character.setLook(entity.appearance, entity.gear);
        view.gear = entity.gear;
      }
      const position = this.world.bodyPosition(entity, now);
      const moving = this.world.isMoving(entity, now);
      if (moving) entity.walkPhase += delta * 10;
      view.rig.root.position.set(position.x, 0, position.y);

      const dx = entity.motion.to.x - entity.motion.from.x;
      const dz = entity.motion.to.y - entity.motion.from.y;
      const desiredYaw = moving && (dx !== 0 || dz !== 0) ? Math.atan2(dx, dz) : FACING_YAW[entity.facing];
      view.yaw += shortestAngle(view.yaw, desiredYaw) * Math.min(1, delta * 12);
      view.rig.root.rotation.y = view.yaw;
      const attackMotion = entity.attackWeapon ? WEAPON_KIND_INFO[entity.attackWeapon].motion : null;
      view.rig.animate({
        moving,
        walkPhase: entity.walkPhase,
        time: now / 1000 + entity.id.length,
        attackProgress: animationProgress(entity.attackAt, attackDurationMs(attackMotion), now),
        attackMotion,
        hurtProgress: animationProgress(entity.hurtAt, HURT_ANIMATION_MS, now),
      });
      const dying = entity.dyingAt === null ? 0 : Math.min(1, (now - entity.dyingAt) / DEATH_ANIMATION_MS);
      if (entity.contained) {
        view.rig.root.rotation.y += dying * dying * 9;
        view.rig.root.scale.setScalar(view.scale * Math.max(0.01, 1 - dying));
        view.rig.root.position.y = dying * 0.6;
        this.updateContainmentField(view, dying);
      } else {
        view.rig.root.scale.setScalar(view.scale);
        view.rig.root.rotation.z = -dying * 1.4;
        view.rig.root.position.y = -dying * 0.15;
      }

      this.updateQuestMarker(view, this.markerFor(entity, overlay), now);
      this.updateEnrageMark(view, entity.enraged, now);
    }
  }

  private updateContainmentField(view: EntityView, progress: number): void {
    const root = view.rig.root;
    let field = root.getObjectByName(CONTAINMENT_FIELD) as Group | undefined;
    if (!field) {
      field = createContainmentField();
      field.name = CONTAINMENT_FIELD;
      root.add(field);
    }
    const rootScale = Math.max(0.01, root.scale.x);
    const size = Math.max(0.15, Math.max(1, view.rig.height * 0.8) * (1.15 - progress));
    field.scale.setScalar(size / rootScale);
    field.position.y = (view.rig.height * 0.5) / rootScale;
    field.rotation.y = -progress * 6;
    setContainmentFieldOpacity(field, 1 - progress ** 4);
  }

  private createEntityView(entity: ClientEntity): EntityView {
    const creature = entity.creatureId ? GAME_CONTENT.creatures.get(entity.creatureId) : undefined;
    const character = !creature && entity.appearance ? new CharacterRig(entity.appearance, entity.gear) : null;
    const rig: EntityRig = creature ? createCreatureRig(creature.model) : (character as CharacterRig);
    rig.root.userData.pick = { kind: 'entity', entityId: entity.id };
    this.scene.add(rig.root);
    const scale = FOOTPRINT_MODEL_SCALE[this.world.bodySize(entity)] ?? 1;
    rig.root.scale.setScalar(scale);
    const view: EntityView = { rig, character, gear: entity.gear, yaw: FACING_YAW[entity.facing], marker: null, markerKind: null, scale };
    this.entities.set(entity.id, view);
    return view;
  }

  private updateEnrageMark(view: EntityView, enraged: boolean, now: number): void {
    let mark = view.rig.root.getObjectByName(ENRAGE_MARK);
    if (!enraged) {
      mark?.removeFromParent();
      return;
    }
    if (!mark) {
      mark = new Mesh(new OctahedronGeometry(0.16), new MeshBasicMaterial({ color: 0xff3c28, toneMapped: false }));
      mark.name = ENRAGE_MARK;
      view.rig.root.add(mark);
    }
    const time = now / 1000;
    mark.position.y = view.rig.height + 0.2 + Math.sin(time * 6) * 0.04;
    mark.rotation.y = time * 3;
  }

  private markerFor(entity: ClientEntity, overlay: RenderOverlay): QuestMarkerKind | null {
    if (entity.npcId) return overlay.npcMarkers.get(entity.npcId) ?? null;
    const isTarget = entity.creatureId !== undefined && entity.dyingAt === null && overlay.objectiveCreatureIds.has(entity.creatureId);
    return isTarget ? 'target' : null;
  }

  private updateBeacons(points: readonly TilePoint[], time: number): void {
    while (this.beacons.length < points.length) {
      const beacon = createAreaBeacon();
      this.scene.add(beacon);
      this.beacons.push(beacon);
    }
    this.beacons.forEach((beacon, index) => {
      const point = points[index];
      beacon.visible = point !== undefined;
      if (!point) return;
      beacon.position.set(point.x, 0.03, point.y);
      const pulse = 1 + Math.sin(time * 2.4 + index) * 0.08;
      beacon.scale.set(pulse, 1, pulse);
      beacon.rotation.y = time * 0.6;
    });
  }

  private updateQuestMarker(view: EntityView, kind: QuestMarkerKind | null, now: number): void {
    if (kind !== view.markerKind) {
      view.marker?.removeFromParent();
      view.marker = kind ? createQuestMarker(kind) : null;
      if (view.marker) view.rig.root.add(view.marker);
      view.markerKind = kind;
    }
    if (view.marker) {
      const time = now / 1000;
      view.marker.position.y = view.rig.height + 0.35 + Math.sin(time * 2.5) * 0.06;
      view.marker.rotation.y = time * 1.6 - view.yaw;
    }
  }

  private updateHover(hover: PickTarget | null, now: number): void {
    const ring = this.hoverRing;
    ring.visible = false;
    if (!hover) return;
    if (hover.kind === 'entity') {
      const position = this.world.bodyPosition(hover.entity, now);
      ring.position.set(position.x, 0.025, position.y);
      ring.scale.setScalar(this.world.bodySize(hover.entity));
      ring.visible = hover.entity.id !== this.world.selfEntityId;
    } else if (hover.kind === 'groundItem') {
      ring.position.set(hover.item.position.x, 0.025, hover.item.position.y);
      ring.scale.setScalar(0.7);
      ring.visible = true;
    } else if (hover.kind === 'object') {
      const origin = objectModelOrigin(hover.placement, hover.definition);
      ring.position.set(origin.x, 0.025, origin.z);
      ring.scale.setScalar(1.45 * (hover.definition.modelScale ?? 1));
      ring.visible = true;
    } else {
      ring.position.set(hover.tile.x, 0.025, hover.tile.y);
      ring.scale.setScalar(0.8);
      ring.visible = true;
    }
    (ring.material as MeshBasicMaterial).color.setHex(hover.kind === 'tile' ? 0x4fd8ff : 0xffd23f);
  }

  private updateClickMarker(marker: ClickMarker | null, now: number): void {
    const age = marker ? (now - marker.startedAt) / 600 : 1;
    this.click.group.visible = age < 1;
    if (!marker || age >= 1) return;
    this.click.group.position.set(marker.tile.x, 0.04, marker.tile.y);
    this.click.group.scale.setScalar(1 + age * 0.6);
    this.click.material.color.setHex(marker.tone === 'walk' ? 0xffd23f : 0xff5e3a);
    this.click.material.opacity = 1 - age;
  }
}

function shortestAngle(from: number, to: number): number {
  return MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
}
