import { AdditiveBlending, Color, ConeGeometry, DoubleSide, Mesh, ShaderMaterial, type Vector3 } from 'three';

const BEAM_BASE = 0.1;
const BEAM_WEATHER = 0.3;

export const BEAM_GEOMETRY = new ConeGeometry(1, 1, 18, 1, true).translate(0, -0.5, 0);

const opacity = { value: BEAM_BASE };

const BEAM_VERTEX = `
varying vec3 vBeamNormal;
varying vec3 vBeamView;
varying float vBeamDepth;
void main() {
  vec4 viewPosition = modelViewMatrix * vec4( position, 1.0 );
  vBeamNormal = normalize( normalMatrix * normal );
  vBeamView = normalize( - viewPosition.xyz );
  vBeamDepth = - position.y;
  gl_Position = projectionMatrix * viewPosition;
}`;

const BEAM_FRAGMENT = `
uniform vec3 beamColor;
uniform float beamOpacity;
varying vec3 vBeamNormal;
varying vec3 vBeamView;
varying float vBeamDepth;
void main() {
  float facing = pow( abs( dot( normalize( vBeamNormal ), normalize( vBeamView ) ) ), 1.5 );
  float depth = clamp( vBeamDepth, 0.0, 1.0 );
  float fall = ( 1.0 - 0.6 * depth ) * ( 1.0 - smoothstep( 0.6, 1.0, depth ) );
  gl_FragColor = vec4( beamColor, beamOpacity * facing * fall );
}`;

const materials = new Map<number, ShaderMaterial>();

function beamMaterial(color: number): ShaderMaterial {
  const existing = materials.get(color);
  if (existing) return existing;
  const material = new ShaderMaterial({
    uniforms: { beamColor: { value: new Color(color) }, beamOpacity: opacity },
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  materials.set(color, material);
  return material;
}

export function createLightBeam(position: Vector3, color: number, spread: number): Mesh {
  const beam = new Mesh(BEAM_GEOMETRY, beamMaterial(color));
  beam.position.copy(position);
  beam.scale.set(spread, Math.max(0.5, position.y), spread);
  beam.renderOrder = 2;
  return beam;
}

export function setBeamWeather(haze: number, mist: number, rain: number): void {
  opacity.value = BEAM_BASE + BEAM_WEATHER * Math.min(1, Math.max(0, haze - 1 + 0.5 * mist + 0.3 * rain));
}
