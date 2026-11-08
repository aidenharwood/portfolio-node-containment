import {
  focusedQuest,
  GAME_CONTENT,
  objectiveDistricts,
  stationAt,
  TILE_KINDS,
  TRAM_BOARDING_TICKS,
  tramBoardingRefusal,
  tramRideTicks,
  tramStops,
  type DistrictId,
  type LevelId,
  type ResolvedLevel,
  type TilePoint,
  type TramStation,
  type TramStationId,
} from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import type { QuestTracking } from '../state/questTracking.ts';
import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';

const MAP_PADDING = 18;
const STATION_HIT_RADIUS = 12;
const OBJECTIVE_COLOR = '#ffb347';

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

const levelOrder = (a: ResolvedLevel, b: ResolvedLevel): number =>
  (a.definition.kind === b.definition.kind ? 0 : a.definition.kind === 'floor' ? -1 : 1) || b.definition.depth - a.definition.depth;

export class WorldMap {
  readonly element = h('section', { className: 'world-map panel', hidden: true, role: 'dialog', ariaLabel: 'World map' });
  private readonly canvas = h('canvas', { className: 'world-map-canvas' });
  private readonly connection: GameConnection;
  private readonly world: WorldState;
  private readonly questTracking: QuestTracking;
  private readonly unsubscribers: (() => void)[];
  private open = false;
  private shownLevelId: LevelId | null = null;
  private openedAtStationId: TramStationId | null = null;
  private stationHits: StationHit[] = [];

