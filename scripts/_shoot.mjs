import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const scratch = 'C:/Users/aiden/AppData/Local/Temp/claude/429b5cc849355cac/287a95e5-08c6-419f-9deb-4ae809a9e2a9/scratchpad';
const token = readFileSync(`${scratch}/token.txt`, 'utf8').trim();
const plan = JSON.parse(process.argv[2] ?? '[]');
const port = 9333;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${scratch}/chrome-profile`, '--window-size=1280,800',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--no-first-run', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') console.log('console.error:', JSON.stringify(msg.params.args.map((a) => a.value ?? a.description)).slice(0, 400));
});
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const run = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return res.result?.result?.value ?? res.result?.exceptionDetails?.exception?.description;
};
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:5176/' });
await sleep(1500);
await run(`localStorage.setItem('containment.sessionToken', ${JSON.stringify(token)}); location.reload(); 1`);
await sleep(3000);
await run(`[...document.querySelectorAll('button')].find(b => /deploy/i.test(b.textContent))?.click(); 1`);
mkdirSync(`${scratch}/shots`, { recursive: true });
for (const step of plan) {
  if (step.wait) await sleep(step.wait);
  if (step.js) console.log('js:', JSON.stringify(await run(step.js)).slice(0, 300));
  if (step.shot) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${scratch}/shots/${step.shot}.png`, Buffer.from(res.result.data, 'base64'));
    console.log('shot', step.shot);
  }
}
ws.close();
chrome.kill();
process.exit(0);
