import {
  AUGMENTS,
  BODY_TYPES,
  PHYSIQUES,
  characterDraftErrors,
  characterNameError,
  createDefaultDraft,
  EYE_COLORS,
  FACE_MARKS,
  GAME_CONTENT,
  HAIR_COLORS,
  HAIR_STYLES,
  HEIGHT_RANGE,
  labelFor,
  PRONOUN_SET_IDS,
  PRONOUN_SETS,
  randomAppearance,
  SKILL_IDS,
  SKILL_INFO,
  SKIN_TONES,
  type CharacterAppearance,
  type CharacterDraft,
} from '@containment/shared';
import type { AppNavigator } from '../app.ts';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import { AvatarPreview } from '../ui/avatarPreview.ts';
import { createBackdrop } from '../ui/backdrop.ts';
import { h, replaceChildren, type Screen } from '../ui/dom.ts';

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export function createCreatorScreen(app: AppNavigator, canGoBack: boolean): Screen {
  const draft: Mutable<CharacterDraft> = { ...createDefaultDraft() };
  const kit = GAME_CONTENT.newCharacter.kit;
  let showKit = true;
  const backdrop = createBackdrop();

  const preview = new AvatarPreview(
    { appearance: draft.appearance, gear: [...kit.equipment], facing: 'south', walking: false },
    { width: 320, height: 400, pedestal: true },
  );

  const summary = h('div', { className: 'creator-summary' });
  const errors = h('ul', { className: 'form-errors', role: 'alert' });
  const submit = h('button', { className: 'button primary wide', type: 'button' }, 'Submit for processing');
  const identitySection = h('section', { className: 'creator-section' });
  const appearanceSection = h('section', { className: 'creator-section' });

  const refresh = () => {
    preview.model.appearance = draft.appearance;
    preview.model.gear = showKit ? [...kit.equipment] : [];
    renderSummary();
  };

  const updateAppearance = (changes: Partial<CharacterAppearance>) => {
    draft.appearance = { ...draft.appearance, ...changes };
    renderAppearance();
    refresh();
  };

  const nameInput = h('input', { className: 'field-input', maxLength: 18, placeholder: 'Given name and surname', value: draft.name });
  const nameError = h('span', { className: 'field-error' });
  nameInput.oninput = () => {
    draft.name = nameInput.value;
    nameError.textContent = draft.name.trim() ? (characterNameError(draft.name) ?? '') : '';
    renderSummary();
  };

  const renderIdentity = () => {
    replaceChildren(
      identitySection,
      sectionHeading('01', 'Identity'),
      h('label', { className: 'field' }, h('span', { className: 'field-label' }, 'Name'), nameInput, nameError),
      h('div', { className: 'field' }, h('span', { className: 'field-label' }, 'Pronouns'),
        segmented(PRONOUN_SET_IDS.map((id) => ({ value: id, label: PRONOUN_SETS[id].label })), draft.pronouns, (value) => {
          draft.pronouns = value;
          renderIdentity();
          renderSummary();
        }),
      ),
    );
  };

  const renderAppearance = () => {
    const appearance = draft.appearance;
    const heightInput = h('input', {
      type: 'range',
      className: 'slider',
      min: String(HEIGHT_RANGE.minimum),
      max: String(HEIGHT_RANGE.maximum),
      step: '0.01',
      value: String(appearance.height),
    });
    heightInput.oninput = () => {
      draft.appearance = { ...draft.appearance, height: Number(heightInput.value) };
      refresh();
    };
    replaceChildren(
      appearanceSection,
      sectionHeading('02', 'Appearance',
        h('button', { className: 'button ghost small', type: 'button', onclick: () => {
          draft.appearance = randomAppearance();
          renderAppearance();
          refresh();
        } }, 'Randomise'),
      ),
      optionField('Body', segmented(PHYSIQUES.map((value) => ({ value, label: labelFor(value) })), appearance.physique, (physique) => updateAppearance({ physique }))),
      optionField('Build', segmented(BODY_TYPES.map((value) => ({ value, label: labelFor(value) })), appearance.bodyType, (bodyType) => updateAppearance({ bodyType }))),
      optionField('Height', heightInput),
      optionField('Complexion', swatches(SKIN_TONES, appearance.skinTone, (skinTone) => updateAppearance({ skinTone }))),
      optionField('Hair', chips(HAIR_STYLES, appearance.hairStyle, (hairStyle) => updateAppearance({ hairStyle }))),
      optionField('Hair colour', swatches(HAIR_COLORS, appearance.hairColor, (hairColor) => updateAppearance({ hairColor }))),
      optionField('Eyes', swatches(EYE_COLORS, appearance.eyeColor, (eyeColor) => updateAppearance({ eyeColor }))),
      optionField('Distinguishing marks', chips(FACE_MARKS, appearance.faceMark, (faceMark) => updateAppearance({ faceMark }))),
      optionField('Augmentation', chips(AUGMENTS, appearance.augment, (augment) => updateAppearance({ augment }))),
    );
  };

  const renderSummary = () => {
    const issued = [...kit.equipment.map((itemId) => ({ itemId, count: 1 })), ...kit.items];
    replaceChildren(
      summary,
      h('div', { className: 'summary-block' },
        h('p', { className: 'eyebrow' }, 'Personnel record'),
        h('h2', { className: 'summary-name' }, draft.name.trim() || 'Unnamed Operative'),
        h('p', { className: 'summary-meta' }, `Intake operative · ${PRONOUN_SETS[draft.pronouns].label}`),
      ),
      h('div', { className: 'summary-block' },
        h('p', { className: 'eyebrow' }, 'Proficiencies'),
        h('ul', { className: 'summary-skills' },
          ...SKILL_IDS.map((id) => h('li', {}, h('span', {}, SKILL_INFO[id].name), h('strong', {}, 'Lv 1'))),
        ),
        h('p', { className: 'summary-note' }, 'Every operative starts equal. Proficiencies — and everything derived from them — are earned through training.'),
      ),
      h('div', { className: 'summary-block' },
        h('p', { className: 'eyebrow' }, 'Standard issue'),
        h('div', { className: 'summary-kit' },
          ...issued.map(({ itemId, count }) => {
            const item = GAME_CONTENT.items.get(itemId);
            return item
              ? h('div', { className: `kit-item rarity-${item.rarity}`, title: `${item.name}\n${item.examine}` },
                  h('img', { src: itemIconUrl(item), alt: item.name }),
                  count > 1 && h('span', { className: 'kit-count' }, String(count)),
                )
              : null;
          }),
        ),
      ),
    );
    submit.disabled = characterDraftErrors(draft).length > 0;
  };

  submit.onclick = () => {
    const problems = characterDraftErrors(draft);
    replaceChildren(errors, ...problems.map((problem) => h('li', {}, problem)));
    if (problems.length > 0) return;
    submit.disabled = true;
    submit.textContent = 'Processing…';
    app.connection.send({ type: 'character.create', draft });
  };

  const stopRejections = app.connection.on('character.rejected', ({ errors: problems }) => {
    submit.disabled = false;
    submit.textContent = 'Submit for processing';
    replaceChildren(errors, ...problems.map((problem) => h('li', {}, problem)));
  });

  const kitToggle = h('input', { type: 'checkbox', checked: showKit });
  kitToggle.onchange = () => {
    showKit = kitToggle.checked;
    refresh();
  };
  const walkToggle = h('input', { type: 'checkbox' });
  walkToggle.onchange = () => {
    preview.model.walking = walkToggle.checked;
  };

  renderIdentity();
  renderAppearance();
  refresh();

  const element = h(
    'div',
    { className: 'screen creator-screen' },
    backdrop.element,
    h('div', { className: 'creator-layout' },
      h('header', { className: 'screen-header' },
        h('div', {}, h('p', { className: 'eyebrow' }, 'Form 7-A · Personnel Intake'), h('h1', {}, 'New Operative')),
        canGoBack && h('button', { className: 'button ghost', onclick: () => app.showRoster() }, 'Back to files'),
      ),
      h('div', { className: 'creator-columns' },
        h('div', { className: 'creator-form panel' }, identitySection, appearanceSection),
        h('div', { className: 'creator-stage' },
          h('div', { className: 'stage-frame' }, preview.element),
          h('div', { className: 'stage-controls' },
            h('button', { className: 'button ghost small', type: 'button', onclick: () => preview.rotate(-1), ariaLabel: 'Rotate left' }, '⟲'),
            h('label', { className: 'toggle' }, kitToggle, 'Issue kit'),
            h('label', { className: 'toggle' }, walkToggle, 'Walk cycle'),
            h('button', { className: 'button ghost small', type: 'button', onclick: () => preview.rotate(1), ariaLabel: 'Rotate right' }, '⟳'),
          ),
        ),
        h('aside', { className: 'creator-aside panel' }, summary, errors, submit),
      ),
    ),
  );

  return {
    element,
    unmount: () => {
      stopRejections();
      preview.dispose();
      backdrop.dispose();
    },
  };
}