  constructor(connection: GameConnection, world: WorldState, questTracking: QuestTracking) {
    this.connection = connection;
    this.world = world;
    this.questTracking = questTracking;
    this.canvas.onclick = (event) => this.boardAt(event);
    this.unsubscribers = [
      connection.on('tram.mapOpened', ({ stationId }) => this.show(stationId)),
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
    else this.show(null);
  }

  requestClose(): void {
    this.hide();
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  private show(stationId: TramStationId | null): void {
    this.open = true;
    this.openedAtStationId = stationId;
    this.shownLevelId = this.world.zone?.definition.id ?? null;
    this.element.hidden = false;
    this.render();
  }

  private hide(): void {
    this.open = false;
    this.element.hidden = true;
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
    const quest = focusedQuest(self.quests, GAME_CONTENT.quests, this.questTracking.questId);
    return quest ? objectiveDistricts(quest.objectives, GAME_CONTENT) : new Set();
  }

  private render(): void {
    if (!this.open || !this.world.self) return;
    const levels = this.visibleLevels();
    const shown = levels.find(({ level, charted }) => level.id === this.shownLevelId && charted)?.level ?? this.world.zone?.definition;
    if (!shown) return;
    this.shownLevelId = shown.id;
    const objectives = this.objectiveDistrictIds();
    const boarding = this.boardingStation();

    replaceChildren(
      this.element,
      h('header', { className: 'shop-header' },
        h('div', {},
          h('h3', {}, 'Site Meridian Transit'),
          h('p', { className: 'shop-greeting' }, boarding
            ? `You are on the platform at ${boarding.name}. Pick a destination you have found.`
            : 'Stand on a tram platform and use its stop to ride. Press M to close.'),
        ),
        h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close world map', onclick: () => this.hide() }, '×'),
      ),
      h('nav', { className: 'world-map-tabs', ariaLabel: 'Levels' },
        ...levels.map(({ level, charted }) => {
          const hasObjective = level.districts.some(({ districtId }) => objectives.has(districtId));
          return h('button', {
            className: `world-map-tab${level.id === shown.id ? ' active' : ''}`,
            type: 'button',
            disabled: !charted,
            ariaPressed: String(level.id === shown.id),
            onclick: () => {
              this.shownLevelId = level.id;
              this.render();
            },
          },
            charted ? level.name : 'Uncharted',
            h('span', { className: 'world-map-tab-depth' }, level.definition.kind === 'pocket' ? 'Pocket' : `Level ${level.definition.depth}`),
            hasObjective && charted ? h('span', { className: 'world-map-objective-dot', title: 'Tracked objective' }) : null,
          );
        }),
      ),
      h('div', { className: 'world-map-body' },
        h('div', { className: 'world-map-frame' }, this.canvas),
        this.destinationList(boarding),
      ),
    );
    requestAnimationFrame(() => this.paint(shown, objectives, boarding));
  }

  private destinationList(boarding: TramStation | undefined): HTMLElement {
    const network = GAME_CONTENT.tram;
    const seconds = (stops: number) => Math.round(((TRAM_BOARDING_TICKS + tramRideTicks(stops)) * this.world.tickMs) / 1000);
    return h('div', { className: 'world-map-lines' },
      h('p', { className: 'eyebrow' }, 'Tram lines'),
      ...[...network.lines.values()].map((line) =>
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
                },
                  h('span', { className: 'world-map-stop-name' }, station.name),
                  h('span', { className: 'world-map-stop-detail' }, detail),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  private board(stationId: TramStationId): void {
    this.connection.send({ type: 'tram.board', destinationStationId: stationId });
    this.hide();
  }

  private boardAt(event: MouseEvent): void {
    const bounds = this.canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const boarding = this.boardingStation();
    const hit = this.stationHits.find((candidate) => Math.hypot(candidate.x - x, candidate.y - y) <= STATION_HIT_RADIUS);
    if (!hit || !boarding) return;
    const refusal = tramBoardingRefusal(GAME_CONTENT.tram, { origin: boarding, destinationId: hit.station.id, knowsStation: (id) => this.knows(id) });
    if (!refusal) this.board(hit.station.id);
  }

  private paint(level: ResolvedLevel, objectives: ReadonlySet<DistrictId>, boarding: TramStation | undefined): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    const context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const scale = Math.min((width - MAP_PADDING * 2) / level.layout.width, (height - MAP_PADDING * 2) / level.layout.height);
    const frame: MapFrame = {
      scale,
      offsetX: (width - level.layout.width * scale) / 2,
      offsetY: (height - level.layout.height * scale) / 2,
    };
    this.paintTiles(context, level, objectives, frame);
    this.paintDistrictLabels(context, level, objectives, frame);
    this.stationHits = this.paintNetwork(context, level, boarding, frame);
    this.paintSelf(context, level, frame);
  }

  private paintTiles(context: CanvasRenderingContext2D, level: ResolvedLevel, objectives: ReadonlySet<DistrictId>, frame: MapFrame): void {
    const size = Math.max(1, frame.scale);
    for (let y = 0; y < level.layout.height; y++) {
      for (let x = 0; x < level.layout.width; x++) {
        const kind = level.layout.tileAt({ x, y });
        if (kind === 'void') continue;
        const district = level.layout.districtAt({ x, y });
        const target = district !== undefined && objectives.has(district);
        context.fillStyle = TILE_KINDS[kind].walkable ? (target ? '#3d3216' : '#1c2a33') : target ? '#7a5a22' : '#40525e';
        context.fillRect(frame.offsetX + x * frame.scale, frame.offsetY + y * frame.scale, size, size);
      }
    }
  }

  private paintDistrictLabels(context: CanvasRenderingContext2D, level: ResolvedLevel, objectives: ReadonlySet<DistrictId>, frame: MapFrame): void {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const { districtId, rect } of level.districts) {
      const district = GAME_CONTENT.districts.get(districtId);
      if (!district) continue;
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
      context.font = '700 13px "Chakra Petch", sans-serif';
      const name = district.name.toUpperCase();
      const labelWidth = context.measureText(name).width + 14;
      context.fillStyle = 'rgba(3, 8, 11, 0.78)';
      context.fillRect(x - labelWidth / 2, y - 16, labelWidth, target ? 44 : 32);
      context.fillStyle = target ? OBJECTIVE_COLOR : '#e8f4f8';
      context.fillText(name, x, y - 7);
      context.font = '500 10px "IBM Plex Mono", monospace';
      context.fillStyle = '#7f97a4';
      context.fillText(`Tier ${district.tier}`, x, y + 7);
      if (target) {
        context.fillStyle = OBJECTIVE_COLOR;
        context.fillText('Tracked objective', x, y + 20);
      }
    }
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
        context.lineWidth = 3;
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
          this.paintLevelLink(context, point(local), away, line.color);
        }
        context.globalAlpha = 1;
      });
    }

    const hits: StationHit[] = [];
    for (const station of network.stations.values()) {
      if (station.levelId !== level.id) continue;
      const { x, y } = point(station);
      const known = this.knows(station.id);
      const lineColor = network.lines.get(station.lineIds[0] ?? '')?.color ?? '#e8f4f8';
      context.beginPath();
      context.arc(x, y, station.id === boarding?.id ? 8 : 6, 0, Math.PI * 2);
      context.fillStyle = known ? lineColor : 'rgba(3, 8, 11, 0.9)';
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = known ? '#e8f4f8' : '#6f8794';
      context.stroke();
      if (!known) continue;
      context.font = '600 11px "Chakra Petch", sans-serif';
      context.textAlign = 'left';
      context.fillStyle = '#e8f4f8';
      context.fillText(station.name, x + 11, y);
      hits.push({ station, x, y });
    }
    context.textAlign = 'center';
    return hits;
  }

  private paintLevelLink(context: CanvasRenderingContext2D, from: { x: number; y: number }, away: TramStation, color: string): void {
    const awayLevel = GAME_CONTENT.levels.get(away.levelId);
    const shown = this.shownLevelId ? GAME_CONTENT.levels.get(this.shownLevelId) : undefined;
    const goesDown = (awayLevel?.definition.depth ?? 0) < (shown?.definition.depth ?? 0);
    const dy = goesDown ? 26 : -26;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(from.x, from.y + dy);
    context.stroke();
    context.beginPath();
    context.moveTo(from.x - 5, from.y + dy - Math.sign(dy) * 6);
    context.lineTo(from.x, from.y + dy);
    context.lineTo(from.x + 5, from.y + dy - Math.sign(dy) * 6);
    context.stroke();
    context.font = '600 10px "Chakra Petch", sans-serif';
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
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fillStyle = '#4fd8ff';
    context.shadowColor = '#4fd8ff';
    context.shadowBlur = 10;
    context.fill();
    context.shadowBlur = 0;
    context.font = '700 10px "Chakra Petch", sans-serif';
    context.fillStyle = '#4fd8ff';
    context.fillText('YOU', x, y - 12);
  }
}

function levelName(levelId: LevelId): string {
  return GAME_CONTENT.levels.get(levelId)?.name ?? levelId;
}
