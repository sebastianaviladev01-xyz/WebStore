import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
const output = resolve(
  process.env.VISUAL_QA_OUTPUT ?? 'output/visual-qa/compliance-final/admin-authenticated',
);
const pageUrl = 'http://localhost:4300/login';
const wait = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

const targetResponse = await fetch(`${endpoint}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' });
if (!targetResponse.ok) throw new Error(`Chrome target failed: ${targetResponse.status}`);
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;
await new Promise((open, reject) => {
  socket.addEventListener('open', open, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
});
const command = (method, params = {}) =>
  new Promise((done, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve: done, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const waitFor = async (expression, timeout = 6000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw new Error(`Condition timed out: ${expression}`);
};
const fill = async (email, password) => {
  await evaluate(`(()=>{
    const set=(element,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));};
    set(document.querySelector('input[type="email"]'),${JSON.stringify(email)});
    set(document.querySelector('input[type="password"]'),${JSON.stringify(password)});
    document.querySelector('button[type="submit"]').click();
  })()`);
  await waitFor(`location.pathname!=='/login'||Boolean(document.querySelector('[role="alert"]'))`);
};

await command('Page.enable');
await command('Runtime.enable');
await command('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await command('Page.navigate', { url: pageUrl });
await waitFor(`Boolean(document.querySelector('input[type="email"]'))`);
await fill('owner@webstore.demo', 'WebStore#2026');
const owner = await evaluate(`(()=>({
  url:location.pathname,
  shell:Boolean(document.querySelector('ws-admin-shell')),
  role:[...document.querySelectorAll('header span')].map((node)=>node.textContent.trim()).find((value)=>value==='Superadministrador')??'',
  hasRoleSwitcher:document.body.innerText.includes('Rol demo'),
  hasComplaints:[...document.querySelectorAll('nav a')].some((node)=>node.textContent.includes('Reclamaciones')),
  overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth
}))()`);
const screenshot = await command('Page.captureScreenshot', { format: 'png', fromSurface: true });
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'admin-owner-1440x1000.png'), Buffer.from(screenshot.data, 'base64'));

await evaluate(
  `[...document.querySelectorAll('header button')].find((button)=>button.textContent.includes('Cerrar sesión'))?.click()`,
);
await waitFor(`location.pathname==='/login'&&Boolean(document.querySelector('input[type="email"]'))`);
await fill('catalogo@webstore.demo', 'Catalogo#2026');
const catalog = await evaluate(`(()=>({
  url:location.pathname,
  role:[...document.querySelectorAll('header span')].map((node)=>node.textContent.trim()).find((value)=>value==='Vendedor')??'',
  visibleNavigation:[...document.querySelectorAll('nav a')].map((node)=>node.textContent.trim())
}))()`);
await command('Page.navigate', { url: 'http://localhost:4300/usuarios' });
await wait(900);
const catalogGuard = await evaluate(`location.pathname`);
await evaluate(
  `[...document.querySelectorAll('header button')].find((button)=>button.textContent.includes('Cerrar sesión'))?.click()`,
);
await waitFor(`location.pathname==='/login'`);

console.log(JSON.stringify({ owner, catalog, catalogGuard }, null, 2));
socket.close();
await fetch(`${endpoint}/json/close/${target.id}`);
