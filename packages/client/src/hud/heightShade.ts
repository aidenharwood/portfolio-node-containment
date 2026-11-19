import type { TileLayout } from '@containment/shared';

const PER_STEP = 0.035;
const PER_RISE = 0.14;
const DARKEST = 0.55;
const BRIGHTEST = 1.7;

export function heightShade(layout: TileLayout, x: number, y: number): number {
  const height = layout.heightAt({ x, y });
  const rise = height - layout.heightAt({ x: x - 1, y: y - 1 });
  if (height === 0 && rise === 0) return 1;
  return Math.max(DARKEST, Math.min(BRIGHTEST, 1 + height * PER_STEP + rise * PER_RISE));
}

export function shadeHex(color: string, factor: number): string {
  if (factor === 1 || !/^#[0-9a-f]{6}$/i.test(color)) return color;
  const channel = (offset: number): string =>
    Math.max(0, Math.min(255, Math.round(parseInt(color.slice(offset, offset + 2), 16) * factor)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}
