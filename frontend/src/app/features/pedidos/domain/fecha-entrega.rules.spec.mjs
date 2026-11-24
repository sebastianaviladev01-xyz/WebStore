/**
 * Fecha de entrega del checkout en la fecha de Lima, no en UTC (PBI-0096, parte de la tienda; lote 04, ADR-0017).
 * Lima es UTC−5 todo el año: entre las 19:00 y las 23:59 de Lima, en UTC ya es el día siguiente. Desde el lote 17
 * (ADR-0021, PBI-0178; provisional) la primera fecha la calcula el BFF con la configuración de la tienda: la tienda la
 * usa como mínimo del campo y como fecha propuesta.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./fecha-entrega.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fechaDeLima, fechaDeEntregaPropuesta, fechaVisible, esFechaDeEntregaValida, esCambioDeFechaValido } =
  await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

test('fechaDeLima: a las 21:30 de Lima del 14 de noviembre sigue siendo el 14, aunque en UTC sea el 15', () => {
  assert.equal(fechaDeLima(new Date('2026-11-15T02:30:00Z')), '2026-11-14');
});

test('fechaDeLima: a medianoche de Lima ya es el día siguiente', () => {
  assert.equal(fechaDeLima(new Date('2026-11-15T05:00:00Z')), '2026-11-15');
  assert.equal(fechaDeLima(new Date('2026-11-15T04:59:59Z')), '2026-11-14');
});

test('lote 17: la fecha propuesta es la primera que permite la tienda, si no se eligió una válida después', () => {
  const primera = '2026-11-24';
  assert.equal(fechaDeEntregaPropuesta('', primera), '2026-11-24');
  assert.equal(fechaDeEntregaPropuesta('2026-11-23', primera), '2026-11-24', 'una anterior se reemplaza');
  assert.equal(
    fechaDeEntregaPropuesta('2026-02-30', primera),
    '2026-11-24',
    'una que no existe se reemplaza',
  );
  assert.equal(fechaDeEntregaPropuesta('2026-11-24', primera), '2026-11-24');
  assert.equal(
    fechaDeEntregaPropuesta('2026-12-05', primera),
    '2026-12-05',
    'la que eligió el comprador se queda',
  );
});

test('lote 17: la fecha se muestra como DD/MM/AAAA en los mensajes', () => {
  assert.equal(fechaVisible('2026-11-24'), '24/11/2026');
  assert.equal(fechaVisible('2027-01-05'), '05/01/2027');
});

test('esFechaDeEntregaValida: desde la primera fecha en adelante, y solo fechas que existen', () => {
  const primera = '2026-11-14';
  assert.equal(esFechaDeEntregaValida('2026-11-14', primera), true);
  assert.equal(esFechaDeEntregaValida('2026-12-01', primera), true);
  assert.equal(esFechaDeEntregaValida('2026-11-13', primera), false);
  assert.equal(esFechaDeEntregaValida('2026-02-30', '2026-01-01'), false);
  assert.equal(esFechaDeEntregaValida('', primera), false);
  assert.equal(esFechaDeEntregaValida('14/11/2026', primera), false);
});

test('PBI-0146 (lote 05): en el detalle del pedido vale desde la primera fecha, o la fecha que el pedido ya tiene', () => {
  const primera = '2026-11-14';
  assert.equal(esCambioDeFechaValido('2026-11-14', primera, '2026-11-16'), true);
  assert.equal(esCambioDeFechaValido('2026-11-20', primera, '2026-11-16'), true);
  assert.equal(esCambioDeFechaValido('2026-11-13', primera, '2026-11-16'), false);
  assert.equal(esCambioDeFechaValido('2020-01-01', primera, '2026-11-16'), false);
  // El BFF acepta reenviar la fecha que el pedido ya tiene aunque haya pasado (BFF-CONTRACT, «Reglas del checkout»).
  assert.equal(esCambioDeFechaValido('2026-11-10', primera, '2026-11-10'), true);
  assert.equal(esCambioDeFechaValido('', primera, '2026-11-16'), false);
});
