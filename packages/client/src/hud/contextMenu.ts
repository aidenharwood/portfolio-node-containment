import { h, replaceChildren } from '../ui/dom.ts';

export interface MenuAction {
  readonly verb: string;
  readonly subject?: string;
  readonly subjectTone?: 'npc' | 'object' | 'item' | 'player' | 'creature';
  run(): void;
}

const LEAVE_GRACE_MS = 120;
const RELEASE_SLOP_PIXELS = 12;

export class ContextMenu {
  readonly element = h('div', { className: 'context-menu panel', hidden: true, role: 'menu' });

  private leaveTimer: number | null = null;

  constructor() {
    window.addEventListener('pointerdown', this.dismissOnOutsideClick, true);
    window.addEventListener('pointerup', this.dismissOnTouchReleaseOutside, true);
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

  open(clientX: number, clientY: number, actions: readonly MenuAction[]): void {
    replaceChildren(
      this.element,
      h('div', { className: 'context-title' }, 'Choose Option'),
      ...[...actions, { verb: 'Cancel', run: () => undefined }].map((action) =>
        h('button', {
          className: 'context-item',
          type: 'button',
          role: 'menuitem',
          onclick: () => {
            this.close();
            action.run();
          },
        }, action.verb, action.subject && h('span', { className: `subject tone-${action.subjectTone ?? 'object'}` }, ` ${action.subject}`)),
      ),
    );
    this.element.hidden = false;
    const bounds = this.element.getBoundingClientRect();
    this.element.style.left = `${Math.min(clientX - bounds.width / 2, window.innerWidth - bounds.width - 8)}px`;
    this.element.style.top = `${Math.min(clientY - 8, window.innerHeight - bounds.height - 8)}px`;
  }

  focusFirst(): void {
    this.element.querySelector<HTMLButtonElement>('.context-item')?.focus();
  }

  close(): void {
    this.cancelLeaveTimer();
    this.element.hidden = true;
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.dismissOnOutsideClick, true);
    window.removeEventListener('pointerup', this.dismissOnTouchReleaseOutside, true);
    window.removeEventListener('keydown', this.dismissOnEscape);
  }

  private readonly dismissOnOutsideClick = (event: PointerEvent): void => {
    if (this.isOpen && !this.element.contains(event.target as Node)) this.close();
  };

  private readonly dismissOnTouchReleaseOutside = (event: PointerEvent): void => {
    if (!this.isOpen || event.pointerType !== 'touch') return;
    const bounds = this.element.getBoundingClientRect();
    const inside = event.clientX >= bounds.left - RELEASE_SLOP_PIXELS
      && event.clientX <= bounds.right + RELEASE_SLOP_PIXELS
      && event.clientY >= bounds.top - RELEASE_SLOP_PIXELS
      && event.clientY <= bounds.bottom + RELEASE_SLOP_PIXELS;
    if (!inside) this.close();
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
