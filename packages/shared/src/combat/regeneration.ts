export const REGENERATION_INTERVAL_TICKS = 20;

export const REGENERATION_SHARE = 0.05;

export const regenerationPerInterval = (maxIntegrity: number): number => Math.max(1, Math.round(maxIntegrity * REGENERATION_SHARE));
