import {
  ANTIALIASING_LABELS,
  ANTIALIASING_MODES,
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  BRIGHTNESS_STEP,
  DETAIL_LABELS,
  DETAIL_LEVELS,
  FRAME_CAP_LABELS,
  FRAME_CAPS,
  GLOW_LABELS,
  GLOW_LEVELS,
  GRAPHICS_PRESETS,
  PRESET_LABELS,
  presetOf,
  RENDER_SCALE_LABELS,
  RENDER_SCALES,
  SHADOW_LABELS,
  SHADOW_QUALITIES,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_STEP,
  WEATHER_LABELS,
  WEATHER_LEVELS,
  type GameSettings,
  type PresetChoice,
  type SettingsStore,
} from '../state/gameSettings.ts';
import { h } from '../ui/dom.ts';
import { primaryGesture } from '../ui/viewport.ts';

interface Control<T> {
  readonly element: HTMLElement;
  sync(value: T): void;
}

function choiceRow<T extends string>(name: string, options: readonly T[], labels: Readonly<Record<T, string>>, pick: (value: T) => void): Control<T> {
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

function toggleControl(name: string, pick: (value: boolean) => void): Control<boolean> {
  const input = h('input', { type: 'checkbox', className: 'settings-toggle', ariaLabel: name, onchange: () => pick(input.checked) });
  return {
    element: input,
    sync(value) {
      input.checked = value;
    },
  };
}

function sliderControl(name: string, min: number, max: number, step: number, pick: (value: number) => void): Control<number> {
  const output = h('output', { className: 'settings-value' });
  const input = h('input', {
    type: 'range',
    className: 'settings-range',
    min: String(min),
    max: String(max),
    step: String(step),
    ariaLabel: name,
    oninput: () => {
      output.textContent = percent(Number(input.value));
    },
    onchange: () => pick(Number(input.value)),
  });
  return {
    element: h('span', { className: 'settings-slider' }, input, output),
    sync(value) {
      input.value = String(value);
      output.textContent = percent(value);
    },
  };
}

const CONFIRM_WINDOW_MS = 4000;

export function confirmButton(label: string, confirmLabel: string, run: () => void): HTMLButtonElement {
  let timer: number | null = null;
  const reset = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    button.textContent = label;
    button.classList.remove('confirming');
  };
  const button = h('button', {
    className: 'button ghost small',
    type: 'button',
    onclick: () => {
      if (timer === null) {
        button.textContent = confirmLabel;
        button.classList.add('confirming');
        timer = window.setTimeout(reset, CONFIRM_WINDOW_MS);
        return;
      }
      reset();
      run();
    },
  }, label);
  button.addEventListener('blur', reset);
  return button;
}

let hintCount = 0;

