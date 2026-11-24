/**
 * TEST-11: levanta el BFF real con un archivo de estado temporal (nunca `backend/data.json`) y comprueba la
 * migración `schemaVersion: 3` en el archivo guardado y por HTTP: `/bff/content/settings` sin colores y
 * `/bff/appearance` con el tema migrado activo (o `b` si no había archivo).
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
    let apariencia;
    await conBff(3109, dataFile, async (base) => {
      publicas = await (await fetch(`${base}/bff/content/settings`)).json();
      apariencia = await (await fetch(`${base}/bff/appearance`)).json();
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
    assert.equal(apariencia.activeThemeId, tema.id);
    assert.equal(apariencia.themes.length, 1);
    assert.equal(apariencia.themes[0].name, 'Colores de Contenido');
    assert.equal(apariencia.themes[0].tokens['--ws-primary'], '#123456');

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
    let apariencia;
    await conBff(3110, dataFile, async (base) => {
      publicas = await (await fetch(`${base}/bff/content/settings`)).json();
      apariencia = await (await fetch(`${base}/bff/appearance`)).json();
    });
    assert.equal(apariencia.activeThemeId, 'b');
    assert.ok(!('primaryColor' in publicas) && !('secondaryColor' in publicas));
    const guardado = JSON.parse(await readFile(dataFile, 'utf8'));
    assert.deepEqual(guardado.appearance, { revision: 0, activeThemeId: 'b', customThemes: [] });
  } finally {
    await unlink(dataFile).catch(() => {});
  }
});

// Lote 03 (PBI-0068): un tema propio inválido en el archivo de datos ya no deja al BFF respondiendo 500.
test('un tema propio con un color inválido se descarta al arrancar, se avisa en el log y la apariencia responde 200', async () => {
  const dataFile = join(tmpdir(), `webstore-temas-invalidos-${process.pid}.json`);
  const coloresDeB = { background: '#F3F5F8', surface: '#FFFFFF', contrast: '#0F172A' };
  const bueno = {
    id: 't-bueno',
    name: 'Bueno',
    colors: { primary: '#123456', secondary: '#654321', ...coloresDeB },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const roto = {
    ...bueno,
    id: 't-roto',
    name: 'Roto',
    colors: { ...bueno.colors, primary: 'red;}body{display:none' },
  };
  await writeFile(
    dataFile,
    JSON.stringify({
      schemaVersion: 3,
      appearance: { revision: 2, activeThemeId: 't-roto', customThemes: [roto, bueno] },
    }),
  );
  const child = spawn(process.execPath, [serverEntry], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3170', WEBSTORE_DATA_FILE: dataFile, WEBSTORE_DEMO_MODE: 'true' },
  });
  let log = '';
  child.stdout.on('data', (trozo) => (log += trozo));
  child.stderr.on('data', (trozo) => (log += trozo));
  const base = 'http://localhost:3170';
  try {
    for (let intento = 0; intento < 50; intento++) {
      try {
        if ((await fetch(`${base}/health`)).ok) break;
      } catch {
        await sleep(100);
      }
    }
    const apariencia = await fetch(`${base}/bff/appearance`);
    assert.equal(apariencia.status, 200);
    const cuerpo = await apariencia.json();
    assert.equal(cuerpo.activeThemeId, 'b', 'el activo era el descartado: queda B');
    // Desde el lote 14 (PBI-0188, ADR-0022) la apariencia de la demo no publica los temas propios que no están activos:
    // que el bueno sigue guardado se ve en la lista del Admin.
    assert.deepEqual(
      cuerpo.themes.map(({ id }) => id),
      ['a', 'b', 'c'],
    );
    const sesion = await (
      await fetch(`${base}/bff/admin/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'owner@webstore.demo', password: 'WebStore#2026' }),
      })
    ).json();
    const temasAdmin = await (
      await fetch(`${base}/bff/admin/themes`, { headers: { authorization: `Bearer ${sesion.token}` } })
    ).json();
    assert.deepEqual(
      temasAdmin.themes.map(({ id }) => id),
      ['a', 'b', 'c', 't-bueno'],
    );
    const hoja = await fetch(`${base}/bff/appearance/theme.css`);
    assert.equal(hoja.status, 200);
    assert.doesNotMatch(await hoja.text(), /display:none/);
    assert.match(log, /Tema propio descartado.*t-roto.*INVALID_THEME_COLOR|INVALID_THEME_COLOR.*t-roto/);
    assert.match(log, /El tema activo «t-roto» no existe/);
  } finally {
    child.kill();
    await sleep(150);
  }
  try {
    const guardado = JSON.parse(await readFile(dataFile, 'utf8'));
    assert.deepEqual(guardado.appearance, { revision: 2, activeThemeId: 'b', customThemes: [bueno] });
  } finally {
    await unlink(dataFile).catch(() => {});
  }
});
