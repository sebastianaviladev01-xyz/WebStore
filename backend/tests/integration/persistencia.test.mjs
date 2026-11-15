/**
 * Persistencia del estado (PBI-0088, lote 01, ADR-0017): un archivo de datos dañado no se reemplaza en silencio
 * por la demo, y cada guardado se escribe en un temporal que después se renombra sobre el archivo real.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { conBff, ingresarAlAdmin, serverEntry } from './apoyo/servidor.mjs';

/** Arranca el BFF y espera a que termine solo (o lo mata a los `ms`); devuelve el código de salida. */
function arrancarHastaSalir(dataFile, ms = 4000) {
  return new Promise((resolve) => {
    const env = { ...process.env, PORT: '3130', WEBSTORE_DATA_FILE: dataFile };
    const child = spawn(process.execPath, [serverEntry], { stdio: 'ignore', env });
    const corte = setTimeout(() => child.kill(), ms);
    child.on('exit', (code) => {
      clearTimeout(corte);
      resolve(code);
    });
  });
}

test('un archivo de datos con JSON cortado detiene el arranque y no se sobrescribe', async () => {
  const dataFile = join(tmpdir(), `webstore-danado-${process.pid}.json`);
  const danado = '{"revision": 4, "orders": [{"id": "WS-1"';
  await writeFile(dataFile, danado);
  try {
    const codigo = await arrancarHastaSalir(dataFile);
    assert.notEqual(codigo, 0, 'el BFF debe terminar con error');
    assert.notEqual(codigo, null, 'el BFF siguió en marcha con un archivo dañado');
    assert.equal(await readFile(dataFile, 'utf8'), danado, 'el archivo dañado se sobrescribió');
  } finally {
    await unlink(dataFile).catch(() => {});
  }
});

test('un archivo de datos que no es un objeto JSON detiene el arranque', async () => {
  const dataFile = join(tmpdir(), `webstore-no-objeto-${process.pid}.json`);
  await writeFile(dataFile, '[]');
  try {
    const codigo = await arrancarHastaSalir(dataFile);
    assert.ok(codigo !== 0 && codigo !== null, `código de salida ${codigo}`);
    assert.equal(await readFile(dataFile, 'utf8'), '[]');
  } finally {
    await unlink(dataFile).catch(() => {});
  }
});

test('el guardado no deja temporales y el archivo queda con JSON válido', async () => {
  const dataFile = join(tmpdir(), `webstore-atomico-${process.pid}.json`);
  await unlink(dataFile).catch(() => {});
  await conBff({ port: 3131, dataFile }, async (base) => {
    await ingresarAlAdmin(base);
    const guardado = JSON.parse(await readFile(dataFile, 'utf8'));
    assert.equal(guardado.adminSessions.length, 1, 'la sesión abierta no se guardó');
    const restos = (await readdir(dirname(dataFile))).filter(
      (nombre) => nombre.startsWith(basename(dataFile)) && nombre !== basename(dataFile),
    );
    assert.deepEqual(restos, [], 'quedaron temporales del guardado');
  });
});
