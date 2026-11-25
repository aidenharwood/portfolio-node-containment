import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3 } from 'three';
import { LANDMARK_HEIGHT, type Landmark } from './farLandmarks.ts';

const BASE_PIXELS = 12;
const PIXELS_PER_UNIT = 2;
const MAX_PIXELS = 30;
const GLOW_GAIN = 3.2;
const HALO = 0.3;
const BEACON_FOG = 0.35;
const FADE_FROM = 60;
const FADE_TO = 140;

export const beaconPixels = (height: number): number => Math.min(MAX_PIXELS, BASE_PIXELS + Math.max(0, height - LANDMARK_HEIGHT) * PIXELS_PER_UNIT);

export class LandmarkBeacons {
  readonly points: Points;
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
  }

  update(focus: Vector3, pixelRatio: number): void {
    (this.material.uniforms['farFocus']!.value as Vector3).copy(focus);
    this.material.uniforms['pixelRatio']!.value = pixelRatio;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
