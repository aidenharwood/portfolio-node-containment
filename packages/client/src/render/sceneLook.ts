import { ACESFilmicToneMapping, Color, DirectionalLight, FogExp2, HalfFloatType, HemisphereLight, MathUtils, PCFSoftShadowMap, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget, type Camera, type Scene } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { assignLights, type LightAssignment } from './lightAssignment.ts';
import { buildFieldLightGrid, clearFieldLights, FIELD_LIGHT_LIMIT, fieldLightFade, setFieldAtmosphere, setFieldLights, setFieldTime, type FieldLight } from './voxel/fieldLights.ts';
import { lighten } from './voxel/palette.ts';
import type { BlendedAmbience } from './world/ambienceBlend.ts';
import { setBeamWeather } from './world/lightBeams.ts';
import type { LightSource } from './world/levelScene.ts';
import { pixelRatioFor, shadowMapSizeFor, type GameSettings, type RenderScale } from '../state/gameSettings.ts';

const LIGHT_INTENSITY_SCALE = 14;
const LIGHT_REACH = 1.4;
const AMBIENT_BASE = 2.9;
const AMBIENT_DARKNESS_WEIGHT = 2.3;
const AMBIENT_FLOOR = 1;
const AMBIENT_SKY_LIFT = 0.74;
const AMBIENT_GROUND_LIFT = 0.32;
const KEY_BASE = 1;
const KEY_DARKNESS_WEIGHT = 0.7;
const KEY_FLOOR = 0.33;
const LIGHT_REASSIGN_SECONDS = 0.25;
const FOG_DENSITY = 0.028;
const SURVEY_AMBIENT = 4.2;
const SURVEY_KEY = 1.4;
const SUN_COLOR = 0xfff1d6;
const SHADE_COLOR = 0xcfe8ff;
const SUN_BOOST = 1.6;
const SKY_BRIGHTNESS_GAIN = 1.2;
const DUSK_AMBIENT_CUT = 0.72;
const DUSK_KEY_CUT = 0.55;
const SKY_SUN_TINT = 0.8;
const DAYLIGHT_FOG_THINNING = 0.55;
const NO_LIGHTS: LightAssignment<LightSource> = { lights: [], edge: Infinity };
const FINISH_SHADER = {
  uniforms: { tDiffuse: { value: null }, texel: { value: new Vector2(1, 1) }, sharpen: { value: 0.15 }, time: { value: 0 } },
  vertexShader: `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,
  fragmentShader: `uniform sampler2D tDiffuse;
uniform vec2 texel;
uniform float sharpen;
uniform float time;
varying vec2 vUv;
float hash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
void main() {
  vec3 c = texture2D( tDiffuse, vUv ).rgb;
  vec3 n = texture2D( tDiffuse, vUv + vec2( texel.x, 0.0 ) ).rgb + texture2D( tDiffuse, vUv - vec2( texel.x, 0.0 ) ).rgb + texture2D( tDiffuse, vUv + vec2( 0.0, texel.y ) ).rgb + texture2D( tDiffuse, vUv - vec2( 0.0, texel.y ) ).rgb;
  c = max( c + ( c * 4.0 - n ) * sharpen, 0.0 );
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c = mix( vec3( l ), c, 1.12 );
  c = mix( c, c * c * ( 3.0 - 2.0 * c ), 0.22 );
  c += vec3( -0.010, 0.002, 0.014 ) * ( 1.0 - smoothstep( 0.0, 0.45, l ) );
  c += vec3( 0.018, 0.008, -0.012 ) * smoothstep( 0.55, 1.0, l );
  vec2 v = vUv - 0.5;
  c *= 1.0 - 0.3 * smoothstep( 0.35, 0.95, dot( v, v ) * 2.0 );
  float d = hash( gl_FragCoord.xy + fract( time ) * 61.0 ) + hash( gl_FragCoord.xy * 1.7 + 19.0 + fract( time ) * 37.0 ) - 1.0;
  gl_FragColor = vec4( c + d / 255.0, 1.0 );
}`,
};

const LIGHT_OFFSET = new Vector3(5, 12, 3);
const LIGHT_DIRECTION = LIGHT_OFFSET.clone().normalize();
const LIGHT_RIGHT = new Vector3().crossVectors(LIGHT_DIRECTION, new Vector3(0, 1, 0)).normalize();
const LIGHT_UP = new Vector3().crossVectors(LIGHT_RIGHT, LIGHT_DIRECTION).normalize();
const SHADOW_REACH_PER_DISTANCE = 0.9;
const SHADOW_REACH_MIN = 8;
const SHADOW_REACH_MAX = 20;
const SHADOW_REACH_STEP = 0.5;
const GROUND_FOG_PER_HAZE = 1.6;
const GROUND_FOG_PER_MIST = 0.18;
const GROUND_FOG_LIMIT = 0.6;
const MIST_GAIN = 1.7;
const MIST_WHITE = 0.04;
const DRIZZLE_WETNESS = 0.6;
const FLASH_AMBIENT = 2.2;
const FLASH_KEY = 1.5;
const FLASH_SKY = 0x8fa6c8;
const FLASH_SKY_MIX = 0.6;

export class SceneLook {
  readonly renderer: WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloom = new UnrealBloomPass(new Vector2(256, 256), 0.6, 0.55, 0.9);
  private renderScale: RenderScale = 'sharp';
  private readonly hemisphere = new HemisphereLight(0x9fc6d6, 0x05080a, 0.6);
  private readonly keyLight = new DirectionalLight(0xcfe8ff, 0.7);
  private readonly fog = new FogExp2(0x000000, FOG_DENSITY);
  private readonly background = new Color();
  private readonly sunColor = new Color();
  private assignedLights: LightAssignment<LightSource> = NO_LIGHTS;
  private readonly fieldLights: FieldLight[] = Array.from({ length: FIELD_LIGHT_LIMIT }, () => ({ position: new Vector3(), color: new Color(), reach: 0 }));
  private lightTimer = 0;
  private activeFieldLights = 0;
  private survey = false;
  private readonly fogDensity: number;
  private lastAmbience: BlendedAmbience | null = null;
  private readonly mistColor = new Color();
  private readonly snappedFocus = new Vector3();
  private readonly finish = new ShaderPass(FINISH_SHADER);
  private readonly flashColor = new Color(FLASH_SKY);
  private time = 0;
  flash = 0;

  constructor(canvas: HTMLCanvasElement, scene: Scene, camera: Camera, fogDensity = FOG_DENSITY) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -12;
    this.keyLight.shadow.camera.right = 12;
    this.keyLight.shadow.camera.top = 12;
    this.keyLight.shadow.camera.bottom = -12;
    this.keyLight.shadow.camera.far = 40;
    this.keyLight.shadow.bias = -0.0008;
    this.keyLight.shadow.normalBias = 0.02;
    this.fogDensity = fogDensity;
    this.fog.density = fogDensity;
    scene.fog = this.fog;
    scene.background = this.background;
    scene.add(this.hemisphere, this.keyLight, this.keyLight.target);

    this.composer = new EffectComposer(this.renderer, new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }));
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.finish);
    const highPass = this.bloom.materialHighPassFilter;
    highPass.fragmentShader = highPass.fragmentShader.replace('float v = luminance( texel.xyz );', 'float v = max( texel.r, max( texel.g, texel.b ) );');
    highPass.needsUpdate = true;
  }

  resize(width: number, height: number): void {
    const pixelRatio = pixelRatioFor(this.renderScale, window.devicePixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.applySamples(this.renderScale === 'performance' ? 0 : pixelRatio <= 1.25 ? 4 : 2);
    this.finish.uniforms.texel!.value.set(1 / Math.max(1, width * pixelRatio), 1 / Math.max(1, height * pixelRatio));
    this.finish.uniforms.sharpen!.value = pixelRatio < 1.5 ? 0.15 : 0;
    this.finish.enabled = this.renderScale !== 'performance';
  }

  private applySamples(samples: number): void {
    for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      if (target.samples === samples) continue;
      target.samples = samples;
      target.dispose();
    }
  }

  applyGraphics(settings: GameSettings): boolean {
    const scaleChanged = settings.renderScale !== this.renderScale;
    this.renderScale = settings.renderScale;
    this.bloom.enabled = settings.bloom;
    const mapSize = shadowMapSizeFor(settings.shadows);
    if (this.keyLight.shadow.mapSize.x !== mapSize) {
      this.keyLight.shadow.mapSize.set(mapSize, mapSize);
      this.keyLight.shadow.map?.dispose();
      this.keyLight.shadow.map = null;
    }
    this.keyLight.castShadow = settings.shadows !== 'off';
    return scaleChanged;
  }

  setSurvey(on: boolean): void {
    this.survey = on;
    this.fog.density = on ? 0 : this.fogDensity;
    if (this.lastAmbience) this.applyAmbience(this.lastAmbience);
  }

  applyAmbience(ambience: BlendedAmbience): void {
    this.lastAmbience = ambience;
    this.fog.color.copy(ambience.fog);
    this.background.copy(ambience.fog).multiplyScalar(0.55).lerp(ambience.sky, ambience.daylight);
    const tint = ambience.tint.getHex();
    this.hemisphere.color.setHex(lighten(tint, AMBIENT_SKY_LIFT));
    this.hemisphere.groundColor.setHex(lighten(tint, AMBIENT_GROUND_LIFT));
    const skyBrightness = Math.min(1, Math.max(ambience.sky.r, ambience.sky.g, ambience.sky.b) * SKY_BRIGHTNESS_GAIN);
    const dusk = ambience.daylight * (1 - skyBrightness);
    this.hemisphere.intensity = Math.max(AMBIENT_FLOOR, AMBIENT_BASE - ambience.darkness * AMBIENT_DARKNESS_WEIGHT) * (1 - dusk * DUSK_AMBIENT_CUT);
    this.keyLight.intensity = Math.max(KEY_FLOOR, KEY_BASE - ambience.darkness * KEY_DARKNESS_WEIGHT) * (1 + ambience.daylight * SUN_BOOST * skyBrightness) * (1 - dusk * DUSK_KEY_CUT);
    this.sunColor.setHex(SUN_COLOR).lerp(ambience.sky, SKY_SUN_TINT * (1 - skyBrightness));
    this.keyLight.color.setHex(SHADE_COLOR).lerp(this.sunColor, ambience.daylight);
    if (!this.survey) this.fog.density = this.fogDensity * ambience.haze * (1 - ambience.daylight * skyBrightness * DAYLIGHT_FOG_THINNING);
    const groundFog = this.survey ? 0 : Math.min(GROUND_FOG_LIMIT, Math.max(0, (ambience.haze - 1) * GROUND_FOG_PER_HAZE + ambience.weather.mist * GROUND_FOG_PER_MIST));
    this.mistColor.copy(ambience.fog).multiplyScalar(MIST_GAIN).lerp(this.flashColor.setRGB(1, 1, 1), MIST_WHITE);
    setBeamWeather(this.survey ? 0 : ambience.haze, ambience.weather.mist, ambience.weather.rain);
    setFieldAtmosphere({ groundFog, mistColor: this.mistColor, wetness: ambience.weather.rain + DRIZZLE_WETNESS * ambience.weather.drizzle });
    if (this.flash > 0 && !this.survey) {
      this.hemisphere.intensity += this.flash * FLASH_AMBIENT;
      this.keyLight.intensity += this.flash * FLASH_KEY;
      this.background.lerp(this.flashColor.setHex(FLASH_SKY), this.flash * FLASH_SKY_MIX);
    }
    if (this.survey) {
      this.hemisphere.intensity = SURVEY_AMBIENT;
      this.keyLight.intensity = SURVEY_KEY;
    }
  }

  aimKeyLight(focus: Vector3, distance: number): void {
    const half = MathUtils.clamp(distance * SHADOW_REACH_PER_DISTANCE, SHADOW_REACH_MIN, SHADOW_REACH_MAX);
    const shadow = this.keyLight.shadow.camera;
    if (Math.abs(shadow.right - half) > SHADOW_REACH_STEP) {
      shadow.left = -half;
      shadow.right = half;
      shadow.top = half;
      shadow.bottom = -half;
      shadow.updateProjectionMatrix();
    }
    const texel = (shadow.right - shadow.left) / this.keyLight.shadow.mapSize.x;
    const along = Math.round(focus.dot(LIGHT_RIGHT) / texel) * texel;
    const across = Math.round(focus.dot(LIGHT_UP) / texel) * texel;
    const depth = focus.dot(LIGHT_DIRECTION);
    this.snappedFocus.copy(LIGHT_RIGHT).multiplyScalar(along).addScaledVector(LIGHT_UP, across).addScaledVector(LIGHT_DIRECTION, depth);
    this.keyLight.position.copy(this.snappedFocus).addScaledVector(LIGHT_OFFSET, 1);
    this.keyLight.target.position.copy(this.snappedFocus);
  }

  resetLights(): void {
    this.assignedLights = NO_LIGHTS;
    this.lightTimer = 0;
  }

  updateLights(sources: readonly LightSource[], delta: number, time: number, focus: Vector3): void {
    this.lightTimer -= delta;
    const reassigned = this.lightTimer <= 0;
    if (reassigned) {
      this.lightTimer = LIGHT_REASSIGN_SECONDS;
      this.assignedLights = assignLights(sources, focus, FIELD_LIGHT_LIMIT);
    }
    const { lights: field, edge } = this.assignedLights;
    const strength = (source: LightSource) => {
      const flicker = source.flicker ? 0.78 + 0.22 * (Math.sin(time * 7.3 + source.seed) * 0.5 + Math.sin(time * 17.1 + source.seed * 3) * 0.5) : 1;
      return source.intensity * LIGHT_INTENSITY_SCALE * flicker * fieldLightFade(Math.sqrt(source.position.distanceToSquared(focus)), edge);
    };
    this.activeFieldLights = field.length;
    field.forEach((source, index) => {
      const target = this.fieldLights[index]!;
      target.position.copy(source.position);
      target.color.setHex(source.color).multiplyScalar(strength(source));
      target.reach = source.radius * LIGHT_REACH;
    });
    if (reassigned) buildFieldLightGrid(this.fieldLights.slice(0, field.length), focus);
  }

  render(camera: Camera, delta: number): void {
    this.time += delta;
    this.finish.uniforms.time!.value = this.time;
    setFieldTime(this.time);
    camera.updateMatrixWorld();
    setFieldLights(this.fieldLights.slice(0, this.activeFieldLights), camera.matrixWorldInverse);
    this.composer.render(delta);
    clearFieldLights();
  }

  renderPlain(scene: Scene, camera: Camera): void {
    this.renderer.render(scene, camera);
  }

  dispose(): void {
    this.composer.dispose();
    this.renderer.dispose();
  }
}
