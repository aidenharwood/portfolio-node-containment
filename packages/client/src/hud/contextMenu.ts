import { MOVE_TOLERANCE_PIXELS } from '../input/touchContextMenu.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { placeInViewport } from '../ui/placement.ts';

export interface MenuAction {
  readonly verb: string;
  readonly subject?: string;
  readonly subjectTone?: 'npc' | 'object' | 'item' | 'player' | 'creature';
  run(): void;
}

const LEAVE_GRACE_MS = 120;

export class ContextMenu {
  readonly element = h('div', { className: 'context-menu panel', hidden: true, role: 'menu' });

  private leaveTimer: number | null = null;
  private readonly touchesDown = new Set<number>();
  private heldPointerId: number | null = null;
  private heldOrigin = { x: 0, y: 0 };
  private heldMoved = false;
  private lastPointerWasTouch = false;
  private highlighted: HTMLElement | null = null;
  private readonly itemActions = new Map<HTMLElement, MenuAction>();

  constructor() {
    window.addEventListener('pointerdown', this.onPointerDown, true);
    window.addEventListener('pointermove', this.followHeldTouch, true);
    window.addEventListener('pointerup', this.onPointerUp, true);
    window.addEventListener('pointercancel', this.onPointerCancel, true);
    window.addEventListener('keydown', this.dismissOnEscape);
    this.element.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse') return;
      this.cancelLeaveTimer();
      this.leaveTimer = window.setTimeout(() => this.close(), LEAVE_GRACE_MS);
    });
    this.element.addEventListener('pointerenter', () => this.cancelLeaveTimer());
  }

  private cancelLeaveTimer(): void {
    if (this.leaveTimer !== null) window.clearTimeout(this.leaveTimer);
    this.leaveTimer = null;
  }

  get isOpen(): boolean {
    return !this.element.hidden;
  }

  open(clientX: number, clientY: number, actions: readonly MenuAction[], touchDetails?: HTMLElement | null): void {
    this.itemActions.clear();
    this.highlighted = null;
    this.heldPointerId = this.touchesDown.size === 1 ? ([...this.touchesDown][0] ?? null) : null;
    this.heldOrigin = { x: clientX, y: clientY };
    this.heldMoved = false;
    replaceChildren(
      this.element,
      this.lastPointerWasTouch && touchDetails && h('div', { className: 'context-details' }, touchDetails),
      h('div', { className: 'context-title' }, 'Choose Option'),
      ...[...actions, { verb: 'Cancel', run: () => undefined }].map((action) => {
        const button = h('button', {
          className: 'context-item',
          type: 'button',
          role: 'menuitem',
          onclick: () => this.choose(action),
        }, action.verb, action.subject && h('span', { className: `subject tone-${action.subjectTone ?? 'object'}` }, ` ${action.subject}`));
        this.itemActions.set(button, action);
        return button;
      }),
    );
    this.element.hidden = false;
    this.element.scrollTop = 0;
    placeInViewport(this.element, clientX - this.element.getBoundingClientRect().width / 2, clientY - 8);
  }

  focusFirst(): void {
    this.element.querySelector<HTMLButtonElement>('.context-item')?.focus();
  }

  close(): void {
    this.cancelLeaveTimer();
    this.heldPointerId = null;
    this.highlight(null);
    this.element.hidden = true;
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.onPointerDown, true);
    window.removeEventListener('pointermove', this.followHeldTouch, true);
    window.removeEventListener('pointerup', this.onPointerUp, true);
    window.removeEventListener('pointercancel', this.onPointerCancel, true);
    window.removeEventListener('keydown', this.dismissOnEscape);
  }

  private choose(action: MenuAction): void {
    this.close();
    action.run();
  }

  private itemAt(clientX: number, clientY: number): HTMLElement | null {
    const item = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.context-item') ?? null;
    return item && this.element.contains(item) ? item : null;
  }

  private highlight(item: HTMLElement | null): void {
    if (item === this.highlighted) return;
    this.highlighted?.classList.remove('touch-active');
    item?.classList.add('touch-active');
    this.highlighted = item;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.lastPointerWasTouch = event.pointerType === 'touch';
    if (this.lastPointerWasTouch) this.touchesDown.add(event.pointerId);
    if (this.isOpen && !this.element.contains(event.target as Node)) this.close();
  };

  private readonly followHeldTouch = (event: PointerEvent): void => {
    if (!this.isOpen || event.pointerId !== this.heldPointerId) return;
    if (!this.heldMoved && Math.hypot(event.clientX - this.heldOrigin.x, event.clientY - this.heldOrigin.y) <= MOVE_TOLERANCE_PIXELS) return;
    this.heldMoved = true;
    this.highlight(this.itemAt(event.clientX, event.clientY));
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.touchesDown.delete(event.pointerId);
    if (!this.isOpen || event.pointerId !== this.heldPointerId) return;
    if (!this.heldMoved) {
      this.heldPointerId = null;
      return;
    }
    const item = this.itemAt(event.clientX, event.clientY);
    const action = item ? this.itemActions.get(item) : undefined;
    if (action) this.choose(action);
    else this.close();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    this.touchesDown.delete(event.pointerId);
    if (event.pointerId === this.heldPointerId) {
      this.heldPointerId = null;
      this.highlight(null);
    }
  };

  private readonly dismissOnEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.close();
  };
}

export function describeAction(action: MenuAction | undefined, extraCount: number): HTMLElement | null {
  if (!action) return null;
  return h(
    'span',
    {},
    action.verb,
    action.subject && h('span', { className: `subject tone-${action.subjectTone ?? 'object'}` }, ` ${action.subject}`),
    extraCount > 0 && h('span', { className: 'more' }, ` / ${extraCount} more option${extraCount === 1 ? '' : 's'}`),
  );
}
