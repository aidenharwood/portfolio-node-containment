import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import type { TileLayout, TileRect } from '@containment/shared';
import { receiveFieldLights } from '../voxel/fieldLights.ts';


const VERTEX_DECLARATIONS = `
  attribute vec4 edges;
  attribute vec2 local;
  uniform float time;
  varying vec4 vEdges;
  varying vec2 vLocal;
  varying vec2 vWorld;
`;

const VERTEX_DISPLACEMENT = `
  #include <begin_vertex>
  vEdges = edges;
  vLocal = local;
  vWorld = position.xz;
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
  varying vec4 vEdges;
  varying vec2 vLocal;
  varying vec2 vWorld;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float ripples(vec2 p) {
    float value = noise(p * 3.0 + vec2(time * 0.35, time * 0.22));
    value += 0.5 * noise(p * 6.5 - vec2(time * 0.5, -time * 0.3));
    value += 0.25 * noise(p * 13.0 + vec2(-time * 0.7, time * 0.6));
    return value / 1.75;
  }

  float shoreOf() {
    float edgeDistance = 1.0;
    edgeDistance = min(edgeDistance, mix(1.0, vLocal.y, vEdges.x));
    edgeDistance = min(edgeDistance, mix(1.0, 1.0 - vLocal.x, vEdges.y));
    edgeDistance = min(edgeDistance, mix(1.0, 1.0 - vLocal.y, vEdges.z));
    edgeDistance = min(edgeDistance, mix(1.0, vLocal.x, vEdges.w));
    return 1.0 - smoothstep(0.0, 0.22, edgeDistance);
  }
`;

const FRAGMENT_SURFACE = `
  #include <color_fragment>
  vec2 cell = (floor(vWorld * 8.0) + 0.5) / 8.0;
  float waves = ripples(cell);
  float shore = shoreOf();
  float foam = shore * smoothstep(0.35, 0.75, noise(cell * 9.0 + time * 0.8) + shore * 0.4);
  float caustic = smoothstep(0.64, 0.8, ripples(cell * 1.7 + 4.0)) * 0.55;
  diffuseColor.rgb = mix(mix(deepColor, shallowColor, waves * 0.8 + shore * 0.35), foamColor, foam * 0.55);
  diffuseColor.a = clamp(0.8 + caustic * 0.12 + foam * 0.2, 0.0, 1.0);
`;

const FRAGMENT_NORMAL = `
  #include <normal_fragment_begin>
  vec2 slope = vec2(ripples(cell + vec2(0.125, 0.0)) - ripples(cell - vec2(0.125, 0.0)), ripples(cell + vec2(0.0, 0.125)) - ripples(cell - vec2(0.0, 0.125))) * 0.35;
  normal = normalize(normal + (viewMatrix * vec4(-slope.x * RIPPLE_TILT, 0.0, -slope.y * RIPPLE_TILT, 0.0)).xyz);
`;

const FRAGMENT_SPECULAR_CLAMP = `
  #include <lights_fragment_end>
  reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(1.2));
`;

const FRAGMENT_GLOW = `
  #include <emissivemap_fragment>
  totalEmissiveRadiance += glowColor * caustic * causticGlow + foamColor * foam * 0.08 + mix(deepColor, shallowColor, waves) * bodyGlow;
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

export const WATER_PALETTE: LiquidPalette = { deep: 0x0b151c, shallow: 0x1c3440, glow: 0x2a5560, foam: 0x6a8a90, level: -0.105, body: 0.35, caustics: 0.25 };

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
    const edges: number[] = [];
    const locals: number[] = [];
    const indices: number[] = [];
    const isLiquid = (x: number, y: number) => layout.tileAt({ x, y }) === kind;
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        if (!isLiquid(x, y)) continue;
        const flags = [isLiquid(x, y - 1) ? 0 : 1, isLiquid(x + 1, y) ? 0 : 1, isLiquid(x, y + 1) ? 0 : 1, isLiquid(x - 1, y) ? 0 : 1];
        const base = positions.length / 3;
        const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
        for (const [u, v] of corners) {
          positions.push(x - 0.5 + u, palette.level, y - 0.5 + v);
          locals.push(u, v);
          edges.push(...flags);
        }
        indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    }
    if (indices.length === 0) return null;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('edges', new Float32BufferAttribute(edges, 4));
    geometry.setAttribute('local', new Float32BufferAttribute(locals, 2));
    geometry.setAttribute('normal', new Float32BufferAttribute(positions.map((_value, index) => (index % 3 === 1 ? 1 : 0)), 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const time = { value: 0 };
    const material = receiveFieldLights(new MeshStandardMaterial({ roughness: 0.3, metalness: 0, transparent: true, depthWrite: false, side: DoubleSide }), 0, false);
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
        .replace('#include <color_fragment>', FRAGMENT_SURFACE)
        .replace('#include <normal_fragment_begin>', FRAGMENT_NORMAL.replaceAll('RIPPLE_TILT', RIPPLE_TILT))
        .replace('#include <emissivemap_fragment>', FRAGMENT_GLOW)
        .replace('#include <lights_fragment_end>', FRAGMENT_SPECULAR_CLAMP);
    };
    material.customProgramCacheKey = () => `${fieldKey()}:liquid:${palette.deep}:${palette.shallow}:${palette.glow}:${palette.foam}`;
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
