import { Color, MathUtils, SRGBColorSpace } from 'three';
import type { BlendedAmbience } from '../world/ambienceBlend.ts';

const LUMA = { r: 0.2126, g: 0.7152, b: 0.0722 } as const;
const HORIZON_SKY_SHARE = 0.5;
const HORIZON_LIFT = 0.25;
const NIGHT_HORIZON_TINT = 0.2;
const ZENITH_SATURATION = 1.25;
const ZENITH_DIM = 0.5;
const NIGHT_ZENITH = 0.22;
const ZENITH_AZURE = 0.45;
const AZURE_HAZE_FADE = 4;
const ENCLOSED_ZENITH = 0.55;
const DAY_SPREAD = 0.3;
const NIGHT_SPREAD = 0.09;
const SUN_GLOW = 0.5;
const SUN_HORIZON_TINT = 0.2;
const MOON_GLOW = 0.16;
const CLOUD_COVER = 0.8;
const CLOUD_DAY_LIFT = 0.55;
const CLOUD_SHADE = 0.8;
const CLOUD_NIGHT_GLOW = 1.3;
const ARCH_DAY = 0.2;
const ARCH_NIGHT = 0.62;
const ARCH_DAY_LIFT = 0.45;
const ARCH_BASE = MathUtils.degToRad(2.45);
const ARCH_SPREAD = MathUtils.degToRad(0.273);
export const ARCH_MIN_SINE = 0.06;
const WHITE = new Color(1, 1, 1);
const AZURE = new Color(0.48, 0.63, 0.79);
const SUN_WARM = new Color(1, 0.93, 0.82);
const MOON_COOL = new Color(0.6, 0.68, 0.84);
const ARCH_NIGHT_COLOR = new Color(0.42, 0.48, 0.62);
const CITY_LIGHTS = new Color(1, 0.78, 0.5);

export interface SkyLook {
  readonly horizon: Color;
  readonly zenith: Color;
  readonly haze: Color;
  readonly sun: Color;
  readonly cloudLit: Color;
  readonly cloudShade: Color;
  readonly arch: Color;
  readonly lights: Color;
  open: number;
  night: number;
  spread: number;
  clouds: number;
  archShow: number;
}

export const createSkyLook = (): SkyLook => ({
  horizon: new Color(),
  zenith: new Color(),
  haze: new Color(),
  sun: new Color(),
  cloudLit: new Color(),
  cloudShade: new Color(),
  arch: new Color(),
  lights: new Color(),
  open: 0,
  night: 0,
  spread: DAY_SPREAD,
  clouds: 0,
  archShow: 0,
});

export const ARCH_SHAPE = { base: ARCH_BASE, spread: ARCH_SPREAD } as const;

export const ringHalfWidth = (elevation: number): number => ARCH_BASE + ARCH_SPREAD / Math.max(Math.sin(elevation), ARCH_MIN_SINE);

export const displayLuma = (color: Color): number => color.r * LUMA.r + color.g * LUMA.g + color.b * LUMA.b;

const channels = { r: 0, g: 0, b: 0 };
const fogShown = new Color();
const skyShown = new Color();
const tintShown = new Color();
const scratch = new Color();

const shownOf = (color: Color, into: Color): Color => {
  color.getRGB(channels, SRGBColorSpace);
  return into.setRGB(channels.r, channels.g, channels.b);
};

function saturated(color: Color, amount: number, into: Color): Color {
  const luma = displayLuma(color);
  return into.setRGB(Math.max(0, luma + (color.r - luma) * amount), Math.max(0, luma + (color.g - luma) * amount), Math.max(0, luma + (color.b - luma) * amount));
}

export function skyLookFor(ambience: BlendedAmbience, night: number, into: SkyLook = createSkyLook()): SkyLook {
  const open = MathUtils.clamp(ambience.daylight, 0, 1);
  const day = 1 - night;
  shownOf(ambience.fog, fogShown);
  shownOf(ambience.tint, tintShown);
  if (open > 0) shownOf(ambience.sky, skyShown);
  else skyShown.copy(fogShown);
  into.open = open;
  into.night = night;
  into.haze.copy(fogShown);
  into.horizon.copy(fogShown).lerp(skyShown, HORIZON_SKY_SHARE).lerp(WHITE, HORIZON_LIFT * day * open).lerp(tintShown, NIGHT_HORIZON_TINT * night * open);
  saturated(skyShown, ZENITH_SATURATION, into.zenith).multiplyScalar(1 - ZENITH_DIM * ambience.darkness);
  into.zenith.lerp(AZURE, ZENITH_AZURE * day * MathUtils.clamp(1 - (ambience.haze - 1) * AZURE_HAZE_FADE, 0, 1));
  into.zenith.lerp(scratch.copy(skyShown).multiplyScalar(NIGHT_ZENITH), night);
  into.zenith.lerp(scratch.copy(fogShown).multiplyScalar(ENCLOSED_ZENITH), 1 - open);
  into.spread = MathUtils.lerp(DAY_SPREAD, NIGHT_SPREAD, night);
  into.sun.copy(SUN_WARM).lerp(into.horizon, SUN_HORIZON_TINT).multiplyScalar(SUN_GLOW * day * open).add(scratch.copy(MOON_COOL).multiplyScalar(MOON_GLOW * night * open));
  into.clouds = CLOUD_COVER * open;
  into.cloudLit.copy(into.horizon).lerp(WHITE, CLOUD_DAY_LIFT).lerp(scratch.copy(into.horizon).multiplyScalar(CLOUD_NIGHT_GLOW), night);
  into.cloudShade.copy(into.cloudLit).multiplyScalar(CLOUD_SHADE).lerp(scratch.copy(into.zenith).lerp(into.horizon, 0.5), night);
  into.arch.copy(into.horizon).lerp(WHITE, ARCH_DAY_LIFT).lerp(ARCH_NIGHT_COLOR, night);
  into.archShow = MathUtils.lerp(ARCH_DAY, ARCH_NIGHT, night) * open;
  into.lights.copy(CITY_LIGHTS).multiplyScalar(night * open);
  return into;
}
