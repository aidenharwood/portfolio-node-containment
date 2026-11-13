import { CHUNK_SIZE, GAME_CONTENT, type TilePoint } from '@containment/shared';
import { Group, Mesh, MeshBasicMaterial, MathUtils, PerspectiveCamera, Plane, PlaneGeometry, Raycaster, Scene, Vector2, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SceneLook } from '../render/sceneLook.ts';
import { ActorLayer } from './actorLayer.ts';
import { EditOverlay } from './editOverlay.ts';
import { actorsOf } from './actorSpecs.ts';
import { createBlendedAmbience, sampleAmbience } from '../render/world/ambienceBlend.ts';
import { LevelScene, type StreamReach } from '../render/world/levelScene.ts';
import type { ActiveZone } from '../state/worldState.ts';

export interface CameraState {
  readonly yaw: number;
  readonly pitch: number;
  readonly zoom: number;
  readonly focus?: TilePoint;
}

const GAME_ANGLE = { yaw: 45, pitch: 52 } as const;
const BASE_DISTANCE = 11;
const PREVIEW_FOG = 0.006;
const BUILD_BUDGET_MS = 12;
const NOTHING: ReadonlySet<string> = new Set();
const MAX_REACH = 8;
const CLICK_SLOP_PX = 4;
const GROUND = new Plane(new Vector3(0, 1, 0), 0);

export interface EditPointer {
  down(tile: TilePoint, event: PointerEvent): boolean;
  move(tile: TilePoint): void;
  up(tile: TilePoint): void;
  click(tile: TilePoint, event: PointerEvent): void;
  hover(tile: TilePoint | null): void;
}

