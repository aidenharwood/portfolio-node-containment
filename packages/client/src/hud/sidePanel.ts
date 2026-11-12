import type { SelfState } from '@containment/shared';
import { h } from '../ui/dom.ts';
import { isCompactLayout } from '../ui/viewport.ts';
import { panelIcon, type PanelIconId } from './panelIcons.ts';

export interface FitSpace {
  readonly width: number;
  readonly height: number;
}

export interface PanelTab {
  readonly id: string;
  readonly label: string;
  readonly icon: PanelIconId;
  readonly element: HTMLElement;
  update(self: SelfState): void;
  fit?(space: FitSpace): void;
  bindAttention?(signal: () => void): void;
  dispose?(): void;
}

export class SidePanel {
  readonly element: HTMLElement;
  private readonly body: HTMLElement;
  private readonly tabs: readonly PanelTab[];
  private readonly buttons = new Map<string, HTMLButtonElement>();
  private active: string;
  private readonly probe = h('div', { ariaHidden: 'true', style: { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', top: '0', left: '0', width: '0' } });
  private readonly fitObserver = new ResizeObserver(() => this.fitActiveTab());

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
          ariaLabel: tab.label,
          ariaKeyShortcuts: `${index + 1} F${index + 1}`,
          onclick: () => this.toggle(tab.id),
        },
        h('span', { className: 'panel-tab-key', ariaHidden: 'true' }, String(index + 1)),
        panelIcon(tab.icon));
        this.buttons.set(tab.id, button);
        return button;
      }),
    );
    this.body = h('div', { className: 'panel-body' }, ...tabs.map((tab) => tab.element));
    this.element = h('section', { className: 'hud-side panel' }, strip, this.body);
    this.select(this.active);
    if (isCompactLayout()) this.collapse();
    this.fitObserver.observe(this.element);
    window.addEventListener('resize', this.onResize);
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
    this.fitActiveTab();
  }

  private readonly onResize = () => this.fitActiveTab();

  private heightLimit(): number {
    const maxHeight = getComputedStyle(this.element).maxHeight;
    if (maxHeight === 'none') return this.element.offsetHeight;
    if (/^[\d.]+px$/.test(maxHeight)) return parseFloat(maxHeight);
    const parent = this.element.parentElement;
    if (!parent) return this.element.offsetHeight;
    this.probe.style.height = maxHeight;
    this.probe.style.zoom = getComputedStyle(this.element).zoom;
    parent.append(this.probe);
    const limit = this.probe.offsetHeight;
    this.probe.remove();
    return limit;
  }

  refit(): void {
    requestAnimationFrame(() => this.fitActiveTab());
  }

  private fitActiveTab(): void {
    if (this.isCollapsed) return;
    const tab = this.tabs.find((candidate) => candidate.id === this.active);
    const area = tab?.element.querySelector<HTMLElement>('.fit-area');
    if (!tab || !area) return;
    const limit = this.heightLimit();
    if (!Number.isFinite(limit)) return;
    const chrome = this.element.offsetHeight - this.body.offsetHeight + (area.offsetTop - this.body.offsetTop) + parseFloat(getComputedStyle(this.body).paddingBottom);
    const height = Math.max(48, Math.floor(limit - chrome) - 1);
    if (!Number.isFinite(height)) return;
    if (area.style.getPropertyValue('--fit-h') !== `${height}px`) area.style.setProperty('--fit-h', `${height}px`);
    tab.fit?.({ width: area.clientWidth, height });
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
    this.fitObserver.disconnect();
    window.removeEventListener('resize', this.onResize);
    for (const tab of this.tabs) tab.dispose?.();
  }
}
