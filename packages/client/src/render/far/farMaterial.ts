import { CHUNK_SIZE } from '@containment/shared';
import { Color, DataTexture, NearestFilter, RedFormat, ShaderMaterial, UnsignedByteType, Vector2, Vector3 } from 'three';
import { AIR_PARS, airUniforms } from '../sky/air.ts';
import { KEY_LIGHT_OFFSET } from '../voxel/fieldLights.ts';
import { TILE_RESOLUTION } from '../world/worldScale.ts';
import { FACADE_GLSL } from './facadePattern.ts';

export const FAR_MOODS = 32;
const FACING_SHADE = 0.18;
const LIT_KNEE = 0.5;
const LIT_CEILING = 0.85;
const EMISSIVE_GAIN = 1.15;
const EMISSIVE_CHROMA_GAIN = 1.5;
const EMISSIVE_FOG = 0.35;
const KEY_DIRECTION = new Vector3(...KEY_LIGHT_OFFSET).normalize();
const KEY_FACING = new Vector2(KEY_LIGHT_OFFSET[0], KEY_LIGHT_OFFSET[2]).normalize();

export interface ChunkMask {
  readonly texture: DataTexture;
  readonly origin: Vector2;
  readonly size: Vector2;
}

export function createChunkMask(minX: number, minY: number, width: number, height: number): ChunkMask {
  const texture = new DataTexture(new Uint8Array(Math.max(1, width * height)), Math.max(1, width), Math.max(1, height), RedFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return { texture, origin: new Vector2(minX, minY), size: new Vector2(width, height) };
}

export const MASK_PARS = `uniform sampler2D farMask;
uniform vec2 farMaskOrigin;
uniform vec2 farMaskSize;
bool farMasked( vec2 chunk ) {
	vec2 texel = chunk - farMaskOrigin;
	if ( texel.x < 0.0 || texel.y < 0.0 || texel.x >= farMaskSize.x || texel.y >= farMaskSize.y ) return false;
	return texelFetch( farMask, ivec2( texel ), 0 ).r > 0.5;
}`;

export { AIR_PARS };

export const KNEE_PARS = `vec3 farKnee( vec3 lit ) {
	float peak = max( max( lit.r, lit.g ), lit.b );
	if ( peak <= ${LIT_KNEE.toFixed(3)} ) return lit;
	float range = ${(LIT_CEILING - LIT_KNEE).toFixed(3)};
	return lit * ( ${LIT_KNEE.toFixed(3)} + range * ( 1.0 - exp( - ( peak - ${LIT_KNEE.toFixed(3)} ) / range ) ) ) / peak;
}`;

export const EMISSIVE_PARS = `vec3 farEmissive( vec3 glow ) {
	glow *= ${EMISSIVE_GAIN.toFixed(3)};
	float peak = max( max( glow.r, glow.g ), glow.b );
	float chroma = peak > 0.0 ? 1.0 - min( min( glow.r, glow.g ), glow.b ) / peak : 0.0;
	return glow * ( 1.0 + ${(EMISSIVE_CHROMA_GAIN / EMISSIVE_GAIN).toFixed(4)} * chroma * chroma );
}
const float FAR_EMISSIVE_FOG = ${EMISSIVE_FOG.toFixed(3)};`;

const LIGHT_PARS = `uniform vec3 nearSky;
uniform vec3 nearGround;
uniform vec3 nearKey;
uniform vec2 moodRange;
vec3 farRadiance( vec3 normal, vec3 sky, vec3 ground, vec3 key ) {
	vec3 hemi = mix( ground, sky, 0.5 * normal.y + 0.5 ) * ( 1.0 + ${FACING_SHADE.toFixed(2)} * dot( normal.xz, vec2( ${KEY_FACING.x.toFixed(4)}, ${KEY_FACING.y.toFixed(4)} ) ) );
	return ( hemi + key * max( dot( normal, vec3( ${KEY_DIRECTION.x.toFixed(4)}, ${KEY_DIRECTION.y.toFixed(4)}, ${KEY_DIRECTION.z.toFixed(4)} ) ), 0.0 ) ) * RECIPROCAL_PI;
}
${KNEE_PARS}`;

const sharedUniforms = (mask: ChunkMask) => ({
  farMask: { value: mask.texture },
  farMaskOrigin: { value: mask.origin },
  farMaskSize: { value: mask.size },
  farFocus: { value: new Vector3() },
  ...airUniforms,
  nearSky: { value: new Color() },
  nearGround: { value: new Color() },
  nearKey: { value: new Color() },
  moodRange: { value: new Vector2(160, 320) },
});

export type FarUniforms = ReturnType<typeof sharedUniforms>;

export function farTerrainMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexColors: true,
    uniforms: {
      moodSky: { value: Array.from({ length: FAR_MOODS }, () => new Color()) },
      moodGround: { value: Array.from({ length: FAR_MOODS }, () => new Color()) },
      moodKey: { value: Array.from({ length: FAR_MOODS }, () => new Color()) },
    },
    vertexShader: `#include <common>
attribute float mood;
attribute vec2 chunk;
attribute vec4 facade;
uniform vec3 moodSky[ ${FAR_MOODS} ];
uniform vec3 moodGround[ ${FAR_MOODS} ];
uniform vec3 moodKey[ ${FAR_MOODS} ];
${MASK_PARS}
${LIGHT_PARS}
uniform vec3 farFocus;
varying vec3 vFarLit;
varying vec3 vFarRadiance;
varying vec3 vFarNormal;
varying vec4 vFarFacade;
varying vec3 vFarWorld;
varying float vFarDepth;
void main() {
	vec4 world = modelMatrix * vec4( position, 1.0 );
	vec4 view = viewMatrix * world;
	vFarWorld = world.xyz;
	vFarDepth = - view.z;
	gl_Position = farMasked( chunk ) ? vec4( 0.0, 0.0, 2.0, 1.0 ) : projectionMatrix * view;
	int index = int( mood + 0.5 );
	float away = smoothstep( moodRange.x, moodRange.y, distance( world.xz, farFocus.xz ) );
	vec3 radiance = farRadiance( normalize( normal ), mix( nearSky, moodSky[ index ], away ), mix( nearGround, moodGround[ index ], away ), mix( nearKey, moodKey[ index ], away ) );
	vFarLit = farKnee( color * radiance );
	vFarRadiance = radiance;
	vFarNormal = normal;
	vFarFacade = facade;
}`,
    fragmentShader: `${AIR_PARS}
${KNEE_PARS}
${EMISSIVE_PARS}
${FACADE_GLSL}
varying vec3 vFarLit;
varying vec3 vFarRadiance;
varying vec3 vFarNormal;
varying vec4 vFarFacade;
varying vec3 vFarWorld;
varying float vFarDepth;
void main() {
	vec3 color = airApply( vFarLit, vFarDepth, 1.0 );
	if ( vFarFacade.x > 0.5 ) {
		float blur = ${TILE_RESOLUTION.toFixed(1)} * max( max( fwidth( vFarWorld.x ), fwidth( vFarWorld.z ) ), fwidth( vFarWorld.y ) );
		FacadeLook look = facadeLook( int( vFarFacade.x + 0.5 ), vFarWorld, normalize( vFarNormal ), vFarFacade.y, vFarFacade.z, blur );
		color = mix( airApply( farKnee( look.body * vFarRadiance ), vFarDepth, 1.0 ), airApply( farEmissive( look.glow ), vFarDepth, FAR_EMISSIVE_FOG ), look.cover );
	}
	gl_FragColor = vec4( color, 1.0 );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,
  });
}

export function shareFarUniforms<T extends ShaderMaterial>(material: T, shared: FarUniforms): T {
  Object.assign(material.uniforms, shared);
  return material;
}

export const createFarUniforms = sharedUniforms;
