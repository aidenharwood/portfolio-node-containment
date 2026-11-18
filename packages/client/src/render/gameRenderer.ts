import { particleDensityFor, weatherDensityFor, type GameSettings } from '../state/gameSettings.ts';
import { GAME_CONTENT, WEAPON_KIND_INFO, type EntityId, type Facing, type ItemId, type NpcQuestMarker, type TilePoint } from '@containment/shared';
import { Color, Group, MathUtils, Plane, Raycaster, Scene, Vector2, Vector3, MeshBasicMaterial, Mesh, OctahedronGeometry, type Object3D } from 'three';
import type { ClientEntity, CombatHitEvent, WorldEffectEvent, WorldState } from '../state/worldState.ts';
import { CameraRig } from './cameraRig.ts';
import { CharacterRig } from './models/characterModel.ts';
import { createCreatureRig } from './models/creatureModels.ts';
import type { EntityRig } from './models/entityRig.ts';
import { attackDurationMs } from '../state/attackTiming.ts';
import { WORK_CONTACT, WORK_MS } from './models/weaponPoses.ts';
import { DEATH_ANIMATION_MS } from '../state/combatClock.ts';
import { ParticleLayer } from './particleLayer.ts';
import { setVoxelObjectFlash } from './voxel/voxelMaterials.ts';
import { STYLE_COLOR } from './encounterLayer.ts';
import type { ProjectileKind } from '@containment/shared';
import { createAreaBeacon, createClickMarker, createContactShadow, createContainmentField, createGroundRing, createQuestMarker, setContainmentFieldOpacity, type QuestMarkerKind } from './models/markerModels.ts';
import { GroundItemLayer } from './items/groundItemLayer.ts';
import { ProjectileLayer } from './projectileLayer.ts';
import { RouteLayer } from './routeLayer.ts';
import { EncounterLayer } from './encounterLayer.ts';
import { objectCoversTile, samePickTarget, type ClickMarker, type PickTarget } from './pickTarget.ts';
import { hex, lighten } from './voxel/palette.ts';
import { copyAmbience, createBlendedAmbience, easeAmbience, sampleAmbience } from './world/ambienceBlend.ts';
import { SceneLook } from './sceneLook.ts';
import { LevelScene } from './world/levelScene.ts';
import { WeatherLayer } from './world/weatherLayer.ts';
import { SkyMask } from './world/skyMask.ts';
import { setFieldSkyMask } from './voxel/fieldLights.ts';
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
  readonly shadow: Mesh;
  last: { x: number; y: number } | null;
  flashing: boolean;
  shattered: boolean;
  workAt: number;
}

interface PendingHit {
  readonly event: CombatHitEvent;
  launched: boolean;
  impacted: boolean;
  lastTip: Vector3 | null;
}

interface PendingChips {
  readonly at: number;
  readonly position: Vector3;
  readonly colors: readonly number[];
}

const FOOTPRINT_MODEL_SCALE: Readonly<Record<number, number>> = { 1: 1, 2: 1.75 };

