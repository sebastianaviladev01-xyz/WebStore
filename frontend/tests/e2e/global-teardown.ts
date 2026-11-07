import { rmSync } from 'node:fs';

/** Borra el archivo de estado temporal del BFF de esta ejecución (ver `playwright.config.ts`). */
export default function globalTeardown(): void {
  const dataFile = process.env['WEBSTORE_E2E_DATA_FILE'];
  if (dataFile) rmSync(dataFile, { force: true });
}
