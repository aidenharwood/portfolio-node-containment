export const WEATHER_KINDS = ['rain', 'drizzle', 'mist', 'embers', 'ash', 'spores', 'dust', 'sparks'] as const;

export type WeatherKind = (typeof WEATHER_KINDS)[number];

export const SKY_WEATHER: ReadonlySet<WeatherKind> = new Set(['rain', 'drizzle', 'ash']);
