import { ACESFilmicToneMapping, Color, CustomBlending, DirectionalLight, FogExp2, HalfFloatType, HemisphereLight, LinearSRGBColorSpace, MathUtils, OneFactor, PCFSoftShadowMap, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget, ZeroFactor, type Camera, type Scene } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { assignLights, type LightAssignment } from './lightAssignment.ts';
import { buildFieldLightGrid, clearFieldLights, FIELD_LIGHT_LIMIT, fieldLightFade, KEY_LIGHT_OFFSET, setFieldAtmosphere, setFieldLights, setFieldTime, type FieldLight } from './voxel/fieldLights.ts';
import { lighten } from './voxel/palette.ts';
import { SkyDome } from './sky/skyDome.ts';
import { createSkyLook, skyLookFor } from './sky/skyLook.ts';
import { airShapeFor, createAirShape, setAir, setAirFocus } from './sky/air.ts';
import { sceneColorOf } from './sky/toneCurve.ts';
import type { BlendedAmbience } from './world/ambienceBlend.ts';
import { setBeamWeather } from './world/lightBeams.ts';
import type { LightSource } from './world/levelScene.ts';
import { DEFAULT_SETTINGS, glowStrengthFor, lightLimitFor, pixelRatioFor, samplesFor, shadowMapSizeFor, type GameSettings } from '../state/gameSettings.ts';

