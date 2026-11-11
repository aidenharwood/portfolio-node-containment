export const VIEWPORT_MARGIN = 8;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function clampToViewport(point: Point, size: Size, viewport: Size, margin = VIEWPORT_MARGIN): Point {
  return {
    x: Math.max(margin, Math.min(point.x, viewport.width - size.width - margin)),
    y: Math.max(margin, Math.min(point.y, viewport.height - size.height - margin)),
  };
}

export function placeInViewport(element: HTMLElement, x: number, y: number): void {
  const bounds = element.getBoundingClientRect();
  const placed = clampToViewport({ x, y }, bounds, { width: window.innerWidth, height: window.innerHeight });
  element.style.left = `${placed.x}px`;
  element.style.top = `${placed.y}px`;
}
