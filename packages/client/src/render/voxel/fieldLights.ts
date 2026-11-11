import { Color, DataTexture, MathUtils, NearestFilter, RGBAFormat, UnsignedByteType, Vector2, Vector3, Vector4, type Material, type Matrix4 } from 'three';

export const FIELD_LIGHT_LIMIT = 96;
export const LIGHT_CONE_ANGLE = MathUtils.degToRad(55);
export const LIGHT_PENUMBRA = 0.7;
const CONE_COS = Math.cos(LIGHT_CONE_ANGLE).toFixed(6);
const PENUMBRA_COS = Math.cos(LIGHT_CONE_ANGLE * (1 - LIGHT_PENUMBRA)).toFixed(6);
const CONE_SPREAD = Math.tan(LIGHT_CONE_ANGLE);
const GRID_CELL = 2;
const GRID_CELLS = 64;
const CELL_TEXELS = 4;
export const FIELD_LIGHTS_PER_CELL = CELL_TEXELS * 4;
const EMPTY_SLOT = 255;

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
  fieldLightUp: { value: new Vector3(0, 1, 0) },
  fieldLightGrid: { value: gridTexture },
  fieldLightGridOrigin: { value: new Vector2() },
  fieldLightGridEnabled: { value: 0 },
};

const worldUp = new Vector3();

export const fieldLightFootprint = (light: FieldLight): number => Math.min(light.reach, Math.max(0, light.position.y) * CONE_SPREAD);

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
  uniforms.fieldLightUp.value.copy(worldUp.set(0, 1, 0).transformDirection(viewMatrix));
}

export function clearFieldLights(): void {
  uniforms.fieldLightGridEnabled.value = 0;
}

export function receiveFieldLights<T extends Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFieldWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFieldWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <lights_pars_begin>',
        `#include <lights_pars_begin>
#define FIELD_LIGHT_LIMIT ${FIELD_LIGHT_LIMIT}
#define FIELD_GRID_CELL ${GRID_CELL.toFixed(1)}
#define FIELD_GRID_CELLS ${GRID_CELLS}
#define FIELD_CELL_TEXELS ${CELL_TEXELS}
uniform vec4 fieldLightPositions[ FIELD_LIGHT_LIMIT ];
uniform vec3 fieldLightColors[ FIELD_LIGHT_LIMIT ];
uniform vec3 fieldLightUp;
uniform sampler2D fieldLightGrid;
uniform vec2 fieldLightGridOrigin;
uniform int fieldLightGridEnabled;
varying vec2 vFieldWorld;`,
      )
      .replace(
        '#include <lights_fragment_begin>',
        `#include <lights_fragment_begin>
ivec2 fieldCell = ivec2( floor( ( vFieldWorld - fieldLightGridOrigin ) / FIELD_GRID_CELL ) );
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
			float fieldSpot = getSpotAttenuation( ${CONE_COS}, ${PENUMBRA_COS}, dot( fieldIncident.direction, fieldLightUp ) );
			if ( fieldSpot <= 0.0 ) continue;
			fieldIncident.color = fieldLightColors[ fieldIndex ] * fieldSpot * getDistanceAttenuation( fieldDistance, fieldLight.w, 0.0 );
			fieldIncident.visible = true;
			RE_Direct( fieldIncident, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
		}
	}
}`,
      );
  };
  material.customProgramCacheKey = () => `field-light-grid-${FIELD_LIGHT_LIMIT}-${GRID_CELLS}`;
  return material;
}

export const fieldLightFade = (distance: number, edge: number): number => 1 - MathUtils.smoothstep(distance, edge * 0.8, edge);
