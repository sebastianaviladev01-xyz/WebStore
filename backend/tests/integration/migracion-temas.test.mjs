/**
 * TEST-11 (parte sin rutas nuevas): levanta el BFF real con un archivo de estado temporal (nunca
 * `backend/data.json`) y comprueba la migración `schemaVersion: 3` en el archivo guardado y por HTTP.
 * La parte de `/bff/appearance` llega con sus rutas (TASK-11).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverEntry = fileURLToPath(new URL('../../src/main.mjs', import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = async (file) =>
  createHash('sha256')
    .update(await readFile(file))
    .digest('hex');

/** Arranca el BFF sobre `dataFile`, espera a `/health`, ejecuta `alArrancar` y lo detiene. */
async function conBff(port, dataFile, alArrancar = async () => {}) {
  const child = spawn(process.execPath, [serverEntry], {
    stdio: 'ignore',
    env: { ...process.env, PORT: String(port), WEBSTORE_DATA_FILE: dataFile },
  });
  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await fetch(`http://localhost:${port}/health`);
        break;
      } catch {
        await sleep(100);
      }
    }
    await alArrancar(`http://localhost:${port}`);
  } finally {
    child.kill();
    await sleep(150);
  }
}

test('un estado v2 con colores propios se migra a «Colores de Contenido» activo y un segundo arranque no lo cambia', async () => {
  const dataFile = join(tmpdir(), `webstore-temas-v2-${process.pid}.json`);
  // Estado guardado por la versión anterior: schemaVersion 2 y colores propios en Contenido.
  await writeFile(
    dataFile,
    JSON.stringify({
      schemaVersion: 2,
      revision: 3,
      config: { storeName: 'Tienda migrada', primaryColor: '#123456', secondaryColor: '#654321' },
    }),
  );
  try {
    let publicas;
    await conBff(3109, dataFile, async (base) => {
      publicas = await (await fetch(`${base}/bff/content/settings`)).json();
    });
    assert.equal(publicas.storeName, 'Tienda migrada');
    assert.ok(!('primaryColor' in publicas) && !('secondaryColor' in publicas));

    const guardado = JSON.parse(await readFile(dataFile, 'utf8'));
    assert.equal(guardado.schemaVersion, 3);
    assert.ok(!('primaryColor' in guardado.config) && !('secondaryColor' in guardado.config));
    const [tema] = guardado.appearance.customThemes;
    assert.equal(guardado.appearance.customThemes.length, 1);
    assert.equal(tema.name, 'Colores de Contenido');
    assert.deepEqual(tema.colors, {
      primary: '#123456',
      secondary: '#654321',
      background: '#F3F5F8',
      surface: '#FFFFFF',
      contrast: '#0F172A',
    });
    assert.equal(guardado.appearance.activeThemeId, tema.id);
    assert.equal(guardado.appearance.revision, 0);

    const hashTrasMigrar = await sha256(dataFile);
    await conBff(3109, dataFile);
    assert.equal(
      await sha256(dataFile),
      hashTrasMigrar,
      'el segundo arranque reescribió el archivo distinto',
    );
  } finally {
    await unlink(dataFile).catch(() => {});
  }
});

test('un BFF sin archivo de estado arranca con B activo y Contenido sin colores', async () => {
  const dataFile = join(tmpdir(), `webstore-temas-nuevo-${process.pid}.json`);
  await unlink(dataFile).catch(() => {});
  try {
    let publicas;
    await conBff(3110, dataFile, async (base) => {
      publicas = await (await fetch(`${base}/bff/content/settings`)).json();
    });
    assert.ok(!('primaryColor' in publicas) && !('secondaryColor' in publicas));
    const guardado = JSON.parse(await readFile(dataFile, 'utf8'));
    assert.deepEqual(guardado.appearance, { revision: 0, activeThemeId: 'b', customThemes: [] });
  } finally {
    await unlink(dataFile).catch(() => {});
  }
});
