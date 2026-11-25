import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import type { TileKindId, TileLayout, TileRect } from '@containment/shared';
import { receiveFieldLights } from '../voxel/fieldLights.ts';
import { STEP_HEIGHT } from './worldScale.ts';

export const SHORE_REACH = 8;
const DEEP_AT = 5;

const VERTEX_DECLARATIONS = `
  attribute float depth;
  uniform float time;
  varying vec2 vWorld;
  varying float vDepth;
`;

const VERTEX_DISPLACEMENT = `
  #include <begin_vertex>
  vWorld = position.xz;
  vDepth = depth;
  transformed.y += sin(position.x * 2.3 + time * 1.4) * 0.006 + cos(position.z * 2.9 + time * 1.1) * 0.006;
`;

const FRAGMENT_DECLARATIONS = `
  uniform float time;
  uniform vec3 deepColor;
  uniform vec3 shallowColor;
  uniform vec3 glowColor;
  uniform vec3 foamColor;
  uniform float bodyGlow;
  uniform float causticGlow;
  varying vec2 vWorld;
  varying float vDepth;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float octave(vec2 p, float frequency, float footprint) {
    return mix(0.5, noise(p), 1.0 - smoothstep(0.2, 0.5, footprint * frequency));
  }

  float ripples(vec2 p, float footprint) {
    float value = octave(p * 3.0 + vec2(time * 0.35, time * 0.22), 3.0, footprint);
    value += 0.5 * octave(p * 6.5 - vec2(time * 0.5, -time * 0.3), 6.5, footprint);
    value += 0.25 * octave(p * 13.0 + vec2(-time * 0.7, time * 0.6), 13.0, footprint);
    return value / 1.75;
  }
`;

const FRAGMENT_SURFACE = `
  #include <color_fragment>
  float footprint = max(length(dFdx(vWorld)), length(dFdy(vWorld)));
  float settle = 1.0 - smoothstep(0.03, 0.15, footprint);
  float deepness = smoothstep(0.0, DEEP_AT, vDepth);
  float waves = ripples(vWorld, footprint);
  float wobble = clamp(1.0 + (noise(vWorld * 0.55 + 17.0) - 0.5) * 1.3 + (noise(vWorld * 2.1 - 9.0) - 0.5) * 0.5, 0.45, 1.8);
  float shore = 1.0 - smoothstep(0.0, 0.32, vDepth * wobble);
  float foam = shore * smoothstep(0.35, 0.75, mix(0.5, noise(vWorld * 7.0 + time * 0.8), settle) + shore * 0.4);
  float caustic = smoothstep(0.64, 0.8, ripples(vWorld * 1.7 + 4.0, footprint * 1.7)) * 0.55 * settle * (1.0 - 0.6 * deepness);
  vec3 body = mix(shallowColor, deepColor, deepness);
  diffuseColor.rgb = mix(body * (1.0 + (waves - 0.5) * mix(0.25, 0.6, settle)), foamColor, foam * 0.55);
  diffuseColor.a = clamp(mix(0.7, 0.88, deepness) + caustic * 0.12 + foam * 0.2, 0.0, 1.0);
`;

const FRAGMENT_NORMAL = `
  #include <normal_fragment_begin>
  vec2 slope = vec2(ripples(vWorld + vec2(0.125, 0.0), footprint) - ripples(vWorld - vec2(0.125, 0.0), footprint), ripples(vWorld + vec2(0.0, 0.125), footprint) - ripples(vWorld - vec2(0.0, 0.125), footprint)) * 0.35 * mix(0.3, 1.0, settle);
  normal = normalize(normal + (viewMatrix * vec4(-slope.x * RIPPLE_TILT, 0.0, -slope.y * RIPPLE_TILT, 0.0)).xyz);
`;

const FRAGMENT_SPECULAR_CLAMP = `
  #include <lights_fragment_end>
  reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(1.2));
`;

const FRAGMENT_GLOW = `
  #include <emissivemap_fragment>
  totalEmissiveRadiance += glowColor * caustic * causticGlow + foamColor * foam * 0.08 + body * bodyGlow;
`;

const FRAGMENT_HORIZON = `
  #ifdef USE_FOG
  float horizon = 0.04 + 0.46 * pow(1.0 - clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0), 3.0);
  outgoingLight = mix(outgoingLight, fogColor, horizon);
  #endif
  #include <opaque_fragment>
`;

const RIPPLE_TILT = '2.5';

export interface LiquidPalette {
  readonly deep: number;
  readonly shallow: number;
  readonly glow: number;
  readonly foam: number;
  readonly level: number;
  readonly body: number;
  readonly caustics: number;
}

export const COOLANT_PALETTE: LiquidPalette = { deep: 0x041f2a, shallow: 0x13607a, glow: 0x3fa8c0, foam: 0xa8e8f0, level: -0.07, body: 0.9, caustics: 0.6 };

export const WATER_PALETTE: LiquidPalette = { deep: 0x1e3a48, shallow: 0x3a6070, glow: 0x3a7080, foam: 0x8aa6aa, level: -0.105, body: 0.3, caustics: 0.25 };

