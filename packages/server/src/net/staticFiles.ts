import { existsSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

export function createStaticFileHandler(rootDirectory: string) {
  const root = normalize(rootDirectory);
  const indexPath = join(root, 'index.html');

  return (request: IncomingMessage, response: ServerResponse): void => {
    if (!existsSync(indexPath)) {
      response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Client not built. Run "npm run build" or use "npm run dev" and open http://localhost:5173.');
      return;
    }

    const requestedPath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const candidate = normalize(join(root, requestedPath));
    const insideRoot = candidate === root || candidate.startsWith(root + sep);
    const filePath = insideRoot && existsSync(candidate) && statSync(candidate).isFile() ? candidate : indexPath;

    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
    });
    response.end(readFileSync(filePath));
  };
}
