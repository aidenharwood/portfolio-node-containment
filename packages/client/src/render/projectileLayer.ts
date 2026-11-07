import { AdditiveBlending, BoxGeometry, Group, Mesh, MeshBasicMaterial, OctahedronGeometry, Vector3 } from 'three';

interface Flight {
  readonly group: Group;
  readonly core: Mesh;
  readonly trail: readonly Mesh[];
  readonly from: Vector3;
  readonly to: Vector3;
  readonly startedAt: number;
  readonly duration: number;
}

interface Burst {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly startedAt: number;
}

const ARC_HEIGHT = 0.18;
const TRAIL_SEGMENTS = 6;
const TRAIL_SPACING = 0.085;
const BURST_MS = 220;
const BURST_START_SCALE = 0.12;
const BURST_END_SCALE = 0.42;

const glow = (color: number, opacity: number): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false });

export class ProjectileLayer {
  readonly root = new Group();
  private readonly coreGeometry = new BoxGeometry(0.09, 0.09, 0.46);
  private readonly haloGeometry = new BoxGeometry(0.2, 0.2, 0.3);
  private readonly trailGeometry = new BoxGeometry(0.07, 0.07, 0.07);
  private readonly burstGeometry = new OctahedronGeometry(1, 0);
  private readonly materials = new Map<string, MeshBasicMaterial>();
  private readonly flights: Flight[] = [];
  private readonly bursts: Burst[] = [];
  private readonly point = new Vector3();
  private readonly ahead = new Vector3();

  launch(from: Vector3, to: Vector3, color: number, now: number, duration: number): void {
    const group = new Group();
    const core = new Mesh(this.coreGeometry, this.materialFor(0xffffff, 0.95));
    const halo = new Mesh(this.haloGeometry, this.materialFor(color, 0.45));
    core.add(halo);
    group.add(core);
    const trail: Mesh[] = [];
    for (let index = 0; index < TRAIL_SEGMENTS; index++) {
      const segment = new Mesh(this.trailGeometry, this.materialFor(color, 0.7 * (1 - index / TRAIL_SEGMENTS)));
      segment.scale.setScalar(1 - index / (TRAIL_SEGMENTS + 1));
      group.add(segment);
      trail.push(segment);
    }
    this.root.add(group);
    const flight = { group, core, trail, from: from.clone(), to: to.clone(), startedAt: now, duration };
    this.flights.push(flight);
    this.place(flight, 0);
  }

  update(now: number): void {
    for (let index = this.flights.length - 1; index >= 0; index--) {
      const flight = this.flights[index]!;
      const progress = (now - flight.startedAt) / flight.duration;
      if (progress >= 1) {
        flight.group.removeFromParent();
        this.flights.splice(index, 1);
        this.burst(flight.to, flight.trail[0]!.material as MeshBasicMaterial, now);
        continue;
      }
      this.place(flight, Math.max(0, progress));
    }
    for (let index = this.bursts.length - 1; index >= 0; index--) {
      const burst = this.bursts[index]!;
      const progress = (now - burst.startedAt) / BURST_MS;
      if (progress >= 1) {
        burst.mesh.removeFromParent();
        burst.material.dispose();
        this.bursts.splice(index, 1);
        continue;
      }
      burst.mesh.scale.setScalar(BURST_START_SCALE + (BURST_END_SCALE - BURST_START_SCALE) * progress);
      burst.mesh.rotation.y = progress * Math.PI;
      burst.material.opacity = 0.9 * (1 - progress);
    }
  }

  dispose(): void {
    this.coreGeometry.dispose();
    this.haloGeometry.dispose();
    this.trailGeometry.dispose();
    this.burstGeometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    for (const burst of this.bursts) burst.material.dispose();
  }

  private place(flight: Flight, progress: number): void {
    this.pointAt(flight, progress, this.point);
    this.pointAt(flight, Math.min(1, progress + 0.02), this.ahead);
    flight.core.position.copy(this.point);
    if (this.ahead.distanceToSquared(this.point) > 1e-8) flight.core.lookAt(this.ahead);
    const length = Math.max(0.001, flight.from.distanceTo(flight.to));
    flight.trail.forEach((segment, index) => {
      this.pointAt(flight, Math.max(0, progress - ((index + 1) * TRAIL_SPACING) / length), segment.position);
    });
  }

  private pointAt(flight: Flight, progress: number, target: Vector3): void {
    target.lerpVectors(flight.from, flight.to, progress);
    target.y += Math.sin(progress * Math.PI) * ARC_HEIGHT;
  }

  private burst(at: Vector3, source: MeshBasicMaterial, now: number): void {
    const material = glow(source.color.getHex(), 0.9);
    const mesh = new Mesh(this.burstGeometry, material);
    mesh.position.copy(at);
    mesh.scale.setScalar(BURST_START_SCALE);
    this.root.add(mesh);
    this.bursts.push({ mesh, material, startedAt: now });
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
