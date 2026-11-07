import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defineConfig } from '@playwright/test';

import { puertos as ports, urls } from './tests/e2e/apoyo/entorno';

/**
 * Pruebas e2e del Storefront y del Admin contra el BFF de prueba real (`npm run test:e2e`).
 *
 * Levanta sus propios servidores en puertos dedicados (BFF 3400, Storefront 4400, Admin 4500) para no
 * interferir con los de desarrollo (3000, 4200, 4300). El BFF arranca con un archivo de estado temporal que
 * todavía no existe, de modo que lo crea desde su seed en cada ejecución; nunca toca `backend/data.json`.
 *
 * En local usa el Google Chrome instalado (`channel: 'chrome'`) para no descargar navegadores; en la CI usa el
 * Chromium que instala `npx playwright install --with-deps chromium`.
 */
const ci = Boolean(process.env['CI']);
const storefrontUrl = urls.storefront;
const adminUrl = urls.admin;

// Un archivo por ejecución. Los workers heredan la variable del proceso principal y calculan la misma ruta.
const dataFile = (process.env['WEBSTORE_E2E_DATA_FILE'] ??= join(
  tmpdir(),
  `webstore-e2e-${Date.now()}.json`,
));

export default defineConfig({
  testDir: './tests/e2e',
  // Los recorridos comparten el estado del BFF (pedidos, clientes, reclamos): se ejecutan en serie.
  fullyParallel: false,
  workers: 1,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    channel: ci ? undefined : 'chrome',
    headless: true,
    locale: 'es-PE',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'storefront', testMatch: /storefront-.*\.spec\.ts/, use: { baseURL: storefrontUrl } },
    { name: 'admin', testMatch: /admin-.*\.spec\.ts/, use: { baseURL: adminUrl } },
  ],
  webServer: [
    {
      name: 'BFF',
      command: 'node ../backend/src/main.mjs',
      url: `${urls.bff}/health`,
      // Siempre un BFF nuevo: reutilizar uno en marcha arrastraría el estado de otra ejecución.
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        PORT: String(ports.bff),
        WEBSTORE_DATA_FILE: dataFile,
        WEBSTORE_EXPOSE_TEST_CODES: 'true',
        WEBSTORE_NON_WORKING_DATES: '',
        WEBSTORE_ALLOWED_ORIGINS: `${storefrontUrl},${adminUrl}`,
      },
    },
    {
      name: 'Storefront',
      command: `npx ng serve storefront --port ${ports.storefront} --proxy-config proxy.e2e.conf.json`,
      url: storefrontUrl,
      reuseExistingServer: !ci,
      timeout: 180_000,
    },
    {
      name: 'Admin',
      command: `npx ng serve admin --port ${ports.admin} --proxy-config proxy.e2e.conf.json`,
      url: adminUrl,
      reuseExistingServer: !ci,
      timeout: 180_000,
    },
  ],
});
