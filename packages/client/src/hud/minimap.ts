import { GAME_CONTENT, mapScenery, pointsOfInterest, TILE_KINDS, type Facing, type MapSceneryKind, type PointOfInterest, type TilePoint } from '@containment/shared';
import type { WorldState } from '../state/worldState.ts';
import { h } from '../ui/dom.ts';
import type { ClickTone } from './clickIndicator.ts';
import { settingsIcon } from './panelIcons.ts';
import { drawPoiIcon } from './poiIcons.ts';

const PIXELS_PER_TILE = 7;
const MAP_SIZE = 220;
const MAP_RADIUS = MAP_SIZE / 2 - 4;
const DESTINATION_STALL_MS = 1500;
const INTERACT_REACH_TILES = 1.5;
const LABEL_RIM_INSET = 14;
const LABEL_VISIBLE_TILES = 140;
const ICON_SIZE = 12;
const RESOURCE_ICON_SIZE = 9;
const DESTINATION_COLORS: Readonly<Record<ClickTone, string>> = { walk: '#ffd23f', interact: '#ff5e3a' };

const TILE_COLORS: Partial<Record<string, string>> = {
  wall: '#5d7180',
  glass: '#7fe7ff',
  coolant: '#2a8fb8',
  hazard: '#a88417',
  door: '#c9a227',
  carpet: '#3a3150',
  terrazzo: '#4a4c4e',
  track: '#2a2420',
};

const SCENERY_COLORS: Readonly<Record<MapSceneryKind, string>> = {
  deck: '#2b3a44',
  fixture: '#4f8a96',
  obstacle: '#43525c',
  loose: '#3a4a54',
};

