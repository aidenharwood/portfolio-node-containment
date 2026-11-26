export type Glyph = readonly string[];

export interface GlyphCell {
  readonly x: number;
  readonly y: number;
}

export const LETTERS: Readonly<Record<string, Glyph>> = {
  A: ['###', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['###', '#..', '#..', '#..', '###'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['###', '#..', '#.#', '#.#', '###'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  P: ['###', '#.#', '###', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['###', '#..', '###', '..#', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '-': ['...', '...', '###', '...', '...'],
};

export const SYMBOLS: Readonly<Record<string, Glyph>> = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  cup: ['#######', '.#...#.', '..#.#..', '...#...', '...#...', '..###..'],
  bowl: ['.#..#..', '..#..#.', '#######', '#.....#', '.#...#.', '..###..'],
  eye: ['..###..', '.#...#.', '#..#..#', '.#...#.', '..###..'],
  bolt: ['...##', '..##.', '.####', '.##..', '##...'],
  star: ['...#...', '..###..', '#######', '.#####.', '.##.##.', '##...##'],
  arrow: ['..#....', '.##....', '#######', '.##....', '..#....'],
  cat: ['#.....#', '##...##', '#######', '#.#.#.#', '#######', '.#####.'],
  ring: ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'],
  trefoil: ['..###..', '..#.#..', '...#...', '.#####.', '##.#.##', '#..#..#'],
  wedges: ['##...##', '###.###', '.##.##.', '...#...', '..###..', '..###..'],
  bar: ['.#####.', '#######', '#.....#', '#######', '.#####.'],
};

export const KANA: readonly Glyph[] = [
  ['#####', '....#', '..##.', '..#..', '.#...'],
  ['.#...', '#####', '.#..#', '.#..#', '#..##'],
  ['#####', '..#..', '#####', '..#..', '..#..'],
  ['#...#', '.#..#', '....#', '...#.', '.##..'],
  ['.###.', '.....', '#####', '..#..', '.#...'],
  ['#####', '#...#', '#####', '#...#', '#####'],
  ['..#..', '#####', '..#..', '.#.#.', '#...#'],
  ['#....', '#####', '#....', '#....', '.####'],
];

export const glyphWidth = (glyph: Glyph): number => Math.max(...glyph.map((row) => row.length));

export function glyphCells(glyph: Glyph): GlyphCell[] {
  const cells: GlyphCell[] = [];
  const height = glyph.length;
  glyph.forEach((row, index) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') cells.push({ x, y: height - 1 - index });
  });
  return cells;
}

export function lettersOf(text: string): Glyph[] {
  return [...text].map((char) => {
    const glyph = LETTERS[char];
    if (!glyph) throw new Error('no glyph for ' + char);
    return glyph;
  });
}

export const textWidth = (text: string, gap = 1): number => lettersOf(text).reduce((sum, glyph) => sum + glyphWidth(glyph), 0) + gap * Math.max(0, text.length - 1);

export function textCells(text: string, gap = 1): GlyphCell[] {
  const cells: GlyphCell[] = [];
  let cursor = 0;
  for (const glyph of lettersOf(text)) {
    for (const cell of glyphCells(glyph)) cells.push({ x: cell.x + cursor, y: cell.y });
    cursor += glyphWidth(glyph) + gap;
  }
  return cells;
}

export function columnCells(glyphs: readonly Glyph[], gap = 1): GlyphCell[] {
  const cells: GlyphCell[] = [];
  let cursor = 0;
  for (const glyph of [...glyphs].reverse()) {
    for (const cell of glyphCells(glyph)) cells.push({ x: cell.x, y: cell.y + cursor });
    cursor += glyph.length + gap;
  }
  return cells;
}

export function glyphOutline(glyph: Glyph): GlyphCell[] {
  const on = new Set(glyphCells(glyph).map((cell) => cell.x + ',' + cell.y));
  return glyphCells(glyph).filter((cell) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !on.has(cell.x + (dx as number) + ',' + (cell.y + (dy as number)))));
}

export function glyphInterior(glyph: Glyph): GlyphCell[] {
  const outline = new Set(glyphOutline(glyph).map((cell) => cell.x + ',' + cell.y));
  return glyphCells(glyph).filter((cell) => !outline.has(cell.x + ',' + cell.y));
}

export const columnHeight = (glyphs: readonly Glyph[], gap = 1): number => glyphs.reduce((sum, glyph) => sum + glyph.length, 0) + gap * Math.max(0, glyphs.length - 1);