function sectionHeading(index: string, title: string, accessory?: Node): HTMLElement {
  return h('div', { className: 'section-heading' }, h('span', { className: 'section-index' }, index), h('h2', {}, title), accessory ?? null);
}

function optionField(label: string, control: Node): HTMLElement {
  return h('div', { className: 'field' }, h('span', { className: 'field-label' }, label), control);
}

function segmented<T extends string>(options: readonly { value: T; label: string }[], selected: T, onSelect: (value: T) => void): HTMLElement {
  return h('div', { className: 'segmented', role: 'radiogroup' },
    ...options.map((option) =>
      h('button', {
        className: option.value === selected ? 'selected' : '',
        type: 'button',
        role: 'radio',
        ariaChecked: String(option.value === selected),
        onclick: () => onSelect(option.value),
      }, option.label),
    ),
  );
}

function chips<T extends string>(options: readonly T[], selected: T, onSelect: (value: T) => void): HTMLElement {
  return h('div', { className: 'chip-row' },
    ...options.map((value) =>
      h('button', { className: `chip selectable${value === selected ? ' selected' : ''}`, type: 'button', onclick: () => onSelect(value) }, labelFor(value)),
    ),
  );
}

function swatches<T extends string>(options: readonly T[], selected: T, onSelect: (value: T) => void): HTMLElement {
  return h('div', { className: 'swatch-row' },
    ...options.map((color) =>
      h('button', {
        className: `swatch${color === selected ? ' selected' : ''}`,
        type: 'button',
        style: { background: color },
        ariaLabel: color,
        onclick: () => onSelect(color),
      }),
    ),
  );
}
