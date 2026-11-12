import type { DistrictId, TilePoint } from '@containment/shared';

export const PLAN_LAYERS = ['tiles', 'rooms', 'objects', 'dressing', 'npcs', 'lights', 'decals', 'issues'] as const;
export type PlanLayer = (typeof PLAN_LAYERS)[number];

export type ViewMode = 'split' | '2d' | '3d';

export interface ViewState {
  readonly district: DistrictId;
  readonly room?: string;
  readonly view: ViewMode;
  readonly yaw: number;
  readonly pitch: number;
  readonly zoom: number;
  readonly focus?: TilePoint;
  readonly layers: readonly PlanLayer[];
}

const DEFAULTS = { view: 'split' as ViewMode, yaw: 45, pitch: 55, zoom: 1, layers: PLAN_LAYERS };
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const VIEWS: readonly ViewMode[] = ['split', '2d', '3d'];

const numberOf = (text: string | null, fallback: number): number => {
  if (text === null || text.trim() === '') return fallback;
  const value = Number(text);
  return Number.isFinite(value) ? value : fallback;
};

const focusOf = (text: string | null): TilePoint | undefined => {
  const match = text === null ? null : /^(-?\d+),(-?\d+)$/.exec(text);
  return match ? { x: Number(match[1]), y: Number(match[2]) } : undefined;
};

export function readViewState(search: string, known: ReadonlySet<DistrictId>): ViewState {
  const params = new URLSearchParams(search);
  const requested = params.get('district');
  const district = requested !== null && known.has(requested) ? requested : ([...known][0] ?? '');
  const view = VIEWS.find((mode) => mode === params.get('view')) ?? DEFAULTS.view;
  const layersText = params.get('layers');
  const layers = layersText === null ? DEFAULTS.layers : PLAN_LAYERS.filter((layer) => layersText.split(',').includes(layer));
  const room = params.get('room');
  const focus = focusOf(params.get('focus'));
  return {
    district,
    ...(room === null || room === '' ? {} : { room }),
    view,
    yaw: numberOf(params.get('yaw'), DEFAULTS.yaw),
    pitch: numberOf(params.get('pitch'), DEFAULTS.pitch),
    zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, numberOf(params.get('zoom'), DEFAULTS.zoom))),
    ...(focus ? { focus } : {}),
    layers,
  };
}

export function writeViewState(state: ViewState): string {
  const params = new URLSearchParams();
  params.set('district', state.district);
  if (state.room) params.set('room', state.room);
  params.set('view', state.view);
  params.set('yaw', String(Math.round(state.yaw * 10) / 10));
  params.set('pitch', String(Math.round(state.pitch * 10) / 10));
  params.set('zoom', String(Math.round(state.zoom * 1000) / 1000));
  if (state.focus) params.set('focus', `${state.focus.x},${state.focus.y}`);
  params.set('layers', state.layers.join(','));
  return `?${params.toString()}`;
}
