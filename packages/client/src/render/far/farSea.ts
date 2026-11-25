import { CHUNK_SIZE } from '@containment/shared';
import { Color, Mesh, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, type Vector3 } from 'three';
import { KEY_LIGHT_OFFSET } from '../voxel/fieldLights.ts';
import { WATER_PALETTE } from '../world/liquidSurface.ts';
import { AIR_PARS, MASK_PARS, shareFarUniforms, type FarUniforms } from './farMaterial.ts';
import { FAR_WATER } from './farPalette.ts';
import { FAR_SINK } from './farTerrainMesher.ts';

export const FAR_SEA_LEVEL = WATER_PALETTE.level - FAR_SINK - 0.15;
const KEY_UP = KEY_LIGHT_OFFSET[1] / Math.hypot(...KEY_LIGHT_OFFSET);
const LIT_KNEE = 0.5;
const LIT_CEILING = 0.85;

function farSeaMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
    uniforms: UniformsUtils.merge([UniformsLib.fog, { seaColor: { value: new Color() } }]),
    vertexShader: `varying vec3 vFarWorld;
varying float vFarDepth;
void main() {
	vec4 world = modelMatrix * vec4( position, 1.0 );
	vec4 view = viewMatrix * world;
	vFarWorld = world.xyz;
	vFarDepth = - view.z;
	gl_Position = projectionMatrix * view;
}`,
    fragmentShader: `${MASK_PARS}
${AIR_PARS}
uniform vec3 seaColor;
varying vec3 vFarWorld;
varying float vFarDepth;
void main() {
	if ( farMasked( floor( ( vFarWorld.xz + 0.5 ) / ${CHUNK_SIZE.toFixed(1)} ) ) ) discard;
	gl_FragColor = vec4( farAir( seaColor, vFarWorld, vFarDepth ), 1.0 );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,
  });
}

export function seaRadiance(sky: Color, key: Color, into: Color): Color {
  into.setRGB(FAR_WATER[0], FAR_WATER[1], FAR_WATER[2]);
  const red = (sky.r + key.r * KEY_UP) / Math.PI;
  const green = (sky.g + key.g * KEY_UP) / Math.PI;
  const blue = (sky.b + key.b * KEY_UP) / Math.PI;
  into.setRGB(into.r * red, into.g * green, into.b * blue);
  const peak = Math.max(into.r, into.g, into.b);
  if (peak > LIT_KNEE) {
    const range = LIT_CEILING - LIT_KNEE;
    into.multiplyScalar((LIT_KNEE + range * (1 - Math.exp(-(peak - LIT_KNEE) / range))) / peak);
  }
  return into;
}

export class FarSea {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly uniforms: FarUniforms;

  constructor(uniforms: FarUniforms) {
    this.uniforms = uniforms;
    this.material = shareFarUniforms(farSeaMaterial(), uniforms);
    this.mesh = new Mesh(new PlaneGeometry(2, 2).rotateX(-Math.PI / 2), this.material);
    this.mesh.name = 'farSea';
    this.mesh.frustumCulled = false;
  }

  update(camera: Vector3, reach: number): void {
    this.mesh.position.set(camera.x, FAR_SEA_LEVEL, camera.z);
    this.mesh.scale.set(reach, 1, reach);
    seaRadiance(this.uniforms.nearSky.value, this.uniforms.nearKey.value, this.material.uniforms['seaColor']!.value as Color);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
