import type { LandPlan } from './landPlan.ts';
import { parseLandPlan } from './landSchema.ts';

const inline = (value: unknown): string => {
  if (Array.isArray(value)) return value.length === 0 ? '[]' : `[${value.map(inline).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
    return entries.length === 0 ? '{}' : `{ ${entries.map(([key, entry]) => `${JSON.stringify(key)}: ${inline(entry)}`).join(', ')} }`;
  }
  return JSON.stringify(value);
};

const block = (value: unknown): string =>
  Array.isArray(value) && value.length > 0 ? `[\n${value.map((item) => `    ${inline(item)}`).join(',\n')}\n  ]` : inline(value);

export function printLandPlan(plan: LandPlan): string {
  const canonical = parseLandPlan(plan);
  const entries = Object.entries(canonical).filter(([, value]) => value !== undefined);
  return `{\n${entries.map(([key, value]) => `  ${JSON.stringify(key)}: ${block(value)}`).join(',\n')}\n}\n`;
}
