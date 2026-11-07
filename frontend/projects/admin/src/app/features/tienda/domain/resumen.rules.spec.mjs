import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./resumen.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fechaEnLima, tramosDeComparacion, clientesNuevosPorFecha } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('la fecha de Lima de un instante no depende de la zona del equipo', () => {
  assert.deepEqual(fechaEnLima('2026-11-01T03:00:00Z'), { anio: 2026, mes: 10, dia: 31 }, '22:00 del 31/10');
  assert.deepEqual(fechaEnLima('2026-11-01T05:00:00Z'), { anio: 2026, mes: 11, dia: 1 }, '00:00 del 01/11');
  assert.deepEqual(fechaEnLima(new Date('2027-01-01T04:59:59Z')), { anio: 2026, mes: 12, dia: 31 });
});

test('los tramos de comparación van del día 1 a hoy y cubren el mes anterior más corto', () => {
  const tramo = (anio, mes, hasta) => ({ anio, mes, desde: 1, hasta });
  assert.deepEqual(tramosDeComparacion({ anio: 2026, mes: 11, dia: 15 }), {
    actual: tramo(2026, 11, 15),
    anterior: tramo(2026, 10, 15),
  });
  assert.deepEqual(
    tramosDeComparacion({ anio: 2026, mes: 3, dia: 31 }),
    { actual: tramo(2026, 3, 31), anterior: tramo(2026, 2, 28) },
    'febrero de 2026 tiene 28 días',
  );
  assert.deepEqual(
    tramosDeComparacion({ anio: 2028, mes: 3, dia: 31 }),
    { actual: tramo(2028, 3, 31), anterior: tramo(2028, 2, 29) },
    'febrero de 2028 es bisiesto',
  );
  assert.deepEqual(
    tramosDeComparacion({ anio: 2026, mes: 1, dia: 15 }),
    { actual: tramo(2026, 1, 15), anterior: tramo(2025, 12, 15) },
    'en enero el anterior es diciembre del año anterior',
  );
  assert.deepEqual(tramosDeComparacion({ anio: 2026, mes: 11, dia: 1 }), {
    actual: tramo(2026, 11, 1),
    anterior: tramo(2026, 10, 1),
  });
});

test('un cliente es nuevo el día de su primer pedido, por correo sin mayúsculas ni espacios', () => {
  const pedido = (customerEmail, createdAt, status = 'confirmed') => ({ customerEmail, createdAt, status });
  const nuevos = clientesNuevosPorFecha([
    pedido('ana@correo.pe', '2026-11-05T15:00:00Z'),
    pedido('  ANA@correo.pe ', '2026-11-03T15:00:00Z'),
    pedido('ana@correo.pe', '2026-11-08T15:00:00Z'),
    pedido('luis@correo.pe', '2026-11-10T04:30:00Z'),
    pedido('rosa@correo.pe', '2026-11-02T15:00:00Z', 'cancelled'),
    pedido('rosa@correo.pe', '2026-11-08T15:00:00Z', 'delivered'),
  ]);
  assert.deepEqual(
    [...nuevos].sort(([a], [b]) => a.localeCompare(b)),
    [
      ['ana@correo.pe', { anio: 2026, mes: 11, dia: 3 }],
      ['luis@correo.pe', { anio: 2026, mes: 11, dia: 9 }],
      ['rosa@correo.pe', { anio: 2026, mes: 11, dia: 2 }],
    ],
    'ana: el primer pedido aunque llegue desordenado; luis: 23:30 de Lima; rosa: el cancelado también cuenta',
  );
  assert.equal(nuevos.has('sin-pedidos@correo.pe'), false, 'un cliente sin pedidos no aparece');
  assert.equal(clientesNuevosPorFecha([]).size, 0);
});
