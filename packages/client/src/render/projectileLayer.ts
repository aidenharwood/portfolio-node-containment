import { AdditiveBlending, BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';

interface Flight {
  readonly mesh: Mesh;
  readonly from: Vector3;
  readonly to: Vector3;
  readonly startedAt: number;
  readonly duration: number;
}

const BASE_FLIGHT_MS = 90;
const FLIGHT_MS_PER_TILE = 45;
const ARC_HEIGHT = 0.12;

export class ProjectileLayer {
  readonly root = new Group();
  private readonly geometry = new BoxGeometry(0.05, 0.05, 0.32);
  private readonly materials = new Map<number, MeshBasicMaterial>();
  private readonly flights: Flight[] = [];

  launch(from: Vector3, to: Vector3, color: number, now: number): void {
    const mesh = new Mesh(this.geometry, this.materialFor(color));
    mesh.position.copy(from);
    mesh.lookAt(to);
    this.root.add(mesh);
    this.flights.push({ mesh, from: from.clone(), to: to.clone(), startedAt: now, duration: BASE_FLIGHT_MS + from.distanceTo(to) * FLIGHT_MS_PER_TILE });
  }

  update(now: number): void {
    for (let index = this.flights.length - 1; index >= 0; index--) {
      const flight = this.flights[index]!;
      const progress = (now - flight.startedAt) / flight.duration;
      if (progress >= 1) {
        flight.mesh.removeFromParent();
        this.flights.splice(index, 1);
        continue;
      }
      flight.mesh.position.lerpVectors(flight.from, flight.to, progress);
      flight.mesh.position.y += Math.sin(progress * Math.PI) * ARC_HEIGHT;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
  }

  private materialFor(color: number): MeshBasicMaterial {
    let material = this.materials.get(color);
    if (!material) {
      material = new MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false });
      this.materials.set(color, material);
    }
    return material;
  }
}
