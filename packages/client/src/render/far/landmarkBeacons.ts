import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Mesh, MeshBasicMaterial, Points, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3 } from 'three';
import { SPINDLE_COLLARS, SPINDLE_CROWN, SPINDLE_HEIGHT_VOXELS, spindleRadius } from '../models/cityModels.ts';
import { receiveAir } from '../sky/air.ts';
import { LANDMARK_HEIGHT, type Landmark } from './farLandmarks.ts';

const BASE_PIXELS = 12;
const PIXELS_PER_UNIT = 2;
const MAX_PIXELS = 30;
const GLOW_GAIN = 3.2;
const HALO = 0.3;
const BEACON_FOG = 0.35;
const FADE_FROM = 60;
const FADE_TO = 140;

export const NEEDLE_FROM = 40;
const NEEDLE_SIDES = 8;
const NEEDLE_SHARE = 0.65;
const NEEDLE_AIR = 0.55;
const NEEDLE_GLASS = 0x1a1f28;
const NEEDLE_GLOW = 1.8;
const NEEDLE_CORE = 0.6;
const NEEDLE_COLLAR = 3;
const NEEDLE_TIP = 472;
const NEEDLE_TIP_RADIUS = 1.6;
const NEEDLE_LEVELS: readonly number[] = [0, 4, 24, 60, 110, 170, 240, 320, 400, SPINDLE_CROWN, NEEDLE_TIP];

export const needleRadius = (voxel: number): number => NEEDLE_SHARE * (voxel > SPINDLE_CROWN ? NEEDLE_TIP_RADIUS : spindleRadius(voxel));

export function needleGeometry(landmarks: readonly Landmark[]): BufferGeometry | null {
  const tall = landmarks.filter((landmark) => landmark.height >= NEEDLE_FROM);
  if (tall.length === 0) return null;
  const levels = [...new Set([...NEEDLE_LEVELS, ...SPINDLE_COLLARS.flatMap((collar) => [collar, collar + NEEDLE_COLLAR])])].sort((a, b) => a - b);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const glass = new Color(NEEDLE_GLASS);
  const band = new Color();
  const core = new Color();
  for (const landmark of tall) {
    const unit = landmark.height / SPINDLE_HEIGHT_VOXELS;
    const foot = landmark.y - landmark.height;
    band.setHex(landmark.color).multiplyScalar(NEEDLE_GLOW);
    core.setHex(landmark.color).lerp(new Color(1, 1, 1), NEEDLE_CORE).multiplyScalar(NEEDLE_GLOW);
    for (let level = 1; level < levels.length; level++) {
      const from = levels[level - 1] as number;
      const to = levels[level] as number;
      const color = from >= SPINDLE_CROWN ? core : SPINDLE_COLLARS.includes(from) ? band : glass;
      const radii = [needleRadius(from >= SPINDLE_CROWN ? from + 1 : from) * unit, needleRadius(to) * unit];
      const heights = [foot + from * unit, foot + to * unit];
      for (let side = 0; side < NEEDLE_SIDES; side++) {
        const base = positions.length / 3;
        for (const turn of [side, side + 1]) {
          const angle = (turn / NEEDLE_SIDES) * Math.PI * 2;
          for (const end of [0, 1]) {
            positions.push(landmark.x + Math.cos(angle) * (radii[end] as number), heights[end] as number, landmark.z + Math.sin(angle) * (radii[end] as number));
            colors.push(color.r, color.g, color.b);
          }
        }
        indices.push(base, base + 1, base + 3, base, base + 3, base + 2);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

export const beaconPixels = (height: number): number => Math.min(MAX_PIXELS, BASE_PIXELS + Math.max(0, height - LANDMARK_HEIGHT) * PIXELS_PER_UNIT);

function needleMaterial(): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ vertexColors: true, fog: true });
  material.onBeforeCompile = (shader) => receiveAir(shader, NEEDLE_AIR);
  return material;
}

export class LandmarkBeacons {
  readonly points: Points;
  readonly needles: Mesh | null;
  private readonly material: ShaderMaterial;

  constructor(landmarks: readonly Landmark[]) {
    const positions = new Float32Array(landmarks.length * 3);
    const colors = new Float32Array(landmarks.length * 3);
    const sizes = new Float32Array(landmarks.length);
    const color = new Color();
    landmarks.forEach((landmark, index) => {
      positions.set([landmark.x, landmark.y, landmark.z], index * 3);
      color.setHex(landmark.color);
      colors.set([color.r, color.g, color.b], index * 3);
      sizes[index] = beaconPixels(landmark.height);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setAttribute('size', new BufferAttribute(sizes, 1));
    this.material = new ShaderMaterial({
      fog: true,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
      uniforms: UniformsUtils.merge([UniformsLib.fog, { pixelRatio: { value: 1 }, farFocus: { value: new Vector3() }, beaconFade: { value: new Vector2(FADE_FROM, FADE_TO) } }]),
      vertexShader: `attribute float size;
uniform float pixelRatio;
uniform vec3 farFocus;
uniform vec2 beaconFade;
varying vec3 vBeacon;
varying float vBeaconDepth;
void main() {
	vec4 view = modelViewMatrix * vec4( position, 1.0 );
	vBeaconDepth = - view.z;
	gl_Position = projectionMatrix * view;
	gl_PointSize = size * pixelRatio;
	vBeacon = color * smoothstep( beaconFade.x, beaconFade.y, distance( position.xz, farFocus.xz ) );
}`,
      fragmentShader: `uniform vec3 fogColor;
uniform float fogDensity;
varying vec3 vBeacon;
varying float vBeaconDepth;
void main() {
	vec2 offset = gl_PointCoord * 2.0 - 1.0;
	float spread = dot( offset, offset );
	if ( spread >= 1.0 ) discard;
	float glow = exp( - spread * 7.0 ) * ${GLOW_GAIN.toFixed(2)} + ( 1.0 - spread ) * ${HALO.toFixed(2)};
	float fogFactor = ( 1.0 - exp( - fogDensity * fogDensity * vBeaconDepth * vBeaconDepth ) ) * ${BEACON_FOG.toFixed(2)};
	gl_FragColor = vec4( vBeacon * glow * ( 1.0 - fogFactor ), 1.0 );
	#include <colorspace_fragment>
}`,
    });
    this.points = new Points(geometry, this.material);
    this.points.name = 'landmarkBeacons';
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    const needles = needleGeometry(landmarks);
    this.needles = needles ? new Mesh(needles, needleMaterial()) : null;
    if (this.needles) {
      this.needles.name = 'landmarkNeedles';
      this.points.add(this.needles);
    }
  }

  update(focus: Vector3, pixelRatio: number): void {
    (this.material.uniforms['farFocus']!.value as Vector3).copy(focus);
    this.material.uniforms['pixelRatio']!.value = pixelRatio;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.material.dispose();
    if (this.needles) {
      this.needles.geometry.dispose();
      (this.needles.material as MeshBasicMaterial).dispose();
    }
  }
}
