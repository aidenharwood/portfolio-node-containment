const hashUnit = (x: number, y: number, seed: number): number => {
  let hash = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
  hash = Math.imul(hash ^ (hash >>> 15), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967295;
};

const fade = (t: number): number => t * t * (3 - 2 * t);

export function valueNoise(seed: number, x: number, y: number): number {
  const left = Math.floor(x);
  const top = Math.floor(y);
  const across = fade(x - left);
  const down = fade(y - top);
  const topLeft = hashUnit(left, top, seed);
  const topRight = hashUnit(left + 1, top, seed);
  const bottomLeft = hashUnit(left, top + 1, seed);
  const bottomRight = hashUnit(left + 1, top + 1, seed);
  const leftSide = topLeft + (bottomLeft - topLeft) * down;
  const rightSide = topRight + (bottomRight - topRight) * down;
  return leftSide + (rightSide - leftSide) * across;
}

export const FRACTAL_OCTAVES = 4;

const octaveSeed = (seed: number, octave: number): number => Math.imul(seed, 0x2545f491) + octave * 0x3c6ef372;
const octaveX = (x: number, frequency: number, octave: number): number => x * frequency + octave * 17.31;
const octaveY = (y: number, frequency: number, octave: number): number => y * frequency + octave * 29.73;

export function fractalNoise(seed: number, x: number, y: number, octaves: number = FRACTAL_OCTAVES): number {
  let total = 0;
  let weight = 0;
  let amplitude = 1;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    total += amplitude * valueNoise(octaveSeed(seed, octave), octaveX(x, frequency, octave), octaveY(y, frequency, octave));
    weight += amplitude;
    amplitude /= 2;
    frequency *= 2;
  }
  return weight === 0 ? 0 : total / weight;
}

export function contrastNoise(seed: number, x: number, y: number, octaves: number, persistence: number, gain: number): number {
  let total = 0;
  let weight = 0;
  let amplitude = 1;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    total += amplitude * valueNoise(octaveSeed(seed, octave), octaveX(x, frequency, octave), octaveY(y, frequency, octave));
    weight += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  if (weight === 0) return 0.5;
  const value = 0.5 + (total / weight - 0.5) * gain;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

interface Axis {
  readonly cell: Int32Array;
  readonly fade: Float64Array;
  readonly first: number;
  readonly cells: number;
}

function axisOf(from: number, to: number, scale: number, place: (value: number) => number): Axis {
  const cell = new Int32Array(Math.max(0, to - from));
  const faded = new Float64Array(cell.length);
  let first = Infinity;
  let last = -Infinity;
  for (let index = 0; index < cell.length; index++) {
    const value = place((from + index) / scale);
    const whole = Math.floor(value);
    cell[index] = whole;
    faded[index] = fade(value - whole);
    first = Math.min(first, whole);
    last = Math.max(last, whole);
  }
  if (cell.length === 0) return { cell, fade: faded, first: 0, cells: 0 };
  for (let index = 0; index < cell.length; index++) cell[index] = (cell[index] as number) - first;
  return { cell, fade: faded, first, cells: last - first + 2 };
}

export function fractalNoiseGrid(seed: number, scale: number, left: number, top: number, right: number, bottom: number, octaves: number = FRACTAL_OCTAVES): (x: number, y: number) => number {
  const layers: { readonly columns: Axis; readonly rows: Axis; readonly lattice: Float64Array; readonly amplitude: number; readonly between: Float64Array }[] = [];
  let weight = 0;
  let amplitude = 1;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    const at = frequency;
    const columns = axisOf(left, right, scale, (value) => octaveX(value, at, octave));
    const rows = axisOf(top, bottom, scale, (value) => octaveY(value, at, octave));
    const lattice = new Float64Array(columns.cells * rows.cells);
    const salt = octaveSeed(seed, octave);
    for (let row = 0; row < rows.cells; row++) {
      for (let column = 0; column < columns.cells; column++) lattice[row * columns.cells + column] = hashUnit(columns.first + column, rows.first + row, salt);
    }
    layers.push({ columns, rows, lattice, amplitude, between: new Float64Array(columns.cells) });
    weight += amplitude;
    amplitude /= 2;
    frequency *= 2;
  }
  const span = Math.max(0, right - left);
  const values = new Float64Array(span);
  let shown = -1;
  const fillRow = (down: number): void => {
    values.fill(0);
    for (const layer of layers) {
      const { columns, rows, lattice, between } = layer;
      const stride = columns.cells;
      const above = (rows.cell[down] as number) * stride;
      const fy = rows.fade[down] as number;
      for (let column = 0; column < stride; column++) {
        const upper = lattice[above + column] as number;
        between[column] = upper + ((lattice[above + stride + column] as number) - upper) * fy;
      }
      const cells = columns.cell;
      const fades = columns.fade;
      const part = layer.amplitude;
      for (let across = 0; across < span; across++) {
        const cell = cells[across] as number;
        const leftSide = between[cell] as number;
        values[across] = (values[across] as number) + part * (leftSide + ((between[cell + 1] as number) - leftSide) * (fades[across] as number));
      }
    }
    if (weight !== 0) for (let across = 0; across < span; across++) values[across] = (values[across] as number) / weight;
    shown = down;
  };
  return (x, y) => {
    const down = y - top;
    if (down !== shown) fillRow(down);
    return values[x - left] as number;
  };
}
