export const hex = (css: string): number => Number.parseInt(css.replace('#', ''), 16);

const channels = (color: number): [number, number, number] => [(color >> 16) & 255, (color >> 8) & 255, color & 255];

const pack = (r: number, g: number, b: number): number =>
  (Math.max(0, Math.min(255, Math.round(r))) << 16) |
  (Math.max(0, Math.min(255, Math.round(g))) << 8) |
  Math.max(0, Math.min(255, Math.round(b)));

export function mix(a: number, b: number, amount: number): number {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return pack(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}

export const darken = (color: number, amount: number): number => mix(color, 0x000000, amount);

export const lighten = (color: number, amount: number): number => mix(color, 0xffffff, amount);

export function jitter(color: number, amount: number, seed: number): number {
  const [r, g, b] = channels(color);
  const offset = (seed - 0.5) * 2 * amount * 255;
  return pack(r + offset, g + offset, b + offset);
}

export function noise3(x: number, y: number, z: number, salt = 0): number {
  let hash = (x * 374761393 + y * 668265263 + z * 2147483647 + salt * 1274126177) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822519);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}