export function shoreDepths(isOpen: (x: number, y: number) => boolean, region: TileRect, reach = SHORE_REACH): Float32Array {
  const margin = Math.ceil(reach) + 1;
  const width = region.width + margin * 2;
  const height = region.height + margin * 2;
  const field = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) field[y * width + x] = isOpen(region.x - margin + x, region.y - margin + y) ? reach + 0.5 : 0;
  }
  const relax = (at: number, from: number, step: number): void => {
    field[at] = Math.min(field[at] as number, (field[from] as number) + step);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * width + x;
      if (x > 0) relax(at, at - 1, 1);
      if (y === 0) continue;
      relax(at, at - width, 1);
      if (x > 0) relax(at, at - width - 1, Math.SQRT2);
      if (x < width - 1) relax(at, at - width + 1, Math.SQRT2);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const at = y * width + x;
      if (x < width - 1) relax(at, at + 1, 1);
      if (y === height - 1) continue;
      relax(at, at + width, 1);
      if (x < width - 1) relax(at, at + width + 1, Math.SQRT2);
      if (x > 0) relax(at, at + width - 1, Math.SQRT2);
    }
  }
  const corners = new Float32Array((region.width + 1) * (region.height + 1));
  for (let cy = 0; cy <= region.height; cy++) {
    for (let cx = 0; cx <= region.width; cx++) {
      const below = (cy + margin) * width + cx + margin;
      const above = below - width;
      const around = (field[above - 1] as number) + (field[above] as number) + (field[below - 1] as number) + (field[below] as number);
      corners[cy * (region.width + 1) + cx] = Math.min(reach, Math.max(0, around / 4 - 0.5));
    }
  }
  return corners;
}

export class LiquidSurface {
  readonly mesh: Mesh;
  private readonly material: MeshStandardMaterial;
  private readonly time: { value: number };

  private constructor(mesh: Mesh, material: MeshStandardMaterial, time: { value: number }) {
    this.mesh = mesh;
    this.material = material;
    this.time = time;
  }

  static build(layout: TileLayout, kind: string, region: TileRect, palette: LiquidPalette = COOLANT_PALETTE): LiquidSurface | null {
    const positions: number[] = [];
    const depths: number[] = [];
    const indices: number[] = [];
    const isLiquid = (x: number, y: number) => layout.tileAt({ x, y }) === kind;
    const beyondShore = (x: number, y: number): boolean => {
      const tile: TileKindId = layout.tileAt({ x, y });
      return tile === kind || tile === 'void';
    };
    const shore = shoreDepths(beyondShore, region);
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        if (!isLiquid(x, y)) continue;
        const base = positions.length / 3;
        const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
        for (const [u, v] of corners) {
          positions.push(x - 0.5 + u, palette.level + layout.heightAt({ x, y }) * STEP_HEIGHT, y - 0.5 + v);
          depths.push(shore[(y - region.y + v) * (region.width + 1) + x - region.x + u] as number);
        }
        indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    }
    if (indices.length === 0) return null;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('depth', new Float32BufferAttribute(depths, 1));
    geometry.setAttribute('normal', new Float32BufferAttribute(positions.map((_value, index) => (index % 3 === 1 ? 1 : 0)), 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const time = { value: 0 };
    const material = receiveFieldLights(new MeshStandardMaterial({ roughness: 0.3, metalness: 0, transparent: true, depthWrite: false, side: DoubleSide }), 0, 'mirror');
    const fieldCompile = material.onBeforeCompile.bind(material);
    const fieldKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      fieldCompile(shader, renderer);
      shader.uniforms.time = time;
      shader.uniforms.deepColor = { value: new Color(palette.deep) };
      shader.uniforms.shallowColor = { value: new Color(palette.shallow) };
      shader.uniforms.glowColor = { value: new Color(palette.glow) };
      shader.uniforms.foamColor = { value: new Color(palette.foam) };
      shader.uniforms.bodyGlow = { value: palette.body };
      shader.uniforms.causticGlow = { value: palette.caustics };
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
${VERTEX_DECLARATIONS}`).replace('#include <begin_vertex>', VERTEX_DISPLACEMENT);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
${FRAGMENT_DECLARATIONS}`)
        .replace('#include <color_fragment>', FRAGMENT_SURFACE.replaceAll('DEEP_AT', DEEP_AT.toFixed(1)))
        .replace('#include <normal_fragment_begin>', FRAGMENT_NORMAL.replaceAll('RIPPLE_TILT', RIPPLE_TILT))
        .replace('#include <emissivemap_fragment>', FRAGMENT_GLOW)
        .replace('#include <lights_fragment_end>', FRAGMENT_SPECULAR_CLAMP)
        .replace('#include <opaque_fragment>', FRAGMENT_HORIZON);
    };
    material.customProgramCacheKey = () => `${fieldKey()}:liquid-depth:${palette.deep}:${palette.shallow}:${palette.glow}:${palette.foam}`;
    const mesh = new Mesh(geometry, material);
    mesh.renderOrder = 1;
    mesh.name = 'liquid';
    return new LiquidSurface(mesh, material, time);
  }

  update(time: number): void {
    this.time.value = time;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
