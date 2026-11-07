import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
const pageUrl = process.env.VISUAL_QA_URL ?? 'http://localhost:4200/';
const outputDirectory = resolve(process.env.VISUAL_QA_OUTPUT ?? 'output/visual-qa');
const fullPage = process.env.VISUAL_QA_FULL_PAGE === '1';
const allViewports = [
  { width: 1440, height: 1200 },
  { width: 1280, height: 1050 },
  { width: 1024, height: 900 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];
const requestedWidth = Number(process.env.VISUAL_QA_WIDTH ?? 0);
const viewports = requestedWidth
  ? allViewports.filter((viewport) => viewport.width === requestedWidth)
  : allViewports;
if (!viewports.length) throw new Error(`Unsupported VISUAL_QA_WIDTH: ${requestedWidth}`);

await mkdir(outputDirectory, { recursive: true });

for (const viewport of viewports) {
  const targetResponse = await fetch(`${endpoint}/json/new?${encodeURIComponent(pageUrl)}`, {
    method: 'PUT',
  });
  if (!targetResponse.ok) throw new Error(`Chrome target failed: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let sequence = 0;

  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  const command = (method, params = {}) =>
    new Promise((resolveCommand, rejectCommand) => {
      const id = ++sequence;
      pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
      socket.send(JSON.stringify({ id, method, params }));
    });

  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 600,
  });
  await command('Page.navigate', { url: pageUrl });
  await new Promise((resolveWait) => setTimeout(resolveWait, 4500));

  const metricsResult = await command('Runtime.evaluate', {
    expression: `(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        title: document.title,
        clientWidth: root.clientWidth,
        scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth ?? 0),
        scrollHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0),
        rendered: Boolean(document.querySelector('ws-store-shell')),
        textLength: body?.innerText.length ?? 0,
        samplePrice: document.querySelector('.ws-product-price strong')?.textContent?.trim() ?? ''
      };
    })()`,
    returnByValue: true,
  });
  const metrics = metricsResult.result.value;

  const screenshot = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: fullPage,
    fromSurface: true,
    ...(fullPage
      ? { clip: { x: 0, y: 0, width: metrics.clientWidth, height: metrics.scrollHeight, scale: 1 } }
      : {}),
  });
  const fileName = `home-qa-${viewport.width}x${viewport.height}${fullPage ? '-full' : ''}.png`;
  await writeFile(resolve(outputDirectory, fileName), Buffer.from(screenshot.data, 'base64'));
  console.log(
    JSON.stringify({ viewport, fileName, ...metrics, overflow: metrics.scrollWidth > metrics.clientWidth }),
  );

  socket.close();
  await fetch(`${endpoint}/json/close/${target.id}`);
}
