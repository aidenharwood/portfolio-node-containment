import { h, replaceChildren } from '../ui/dom.ts';
import type { MenuAction } from './contextMenu.ts';

export interface BubbleContent {
  readonly actions: readonly MenuAction[];
  readonly subtitle?: string;
  readonly objective?: boolean;
  readonly threat?: 'trivial' | 'even' | 'dangerous';
}

const CURSOR_OFFSET = 18;
const EDGE_MARGIN = 8;

export class InteractionBubble {
  readonly element = h('div', { className: 'interaction-bubble', hidden: true, role: 'tooltip' });
  private signature = '';

  show(clientX: number, clientY: number, content: BubbleContent): void {
    const [primary, ...others] = content.actions;
    if (!primary) {
      this.hide();
      return;
    }
    const signature = [primary.verb, primary.subject, content.subtitle, content.objective, content.threat, ...others.map((action) => action.verb)].join('|');
    if (signature !== this.signature) {
      this.signature = signature;
      replaceChildren(
        this.element,
        h('div', { className: 'bubble-primary' },
          h('span', { className: 'bubble-verb' }, primary.verb),
          primary.subject && h('span', { className: `bubble-subject tone-${primary.subjectTone ?? 'object'}` }, primary.subject),
        ),
        bubbleMeta(content),
        h('div', { className: 'bubble-hints' },
          h('span', { className: 'mouse-hint' }, h('span', { className: 'mouse-icon left' }), primary.verb),
          others.length > 0 && h('span', { className: 'mouse-hint' }, h('span', { className: 'mouse-icon right' }), others.map((action) => action.verb).join(' · ')),
        ),
      );
    }
    this.element.hidden = false;
    const bounds = this.element.getBoundingClientRect();
    const flipX = clientX + CURSOR_OFFSET + bounds.width > window.innerWidth - EDGE_MARGIN;
    const flipY = clientY + CURSOR_OFFSET + bounds.height > window.innerHeight - EDGE_MARGIN;
    this.element.style.left = `${flipX ? clientX - CURSOR_OFFSET - bounds.width : clientX + CURSOR_OFFSET}px`;
    this.element.style.top = `${flipY ? clientY - CURSOR_OFFSET - bounds.height : clientY + CURSOR_OFFSET}px`;
  }

  hide(): void {
    this.element.hidden = true;
    this.signature = '';
  }
}

export function bubbleMeta(content: BubbleContent): HTMLElement | null {
  if (!content.subtitle && !content.objective) return null;
  return h('div', { className: 'bubble-meta' },
    content.objective && h('span', { className: 'bubble-objective' }, '◆ Objective'),
    content.subtitle && h('span', { className: content.threat ? `bubble-threat threat-${content.threat}` : '' }, content.subtitle),
  );
}
