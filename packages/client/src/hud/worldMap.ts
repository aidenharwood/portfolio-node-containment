import {
  trackedQuest,
  GAME_CONTENT,
  salvageGuide,
  linesThrough,
  objectiveDistricts,
  POINT_OF_INTEREST_KINDS,
  pointsOfInterest,
  stationAt,
  TILE_KINDS,
  TRAM_BOARDING_TICKS,
  tramBoardingRefusal,
  tramRideTicks,
  tramStops,
  type DistrictId,
  type LevelId,
  type PointOfInterest,
  type PointOfInterestKind,
  type ResolvedLevel,
  type TilePoint,
  type TramStation,
  type TramStationId,
} from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import type { GuidanceTracking } from '../state/guidanceTracking.ts';
import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { drawPoiIcon, poiLegend } from './poiIcons.ts';

const MAP_PADDING = 24;
const MOUSE_HIT_RADIUS = 14;
const TOUCH_HIT_RADIUS = 24;
const TAP_SLOP = 8;
const MAX_SCALE = 28;
const READABLE_SCALE = 5;
const ZOOM_STEP = 1.4;
const OBJECTIVE_COLOR = '#ffb347';
const UNCHARTED_COLOR = '#0e161b';
const ICON_SIZE = 18;
const RESOURCE_ICON_SIZE = 13;
const ICON_LABEL_SCALE = 10;

type MapMode = 'map' | 'transit';

interface StationHit {
  readonly station: TramStation;
  readonly x: number;
  readonly y: number;
}

interface MapFrame {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

interface MapView {
  scale: number;
  centreX: number;
  centreY: number;
}

interface PointerTrack {
  x: number;
  y: number;
  readonly startX: number;
  readonly startY: number;
}

const SALVAGE_GUIDE = salvageGuide(GAME_CONTENT);

const levelOrder = (a: ResolvedLevel, b: ResolvedLevel): number =>
  (a.definition.kind === b.definition.kind ? 0 : a.definition.kind === 'floor' ? -1 : 1) || b.definition.depth - a.definition.depth;

const levelDepthLabel = (level: ResolvedLevel): string => (level.definition.kind === 'pocket' ? 'Pocket' : `Level ${level.definition.depth}`);

export class WorldMap {
  readonly element = h('section', { className: 'world-map', hidden: true, role: 'dialog', ariaLabel: 'World map' });
  private readonly canvas = h('canvas', { className: 'world-map-canvas' });
  private readonly connection: GameConnection;
  private readonly world: WorldState;
  private readonly questTracking: GuidanceTracking;
  private readonly unsubscribers: (() => void)[];
  private readonly pointers = new Map<number, PointerTrack>();
  private readonly resizeObserver: ResizeObserver;
  private open = false;
  private mode: MapMode = 'map';
  private shownLevelId: LevelId | null = null;
  private openedAtStationId: TramStationId | null = null;
  private stationHits: StationHit[] = [];
  private view: MapView | null = null;
  private pinchDistance: number | null = null;
  private lastPointerType = 'mouse';
  private paintQueued = false;
  private readonly levelPoints = new Map<LevelId, readonly PointOfInterest[]>();

  constructor(connection: GameConnection, world: WorldState, questTracking: GuidanceTracking) {
    this.connection = connection;
    this.world = world;
    this.questTracking = questTracking;
    this.canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
    this.canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.canvas.addEventListener('pointerup', (event) => this.pointerUp(event));
    this.canvas.addEventListener('pointercancel', (event) => this.pointers.delete(event.pointerId));
    this.canvas.addEventListener('wheel', (event) => this.wheel(event), { passive: false });
    this.resizeObserver = new ResizeObserver(() => this.queuePaint());
    this.resizeObserver.observe(this.canvas);
    this.unsubscribers = [
      connection.on('tram.mapOpened', ({ stationId }) => this.show('transit', stationId)),
      connection.on('tram.departed', () => this.hide()),
      world.on('selfChanged', () => this.render()),
      world.on('zoneChanged', () => this.hide()),
    ];
    questTracking.onChange(() => this.render());
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    if (this.open) this.hide();
    else this.show('map', null);
  }

