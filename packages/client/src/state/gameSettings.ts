export const RENDER_SCALES = ['performance', 'balanced', 'sharp', 'native'] as const;
export type RenderScale = (typeof RENDER_SCALES)[number];

export const ANTIALIASING_MODES = ['off', 'auto', '2x', '4x'] as const;
export type AntialiasingMode = (typeof ANTIALIASING_MODES)[number];

export const SHADOW_QUALITIES = ['off', 'low', 'high', 'ultra'] as const;
export type ShadowQuality = (typeof SHADOW_QUALITIES)[number];

export const DETAIL_LEVELS = ['low', 'medium', 'high'] as const;
export type DetailLevel = (typeof DETAIL_LEVELS)[number];

export const GLOW_LEVELS = ['off', 'subtle', 'full'] as const;
export type GlowLevel = (typeof GLOW_LEVELS)[number];

export const WEATHER_LEVELS = ['off', 'reduced', 'full'] as const;
export type WeatherLevel = (typeof WEATHER_LEVELS)[number];

export const VIEW_DISTANCES = ['near', 'far', 'vast', 'extreme'] as const;
export type ViewDistance = (typeof VIEW_DISTANCES)[number];

export const FRAME_CAPS = ['uncapped', '60', '30'] as const;
export type FrameCap = (typeof FRAME_CAPS)[number];

export const GRAPHICS_PRESETS = ['low', 'medium', 'high', 'ultra'] as const;
export type GraphicsPreset = (typeof GRAPHICS_PRESETS)[number];
export type PresetChoice = GraphicsPreset | 'custom';

export const UI_SCALE_MIN = 0.8;
export const UI_SCALE_MAX = 1.5;
export const UI_SCALE_STEP = 0.05;

export const BRIGHTNESS_MIN = 0.7;
export const BRIGHTNESS_MAX = 1.3;
export const BRIGHTNESS_STEP = 0.05;

export interface GameSettings {
  readonly renderScale: RenderScale;
  readonly viewDistance: ViewDistance;
  readonly antialiasing: AntialiasingMode;
  readonly shadows: ShadowQuality;
  readonly lights: DetailLevel;
  readonly glow: GlowLevel;
  readonly weather: WeatherLevel;
  readonly particles: DetailLevel;
  readonly grading: boolean;
  readonly vignette: boolean;
  readonly grain: boolean;
  readonly sharpen: boolean;
  readonly brightness: number;
  readonly frameCap: FrameCap;
  readonly fpsCounter: boolean;
  readonly scanlines: boolean;
  readonly uiScale: number;
}

type PresetSettings = Pick<GameSettings, 'renderScale' | 'viewDistance' | 'antialiasing' | 'shadows' | 'lights' | 'glow' | 'weather' | 'particles' | 'grading' | 'vignette' | 'grain' | 'sharpen'>;

export const PRESET_SETTINGS: Readonly<Record<GraphicsPreset, PresetSettings>> = {
  low: { renderScale: 'performance', viewDistance: 'near', antialiasing: 'off', shadows: 'off', lights: 'low', glow: 'off', weather: 'reduced', particles: 'low', grading: false, vignette: false, grain: false, sharpen: false },
  medium: { renderScale: 'balanced', viewDistance: 'far', antialiasing: '2x', shadows: 'low', lights: 'medium', glow: 'subtle', weather: 'reduced', particles: 'medium', grading: true, vignette: true, grain: false, sharpen: true },
  high: { renderScale: 'sharp', viewDistance: 'vast', antialiasing: 'auto', shadows: 'high', lights: 'high', glow: 'full', weather: 'full', particles: 'high', grading: true, vignette: true, grain: true, sharpen: true },
  ultra: { renderScale: 'native', viewDistance: 'extreme', antialiasing: '4x', shadows: 'ultra', lights: 'high', glow: 'full', weather: 'full', particles: 'high', grading: true, vignette: true, grain: true, sharpen: true },
};

const PRESET_KEYS = Object.keys(PRESET_SETTINGS.high) as readonly (keyof PresetSettings)[];

export const DEFAULT_SETTINGS: GameSettings = {
  ...PRESET_SETTINGS.high,
  brightness: 1,
  frameCap: 'uncapped',
  fpsCounter: false,
  scanlines: true,
  uiScale: 1,
};

export const PRESET_LABELS: Readonly<Record<PresetChoice, string>> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  ultra: 'Ultra',
  custom: 'Custom',
};

export const RENDER_SCALE_LABELS: Readonly<Record<RenderScale, string>> = {
  performance: 'Performance',
  balanced: 'Balanced',
  sharp: 'Sharp',
  native: 'Native',
};

export const VIEW_DISTANCE_LABELS: Readonly<Record<ViewDistance, string>> = {
  near: 'Near',
  far: 'Far',
  vast: 'Vast',
  extreme: 'Extreme',
};

const VIEW_REACHES: Readonly<Record<ViewDistance, number>> = { near: 600, far: 900, vast: 1300, extreme: 1600 };
const VIEW_DISTANCE_OF_SCALE: Readonly<Record<RenderScale, ViewDistance>> = { performance: 'near', balanced: 'far', sharp: 'vast', native: 'extreme' };

export const viewReachFor = (distance: ViewDistance): number => VIEW_REACHES[distance];

export const ANTIALIASING_LABELS: Readonly<Record<AntialiasingMode, string>> = {
  off: 'Off',
  auto: 'Auto',
  '2x': '2×',
  '4x': '4×',
};

export const SHADOW_LABELS: Readonly<Record<ShadowQuality, string>> = {
  off: 'Off',
  low: 'Low',
  high: 'High',
  ultra: 'Ultra',
};

