import { Color, DataTexture, MathUtils, NearestFilter, RGBAFormat, UnsignedByteType, Vector2, Vector3, Vector4, type Material, type Matrix4, type Texture } from 'three';

export const FIELD_LIGHT_LIMIT = 96;
const GRID_CELL = 2;
const GRID_CELLS = 64;
const CELL_TEXELS = 4;
export const FIELD_LIGHTS_PER_CELL = CELL_TEXELS * 4;
const EMPTY_SLOT = 255;
const LIT_KNEE = 0.5;
const LIT_CEILING = 0.85;
const SKY_MASK_TEXELS = 128;
const FACING_SHADE = 0.18;
const FOG_STEPS = 8;
const FOG_CEILING = 3;
const FOG_REACH = 12;
const FOG_THICKNESS = 1.5;
const FOG_OPACITY = 0.78;
const FOG_FALLOFF = 0.85;
const FOG_SCALE_XZ = 0.32;
const FOG_SCALE_Y = 0.7;
const FOG_WIND_X = 0.16;
const FOG_WIND_Z = 0.09;

export interface FieldLight {
  readonly position: Vector3;
  readonly color: Color;
  reach: number;
}

const gridData = new Uint8Array(GRID_CELLS * CELL_TEXELS * GRID_CELLS * 4).fill(EMPTY_SLOT);
const gridTexture = new DataTexture(gridData, GRID_CELLS * CELL_TEXELS, GRID_CELLS, RGBAFormat, UnsignedByteType);
gridTexture.magFilter = NearestFilter;
gridTexture.minFilter = NearestFilter;
gridTexture.generateMipmaps = false;
gridTexture.needsUpdate = true;

const uniforms = {
  fieldLightPositions: { value: Array.from({ length: FIELD_LIGHT_LIMIT }, () => new Vector4()) },
  fieldLightColors: { value: Array.from({ length: FIELD_LIGHT_LIMIT }, () => new Vector3()) },
  fieldLightGrid: { value: gridTexture },
  fieldLightGridOrigin: { value: new Vector2() },
  fieldLightGridEnabled: { value: 0 },
  fieldGroundFog: { value: 0 },
  fieldMistColor: { value: new Color() },
  fieldTime: { value: 0 },
  fieldWetness: { value: 0 },
  fieldSkyMask: { value: null as Texture | null },
  fieldSkyOrigin: { value: new Vector2() },
};

export interface FieldAtmosphere {
  readonly groundFog: number;
  readonly mistColor: Color;
  readonly wetness: number;
}

export function setFieldAtmosphere(atmosphere: FieldAtmosphere): void {
  uniforms.fieldGroundFog.value = atmosphere.groundFog;
  uniforms.fieldMistColor.value.copy(atmosphere.mistColor);
  uniforms.fieldWetness.value = atmosphere.wetness;
}

export function setFieldTime(time: number): void {
  uniforms.fieldTime.value = time;
}

export function setFieldSkyMask(texture: Texture, originX: number, originZ: number): void {
  uniforms.fieldSkyMask.value = texture;
  uniforms.fieldSkyOrigin.value.set(originX, originZ);
}

export const fieldLightFootprint = (light: FieldLight): number => light.reach;

export function buildFieldLightGrid(lights: readonly FieldLight[], centre: Vector3): void {
  const originX = Math.round(centre.x) - (GRID_CELLS * GRID_CELL) / 2;
  const originZ = Math.round(centre.z) - (GRID_CELLS * GRID_CELL) / 2;
  uniforms.fieldLightGridOrigin.value.set(originX, originZ);
  const candidates: { index: number; distance: number }[][] = Array.from({ length: GRID_CELLS * GRID_CELLS }, () => []);
  const count = Math.min(lights.length, FIELD_LIGHT_LIMIT);
  for (let index = 0; index < count; index++) {
    const light = lights[index]!;
    const footprint = fieldLightFootprint(light);
    if (footprint <= 0) continue;
    const minX = Math.max(0, Math.floor((light.position.x - footprint - originX) / GRID_CELL));
    const maxX = Math.min(GRID_CELLS - 1, Math.floor((light.position.x + footprint - originX) / GRID_CELL));
    const minZ = Math.max(0, Math.floor((light.position.z - footprint - originZ) / GRID_CELL));
    const maxZ = Math.min(GRID_CELLS - 1, Math.floor((light.position.z + footprint - originZ) / GRID_CELL));
    for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
      for (let cellX = minX; cellX <= maxX; cellX++) {
        const nearestX = MathUtils.clamp(light.position.x, originX + cellX * GRID_CELL, originX + (cellX + 1) * GRID_CELL);
        const nearestZ = MathUtils.clamp(light.position.z, originZ + cellZ * GRID_CELL, originZ + (cellZ + 1) * GRID_CELL);
        const distance = Math.hypot(nearestX - light.position.x, nearestZ - light.position.z);
        if (distance > footprint) continue;
        candidates[cellZ * GRID_CELLS + cellX]!.push({ index, distance });
      }
    }
  }
  gridData.fill(EMPTY_SLOT);
  candidates.forEach((cell, cellIndex) => {
    if (cell.length === 0) return;
    if (cell.length > FIELD_LIGHTS_PER_CELL) cell.sort((a, b) => a.distance - b.distance);
    const base = cellIndex * FIELD_LIGHTS_PER_CELL;
    cell.slice(0, FIELD_LIGHTS_PER_CELL).forEach(({ index }, slot) => {
      gridData[base + slot] = index;
    });
  });
  gridTexture.needsUpdate = true;
}

