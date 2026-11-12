import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDistrict, parseLayout, printLayout } from '@containment/shared';
import type { Plugin } from 'vite';

export type SaveResult = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly status: number; readonly error: string };

const DISTRICT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SUPPRESS_MS = 2000;
const ROUTE = /^\/__editor\/layouts\/([^/?]+)$/;

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

export function layoutSavePlugin(root: string): Plugin {
  const log = createWriteLog();
  return {
    name: 'containment-layout-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const match = request.method === 'POST' && request.url ? ROUTE.exec(request.url) : null;
        if (!match) {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
          const districtId = decodeURIComponent(match[1] ?? '');
          const result = saveLayout(root, districtId, Buffer.concat(chunks).toString('utf8'));
          if (result.ok) log.record(join(root, `${districtId}.json`), Date.now());
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
