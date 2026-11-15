import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// La regla del correo se antepone porque el archivo se transpila sin sus import (PBI-0080).
const source = [
  await readFile(new URL('./correo.rules.ts', import.meta.url), 'utf8'),
  await readFile(new URL('./resumen.rules.ts', import.meta.url), 'utf8'),
].join('\n');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  fechaEnLima,
  tramosDeComparacion,
  clientesNuevosPorFecha,
  variacionPorcentual,
  calcularIndicadores,
  serieDelMes,
  distritosConMasPedidos,
  ultimosPedidos,
  distribucionPorEstado,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

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

const venta = (createdAt, total, customerEmail, status = 'delivered') => ({
  id: `P-${createdAt}-${customerEmail}`,
  createdAt,
  total,
  customerEmail,
  status,
});
const clientesDe = (cantidad) => Array.from({ length: cantidad }, (_, i) => ({ id: `c-${i + 1}` }));
// 15/11/2026 12:00 en Lima: el mes en curso va del 1 al 15/11 y el anterior, del 1 al 15/10.
const ahora = new Date('2026-11-15T17:00:00Z');

test('los totales cuentan todos los pedidos, las ventas sin cancelados y todos los clientes', () => {
  const { pedidos, ventas, clientes } = calcularIndicadores(
    [
      venta('2026-11-02T15:00:00Z', 100.1, 'ana@correo.pe', 'confirmed'),
      venta('2026-11-03T15:00:00Z', 50.2, 'ana@correo.pe'),
      venta('2026-10-10T15:00:00Z', 30, 'luis@correo.pe', 'cancelled'),
      venta('2025-09-01T15:00:00Z', 20.05, 'rosa@correo.pe'),
    ],
    clientesDe(4),
    ahora,
  );
  assert.equal(pedidos.total, 4, 'el pedido cancelado cuenta como pedido');
  assert.equal(ventas.total, 170.35, 'suma el total sin cancelados y redondea a céntimos');
  assert.equal(clientes.total, 4, 'incluye al cliente sin pedidos');
});

test('la variación es el cambio en % entero y no existe cuando el tramo anterior vale 0', () => {
  assert.equal(variacionPorcentual(3, 2), 50, 'subida');
  assert.equal(variacionPorcentual(1, 4), -75, 'bajada');
  assert.equal(variacionPorcentual(2, 2), 0, 'igual');
  assert.equal(variacionPorcentual(1, 3), -67, 'redondea al entero más cercano');
  assert.equal(variacionPorcentual(0, 7), -100, 'actual 0 con anterior mayor que 0');
  assert.equal(variacionPorcentual(5, 0), null, 'anterior 0: sin porcentaje');
  assert.equal(variacionPorcentual(0, 0), null);
  assert.ok(Object.is(variacionPorcentual(1999, 2000), 0), 'un cambio menor a medio punto es 0, no -0');
});

test('las variaciones comparan el mes en curso con el mismo tramo del mes anterior', () => {
  const { pedidos, ventas, clientes } = calcularIndicadores(
    [
      venta('2026-11-02T15:00:00Z', 100, 'ana@correo.pe', 'confirmed'),
      venta('2026-11-03T15:00:00Z', 50, 'ana@correo.pe'),
      venta('2026-11-04T15:00:00Z', 40, 'luis@correo.pe', 'cancelled'),
      venta('2026-11-20T15:00:00Z', 999, 'zeta@correo.pe'),
      venta('2026-10-05T15:00:00Z', 60, 'ana@correo.pe'),
      venta('2026-10-06T15:00:00Z', 500, 'bea@correo.pe', 'cancelled'),
      venta('2026-10-20T15:00:00Z', 1000, 'ana@correo.pe'),
    ],
    clientesDe(5),
    ahora,
  );
  assert.equal(pedidos.variacion, 50, '3 pedidos del 1 al 15/11 contra 2 del 1 al 15/10');
  assert.equal(ventas.variacion, 150, '150 contra 60: los cancelados no cuentan en las ventas');
  assert.equal(clientes.variacion, -50, 'luis es el único nuevo del tramo actual; ana y bea, del anterior');
});

