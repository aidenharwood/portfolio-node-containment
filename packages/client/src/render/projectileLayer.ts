import type { ProjectileKind } from '@containment/shared';
import { AdditiveBlending, BoxGeometry, Group, Mesh, MeshBasicMaterial, OctahedronGeometry, Vector3 } from 'three';

type Size = readonly [number, number, number];

interface ProjectileLook {
  readonly core: Size;
  readonly halo: Size | null;
  readonly trailSegments: number;
  readonly trailSpacing: number;
  readonly arcHeight: number;
  readonly count: number;
  readonly spread: number;
  readonly impactScale: number;
  readonly muzzleScale: number;
}

const LOOKS: Readonly<Record<ProjectileKind, ProjectileLook>> = {
  dart: { core: [0.05, 0.05, 0.26], halo: [0.12, 0.12, 0.18], trailSegments: 3, trailSpacing: 0.07, arcHeight: 0.1, count: 1, spread: 0, impactScale: 0.7, muzzleScale: 0.5 },
  bolt: { core: [0.09, 0.09, 0.46], halo: [0.2, 0.2, 0.3], trailSegments: 6, trailSpacing: 0.085, arcHeight: 0.18, count: 1, spread: 0, impactScale: 1, muzzleScale: 0.7 },
  tracer: { core: [0.045, 0.045, 1.2], halo: [0.12, 0.12, 0.95], trailSegments: 0, trailSpacing: 0, arcHeight: 0, count: 1, spread: 0, impactScale: 1.35, muzzleScale: 1 },
  pellets: { core: [0.07, 0.07, 0.12], halo: null, trailSegments: 2, trailSpacing: 0.06, arcHeight: 0.04, count: 6, spread: 0.34, impactScale: 0.55, muzzleScale: 1.15 },
  spit: { core: [0.12, 0.12, 0.16], halo: [0.22, 0.22, 0.22], trailSegments: 5, trailSpacing: 0.08, arcHeight: 0.35, count: 1, spread: 0, impactScale: 0.9, muzzleScale: 0 },
};

interface Flight {
  readonly group: Group;
  readonly core: Mesh;
  readonly trail: readonly Mesh[];
  readonly from: Vector3;
  readonly to: Vector3;
  readonly look: ProjectileLook;
  readonly color: number;
  readonly startedAt: number;
  readonly duration: number;
}

interface Burst {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly startedAt: number;
  readonly scale: number;
  readonly duration: number;
}

const BURST_MS = 220;
const MUZZLE_MS = 110;
const BURST_START_SCALE = 0.12;
const BURST_END_SCALE = 0.42;
const PELLET_LIFT = 0.08;

const glow = (color: number, opacity: number): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false });

export class ProjectileLayer {
  readonly root = new Group();
  private readonly geometries = new Map<string, BoxGeometry>();
  private readonly trailGeometry = new BoxGeometry(0.07, 0.07, 0.07);
  private readonly burstGeometry = new OctahedronGeometry(1, 0);
  private readonly materials = new Map<string, MeshBasicMaterial>();
  private readonly flights: Flight[] = [];
  private readonly bursts: Burst[] = [];
  private readonly point = new Vector3();
  private readonly ahead = new Vector3();
  private readonly across = new Vector3();

  launch(kind: ProjectileKind, from: Vector3, to: Vector3, color: number, now: number, duration: number): void {
    const look = LOOKS[kind];
    if (look.muzzleScale > 0) this.burst(from, color, now, look.muzzleScale, MUZZLE_MS);
    this.across.set(-(to.z - from.z), 0, to.x - from.x);
    if (this.across.lengthSq() > 1e-8) this.across.normalize();
    for (let index = 0; index < look.count; index++) {
      const fan = look.count > 1 ? index / (look.count - 1) - 0.5 : 0;
      const target = to.clone().addScaledVector(this.across, fan * 2 * look.spread);
      target.y += look.count > 1 ? ((index % 3) - 1) * PELLET_LIFT : 0;
      this.launchOne(look, from, target, color, now, duration);
    }
  }

