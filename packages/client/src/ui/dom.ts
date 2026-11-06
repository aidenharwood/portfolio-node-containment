type Child = Node | string | number | null | undefined | false;

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style' | 'dataset'>> & {
  className?: string;
  style?: Partial<CSSStyleDeclaration> & Record<`--${string}`, string>;
  dataset?: Record<string, string>;
  attributes?: Record<string, string>;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props<K> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  const { style, dataset, attributes, ...rest } = props;
  Object.assign(element, rest);
  if (style) {
    for (const [key, value] of Object.entries(style)) {
      if (key.startsWith('--')) element.style.setProperty(key, String(value));
      else (element.style as unknown as Record<string, unknown>)[key] = value;
    }
  }
  if (dataset) Object.assign(element.dataset, dataset);
  if (attributes) for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  append(element, ...children);
  return element;
}

export function append(parent: Node, ...children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
}

export function replaceChildren(parent: Element, ...children: Child[]): void {
  parent.replaceChildren();
  append(parent, ...children);
}

export type Unmount = () => void;

export interface Screen {
  readonly element: HTMLElement;
  unmount(): void;
}
