import type { LandPlan } from '@containment/shared';

export type LandEditResult = { readonly ok: true; readonly plan: LandPlan } | { readonly ok: false; readonly error: string };