export function fieldLightsAt(x: number, z: number): number[] {
  const { x: originX, y: originZ } = uniforms.fieldLightGridOrigin.value;
  const cellX = Math.floor((x - originX) / GRID_CELL);
  const cellZ = Math.floor((z - originZ) / GRID_CELL);
  if (cellX < 0 || cellZ < 0 || cellX >= GRID_CELLS || cellZ >= GRID_CELLS) return [];
  const base = (cellZ * GRID_CELLS + cellX) * FIELD_LIGHTS_PER_CELL;
  return [...gridData.subarray(base, base + FIELD_LIGHTS_PER_CELL)].filter((slot) => slot !== EMPTY_SLOT);
}

export function setFieldLights(lights: readonly FieldLight[], viewMatrix: Matrix4): void {
  const count = Math.min(lights.length, FIELD_LIGHT_LIMIT);
  for (let index = 0; index < count; index++) {
    const light = lights[index]!;
    const position = uniforms.fieldLightPositions.value[index]!;
    position.set(light.position.x, light.position.y, light.position.z, 1).applyMatrix4(viewMatrix);
    position.w = light.reach;
    const color = uniforms.fieldLightColors.value[index]!;
    color.set(light.color.r, light.color.g, light.color.b);
  }
  uniforms.fieldLightGridEnabled.value = count > 0 ? 1 : 0;
}

export function clearFieldLights(): void {
  uniforms.fieldLightGridEnabled.value = 0;
}

