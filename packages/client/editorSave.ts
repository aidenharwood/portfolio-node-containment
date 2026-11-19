import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDistrict, drawLand, parseLandPlan, parseLayout, printLandPlan, printLayout } from '@containment/shared';
import type { Plugin } from 'vite';

export type SaveResult = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly status: number; readonly error: string };

const DISTRICT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SUPPRESS_MS = 2000;
const ROUTE = /^\/__editor\/layouts\/([^/?]+)$/;
const LAND_ROUTE = /^\/__editor\/land\/([^/?]+)$/;

export function saveLayout(root: string, districtId: string, body: string): SaveResult {
  if (!DISTRICT_ID.test(districtId)) return { ok: false, status: 400, error: `"${districtId}" is not a district id.` };
  const file = join(root, `${districtId}.json`);
  if (!existsSync(file)) return { ok: false, status: 404, error: `There is no layout for "${districtId}".` };
  let source: unknown;
  try {
    source = JSON.parse(body);
  } catch (error) {
    return { ok: false, status: 422, error: `The layout is not valid JSON: ${(error as Error).message}` };
  }
  try {
    const layout = parseLayout(source);
    if (layout.id !== districtId) return { ok: false, status: 422, error: `The layout's id "${layout.id}" does not match "${districtId}".` };
    buildDistrict(layout);
    const text = printLayout(layout);
    writeFileSync(file, text);
    return { ok: true, text };
  } catch (error) {
    return { ok: false, status: 422, error: (error as Error).message };
  }
}

function readLayouts(root: string): Record<string, unknown> {
  const sources: Record<string, unknown> = {};
  for (const name of readdirSync(root)) {
    if (!name.endsWith('.json')) continue;
    sources[name.slice(0, -'.json'.length)] = JSON.parse(readFileSync(join(root, name), 'utf8'));
  }
  return sources;
}

export function saveLand(landRoot: string, layoutRoot: string, landId: string, body: string): SaveResult {
  if (!DISTRICT_ID.test(landId)) return { ok: false, status: 400, error: `"${landId}" is not a land id.` };
  const file = join(landRoot, `${landId}.json`);
  if (!existsSync(file)) return { ok: false, status: 404, error: `There is no land plan "${landId}".` };
  let source: unknown;
  try {
    source = JSON.parse(body);
  } catch (error) {
    return { ok: false, status: 422, error: `The land plan is not valid JSON: ${(error as Error).message}` };
  }
  try {
    const plan = parseLandPlan(source);
    if (plan.id !== landId) return { ok: false, status: 422, error: `The land plan's id "${plan.id}" does not match "${landId}".` };
    const land = drawLand(plan);
    const layouts = readLayouts(layoutRoot);
    for (const [id, layout] of Object.entries(layouts)) {
      if (layout === null || typeof layout !== 'object' || !('square' in layout)) continue;
      try {
        buildDistrict(layout, land, layouts);
      } catch (error) {
        return { ok: false, status: 422, error: `Square district "${id}" no longer builds on this land: ${(error as Error).message}` };
      }
    }
    const text = printLandPlan(plan);
    writeFileSync(file, text);
    return { ok: true, text };
  } catch (error) {
    return { ok: false, status: 422, error: (error as Error).message };
  }
}

export interface WriteLog {
  record(path: string, now: number): void;
  shouldSuppress(path: string, now: number): boolean;
}

export function createWriteLog(windowMs = SUPPRESS_MS): WriteLog {
  const written = new Map<string, number>();
  return {
    record: (path, now) => {
      written.set(resolve(path), now);
    },
    shouldSuppress: (path, now) => {
      const at = written.get(resolve(path));
      return at !== undefined && now - at < windowMs;
    },
  };
}

export function layoutSavePlugin(root: string, landRoot?: string): Plugin {
  const log = createWriteLog();
  return {
    name: 'containment-layout-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const post = request.method === 'POST' && request.url ? request.url : null;
        const match = post ? ROUTE.exec(post) : null;
        const landMatch = post && landRoot ? LAND_ROUTE.exec(post) : null;
        if (!match && !landMatch) {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
          const id = decodeURIComponent((match ?? landMatch)?.[1] ?? '');
          const text = Buffer.concat(chunks).toString('utf8');
          const folder = match ? root : (landRoot ?? root);
          const result = match ? saveLayout(root, id, text) : saveLand(folder, root, id, text);
          if (result.ok) log.record(join(folder, `${id}.json`), Date.now());
          response.statusCode = result.ok ? 200 : result.status;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(result.ok ? { ok: true } : { ok: false, error: result.error }));
        });
      });
    },
    handleHotUpdate(context) {
      return log.shouldSuppress(context.file, Date.now()) ? [] : undefined;
    },
  };
}