const LIGHT_INTENSITY_SCALE = 14;
const LIGHT_REACH = 1.4;
const AMBIENT_BASE = 2.9;
const AMBIENT_DARKNESS_WEIGHT = 2.3;
const AMBIENT_FLOOR = 0.6;
const AMBIENT_SKY_LIFT = 0.74;
const AMBIENT_SKY_LIFT_PER_DARKNESS = 0.3;
const AMBIENT_GROUND_LIFT = 0.32;
const NIGHT_FILL_CUT = 0.23;
const NIGHT_KEY_CUT = 0.25;
const NIGHT_MIST_CUT = 0.45;
const NIGHT_HOT_CORE = 0.75;
const HOT_FROM = 1.3;
const HOT_TO = 2.6;
const KEY_BASE = 1;
const KEY_DARKNESS_WEIGHT = 0.7;
const KEY_FLOOR = 0.35;
const LIGHT_REASSIGN_SECONDS = 0.25;
const BASE_EXPOSURE = 1.4;
const SHARPEN_AMOUNT = 0.15;
const SHARPEN_MAX_PIXEL_RATIO = 1.5;
const LEGACY_FOG_SHARE = 0.5;
const SURVEY_AMBIENT = 4.2;
const SURVEY_KEY = 1.4;
const SUN_COLOR = 0xf6f2ff;
const SHADE_COLOR = 0xcfe8ff;
const SUN_BOOST = 1.6;
const SKY_BRIGHTNESS_GAIN = 1.2;
const DUSK_AMBIENT_CUT = 0.72;
const DUSK_KEY_CUT = 0.55;
const SKY_SUN_TINT = 0.4;
const LUMINANCE = { r: 0.2126, g: 0.7152, b: 0.0722 } as const;
const NIGHT_FROM = 0.3;
const NIGHT_TO = 0.5;
const GRADE_SATURATION = 0.12;
const DAYLIGHT_SATURATION_CUT = 0.5;
const GRADE_CURVE = 0.22;
const NIGHT_TOE = 0.025;
const DAY_VIGNETTE = 0.3;
const NIGHT_VIGNETTE = 0.18;
const NO_LIGHTS: LightAssignment<LightSource> = { lights: [], edge: Infinity };
const FINISH_SHADER = {
  uniforms: { tDiffuse: { value: null }, texel: { value: new Vector2(1, 1) }, sharpen: { value: 0.15 }, grade: { value: 1 }, saturation: { value: 1 + GRADE_SATURATION }, curve: { value: GRADE_CURVE }, toe: { value: 0 }, vignette: { value: DAY_VIGNETTE }, grain: { value: 1 }, time: { value: 0 } },
  vertexShader: `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,
  fragmentShader: `uniform sampler2D tDiffuse;
uniform vec2 texel;
uniform float sharpen;
uniform float grade;
uniform float saturation;
uniform float curve;
uniform float toe;
uniform float vignette;
uniform float grain;
uniform float time;
varying vec2 vUv;
float hash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
void main() {
  vec3 c = texture2D( tDiffuse, vUv ).rgb;
  vec3 n = texture2D( tDiffuse, vUv + vec2( texel.x, 0.0 ) ).rgb + texture2D( tDiffuse, vUv - vec2( texel.x, 0.0 ) ).rgb + texture2D( tDiffuse, vUv + vec2( 0.0, texel.y ) ).rgb + texture2D( tDiffuse, vUv - vec2( 0.0, texel.y ) ).rgb;
  c = max( c + ( c * 4.0 - n ) * sharpen, 0.0 );
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  vec3 g = mix( vec3( l ), c, saturation );
  g = mix( g, g * g * ( 3.0 - 2.0 * g ), curve );
  g += vec3( -0.012, 0.004, 0.014 ) * ( 1.0 - smoothstep( 0.0, 0.45, l ) );
  g += vec3( 0.012, -0.004, 0.010 ) * smoothstep( 0.55, 1.0, l );
  g += toe * ( 1.0 - smoothstep( 0.0, 0.5, l ) );
  c = mix( c, g, grade );
  vec2 v = vUv - 0.5;
  c *= 1.0 - vignette * smoothstep( 0.35, 0.95, dot( v, v ) * 2.0 );
  float d = hash( gl_FragCoord.xy + fract( time ) * 61.0 ) + hash( gl_FragCoord.xy * 1.7 + 19.0 + fract( time ) * 37.0 ) - 1.0;
  gl_FragColor = vec4( c + d * mix( 0.5, 1.0, grain ) / 255.0, 1.0 );
}`,
};

const LIGHT_DIRECTION = new Vector3(...KEY_LIGHT_OFFSET).normalize();
const LIGHT_RIGHT = new Vector3().crossVectors(LIGHT_DIRECTION, new Vector3(0, 1, 0)).normalize();
const LIGHT_UP = new Vector3().crossVectors(LIGHT_RIGHT, LIGHT_DIRECTION).normalize();
const SHADOW_REACH_PER_DISTANCE = 0.9;
const SHADOW_REACH_MIN = 8;
const SHADOW_REACH_MAX = 20;
const SHADOW_REACH_STEP = 0.5;
const LIGHT_SLANT = Math.hypot(KEY_LIGHT_OFFSET[0], KEY_LIGHT_OFFSET[2]) / KEY_LIGHT_OFFSET[1];
const SHADOW_CASTER_REACH = 20;
const SHADOW_DEPTH_BIAS = 0.032;
const GROUND_FOG_PER_HAZE = 1.6;
const GROUND_FOG_PER_MIST = 0.18;
const GROUND_FOG_LIMIT = 0.4;
const MIST_GAIN = 2.4;
const MIST_WHITE = 0.04;
const DRIZZLE_WETNESS = 0.6;
const FLASH_AMBIENT = 2.2;
const FLASH_KEY = 1.5;
const FLASH_SKY = 0x8fa6c8;
const FLASH_SKY_MIX = 0.6;
const BLOOM_STRENGTH = 0.6;
const BLOOM_RADIUS = 0.35;
const NIGHT_BLOOM_RADIUS = 0.5;
const BLOOM_THRESHOLD = 0.86;
const BLOOM_KNEE = 0.14;
const BLOOM_PEAK = 0.8;
const BLOOM_REFERENCE_DISTANCE = 11;
const BLOOM_DISTANCE_RESPONSE = 0.4;
const BLOOM_STRENGTH_RANGE = { minimum: 0.4, maximum: 0.8 } as const;
const NIGHT_BLOOM_LIFT = 0.7;
const BRIGHT_PASS_SHADER = `uniform sampler2D tDiffuse;
uniform vec2 sourceTexel;
uniform float luminosityThreshold;
uniform float smoothWidth;
varying vec2 vUv;
vec3 brightPart( vec2 uv ) {
  vec3 c = texture2D( tDiffuse, uv ).rgb;
  float peak = max( c.r, max( c.g, c.b ) );
  float soft = clamp( peak - luminosityThreshold + smoothWidth, 0.0, 2.0 * smoothWidth );
  soft = soft * soft / ( 4.0 * smoothWidth + 1e-5 );
  float excess = max( soft, peak - luminosityThreshold );
  float kept = min( excess, ${BLOOM_PEAK.toFixed(2)} );
  return c * ( kept / max( peak, 1e-4 ) );
}
void main() {
  vec2 o = sourceTexel;
  vec3 c = brightPart( vUv + vec2( -o.x, -o.y ) ) + brightPart( vUv + vec2( o.x, -o.y ) ) + brightPart( vUv + vec2( -o.x, o.y ) ) + brightPart( vUv + vec2( o.x, o.y ) );
  gl_FragColor = vec4( c * 0.25, 1.0 );
}`;

export interface AmbienceLight {
  readonly sky: Color;
  readonly ground: Color;
  readonly key: Color;
  fill: number;
  sun: number;
  skyBrightness: number;
}

export interface FinishLook {
  saturation: number;
  curve: number;
  toe: number;
  vignette: number;
}

export interface NightLook {
  mistGain: number;
  hotCore: number;
}

export interface ShadowFrame {
  readonly standoff: number;
  readonly far: number;
}

export const createAmbienceLight = (): AmbienceLight => ({ sky: new Color(), ground: new Color(), key: new Color(), fill: 0, sun: 0, skyBrightness: 0 });

export const luminanceOf = (color: Color): number => color.r * LUMINANCE.r + color.g * LUMINANCE.g + color.b * LUMINANCE.b;

const skyChannels = { r: 0, g: 0, b: 0 };
const skyHue = new Color();
const sunTint = new Color();

export function lightAmbience(ambience: BlendedAmbience, into: AmbienceLight = createAmbienceLight()): AmbienceLight {
  const { r, g, b } = ambience.sky.getRGB(skyChannels, SRGBColorSpace);
  const skyBrightness = Math.min(1, Math.max(r, g, b) * SKY_BRIGHTNESS_GAIN);
  const dusk = ambience.daylight * (1 - skyBrightness);
  const tint = ambience.tint.getHex();
  into.sky.setHex(lighten(tint, AMBIENT_SKY_LIFT - ambience.darkness * AMBIENT_SKY_LIFT_PER_DARKNESS));
  into.ground.setHex(lighten(tint, AMBIENT_GROUND_LIFT));
  const night = nightOf(ambience.darkness);
  into.fill = Math.max((AMBIENT_BASE - ambience.darkness * AMBIENT_DARKNESS_WEIGHT) * (1 - dusk * DUSK_AMBIENT_CUT), AMBIENT_FLOOR / luminanceOf(into.sky)) * (1 - NIGHT_FILL_CUT * night);
  into.sun = Math.max(KEY_FLOOR, (KEY_BASE - ambience.darkness * KEY_DARKNESS_WEIGHT) * (1 + ambience.daylight * SUN_BOOST * skyBrightness) * (1 - dusk * DUSK_KEY_CUT) * (1 - NIGHT_KEY_CUT * night));
  const peak = Math.max(ambience.sky.r, ambience.sky.g, ambience.sky.b);
  if (peak > 0) skyHue.copy(ambience.sky).multiplyScalar(1 / peak);
  else skyHue.setRGB(1, 1, 1);
  sunTint.setHex(SUN_COLOR).lerp(skyHue, SKY_SUN_TINT * (1 - skyBrightness));
  into.key.setHex(SHADE_COLOR).lerp(sunTint, ambience.daylight);
  into.skyBrightness = skyBrightness;
  return into;
}

export const nightOf = (darkness: number): number => MathUtils.smoothstep(darkness, NIGHT_FROM, NIGHT_TO);

export function finishFor(darkness: number, daylight: number, into: FinishLook = { saturation: 1, curve: 0, toe: 0, vignette: 0 }): FinishLook {
  const night = nightOf(darkness);
  into.saturation = 1 + GRADE_SATURATION * (1 - DAYLIGHT_SATURATION_CUT * daylight * (1 - darkness));
  into.curve = GRADE_CURVE * (1 - night);
  into.toe = NIGHT_TOE * night;
  into.vignette = MathUtils.lerp(DAY_VIGNETTE, NIGHT_VIGNETTE, night);
  return into;
}

export function nightLookFor(darkness: number, into: NightLook = { mistGain: 1, hotCore: 0 }): NightLook {
  const night = nightOf(darkness);
  into.mistGain = 1 - NIGHT_MIST_CUT * night;
  into.hotCore = NIGHT_HOT_CORE * night;
  return into;
}

export function shadowFrameFor(half: number): ShadowFrame {
  const standoff = half * LIGHT_SLANT + SHADOW_CASTER_REACH;
  return { standoff, far: 2 * standoff };
}

export class SceneLook {
  readonly renderer: WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloom = new UnrealBloomPass(new Vector2(256, 256), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
  private graphics: GameSettings = DEFAULT_SETTINGS;
  private pixelRatio = 1;
  private glowStrength = 1;
  private lightLimit = FIELD_LIGHT_LIMIT;
  private readonly hemisphere = new HemisphereLight(0x9fc6d6, 0x05080a, 0.6);
  private readonly keyLight = new DirectionalLight(0xcfe8ff, 0.7);
  private readonly fog = new FogExp2(0x000000, 0);
  private readonly background = new Color();
  private readonly light = createAmbienceLight();
  private readonly finishLook = finishFor(0, 0);
  private readonly nightLook = nightLookFor(0);
  private readonly output = new OutputPass();
  private readonly hotCore = { value: 0 };
  private shadowHalf = 0;
  private shadowStandoff = 0;
  private assignedLights: LightAssignment<LightSource> = NO_LIGHTS;
  private readonly fieldLights: FieldLight[] = Array.from({ length: FIELD_LIGHT_LIMIT }, () => ({ position: new Vector3(), color: new Color(), reach: 0 }));
  private lightTimer = 0;
  private activeFieldLights = 0;
  private survey = false;
  private lastAmbience: BlendedAmbience | null = null;
  private reach: number | null = null;
  private readonly air = createAirShape();
  private readonly hazeColor = new Color();
  private readonly mistColor = new Color();
  private readonly snappedFocus = new Vector3();
  private readonly finish = new ShaderPass(FINISH_SHADER);
  private readonly flashColor = new Color(FLASH_SKY);
  private readonly flashShown = new Color();
  private readonly sky = new SkyDome();
  private readonly skyLook = createSkyLook();
  private time = 0;
  flash = 0;

  constructor(canvas: HTMLCanvasElement, scene: Scene, camera: Camera) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = BASE_EXPOSURE;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.normalBias = 0.02;
    this.fitShadow(SHADOW_REACH_MIN);
    scene.fog = this.fog;
    scene.background = this.background;
    scene.add(this.hemisphere, this.keyLight, this.keyLight.target, this.sky.mesh);

    this.composer = new EffectComposer(this.renderer, new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }));
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.bloom);
    Object.assign(this.output.uniforms, { hotCore: this.hotCore });
    this.output.material.fragmentShader = this.output.material.fragmentShader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform float hotCore;')
      .replace('gl_FragColor = texture2D( tDiffuse, vUv );', `gl_FragColor = texture2D( tDiffuse, vUv );\nfloat hotPeak = max( max( gl_FragColor.r, gl_FragColor.g ), gl_FragColor.b );\ngl_FragColor.rgb = mix( gl_FragColor.rgb, vec3( hotPeak ), smoothstep( ${HOT_FROM.toFixed(2)}, ${HOT_TO.toFixed(2)}, hotPeak ) * hotCore );`);
    this.composer.addPass(this.output);
    this.composer.addPass(this.finish);
    const highPass = this.bloom.materialHighPassFilter;
    highPass.uniforms['smoothWidth']!.value = BLOOM_KNEE;
    highPass.uniforms['sourceTexel'] = { value: new Vector2(1, 1) };
    highPass.fragmentShader = BRIGHT_PASS_SHADER;
    highPass.needsUpdate = true;
    const blend = this.bloom.blendMaterial;
    blend.blending = CustomBlending;
    blend.blendSrc = OneFactor;
    blend.blendDst = OneFactor;
    blend.blendSrcAlpha = ZeroFactor;
    blend.blendDstAlpha = OneFactor;
  }

  resize(width: number, height: number): void {
    const pixelRatio = pixelRatioFor(this.graphics.renderScale, window.devicePixelRatio);
    this.pixelRatio = pixelRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.applySamples(samplesFor(this.graphics.antialiasing, pixelRatio));
    this.finish.uniforms.texel!.value.set(1 / Math.max(1, width * pixelRatio), 1 / Math.max(1, height * pixelRatio));
    this.bloom.materialHighPassFilter.uniforms['sourceTexel']!.value.set(1 / Math.max(1, width * pixelRatio), 1 / Math.max(1, height * pixelRatio));
    this.applyFinish();
  }

  private applyFinish(): void {
    const { grading, vignette, grain, sharpen } = this.graphics;
    const uniforms = this.finish.uniforms;
    uniforms.sharpen!.value = sharpen && this.pixelRatio < SHARPEN_MAX_PIXEL_RATIO ? SHARPEN_AMOUNT : 0;
    uniforms.grade!.value = grading ? 1 : 0;
    uniforms.saturation!.value = this.finishLook.saturation;
    uniforms.curve!.value = this.finishLook.curve;
    uniforms.toe!.value = this.finishLook.toe;
    uniforms.vignette!.value = vignette ? this.finishLook.vignette : 0;
    uniforms.grain!.value = grain ? 1 : 0;
    this.finish.enabled = grading || vignette || grain || uniforms.sharpen!.value > 0;
  }

  private applySamples(samples: number): void {
    for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      if (target.samples === samples) continue;
      target.samples = samples;
      target.dispose();
    }
  }

  applyGraphics(settings: GameSettings): boolean {
    const needsResize = settings.renderScale !== this.graphics.renderScale || settings.antialiasing !== this.graphics.antialiasing;
    this.graphics = settings;
    this.glowStrength = glowStrengthFor(settings.glow);
    this.bloom.enabled = this.glowStrength > 0;
    this.renderer.toneMappingExposure = BASE_EXPOSURE * settings.brightness;
    const lightLimit = lightLimitFor(settings.lights);
    if (lightLimit !== this.lightLimit) {
      this.lightLimit = lightLimit;
      this.lightTimer = 0;
    }
    this.applyFinish();
    const mapSize = shadowMapSizeFor(settings.shadows);
    if (this.keyLight.shadow.mapSize.x !== mapSize) {
      this.keyLight.shadow.mapSize.set(mapSize, mapSize);
      this.keyLight.shadow.map?.dispose();
      this.keyLight.shadow.map = null;
    }
    this.keyLight.castShadow = settings.shadows !== 'off';
    return needsResize;
  }

  reachTo(reach: number | null): void {
    this.reach = reach;
    if (this.lastAmbience) this.applyAmbience(this.lastAmbience);
  }

  setSurvey(on: boolean): void {
    this.survey = on;
    if (this.lastAmbience) this.applyAmbience(this.lastAmbience);
  }

  applyAmbience(ambience: BlendedAmbience): void {
    this.lastAmbience = ambience;
    skyLookFor(ambience, nightOf(ambience.darkness), this.skyLook);
    const light = lightAmbience(ambience, this.light);
    this.hemisphere.color.copy(light.sky);
    this.hemisphere.groundColor.copy(light.ground);
    this.hemisphere.intensity = light.fill;
    this.keyLight.color.copy(light.key);
    this.keyLight.intensity = light.sun;
    airShapeFor(ambience, nightOf(ambience.darkness), this.reach, this.air);
    this.fog.density = this.survey ? 0 : this.air.density * LEGACY_FOG_SHARE;
    const groundFog = this.survey ? 0 : Math.min(GROUND_FOG_LIMIT, Math.max(0, (ambience.haze - 1) * GROUND_FOG_PER_HAZE + ambience.weather.mist * GROUND_FOG_PER_MIST));
    nightLookFor(this.survey ? 0 : ambience.darkness, this.nightLook);
    this.hotCore.value = this.nightLook.hotCore;
    this.mistColor.copy(ambience.fog).multiplyScalar(MIST_GAIN * this.nightLook.mistGain).lerp(this.flashColor.setRGB(1, 1, 1), MIST_WHITE);
    setBeamWeather(this.survey ? 0 : ambience.haze, ambience.weather.mist, ambience.weather.rain);
    setFieldAtmosphere({ groundFog, mistColor: this.mistColor, wetness: ambience.weather.rain + DRIZZLE_WETNESS * ambience.weather.drizzle });
    if (this.flash > 0 && !this.survey) {
      this.hemisphere.intensity += this.flash * FLASH_AMBIENT;
      this.keyLight.intensity += this.flash * FLASH_KEY;
      this.flashShown.setHex(FLASH_SKY, LinearSRGBColorSpace);
      this.skyLook.horizon.lerp(this.flashShown, this.flash * FLASH_SKY_MIX);
      this.skyLook.zenith.lerp(this.flashShown, this.flash * FLASH_SKY_MIX);
    }
    this.sky.apply(this.skyLook, BASE_EXPOSURE);
    sceneColorOf(this.skyLook.horizon, BASE_EXPOSURE, this.background);
    sceneColorOf(this.skyLook.haze, BASE_EXPOSURE, this.hazeColor);
    this.fog.color.copy(this.hazeColor);
    setAir(this.air, this.hazeColor, this.background, this.survey ? 0 : 1);
    if (this.survey) {
      this.hemisphere.intensity = SURVEY_AMBIENT;
      this.keyLight.intensity = SURVEY_KEY;
    }
    const darkness = this.survey ? 0 : ambience.darkness;
    finishFor(darkness, ambience.daylight, this.finishLook);
    this.bloom.radius = MathUtils.lerp(BLOOM_RADIUS, NIGHT_BLOOM_RADIUS, nightOf(darkness));
    this.applyFinish();
  }

  followFocus(distance: number): void {
    setAirFocus(distance);
  }

  aimKeyLight(focus: Vector3, distance: number): void {
    const half = MathUtils.clamp(distance * SHADOW_REACH_PER_DISTANCE, SHADOW_REACH_MIN, SHADOW_REACH_MAX);
    if (Math.abs(this.shadowHalf - half) > SHADOW_REACH_STEP) this.fitShadow(half);
    const shadow = this.keyLight.shadow.camera;
    const texel = (shadow.right - shadow.left) / this.keyLight.shadow.mapSize.x;
    const along = Math.round(focus.dot(LIGHT_RIGHT) / texel) * texel;
    const across = Math.round(focus.dot(LIGHT_UP) / texel) * texel;
    const depth = focus.dot(LIGHT_DIRECTION);
    this.snappedFocus.copy(LIGHT_RIGHT).multiplyScalar(along).addScaledVector(LIGHT_UP, across).addScaledVector(LIGHT_DIRECTION, depth);
    this.keyLight.position.copy(this.snappedFocus).addScaledVector(LIGHT_DIRECTION, this.shadowStandoff);
    this.keyLight.target.position.copy(this.snappedFocus);
  }

  private fitShadow(half: number): void {
    const { standoff, far } = shadowFrameFor(half);
    const shadow = this.keyLight.shadow;
    this.shadowHalf = half;
    this.shadowStandoff = standoff;
    shadow.camera.left = -half;
    shadow.camera.right = half;
    shadow.camera.top = half;
    shadow.camera.bottom = -half;
    shadow.camera.far = far;
    shadow.bias = -SHADOW_DEPTH_BIAS / (far - shadow.camera.near);
    shadow.camera.updateProjectionMatrix();
  }

  matchBloomToDistance(distance: number): void {
    const scale = Math.pow(Math.max(0, distance) / BLOOM_REFERENCE_DISTANCE, BLOOM_DISTANCE_RESPONSE);
    const darkness = this.survey ? 0 : (this.lastAmbience?.darkness ?? 0);
    const night = 1 + darkness * nightOf(darkness) * NIGHT_BLOOM_LIFT;
    this.bloom.strength = MathUtils.clamp(BLOOM_STRENGTH * scale, BLOOM_STRENGTH_RANGE.minimum, BLOOM_STRENGTH_RANGE.maximum) * night * this.glowStrength;
  }

  get lightEdge(): number {
    return this.assignedLights.edge;
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
      this.assignedLights = assignLights(sources, focus, this.lightLimit);
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
    this.sky.setTime(this.time);
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
    this.sky.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