test('sin pedidos en el tramo anterior no hay variación; sin pedidos en el actual es -100', () => {
  const soloNoviembre = calcularIndicadores(
    [venta('2026-11-02T15:00:00Z', 100, 'ana@correo.pe')],
    clientesDe(1),
    ahora,
  );
  assert.deepEqual(
    [soloNoviembre.pedidos.variacion, soloNoviembre.ventas.variacion, soloNoviembre.clientes.variacion],
    [null, null, null],
  );
  const soloOctubre = calcularIndicadores(
    [venta('2026-10-02T15:00:00Z', 100, 'ana@correo.pe')],
    clientesDe(1),
    ahora,
  );
  assert.deepEqual(
    [soloOctubre.pedidos.variacion, soloOctubre.ventas.variacion, soloOctubre.clientes.variacion],
    [-100, -100, -100],
  );
  const igual = calcularIndicadores(
    [venta('2026-10-02T15:00:00Z', 80, 'ana@correo.pe'), venta('2026-11-02T15:00:00Z', 80, 'bea@correo.pe')],
    clientesDe(2),
    ahora,
  );
  assert.deepEqual([igual.pedidos.variacion, igual.ventas.variacion, igual.clientes.variacion], [0, 0, 0]);
  const vacio = calcularIndicadores([], [], ahora);
  assert.deepEqual(vacio, {
    pedidos: { total: 0, variacion: null },
    ventas: { total: 0, variacion: null },
    clientes: { total: 0, variacion: null },
  });
});

test('la serie tiene un punto por día del mes en curso de Lima y cuenta por día de Lima', () => {
  const serie = serieDelMes(
    [
      venta('2026-11-01T05:00:00Z', 10, 'dora@correo.pe'),
      venta('2026-11-01T03:00:00Z', 10, 'carla@correo.pe'),
      venta('2026-11-03T15:00:00Z', 10, 'ana@correo.pe'),
      venta('2026-11-03T20:00:00Z', 10, 'ana@correo.pe'),
      venta('2026-11-08T15:00:00Z', 10, 'ana@correo.pe', 'cancelled'),
      venta('2026-11-08T16:00:00Z', 10, 'bea@correo.pe'),
      venta('2026-10-20T15:00:00Z', 10, 'bea@correo.pe'),
      venta('2026-12-01T04:30:00Z', 10, 'luis@correo.pe'),
      venta('2026-12-05T15:00:00Z', 10, 'luis@correo.pe'),
    ],
    ahora,
  );
  assert.deepEqual(
    serie.map((punto) => punto.dia),
    Array.from({ length: 30 }, (_, i) => i + 1),
    'noviembre tiene 30 días',
  );
  const con = serie.filter((punto) => punto.pedidos || punto.clientesNuevos);
  assert.deepEqual(con, [
    { dia: 1, pedidos: 1, clientesNuevos: 1 }, // 00:00 de Lima; 03:00 Z del mismo día es el 31/10 y no entra
    { dia: 3, pedidos: 2, clientesNuevos: 1 },
    { dia: 8, pedidos: 2, clientesNuevos: 0 }, // bea ya era cliente nueva en octubre
    { dia: 30, pedidos: 1, clientesNuevos: 1 }, // 23:30 de Lima del 30/11
  ]);
});

test('la serie cubre febrero, bisiesto y diciembre, y sin pedidos queda toda en cero', () => {
  const largo = (fecha) => serieDelMes([], new Date(fecha)).length;
  assert.equal(largo('2026-02-10T17:00:00Z'), 28);
  assert.equal(largo('2028-02-10T17:00:00Z'), 29);
  assert.equal(largo('2026-12-31T17:00:00Z'), 31);
  assert.equal(largo('2026-12-01T04:30:00Z'), 30, 'el 01/12 04:30 Z todavía es el 30/11 en Lima');
  assert.ok(serieDelMes([], ahora).every((punto) => punto.pedidos === 0 && punto.clientesNuevos === 0));
});

const enDistrito = (district, status = 'delivered') => ({ district, status });

