import { DISTRICT_LAYOUT_SCHEMA, type DistrictLayout } from './layoutSchema.ts';

const RECORD_KEYS: ReadonlySet<string> = new Set(['anchors', 'dressing']);

const inline = (value: unknown): string => {
  if (Array.isArray(value)) return value.length === 0 ? '[]' : `[${value.map(inline).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
    return entries.length === 0 ? '{}' : `{ ${entries.map(([key, entry]) => `${JSON.stringify(key)}: ${inline(entry)}`).join(', ')} }`;
  }
  return JSON.stringify(value);
};

const block = (key: string, value: unknown): string => {
  if (Array.isArray(value)) return value.length === 0 ? '[]' : `[\n${value.map((item) => `    ${inline(item)}`).join(',\n')}\n  ]`;
  if (RECORD_KEYS.has(key) && value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    return entries.length === 0 ? '{}' : `{\n${entries.map(([name, entry]) => `    ${JSON.stringify(name)}: ${inline(entry)}`).join(',\n')}\n  }`;
  }
  return inline(value);
};

export function printLayout(layout: DistrictLayout): string {
  const canonical = DISTRICT_LAYOUT_SCHEMA.parse(layout);
  const entries = Object.entries(canonical).filter(([, value]) => value !== undefined);
  return `{\n${entries.map(([key, value]) => `  ${JSON.stringify(key)}: ${block(key, value)}`).join(',\n')}\n}\n`;
}