export function receiveFieldLights<T extends Material>(material: T, actorFill = 0, wetSurface = true): T {
  const wetGate = wetSurface ? 'fieldWetness > 0.0 && vFieldNormal.y > 0.9' : 'false';
  const fill = actorFill > 0 ? `reflectedLight.indirectDiffuse += diffuseColor.rgb * ${actorFill.toFixed(3)} * ( 0.4 + 0.6 * max( dot( geometryNormal, geometryViewDir ), 0.0 ) );` : '';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFieldWorld;\nvarying vec3 vFieldNormal;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFieldWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvFieldNormal = normalize( mat3( modelMatrix ) * objectNormal );');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <lights_pars_begin>',
        `#include <lights_pars_begin>
#define FIELD_LIGHT_LIMIT ${FIELD_LIGHT_LIMIT}
#define FIELD_GRID_CELL ${GRID_CELL.toFixed(1)}
#define FIELD_GRID_CELLS ${GRID_CELLS}
#define FIELD_CELL_TEXELS ${CELL_TEXELS}
#define FIELD_FOG_STEPS ${FOG_STEPS}
#define FIELD_FOG_CEILING ${FOG_CEILING.toFixed(2)}
#define FIELD_FOG_REACH ${FOG_REACH.toFixed(2)}
#define FIELD_FOG_THICKNESS ${FOG_THICKNESS.toFixed(3)}
#define FIELD_FOG_OPACITY ${FOG_OPACITY.toFixed(3)}
uniform vec4 fieldLightPositions[ FIELD_LIGHT_LIMIT ];
uniform vec3 fieldLightColors[ FIELD_LIGHT_LIMIT ];
uniform sampler2D fieldLightGrid;
uniform vec2 fieldLightGridOrigin;
uniform int fieldLightGridEnabled;
uniform float fieldGroundFog;
uniform vec3 fieldMistColor;
uniform float fieldTime;
uniform float fieldWetness;
uniform sampler2D fieldSkyMask;
uniform vec2 fieldSkyOrigin;
varying vec3 vFieldWorld;
varying vec3 vFieldNormal;
float fieldHash( vec2 p ) {
	return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
}
float fieldNoise( vec2 p ) {
	vec2 i = floor( p );
	vec2 f = fract( p );
	vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( fieldHash( i ), fieldHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( fieldHash( i + vec2( 0.0, 1.0 ) ), fieldHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
float fieldHash3( vec3 p ) {
	p = fract( p * 0.1031 );
	p += dot( p, p.zyx + 31.32 );
	return fract( ( p.x + p.y ) * p.z );
}
float fieldNoise3( vec3 p ) {
	vec3 i = floor( p );
	vec3 f = fract( p );
	vec3 u = f * f * ( 3.0 - 2.0 * f );
	float a = mix( mix( fieldHash3( i ), fieldHash3( i + vec3( 1.0, 0.0, 0.0 ) ), u.x ), mix( fieldHash3( i + vec3( 0.0, 1.0, 0.0 ) ), fieldHash3( i + vec3( 1.0, 1.0, 0.0 ) ), u.x ), u.y );
	float b = mix( mix( fieldHash3( i + vec3( 0.0, 0.0, 1.0 ) ), fieldHash3( i + vec3( 1.0, 0.0, 1.0 ) ), u.x ), mix( fieldHash3( i + vec3( 0.0, 1.0, 1.0 ) ), fieldHash3( i + vec3( 1.0, 1.0, 1.0 ) ), u.x ), u.y );
	return mix( a, b, u.z );
}
float fieldFogDensity( vec3 p ) {
	float t = fieldTime;
	vec3 q = p * vec3( ${FOG_SCALE_XZ.toFixed(3)}, ${FOG_SCALE_Y.toFixed(3)}, ${FOG_SCALE_XZ.toFixed(3)} );
	q.xz += vec2( sin( q.z * 1.3 + t * 0.21 ), cos( q.x * 1.1 + t * 0.17 ) ) * 0.45;
	q += vec3( ${FOG_WIND_X.toFixed(3)}, -0.05, ${FOG_WIND_Z.toFixed(3)} ) * t;
	float body = fieldNoise3( q );
	float curl = fieldNoise3( q * 2.7 + vec3( -0.31, 0.12, 0.23 ) * t );
	float billow = smoothstep( 0.4, 0.78, body * 0.68 + curl * 0.32 );
	return exp( - ${FOG_FALLOFF.toFixed(3)} * max( p.y, 0.0 ) ) * ( 0.04 + 1.6 * billow * billow );
}
float fieldOpenSky( vec2 xz ) {
	ivec2 texel = ivec2( floor( xz + 0.5 ) - fieldSkyOrigin );
	if ( texel.x < 0 || texel.y < 0 || texel.x >= ${SKY_MASK_TEXELS} || texel.y >= ${SKY_MASK_TEXELS} ) return 0.0;
	return texelFetch( fieldSkyMask, texel, 0 ).r;
}`,
      )
      .replace(
        '#include <lights_fragment_begin>',
        `#include <lights_fragment_begin>
vec3 fieldScatter = vec3( 0.0 );
vec3 fieldSheen = vec3( 0.0 );
vec3 fieldAlong = normalize( geometryViewDir - geometryNormal * dot( geometryViewDir, geometryNormal ) + vec3( 1e-4 ) );
float fieldPuddle = step( vFieldWorld.y, 0.08 ) * smoothstep( 0.45, 0.75, fieldNoise( vFieldWorld.xz * 0.9 ) );
vec3 fieldWetNormal = normalize( geometryNormal + fieldAlong * ( fieldHash( floor( vFieldWorld.xz * 8.0 ) ) - 0.5 ) * mix( 0.2, 0.05, fieldPuddle ) );
ivec2 fieldCell = ivec2( floor( ( vFieldWorld.xz - fieldLightGridOrigin ) / FIELD_GRID_CELL ) );
if ( fieldLightGridEnabled == 1 && fieldCell.x >= 0 && fieldCell.y >= 0 && fieldCell.x < FIELD_GRID_CELLS && fieldCell.y < FIELD_GRID_CELLS ) {
	bool fieldDone = false;
	for ( int fieldTexel = 0; fieldTexel < FIELD_CELL_TEXELS; fieldTexel ++ ) {
		if ( fieldDone ) break;
		vec4 fieldSlots = texelFetch( fieldLightGrid, ivec2( fieldCell.x * FIELD_CELL_TEXELS + fieldTexel, fieldCell.y ), 0 );
		for ( int fieldLane = 0; fieldLane < 4; fieldLane ++ ) {
			int fieldIndex = int( fieldSlots[ fieldLane ] * 255.0 + 0.5 );
			if ( fieldIndex >= FIELD_LIGHT_LIMIT ) {
				fieldDone = true;
				break;
			}
			vec4 fieldLight = fieldLightPositions[ fieldIndex ];
			vec3 fieldVector = fieldLight.xyz - geometryPosition;
			float fieldDistance = length( fieldVector );
			if ( fieldDistance >= fieldLight.w ) continue;
			IncidentLight fieldIncident;
			fieldIncident.direction = fieldVector / fieldDistance;
			float fieldRatio = fieldDistance / fieldLight.w;
			float fieldFalloff = 1.0 - fieldRatio * fieldRatio;
			fieldIncident.color = fieldLightColors[ fieldIndex ] * ( fieldFalloff * fieldFalloff );
			fieldIncident.visible = true;
			fieldScatter += fieldIncident.color;
			if ( ${wetGate} ) fieldSheen += fieldIncident.color * pow( max( dot( fieldWetNormal, normalize( fieldIncident.direction + geometryViewDir ) ), 0.0 ), 36.0 );
			RE_Direct( fieldIncident, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
		}
	}
}`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
reflectedLight.indirectDiffuse *= 1.0 + ${FACING_SHADE.toFixed(2)} * dot( vFieldNormal, vec3( -0.38, 0.0, 0.92 ) );
${fill}
vec3 litRadiance = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
float litPeak = max( max( litRadiance.r, litRadiance.g ), litRadiance.b );
if ( litPeak > ${LIT_KNEE.toFixed(3)} ) {
	float litRange = ${(LIT_CEILING - LIT_KNEE).toFixed(3)};
	float litShoulder = ${LIT_KNEE.toFixed(3)} + litRange * ( 1.0 - exp( - ( litPeak - ${LIT_KNEE.toFixed(3)} ) / litRange ) );
	float litScale = litShoulder / litPeak;
	reflectedLight.directDiffuse *= litScale;
	reflectedLight.indirectDiffuse *= litScale;
}
if ( ${wetGate} ) {
	float fieldWet = fieldWetness * fieldOpenSky( vFieldWorld.xz );
	reflectedLight.directDiffuse *= 1.0 - ( 0.3 + 0.25 * fieldPuddle ) * fieldWet;
	reflectedLight.indirectDiffuse *= 1.0 - ( 0.3 + 0.25 * fieldPuddle ) * fieldWet;
	reflectedLight.directDiffuse += min( fieldSheen, vec3( 6.0 ) ) * 0.035 * fieldWet * mix( 0.22, 1.0, fieldPuddle );
}`,
      )
      .replace(
        '#include <fog_fragment>',
        `if ( fieldGroundFog > 0.0 && vFieldWorld.y < FIELD_FOG_CEILING ) {
	vec3 fogToEye = cameraPosition - vFieldWorld;
	float fogEyeDistance = length( fogToEye );
	vec3 fogEye = fogToEye / max( fogEyeDistance, 1e-4 );
	float fogSpan = min( min( fogEyeDistance, FIELD_FOG_REACH ), fogEye.y > 1e-3 ? ( FIELD_FOG_CEILING - vFieldWorld.y ) / fogEye.y : FIELD_FOG_REACH );
	float fogStep = fogSpan / float( FIELD_FOG_STEPS );
	float fogJitter = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
	float fogDepth = 0.0;
	for ( int fogIndex = 0; fogIndex < FIELD_FOG_STEPS; fogIndex ++ ) {
		fogDepth += fieldFogDensity( vFieldWorld + fogEye * fogStep * ( float( fogIndex ) + fogJitter ) );
	}
	float fieldLow = ( 1.0 - exp( - fogDepth * fogStep * fieldGroundFog * FIELD_FOG_THICKNESS ) ) * FIELD_FOG_OPACITY;
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fieldMistColor + fieldScatter * 0.012, fieldLow );
}
#include <fog_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `field-light-point-${FIELD_LIGHT_LIMIT}-${GRID_CELLS}-lit-${LIT_KNEE}-${LIT_CEILING}-atmosphere-${SKY_MASK_TEXELS}-facing-${FACING_SHADE}-actor-${actorFill}-volfog${FOG_STEPS}-${FOG_CEILING}-${FOG_THICKNESS}-${FOG_FALLOFF}-puddle3-wet-${wetSurface}`;
  return material;
}

export const fieldLightFade = (distance: number, edge: number): number => 1 - MathUtils.smoothstep(distance, edge * 0.8, edge);
