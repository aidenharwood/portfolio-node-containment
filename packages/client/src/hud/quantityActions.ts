import type { ItemDefinition } from '@containment/shared';
import type { MenuAction } from './contextMenu.ts';
import { promptQuantity } from './quantityPrompt.ts';

export const QUANTITY_STEPS = [1, 5] as const;

export function quantityActions(verb: string, item: ItemDefinition, available: number, run: (quantity: number) => void): MenuAction[] {
  const steps = QUANTITY_STEPS.filter((step) => step < available).map((step): MenuAction => ({
    verb: `${verb} ${step}`,
    subject: item.name,
    subjectTone: 'item',
    run: () => run(step),
  }));
  if (available <= 0) return steps;
  const custom: MenuAction[] = available > 1
    ? [{ verb: `${verb} X`, subject: item.name, subjectTone: 'item', run: () => promptQuantity(`${verb} how many ${item.name}?`, available, run) }]
    : [];
  return [...steps, ...custom, { verb: available === 1 ? `${verb} 1` : `${verb} All (${available.toLocaleString()})`, subject: item.name, subjectTone: 'item', run: () => run(available) }];
}

export function preserveScroll(container: ParentNode, selectors: readonly string[], render: () => void): void {
  const positions = selectors.map((selector) => (container.querySelector(selector) as HTMLElement | null)?.scrollTop ?? 0);
  render();
  selectors.forEach((selector, index) => {
    const element = container.querySelector(selector) as HTMLElement | null;
    if (element) element.scrollTop = positions[index] ?? 0;
  });
}
