import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 17 (ADR-0021; confirmado por Sebastián Avila): «Entregas y feriados» del superadministrador. La primera
// fecha de entrega (PBI-0178) y los días no laborables (PBI-0183) los decide el BFF; el Admin repite sus reglas para
// avisar antes de enviar, y las compara con las del BFF.
const fuente = await readFile(new URL('./entrega.rules.ts', import.meta.url), 'utf8');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  REGLAS_DE_PRIMERA_ENTREGA,
  MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE,
  esHoraDeCorte,
  explicacionDeLaRegla,
  aniosDelCalendario,
  diasDelAnio,
  diaDeLaSemana,
  motivoParaNoAgregarDia,
  MODOS_DE_DIRECCION,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

const BFF = '../../../../../../../../backend/src/domain/';

test('PBI-0178: las reglas de la primera fecha son las del BFF, con la de por defecto primero', async () => {
  const {
    REGLAS_DE_PRIMERA_ENTREGA: delBff,
    ENTREGA_POR_DEFECTO,
    esHoraDeCorte: horaDelBff,
  } = await import(new URL(`${BFF}pedidos/primera-fecha-de-entrega.rules.mjs`, import.meta.url));
  assert.deepEqual(REGLAS_DE_PRIMERA_ENTREGA.map((regla) => regla.valor).sort(), [...delBff].sort());
  assert.equal(REGLAS_DE_PRIMERA_ENTREGA[0].valor, ENTREGA_POR_DEFECTO.firstDeliveryDay);
  assert.deepEqual(
    REGLAS_DE_PRIMERA_ENTREGA.map((regla) => regla.etiqueta),
    ['El día calendario siguiente', 'El siguiente día hábil', 'El mismo día'],
  );
  for (const hora of ['', '00:00', '09:30', '23:59', '24:00', '9:30', '12:60', '14:00:00'])
    assert.equal(esHoraDeCorte(hora), horaDelBff(hora), hora);
});

test('PBI-0178: la explicación dice desde cuándo elige el comprador, con y sin hora de corte', () => {
  assert.equal(
    explicacionDeLaRegla('next-calendar-day', ''),
    'El comprador puede elegir desde el día siguiente al pedido, aunque sea sábado, domingo o feriado.',
  );
  assert.equal(
    explicacionDeLaRegla('next-calendar-day', '14:00'),
    'Pedidos hasta las 13:59: desde el día siguiente. Desde las 14:00: desde dos días después.',
  );
  assert.equal(
    explicacionDeLaRegla('same-day', ''),
    'El comprador puede elegir desde el mismo día del pedido.',
  );
  assert.equal(
    explicacionDeLaRegla('same-day', '00:30'),
    'Pedidos hasta las 00:29: desde el mismo día. Desde las 00:30: desde el día siguiente.',
  );
  assert.equal(
    explicacionDeLaRegla('next-business-day', ''),
    'El comprador puede elegir desde el siguiente día hábil: sin sábados, domingos ni días no laborables.',
  );
  assert.equal(
    explicacionDeLaRegla('next-business-day', '14:00'),
    'Pedidos de un día hábil hasta las 13:59: desde el siguiente día hábil. Desde las 14:00: un día hábil después. Los sábados, domingos y días no laborables cuentan como el día hábil siguiente.',
  );
  assert.equal(
    explicacionDeLaRegla('next-calendar-day', '00:00'),
    'Desde las 00:00, todo el día: desde dos días después.',
  );
});

test('PBI-0183: los años del filtro son los del calendario más el actual y el siguiente, en orden', () => {
  const dias = [
    { id: 'a', date: '2025-12-25', name: '' },
    { id: 'b', date: '2026-07-28', name: '' },
  ];
  assert.deepEqual(aniosDelCalendario(dias, '2026'), ['2025', '2026', '2027']);
  assert.deepEqual(aniosDelCalendario([], '2026'), ['2026', '2027']);
});

test('PBI-0183: los días de un año, por fecha', () => {
  const dias = [
    { id: 'c', date: '2026-12-25', name: 'Navidad' },
    { id: 'a', date: '2025-12-25', name: '' },
    { id: 'b', date: '2026-07-28', name: '' },
  ];
  assert.deepEqual(
    diasDelAnio(dias, '2026').map((dia) => dia.id),
    ['b', 'c'],
  );
  assert.deepEqual(diasDelAnio(dias, '2030'), []);
});

test('PBI-0183: el día de la semana de una fecha, sin depender de la zona del navegador', () => {
  assert.equal(diaDeLaSemana('2026-12-25'), 'viernes');
  assert.equal(diaDeLaSemana('2026-07-28'), 'martes');
  assert.equal(diaDeLaSemana('2026-11-29'), 'domingo');
});

test('PBI-0183: no se agrega una fecha vacía, que no existe o repetida, ni un nombre largo', async () => {
  const { MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE: delBff } = await import(
    new URL(`${BFF}calendario/dias-no-laborables.rules.mjs`, import.meta.url)
  );
  assert.equal(MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE, delBff);
  const dias = [{ id: 'a', date: '2026-12-25', name: 'Navidad' }];
  assert.equal(motivoParaNoAgregarDia(dias, '2026-07-28', 'Fiestas Patrias'), null);
  assert.equal(motivoParaNoAgregarDia(dias, '2026-07-28', ''), null);
  assert.equal(motivoParaNoAgregarDia(dias, '', ''), 'Elige una fecha.');
  assert.equal(motivoParaNoAgregarDia(dias, '2026-02-30', ''), 'Elige una fecha válida.');
  assert.equal(motivoParaNoAgregarDia(dias, '2026-12-25', ''), 'El 25/12/2026 ya está en el calendario.');
  assert.equal(
    motivoParaNoAgregarDia(dias, '2026-07-28', 'x'.repeat(61)),
    'El nombre admite hasta 60 caracteres.',
  );
  assert.equal(motivoParaNoAgregarDia(dias, '2026-07-28', ` ${'x'.repeat(60)} `), null);
});

// Lote 19 (ADR-0021, PBI-0006; confirmado por Sebastián Avila): la tienda elige una dirección por pedido o una por
// producto.
test('PBI-0006: los modos de dirección son los del BFF, con el de por defecto primero', async () => {
  const { MODOS_DE_DIRECCION: delBff, MODO_DE_DIRECCION_POR_DEFECTO } = await import(
    new URL(`${BFF}pedidos/direcciones-por-producto.rules.mjs`, import.meta.url)
  );
  assert.deepEqual(MODOS_DE_DIRECCION.map((modo) => modo.valor).sort(), [...delBff].sort());
  assert.equal(MODOS_DE_DIRECCION[0].valor, MODO_DE_DIRECCION_POR_DEFECTO);
  assert.deepEqual(
    MODOS_DE_DIRECCION.map((modo) => modo.etiqueta),
    ['Una dirección por pedido', 'Una dirección por producto'],
  );
  for (const modo of MODOS_DE_DIRECCION) assert.ok(modo.explicacion.length > 20, modo.valor);
});
