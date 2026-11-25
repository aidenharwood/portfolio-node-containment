import { Color, Matrix3, Vector3 } from 'three';

const ACES_INPUT = new Matrix3().set(0.59719, 0.35458, 0.04823, 0.076, 0.90834, 0.01566, 0.0284, 0.13383, 0.83777);
const ACES_OUTPUT = new Matrix3().set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);
const INPUT_INVERSE = ACES_INPUT.clone().invert();
const OUTPUT_INVERSE = ACES_OUTPUT.clone().invert();
const ACES_SCALE = 0.6;
const DISPLAY_CEILING = 0.98;

const fit = (value: number): number => (value * (value + 0.0245786) - 0.000090537) / (value * (0.983729 * value + 0.432951) + 0.238081);

export function unfit(display: number): number {
  const level = Math.min(DISPLAY_CEILING, Math.max(0, display));
  const a = 0.983729 * level - 1;
  const b = 0.432951 * level - 0.0245786;
  const c = 0.238081 * level + 0.000090537;
  return (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

const decode = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const encode = (value: number): number => (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);
const unit = (value: number): number => Math.min(1, Math.max(0, value));
const scratch = new Vector3();

export function sceneColorOf(display: Color, exposure: number, into: Color = new Color()): Color {
  scratch.set(decode(unit(display.r)), decode(unit(display.g)), decode(unit(display.b))).applyMatrix3(OUTPUT_INVERSE);
  scratch.set(unfit(scratch.x), unfit(scratch.y), unfit(scratch.z)).applyMatrix3(INPUT_INVERSE).multiplyScalar(ACES_SCALE / exposure);
  return into.setRGB(Math.max(0, scratch.x), Math.max(0, scratch.y), Math.max(0, scratch.z));
}

export function displayColorOf(scene: Color, exposure: number, into: Color = new Color()): Color {
  scratch.set(scene.r, scene.g, scene.b).multiplyScalar(exposure / ACES_SCALE).applyMatrix3(ACES_INPUT);
  scratch.set(fit(scratch.x), fit(scratch.y), fit(scratch.z)).applyMatrix3(ACES_OUTPUT);
  return into.setRGB(encode(unit(scratch.x)), encode(unit(scratch.y)), encode(unit(scratch.z)));
}

const glslMatrix = (matrix: Matrix3): string => `mat3( ${matrix.elements.map((value) => value.toFixed(6)).join(', ')} )`;

export const SCENE_OF_DISPLAY = `vec3 sceneOfDisplay( vec3 display, float exposure ) {
	vec3 c = clamp( display, 0.0, 1.0 );
	c = mix( c / 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, c ) );
	vec3 y = clamp( ${glslMatrix(OUTPUT_INVERSE)} * c, 0.0, ${DISPLAY_CEILING.toFixed(2)} );
	vec3 a = 0.983729 * y - 1.0;
	vec3 b = 0.432951 * y - 0.0245786;
	vec3 k = 0.238081 * y + 0.000090537;
	vec3 v = ( - b - sqrt( b * b - 4.0 * a * k ) ) / ( 2.0 * a );
	return max( ${glslMatrix(INPUT_INVERSE)} * v, 0.0 ) * ( ${ACES_SCALE.toFixed(2)} / exposure );
}`;
