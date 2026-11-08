import type { SelfState } from '@containment/shared';
import { h } from '../ui/dom.ts';
import { isCompactLayout } from '../ui/viewport.ts';

export interface PanelTab {
  readonly id: string;
  readonly label: string;
  readonly glyph: string;
  readonly element: HTMLElement;
  update(self: SelfState): void;
  bindAttention?(signal: () => void): void;
  dispose?(): void;
}

export class SidePanel {
  readonly element: HTMLElement;
  private readonly tabs: readonly PanelTab[];
  private readonly buttons = new Map<string, HTMLButtonElement>();
  private active: string;

  constructor(tabs: readonly PanelTab[]) {
    this.tabs = tabs;
    this.active = tabs[0]?.id ?? '';
    const strip = h('nav', { className: 'panel-tabs', role: 'tablist' },
      ...tabs.map((tab, index) => {
        const button = h('button', {
          className: 'panel-tab',
          type: 'button',
          role: 'tab',
          title: `${tab.label} (${index + 1})`,
          ariaKeyShortcuts: `${index + 1} F${index + 1}`,
          onclick: () => this.toggle(tab.id),
        },
        h('span', { className: 'panel-tab-key', ariaHidden: 'true' }, String(index + 1)),
        h('span', { className: 'panel-tab-glyph' }, tab.glyph),
        h('span', { className: 'panel-tab-label' }, tab.label));
        this.buttons.set(tab.id, button);
        return button;
      }),
    );
    this.element = h('section', { className: 'hud-side panel' }, strip, h('div', { className: 'panel-body' }, ...tabs.map((tab) => tab.element)));
    this.select(this.active);
    if (isCompactLayout()) this.collapse();
    for (const tab of tabs) tab.bindAttention?.(() => this.signal(tab.id));
  }

  toggle(id: string): void {
    if (id === this.active && !this.isCollapsed) this.collapse();
    else this.select(id);
  }

  get isCollapsed(): boolean {
    return this.element.classList.contains('collapsed');
  }

  collapse(): void {
    this.element.classList.add('collapsed');
    for (const button of this.buttons.values()) button.classList.remove('active');
  }

  select(id: string): void {
    this.active = id;
    this.element.classList.remove('collapsed');
    for (const tab of this.tabs) {
      tab.element.hidden = tab.id !== id;
      const button = this.buttons.get(tab.id);
      button?.classList.toggle('active', tab.id === id);
      if (tab.id === id) button?.classList.remove('attention');
      button?.setAttribute('aria-selected', String(tab.id === id));
    }
  }

  signal(id: string): void {
    const button = this.buttons.get(id);
    if (!button || (id === this.active && !this.isCollapsed)) return;
    button.classList.remove('attention');
    void button.offsetWidth;
    button.classList.add('attention');
  }

  toggleByIndex(index: number): void {
    const tab = this.tabs[index];
    if (tab) this.toggle(tab.id);
  }

  update(self: SelfState): void {
    for (const tab of this.tabs) tab.update(self);
  }

  dispose(): void {
    for (const tab of this.tabs) tab.dispose?.();
  }
}
