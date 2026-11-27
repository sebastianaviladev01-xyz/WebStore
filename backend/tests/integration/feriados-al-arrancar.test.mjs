/**
 * Aviso del calendario de días no laborables al arrancar (lote 02, PBI-0010). Desde el lote 17 (ADR-0021, PBI-0183;
 * confirmado por Sebastián Avila) el calendario vive en el estado del BFF y se edita en el Admin:
 * `WEBSTORE_NON_WORKING_DATES` solo da el valor inicial de un estado sin lista. El BFF avisa en su log si el calendario
 * no tiene ninguna fecha del año en curso, y sigue arrancando.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fechaDeLima, serverEntry, sleep } from './apoyo/servidor.mjs';

/**
 * Arranca el BFF con `feriados` en la variable y, si se da, un estado guardado; lee su log hasta que escucha y lo
 * detiene. Devuelve lo que escribió y el estado que guardó.
 */
async function arrancar(port, feriados, estado) {
  const dataFile = join(tmpdir(), `webstore-feriados-${port}-${process.pid}.json`);
  await unlink(dataFile).catch(() => {});
  if (estado) await writeFile(dataFile, JSON.stringify(estado));
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
    return { salida, guardado: JSON.parse(await readFile(dataFile, 'utf8')) };
  } finally {
    child.kill();
    await sleep(150);
    await unlink(dataFile).catch(() => {});
  }
}

const anio = fechaDeLima().slice(0, 4);

test('sin ninguna fecha del año en curso, el BFF arranca y deja un aviso en su log', async () => {
  const { salida } = await arrancar(3140, `${Number(anio) - 1}-12-25`);
  assert.match(salida, new RegExp(`días no laborables.*${anio}`));
});

test('sin la variable ni lista guardada, el calendario empieza vacío y avisa', async () => {
  const { salida, guardado } = await arrancar(3141);
  assert.match(salida, /días no laborables/);
  assert.deepEqual(guardado.nonWorkingDates, []);
});

test('la variable da el calendario inicial: con una fecha del año en curso, no avisa y la guarda', async () => {
  const { salida, guardado } = await arrancar(3142, `${anio}-12-25`);
  assert.doesNotMatch(salida, /días no laborables/);
  assert.deepEqual(guardado.nonWorkingDates, [{ id: `${anio}-12-25`, date: `${anio}-12-25`, name: '' }]);
});

test('con una lista guardada, la variable ya no cuenta: el aviso mira la lista', async () => {
  const { salida, guardado } = await arrancar(3143, `${anio}-12-25`, { nonWorkingDates: [] });
  assert.match(salida, new RegExp(`días no laborables.*${anio}`));
  assert.deepEqual(guardado.nonWorkingDates, []);
});
