import {
  RENDER_SCALE_LABELS,
  RENDER_SCALES,
  SHADOW_LABELS,
  SHADOW_QUALITIES,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_STEP,
  type GameSettings,
  type SettingsStore,
} from '../state/gameSettings.ts';
import { h } from '../ui/dom.ts';

interface Choice<T extends string> {
  readonly element: HTMLElement;
  sync(value: T): void;
}

function choiceRow<T extends string>(name: string, options: readonly T[], labels: Readonly<Record<T, string>>, pick: (value: T) => void): Choice<T> {
  const buttons = options.map((option) => h('button', {
    className: 'settings-choice',
    type: 'button',
    role: 'radio',
    onclick: () => pick(option),
  }, labels[option]));
  return {
    element: h('div', { className: 'settings-choices', role: 'radiogroup', ariaLabel: name }, ...buttons),
    sync(value) {
      options.forEach((option, index) => {
        const button = buttons[index];
        if (!button) return;
        button.classList.toggle('active', option === value);
        button.setAttribute('aria-checked', String(option === value));
      });
    },
  };
}

function toggleRow(name: string, pick: (value: boolean) => void): { readonly element: HTMLLabelElement; sync(value: boolean): void } {
  const input = h('input', { type: 'checkbox', className: 'settings-toggle', onchange: () => pick(input.checked) });
  return {
    element: h('label', { className: 'settings-row settings-switch' }, h('span', { className: 'settings-label' }, name), input),
    sync(value) {
      input.checked = value;
    },
  };
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;

export class SettingsWindow {
  readonly element = h('section', { className: 'settings-window panel', hidden: true, role: 'dialog', ariaLabel: 'Settings' });
  private readonly unsubscribe: () => void;

  constructor(store: SettingsStore) {
    const renderScale = choiceRow('Resolution', RENDER_SCALES, RENDER_SCALE_LABELS, (value) => store.update({ renderScale: value }));
    const shadows = choiceRow('Shadows', SHADOW_QUALITIES, SHADOW_LABELS, (value) => store.update({ shadows: value }));
    const bloom = toggleRow('Glow', (value) => store.update({ bloom: value }));
    const scanlines = toggleRow('Scanlines', (value) => store.update({ scanlines: value }));
    const scaleValue = h('output', { className: 'settings-value' });
    const scale = h('input', {
      type: 'range',
      className: 'settings-range',
      min: String(UI_SCALE_MIN),
      max: String(UI_SCALE_MAX),
      step: String(UI_SCALE_STEP),
      ariaLabel: 'Interface scale',
      oninput: () => {
        scaleValue.textContent = percent(Number(scale.value));
      },
      onchange: () => store.update({ uiScale: Number(scale.value) }),
    });

    this.element.append(
      h('header', { className: 'shop-header' },
        h('div', {}, h('p', { className: 'eyebrow' }, 'Terminal'), h('h3', {}, 'Settings')),
        h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close settings', onclick: () => this.requestClose() }, '×'),
      ),
      h('div', { className: 'settings-body' },
        h('section', { className: 'settings-group' },
          h('p', { className: 'eyebrow' }, 'Graphics'),
          h('div', { className: 'settings-row' }, h('span', { className: 'settings-label' }, 'Resolution'), renderScale.element),
          h('div', { className: 'settings-row' }, h('span', { className: 'settings-label' }, 'Shadows'), shadows.element),
          bloom.element,
          scanlines.element,
        ),
        h('section', { className: 'settings-group' },
          h('p', { className: 'eyebrow' }, 'Interface'),
          h('label', { className: 'settings-row' }, h('span', { className: 'settings-label' }, 'Scale'), h('span', { className: 'settings-slider' }, scale, scaleValue)),
        ),
      ),
      h('footer', { className: 'settings-footer' },
        h('button', { className: 'button ghost small', type: 'button', onclick: () => store.reset() }, 'Restore defaults'),
      ),
    );

    this.unsubscribe = store.subscribe((settings: GameSettings) => {
      renderScale.sync(settings.renderScale);
      shadows.sync(settings.shadows);
      bloom.sync(settings.bloom);
      scanlines.sync(settings.scanlines);
      scale.value = String(settings.uiScale);
      scaleValue.textContent = percent(settings.uiScale);
    });
  }

  get isOpen(): boolean {
    return !this.element.hidden;
  }

  toggle(): void {
    if (this.isOpen) this.requestClose();
    else this.element.hidden = false;
  }

  requestClose(): void {
    this.element.hidden = true;
  }

  dispose(): void {
    this.unsubscribe();
  }
}