function row(name: string, hint: string, control: HTMLElement, wide = false, note: HTMLElement | null = null): HTMLElement {
  const tag = control instanceof HTMLInputElement ? 'label' : 'div';
  const hintId = `settings-hint-${++hintCount}`;
  const described = control.querySelector('input') ?? control;
  described.setAttribute('aria-describedby', hintId);
  return h(tag, { className: `settings-row${wide ? ' settings-row-wide' : ''}${tag === 'label' ? ' settings-switch' : ''}` },
    h('span', { className: 'settings-text' }, h('span', { className: 'settings-label' }, name), h('span', { className: 'settings-hint', id: hintId }, hint), note),
    control,
  );
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;

const PRESET_CHOICES: readonly PresetChoice[] = [...GRAPHICS_PRESETS, 'custom'];

export interface SessionActions {
  leaveWorld(): void;
  signOut(): void;
}

export class SettingsWindow {
  readonly element = h('section', { className: 'settings-window panel', hidden: true, role: 'dialog', ariaLabel: 'Settings' });
  private readonly unsubscribe: () => void;
  private readonly scaleLimit = h('span', { className: 'settings-limit' });
  private scaleCeiling = UI_SCALE_MAX;
  private requestedScale = 1;

  constructor(store: SettingsStore, session: SessionActions) {
    const preset = choiceRow('Quality preset', PRESET_CHOICES, PRESET_LABELS, (value) => {
      if (value !== 'custom') store.applyPreset(value);
    });
    const customButton = preset.element.lastElementChild;
    if (customButton instanceof HTMLButtonElement) customButton.disabled = true;
    const renderScale = choiceRow('Resolution', RENDER_SCALES, RENDER_SCALE_LABELS, (value) => store.update({ renderScale: value }));
    const antialiasing = choiceRow('Anti-aliasing', ANTIALIASING_MODES, ANTIALIASING_LABELS, (value) => store.update({ antialiasing: value }));
    const frameCap = choiceRow('Frame rate', FRAME_CAPS, FRAME_CAP_LABELS, (value) => store.update({ frameCap: value }));
    const shadows = choiceRow('Shadows', SHADOW_QUALITIES, SHADOW_LABELS, (value) => store.update({ shadows: value }));
    const lights = choiceRow('Dynamic lights', DETAIL_LEVELS, DETAIL_LABELS, (value) => store.update({ lights: value }));
    const brightness = sliderControl('Brightness', BRIGHTNESS_MIN, BRIGHTNESS_MAX, BRIGHTNESS_STEP, (value) => store.update({ brightness: value }));
    const glow = choiceRow('Glow', GLOW_LEVELS, GLOW_LABELS, (value) => store.update({ glow: value }));
    const weather = choiceRow('Weather', WEATHER_LEVELS, WEATHER_LABELS, (value) => store.update({ weather: value }));
    const particles = choiceRow('Particles', DETAIL_LEVELS, DETAIL_LABELS, (value) => store.update({ particles: value }));
    const grading = toggleControl('Colour grading', (value) => store.update({ grading: value }));
    const vignette = toggleControl('Vignette', (value) => store.update({ vignette: value }));
    const grain = toggleControl('Film grain', (value) => store.update({ grain: value }));
    const sharpen = toggleControl('Sharpening', (value) => store.update({ sharpen: value }));
    const scanlines = toggleControl('Scanlines', (value) => store.update({ scanlines: value }));
    const fpsCounter = toggleControl('Frame counter', (value) => store.update({ fpsCounter: value }));
    const uiScale = sliderControl('Interface scale', UI_SCALE_MIN, UI_SCALE_MAX, UI_SCALE_STEP, (value) => store.update({ uiScale: value }));

    const group = (title: string, ...rows: HTMLElement[]) => h('section', { className: 'settings-group' }, h('p', { className: 'eyebrow' }, title), ...rows);

    this.element.append(
      h('header', { className: 'shop-header' },
        h('div', {}, h('p', { className: 'eyebrow' }, 'Terminal'), h('h3', {}, 'Settings')),
        h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close settings', onclick: () => this.requestClose() }, '×'),
      ),
      h('div', { className: 'settings-body' },
        group('Quality',
          row('Preset', 'Sets every graphics option below at once. Changing any of them makes it Custom.', preset.element, true),
        ),
        group('Display',
          row('Resolution', 'How many pixels the 3D view draws. Native is sharpest; Performance is fastest.', renderScale.element, true),
          row('Anti-aliasing', 'Smooths jagged block edges. Auto picks a level from your resolution.', antialiasing.element, true),
          row('Frame rate', 'Caps how often the view redraws to save power and heat.', frameCap.element, true),
        ),
        group('Lighting',
          row('Shadows', 'Detail of the shadows cast by the sun. Ultra is crispest but costs the most.', shadows.element, true),
          row('Dynamic lights', 'How many nearby lamps, fires and signs light the world at once.', lights.element, true),
          row('Brightness', 'Overall exposure of the scene.', brightness.element),
        ),
        group('Effects',
          row('Glow', 'Bloom around lamps, screens and energy.', glow.element, true),
          row('Weather', 'Falling rain, ash and floating motes. Ground fog is part of the scene and stays.', weather.element, true),
          row('Particles', 'Sparks, debris and bursts from combat, gathering and level-ups.', particles.element, true),
        ),
        group('Post-processing',
          row('Colour grading', 'Film-like contrast and tinted shadows and highlights.', grading.element),
          row('Vignette', 'Darkens the corners of the screen.', vignette.element),
          row('Film grain', 'A faint moving noise over the image.', grain.element),
          row('Sharpening', 'Crisps edges at lower resolutions.', sharpen.element),
        ),
        group('Interface',
          row('Scale', 'Size of the panels, text and windows.', uiScale.element, false, this.scaleLimit),
          row('Scanlines', 'CRT-style lines over the whole screen.', scanlines.element),
          row('Frame counter', 'Shows frames per second in the corner.', fpsCounter.element),
        ),
      ),
      h('footer', { className: 'settings-footer' },
        confirmButton('Restore defaults', `${primaryGesture()} again to restore`, () => store.reset()),
        h('div', { className: 'settings-session' },
          h('button', { className: 'button ghost small', type: 'button', title: 'Return to your personnel files to pick another operative', onclick: () => session.leaveWorld() }, 'Change operative'),
          confirmButton('Sign out', `${primaryGesture()} again to sign out`, () => session.signOut()),
        ),
      ),
    );

    this.unsubscribe = store.subscribe((settings: GameSettings) => {
      preset.sync(presetOf(settings));
      renderScale.sync(settings.renderScale);
      antialiasing.sync(settings.antialiasing);
      frameCap.sync(settings.frameCap);
      shadows.sync(settings.shadows);
      lights.sync(settings.lights);
      brightness.sync(settings.brightness);
      glow.sync(settings.glow);
      weather.sync(settings.weather);
      particles.sync(settings.particles);
      grading.sync(settings.grading);
      vignette.sync(settings.vignette);
      grain.sync(settings.grain);
      sharpen.sync(settings.sharpen);
      scanlines.sync(settings.scanlines);
      fpsCounter.sync(settings.fpsCounter);
      uiScale.sync(settings.uiScale);
      this.requestedScale = settings.uiScale;
      this.paintScaleLimit();
    });
  }

  setScaleCeiling(ceiling: number): void {
    this.scaleCeiling = ceiling;
    this.paintScaleLimit();
  }

  private paintScaleLimit(): void {
    const limited = this.requestedScale > this.scaleCeiling + 0.001;
    this.scaleLimit.hidden = !limited;
    this.scaleLimit.textContent = limited ? `This window fits up to ${percent(this.scaleCeiling)}; a larger window uses the rest.` : '';
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
