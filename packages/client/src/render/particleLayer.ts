import { AdditiveBlending, BoxGeometry, Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshBasicMaterial, MeshLambertMaterial, Quaternion, Vector3 } from 'three';

export type ParticleLayerKind = 'solid' | 'glow';

export type ParticlePreset = 'sparks' | 'puff' | 'debris' | 'chips' | 'motes' | 'ring' | 'droplets' | 'trail';

interface PresetSpec {
  readonly layer: ParticleLayerKind;
  readonly count: number;
  readonly speed: readonly [number, number];
  readonly cone: number;
  readonly upBias: number;
  readonly gravity: number;
  readonly drag: number;
  readonly life: readonly [number, number];
  readonly size: readonly [number, number];
}

export const PARTICLE_PRESETS: Readonly<Record<ParticlePreset, PresetSpec>> = {
  sparks: { layer: 'glow', count: 7, speed: [1.6, 3.2], cone: 0.9, upBias: 0.35, gravity: -6, drag: 2.5, life: [0.16, 0.3], size: [0.08, 0.02] },
  puff: { layer: 'solid', count: 3, speed: [0.3, 0.6], cone: 1.4, upBias: 0.6, gravity: 0.4, drag: 3, life: [0.3, 0.45], size: [0.05, 0.11] },
  debris: { layer: 'solid', count: 16, speed: [0.8, 2.2], cone: 1.6, upBias: 0.9, gravity: -9, drag: 0.6, life: [0.6, 0.95], size: [0.07, 0.04] },
  chips: { layer: 'solid', count: 7, speed: [0.8, 1.6], cone: 1, upBias: 0.8, gravity: -9, drag: 0.8, life: [0.35, 0.55], size: [0.07, 0.05] },
  motes: { layer: 'glow', count: 10, speed: [0.25, 0.6], cone: 0.5, upBias: 1, gravity: 0.6, drag: 0.6, life: [0.7, 1.2], size: [0.07, 0.02] },
  ring: { layer: 'glow', count: 12, speed: [1.4, 1.8], cone: 0, upBias: 0, gravity: 0, drag: 3, life: [0.22, 0.3], size: [0.05, 0.015] },
  droplets: { layer: 'glow', count: 8, speed: [0.8, 1.8], cone: 1.2, upBias: 0.7, gravity: -9, drag: 0.5, life: [0.3, 0.5], size: [0.05, 0.03] },
  trail: { layer: 'glow', count: 1, speed: [0, 0], cone: 0, upBias: 0, gravity: 0, drag: 0, life: [0.11, 0.11], size: [0.08, 0.02] },
};

export interface EmitOptions {
  readonly color?: number;
  readonly colors?: readonly number[];
  readonly direction?: Vector3;
  readonly count?: number;
  readonly ringAxis?: Vector3;
  readonly spawnBox?: Vector3;
}

const DEFAULT_SPAWN: Partial<Record<ParticlePreset, number>> = { motes: 0.35 };

export const MIN_GLOW_LUMINANCE = 0.25;

export function brightenForGlow(color: number): number {
  const shade = new Color(color);
  const luminance = 0.2126 * shade.r + 0.7152 * shade.g + 0.0722 * shade.b;
  if (luminance >= MIN_GLOW_LUMINANCE) return color;
  return shade.lerp(new Color(0xffffff), Math.min(1, (MIN_GLOW_LUMINANCE - luminance) / Math.max(0.001, 1 - luminance) + 0.15)).getHex();
}

export const PARTICLE_CAPACITY = 768;

const FLOOR_BOUNCE = -0.35;
const STRETCH_PER_SPEED = 0.4;
const CULL_DISTANCE = 18;

