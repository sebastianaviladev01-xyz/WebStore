const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
const pages = [
  { name: 'storefront', url: 'http://localhost:4200/', ready: 'ws-store-shell' },
  { name: 'admin', url: 'http://localhost:4300/login', ready: 'ws-admin-login' },
];
const wait = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

const results = [];

for (const page of pages) {
  const targetResponse = await fetch(`${endpoint}/json/new?${encodeURIComponent(page.url)}`, {
    method: 'PUT',
  });
  if (!targetResponse.ok) throw new Error(`Chrome target failed: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const findings = [];
  let sequence = 0;

  await new Promise((open, reject) => {
    socket.addEventListener('open', open, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
      return;
    }

    if (message.method === 'Runtime.exceptionThrown') {
      findings.push({
        type: 'exception',
        text: message.params.exceptionDetails?.text ?? 'Runtime exception',
      });
    }
    if (message.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(message.params.type)) {
      findings.push({
        type: message.params.type,
        text: message.params.args.map((argument) => argument.value ?? argument.description ?? '').join(' '),
      });
    }
    if (message.method === 'Log.entryAdded' && ['warning', 'error'].includes(message.params.entry.level)) {
      findings.push({ type: message.params.entry.level, text: message.params.entry.text });
    }
  });

  const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  await command('Page.enable');
  await command('Runtime.enable');
  await command('Log.enable');
  await command('Page.navigate', { url: page.url });

  const started = Date.now();
  let rendered = false;
  while (!rendered && Date.now() - started < 8000) {
    const state = await command('Runtime.evaluate', {
      expression: `Boolean(document.querySelector(${JSON.stringify(page.ready)}))`,
      returnByValue: true,
    });
    rendered = Boolean(state.result.value);
    if (!rendered) await wait(100);
  }
  await wait(1200);

  results.push({ name: page.name, rendered, findings });
  socket.close();
  await fetch(`${endpoint}/json/close/${target.id}`);
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => !result.rendered || result.findings.length > 0)) process.exitCode = 1;