  requestClose(): void {
    this.hide();
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  private show(mode: MapMode, stationId: TramStationId | null): void {
    this.open = true;
    this.mode = mode;
    this.openedAtStationId = stationId;
    this.shownLevelId = this.world.zone?.definition.id ?? null;
    this.view = null;
    this.element.hidden = false;
    this.element.classList.toggle('transit', mode === 'transit');
    this.render();
  }

  private hide(): void {
    this.open = false;
    this.element.hidden = true;
    this.pointers.clear();
  }

  private knows(stationId: TramStationId): boolean {
    return this.world.self?.discoveredStations.includes(stationId) ?? false;
  }

  private boardingStation(): TramStation | undefined {
    const zone = this.world.zone;
    const self = this.world.selfEntity;
    if (!zone || !self) return undefined;
    const station = stationAt(GAME_CONTENT.tram, zone.definition.id, self.to);
    return station && (this.knows(station.id) || station.id === this.openedAtStationId) ? station : undefined;
  }

  private visibleLevels(): { readonly level: ResolvedLevel; readonly charted: boolean }[] {
    const visited = new Set(this.world.self?.visitedLevels ?? []);
    const current = this.world.zone?.definition.id;
    return [...GAME_CONTENT.levels.values()]
      .sort(levelOrder)
      .map((level) => ({ level, charted: visited.has(level.id) || level.id === current }))
      .filter(({ level, charted }) => level.definition.kind === 'floor' || charted);
  }

  private objectiveDistrictIds(): Set<DistrictId> {
    const self = this.world.self;
    if (!self) return new Set();
    const resourceId = this.questTracking.resourceId;
    if (resourceId) {
      const locations = SALVAGE_GUIDE.find((entry) => entry.objectId === resourceId)?.locations ?? [];
      return new Set(locations.flatMap((location) => (location.districtId ? [location.districtId] : [])));
    }
    const quest = trackedQuest(self.quests, GAME_CONTENT.quests, this.questTracking.questId);
    return quest ? objectiveDistricts(quest.objectives, GAME_CONTENT) : new Set();
  }

  private shownLevel(): ResolvedLevel | undefined {
    const levels = this.visibleLevels();
    return levels.find(({ level, charted }) => level.id === this.shownLevelId && charted)?.level ?? this.world.zone?.definition;
  }

  private render(): void {
    if (!this.open || !this.world.self) return;
    const shown = this.shownLevel();
    if (!shown) return;
    this.shownLevelId = shown.id;
    const objectives = this.objectiveDistrictIds();
    const boarding = this.boardingStation();
    const transit = this.mode === 'transit';

    replaceChildren(
      this.element,
      h('header', { className: 'world-map-bar' },
        h('div', { className: 'world-map-title' },
          h('h3', {}, transit ? 'Hollow Bay Transit' : 'Hollow Bay'),
          h('p', { className: 'world-map-hint' }, transit && boarding ? `On the platform at ${boarding.name}` : 'Drag to pan, pinch or scroll to zoom'),
        ),
        this.levelPicker(shown, objectives),
        h('button', { className: 'dialogue-close world-map-close', type: 'button', ariaLabel: 'Close map', onclick: () => this.hide() }, '×'),
      ),
      h('div', { className: 'world-map-body' },
        h('div', { className: 'world-map-frame' },
          this.canvas,
          h('div', { className: 'world-map-zoom' },
            h('button', { type: 'button', ariaLabel: 'Zoom in', onclick: () => this.zoomBy(ZOOM_STEP) }, '+'),
            h('button', { type: 'button', ariaLabel: 'Zoom out', onclick: () => this.zoomBy(1 / ZOOM_STEP) }, '−'),
            h('button', { type: 'button', ariaLabel: 'Centre on you', title: 'Centre on you', onclick: () => this.recentre() }, '◎'),
          ),
          poiLegend(this.legendKinds(shown)),
        ),
        transit ? this.destinationList(boarding) : null,
      ),
    );
    this.queuePaint();
  }

  private pointsOn(level: ResolvedLevel): readonly PointOfInterest[] {
    const cached = this.levelPoints.get(level.id);
    if (cached) return cached;
    const points = pointsOfInterest(level, GAME_CONTENT)
      .map((point) => (point.kind === 'tram' ? { ...point, name: stationAt(GAME_CONTENT.tram, level.id, point.position)?.name ?? point.name } : point))
      .sort((a, b) => Number(b.kind === 'gathering') - Number(a.kind === 'gathering'));
    this.levelPoints.set(level.id, points);
    return points;
  }

  private chartedPoints(level: ResolvedLevel): PointOfInterest[] {
    const charted = this.chartedDistrictIds(level);
    return this.pointsOn(level).filter((point) => {
      const district = level.layout.districtAt(point.position);
      return district === undefined || charted.has(district);
    });
  }

  private legendKinds(level: ResolvedLevel): PointOfInterestKind[] {
    const present = new Set(this.chartedPoints(level).map((point) => point.kind));
    return POINT_OF_INTEREST_KINDS.filter((kind) => present.has(kind));
  }

  private levelOptions(shown: ResolvedLevel, objectives: ReadonlySet<DistrictId>): HTMLElement[] {
    const visible = this.visibleLevels();
    const option = ({ level, charted }: { readonly level: ResolvedLevel; readonly charted: boolean }) => {
      const hasObjective = charted && level.districts.some(({ districtId }) => objectives.has(districtId));
      return h('option', { value: level.id, disabled: !charted, selected: level.id === shown.id },
        `${charted ? level.name : 'Uncharted'} · ${levelDepthLabel(level)}${hasObjective ? ' · ◆ objective' : ''}`,
      );
    };
    return visible.map(option);
  }

  private levelPicker(shown: ResolvedLevel, objectives: ReadonlySet<DistrictId>): HTMLElement {
    const select = h('select', {
      className: 'world-map-level',
      ariaLabel: 'Level',
      onchange: () => {
        this.shownLevelId = select.value;
        this.view = null;
        this.render();
      },
    },
      ...this.levelOptions(shown, objectives),
    );
    return h('label', { className: 'world-map-level-field' }, h('span', { className: 'eyebrow' }, 'Level'), select);
  }

  private destinationList(boarding: TramStation | undefined): HTMLElement {
    const network = GAME_CONTENT.tram;
    const seconds = (stops: number) => Math.round(((TRAM_BOARDING_TICKS + tramRideTicks(stops)) * this.world.tickMs) / 1000);
    return h('aside', { className: 'world-map-lines', ariaLabel: 'Destinations' },
      h('p', { className: 'eyebrow' }, boarding ? 'Choose a destination' : 'Stand on a platform to ride'),
      ...(boarding ? linesThrough(network, boarding.id) : []).map((line) =>
        h('section', { className: 'world-map-line', style: { '--line-color': line.color } },
          h('h4', {}, line.name),
          h('ol', {},
            ...line.stations.map((stationId) => {
              const station = network.stations.get(stationId);
              if (!station) return null;
              if (!this.knows(stationId)) return h('li', { className: 'world-map-stop unknown' }, 'Undiscovered stop');
              const here = boarding?.id === stationId;
              const refusal = tramBoardingRefusal(network, { origin: boarding, destinationId: stationId, knowsStation: (id) => this.knows(id) });
              const stops = boarding ? tramStops(network, boarding.id, stationId) : null;
              const detail = here ? 'You are here' : stops !== null ? `${stops} ${stops === 1 ? 'stop' : 'stops'} · about ${seconds(stops)}s` : levelName(station.levelId);
              return h('li', { className: `world-map-stop${here ? ' here' : ''}` },
                h('button', {
                  type: 'button',
                  className: 'world-map-stop-button',
                  disabled: refusal !== null,
                  title: refusal ?? `Ride to ${station.name}`,
                  onclick: () => this.board(stationId),
                  onpointerenter: () => this.focusStation(station, false),
                  onfocus: () => this.focusStation(station, false),
                },
                  h('span', { className: 'world-map-stop-name' }, station.name),
                  h('span', { className: 'world-map-stop-detail' }, detail),
                  refusal === null && !here ? h('span', { className: 'world-map-stop-ride' }, 'Ride') : null,
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  private focusStation(station: TramStation, force: boolean): void {
    if (station.levelId !== this.shownLevelId && !force) return;
    if (station.levelId !== this.shownLevelId) {
      this.shownLevelId = station.levelId;
      this.view = null;
      this.render();
    }
    const view = this.currentView();
    if (!view) return;
    view.centreX = station.platformPoint.x + 0.5;
    view.centreY = station.platformPoint.y + 0.5;
    this.queuePaint();
  }

  private board(stationId: TramStationId): void {
    this.connection.send({ type: 'tram.board', destinationStationId: stationId });
    this.hide();
  }

  private fitScale(level: ResolvedLevel): number {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    return Math.max(0.5, Math.min((width - MAP_PADDING * 2) / level.layout.width, (height - MAP_PADDING * 2) / level.layout.height));
  }

  private currentView(): MapView | null {
    const level = this.shownLevel();
    if (!level || this.canvas.clientWidth === 0) return null;
    if (this.view) return this.view;
    const fit = this.fitScale(level);
    const self = this.world.selfEntity;
    const onLevel = self && this.world.zone?.definition.id === level.id;
    const scale = Math.min(MAX_SCALE, Math.max(fit, READABLE_SCALE));
    const zoomed = scale > fit;
    this.view = {
      scale,
      centreX: zoomed && onLevel ? self.to.x + 0.5 : level.layout.width / 2,
      centreY: zoomed && onLevel ? self.to.y + 0.5 : level.layout.height / 2,
    };
    return this.view;
  }

  private clampView(view: MapView, level: ResolvedLevel): void {
    view.scale = Math.min(MAX_SCALE, Math.max(this.fitScale(level), view.scale));
    view.centreX = Math.min(level.layout.width, Math.max(0, view.centreX));
    view.centreY = Math.min(level.layout.height, Math.max(0, view.centreY));
  }

  private frameOf(view: MapView): MapFrame {
    return {
      scale: view.scale,
      offsetX: this.canvas.clientWidth / 2 - view.centreX * view.scale,
      offsetY: this.canvas.clientHeight / 2 - view.centreY * view.scale,
    };
  }

  private zoomBy(factor: number, anchorX = this.canvas.clientWidth / 2, anchorY = this.canvas.clientHeight / 2): void {
    const view = this.currentView();
    const level = this.shownLevel();
    if (!view || !level) return;
    const frame = this.frameOf(view);
    const tileX = (anchorX - frame.offsetX) / frame.scale;
    const tileY = (anchorY - frame.offsetY) / frame.scale;
    view.scale *= factor;
    this.clampView(view, level);
    view.centreX = tileX - (anchorX - this.canvas.clientWidth / 2) / view.scale;
    view.centreY = tileY - (anchorY - this.canvas.clientHeight / 2) / view.scale;
    this.clampView(view, level);
    this.queuePaint();
  }

  private recentre(): void {
    const self = this.world.selfEntity;
    const zone = this.world.zone;
    if (!self || !zone) return;
    if (this.shownLevelId !== zone.definition.id) {
      this.shownLevelId = zone.definition.id;
      this.view = null;
      this.render();
    }
    const view = this.currentView();
    if (!view) return;
    view.scale = Math.max(view.scale, READABLE_SCALE * 1.6);
    view.centreX = self.to.x + 0.5;
    view.centreY = self.to.y + 0.5;
    this.clampView(view, zone.definition);
    this.queuePaint();
  }

  private localPoint(event: PointerEvent | WheelEvent): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  private pointerDown(event: PointerEvent): void {
    this.lastPointerType = event.pointerType;
    const point = this.localPoint(event);
    this.canvas.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { ...point, startX: point.x, startY: point.y });
    this.pinchDistance = this.pointers.size === 2 ? this.spread() : null;
  }

  private pointerMove(event: PointerEvent): void {
    const track = this.pointers.get(event.pointerId);
    const view = this.currentView();
    const level = this.shownLevel();
    if (!track || !view || !level) return;
    const point = this.localPoint(event);
    const dx = point.x - track.x;
    const dy = point.y - track.y;
    track.x = point.x;
    track.y = point.y;
    if (this.pointers.size >= 2) {
      const spread = this.spread();
      if (this.pinchDistance && spread > 0) {
        const [a, b] = [...this.pointers.values()] as [PointerTrack, PointerTrack];
        this.zoomBy(spread / this.pinchDistance, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      this.pinchDistance = spread;
      view.centreX -= dx / view.scale / 2;
      view.centreY -= dy / view.scale / 2;
    } else {
      view.centreX -= dx / view.scale;
      view.centreY -= dy / view.scale;
    }
    this.clampView(view, level);
    this.queuePaint();
  }

  private pointerUp(event: PointerEvent): void {
    const track = this.pointers.get(event.pointerId);
    const wasSingle = this.pointers.size === 1;
    this.pointers.delete(event.pointerId);
    this.pinchDistance = null;
    if (!track || !wasSingle) return;
    if (Math.hypot(track.x - track.startX, track.y - track.startY) > TAP_SLOP) return;
    this.tapAt(track.x, track.y);
  }

  private spread(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private wheel(event: WheelEvent): void {
    event.preventDefault();
    const point = this.localPoint(event);
    this.zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15, point.x, point.y);
  }

  private tapAt(x: number, y: number): void {
    if (this.mode !== 'transit') return;
    const radius = this.lastPointerType === 'mouse' ? MOUSE_HIT_RADIUS : TOUCH_HIT_RADIUS;
    const hit = this.stationHits
      .map((candidate) => ({ candidate, distance: Math.hypot(candidate.x - x, candidate.y - y) }))
      .filter(({ distance }) => distance <= radius)
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
    const boarding = this.boardingStation();
    if (!hit || !boarding) return;
    const refusal = tramBoardingRefusal(GAME_CONTENT.tram, { origin: boarding, destinationId: hit.station.id, knowsStation: (id) => this.knows(id) });
    if (!refusal) this.board(hit.station.id);
  }

  private queuePaint(): void {
    if (this.paintQueued || !this.open) return;
    this.paintQueued = true;
    requestAnimationFrame(() => {
      this.paintQueued = false;
      this.paint();
    });
  }

  private paint(): void {
    const level = this.shownLevel();
    const view = this.currentView();
    if (!this.open || !level || !view) return;
    this.clampView(view, level);
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    const context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const frame = this.frameOf(view);
    const objectives = this.objectiveDistrictIds();
    const charted = this.chartedDistrictIds(level);
    this.paintTiles(context, level, objectives, charted, frame);
    this.paintRegionLabels(context, level, charted, frame);
    this.paintDistrictLabels(context, level, objectives, charted, frame);
    const transit = this.mode === 'transit';
    this.paintPointsOfInterest(context, level, frame, transit);
    this.stationHits = transit ? this.paintNetwork(context, level, this.boardingStation(), frame) : [];
    this.paintSelf(context, level, frame);
  }

  private chartedDistrictIds(level: ResolvedLevel): Set<DistrictId> {
    const charted = new Set(this.world.self?.visitedDistricts ?? []);
    const self = this.world.selfEntity;
    const here = self && this.world.zone?.definition.id === level.id ? level.layout.districtAt(self.to) : undefined;
    if (here !== undefined) charted.add(here);
    return charted;
  }

  private paintTiles(context: CanvasRenderingContext2D, level: ResolvedLevel, objectives: ReadonlySet<DistrictId>, charted: ReadonlySet<DistrictId>, frame: MapFrame): void {
    const size = Math.max(1, frame.scale) + 0.5;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const minX = Math.max(0, Math.floor(-frame.offsetX / frame.scale));
    const minY = Math.max(0, Math.floor(-frame.offsetY / frame.scale));
    const maxX = Math.min(level.layout.width, Math.ceil((width - frame.offsetX) / frame.scale));
    const maxY = Math.min(level.layout.height, Math.ceil((height - frame.offsetY) / frame.scale));
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const kind = level.layout.tileAt({ x, y });
        if (kind === 'void') continue;
        const district = level.layout.districtAt({ x, y });
        const target = district !== undefined && objectives.has(district);
        context.fillStyle = district !== undefined && !charted.has(district) ? UNCHARTED_COLOR : kind === 'coolant' ? '#1f5f7a' : kind === 'track' ? '#2a2420' : kind === 'door' ? '#2f5a6a' : TILE_KINDS[kind].walkable ? (target ? '#3d3216' : '#1c2a33') : target ? '#7a5a22' : '#40525e';
        context.fillRect(frame.offsetX + x * frame.scale, frame.offsetY + y * frame.scale, size, size);
      }
    }
  }

  private paintRegionLabels(context: CanvasRenderingContext2D, level: ResolvedLevel, charted: ReadonlySet<DistrictId>, frame: MapFrame): void {
    if (frame.scale >= 3) return;
    const bounds = new Map<string, { minX: number; minY: number; maxX: number }>();
    for (const { districtId, rect } of level.districts) {
      const region = GAME_CONTENT.districts.get(districtId)?.region;
      if (region === undefined || !charted.has(districtId)) continue;
      const known = bounds.get(region);
      bounds.set(region, {
        minX: Math.min(known?.minX ?? rect.x, rect.x),
        minY: Math.min(known?.minY ?? rect.y, rect.y),
        maxX: Math.max(known?.maxX ?? rect.x + rect.width, rect.x + rect.width),
      });
    }
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.font = '700 15px "Chakra Petch", sans-serif';
    context.fillStyle = 'rgba(159, 179, 190, 0.55)';
    for (const [regionId, box] of bounds) {
      const name = (GAME_CONTENT.regions.get(regionId)?.name ?? regionId).toUpperCase().split('').join(' ');
      context.fillText(name, frame.offsetX + ((box.minX + box.maxX) / 2) * frame.scale, frame.offsetY + box.minY * frame.scale - 22);
    }
  }

  private paintDistrictLabels(context: CanvasRenderingContext2D, level: ResolvedLevel, objectives: ReadonlySet<DistrictId>, charted: ReadonlySet<DistrictId>, frame: MapFrame): void {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const detailed = frame.scale >= 3;
    for (const { districtId, rect } of level.districts) {
      const district = GAME_CONTENT.districts.get(districtId);
      if (!district) continue;
      const isCharted = charted.has(districtId);
      const detailedLabel = detailed && isCharted;
      const x = frame.offsetX + (rect.x + rect.width / 2) * frame.scale;
      const y = frame.offsetY + (rect.y + rect.height / 2) * frame.scale;
      const target = objectives.has(districtId);
      if (target) {
        context.strokeStyle = OBJECTIVE_COLOR;
        context.lineWidth = 2;
        context.setLineDash([5, 4]);
        context.strokeRect(frame.offsetX + rect.x * frame.scale, frame.offsetY + rect.y * frame.scale, rect.width * frame.scale, rect.height * frame.scale);
        context.setLineDash([]);
      }
      if (rect.width * frame.scale < 36) continue;
      context.font = `700 ${detailedLabel ? 14 : 12}px "Chakra Petch", sans-serif`;
      const name = isCharted ? district.name.toUpperCase() : 'UNCHARTED';
      const labelWidth = context.measureText(name).width + 14;
      const labelHeight = detailedLabel ? (target ? 46 : 34) : 20;
      context.fillStyle = 'rgba(3, 8, 11, 0.8)';
      context.fillRect(x - labelWidth / 2, y - labelHeight / 2, labelWidth, labelHeight);
      context.fillStyle = target ? OBJECTIVE_COLOR : '#e8f4f8';
      context.fillText(name, x, detailedLabel ? y - labelHeight / 2 + 10 : y);
      if (!detailedLabel) continue;
      context.font = '500 11px "IBM Plex Mono", monospace';
      context.fillStyle = '#9fb3be';
      context.fillText(`Tier ${district.tier}`, x, y - labelHeight / 2 + 24);
      if (target) {
        context.fillStyle = OBJECTIVE_COLOR;
        context.fillText('Tracked objective', x, y - labelHeight / 2 + 37);
      }
    }
  }

  private paintPointsOfInterest(context: CanvasRenderingContext2D, level: ResolvedLevel, frame: MapFrame, transit: boolean): void {
    const labelled = frame.scale >= ICON_LABEL_SCALE;
    const showResources = frame.scale >= READABLE_SCALE;
    const alpha = transit ? 0.55 : 1;
    context.save();
    context.font = '600 11px "Chakra Petch", sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    for (const point of this.chartedPoints(level)) {
      if (transit && point.kind === 'tram') continue;
      if (point.kind === 'gathering' && !showResources) continue;
      const x = frame.offsetX + (point.position.x + 0.5) * frame.scale;
      const y = frame.offsetY + (point.position.y + 0.5) * frame.scale;
      const size = point.kind === 'gathering' ? RESOURCE_ICON_SIZE : ICON_SIZE;
      drawPoiIcon(context, point.kind, x, y, size, alpha);
      if (!labelled || transit || point.kind === 'gathering') continue;
      const width = context.measureText(point.name).width + 8;
      context.fillStyle = 'rgba(3, 8, 11, 0.75)';
      context.fillRect(x + size / 2 + 3, y - 8, width, 16);
      context.fillStyle = '#e8f4f8';
      context.fillText(point.name, x + size / 2 + 7, y);
    }
    context.restore();
  }

  private paintNetwork(context: CanvasRenderingContext2D, level: ResolvedLevel, boarding: TramStation | undefined, frame: MapFrame): StationHit[] {
    const network = GAME_CONTENT.tram;
    const point = (station: TramStation) => ({
      x: frame.offsetX + (station.platformPoint.x + 0.5) * frame.scale,
      y: frame.offsetY + (station.platformPoint.y + 0.5) * frame.scale,
    });
    for (const line of network.lines.values()) {
      const stations = line.stations.map((id) => network.stations.get(id)).filter((station): station is TramStation => station !== undefined);
      stations.forEach((station, index) => {
        const next = stations[index + 1];
        if (!next) return;
        const here = station.levelId === level.id;
        const there = next.levelId === level.id;
        if (!here && !there) return;
        context.strokeStyle = line.color;
        context.lineWidth = 4;
        context.globalAlpha = this.knows(station.id) && this.knows(next.id) ? 0.9 : 0.35;
        if (here && there) {
          const from = point(station);
          const to = point(next);
          context.beginPath();
          context.moveTo(from.x, from.y);
          context.lineTo(to.x, to.y);
          context.stroke();
        } else {
          const local = here ? station : next;
          const away = here ? next : station;
          this.paintLevelLink(context, point(local), away, line.color, level);
        }
        context.globalAlpha = 1;
      });
    }

    const hits: StationHit[] = [];
    const transit = this.mode === 'transit';
    for (const station of network.stations.values()) {
      if (station.levelId !== level.id) continue;
      const { x, y } = point(station);
      const known = this.knows(station.id);
      const lineColor = network.lines.get(station.lineIds[0] ?? '')?.color ?? '#e8f4f8';
      const rideable = transit && boarding !== undefined && known && station.id !== boarding.id;
      if (rideable) {
        context.beginPath();
        context.arc(x, y, 13, 0, Math.PI * 2);
        context.fillStyle = 'rgba(79, 216, 255, 0.18)';
        context.fill();
      }
      context.beginPath();
      context.arc(x, y, station.id === boarding?.id ? 9 : 7, 0, Math.PI * 2);
      context.fillStyle = known ? lineColor : 'rgba(3, 8, 11, 0.9)';
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = known ? '#e8f4f8' : '#6f8794';
      context.stroke();
      if (!known) continue;
      context.font = '600 13px "Chakra Petch", sans-serif';
      context.textAlign = 'left';
      const labelWidth = context.measureText(station.name).width + 10;
      context.fillStyle = 'rgba(3, 8, 11, 0.75)';
      context.fillRect(x + 11, y - 10, labelWidth, 20);
      context.fillStyle = '#e8f4f8';
      context.fillText(station.name, x + 16, y);
      hits.push({ station, x, y });
    }
    context.textAlign = 'center';
    return hits;
  }

  private paintLevelLink(context: CanvasRenderingContext2D, from: { x: number; y: number }, away: TramStation, color: string, shown: ResolvedLevel): void {
    const awayLevel = GAME_CONTENT.levels.get(away.levelId);
    const goesDown = (awayLevel?.definition.depth ?? 0) < shown.definition.depth;
    const dy = goesDown ? 28 : -28;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(from.x, from.y + dy);
    context.stroke();
    context.beginPath();
    context.moveTo(from.x - 5, from.y + dy - Math.sign(dy) * 6);
    context.lineTo(from.x, from.y + dy);
    context.lineTo(from.x + 5, from.y + dy - Math.sign(dy) * 6);
    context.stroke();
    context.font = '600 11px "Chakra Petch", sans-serif';
    context.textAlign = 'left';
    context.fillStyle = color;
    context.fillText(`${goesDown ? 'Down' : 'Up'} to ${awayLevel?.name ?? 'elsewhere'}`, from.x + 8, from.y + dy);
    context.textAlign = 'center';
  }

  private paintSelf(context: CanvasRenderingContext2D, level: ResolvedLevel, frame: MapFrame): void {
    const self = this.world.selfEntity;
    if (!self || this.world.zone?.definition.id !== level.id) return;
    const position: TilePoint = self.to;
    const x = frame.offsetX + (position.x + 0.5) * frame.scale;
    const y = frame.offsetY + (position.y + 0.5) * frame.scale;
    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fillStyle = '#4fd8ff';
    context.shadowColor = '#4fd8ff';
    context.shadowBlur = 12;
    context.fill();
    context.shadowBlur = 0;
    context.font = '700 11px "Chakra Petch", sans-serif';
    context.fillStyle = '#4fd8ff';
    context.fillText('YOU', x, y - 14);
  }
}

function levelName(levelId: LevelId): string {
  return GAME_CONTENT.levels.get(levelId)?.name ?? levelId;
}
