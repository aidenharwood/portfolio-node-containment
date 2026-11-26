import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from 'three';
import { KEY_LIGHT_OFFSET } from '../voxel/fieldLights.ts';
import { ARCH_SHAPE, type SkyLook } from './skyLook.ts';
import { SCENE_OF_DISPLAY } from './toneCurve.ts';

const SUN = new Vector3(...KEY_LIGHT_OFFSET).normalize();
const SUN_FLAT = new Vector2(SUN.x, SUN.z).normalize();
const SEGMENTS = { width: 48, height: 24 } as const;
const PANEL_ANGLE = 1 / 38;
const LIGHT_CELL = 0.006;
const SKY_ORDER = 1000;

const vec3 = (vector: Vector3): string => `vec3( ${vector.x.toFixed(5)}, ${vector.y.toFixed(5)}, ${vector.z.toFixed(5)} )`;

const VERTEX = `varying vec3 vSkyDirection;
void main() {
	vSkyDirection = position;
	vec4 clip = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
	gl_Position = clip.xyww;
}`;

const FRAGMENT = `uniform vec3 skyHorizon;
uniform vec3 skyZenith;
uniform vec3 skySun;
uniform vec3 skyCloudLit;
uniform vec3 skyCloudShade;
uniform vec3 skyArch;
uniform vec3 skyLights;
uniform vec3 skyShape;
uniform float skyTime;
uniform float skyExposure;
varying vec3 vSkyDirection;
${SCENE_OF_DISPLAY}
float skyHash( vec2 p ) {
	return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
}
float skyNoise( vec2 p ) {
	vec2 i = floor( p );
	vec2 f = fract( p );
	vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( skyHash( i ), skyHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( skyHash( i + vec2( 0.0, 1.0 ) ), skyHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
void main() {
	vec3 direction = normalize( vSkyDirection );
	float rise = max( direction.y, 0.0 );
	float elevation = asin( rise );
	vec3 color = mix( skyHorizon, skyZenith, 1.0 - exp( - elevation / skyShape.x ) );
	float facing = max( dot( direction, ${vec3(SUN)} ), 0.0 );
	float bearing = max( dot( normalize( direction.xz + vec2( 1e-5 ) ), vec2( ${SUN_FLAT.x.toFixed(5)}, ${SUN_FLAT.y.toFixed(5)} ) ), 0.0 );
	color += skySun * ( pow( facing, 12.0 ) * 0.6 + pow( bearing, 3.0 ) * exp( - elevation / 0.15 ) * 0.25 + smoothstep( 0.99945, 0.9997, facing ) * 2.0 );
	float across = asin( clamp( direction.x, -1.0, 1.0 ) );
	float offset = abs( across );
	float halfWidth = ${ARCH_SHAPE.base.toFixed(5)} + ${ARCH_SHAPE.spread.toFixed(5)} * rise;
	float body = 1.0 - smoothstep( halfWidth * 0.9, halfWidth, offset );
	float rim = smoothstep( halfWidth * 0.74, halfWidth * 0.84, offset ) * ( 1.0 - smoothstep( halfWidth * 0.84, halfWidth * 0.94, offset ) );
	float along = atan( direction.y, abs( direction.z ) + 1e-5 );
	float panel = fract( along / ${PANEL_ANGLE.toFixed(6)} );
	float seam = 1.0 - smoothstep( 0.0, 0.06, min( panel, 1.0 - panel ) );
	vec2 cell = vec2( along, across ) / ${LIGHT_CELL.toFixed(4)};
	float spark = step( 0.95, skyHash( floor( cell ) ) ) * ( 1.0 - smoothstep( 0.1, 0.3, length( fract( cell ) - 0.5 ) ) );
	float archHaze = smoothstep( 0.0, 0.04, elevation ) * skyShape.z;
	color = mix( color, skyArch * ( 1.0 - 0.18 * seam ) + skyLights * spark * 2.0, body * archHaze );
	color *= 1.0 - rim * 0.3 * archHaze;
	vec2 plane = direction.xz / ( rise + 0.1 );
	vec2 drift = skyTime * vec2( 0.004, 0.0025 );
	float billow = skyNoise( plane * 0.9 + drift ) * 0.65 + skyNoise( plane * 2.3 - drift * 1.7 ) * 0.35;
	float cover = smoothstep( 0.5, 0.78, billow ) * smoothstep( -0.01, 0.025, direction.y ) * ( 1.0 - smoothstep( 0.12, 0.3, elevation ) ) * skyShape.y;
	vec3 cloud = mix( mix( skyCloudShade, skyCloudLit, smoothstep( 0.55, 0.85, billow ) ), skyHorizon, 1.0 - smoothstep( 0.0, 0.06, elevation ) );
	color = mix( color, cloud, cover * 0.85 );
	gl_FragColor = vec4( sceneOfDisplay( color, skyExposure ), 1.0 );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`;

export class SkyDome {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  constructor() {
    this.material = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        skyHorizon: { value: new Color() },
        skyZenith: { value: new Color() },
        skySun: { value: new Color() },
        skyCloudLit: { value: new Color() },
        skyCloudShade: { value: new Color() },
        skyArch: { value: new Color() },
        skyLights: { value: new Color() },
        skyShape: { value: new Vector3(0.3, 0, 0) },
        skyTime: { value: 0 },
        skyExposure: { value: 1 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
    this.mesh = new Mesh(new SphereGeometry(1, SEGMENTS.width, SEGMENTS.height), this.material);
    this.mesh.name = 'skyDome';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = SKY_ORDER;
  }

  apply(look: SkyLook, exposure: number): void {
    const uniforms = this.material.uniforms;
    (uniforms['skyHorizon']!.value as Color).copy(look.horizon);
    (uniforms['skyZenith']!.value as Color).copy(look.zenith);
    (uniforms['skySun']!.value as Color).copy(look.sun);
    (uniforms['skyCloudLit']!.value as Color).copy(look.cloudLit);
    (uniforms['skyCloudShade']!.value as Color).copy(look.cloudShade);
    (uniforms['skyArch']!.value as Color).copy(look.arch);
    (uniforms['skyLights']!.value as Color).copy(look.lights);
    (uniforms['skyShape']!.value as Vector3).set(look.spread, look.clouds, look.archShow);
    uniforms['skyExposure']!.value = exposure;
  }

  setTime(time: number): void {
    this.material.uniforms['skyTime']!.value = time;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