const CONTAINMENT_FIELD = 'containment-field';
const ENRAGE_MARK = 'enrage-mark';
const HURT_ANIMATION_MS = 300;
const MUZZLE_REACH = 0.5;
const FLASH_MS = 90;
const STEP_PHASE_PER_TILE = 4.3;
const TRAIL_LEAD_MS = 60;
const TRAIL_TAIL_MS = 25;
const HIT_SPARK = 0xfff1c8;
const MISS_PUFF = 0x9aa0a6;
const LEVEL_GOLD = 0xffd23f;
const HEAL_GREEN = 0x7dff9a;
const CONTAIN_CYAN = 0x4fd8ff;
const CONTAIN_GOLD = 0xffcf4d;
const DEPLETION_DUST = 0x8a7a6a;
const TELEGRAPH_SPARK_CAP = 60;
const PALETTE_SAMPLES = 8;
const TRAIL_MAX_STEPS = 24;
const TRAIL_SPACING = 0.05;
const SPIRIT_SQUASH_FROM = 1 - 150 / 700;
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
  private readonly weather: WeatherLayer;
  private readonly skyMask = new SkyMask();
  private weatherDensity = 1;
  private readonly ambience = createBlendedAmbience();
  private readonly ambienceTarget = createBlendedAmbience();
  private ambienceTile: string | null = null;
  private readonly groundItems = new GroundItemLayer();
  private readonly projectiles = new ProjectileLayer((kind, at, travel, color) => this.projectileImpact(kind, at, travel, color));
  private readonly particles = new ParticleLayer();
  private readonly pendingHits: PendingHit[] = [];
  private readonly pendingChips: PendingChips[] = [];
  private readonly stopEffectListener: () => void;
  private readonly scratch = new Vector3();
  private readonly sampleColor = new Color();
  private readonly route = new RouteLayer();
  private readonly encounters = new EncounterLayer();
  private readonly stopHitListener: () => void;
  private lastFrame = performance.now();

  constructor(canvas: HTMLCanvasElement, world: WorldState) {
    this.canvas = canvas;
    this.world = world;
    this.look = new SceneLook(canvas, this.scene, this.cameraRig.camera);
    this.stopHitListener = world.onCombatHit((event) => this.pendingHits.push({ event, launched: false, impacted: false, lastTip: null }));
    this.stopEffectListener = world.onEffect((event) => this.worldEffect(event));
    this.weather = new WeatherLayer(this.skyMask);
    this.scene.add(this.projectiles.root, this.particles.root, this.groundItems.root, this.hoverRing, this.selfRing, this.click.group, this.route.mesh, this.encounters.mesh, this.weather.root);

  }

  resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.look.resize(width, height);
    this.cameraRig.resize(width, height);
  }

  applyGraphics(settings: GameSettings): void {
    this.weatherDensity = weatherDensityFor(settings.weather);
    this.particles.density = particleDensityFor(settings.particles);
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

    this.world.settle(now);
    this.syncEntities(now, delta, overlay);
    this.groundItems.sync(this.world.groundItems, now / 1000);
    this.resolveHits(now);
    this.resolveChips(now);
    this.projectiles.update(now);
    this.particles.setFocus(this.cameraRig.focusPoint);
    this.particles.update(delta);
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
    const viewDistance = this.cameraRig.camera.position.distanceTo(focus);
    this.look.aimKeyLight(focus, viewDistance);
    this.look.matchBloomToDistance(viewDistance);
    this.zone.update(time, overlay.objectiveObjectIds, this.world.depletedObjects, this.world.usedObjects, { open: this.world.openDoors, self: this.world.selfEntity?.to ?? null });
    this.zone.updateCutaway(this.cameraRig.camera.position, focus);
    this.look.updateLights(this.zone.lights, delta, time, focus);
    if (this.skyMask.follow(this.world.zone?.definition, focus.x, focus.z)) setFieldSkyMask(this.skyMask.texture, this.skyMask.originX, this.skyMask.originZ);
    this.weather.update({
      delta,
      time,
      focus,
      camera: this.cameraRig.camera.position,
      ambience: this.ambience,
      enabled: this.weatherDensity > 0,
      density: this.weatherDensity,
      sources: this.zone.lights,
      pixelRatio: this.look.renderer.getPixelRatio(),
      viewportHeight: this.look.renderer.domElement.height,
    });
    this.look.flash = this.weather.flash;
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
    this.stopEffectListener();
    this.projectiles.dispose();
    this.particles.dispose();
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
    if (!attackerView?.rig.muzzle?.(from)) {
      from.set(muzzle.x, attackerHeight * 0.55, muzzle.y);
      if (attacker.kind !== 'creature') from.lerp(to, Math.min(0.45, MUZZLE_REACH / Math.max(0.001, from.distanceTo(to))));
    }
    this.projectiles.launch(event.projectile, from, to, this.projectileColor(attacker), now, Math.max(1, event.impactAt - now));
  }

  private projectileColor(attacker: ClientEntity): number {
    if (attacker.kind === 'creature') return this.entities.get(attacker.id)?.rig.accent ?? 0xc8ff7a;
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
      if (view.last) entity.walkPhase += Math.hypot(position.x - view.last.x, position.y - view.last.y) * STEP_PHASE_PER_TILE;
      view.last = { x: position.x, y: position.y };
      const flashing = now >= entity.hurtAt && now < entity.hurtAt + FLASH_MS;
      if (flashing !== view.flashing) {
        view.flashing = flashing;
        setVoxelObjectFlash(view.rig.root, flashing);
      }
      view.rig.root.position.set(position.x, 0, position.y);

      const dx = entity.motion.to.x - entity.motion.from.x;
      const dz = entity.motion.to.y - entity.motion.from.y;
      const desiredYaw = moving && (dx !== 0 || dz !== 0) ? Math.atan2(dx, dz) : FACING_YAW[entity.facing];
      view.yaw += shortestAngle(view.yaw, desiredYaw) * Math.min(1, delta * 12);
      view.rig.root.rotation.y = view.yaw;
      const working = now - view.workAt < WORK_MS;
      const attackMotion = working ? 'work' : entity.attackWeapon ? WEAPON_KIND_INFO[entity.attackWeapon].motion : null;
      const dying = entity.dyingAt === null ? 0 : Math.min(1, Math.max(0, (now - entity.dyingAt) / DEATH_ANIMATION_MS));
      if (entity.dyingAt === null && view.shattered) view.shattered = false;
      view.rig.animate({
        moving,
        walkPhase: entity.walkPhase,
        time: now / 1000 + entity.id.length,
        attackProgress: working ? (now - view.workAt) / WORK_MS : animationProgress(entity.attackAt, attackDurationMs(attackMotion === 'work' ? null : attackMotion), now),
        attackMotion,
        hurtProgress: animationProgress(entity.hurtAt, HURT_ANIMATION_MS, now),
        dying,
      });
      view.shadow.visible = entity.dyingAt === null;
      if (entity.contained) {
        view.rig.root.rotation.y += dying * dying * 9;
        view.rig.root.scale.setScalar(view.scale * Math.max(0.01, 1 - dying));
        view.rig.root.position.y = dying * 0.6;
        this.updateContainmentField(view, dying);
        if (dying < 1) this.containmentMotes(view);
      } else {
        view.rig.root.scale.setScalar(view.shattered ? 0 : view.scale);
        view.rig.root.rotation.z = view.rig.airborne ? 0 : -dying * 1.4;
        view.rig.root.position.y = view.rig.airborne ? 0 : -dying * 0.15;
      }
      if (view.rig.spirit && !entity.contained && dying > SPIRIT_SQUASH_FROM && !view.shattered) view.rig.root.scale.y = view.scale * Math.max(0.05, 1 - (dying - SPIRIT_SQUASH_FROM) / (1 - SPIRIT_SQUASH_FROM));
      if (dying >= 1 && !view.shattered && entity.kind === 'creature') this.shatter(view, entity.contained);

      this.updateQuestMarker(view, this.markerFor(entity, overlay), now);
      this.updateEnrageMark(view, entity.enraged, now);
    }
  }

  private resolveHits(now: number): void {
    for (let index = this.pendingHits.length - 1; index >= 0; index--) {
      const pending = this.pendingHits[index]!;
      const { event } = pending;
      const attackerView = this.entities.get(event.attackerId);
      if (!event.projectile && attackerView?.character && now >= event.releaseAt - TRAIL_LEAD_MS && now <= event.releaseAt + TRAIL_TAIL_MS && attackerView.rig.muzzle?.(this.scratch)) {
        const color = this.weaponGlow(event.attackerId);
        const from = pending.lastTip ?? this.scratch;
        const steps = Math.min(TRAIL_MAX_STEPS, Math.max(1, Math.ceil(from.distanceTo(this.scratch) / TRAIL_SPACING)));
        for (let step = 1; step <= steps; step++) this.particles.emit('trail', from.clone().lerp(this.scratch, step / steps), { color });
        pending.lastTip = this.scratch.clone();
      }
      if (!pending.launched && now >= event.releaseAt) {
        pending.launched = true;
        this.launchProjectile(event);
      }
      if (!pending.impacted && now >= event.impactAt) {
        pending.impacted = true;
        if (!event.projectile) this.meleeImpact(event);
      }
      if ((pending.launched && pending.impacted) || now > event.impactAt + 1000) this.pendingHits.splice(index, 1);
    }
  }

  private meleeImpact(event: CombatHitEvent): void {
    const target = this.world.entities.get(event.targetId);
    const attacker = this.world.entities.get(event.attackerId);
    const targetView = this.entities.get(event.targetId);
    if (!target || !attacker || !targetView) return;
    const now = performance.now();
    const from = this.world.bodyPosition(attacker, now);
    const to = this.world.bodyPosition(target, now);
    const toward = new Vector3(from.x - to.x, 0, from.y - to.y);
    if (toward.lengthSq() > 1e-6) toward.normalize();
    const at = new Vector3(to.x, targetView.rig.height * targetView.scale * 0.55, to.y).addScaledVector(toward, 0.25);
    if (event.outcome === 'miss') this.particles.emit('puff', at, { color: MISS_PUFF });
    else this.particles.emit('sparks', at, { color: attacker.kind === 'creature' ? HIT_SPARK : this.weaponGlow(attacker.id), direction: toward });
  }

  private projectileImpact(kind: ProjectileKind, at: Vector3, travel: Vector3, color: number): void {
    const back = travel.clone().negate();
    switch (kind) {
      case 'dart':
        this.particles.emit('sparks', at, { color, direction: back, count: 6 });
        return;
      case 'bolt':
        this.particles.emit('sparks', at, { color, direction: back, count: 8 });
        return;
      case 'tracer':
        this.particles.emit('sparks', at, { color, direction: back, count: 10 });
        return;
      case 'pellets':
        this.particles.emit('sparks', at, { color, direction: back, count: 1 });
        return;
      case 'pulse':
        this.particles.emit('ring', at, { color });
        return;
      case 'wave':
        this.particles.emit('ring', at, { color, ringAxis: travel });
        return;
      case 'spit':
        this.particles.emit('droplets', at, { color });
        return;
    }
  }

  private weaponGlow(entityId: EntityId): number {
    const entity = this.world.entities.get(entityId);
    for (const itemId of entity?.gear ?? []) {
      const equipment = GAME_CONTENT.items.get(itemId)?.equipment;
      if (equipment?.slot === 'primary' && equipment.visual.emissive) return hex(equipment.visual.emissive);
    }
    return HIT_SPARK;
  }

  private shatter(view: EntityView, contained: boolean): void {
    view.shattered = true;
    const at = view.rig.root.getWorldPosition(new Vector3());
    at.y += view.rig.height * view.scale * 0.45;
    if (contained) this.particles.emit('sparks', at, { colors: [CONTAIN_CYAN, CONTAIN_GOLD], count: 14 });
    else if (view.rig.spirit) {
      const accent = view.rig.accent ?? HIT_SPARK;
      this.particles.emit('motes', at, { colors: [accent, lighten(accent, 0.4)], count: 28, spawnBox: new Vector3(0.3, view.rig.height * view.scale * 0.9, 0.3) });
    }
    else this.particles.emit('debris', at, { colors: view.rig.palette?.() ?? [MISS_PUFF] });
    view.rig.root.scale.setScalar(0);
  }

  private containmentMotes(view: EntityView): void {
    const centre = view.rig.root.getWorldPosition(new Vector3());
    centre.y += view.rig.height * 0.5;
    for (let n = 0; n < 2; n++) {
      const offset = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(0.8);
      this.particles.emit('motes', centre.clone().add(offset), { color: n === 0 ? CONTAIN_CYAN : CONTAIN_GOLD, direction: offset.clone().negate(), count: 1 });
    }
  }

  private worldEffect(event: WorldEffectEvent): void {
    switch (event.kind) {
      case 'telegraphResolved': {
        const color = STYLE_COLOR[event.telegraph.style];
        event.telegraph.tiles.slice(0, TELEGRAPH_SPARK_CAP / 2).forEach((tile) => this.particles.emit('sparks', new Vector3(tile.x, 0.05, tile.y), { color, direction: new Vector3(0, 1, 0), count: 2 }));
        return;
      }
      case 'depleted': {
        const position = this.objectPosition(event.instanceId);
        if (position) this.particles.emit('debris', position, { colors: this.objectPalette(event.instanceId) ?? [DEPLETION_DUST], count: 12 });
        return;
      }
      case 'cue':
        this.entityCue(event.entityId, event.cue, event.instanceId);
        return;
    }
  }

  private entityCue(entityId: EntityId, cue: 'levelUp' | 'heal' | 'work', instanceId?: string): void {
    const entity = this.world.entities.get(entityId);
    const view = this.entities.get(entityId);
    if (!entity || !view) return;
    const now = performance.now();
    const feet = view.rig.root.getWorldPosition(new Vector3());
    if (cue === 'levelUp') {
      for (let n = 0; n < 4; n++) this.particles.emit('motes', feet.clone().add(new Vector3(0, 0.2 + n * 0.3, 0)), { color: LEVEL_GOLD, count: 10 });
      this.particles.emit('ring', feet.clone().setY(0.05), { color: LEVEL_GOLD, count: 16 });
      return;
    }
    if (cue === 'heal') {
      this.particles.emit('motes', feet.clone().setY(0.4), { color: HEAL_GREEN, count: 10 });
      return;
    }
    if (this.world.isMoving(entity, now)) return;
    view.workAt = now;
    const position = instanceId ? this.objectPosition(instanceId) : null;
    const colors = (instanceId ? this.objectPalette(instanceId) : null) ?? [DEPLETION_DUST];
    this.pendingChips.push({ at: now + WORK_CONTACT * WORK_MS, position: position ?? feet.clone().setY(0.5), colors });
  }

  private resolveChips(now: number): void {
    for (let index = this.pendingChips.length - 1; index >= 0; index--) {
      const chips = this.pendingChips[index]!;
      if (now < chips.at) continue;
      this.particles.emit('chips', chips.position, { colors: chips.colors });
      this.particles.emit('sparks', chips.position, { colors: chips.colors, count: 2 });
      this.pendingChips.splice(index, 1);
    }
  }

  private objectPalette(instanceId: string): number[] | null {
    const view = this.zone?.objects.get(instanceId);
    let palette: number[] | null = null;
    view?.group.traverse((child) => {
      if (palette || !(child instanceof Mesh)) return;
      const colors = child.geometry.getAttribute('color');
      if (!colors) return;
      const stride = Math.max(1, Math.floor(colors.count / PALETTE_SAMPLES));
      palette = [];
      for (let index = 0; index < colors.count && palette.length < PALETTE_SAMPLES; index += stride) palette.push(this.sampleColor.setRGB(colors.getX(index), colors.getY(index), colors.getZ(index)).getHex());
    });
    return palette;
  }

  private objectPosition(instanceId: string): Vector3 | null {
    const view = this.zone?.objects.get(instanceId);
    return view ? view.group.getWorldPosition(new Vector3()).setY(0.4) : null;
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
    const shadow = createContactShadow();
    rig.root.add(shadow);
    const view: EntityView = { rig, character, gear: entity.gear, yaw: FACING_YAW[entity.facing], marker: null, markerKind: null, scale, shadow, last: null, flashing: false, shattered: false, workAt: -Infinity };
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
      mark = new Mesh(new OctahedronGeometry(0.16), new MeshBasicMaterial({ color: 0xff3c28, toneMapped: false, fog: false }));
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
