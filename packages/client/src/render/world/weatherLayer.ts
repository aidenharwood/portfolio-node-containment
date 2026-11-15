import { SKY_WEATHER, WEATHER_KINDS, type WeatherKind } from '@containment/shared';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  NormalBlending,
  Points,
  PointsMaterial,
  ShaderMaterial,
  type Blending,
  type Texture,
  type Vector3,
} from 'three';
import type { BlendedAmbience } from './ambienceBlend.ts';
import type { LightSource } from './levelScene.ts';

const RADIUS = 13;
const CEILING = 9;
const SPAWN_TRIES = 4;
const HIDDEN = -50;
const DEFAULT_DISTANCE = 11;
const CAMERA_CLEARANCE = 2.5;
const RIPPLE_LIFE = 0.35;
const FLASH_MIN_GAP = 20;
const FLASH_MAX_GAP = 55;

export interface SkyTest {
  isOpen(x: number, z: number): boolean;
}

export interface WeatherFrame {
  readonly delta: number;
  readonly time: number;
  readonly focus: Vector3;
  readonly camera: Vector3;
  readonly ambience: BlendedAmbience;
  readonly enabled: boolean;
  readonly sources: readonly LightSource[];
  readonly pixelRatio: number;
  readonly viewportHeight: number;
}

interface Pass {
  readonly step: number;
  readonly time: number;
  readonly focus: Vector3;
  readonly camera: Vector3;
  readonly reach: number;
  readonly zoom: number;
  readonly gust: number;
  readonly frame: WeatherFrame;
}

interface WeatherSystem {
  readonly object: Points | LineSegments;
  update(pass: Pass, weight: number): void;
}

const textures = new Map<string, Texture>();

