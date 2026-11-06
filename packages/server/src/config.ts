import { fileURLToPath } from 'node:url';

export interface ServerConfig {
  readonly port: number;
  readonly databasePath: string;
  readonly clientDistPath: string;
  readonly tickMs: number;
  readonly autosaveIntervalMs: number;
  readonly sessionLifetimeMs: number;
  readonly maxCharactersPerAccount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const fromRepository = (relativePath: string): string =>
  fileURLToPath(new URL(`../../../${relativePath}`, import.meta.url));

export function loadServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: Number(environment.GAME_SERVER_PORT ?? 7420),
    databasePath: environment.DATABASE_PATH ?? fromRepository('data/containment.sqlite'),
    clientDistPath: environment.CLIENT_DIST_PATH ?? fromRepository('packages/client/dist'),
    tickMs: 300,
    autosaveIntervalMs: 60_000,
    sessionLifetimeMs: 14 * DAY_MS,
    maxCharactersPerAccount: 4,
  };
}
