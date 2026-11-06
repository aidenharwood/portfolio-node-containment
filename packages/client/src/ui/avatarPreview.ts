import type { CharacterAppearance, Facing, ItemId } from '@containment/shared';
import { CharacterRig } from '../render/models/characterModel.ts';
import { portraitStudio, type PortraitSubject } from '../render/portraitStudio.ts';

export interface AvatarPreviewOptions {
  readonly width: number;
  readonly height: number;
  readonly pedestal?: boolean;
  readonly zoom?: number;
}

export interface AvatarPreviewModel {
  appearance: CharacterAppearance;
  gear: readonly ItemId[];
  facing: Facing;
  walking: boolean;
}

const FACING_YAW: Readonly<Record<Facing, number>> = { south: 0.35, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };
const DRAG_SENSITIVITY = 0.012;

export class AvatarPreview {
  readonly element: HTMLCanvasElement;
  readonly model: AvatarPreviewModel;
  private readonly subject: PortraitSubject;
  private readonly rig: CharacterRig;
  private yaw: number;
  private desiredYaw: number;
  private walkPhase = 0;

  constructor(model: AvatarPreviewModel, options: AvatarPreviewOptions) {
    this.model = model;
    this.yaw = FACING_YAW[model.facing];
    this.desiredYaw = this.yaw;
    this.rig = new CharacterRig(model.appearance, model.gear);

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.element = document.createElement('canvas');
    this.element.className = 'avatar-preview';
    this.element.width = Math.round(options.width * ratio);
    this.element.height = Math.round(options.height * ratio);
    this.element.style.width = `${options.width}px`;
    this.element.style.height = `${options.height}px`;
    this.element.title = 'Drag to rotate';
    this.enableDragRotation();

    this.subject = {
      canvas: this.element,
      rig: this.rig,
      zoom: options.zoom ?? 1,
      pedestal: options.pedestal ?? false,
      yaw: () => this.yaw,
      pose: (time, delta) => {
        this.rig.setLook(this.model.appearance, this.model.gear);
        if (this.model.walking) this.walkPhase += delta * 9;
        this.yaw += (this.desiredYaw - this.yaw) * Math.min(1, delta * 10);
        this.rig.animate({ moving: this.model.walking, walkPhase: this.walkPhase, time });
      },
    };
    portraitStudio.register(this.subject);
  }

  rotate(direction: 1 | -1): void {
    this.desiredYaw += (direction * Math.PI) / 2;
  }

  dispose(): void {
    portraitStudio.unregister(this.subject);
  }

  private enableDragRotation(): void {
    let lastX: number | null = null;
    this.element.addEventListener('pointerdown', (event) => {
      lastX = event.clientX;
      this.element.setPointerCapture(event.pointerId);
    });
    this.element.addEventListener('pointermove', (event) => {
      if (lastX === null) return;
      this.desiredYaw += (event.clientX - lastX) * DRAG_SENSITIVITY;
      this.yaw = this.desiredYaw;
      lastX = event.clientX;
    });
    const release = () => {
      lastX = null;
    };
    this.element.addEventListener('pointerup', release);
    this.element.addEventListener('pointercancel', release);
  }
}
