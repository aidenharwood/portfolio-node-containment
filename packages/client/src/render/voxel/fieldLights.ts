import { Color, MathUtils, Vector3, Vector4, type Material, type Matrix4 } from 'three';

export const FIELD_LIGHT_LIMIT = 96;
export const LIGHT_CONE_ANGLE = MathUtils.degToRad(55);
export const LIGHT_PENUMBRA = 0.7;
const CONE_COS = Math.cos(LIGHT_CONE_ANGLE).toFixed(6);
const PENUMBRA_COS = Math.cos(LIGHT_CONE_ANGLE * (1 - LIGHT_PENUMBRA)).toFixed(6);

export interface FieldLight {
  readonly position: Vector3;
  readonly color: Color;
  reach: number;
}

const uniforms = {
  fieldLightCount: { value: 0 },
  fieldLightPositions: { value: Array.from({ length: FIELD_LIGHT_LIMIT }, () => new Vector4()) },
  fieldLightColors: { value: Array.from({ length: FIELD_LIGHT_LIMIT }, () => new Vector3()) },
  fieldLightUp: { value: new Vector3(0, 1, 0) },
};

const worldUp = new Vector3();

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
  uniforms.fieldLightCount.value = count;
  uniforms.fieldLightUp.value.copy(worldUp.set(0, 1, 0).transformDirection(viewMatrix));
}

export function clearFieldLights(): void {
  uniforms.fieldLightCount.value = 0;
}

export function receiveFieldLights<T extends Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <lights_pars_begin>',
        `#include <lights_pars_begin>
#define FIELD_LIGHT_LIMIT ${FIELD_LIGHT_LIMIT}
uniform int fieldLightCount;
uniform vec4 fieldLightPositions[ FIELD_LIGHT_LIMIT ];
uniform vec3 fieldLightColors[ FIELD_LIGHT_LIMIT ];
uniform vec3 fieldLightUp;`,
      )
      .replace(
        '#include <lights_fragment_begin>',
        `#include <lights_fragment_begin>
for ( int fieldIndex = 0; fieldIndex < FIELD_LIGHT_LIMIT; fieldIndex ++ ) {
	if ( fieldIndex >= fieldLightCount ) break;
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
}`,
      );
  };
  material.customProgramCacheKey = () => `field-lights-${FIELD_LIGHT_LIMIT}`;
  return material;
}

export const fieldLightFade = (distance: number, edge: number): number => 1 - MathUtils.smoothstep(distance, edge * 0.8, edge);