function gradientTexture(key: string, stops: readonly (readonly [number, number])[]): Texture {
  const existing = textures.get(key);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [offset, alpha] of stops) gradient.addColorStop(offset, `rgba(255,255,255,${alpha})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new CanvasTexture(canvas);
  textures.set(key, texture);
  return texture;
}

const softTexture = () => gradientTexture('soft', [[0, 1], [0.35, 0.55], [1, 0]]);
const hazeTexture = () => gradientTexture('haze', [[0, 0.5], [0.5, 0.18], [1, 0]]);

const wrap = (value: number, centre: number, reach: number): number => {
  const offset = value - centre;
  if (offset > reach) return value - reach * 2;
  if (offset < -reach) return value + reach * 2;
  return value;
};

const scatter = (centre: number, reach: number): number => centre + (Math.random() * 2 - 1) * reach;

interface PrecipitationStyle {
  readonly count: number;
  readonly speed: number;
  readonly length: number;
  readonly drift: number;
  readonly color: number;
  readonly opacity: number;
  readonly splash: number;
}

const RIPPLE_VERTEX = `
attribute float age;
uniform float pointScale;
varying float vAge;
void main() {
  vAge = age;
  vec4 viewPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * viewPosition;
  float t = clamp( age / ${RIPPLE_LIFE.toFixed(2)}, 0.0, 1.0 );
  gl_PointSize = mix( 0.25, 0.9, t ) * pointScale / - viewPosition.z;
}`;

const RIPPLE_FRAGMENT = `
uniform vec3 color;
uniform float opacity;
varying float vAge;
void main() {
  float t = vAge / ${RIPPLE_LIFE.toFixed(2)};
  if ( t >= 1.0 ) discard;
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  uv.y *= 1.6;
  float ring = 1.0 - smoothstep( 0.0, 0.12, abs( length( uv ) - 0.75 ) );
  float fade = ( 1.0 - t ) * ( 1.0 - t );
  gl_FragColor = vec4( color, ring * opacity * fade );
}`;

class Precipitation implements WeatherSystem {
  readonly object: LineSegments;
  private readonly style: PrecipitationStyle;
  private readonly sky: SkyTest;
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly z: Float32Array;
  private readonly positions: Float32Array;
  private readonly material: LineBasicMaterial;
  private readonly ripples: Points;
  private readonly ripplePositions: Float32Array;
  private readonly rippleAge: Float32Array;
  private readonly rippleMaterial: ShaderMaterial;
  private nextRipple = 0;
  private seeded = false;
  private frameCount = 0;

  constructor(style: PrecipitationStyle, sky: SkyTest) {
    this.style = style;
    this.sky = sky;
    this.x = new Float32Array(style.count);
    this.y = new Float32Array(style.count).fill(HIDDEN);
    this.z = new Float32Array(style.count);
    this.positions = new Float32Array(style.count * 6);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage));
    this.material = new LineBasicMaterial({ color: style.color, transparent: true, opacity: style.opacity, depthWrite: false });
    this.object = new LineSegments(geometry, this.material);
    this.object.frustumCulled = false;
    const rippleCount = Math.max(1, Math.floor(style.count / 3));
    this.ripplePositions = new Float32Array(rippleCount * 3).fill(HIDDEN);
    this.rippleAge = new Float32Array(rippleCount).fill(RIPPLE_LIFE);
    const rippleGeometry = new BufferGeometry();
    rippleGeometry.setAttribute('position', new BufferAttribute(this.ripplePositions, 3).setUsage(DynamicDrawUsage));
    rippleGeometry.setAttribute('age', new BufferAttribute(this.rippleAge, 1).setUsage(DynamicDrawUsage));
    this.rippleMaterial = new ShaderMaterial({
      uniforms: { color: { value: new Color(style.color) }, opacity: { value: style.splash }, pointScale: { value: 400 } },
      vertexShader: RIPPLE_VERTEX,
      fragmentShader: RIPPLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    this.ripples = new Points(rippleGeometry, this.rippleMaterial);
    this.ripples.frustumCulled = false;
    this.object.add(this.ripples);
  }

  private respawn(index: number, pass: Pass, anywhere: boolean): void {
    for (let attempt = 0; attempt < SPAWN_TRIES; attempt++) {
      const landX = scatter(pass.focus.x, pass.reach);
      const landZ = scatter(pass.focus.z, pass.reach);
      if (!this.sky.isOpen(landX, landZ)) continue;
      const y = anywhere ? Math.random() * CEILING : CEILING + Math.random() * 2;
      const x = landX - (this.style.drift * pass.gust * y) / this.style.speed;
      const crossX = landX - (this.style.drift * pass.gust * pass.camera.y) / this.style.speed;
      if ((crossX - pass.camera.x) ** 2 + (landZ - pass.camera.z) ** 2 < CAMERA_CLEARANCE * CAMERA_CLEARANCE) continue;
      this.x[index] = x;
      this.z[index] = landZ;
      this.y[index] = y;
      return;
    }
    this.y[index] = HIDDEN;
  }

  update(pass: Pass, weight: number): void {
    const { count, speed, length, drift } = this.style;
    const active = Math.floor(count * Math.min(1, weight));
    this.object.visible = active > 0;
    if (!this.object.visible) {
      this.seeded = false;
      return;
    }
    this.frameCount++;
    this.material.opacity = this.style.opacity * Math.min(1.6, pass.frame.pixelRatio ** 0.7);
    this.rippleMaterial.uniforms.pointScale!.value = pass.frame.viewportHeight / 2;
    const sway = drift * pass.gust;
    const lean = (sway / speed) * length;
    for (let index = 0; index < active; index++) {
      if (!this.seeded) {
        this.respawn(index, pass, true);
      } else if (this.y[index]! <= HIDDEN + 1) {
        if ((this.frameCount + index) % 4 === 0) this.respawn(index, pass, false);
      } else {
        this.y[index]! -= speed * pass.step;
        this.x[index]! += sway * pass.step;
        if (this.y[index]! <= 0) {
          this.ripple(this.x[index]!, this.z[index]!);
          this.respawn(index, pass, false);
        }
      }
      const base = index * 6;
      const y = this.y[index]!;
      this.positions[base] = this.x[index]!;
      this.positions[base + 1] = y;
      this.positions[base + 2] = this.z[index]!;
      this.positions[base + 3] = this.x[index]! - lean;
      this.positions[base + 4] = y + length;
      this.positions[base + 5] = this.z[index]!;
    }
    this.seeded = true;
    const geometry = this.object.geometry;
    geometry.setDrawRange(0, active * 2);
    geometry.attributes.position!.needsUpdate = true;
    this.ageRipples(pass.step);
  }

  private ripple(x: number, z: number): void {
    if (this.style.splash <= 0 || Math.random() > 0.3 || !this.sky.isOpen(x, z)) return;
    const index = this.nextRipple;
    this.nextRipple = (this.nextRipple + 1) % this.rippleAge.length;
    this.rippleAge[index] = 0;
    this.ripplePositions[index * 3] = x;
    this.ripplePositions[index * 3 + 1] = 0.1;
    this.ripplePositions[index * 3 + 2] = z;
  }

  private ageRipples(step: number): void {
    for (let index = 0; index < this.rippleAge.length; index++) this.rippleAge[index] = Math.min(RIPPLE_LIFE, this.rippleAge[index]! + step);
    this.ripples.geometry.attributes.position!.needsUpdate = true;
    this.ripples.geometry.attributes.age!.needsUpdate = true;
  }
}

interface Emitters {
  readonly fraction: number;
  readonly accepts: (source: LightSource) => boolean;
  readonly spread: number;
  readonly lift: number;
  readonly bursts?: boolean;
}

interface MoteStyle {
  readonly count: number;
  readonly size: number;
  readonly colors: readonly number[];
  readonly opacity: number;
  readonly blending: Blending;
  readonly floor: number;
  readonly ceiling: number;
  readonly rise: number;
  readonly sway: number;
  readonly drift: number;
  readonly glow?: number;
  readonly twinkle?: 'life' | 'pulse';
  readonly haze?: boolean;
  readonly underSky?: boolean;
  readonly emitters?: Emitters;
}

class Motes implements WeatherSystem {
  readonly object: Points;
  private readonly style: MoteStyle;
  private readonly sky: SkyTest;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly baseColors: Float32Array;
  private readonly phase: Float32Array;
  private readonly material: PointsMaterial;
  private readonly scratch = new Color();
  private readonly candidates: LightSource[] = [];
  private seeded = false;

  constructor(style: MoteStyle, sky: SkyTest) {
    this.style = style;
    this.sky = sky;
    this.positions = new Float32Array(style.count * 3);
    this.colors = new Float32Array(style.count * 3);
    this.baseColors = new Float32Array(style.count * 3);
    this.phase = new Float32Array(style.count);
    for (let index = 0; index < style.count; index++) {
      this.phase[index] = Math.random() * Math.PI * 2;
      this.scratch.setHex(style.colors[index % style.colors.length]!);
      this.baseColors.set([this.scratch.r, this.scratch.g, this.scratch.b], index * 3);
    }
    this.colors.set(this.baseColors);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('color', new BufferAttribute(this.colors, 3).setUsage(DynamicDrawUsage));
    const additive = style.blending === AdditiveBlending;
    this.material = new PointsMaterial({
      size: style.size,
      map: style.haze ? hazeTexture() : softTexture(),
      vertexColors: true,
      transparent: true,
      opacity: style.opacity,
      blending: style.blending,
      depthWrite: false,
      depthTest: !style.haze,
      fog: !additive,
    });
    if (style.glow) this.material.color.setScalar(style.glow);
    this.object = new Points(geometry, this.material);
    this.object.frustumCulled = false;
  }

  private place(index: number, pass: Pass, anywhere: boolean): void {
    const { floor, ceiling, rise, emitters } = this.style;
    const base = index * 3;
    const range = ceiling - floor;
    if (emitters && this.candidates.length > 0 && Math.random() < emitters.fraction) {
      const source = this.candidates[Math.floor(Math.random() * this.candidates.length)]!;
      this.positions[base] = source.position.x + (Math.random() * 2 - 1) * emitters.spread;
      this.positions[base + 1] = MathUtils.clamp(source.position.y + emitters.lift, floor, ceiling);
      this.positions[base + 2] = source.position.z + (Math.random() * 2 - 1) * emitters.spread;
      return;
    }
    if (emitters && emitters.fraction >= 1) {
      this.positions[base + 1] = HIDDEN;
      return;
    }
    for (let attempt = 0; attempt < SPAWN_TRIES; attempt++) {
      const x = scatter(pass.focus.x, pass.reach);
      const z = scatter(pass.focus.z, pass.reach);
      if (this.style.underSky && !this.sky.isOpen(x, z)) continue;
      this.positions[base] = x;
      this.positions[base + 2] = z;
      this.positions[base + 1] = anywhere || rise === 0 ? floor + Math.random() * range : rise > 0 ? floor + Math.random() * 0.15 * range : ceiling - Math.random() * 0.15 * range;
      return;
    }
    this.positions[base + 1] = HIDDEN;
  }

  private gather(pass: Pass): void {
    this.candidates.length = 0;
    const emitters = this.style.emitters;
    if (!emitters) return;
    const reach = pass.reach * pass.reach;
    for (const source of pass.frame.sources) {
      if ((source.position.x - pass.focus.x) ** 2 + (source.position.z - pass.focus.z) ** 2 > reach) continue;
      if (emitters.accepts(source) && (!emitters.bursts || Math.sin(pass.time * 1.3 + source.seed) > 0.92)) this.candidates.push(source);
    }
  }

  update(pass: Pass, weight: number): void {
    this.object.visible = weight > 0.02;
    if (!this.object.visible) {
      this.seeded = false;
      return;
    }
    this.gather(pass);
    const { count, floor, ceiling, rise, sway, drift, twinkle } = this.style;
    const range = ceiling - floor;
    this.material.opacity = this.style.opacity * Math.min(1, weight);
    this.material.size = this.style.size * MathUtils.clamp(pass.zoom, 0.7, 1.6);
    if (this.style.haze) this.material.color.copy(pass.frame.ambience.fog).lerp(this.scratch.setRGB(1, 1, 1), 0.35);
    const wind = drift * pass.gust;
    for (let index = 0; index < count; index++) {
      const base = index * 3;
      if (!this.seeded || this.positions[base + 1]! <= HIDDEN + 1) {
        this.place(index, pass, !this.seeded);
      } else {
        const phase = this.phase[index]!;
        const lift = rise * (0.6 + 0.4 * Math.sin(phase * 3.1));
        this.positions[base] = wrap(this.positions[base]! + (wind + Math.sin(pass.time * 0.7 + phase) * sway) * pass.step, pass.focus.x, pass.reach);
        this.positions[base + 1]! += (lift + Math.cos(pass.time * 0.9 + phase) * sway * 0.4) * pass.step;
        this.positions[base + 2] = wrap(this.positions[base + 2]! + Math.cos(pass.time * 0.5 + phase * 1.7) * sway * pass.step, pass.focus.z, pass.reach);
        const y = this.positions[base + 1]!;
        if (rise === 0) this.positions[base + 1] = MathUtils.clamp(y, floor, ceiling);
        else if (y > ceiling || y < floor) this.place(index, pass, false);
      }
      if (twinkle) {
        const y = this.positions[base + 1]!;
        const level = twinkle === 'life' ? Math.max(0, Math.sin((Math.PI * (y - floor)) / range)) : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(pass.time * 0.8 + this.phase[index]!));
        this.colors[base] = this.baseColors[base]! * level;
        this.colors[base + 1] = this.baseColors[base + 1]! * level;
        this.colors[base + 2] = this.baseColors[base + 2]! * level;
      }
    }
    this.seeded = true;
    this.object.geometry.attributes.position!.needsUpdate = true;
    if (twinkle) this.object.geometry.attributes.color!.needsUpdate = true;
  }
}

const isWarm = (source: LightSource): boolean => source.flicker && ((source.color >> 16) & 255) > 180 && ((source.color >> 8) & 255) < 160 && (source.color & 255) < 120;

export class WeatherLayer {
  readonly root = new Group();
  flash = 0;
  private readonly systems: Readonly<Record<WeatherKind, WeatherSystem>>;
  private nextFlash = FLASH_MIN_GAP;
  private sinceFlash = Infinity;

  constructor(sky: SkyTest) {
    this.systems = {
      rain: new Precipitation({ count: 1100, speed: 21, length: 0.55, drift: 2.2, color: 0x9fc4d8, opacity: 0.32, splash: 0.35 }, sky),
      drizzle: new Precipitation({ count: 800, speed: 9, length: 0.16, drift: 1.6, color: 0xa8c4d4, opacity: 0.28, splash: 0.3 }, sky),
      mist: new Motes({ count: 40, size: 9, colors: [0xffffff], opacity: 0.05, blending: NormalBlending, floor: 1, ceiling: 2.2, rise: 0, sway: 0.15, drift: 0.25, haze: true }, sky),
      embers: new Motes(
        {
          count: 90,
          size: 0.26,
          colors: [0xff8a3a, 0xffb04f, 0xff5a2a],
          opacity: 0.95,
          blending: AdditiveBlending,
          floor: 0,
          ceiling: 5,
          rise: 1.1,
          sway: 0.35,
          drift: 0.2,
          glow: 2.5,
          twinkle: 'life',
          emitters: { fraction: 0.6, accepts: isWarm, spread: 0.25, lift: 0.3 },
        },
        sky,
      ),
      ash: new Motes({ count: 260, size: 0.16, colors: [0xb8b4ac, 0x8f8c86, 0xd6d0c4], opacity: 0.55, blending: NormalBlending, floor: 0, ceiling: CEILING, rise: -0.35, sway: 0.3, drift: 0.4, underSky: true }, sky),
      spores: new Motes({ count: 110, size: 0.3, colors: [0x6fffd2, 0x7fd8ff, 0xd9a8ff], opacity: 0.85, blending: AdditiveBlending, floor: 0.1, ceiling: 2.6, rise: 0.06, sway: 0.25, drift: 0.05, glow: 1.8, twinkle: 'pulse' }, sky),
      dust: new Motes({ count: 150, size: 0.09, colors: [0xcfd8dc, 0xe8e0d0], opacity: 0.22, blending: AdditiveBlending, floor: 0.2, ceiling: 2.4, rise: 0.02, sway: 0.12, drift: 0.03 }, sky),
      sparks: new Motes(
        {
          count: 40,
          size: 0.14,
          colors: [0xcfe8ff, 0xffe0a0],
          opacity: 1,
          blending: AdditiveBlending,
          floor: 0,
          ceiling: 2.2,
          rise: -2.5,
          sway: 0.2,
          drift: 0,
          glow: 2.5,
          twinkle: 'life',
          emitters: { fraction: 1, accepts: (source) => source.flicker, spread: 0.2, lift: 0, bursts: true },
        },
        sky,
      ),
    };
    for (const kind of WEATHER_KINDS) this.root.add(this.systems[kind].object);
  }

  update(frame: WeatherFrame): void {
    const { ambience, enabled, focus, camera, time } = frame;
    const distance = camera.distanceTo(focus);
    const zoom = distance / DEFAULT_DISTANCE;
    const pass: Pass = {
      step: Math.min(frame.delta, 0.1),
      time,
      focus,
      camera,
      reach: RADIUS * MathUtils.clamp(zoom, 1, 2),
      zoom,
      gust: 0.6 + 0.4 * Math.sin(time * 0.23) + 0.25 * Math.sin(time * 0.71 + 1.3),
      frame,
    };
    for (const kind of WEATHER_KINDS) {
      const base = enabled ? ambience.weather[kind] : 0;
      const weight = SKY_WEATHER.has(kind) ? base : kind === 'mist' ? base * (0.4 + 0.6 * ambience.exposure) : kind === 'dust' ? base * (1 - 0.8 * ambience.exposure) : base;
      this.systems[kind].update(pass, weight);
    }
    this.updateFlash(pass.step, enabled ? ambience.weather.rain : 0);
  }

  private updateFlash(step: number, rain: number): void {
    if (rain <= 0.5) {
      this.flash = 0;
      this.sinceFlash = Infinity;
      return;
    }
    this.nextFlash -= step;
    if (this.nextFlash <= 0) {
      this.nextFlash = FLASH_MIN_GAP + Math.random() * (FLASH_MAX_GAP - FLASH_MIN_GAP);
      this.sinceFlash = 0;
    }
    this.sinceFlash += step;
    const t = this.sinceFlash;
    const pulse = t < 0.08 ? 1 : t < 0.15 ? 0 : t < 0.22 ? 1 : t < 0.4 ? 0.6 * (1 - (t - 0.22) / 0.18) : 0;
    this.flash = pulse * rain;
  }
}