export class PreviewView {
  private readonly canvas = document.createElement('canvas');
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(40, 1, 0.1, 2000);
  private readonly sceneLook: SceneLook;
  private readonly controls: OrbitControls;
  private readonly ambience = createBlendedAmbience();
  private readonly issueMarkers = new Group();
  private readonly actors = new ActorLayer();
  private readonly issueGeometry = new PlaneGeometry(1, 1);
  private readonly issueMaterial = new MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false });
  private level: LevelScene | null = null;
  private zone: ActiveZone | null = null;
  private reach: StreamReach = { build: 1, retain: 2 };
  private listeners: ((state: CameraState) => void)[] = [];
  private frame = 0;
  private lastFrame = performance.now();
  private readonly resizeObserver: ResizeObserver;
  readonly overlay = new EditOverlay();
  private readonly raycaster = new Raycaster();
  private editPointer: EditPointer | null = null;
  private claimed = false;
  private press: { x: number; y: number } | null = null;
  private frameListeners: (() => void)[] = [];
  private queuedZone: (() => ActiveZone) | null = null;
  private hidden: string | null = null;

  constructor(container: HTMLElement) {
    this.canvas.style.cssText = 'width:100%;height:100%;display:block';
    container.append(this.canvas);
    this.sceneLook = new SceneLook(this.canvas, this.scene, this.camera, PREVIEW_FOG);
    this.scene.add(this.issueMarkers, this.actors.root, this.overlay.root);
    this.listenForEdits(container);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 600;
    this.controls.maxPolarAngle = MathUtils.degToRad(87);
    this.controls.screenSpacePanning = false;
    this.controls.addEventListener('end', () => {
      const state = this.cameraState();
      for (const listener of this.listeners) listener(state);
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    const loop = (now: number): void => {
      this.frame = requestAnimationFrame(loop);
      this.tick(now);
    };
    this.frame = requestAnimationFrame(loop);
  }

  show(zone: ActiveZone): void {
    if (this.level) {
      this.scene.remove(this.level.root);
      this.level.dispose();
    }
    this.zone = zone;
    this.actors.show(actorsOf(GAME_CONTENT, zone.definition));
    this.level = new LevelScene(zone, { editable: true });
    this.scene.add(this.level.root);
    this.sceneLook.resetLights();
    const span = Math.min(MAX_REACH, Math.ceil(Math.max(zone.layout.width, zone.layout.height) / CHUNK_SIZE) + 1);
    this.reach = { build: span, retain: span };
  }

  hideObject(instanceId: string | null): void {
    if (instanceId === this.hidden) return;
    const shown = this.hidden ? this.level?.objects.get(this.hidden) : undefined;
    if (shown) shown.group.visible = true;
    this.hidden = instanceId;
    const hiding = instanceId ? this.level?.objects.get(instanceId) : undefined;
    if (hiding) hiding.group.visible = false;
  }

  queueUpdate(zone: () => ActiveZone): void {
    this.queuedZone = zone;
  }

  update(zone: ActiveZone): boolean {
    const level = this.level;
    if (!level || !level.canPatch(zone)) {
      this.show(zone);
      return false;
    }
    this.zone = zone;
    this.actors.show(actorsOf(GAME_CONTENT, zone.definition));
    level.patch(zone);
    return true;
  }

  look(state: CameraState): void {
    const zone = this.zone;
    const focus = state.focus ?? (zone ? { x: Math.floor(zone.layout.width / 2), y: Math.floor(zone.layout.height / 2) } : { x: 0, y: 0 });
    const target = new Vector3(focus.x, 0, focus.y);
    const distance = BASE_DISTANCE / state.zoom;
    const yaw = MathUtils.degToRad(state.yaw);
    const pitch = MathUtils.degToRad(state.pitch);
    const horizontal = Math.cos(pitch) * distance;
    this.controls.target.copy(target);
    this.camera.position.set(target.x + Math.sin(yaw) * horizontal, target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * horizontal);
    this.controls.update();
    this.sampleAmbience();
  }

  gameAngle(): void {
    const state = this.cameraState();
    this.look({ ...state, yaw: GAME_ANGLE.yaw, pitch: GAME_ANGLE.pitch, zoom: 1 });
    for (const listener of this.listeners) listener(this.cameraState());
  }

  showActors(on: boolean): void {
    this.actors.setVisible(on);
  }

  markIssues(tiles: readonly TilePoint[]): void {
    this.issueMarkers.clear();
    for (const tile of tiles) {
      const marker = new Mesh(this.issueGeometry, this.issueMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(tile.x, 0.06, tile.y);
      this.issueMarkers.add(marker);
    }
  }

  setSurvey(on: boolean): void {
    this.sceneLook.setSurvey(on);
  }

  setEditPointer(pointer: EditPointer | null): void {
    this.editPointer = pointer;
    if (!pointer) this.overlay.showGhost(null, true);
  }

  tileAt(clientX: number, clientY: number): TilePoint | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const pointer = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    const hit = this.raycaster.ray.intersectPlane(GROUND, new Vector3());
    return hit ? { x: Math.round(hit.x), y: Math.round(hit.z) } : null;
  }

  project(point: { x: number; y: number; z: number }): { x: number; y: number; visible: boolean } {
    const projected = new Vector3(point.x, point.y, point.z).project(this.camera);
    return {
      x: ((projected.x + 1) / 2) * this.canvas.clientWidth,
      y: ((1 - projected.y) / 2) * this.canvas.clientHeight,
      visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) <= 1.05 && Math.abs(projected.y) <= 1.05,
    };
  }

  onFrame(listener: () => void): void {
    this.frameListeners.push(listener);
  }

  onCamera(listener: (state: CameraState) => void): void {
    this.listeners.push(listener);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.actors.dispose();
    this.issueGeometry.dispose();
    this.issueMaterial.dispose();
    this.overlay.dispose();
    this.level?.dispose();
    this.sceneLook.dispose();
  }

  private listenForEdits(container: HTMLElement): void {
    container.addEventListener(
      'pointerdown',
      (event) => {
        const pointer = this.editPointer;
        if (!pointer || event.button !== 0 || event.target !== this.canvas) return;
        const tile = this.tileAt(event.clientX, event.clientY);
        if (!tile) return;
        if (pointer.down(tile, event)) {
          event.stopPropagation();
          this.canvas.setPointerCapture(event.pointerId);
          this.claimed = true;
          this.controls.enabled = false;
          return;
        }
        this.press = { x: event.clientX, y: event.clientY };
      },
      { capture: true },
    );
    this.canvas.addEventListener('pointermove', (event) => {
      const pointer = this.editPointer;
      if (!pointer) return;
      const tile = this.tileAt(event.clientX, event.clientY);
      if (this.claimed) {
        if (tile) pointer.move(tile);
        return;
      }
      if (this.press && Math.abs(event.clientX - this.press.x) + Math.abs(event.clientY - this.press.y) > CLICK_SLOP_PX) this.press = null;
      pointer.hover(event.buttons === 0 ? tile : null);
    });
    this.canvas.addEventListener('pointerleave', () => this.editPointer?.hover(null));
    window.addEventListener('pointerup', (event) => {
      const pointer = this.editPointer;
      const press = this.press;
      this.press = null;
      if (!pointer) return;
      const tile = this.tileAt(event.clientX, event.clientY);
      if (this.claimed) {
        this.claimed = false;
        this.controls.enabled = true;
        if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
        if (tile) pointer.up(tile);
        return;
      }
      if (press && tile && event.target === this.canvas) pointer.click(tile, event);
    });
  }

  private cameraState(): CameraState {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = offset.length();
    const target = this.controls.target;
    return {
      yaw: Math.round(MathUtils.radToDeg(Math.atan2(offset.x, offset.z)) * 10) / 10,
      pitch: Math.round(MathUtils.radToDeg(Math.asin(offset.y / distance)) * 10) / 10,
      zoom: Math.round((BASE_DISTANCE / distance) * 1000) / 1000,
      focus: { x: Math.round(target.x), y: Math.round(target.z) },
    };
  }

  private sampleAmbience(): void {
    if (!this.zone) return;
    const target = this.controls.target;
    sampleAmbience(this.zone.definition, { x: Math.round(target.x), y: Math.round(target.z) }, this.ambience);
    this.sceneLook.applyAmbience(this.ambience);
  }

  private resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.sceneLook.resize(width, height);
  }

  private tick(now: number): void {
    const queued = this.queuedZone;
    this.queuedZone = null;
    if (queued) this.update(queued());
    const delta = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (!this.level || this.canvas.clientWidth === 0) return;
    this.controls.update();
    const target = this.controls.target;
    const time = now / 1000;
    this.level.stream({ x: target.x, y: target.z }, BUILD_BUDGET_MS, this.reach);
    this.level.update(time, NOTHING, NOTHING, NOTHING, { open: NOTHING, self: null });
    this.actors.update(time);
    this.level.updateCutaway(this.camera.position, target);
    this.sceneLook.aimKeyLight(target);
    this.sceneLook.updateLights(this.level.lights, delta, time, target);
    this.sceneLook.render(this.camera, delta);
    for (const listener of this.frameListeners) listener();
  }
}
