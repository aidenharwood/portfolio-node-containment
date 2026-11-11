import { MOVE_TOLERANCE_PIXELS } from './touchContextMenu.ts';

const CLICK_SUPPRESS_MS = 300;

export interface TouchDragSource {
  canDrag(): boolean;
  ghost(): HTMLElement | null;
  drop(target: Element | null): void;
}

interface TouchDrag {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  ghost: HTMLElement | null;
  dragging: boolean;
}

export function attachTouchDrag(element: HTMLElement, source: TouchDragSource): void {
  let drag: TouchDrag | null = null;

  const finish = (): void => {
    drag?.ghost?.remove();
    element.classList.remove('touch-dragging');
    drag = null;
  };

  const swallowClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  element.addEventListener('pointerdown', (event) => {
    const touch = event.pointerType === 'touch';
    element.draggable = !touch;
    finish();
    if (touch && event.isPrimary && source.canDrag()) {
      drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ghost: null, dragging: false };
    }
  });

  element.addEventListener('contextmenu', finish);

  element.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.dragging) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <= MOVE_TOLERANCE_PIXELS) return;
      drag.dragging = true;
      drag.ghost = source.ghost();
      drag.ghost?.classList.add('touch-drag-ghost');
      if (drag.ghost) document.body.append(drag.ghost);
      element.classList.add('touch-dragging');
    }
    if (drag.ghost) {
      drag.ghost.style.left = `${event.clientX}px`;
      drag.ghost.style.top = `${event.clientY}px`;
    }
  });

  element.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dragged = drag.dragging;
    finish();
    if (!dragged) return;
    window.addEventListener('click', swallowClick, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener('click', swallowClick, true), CLICK_SUPPRESS_MS);
    source.drop(document.elementFromPoint(event.clientX, event.clientY));
  });

  element.addEventListener('pointercancel', (event) => {
    if (event.pointerId === drag?.pointerId) finish();
  });
}
