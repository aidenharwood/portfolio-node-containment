import { h } from '../ui/dom.ts';

let active: HTMLElement | null = null;

export function closeQuantityPrompt(): void {
  active?.remove();
  active = null;
}

export function promptQuantity(title: string, maximum: number, submit: (quantity: number) => void): void {
  closeQuantityPrompt();
  if (maximum < 1) return;
  const input = h('input', { className: 'quantity-input', type: 'number', min: '1', max: String(maximum), value: String(maximum) }) as HTMLInputElement;
  const confirm = () => {
    const quantity = Math.min(maximum, Math.floor(Number(input.value)));
    closeQuantityPrompt();
    if (Number.isFinite(quantity) && quantity >= 1) submit(quantity);
  };
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') confirm();
    if (event.key === 'Escape') closeQuantityPrompt();
  });
  const dialog = h('form', {
    className: 'quantity-prompt panel',
    role: 'dialog',
    ariaLabel: title,
    onsubmit: (event: Event) => {
      event.preventDefault();
      confirm();
    },
  },
    h('label', { className: 'quantity-title' }, title, input),
    h('p', { className: 'tab-hint' }, `Up to ${maximum.toLocaleString()}`),
    h('div', { className: 'quantity-buttons' },
      h('button', { className: 'button ghost small', type: 'button', onclick: closeQuantityPrompt }, 'Cancel'),
      h('button', { className: 'button small', type: 'submit' }, 'OK'),
    ),
  );
  document.body.append(dialog);
  active = dialog;
  input.focus();
  input.select();
}
