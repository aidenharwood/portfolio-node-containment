import intake from './layouts/meridian-intake.json' with { type: 'json' };
import secure from './layouts/meridian-secure.json' with { type: 'json' };
import vault from './layouts/meridian-vault.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';
import { registerFurnishingKit } from '../furnishingKit.ts';
import { CITY_KIT } from '../seed/cityKit.ts';

registerFurnishingKit(CITY_KIT);

export const MERIDIAN_INTAKE = buildDistrict(intake);
export const MERIDIAN_INTAKE_ANCHORS = anchorsOf(MERIDIAN_INTAKE, ['arrival', 'lower-arrival']);
export const MERIDIAN_SECURE = buildDistrict(secure);
export const MERIDIAN_SECURE_ANCHORS = anchorsOf(MERIDIAN_SECURE, ['arrival', 'vault-arrival']);
export const MERIDIAN_VAULT = buildDistrict(vault);
export const MERIDIAN_VAULT_ANCHORS = anchorsOf(MERIDIAN_VAULT, ['arrival']);
export const SITE_MERIDIAN_DISTRICTS = [MERIDIAN_INTAKE, MERIDIAN_SECURE, MERIDIAN_VAULT] as const;
