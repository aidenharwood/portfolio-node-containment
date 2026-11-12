export const RENDER_SCALES = ['performance', 'balanced', 'sharp', 'native'] as const;
export type RenderScale = (typeof RENDER_SCALES)[number];

export const SHADOW_QUALITIES = ['off', 'low', 'high'] as const;
export type ShadowQuality = (typeof SHADOW_QUALITIES)[number];

export const UI_SCALE_MIN = 0.8;
export const UI_SCALE_MAX = 1.5;
export const UI_SCALE_STEP = 0.05;

export interface GameSettings {
  readonly renderScale: RenderScale;
  readonly shadows: ShadowQuality;
  readonly bloom: boolean;
  readonly scanlines: boolean;
  readonly uiScale: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  renderScale: 'sharp',
  shadows: 'high',
  bloom: true,
  scanlines: true,
  uiScale: 1,
};

export const RENDER_SCALE_LABELS: Readonly<Record<RenderScale, string>> = {
  performance: 'Performance',
  balanced: 'Balanced',
  sharp: 'Sharp',
  native: 'Native',
};

export const SHADOW_LABELS: Readonly<Record<ShadowQuality, string>> = {
  off: 'Off',
  low: 'Low',
  high: 'High',
};

const STORAGE_KEY = 'containment.settings';

export function pixelRatioFor(scale: RenderScale, devicePixelRatio: number): number {
  const device = devicePixelRatio || 1;
  if (scale === 'performance') return 0.75;
  if (scale === 'balanced') return 1;
  if (scale === 'sharp') return Math.min(device, 1.75);
  return device;
}

export function shadowMapSizeFor(quality: ShadowQuality): number {
  return quality === 'low' ? 1024 : 2048;
}

export function clampUiScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.uiScale;
  const stepped = Math.round(value / UI_SCALE_STEP) * UI_SCALE_STEP;
  return Math.round(Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, stepped)) * 100) / 100;
}

const oneOf = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;

export function normalizeSettings(raw: unknown): GameSettings {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    renderScale: oneOf(RENDER_SCALES, source.renderScale, DEFAULT_SETTINGS.renderScale),
    shadows: oneOf(SHADOW_QUALITIES, source.shadows, DEFAULT_SETTINGS.shadows),
    bloom: typeof source.bloom === 'boolean' ? source.bloom : DEFAULT_SETTINGS.bloom,
    scanlines: typeof source.scanlines === 'boolean' ? source.scanlines : DEFAULT_SETTINGS.scanlines,
    uiScale: typeof source.uiScale === 'number' ? clampUiScale(source.uiScale) : DEFAULT_SETTINGS.uiScale,
  };
}

type Listener = (settings: GameSettings) => void;

export class SettingsStore {
  private value: GameSettings;
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.value = SettingsStore.load();
  }

  get current(): GameSettings {
    return this.value;
  }

  update(patch: Partial<GameSettings>): void {
    this.value = normalizeSettings({ ...this.value, ...patch });
    this.save();
    for (const listener of this.listeners) listener(this.value);
  }

  reset(): void {
    this.update(DEFAULT_SETTINGS);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => this.listeners.delete(listener);
  }

  private static load(): GameSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return normalizeSettings(stored ? JSON.parse(stored) : null);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.value));
    } catch {
      return;
    }
  }
}

export const gameSettings = new SettingsStore();
