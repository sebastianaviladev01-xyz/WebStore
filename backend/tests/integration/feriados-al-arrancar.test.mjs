/**
 * Aviso del calendario de días no laborables al arrancar (lote 02, PBI-0010): el BFF registra en su log un aviso si
 * `WEBSTORE_NON_WORKING_DATES` no tiene ninguna fecha del año en curso, y sigue arrancando.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fechaDeLima, serverEntry, sleep } from './apoyo/servidor.mjs';

/** Arranca el BFF con `feriados`, lee su log hasta que escucha y lo detiene; devuelve lo que escribió. */
async function logDeArranque(port, feriados) {
  const dataFile = join(tmpdir(), `webstore-feriados-${port}-${process.pid}.json`);
  const env = { ...process.env, PORT: String(port), WEBSTORE_DATA_FILE: dataFile };
  delete env.WEBSTORE_NON_WORKING_DATES;
  if (feriados !== undefined) env.WEBSTORE_NON_WORKING_DATES = feriados;
  const child = spawn(process.execPath, [serverEntry], { stdio: ['ignore', 'pipe', 'pipe'], env });
  let salida = '';
  child.stdout.on('data', (trozo) => (salida += trozo));
  child.stderr.on('data', (trozo) => (salida += trozo));
  try {
    for (let intento = 0; intento < 50 && !salida.includes(`localhost:${port}`); intento++) await sleep(100);
    assert.match(salida, new RegExp(`localhost:${port}`), 'el BFF no arrancó');
    return salida;
  } finally {
    child.kill();
    await sleep(150);
    await unlink(dataFile).catch(() => {});
  }
}

const anio = fechaDeLima().slice(0, 4);

test('sin ninguna fecha del año en curso, el BFF arranca y deja un aviso en su log', async () => {
  const salida = await logDeArranque(3140, `${Number(anio) - 1}-12-25`);
  assert.match(salida, new RegExp(`WEBSTORE_NON_WORKING_DATES.*${anio}`));
});

test('sin la variable, también avisa', async () => {
  assert.match(await logDeArranque(3141), /WEBSTORE_NON_WORKING_DATES/);
});

test('con una fecha del año en curso, no avisa', async () => {
  const salida = await logDeArranque(3142, `${anio}-12-25`);
  assert.doesNotMatch(salida, /WEBSTORE_NON_WORKING_DATES/);
});