function paintScenery(context: CanvasRenderingContext2D, kind: MapSceneryKind, position: TilePoint): void {
  const left = position.x * PIXELS_PER_TILE;
  const top = position.y * PIXELS_PER_TILE;
  context.fillStyle = SCENERY_COLORS[kind];
  if (kind === 'deck') context.fillRect(left, top, PIXELS_PER_TILE, PIXELS_PER_TILE);
  else if (kind === 'loose') context.fillRect(left + 2, top + 2, PIXELS_PER_TILE - 4, PIXELS_PER_TILE - 4);
  else {
    context.fillRect(left + 0.5, top + 0.5, PIXELS_PER_TILE - 1, PIXELS_PER_TILE - 1);
    if (kind === 'fixture') {
      context.fillStyle = '#0b1014';
      context.fillRect(left + 2.5, top + 2.5, PIXELS_PER_TILE - 5, PIXELS_PER_TILE - 5);
    }
  }
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
    this.canvas.width = MAP_SIZE * ratio;
    this.canvas.height = MAP_SIZE * ratio;
    const mapButton = h('button', { className: 'minimap-open-map', type: 'button', title: 'World map (M)', ariaLabel: 'Open the world map', onclick: onOpenMap }, 'Map');
    const settingsButton = h('button', { className: 'minimap-open-map minimap-settings', type: 'button', title: 'Settings', ariaLabel: 'Open settings', onclick: onOpenSettings }, settingsIcon());
    this.element = h('div', { className: 'hud-minimap panel' }, h('div', { className: 'minimap-header' }, this.title, mapButton, settingsButton), h('div', { className: 'minimap-frame' }, this.canvas));
    this.canvas.onclick = (event) => {
      const bounds = this.canvas.getBoundingClientRect();
      const scale = MAP_SIZE / bounds.width;
      const offsetX = (event.clientX - bounds.left) * scale - MAP_SIZE / 2;
      const offsetY = (event.clientY - bounds.top) * scale - MAP_SIZE / 2;
      if (Math.hypot(offsetX, offsetY) > MAP_RADIUS) return;
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
    base.width = zone.layout.width * PIXELS_PER_TILE;
    base.height = zone.layout.height * PIXELS_PER_TILE;
    const context = base.getContext('2d') as CanvasRenderingContext2D;
    for (let y = 0; y < zone.layout.height; y++) {
      for (let x = 0; x < zone.layout.width; x++) {
        const kind = zone.layout.tileAt({ x, y });
        if (kind === 'void') continue;
        context.fillStyle = TILE_COLORS[kind] ?? (TILE_KINDS[kind].walkable ? '#1f2d36' : '#0b1014');
        context.fillRect(x * PIXELS_PER_TILE, y * PIXELS_PER_TILE, PIXELS_PER_TILE, PIXELS_PER_TILE);
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
    const ratio = this.canvas.width / MAP_SIZE;
    const position = this.world.renderPosition(self, now);
    const forwardAngle = Math.atan2(-Math.cos(cameraHeading), -Math.sin(cameraHeading));
    const rotation = -Math.PI / 2 - forwardAngle;
    this.view = { centerX: position.x, centerY: position.y, rotation };

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    context.save();
    context.beginPath();
    context.arc(MAP_SIZE / 2, MAP_SIZE / 2, MAP_RADIUS, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = '#020406';
    context.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    context.translate(MAP_SIZE / 2, MAP_SIZE / 2);
    context.rotate(rotation);
    context.translate(-(position.x + 0.5) * PIXELS_PER_TILE, -(position.y + 0.5) * PIXELS_PER_TILE);
    context.drawImage(base, 0, 0);

    for (const item of this.world.groundItems.values()) {
      context.fillStyle = item.owned ? '#ffd23f' : '#ff5e3a';
      context.fillRect(item.position.x * PIXELS_PER_TILE + 2, item.position.y * PIXELS_PER_TILE + 2, 3, 3);
    }
    for (const entity of this.world.entities.values()) {
      if (entity.id === self.id || entity.dyingAt !== null) continue;
      const point = this.world.renderPosition(entity, now);
      context.fillStyle = entity.kind === 'creature' ? '#ff5e5e' : entity.kind === 'npc' ? '#ffd23f' : '#ffffff';
      context.beginPath();
      context.arc((point.x + 0.5) * PIXELS_PER_TILE, (point.y + 0.5) * PIXELS_PER_TILE, 2.6, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    this.paintPointsOfInterest(context, position, rotation);
    this.paintDistrictLabels(context, position, rotation);
    this.settleDestination(position, now);
    if (this.destination) this.paintDestination(context, this.destination, position, rotation);
    this.paintSelfArrow(context, rotation + FACING_ANGLE[self.facing]);
    this.paintNorth(context, rotation);
    context.strokeStyle = 'rgba(79, 216, 255, 0.45)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(MAP_SIZE / 2, MAP_SIZE / 2, MAP_RADIUS, 0, Math.PI * 2);
    context.stroke();
  }

  private paintDistrictLabels(context: CanvasRenderingContext2D, position: TilePoint, rotation: number): void {
    const level = this.world.zone?.definition;
    if (!level) return;
    const current = this.world.currentDistrict()?.id;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    context.save();
    context.font = '600 8px "Chakra Petch", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const { districtId, rect } of level.districts) {
      if (districtId === current) continue;
      const name = GAME_CONTENT.districts.get(districtId)?.name;
      if (!name) continue;
      const dx = (rect.x + rect.width / 2 - position.x) * PIXELS_PER_TILE;
      const dy = (rect.y + rect.height / 2 - position.y) * PIXELS_PER_TILE;
      const length = Math.hypot(dx, dy);
      if (length / PIXELS_PER_TILE > LABEL_VISIBLE_TILES) continue;
      const scale = Math.min(1, (MAP_RADIUS - LABEL_RIM_INSET) / Math.max(1, length));
      const x = MAP_SIZE / 2 + (dx * cos - dy * sin) * scale;
      const y = MAP_SIZE / 2 + (dx * sin + dy * cos) * scale;
      const label = name.toUpperCase();
      const width = context.measureText(label).width + 8;
      const labelX = Math.min(MAP_SIZE - width / 2 - 2, Math.max(width / 2 + 2, x));
      context.fillStyle = scale < 1 ? 'rgba(3, 8, 11, 0.82)' : 'rgba(3, 8, 11, 0.55)';
      context.fillRect(labelX - width / 2, y - 6, width, 12);
      context.fillStyle = scale < 1 ? '#9fd8ff' : 'rgba(232, 244, 248, 0.75)';
      context.fillText(label, labelX, y + 0.5);
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
      if (Math.hypot(dx, dy) > MAP_RADIUS - size / 2) continue;
      drawPoiIcon(context, point.kind, MAP_SIZE / 2 + dx * cos - dy * sin, MAP_SIZE / 2 + dx * sin + dy * cos, size);
    }
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
    let x = dx * cos - dy * sin;
    let y = dx * sin + dy * cos;
    const edge = MAP_RADIUS - 8;
    const length = Math.hypot(x, y);
    if (length > edge) {
      x = (x / length) * edge;
      y = (y / length) * edge;
    }
    const color = DESTINATION_COLORS[destination.tone];
    context.save();
    context.translate(MAP_SIZE / 2 + x, MAP_SIZE / 2 + y);
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

  private paintSelfArrow(context: CanvasRenderingContext2D, angle: number): void {
    context.save();
    context.translate(MAP_SIZE / 2, MAP_SIZE / 2);
    context.rotate(angle);
    context.fillStyle = '#4fd8ff';
    context.shadowColor = '#4fd8ff';
    context.shadowBlur = 6;
    context.beginPath();
    context.moveTo(7, 0);
    context.lineTo(-5, -5);
    context.lineTo(-2, 0);
    context.lineTo(-5, 5);
    context.closePath();
    context.fill();
    context.restore();
  }

  private paintNorth(context: CanvasRenderingContext2D, rotation: number): void {
    const angle = rotation - Math.PI / 2;
    const x = MAP_SIZE / 2 + Math.cos(angle) * (MAP_RADIUS - 9);
    const y = MAP_SIZE / 2 + Math.sin(angle) * (MAP_RADIUS - 9);
    context.fillStyle = 'rgba(3, 8, 11, 0.85)';
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ff5e5e';
    context.font = '700 10px "Chakra Petch", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('N', x, y + 0.5);
  }
}