export const DETAIL_LABELS: Readonly<Record<DetailLevel, string>> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const GLOW_LABELS: Readonly<Record<GlowLevel, string>> = {
  off: 'Off',
  subtle: 'Subtle',
  full: 'Full',
};

export const WEATHER_LABELS: Readonly<Record<WeatherLevel, string>> = {
  off: 'Off',
  reduced: 'Reduced',
  full: 'Full',
};

export const FRAME_CAP_LABELS: Readonly<Record<FrameCap, string>> = {
  uncapped: 'Uncapped',
  '60': '60 fps',
  '30': '30 fps',
};

const STORAGE_KEY = 'containment.settings';

export function pixelRatioFor(scale: RenderScale, devicePixelRatio: number): number {
  const device = devicePixelRatio || 1;
  if (scale === 'performance') return 0.75;
  if (scale === 'balanced') return 1;
  if (scale === 'sharp') return Math.min(device, 1.75);
  return device;
}

export function samplesFor(mode: AntialiasingMode, pixelRatio: number): number {
  if (mode === 'off') return 0;
  if (mode === '2x') return 2;
  if (mode === '4x') return 4;
  if (pixelRatio < 1) return 0;
  return pixelRatio <= 1.25 ? 4 : 2;
}

export function shadowMapSizeFor(quality: ShadowQuality): number {
  if (quality === 'low') return 1024;
  if (quality === 'ultra') return 4096;
  return 2048;
}

export function lightLimitFor(detail: DetailLevel): number {
  if (detail === 'low') return 24;
  if (detail === 'medium') return 48;
  return 96;
}

export function particleDensityFor(detail: DetailLevel): number {
  if (detail === 'low') return 0.35;
  if (detail === 'medium') return 0.65;
  return 1;
}

export function weatherDensityFor(level: WeatherLevel): number {
  if (level === 'off') return 0;
  if (level === 'reduced') return 0.5;
  return 1;
}

export function glowStrengthFor(level: GlowLevel): number {
  if (level === 'off') return 0;
  if (level === 'subtle') return 0.55;
  return 1;
}

export function frameIntervalFor(cap: FrameCap): number {
  return cap === 'uncapped' ? 0 : 1000 / Number(cap);
}

export function presetOf(settings: GameSettings): PresetChoice {
  return GRAPHICS_PRESETS.find((preset) => PRESET_KEYS.every((key) => PRESET_SETTINGS[preset][key] === settings[key])) ?? 'custom';
}

const stepClamp = (value: number, min: number, max: number, step: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  const stepped = Math.round(value / step) * step;
  return Math.round(Math.min(max, Math.max(min, stepped)) * 100) / 100;
};

export function clampUiScale(value: number): number {
  return stepClamp(value, UI_SCALE_MIN, UI_SCALE_MAX, UI_SCALE_STEP, DEFAULT_SETTINGS.uiScale);
}

export function clampBrightness(value: number): number {
  return stepClamp(value, BRIGHTNESS_MIN, BRIGHTNESS_MAX, BRIGHTNESS_STEP, DEFAULT_SETTINGS.brightness);
}

const oneOf = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;

const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

const legacyLevel = <T extends string>(value: unknown, on: T, off: T): unknown => (value === true ? on : value === false ? off : value);

export function normalizeSettings(raw: unknown): GameSettings {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const leanPost = !('grading' in source) && source.renderScale === 'performance';
  const post = (value: unknown, fallback: boolean): boolean => flag(value, leanPost ? false : fallback);
  return {
    renderScale: oneOf(RENDER_SCALES, source.renderScale, DEFAULT_SETTINGS.renderScale),
    viewDistance: oneOf(VIEW_DISTANCES, source.viewDistance, VIEW_DISTANCE_OF_SCALE[oneOf(RENDER_SCALES, source.renderScale, DEFAULT_SETTINGS.renderScale)]),
    antialiasing: oneOf(ANTIALIASING_MODES, source.antialiasing, DEFAULT_SETTINGS.antialiasing),
    shadows: oneOf(SHADOW_QUALITIES, source.shadows, DEFAULT_SETTINGS.shadows),
    lights: oneOf(DETAIL_LEVELS, source.lights, DEFAULT_SETTINGS.lights),
    glow: oneOf(GLOW_LEVELS, source.glow, oneOf(GLOW_LEVELS, legacyLevel(source.bloom, 'full', 'off'), DEFAULT_SETTINGS.glow)),
    weather: oneOf(WEATHER_LEVELS, legacyLevel(source.weather, 'full', 'off'), DEFAULT_SETTINGS.weather),
    particles: oneOf(DETAIL_LEVELS, source.particles, DEFAULT_SETTINGS.particles),
    grading: post(source.grading, DEFAULT_SETTINGS.grading),
    vignette: post(source.vignette, DEFAULT_SETTINGS.vignette),
    grain: post(source.grain, DEFAULT_SETTINGS.grain),
    sharpen: post(source.sharpen, DEFAULT_SETTINGS.sharpen),
    brightness: typeof source.brightness === 'number' ? clampBrightness(source.brightness) : DEFAULT_SETTINGS.brightness,
    frameCap: oneOf(FRAME_CAPS, source.frameCap, DEFAULT_SETTINGS.frameCap),
    fpsCounter: flag(source.fpsCounter, DEFAULT_SETTINGS.fpsCounter),
    scanlines: flag(source.scanlines, DEFAULT_SETTINGS.scanlines),
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

  applyPreset(preset: GraphicsPreset): void {
    this.update(PRESET_SETTINGS[preset]);
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