class Pool {
  readonly mesh: InstancedMesh;
  readonly position = new Float32Array(PARTICLE_CAPACITY * 3);
  readonly velocity = new Float32Array(PARTICLE_CAPACITY * 3);
  readonly age = new Float32Array(PARTICLE_CAPACITY);
  readonly life = new Float32Array(PARTICLE_CAPACITY);
  readonly size = new Float32Array(PARTICLE_CAPACITY * 2);
  readonly gravity = new Float32Array(PARTICLE_CAPACITY);
  readonly drag = new Float32Array(PARTICLE_CAPACITY);
  readonly colors: number[] = new Array<number>(PARTICLE_CAPACITY).fill(0xffffff);
  next = 0;

  constructor(geometry: BoxGeometry, glow: boolean) {
    const material = glow
      ? new MeshBasicMaterial({ toneMapped: false, transparent: true, blending: AdditiveBlending, depthWrite: false })
      : new MeshLambertMaterial();
    this.mesh = new InstancedMesh(geometry, material, PARTICLE_CAPACITY);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.life.fill(0);
  }

  alive(index: number): boolean {
    return this.life[index]! > 0 && this.age[index]! < this.life[index]!;
  }
}

const random = (low: number, high: number): number => low + Math.random() * (high - low);

export class ParticleLayer {
  readonly root = new Group();
  density = 1;
  private readonly geometry = new BoxGeometry(1, 1, 1);
  private readonly pools: Readonly<Record<ParticleLayerKind, Pool>>;
  private readonly focus = new Vector3();
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly scale = new Vector3();
  private readonly at = new Vector3();
  private readonly color = new Color();
  private readonly dir = new Vector3();
  private readonly side = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  private readonly forward = new Vector3(0, 0, 1);
  private readonly spawn = new Vector3();

  constructor() {
    this.pools = { solid: new Pool(this.geometry, false), glow: new Pool(this.geometry, true) };
    this.root.add(this.pools.solid.mesh, this.pools.glow.mesh);
  }

  setFocus(point: Vector3): void {
    this.focus.copy(point);
  }

  emit(preset: ParticlePreset, at: Vector3, options: EmitOptions = {}): number {
    if (at.distanceTo(this.focus) > CULL_DISTANCE) return 0;
    const spec = PARTICLE_PRESETS[preset];
    const pool = this.pools[spec.layer];
    const count = Math.max(1, Math.round((options.count ?? spec.count) * this.density));
    const raw = options.colors ?? [options.color ?? 0xffffff];
    const palette = spec.layer === 'glow' ? raw.map(brightenForGlow) : raw;
    const box = options.spawnBox ?? (DEFAULT_SPAWN[preset] !== undefined ? this.spawn.setScalar(DEFAULT_SPAWN[preset]!) : null);
    for (let n = 0; n < count; n++) {
      const index = pool.next;
      pool.next = (pool.next + 1) % PARTICLE_CAPACITY;
      this.velocityFor(spec, options, n, count, this.dir);
      const jitter = (size: number) => (box ? (Math.random() - 0.5) * size : 0);
      pool.position.set([at.x + jitter(box?.x ?? 0), at.y + jitter(box?.y ?? 0), at.z + jitter(box?.z ?? 0)], index * 3);
      pool.velocity.set([this.dir.x, this.dir.y, this.dir.z], index * 3);
      pool.age[index] = 0;
      pool.life[index] = random(spec.life[0], spec.life[1]);
      pool.size[index * 2] = spec.size[0];
      pool.size[index * 2 + 1] = spec.size[1];
      pool.gravity[index] = spec.gravity;
      pool.drag[index] = spec.drag;
      pool.colors[index] = palette[n % palette.length]!;
    }
    return count;
  }

