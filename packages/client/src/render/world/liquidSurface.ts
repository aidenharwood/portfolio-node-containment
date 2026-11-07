import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, ShaderMaterial } from 'three';
import type { ZoneLayout } from '@containment/shared';

const SURFACE_Y = -0.07;

const VERTEX_SHADER = `
  attribute vec4 edges;
  attribute vec2 local;
  uniform float time;
  varying vec4 vEdges;
  varying vec2 vLocal;
  varying vec2 vWorld;
  void main() {
    vEdges = edges;
    vLocal = local;
    vec3 shifted = position;
    vWorld = position.xz;
    shifted.y += sin(position.x * 2.3 + time * 1.4) * 0.006 + cos(position.z * 2.9 + time * 1.1) * 0.006;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(shifted, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float time;
  uniform vec3 deepColor;
  uniform vec3 shallowColor;
  uniform vec3 glowColor;
  uniform vec3 foamColor;
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

  void main() {
    float waves = ripples(vWorld);
    float caustic = smoothstep(0.64, 0.8, ripples(vWorld * 1.7 + 4.0)) * 0.55;
    float edgeDistance = 1.0;
    edgeDistance = min(edgeDistance, mix(1.0, vLocal.y, vEdges.x));
    edgeDistance = min(edgeDistance, mix(1.0, 1.0 - vLocal.x, vEdges.y));
    edgeDistance = min(edgeDistance, mix(1.0, 1.0 - vLocal.y, vEdges.z));
    edgeDistance = min(edgeDistance, mix(1.0, vLocal.x, vEdges.w));
    float shore = 1.0 - smoothstep(0.0, 0.22, edgeDistance);
    float foam = shore * smoothstep(0.35, 0.75, noise(vWorld * 9.0 + time * 0.8) + shore * 0.4);
    vec3 color = mix(deepColor, shallowColor, waves * 0.8 + shore * 0.35);
    color += glowColor * caustic;
    color = mix(color, foamColor, foam * 0.55);
    float alpha = 0.78 + caustic * 0.15 + foam * 0.2;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

export class LiquidSurface {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  private constructor(mesh: Mesh, material: ShaderMaterial) {
    this.mesh = mesh;
    this.material = material;
  }

  static build(layout: ZoneLayout, kind: string): LiquidSurface | null {
    const positions: number[] = [];
    const edges: number[] = [];
    const locals: number[] = [];
    const indices: number[] = [];
    const isLiquid = (x: number, y: number) => layout.tileAt({ x, y }) === kind;
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        if (!isLiquid(x, y)) continue;
        const flags = [isLiquid(x, y - 1) ? 0 : 1, isLiquid(x + 1, y) ? 0 : 1, isLiquid(x, y + 1) ? 0 : 1, isLiquid(x - 1, y) ? 0 : 1];
        const base = positions.length / 3;
        const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
        for (const [u, v] of corners) {
          positions.push(x - 0.5 + u, SURFACE_Y, y - 0.5 + v);
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
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        time: { value: 0 },
        deepColor: { value: new Color(0x041f2a) },
        shallowColor: { value: new Color(0x13607a) },
        glowColor: { value: new Color(0x3fa8c0) },
        foamColor: { value: new Color(0xa8e8f0) },
      },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.renderOrder = 1;
    mesh.name = 'liquid';
    return new LiquidSurface(mesh, material);
  }

  update(time: number): void {
    this.material.uniforms.time!.value = time;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
