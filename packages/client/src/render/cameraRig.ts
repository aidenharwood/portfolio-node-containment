import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

const PITCH_RANGE = { minimum: MathUtils.degToRad(18), maximum: MathUtils.degToRad(82) } as const;
const DISTANCE_RANGE = { minimum: 3.5, maximum: 22 } as const;
const DEFAULT_ORBIT = { yaw: MathUtils.degToRad(45), pitch: MathUtils.degToRad(52), distance: 11 } as const;
const FOLLOW_SHARPNESS = 9;
const ORBIT_SHARPNESS = 14;
const KEY_ROTATION_SPEED = 2.2;
const KEY_PITCH_SPEED = 1.2;

export class CameraRig {
  readonly camera = new PerspectiveCamera(40, 1, 0.1, 200);
  private readonly focus = new Vector3();
  private readonly desiredFocus = new Vector3();
  private yaw: number = DEFAULT_ORBIT.yaw;
  private pitch: number = DEFAULT_ORBIT.pitch;
  private distance: number = DEFAULT_ORBIT.distance;
  private desiredYaw: number = DEFAULT_ORBIT.yaw;
  private desiredPitch: number = DEFAULT_ORBIT.pitch;
  private desiredDistance: number = DEFAULT_ORBIT.distance;
  private readonly heldKeys = new Set<string>();
  private initialized = false;

  get focusPoint(): Vector3 {
    return this.focus;
  }

  get headingRadians(): number {
    return this.yaw;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  follow(point: Vector3): void {
    this.desiredFocus.copy(point);
    if (!this.initialized) {
      this.focus.copy(point);
      this.initialized = true;
    }
  }

  snapToFocus(): void {
    this.focus.copy(this.desiredFocus);
  }

  orbit(deltaYaw: number, deltaPitch: number): void {
    this.desiredYaw += deltaYaw;
    this.desiredPitch = MathUtils.clamp(this.desiredPitch + deltaPitch, PITCH_RANGE.minimum, PITCH_RANGE.maximum);
  }

  zoom(factor: number): void {
    this.desiredDistance = MathUtils.clamp(this.desiredDistance * factor, DISTANCE_RANGE.minimum, DISTANCE_RANGE.maximum);
  }

  reset(): void {
    this.desiredYaw = DEFAULT_ORBIT.yaw + Math.round((this.desiredYaw - DEFAULT_ORBIT.yaw) / (Math.PI * 2)) * Math.PI * 2;
    this.desiredPitch = DEFAULT_ORBIT.pitch;
    this.desiredDistance = DEFAULT_ORBIT.distance;
  }

  pressKey(key: string, pressed: boolean): boolean {
    const handled = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'q', 'e', 'Q', 'E'].includes(key);
    if (!handled) return false;
    if (pressed) this.heldKeys.add(key.toLowerCase());
    else this.heldKeys.delete(key.toLowerCase());
    return true;
  }

  releaseAllKeys(): void {
    this.heldKeys.clear();
  }

  update(delta: number): void {
    const held = this.heldKeys;
    const turn = (held.has('arrowleft') || held.has('q') ? 0 : 1) - (held.has('arrowright') || held.has('e') ? 0 : 1);
    const tilt = (held.has('arrowup') ? 1 : 0) - (held.has('arrowdown') ? 1 : 0);
    if (turn || tilt) this.orbit(turn * KEY_ROTATION_SPEED * delta, tilt * KEY_PITCH_SPEED * delta);

    const follow = 1 - Math.exp(-FOLLOW_SHARPNESS * delta);
    const orbit = 1 - Math.exp(-ORBIT_SHARPNESS * delta);
    this.focus.lerp(this.desiredFocus, follow);
    this.yaw += (this.desiredYaw - this.yaw) * orbit;
    this.pitch += (this.desiredPitch - this.pitch) * orbit;
    this.distance += (this.desiredDistance - this.distance) * orbit;

    const horizontal = Math.cos(this.pitch) * this.distance;
    this.camera.position.set(
      this.focus.x + Math.sin(this.yaw) * horizontal,
      this.focus.y + Math.sin(this.pitch) * this.distance,
      this.focus.z + Math.cos(this.yaw) * horizontal,
    );
    this.camera.lookAt(this.focus);
  }
}
