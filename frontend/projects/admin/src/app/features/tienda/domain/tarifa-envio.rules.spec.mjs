import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./tarifa-envio.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  leerDistritos,
  asignarPrecioTarifa,
  ajustarPreciosTarifas,
  filtrarTarifas,
  borradorDeTarifasVigente,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

const rate = (id, origin, destination, price) => ({ id, origin, destination, price });
let sequence = 0;
const newId = () => `new-${++sequence}`;

test('los distritos se leen por línea o coma, sin vacíos ni repetidos', () => {
  assert.deepEqual(leerDistritos('Miraflores, Surco\nmiraflores;;\n  Barranco  '), [
    'Miraflores',
    'Surco',
    'Barranco',
  ]);
});

test('un precio para varios distritos actualiza los existentes y crea los que faltan', () => {
  const rates = [rate('r1', 'San Isidro', 'Miraflores', 10), rate('r2', 'Callao', 'Miraflores', 20)];
  const next = asignarPrecioTarifa(rates, 'san isidro', ['MIRAFLORES', 'Surco'], 12.5, newId);
  assert.equal(next.find((item) => item.id === 'r1').price, 12.5);
  assert.equal(next.find((item) => item.id === 'r2').price, 20, 'otro origen no cambia');
  const created = next.find((item) => item.destination === 'Surco');
  assert.deepEqual({ origin: created.origin, price: created.price }, { origin: 'san isidro', price: 12.5 });
  assert.equal(next.length, 3);
});

test('el ajuste porcentual redondea a céntimos y puede limitarse a un origen', () => {
  const rates = [rate('r1', 'San Isidro', 'Miraflores', 10), rate('r2', 'Callao', 'Surco', 15)];
  assert.deepEqual(
    ajustarPreciosTarifas(rates, 7.5, null).map((item) => item.price),
    [10.75, 16.13],
  );
  assert.deepEqual(
    ajustarPreciosTarifas(rates, -10, 'callao').map((item) => item.price),
    [10, 13.5],
  );
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

// Lote 07b (ADR-0017), PBI-0157: lo escrito en Tarifas de envío cuando vence la sesión, con sus modos.
const VACIO = { origin: '', destinations: '', price: 0 };
const SIN_AJUSTE = { percent: 0, origin: '' };

test('PBI-0157: el borrador de una tarifa en edición vuelve a esa edición si la tarifa sigue existiendo', () => {
  const base = rate('r1', 'San Isidro', 'Miraflores', 10);
  const borrador = {
    editando: base,
    tarifa: { origin: 'San Isidro', destinations: 'Miraflores', price: 14 },
    ajuste: SIN_AJUSTE,
  };
  assert.deepEqual(
    borradorDeTarifasVigente(borrador, [rate('r1', 'San Isidro', 'Miraflores', 11)]),
    borrador,
  );
});

test('PBI-0157: si la tarifa en edición ya no existe, no se restaura esa edición (no se vuelve a crear)', () => {
  const borrador = {
    editando: rate('r9', 'Callao', 'Comas', 8),
    tarifa: { origin: 'Callao', destinations: 'Comas', price: 9 },
    ajuste: SIN_AJUSTE,
  };
  assert.equal(borradorDeTarifasVigente(borrador, [rate('r1', 'San Isidro', 'Miraflores', 10)]), null);
  const conAjuste = { ...borrador, ajuste: { percent: 5, origin: 'Callao' } };
  assert.deepEqual(borradorDeTarifasVigente(conAjuste, []), {
    editando: null,
    tarifa: VACIO,
    ajuste: { percent: 5, origin: 'Callao' },
  });
});

test('PBI-0157: el precio para varios distritos y el ajuste porcentual se restauran tal como estaban', () => {
  const borrador = {
    editando: null,
    tarifa: { origin: 'Callao', destinations: 'Comas, Ate', price: 12 },
    ajuste: { percent: -3, origin: '' },
  };
  assert.deepEqual(borradorDeTarifasVigente(borrador, []), borrador);
  assert.equal(borradorDeTarifasVigente({ editando: null, tarifa: VACIO, ajuste: SIN_AJUSTE }, []), null);
});
