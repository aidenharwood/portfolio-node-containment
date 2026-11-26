import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

const PITCH_RANGE = { minimum: MathUtils.degToRad(10), maximum: MathUtils.degToRad(82) } as const;
const DISTANCE_RANGE = { minimum: 3.5, maximum: 30 } as const;
const DEFAULT_ORBIT = { yaw: MathUtils.degToRad(45), pitch: MathUtils.degToRad(52), distance: 11 } as const;
const CLIP_PLANES = { near: 0.3, far: 900 } as const;
const NEAR_PER_DISTANCE = 0.03;
const NEAR_LIMIT = 0.9;
const GROUND_CLEARANCE = 1.2;
const LIFT_SETTLE = 5;
const FOLLOW_SHARPNESS = 9;
const ORBIT_SHARPNESS = 14;
const KEY_ROTATION_SPEED = 2.2;
const KEY_PITCH_SPEED = 1.2;

export const CAMERA_LIMITS = { pitch: PITCH_RANGE, distance: DISTANCE_RANGE, clearance: GROUND_CLEARANCE } as const;

export type GroundProbe = (x: number, z: number) => number;

export const nearPlaneFor = (distance: number): number => MathUtils.clamp(distance * NEAR_PER_DISTANCE, CLIP_PLANES.near, NEAR_LIMIT);

export function clearedEyeHeight(focus: Vector3, eye: Vector3, ground: GroundProbe): number {
  const overEye = ground(eye.x, eye.z) + GROUND_CLEARANCE;
  const overMiddle = 2 * (ground((eye.x + focus.x) / 2, (eye.z + focus.z) / 2) + GROUND_CLEARANCE) - focus.y;
  return Math.max(eye.y, overEye, overMiddle);
}

export class CameraRig {
  readonly camera = new PerspectiveCamera(40, 1, CLIP_PLANES.near, CLIP_PLANES.far);
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
  private viewWidth = 1;
  private viewHeight = 1;
  private viewShift = 0;
  private desiredViewShift = 0;
  private viewShiftX = 0;
  private desiredViewShiftX = 0;
  private lift = 0;

  get focusPoint(): Vector3 {
    return this.focus;
  }

  get headingRadians(): number {
    return this.yaw;
  }

  resize(width: number, height: number): void {
    this.viewWidth = Math.max(1, width);
    this.viewHeight = Math.max(1, height);
    this.camera.aspect = this.viewWidth / this.viewHeight;
    this.applyViewShift();
  }

  setFar(far: number): void {
    if (this.camera.far === far) return;
    this.camera.far = far;
    this.camera.updateProjectionMatrix();
  }

  shiftView(left: number, up: number): void {
    this.desiredViewShiftX = left;
    this.desiredViewShift = up;
  }

  private applyViewShift(): void {
    if (Math.abs(this.viewShift) < 0.5 && Math.abs(this.viewShiftX) < 0.5) this.camera.clearViewOffset();
    else this.camera.setViewOffset(this.viewWidth, this.viewHeight, this.viewShiftX, this.viewShift, this.viewWidth, this.viewHeight);
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

  update(delta: number, ground?: GroundProbe): void {
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
    if (this.viewShift !== this.desiredViewShift || this.viewShiftX !== this.desiredViewShiftX) {
      const next = this.viewShift + (this.desiredViewShift - this.viewShift) * follow;
      this.viewShift = Math.abs(next - this.desiredViewShift) < 0.5 ? this.desiredViewShift : next;
      const nextX = this.viewShiftX + (this.desiredViewShiftX - this.viewShiftX) * follow;
      this.viewShiftX = Math.abs(nextX - this.desiredViewShiftX) < 0.5 ? this.desiredViewShiftX : nextX;
      this.applyViewShift();
    }

    const horizontal = Math.cos(this.pitch) * this.distance;
    this.camera.position.set(
      this.focus.x + Math.sin(this.yaw) * horizontal,
      this.focus.y + Math.sin(this.pitch) * this.distance,
      this.focus.z + Math.cos(this.yaw) * horizontal,
    );
    if (ground) {
      const lift = clearedEyeHeight(this.focus, this.camera.position, ground) - this.camera.position.y;
      this.lift = lift >= this.lift ? lift : this.lift + (lift - this.lift) * (1 - Math.exp(-LIFT_SETTLE * delta));
      this.camera.position.y += this.lift;
    }
    const near = nearPlaneFor(this.distance);
    if (Math.abs(near - this.camera.near) > 0.005) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
    this.camera.lookAt(this.focus);
  }
}
