import { heightShade, shadeHex } from './heightShade.ts';
import { GAME_CONTENT, mapScenery, pointsOfInterest, TILE_KINDS, type Facing, type MapSceneryKind, type PointOfInterest, type TilePoint } from '@containment/shared';
import type { WorldState } from '../state/worldState.ts';
import { h } from '../ui/dom.ts';
import type { ClickTone } from './clickIndicator.ts';
import { settingsIcon } from './panelIcons.ts';
import { drawPoiIcon } from './poiIcons.ts';

const BASE_PIXELS_PER_TILE = 7;
const PIXELS_PER_TILE = 4.5;
const MAP_WIDTH = 256;
const MAP_HEIGHT = 224;
const HALF_WIDTH = MAP_WIDTH / 2;
const HALF_HEIGHT = MAP_HEIGHT / 2;
const EDGE_INSET = 3;
const DESTINATION_STALL_MS = 1500;
const INTERACT_REACH_TILES = 1.5;
const ICON_SIZE = 11;
const RESOURCE_ICON_SIZE = 8;
const DESTINATION_COLORS: Readonly<Record<ClickTone, string>> = { walk: '#ffd23f', interact: '#ff5e3a' };

const TILE_COLORS: Partial<Record<string, string>> = {
  wall: '#5d7180',
  glass: '#7fe7ff',
  coolant: '#2a8fb8',
  hazard: '#a88417',
  door: '#c9a227',
  carpet: '#3a3150',
  terrazzo: '#4a4c4e',
  ceramic: '#5a666c',
  boards: '#4a3a2a',
  track: '#2a2420',
  cliff: '#6a6258',
};

const SCENERY_COLORS: Readonly<Record<MapSceneryKind, string>> = {
  deck: '#2b3a44',
  fixture: '#4f8a96',
  obstacle: '#43525c',
  loose: '#3a4a54',
};

function paintScenery(context: CanvasRenderingContext2D, kind: MapSceneryKind, position: TilePoint): void {
  const size = BASE_PIXELS_PER_TILE;
  const left = position.x * size;
  const top = position.y * size;
  context.fillStyle = SCENERY_COLORS[kind];
  if (kind === 'deck') context.fillRect(left, top, size, size);
  else if (kind === 'loose') context.fillRect(left + 2, top + 2, size - 4, size - 4);
  else {
    context.fillRect(left + 0.5, top + 0.5, size - 1, size - 1);
    if (kind === 'fixture') {
      context.fillStyle = '#0b1014';
      context.fillRect(left + 2.5, top + 2.5, size - 5, size - 5);
    }
  }
}

function insideMap(x: number, y: number, margin: number): boolean {
  return Math.abs(x) <= HALF_WIDTH - EDGE_INSET - margin && Math.abs(y) <= HALF_HEIGHT - EDGE_INSET - margin;
}

function clampToEdge(x: number, y: number, margin: number): { readonly x: number; readonly y: number; readonly clamped: boolean } {
  const reach = Math.max(Math.abs(x) / (HALF_WIDTH - EDGE_INSET - margin), Math.abs(y) / (HALF_HEIGHT - EDGE_INSET - margin));
  if (reach <= 1) return { x, y, clamped: false };
  return { x: x / reach, y: y / reach, clamped: true };
}

const FACING_ANGLE: Readonly<Record<Facing, number>> = { north: -Math.PI / 2, east: 0, south: Math.PI / 2, west: Math.PI };

interface MapView {
  readonly centerX: number;
  readonly centerY: number;
  readonly rotation: number;
}

interface Destination {
  readonly tile: TilePoint;
  readonly tone: ClickTone;
  readonly setAt: number;
}

export class Minimap {
  readonly element: HTMLElement;
  private readonly canvas = h('canvas', { className: 'minimap-canvas' });
  private readonly title = h('div', { className: 'minimap-title' });
  private readonly world: WorldState;
  private base: HTMLCanvasElement | null = null;
  private view: MapView = { centerX: 0, centerY: 0, rotation: 0 };
  private destination: Destination | null = null;
  private points: readonly PointOfInterest[] = [];

