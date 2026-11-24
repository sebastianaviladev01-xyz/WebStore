import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./tarifa-envio.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleExports = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);
const { asignarPrecioTarifa, filtrarTarifas, borradorDeTarifasVigente } = moduleExports;

const rate = (id, origin, destination, price) => ({ id, origin, destination, price });
let sequence = 0;
const newId = () => `new-${++sequence}`;

test('un precio para varios distritos actualiza los existentes y crea los que faltan', () => {
  const rates = [rate('r1', 'San Isidro', 'Miraflores', 10), rate('r2', 'Callao', 'Miraflores', 20)];
  const next = asignarPrecioTarifa(rates, 'san isidro', ['MIRAFLORES', 'Surco'], 12.5, newId);
  assert.equal(next.find((item) => item.id === 'r1').price, 12.5);
  assert.equal(next.find((item) => item.id === 'r2').price, 20, 'otro origen no cambia');
  const created = next.find((item) => item.destination === 'Surco');
  assert.deepEqual({ origin: created.origin, price: created.price }, { origin: 'san isidro', price: 12.5 });
  assert.equal(next.length, 3);
});

// Lote 21 (ADR-0025): PBI-0217 quita el ajuste porcentual (el precio se cambia tarifa por tarifa) y PBI-0216 elige
// los distritos de una lista, así que ya no se leen de un texto escrito a mano.
test('PBI-0216 y PBI-0217: ya no hay ajuste porcentual ni lectura de distritos escritos a mano', () => {
  assert.equal('ajustarPreciosTarifas' in moduleExports, false);
  assert.equal('leerDistritos' in moduleExports, false);
});

test('la búsqueda ignora tildes y mayúsculas, combina con el origen y ordena', () => {
  const rates = [
    rate('r1', 'San Isidro', 'Jesús María', 9),
    rate('r2', 'Callao', 'Jesús María', 14),
    rate('r3', 'San Isidro', 'Miraflores', 8),
    rate('r4', 'Callao', 'Bellavista', 6),
  ];
  assert.deepEqual(
    filtrarTarifas(rates, '', 'jesus maria').map((item) => item.id),
    ['r2', 'r1'],
    'sin tildes encuentra ambos orígenes, ordenados por origen',
  );
  assert.deepEqual(
    filtrarTarifas(rates, 'San Isidro', 'jesús').map((item) => item.id),
    ['r1'],
  );
  assert.deepEqual(
    filtrarTarifas(rates, '', 'CALLAO').map((item) => item.id),
    ['r4', 'r2'],
    'busca también por origen',
  );
  assert.equal(filtrarTarifas(rates, '', '   ').length, 4, 'búsqueda vacía muestra todo');
  const numbered = [rate('a', 'X', 'Comas 10', 1), rate('b', 'X', 'Comas 2', 1), rate('c', 'X', 'Comas', 1)];
  assert.deepEqual(
    filtrarTarifas(numbered, '', '').map((item) => item.destination),
    ['Comas', 'Comas 2', 'Comas 10'],
  );
});

// Lote 07b (ADR-0017), PBI-0157: lo escrito en Tarifas de envío cuando vence la sesión, con sus modos. Desde el lote 21
// (PBI-0216 y PBI-0217) el borrador es solo la tarifa: los distritos elegidos de la lista y sin el ajuste porcentual.
const VACIO = { origin: '', destinations: [], destination: '', price: 0 };

test('PBI-0157: el borrador de una tarifa en edición vuelve a esa edición si la tarifa sigue existiendo', () => {
  const base = rate('r1', 'San Isidro', 'Miraflores', 10);
  const borrador = {
    editando: base,
    tarifa: { origin: 'San Isidro', destinations: [], destination: 'Miraflores', price: 14 },
  };
  assert.deepEqual(
    borradorDeTarifasVigente(borrador, [rate('r1', 'San Isidro', 'Miraflores', 11)]),
    borrador,
  );
});

test('PBI-0157: si la tarifa en edición ya no existe, no se restaura esa edición (no se vuelve a crear)', () => {
  const borrador = {
    editando: rate('r9', 'Callao', 'Comas', 8),
    tarifa: { origin: 'Callao', destinations: [], destination: 'Comas', price: 9 },
  };
  assert.equal(borradorDeTarifasVigente(borrador, [rate('r1', 'San Isidro', 'Miraflores', 10)]), null);
});

test('PBI-0157 y PBI-0216: el precio para varios distritos elegidos se restaura tal como estaba', () => {
  const borrador = {
    editando: null,
    tarifa: { origin: 'Callao', destinations: ['Comas', 'Ate'], destination: '', price: 12 },
  };
  assert.deepEqual(borradorDeTarifasVigente(borrador, []), borrador);
  assert.equal(borradorDeTarifasVigente({ editando: null, tarifa: VACIO }, []), null);
  assert.deepEqual(
    borradorDeTarifasVigente({ editando: null, tarifa: { ...VACIO, destinations: ['Ate'] } }, []),
    { editando: null, tarifa: { ...VACIO, destinations: ['Ate'] } },
    'un distrito elegido, sin origen ni precio, ya es algo que restaurar',
  );
});
