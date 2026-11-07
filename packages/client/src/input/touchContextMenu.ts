const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PIXELS = 10;
const CLICK_SUPPRESS_MS = 600;

interface PendingPress {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly target: Element;
  readonly timer: number;
}

export function installTouchContextMenu(): () => void {
  let pending: PendingPress | null = null;
  let lastPointerWasTouch = false;
  let suppressClickUntil = 0;

  const cancel = () => {
    if (pending) window.clearTimeout(pending.timer);
    pending = null;
  };

  const isTextField = (target: EventTarget | null) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  const onPointerDown = (event: PointerEvent) => {
    lastPointerWasTouch = event.pointerType === 'touch';
    suppressClickUntil = 0;
    if (pending) {
      cancel();
      return;
    }
    if (!lastPointerWasTouch || !event.isPrimary || isTextField(event.target) || !(event.target instanceof Element)) return;
    const { clientX, clientY, pointerId, target } = event;
    pending = {
      pointerId,
      startX: clientX,
      startY: clientY,
      target,
      timer: window.setTimeout(() => {
        pending = null;
        suppressClickUntil = performance.now() + CLICK_SUPPRESS_MS;
        navigator.vibrate?.(12);
        target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY, button: 2 }));
      }, LONG_PRESS_MS),
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!pending || event.pointerId !== pending.pointerId) return;
    if (Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY) > MOVE_TOLERANCE_PIXELS) cancel();
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (pending && event.pointerId === pending.pointerId) cancel();
  };

  const onNativeContextMenu = (event: MouseEvent) => {
    if (event.isTrusted && lastPointerWasTouch && !isTextField(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  const onClick = (event: MouseEvent) => {
    if (performance.now() < suppressClickUntil) {
      suppressClickUntil = 0;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('pointerup', onPointerEnd, true);
  window.addEventListener('pointercancel', onPointerEnd, true);
  window.addEventListener('contextmenu', onNativeContextMenu, true);
  window.addEventListener('click', onClick, true);

  return () => {
    cancel();
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerup', onPointerEnd, true);
    window.removeEventListener('pointercancel', onPointerEnd, true);
    window.removeEventListener('contextmenu', onNativeContextMenu, true);
    window.removeEventListener('click', onClick, true);
  };
}
