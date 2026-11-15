import { ACESFilmicToneMapping, Color, DirectionalLight, FogExp2, HemisphereLight, PCFSoftShadowMap, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, type Camera, type Scene } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { assignLights, type LightAssignment } from './lightAssignment.ts';
import { buildFieldLightGrid, clearFieldLights, FIELD_LIGHT_LIMIT, fieldLightFade, setFieldAtmosphere, setFieldLights, type FieldLight } from './voxel/fieldLights.ts';
import { lighten } from './voxel/palette.ts';
import type { BlendedAmbience } from './world/ambienceBlend.ts';
import { setBeamWeather } from './world/lightBeams.ts';
import type { LightSource } from './world/levelScene.ts';
import { pixelRatioFor, shadowMapSizeFor, type GameSettings, type RenderScale } from '../state/gameSettings.ts';

const LIGHT_INTENSITY_SCALE = 14;
const LIGHT_REACH = 1.4;
const AMBIENT_BASE = 2.9;
const AMBIENT_DARKNESS_WEIGHT = 2.3;
const AMBIENT_FLOOR = 0.8;
const AMBIENT_SKY_LIFT = 0.74;
const AMBIENT_GROUND_LIFT = 0.32;
const KEY_BASE = 1;
const KEY_DARKNESS_WEIGHT = 0.7;
const KEY_FLOOR = 0.25;
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
const GROUND_FOG_PER_HAZE = 1.6;
const GROUND_FOG_PER_MIST = 0.18;
const GROUND_FOG_LIMIT = 0.6;
const MIST_GAIN = 2.5;
const MIST_WHITE = 0.04;
const DRIZZLE_WETNESS = 0.6;
const FLASH_AMBIENT = 2.2;
const FLASH_KEY = 1.5;
const FLASH_SKY = 0x8fa6c8;
const FLASH_SKY_MIX = 0.6;

export class SceneLook {
  readonly renderer: WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloom = new UnrealBloomPass(new Vector2(256, 256), 0.45, 0.5, 0.85);
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
  private readonly flashColor = new Color(FLASH_SKY);
  private time = 0;
  flash = 0;

  constructor(canvas: HTMLCanvasElement, scene: Scene, camera: Camera, fogDensity = FOG_DENSITY) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
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

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  resize(width: number, height: number): void {
    const pixelRatio = pixelRatioFor(this.renderScale, window.devicePixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
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
    setFieldAtmosphere({ groundFog, mistColor: this.mistColor, wetness: ambience.weather.rain + DRIZZLE_WETNESS * ambience.weather.drizzle, time: this.time });
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

  aimKeyLight(focus: Vector3): void {
    this.keyLight.position.set(focus.x + 5, focus.y + 12, focus.z + 3);
    this.keyLight.target.position.copy(focus);
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
