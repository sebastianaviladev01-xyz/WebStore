/**
 * Prueba de integración: levanta el BFF real con un archivo de estado temporal (nunca `backend/data.json`)
 * y comprueba por HTTP que un estado guardado con los roles anteriores se migra al arrancar.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverEntry = fileURLToPath(new URL('../../src/main.mjs', import.meta.url));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('un data.json con roles anteriores conserva sus cuentas y agrega la cuenta Administrador', async () => {
  const port = 3108;
  const dataFile = join(tmpdir(), `webstore-roles-${process.pid}.json`);
  // Datos guardados por la versión anterior: sin schemaVersion y con los roles owner/catalog-maintainer.
  await writeFile(
    dataFile,
    JSON.stringify({
      users: [
        { id: 'u-1', name: 'Dueño', email: 'owner@webstore.demo', role: 'owner', active: true },
        {
          id: 'u-2',
          name: 'Catálogo',
          email: 'catalogo@webstore.demo',
          role: 'catalog-maintainer',
          active: true,
        },
      ],
    }),
  );
  const child = spawn(process.execPath, [serverEntry], {
    stdio: 'ignore',
    env: { ...process.env, PORT: String(port), WEBSTORE_DATA_FILE: dataFile },
  });
  const login = async (email, password) => {
    const response = await fetch(`http://localhost:${port}/bff/admin/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.ok ? (await response.json()).user.role : response.status;
  };
  try {
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        await fetch(`http://localhost:${port}/health`);
        break;
      } catch {
        await sleep(100);
      }
    }
    assert.equal(await login('owner@webstore.demo', 'WebStore#2026'), 'superadmin');
    assert.equal(await login('catalogo@webstore.demo', 'Catalogo#2026'), 'vendedor');
    assert.equal(await login('admin@webstore.demo', 'Admin#2026'), 'admin');
  } finally {
    child.kill();
    await sleep(100);
    await unlink(dataFile).catch(() => {});
  }
});
