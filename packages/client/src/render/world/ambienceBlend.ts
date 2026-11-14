import type { ResolvedLevel, TilePoint } from '@containment/shared';
import { Color } from 'three';

export interface BlendedAmbience {
  darkness: number;
  daylight: number;
  readonly tint: Color;
  readonly fog: Color;
  readonly sky: Color;
}

export const AMBIENCE_BLEND_RADIUS = 3;

export const createBlendedAmbience = (): BlendedAmbience => ({ darkness: 0.5, daylight: 0, tint: new Color(), fog: new Color(), sky: new Color() });

export function sampleAmbience(level: ResolvedLevel, centre: TilePoint, into: BlendedAmbience = createBlendedAmbience()): BlendedAmbience {
  let samples = 0;
  let darkness = 0;
  let daylight = 0;
  const tint = new Color(0, 0, 0);
  const fog = new Color(0, 0, 0);
  const sky = new Color(0, 0, 0);
  const scratch = new Color();
  for (let dy = -AMBIENCE_BLEND_RADIUS; dy <= AMBIENCE_BLEND_RADIUS; dy++) {
    for (let dx = -AMBIENCE_BLEND_RADIUS; dx <= AMBIENCE_BLEND_RADIUS; dx++) {
      const point = { x: centre.x + dx, y: centre.y + dy };
      if (!level.layout.districtAt(point) && !level.layout.connectorAt(point)) continue;
      const ambience = level.ambienceAt(point);
      darkness += ambience.darkness;
      tint.add(scratch.set(ambience.tint));
      fog.add(scratch.set(ambience.fog));
      if (ambience.sky) {
        sky.add(scratch.set(ambience.sky));
        daylight++;
      }
      samples++;
    }
  }
  if (samples === 0) {
    const ambience = level.ambienceAt(centre);
    into.darkness = ambience.darkness;
    into.tint.set(ambience.tint);
    into.fog.set(ambience.fog);
    into.daylight = ambience.sky ? 1 : 0;
    if (ambience.sky) into.sky.set(ambience.sky);
    return into;
  }
  into.darkness = darkness / samples;
  into.tint.copy(tint.multiplyScalar(1 / samples));
  into.fog.copy(fog.multiplyScalar(1 / samples));
  into.daylight = daylight / samples;
  if (daylight > 0) into.sky.copy(sky.multiplyScalar(1 / daylight));
  return into;
}

export function easeAmbience(current: BlendedAmbience, target: BlendedAmbience, amount: number): void {
  current.darkness += (target.darkness - current.darkness) * amount;
  current.tint.lerp(target.tint, amount);
  current.fog.lerp(target.fog, amount);
  current.daylight += (target.daylight - current.daylight) * amount;
  if (target.daylight > 0) current.sky.lerp(target.sky, current.daylight > 0 ? amount : 1);
}

export function copyAmbience(into: BlendedAmbience, from: BlendedAmbience): void {
  into.darkness = from.darkness;
  into.tint.copy(from.tint);
  into.fog.copy(from.fog);
  into.daylight = from.daylight;
  into.sky.copy(from.sky);
}
