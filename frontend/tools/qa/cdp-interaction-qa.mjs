const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9333';
const pageUrl = process.env.VISUAL_QA_URL ?? 'http://localhost:4200/';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const targetResponse = await fetch(`${endpoint}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' });
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

const evaluate = async (expression) => {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
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
await wait(2500);

const initialHero = await evaluate(`(() => ({
  activeSlides: document.querySelectorAll('.ws-hero-slide.is-active').length,
  counter: document.querySelector('.ws-hero-counter')?.textContent?.trim(),
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
}))()`);

await evaluate(`document.querySelector('[aria-label="Promoción siguiente"]')?.click()`);
await wait(180);
const heroTransition = await evaluate(`(() => ({
  counter: document.querySelector('.ws-hero-counter')?.textContent?.trim(),
  activeOpacity: getComputedStyle(document.querySelector('.ws-hero-slide.is-active')).opacity,
  transitioningSlides: [...document.querySelectorAll('.ws-hero-slide')]
    .filter((slide) => Number(getComputedStyle(slide).opacity) > 0).length
}))()`);
await wait(500);
const settledHero = await evaluate(`(() => ({
  activeSlides: document.querySelectorAll('.ws-hero-slide.is-active').length,
  activeOpacity: getComputedStyle(document.querySelector('.ws-hero-slide.is-active')).opacity,
  hiddenSlidesInert: [...document.querySelectorAll('.ws-hero-slide:not(.is-active)')]
    .every((slide) => slide.hasAttribute('inert'))
}))()`);

await evaluate(`document.querySelectorAll('.ws-category-tabs button')[1]?.click()`);
await wait(120);
const productTransitionActive = await evaluate(
  `document.documentElement.classList.contains('ws-product-switching')`,
);
await wait(600);
const productSwitch = await evaluate(`(() => ({
  selectedTab: document.querySelector('.ws-category-tabs button[aria-pressed="true"]')?.textContent?.trim(),
  productCount: document.querySelectorAll('.ws-product-grid ws-product-card').length,
  localTransitionFinished: !document.documentElement.classList.contains('ws-product-switching')
}))()`);

await evaluate(`document.querySelector('.ws-navigation-trigger[aria-controls]')?.click()`);
await wait(80);
const megaMenu = await evaluate(`(() => {
  const panel = document.querySelector('.ws-mega-panel');
  return {
    visible: Boolean(panel),
    expanded: document.querySelector('.ws-navigation-trigger[aria-expanded="true"]') !== null,
    animation: panel ? getComputedStyle(panel).animationName : ''
  };
})()`);

await command('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await command('Page.navigate', { url: pageUrl });
await wait(2200);
await evaluate(`document.querySelector('.ws-mobile-menu')?.click()`);
await wait(80);
const mobileDrawer = await evaluate(`(() => {
  const drawer = document.querySelector('.ws-drawer');
  return {
    visible: Boolean(drawer),
    backdrop: Boolean(document.querySelector('.ws-drawer-backdrop')),
    animation: drawer ? getComputedStyle(drawer).animationName : '',
    menuExpanded: document.querySelector('.ws-mobile-menu')?.getAttribute('aria-expanded')
  };
})()`);

await command('Page.navigate', { url: new URL('/catalogo', pageUrl).toString() });
await wait(2200);
await evaluate(`document.querySelector('.ws-filter-toggle')?.click()`);
await wait(120);
const catalogFiltersOpen = await evaluate(`(() => {
  const filters = document.querySelector('.ws-catalog-filters');
  return {
    open: filters?.classList.contains('is-open') ?? false,
    backdrop: Boolean(document.querySelector('.ws-filter-backdrop')),
    focusedInside: filters?.contains(document.activeElement) ?? false,
    toggleExpanded: document.querySelector('.ws-filter-toggle')?.getAttribute('aria-expanded')
  };
})()`);
await evaluate(
  `document.querySelector('.ws-catalog-filters')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
);
await wait(320);
const catalogFiltersClosed = await evaluate(`(() => ({
  open: document.querySelector('.ws-catalog-filters')?.classList.contains('is-open') ?? false,
  backdrop: Boolean(document.querySelector('.ws-filter-backdrop')),
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
}))()`);

const report = {
  initialHero,
  heroTransition,
  settledHero,
  productTransitionActive,
  productSwitch,
  megaMenu,
  mobileDrawer,
  catalogFiltersOpen,
  catalogFiltersClosed,
};
console.log(JSON.stringify(report, null, 2));

socket.close();
await fetch(`${endpoint}/json/close/${target.id}`);