test('los distritos con más pedidos van de mayor a menor, con cancelados y empate por nombre', () => {
  const pedidos = [
    enDistrito('Miraflores'),
    enDistrito('miraflores'),
    enDistrito(' MIRAFLORES '),
    enDistrito('Surco'),
    enDistrito('Surco', 'cancelled'),
    enDistrito('surco'),
    enDistrito('San Isidro'),
    enDistrito('Barranco'),
    enDistrito('San Isidro'),
    enDistrito('Barranco'),
    enDistrito('Lince'),
    enDistrito('Comas'),
    enDistrito('Ate'),
  ];
  assert.deepEqual(distritosConMasPedidos(pedidos), [
    { distrito: 'Miraflores', pedidos: 3 }, // «miraflores» y «Miraflores» son uno; se muestra la primera forma escrita
    { distrito: 'Surco', pedidos: 3 }, // empata con Miraflores: por nombre; el cancelado cuenta
    { distrito: 'Barranco', pedidos: 2 },
    { distrito: 'San Isidro', pedidos: 2 },
    { distrito: 'Ate', pedidos: 1 }, // de Ate, Comas y Lince solo cabe uno: el primero por nombre
  ]);
  assert.equal(distritosConMasPedidos(pedidos, 2).length, 2, 'el límite se puede cambiar');
  assert.deepEqual(distritosConMasPedidos([enDistrito('Surco'), enDistrito('Lince')]), [
    { distrito: 'Lince', pedidos: 1 },
    { distrito: 'Surco', pedidos: 1 },
  ]);
  assert.deepEqual(distritosConMasPedidos([]), []);
});

test('los últimos pedidos van del más nuevo al más antiguo aunque el arreglo llegue desordenado', () => {
  const pedido = (id, createdAt) => ({ id, createdAt });
  const pedidos = [
    pedido('P-3', '2026-11-03T15:00:00Z'),
    pedido('P-7', '2026-11-07T15:00:00Z'),
    pedido('P-1', '2026-11-01T15:00:00Z'),
    pedido('P-6', '2026-11-06T15:00:00Z'),
    pedido('P-5', '2026-11-05T15:00:00Z'),
    pedido('P-2', '2026-11-02T15:00:00Z'),
    pedido('P-4', '2026-11-04T15:00:00Z'),
  ];
  const copia = [...pedidos];
  assert.deepEqual(
    ultimosPedidos(pedidos).map((p) => p.id),
    ['P-7', 'P-6', 'P-5', 'P-4', 'P-3'],
  );
  assert.deepEqual(pedidos, copia, 'no reordena el arreglo recibido');
  assert.deepEqual(
    ultimosPedidos(pedidos.slice(0, 2)).map((p) => p.id),
    ['P-7', 'P-3'],
    'con menos de 5, todos',
  );
  assert.deepEqual(ultimosPedidos([]), []);
});

const conEstados = (...estados) => estados.map((status) => ({ status }));
const porcentajes = (pedidos) => {
  const { completados, enProceso, otros } = distribucionPorEstado(pedidos);
  return [completados, enProceso, otros];
};
const repetir = (status, veces) => Array.from({ length: veces }, () => status);

test('los cinco estados se agrupan en completados, en proceso y otros', () => {
  assert.deepEqual(
    porcentajes(conEstados('delivered', 'confirmed', 'processing', 'shipped', 'cancelled')),
    [20, 60, 20],
    'Entregado; Confirmado, En preparación y Enviado; Cancelado',
  );
});

test('los porcentajes suman siempre 100 con el método del mayor resto', () => {
  const suman100 = (pedidos) => porcentajes(pedidos).reduce((suma, valor) => suma + valor, 0) === 100;
  const iguales = conEstados('delivered', 'confirmed', 'cancelled');
  assert.deepEqual(
    porcentajes(iguales),
    [34, 33, 33],
    '1/1/1: redondear daría 99; el empate de restos favorece al primero',
  );
  const sumaria101 = conEstados('delivered', 'confirmed', ...repetir('cancelled', 4));
  assert.deepEqual(porcentajes(sumaria101), [17, 17, 66], '1/1/4: redondear daría 17+17+67 = 101');
  const sumaria101Otra = conEstados(
    ...repetir('delivered', 2),
    ...repetir('shipped', 5),
    ...repetir('cancelled', 5),
  );
  assert.deepEqual(porcentajes(sumaria101Otra), [17, 42, 41], '2/5/5: redondear daría 17+42+42 = 101');
  const restoEnLosUltimos = conEstados('delivered', ...repetir('processing', 3), ...repetir('cancelled', 3));
  assert.deepEqual(
    porcentajes(restoEnLosUltimos),
    [14, 43, 43],
    '1/3/3: el resto mayor está en los dos últimos',
  );
  for (const pedidos of [iguales, sumaria101, sumaria101Otra, restoEnLosUltimos])
    assert.ok(suman100(pedidos));
  assert.deepEqual(porcentajes(conEstados('cancelled', 'cancelled')), [0, 0, 100]);
});

test('sin pedidos la distribución es 0, 0 y 0', () => {
  assert.deepEqual(distribucionPorEstado([]), { completados: 0, enProceso: 0, otros: 0 });
});