  constructor(world: WorldState, onSelectTile: (tile: TilePoint, clientX: number, clientY: number) => void, onOpenMap: () => void, onOpenSettings: () => void) {
    this.world = world;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = MAP_WIDTH * ratio;
    this.canvas.height = MAP_HEIGHT * ratio;
    const mapButton = h('button', { className: 'minimap-open-map', type: 'button', title: 'World map (M)', ariaLabel: 'Open the world map', onclick: onOpenMap }, 'Map');
    const settingsButton = h('button', { className: 'minimap-open-map minimap-settings', type: 'button', title: 'Settings', ariaLabel: 'Open settings', onclick: onOpenSettings }, settingsIcon());
    this.element = h('div', { className: 'hud-minimap panel' }, h('div', { className: 'minimap-header' }, this.title, mapButton, settingsButton), h('div', { className: 'minimap-frame' }, this.canvas));
    this.canvas.onclick = (event) => {
      const bounds = this.canvas.getBoundingClientRect();
      const offsetX = ((event.clientX - bounds.left) / bounds.width) * MAP_WIDTH - HALF_WIDTH;
      const offsetY = ((event.clientY - bounds.top) / bounds.height) * MAP_HEIGHT - HALF_HEIGHT;
      if (!insideMap(offsetX, offsetY, 0)) return;
      const cos = Math.cos(-this.view.rotation);
      const sin = Math.sin(-this.view.rotation);
      const mapX = (offsetX * cos - offsetY * sin) / PIXELS_PER_TILE + this.view.centerX;
      const mapY = (offsetX * sin + offsetY * cos) / PIXELS_PER_TILE + this.view.centerY;
      onSelectTile({ x: Math.round(mapX), y: Math.round(mapY) }, event.clientX, event.clientY);
    };
  }

  refreshTitle(): void {
    const name = this.world.currentDistrict()?.name ?? this.world.zone?.definition.name ?? '';
    this.title.textContent = this.world.layer > 1 ? `${name} · L${this.world.layer}` : name;
  }

  setDestination(tile: TilePoint, tone: ClickTone): void {
    this.destination = { tile, tone, setAt: performance.now() };
  }

  rebuild(): void {
    this.destination = null;
    const zone = this.world.zone;
    if (!zone) return;
    this.refreshTitle();
    const base = document.createElement('canvas');
    base.width = zone.layout.width * BASE_PIXELS_PER_TILE;
    base.height = zone.layout.height * BASE_PIXELS_PER_TILE;
    const context = base.getContext('2d') as CanvasRenderingContext2D;
    for (let y = 0; y < zone.layout.height; y++) {
      for (let x = 0; x < zone.layout.width; x++) {
        const kind = zone.layout.tileAt({ x, y });
        if (kind === 'void') continue;
        context.fillStyle = shadeHex(TILE_COLORS[kind] ?? (TILE_KINDS[kind].walkable ? '#1f2d36' : '#0b1014'), heightShade(zone.layout, x, y));
        context.fillRect(x * BASE_PIXELS_PER_TILE, y * BASE_PIXELS_PER_TILE, BASE_PIXELS_PER_TILE, BASE_PIXELS_PER_TILE);
      }
    }
    for (const { kind, position } of mapScenery(zone.definition, GAME_CONTENT.worldObjects)) paintScenery(context, kind, position);
    this.base = base;
    this.points = pointsOfInterest(zone.definition, GAME_CONTENT).sort((a, b) => Number(b.kind === 'gathering') - Number(a.kind === 'gathering'));
  }