  update(now: number): void {
    for (let index = this.flights.length - 1; index >= 0; index--) {
      const flight = this.flights[index]!;
      const progress = (now - flight.startedAt) / flight.duration;
      if (progress >= 1) {
        flight.group.removeFromParent();
        this.flights.splice(index, 1);
        this.burst(flight.to, flight.color, now, flight.look.impactScale, BURST_MS);
        continue;
      }
      this.place(flight, Math.max(0, progress));
    }
    for (let index = this.bursts.length - 1; index >= 0; index--) {
      const burst = this.bursts[index]!;
      const progress = (now - burst.startedAt) / burst.duration;
      if (progress >= 1) {
        burst.mesh.removeFromParent();
        burst.material.dispose();
        this.bursts.splice(index, 1);
        continue;
      }
      burst.mesh.scale.setScalar((BURST_START_SCALE + (BURST_END_SCALE - BURST_START_SCALE) * progress) * burst.scale);
      burst.mesh.rotation.y = progress * Math.PI;
      burst.material.opacity = 0.9 * (1 - progress);
    }
  }

  dispose(): void {
    for (const geometry of this.geometries.values()) geometry.dispose();
    this.trailGeometry.dispose();
    this.burstGeometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    for (const burst of this.bursts) burst.material.dispose();
  }

  private launchOne(look: ProjectileLook, from: Vector3, to: Vector3, color: number, now: number, duration: number): void {
    const group = new Group();
    const core = new Mesh(this.geometryFor(look.core), this.materialFor(0xffffff, 0.95));
    if (look.halo) core.add(new Mesh(this.geometryFor(look.halo), this.materialFor(color, 0.45)));
    group.add(core);
    const trail: Mesh[] = [];
    for (let index = 0; index < look.trailSegments; index++) {
      const segment = new Mesh(this.trailGeometry, this.materialFor(color, 0.7 * (1 - index / look.trailSegments)));
      segment.scale.setScalar(1 - index / (look.trailSegments + 1));
      group.add(segment);
      trail.push(segment);
    }
    this.root.add(group);
    const flight: Flight = { group, core, trail, from: from.clone(), to: to.clone(), look, color, startedAt: now, duration };
    this.flights.push(flight);
    this.place(flight, 0);
  }

  private place(flight: Flight, progress: number): void {
    this.pointAt(flight, progress, this.point);
    this.pointAt(flight, Math.min(1, progress + 0.02), this.ahead);
    flight.core.position.copy(this.point);
    if (this.ahead.distanceToSquared(this.point) > 1e-8) flight.core.lookAt(this.ahead);
    const length = Math.max(0.001, flight.from.distanceTo(flight.to));
    flight.trail.forEach((segment, index) => {
      this.pointAt(flight, Math.max(0, progress - ((index + 1) * flight.look.trailSpacing) / length), segment.position);
    });
  }

  private pointAt(flight: Flight, progress: number, target: Vector3): void {
    target.lerpVectors(flight.from, flight.to, progress);
    target.y += Math.sin(progress * Math.PI) * flight.look.arcHeight;
  }

  private burst(at: Vector3, color: number, now: number, scale: number, duration: number): void {
    const material = glow(color, 0.9);
    const mesh = new Mesh(this.burstGeometry, material);
    mesh.position.copy(at);
    mesh.scale.setScalar(BURST_START_SCALE * scale);
    this.root.add(mesh);
    this.bursts.push({ mesh, material, startedAt: now, scale, duration });
  }

  private geometryFor(size: Size): BoxGeometry {
    const key = size.join(':');
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = new BoxGeometry(...size);
      this.geometries.set(key, geometry);
    }
    return geometry;
  }

  private materialFor(color: number, opacity: number): MeshBasicMaterial {
    const key = `${color}:${opacity.toFixed(2)}`;
    let material = this.materials.get(key);
    if (!material) {
      material = glow(color, opacity);
      this.materials.set(key, material);
    }
    return material;
  }
}
