import { spawn } from 'node:child_process';

const processes = [
  { label: 'server', workspace: '@containment/server' },
  { label: 'client', workspace: '@containment/client' },
];

const children = processes.map(({ label, workspace }) => {
  const child = spawn(`npm run dev -w ${workspace}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  const prefix = `[${label}] `;
  child.stdout.on('data', (chunk: Buffer) => process.stdout.write(prefixLines(prefix, chunk)));
  child.stderr.on('data', (chunk: Buffer) => process.stderr.write(prefixLines(prefix, chunk)));
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`);
    shutdown();
  });
  return child;
});

function prefixLines(prefix: string, chunk: Buffer): string {
  return chunk
    .toString()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => prefix + line + '\n')
    .join('');
}

function shutdown(): void {
  for (const child of children) child.kill();
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