  render(now: number, cameraHeading: number): void {
    const base = this.base;
    const self = this.world.selfEntity;
    if (!base || !self) return;
    const context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    const ratio = this.canvas.width / MAP_WIDTH;
    const position = this.world.renderPosition(self, now);
    const forwardAngle = Math.atan2(-Math.cos(cameraHeading), -Math.sin(cameraHeading));
    const rotation = -Math.PI / 2 - forwardAngle;
    this.view = { centerX: position.x, centerY: position.y, rotation };

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#020406';
    context.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.paintWorld(context, base, position, rotation, now, self.id);
    this.paintPointsOfInterest(context, position, rotation);
    this.paintVignette(context);
    this.settleDestination(position, now);
    if (this.destination) this.paintDestination(context, this.destination, position, rotation);
    this.paintViewCone(context);
    this.paintSelfArrow(context, rotation + FACING_ANGLE[self.facing]);
    this.paintNorth(context, rotation);
    this.paintFrame(context);
  }

  private paintWorld(context: CanvasRenderingContext2D, base: HTMLCanvasElement, position: TilePoint, rotation: number, now: number, selfId: string): void {
    const scale = PIXELS_PER_TILE / BASE_PIXELS_PER_TILE;
    const pixel = 1 / scale;
    context.save();
    context.translate(HALF_WIDTH, HALF_HEIGHT);
    context.rotate(rotation);
    context.scale(scale, scale);
    context.translate(-(position.x + 0.5) * BASE_PIXELS_PER_TILE, -(position.y + 0.5) * BASE_PIXELS_PER_TILE);
    context.imageSmoothingEnabled = true;
    context.drawImage(base, 0, 0);

    for (const item of this.world.groundItems.values()) {
      const size = 3 * pixel;
      context.fillStyle = item.owned ? '#ffd23f' : '#ff5e3a';
      context.fillRect((item.position.x + 0.5) * BASE_PIXELS_PER_TILE - size / 2, (item.position.y + 0.5) * BASE_PIXELS_PER_TILE - size / 2, size, size);
    }
    context.lineWidth = pixel;
    context.strokeStyle = 'rgba(2, 4, 6, 0.9)';
    for (const entity of this.world.entities.values()) {
      if (entity.id === selfId || entity.dyingAt !== null) continue;
      const point = this.world.renderPosition(entity, now);
      context.fillStyle = entity.kind === 'creature' ? '#ff5e5e' : entity.kind === 'npc' ? '#ffd23f' : '#ffffff';
      context.beginPath();
      context.arc((point.x + 0.5) * BASE_PIXELS_PER_TILE, (point.y + 0.5) * BASE_PIXELS_PER_TILE, 2.4 * pixel, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    context.restore();
  }

  private paintPointsOfInterest(context: CanvasRenderingContext2D, position: TilePoint, rotation: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    for (const point of this.points) {
      const dx = (point.position.x - position.x) * PIXELS_PER_TILE;
      const dy = (point.position.y - position.y) * PIXELS_PER_TILE;
      const size = point.kind === 'gathering' ? RESOURCE_ICON_SIZE : ICON_SIZE;
      const x = dx * cos - dy * sin;
      const y = dx * sin + dy * cos;
      if (!insideMap(x, y, size / 2)) continue;
      drawPoiIcon(context, point.kind, HALF_WIDTH + x, HALF_HEIGHT + y, size);
    }
  }

  private paintVignette(context: CanvasRenderingContext2D): void {
    const gradient = context.createRadialGradient(HALF_WIDTH, HALF_HEIGHT, HALF_HEIGHT * 0.6, HALF_WIDTH, HALF_HEIGHT, HALF_WIDTH * 1.4);
    gradient.addColorStop(0, 'rgba(2, 4, 6, 0)');
    gradient.addColorStop(1, 'rgba(2, 4, 6, 0.75)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  }

  private settleDestination(position: TilePoint, now: number): void {
    const destination = this.destination;
    const self = this.world.selfEntity;
    if (!destination || !self) return;
    const moving = this.world.isMoving(self, now);
    const distance = Math.hypot(position.x - destination.tile.x, position.y - destination.tile.y);
    const reach = destination.tone === 'walk' ? 0.05 : INTERACT_REACH_TILES;
    const arrived = !moving && distance <= reach;
    const stalled = !moving && now - Math.max(destination.setAt, this.world.motionEndsAt(self)) > DESTINATION_STALL_MS;
    if (arrived || stalled) this.destination = null;
  }

  private paintDestination(context: CanvasRenderingContext2D, destination: Destination, position: TilePoint, rotation: number): void {
    const dx = (destination.tile.x - position.x) * PIXELS_PER_TILE;
    const dy = (destination.tile.y - position.y) * PIXELS_PER_TILE;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const { x, y } = clampToEdge(dx * cos - dy * sin, dx * sin + dy * cos, 10);
    const color = DESTINATION_COLORS[destination.tone];
    context.save();
    context.translate(HALF_WIDTH + x, HALF_HEIGHT + y);
    context.fillStyle = 'rgba(0, 0, 0, 0.55)';
    context.beginPath();
    context.ellipse(0, 0, 3.5, 1.6, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#e8f4f8';
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, -12);
    context.stroke();
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 5;
    context.beginPath();
    context.moveTo(0.6, -12);
    context.lineTo(9, -9);
    context.lineTo(0.6, -6);
    context.closePath();
    context.fill();
    context.restore();
  }

  private paintViewCone(context: CanvasRenderingContext2D): void {
    const reach = HALF_HEIGHT * 0.75;
    const gradient = context.createRadialGradient(HALF_WIDTH, HALF_HEIGHT, 0, HALF_WIDTH, HALF_HEIGHT, reach);
    gradient.addColorStop(0, 'rgba(79, 216, 255, 0.22)');
    gradient.addColorStop(1, 'rgba(79, 216, 255, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(HALF_WIDTH, HALF_HEIGHT);
    context.arc(HALF_WIDTH, HALF_HEIGHT, reach, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    context.closePath();
    context.fill();
  }

  private paintSelfArrow(context: CanvasRenderingContext2D, angle: number): void {
    context.save();
    context.translate(HALF_WIDTH, HALF_HEIGHT);
    context.rotate(angle);
    context.beginPath();
    context.moveTo(8, 0);
    context.lineTo(-6, -6);
    context.lineTo(-2.5, 0);
    context.lineTo(-6, 6);
    context.closePath();
    context.lineJoin = 'round';
    context.lineWidth = 2.5;
    context.strokeStyle = '#020406';
    context.stroke();
    context.fillStyle = '#4fd8ff';
    context.shadowColor = '#4fd8ff';
    context.shadowBlur = 8;
    context.fill();
    context.restore();
  }

  private paintNorth(context: CanvasRenderingContext2D, rotation: number): void {
    const angle = rotation - Math.PI / 2;
    const { x, y } = clampToEdge(Math.cos(angle) * MAP_WIDTH, Math.sin(angle) * MAP_WIDTH, 9);
    context.fillStyle = 'rgba(3, 8, 11, 0.9)';
    context.strokeStyle = 'rgba(255, 94, 94, 0.6)';
    context.lineWidth = 1;
    context.beginPath();
    context.arc(HALF_WIDTH + x, HALF_HEIGHT + y, 8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = '#ff5e5e';
    context.font = '700 10px "Chakra Petch", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('N', HALF_WIDTH + x, HALF_HEIGHT + y + 0.5);
  }

  private paintFrame(context: CanvasRenderingContext2D): void {
    context.strokeStyle = 'rgba(79, 216, 255, 0.28)';
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, MAP_WIDTH - 1, MAP_HEIGHT - 1);
    const arm = 12;
    context.strokeStyle = 'rgba(79, 216, 255, 0.85)';
    context.lineWidth = 2;
    context.beginPath();
    for (const [x, y, sx, sy] of [[1, 1, 1, 1], [MAP_WIDTH - 1, 1, -1, 1], [1, MAP_HEIGHT - 1, 1, -1], [MAP_WIDTH - 1, MAP_HEIGHT - 1, -1, -1]] as const) {
      context.moveTo(x, y + sy * arm);
      context.lineTo(x, y);
      context.lineTo(x + sx * arm, y);
    }
    context.stroke();
  }
}
