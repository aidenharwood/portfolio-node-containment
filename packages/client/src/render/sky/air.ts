import { Color, Vector3, Vector4, type IUniform } from 'three';

export const MOOD_CAP = 0.6;
const MOOD_DENSITY = 0.018;
const DAY_THINNING = 0.55;
const FOCUS_LEAD = 4;
const AERIAL_POWER = 1.5;
const REACH_MARGIN = 30;
const WINDOW_FROM = 16;
export const WINDOW_EDGE = 56;
const WINDOW_POWER = 2;
const HORIZON_SHARE = 0.99;

export interface AirShape {
  density: number;
  cap: number;
  from: number;
  length: number;
  power: number;
}

export interface AirAmbience {
  readonly darkness: number;
  readonly daylight: number;
  readonly haze: number;
}

export const createAirShape = (): AirShape => ({ density: MOOD_DENSITY, cap: MOOD_CAP, from: WINDOW_FROM, length: 1, power: WINDOW_POWER });

export const aerialLength = (edge: number, from: number, power: number): number => Math.max(1, edge - from) / Math.log(1 / (1 - HORIZON_SHARE)) ** (1 / power);

export function airShapeFor(ambience: AirAmbience, night: number, reach: number | null, into: AirShape = createAirShape()): AirShape {
  into.density = MOOD_DENSITY * ambience.haze * (1 - ambience.daylight * (1 - night) * DAY_THINNING);
  into.cap = MOOD_CAP;
  if (reach === null) {
    into.from = WINDOW_FROM;
    into.power = WINDOW_POWER;
    into.length = aerialLength(WINDOW_EDGE, WINDOW_FROM, WINDOW_POWER);
  } else {
    into.from = 0;
    into.power = AERIAL_POWER;
    into.length = aerialLength(reach - REACH_MARGIN, 0, AERIAL_POWER);
  }
  return into;
}

export interface AirAt {
  readonly mood: number;
  readonly aerial: number;
  readonly total: number;
}

export function fogAt(past: number, shape: AirShape): AirAt {
  const distance = Math.max(0, past);
  const mood = (1 - Math.exp(-((shape.density * distance) ** 2))) * shape.cap;
  const aerial = 1 - Math.exp(-((Math.max(0, distance - shape.from) / shape.length) ** shape.power));
  return { mood, aerial, total: 1 - (1 - mood) * (1 - aerial) };
}

export const focusPlaneOf = (focusDistance: number): number => Math.max(0, focusDistance - FOCUS_LEAD);

export const airUniforms = {
  airHaze: { value: new Color() },
  airHorizon: { value: new Color() },
  airNear: { value: new Vector4(0, MOOD_DENSITY, MOOD_CAP, 1) },
  airFar: { value: new Vector3(WINDOW_FROM, 1, WINDOW_POWER) },
};

export function setAir(shape: AirShape, haze: Color, horizon: Color, strength: number): void {
  airUniforms.airHaze.value.copy(haze);
  airUniforms.airHorizon.value.copy(horizon);
  const near = airUniforms.airNear.value;
  near.set(near.x, shape.density, shape.cap, strength);
  airUniforms.airFar.value.set(shape.from, shape.length, shape.power);
}

export function setAirFocus(focusDistance: number): void {
  airUniforms.airNear.value.x = focusPlaneOf(focusDistance);
}

export const AIR_PARS = `uniform vec3 airHaze;
uniform vec3 airHorizon;
uniform vec4 airNear;
uniform vec3 airFar;
vec3 airApply( vec3 color, float depth, float share ) {
	float past = max( depth - airNear.x, 0.0 );
	float mood = ( 1.0 - exp( - airNear.y * airNear.y * past * past ) ) * airNear.z;
	float aerial = 1.0 - exp( - pow( max( past - airFar.x, 0.0 ) / airFar.y, airFar.z ) );
	color = mix( color, airHaze, mood * airNear.w * share );
	return mix( color, airHorizon, aerial * airNear.w * share );
}`;

export const airFragment = (share: number): string => `#ifdef USE_FOG
	gl_FragColor.rgb = airApply( gl_FragColor.rgb, vFogDepth, ${share.toFixed(3)} );
#endif`;

export function receiveAir(shader: { uniforms: Record<string, IUniform>; fragmentShader: string }, share = 1): void {
  Object.assign(shader.uniforms, airUniforms);
  shader.fragmentShader = shader.fragmentShader.replace('#include <fog_pars_fragment>', `#include <fog_pars_fragment>\n${AIR_PARS}`).replace('#include <fog_fragment>', airFragment(share));
}