  update(deltaSeconds: number): void {
    const dt = Math.min(0.05, Math.max(0, deltaSeconds));
    for (const pool of Object.values(this.pools)) {
      let visible = 0;
      for (let index = 0; index < PARTICLE_CAPACITY; index++) {
        if (!pool.alive(index)) continue;
        pool.age[index]! += dt;
        if (pool.age[index]! >= pool.life[index]!) continue;
        const i3 = index * 3;
        const damping = Math.max(0, 1 - pool.drag[index]! * dt);
        pool.velocity[i3] = pool.velocity[i3]! * damping;
        pool.velocity[i3 + 1] = pool.velocity[i3 + 1]! * damping + pool.gravity[index]! * dt;
        pool.velocity[i3 + 2] = pool.velocity[i3 + 2]! * damping;
        pool.position[i3] = pool.position[i3]! + pool.velocity[i3]! * dt;
        pool.position[i3 + 1] = pool.position[i3 + 1]! + pool.velocity[i3 + 1]! * dt;
        pool.position[i3 + 2] = pool.position[i3 + 2]! + pool.velocity[i3 + 2]! * dt;
        if (pool.position[i3 + 1]! < 0) {
          pool.position[i3 + 1] = 0;
          pool.velocity[i3 + 1] = pool.velocity[i3 + 1]! * FLOOR_BOUNCE;
        }
        const t = pool.age[index]! / pool.life[index]!;
        const size = pool.size[index * 2]! + (pool.size[index * 2 + 1]! - pool.size[index * 2]!) * t;
        this.at.set(pool.position[i3]!, pool.position[i3 + 1]!, pool.position[i3 + 2]!);
        const speed = Math.hypot(pool.velocity[i3]!, pool.velocity[i3 + 1]!, pool.velocity[i3 + 2]!);
        if (pool.mesh === this.pools.glow.mesh && speed > 0.2) {
          this.dir.set(pool.velocity[i3]!, pool.velocity[i3 + 1]!, pool.velocity[i3 + 2]!).divideScalar(speed);
          this.quaternion.setFromUnitVectors(this.forward, this.dir);
          this.scale.set(size, size, size * (1 + speed * STRETCH_PER_SPEED));
        } else {
          this.quaternion.identity();
          this.scale.setScalar(size);
        }
        this.matrix.compose(this.at, this.quaternion, this.scale);
        pool.mesh.setMatrixAt(visible, this.matrix);
        pool.mesh.setColorAt(visible, this.color.setHex(pool.colors[index]!));
        visible++;
      }
      pool.mesh.count = visible;
      pool.mesh.instanceMatrix.needsUpdate = true;
      if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
    }
  }

  liveCount(layer: ParticleLayerKind): number {
    const pool = this.pools[layer];
    let live = 0;
    for (let index = 0; index < PARTICLE_CAPACITY; index++) if (pool.alive(index)) live++;
    return live;
  }

  meshCount(layer: ParticleLayerKind): number {
    return this.pools[layer].mesh.count;
  }

  dispose(): void {
    this.geometry.dispose();
    for (const pool of Object.values(this.pools)) {
      (pool.mesh.material as MeshBasicMaterial).dispose();
      pool.mesh.dispose();
    }
  }

  private velocityFor(spec: PresetSpec, options: EmitOptions, n: number, count: number, out: Vector3): Vector3 {
    const speed = random(spec.speed[0], spec.speed[1]);
    if (spec.cone === 0 && spec.speed[1] > 0) {
      const axis = options.ringAxis ?? this.up;
      this.side.set(1, 0, 0);
      if (Math.abs(axis.dot(this.side)) > 0.9) this.side.set(0, 0, 1);
      const u = this.side.clone().cross(axis).normalize();
      const v = axis.clone().cross(u).normalize();
      const angle = (n / count) * Math.PI * 2;
      return out.copy(u).multiplyScalar(Math.cos(angle) * speed).addScaledVector(v, Math.sin(angle) * speed);
    }
    const base = options.direction ? this.side.copy(options.direction).normalize() : this.side.set(0, 1, 0);
    out.set(random(-1, 1), random(-1, 1), random(-1, 1)).normalize().multiplyScalar(spec.cone).add(base).normalize();
    out.y += spec.upBias * random(0.3, 1);
    return out.normalize().multiplyScalar(speed);
  }
}
