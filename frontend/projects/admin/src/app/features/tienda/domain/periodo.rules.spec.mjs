import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 45 (ADR-0033, PBI-0270): el filtro principal del Dashboard, como el panel del SGC. Cada periodo se compara con
// el tramo equivalente anterior, con los límites de los días en hora de Lima y el reloj que recibe la regla (el
// instante en que se abrió el Dashboard o se pulsó «Actualizar»), nunca el del equipo.
const fuente = (await readFile(new URL('./periodo.rules.ts', import.meta.url), 'utf8')).replace(
  /^import .*$/gm,
  '',
);
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  PERIODOS,
  PERIODO_POR_OMISION,
  leerPeriodo,
  opcionDelPeriodo,
  tramosDelPeriodo,
  estaEnTramo,
  fechaDelEncabezado,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

/** Un tramo con sus límites como ISO en UTC, para leer los casos: `desde` incluido y `hasta` excluido. */
const iso = ({ desde, hasta }) => ({
  desde: new Date(desde).toISOString(),
  hasta: new Date(hasta).toISOString(),
});
const tramos = (periodo, ahora) => {
  const { actual, anterior } = tramosDelPeriodo(periodo, new Date(ahora));
  return { actual: iso(actual), anterior: iso(anterior) };
};
/** Medianoche de Lima de una fecha civil (`2026-11-26`): las 05:00 en UTC; Lima no tiene horario de verano. */
const dia = (fecha) => `${fecha}T05:00:00.000Z`;

// 26/11/2026, 10:30 en Lima (jueves).
const AHORA = '2026-11-26T15:30:00Z';

test('la lista «Periodo» tiene los seis periodos del SGC y «Mes actual» es el de por omisión', () => {
  assert.deepEqual(
    PERIODOS.map((opcion) => [opcion.valor, opcion.etiqueta]),
    [
      ['hoy', 'Hoy'],
      ['7-dias', 'Últimos 7 días'],
      ['30-dias', 'Últimos 30 días'],
      ['mes', 'Mes actual'],
      ['trimestre', 'Trimestre actual'],
      ['anio', 'Año actual'],
    ],
  );
  assert.equal(PERIODO_POR_OMISION, 'mes');
});

test('el periodo se lee de la URL; sin él, o con uno que no existe, es «Mes actual»', () => {
  for (const valor of ['hoy', '7-dias', '30-dias', 'mes', 'trimestre', 'anio'])
    assert.equal(leerPeriodo(valor), valor);
  for (const valor of [null, undefined, '', 'MES', 'semana', 'constructor', '__proto__'])
    assert.equal(leerPeriodo(valor), 'mes', String(valor));
});

test('cada periodo dice contra qué se compara y qué falta cuando el tramo anterior no tiene datos', () => {
  assert.deepEqual(
    PERIODOS.map(({ valor }) => [opcionDelPeriodo(valor).comparacion, opcionDelPeriodo(valor).sinDatos]),
    [
      ['frente a ayer a la misma hora', 'Sin datos de ayer'],
      ['frente a los 7 días anteriores', 'Sin datos de los 7 días anteriores'],
      ['frente a los 30 días anteriores', 'Sin datos de los 30 días anteriores'],
      ['frente al mismo tramo del mes anterior', 'Sin datos del mes anterior'],
      ['frente al mismo tramo del trimestre anterior', 'Sin datos del trimestre anterior'],
      ['frente al mismo tramo del año anterior', 'Sin datos del año anterior'],
    ],
  );
});

test('«Hoy» es el día de Lima y se compara con ayer hasta la misma hora', () => {
  assert.deepEqual(tramos('hoy', AHORA), {
    actual: { desde: dia('2026-11-26'), hasta: dia('2026-11-27') },
    // Hasta las 10:30:00.000 de ayer incluidas: el límite excluido es un milisegundo después.
    anterior: { desde: dia('2026-11-25'), hasta: '2026-11-25T15:30:00.001Z' },
  });
  // 23:30 del 26/11 en Lima ya es el 27/11 en UTC: sigue siendo el 26 de Lima.
  assert.deepEqual(tramos('hoy', '2026-11-27T04:30:00Z'), {
    actual: { desde: dia('2026-11-26'), hasta: dia('2026-11-27') },
    anterior: { desde: dia('2026-11-25'), hasta: '2026-11-26T04:30:00.001Z' },
  });
  // A medianoche del 01/01/2027 en Lima, ayer es el 31/12/2026 y su tramo es solo su primer instante.
  assert.deepEqual(tramos('hoy', '2027-01-01T05:00:00Z'), {
    actual: { desde: dia('2027-01-01'), hasta: dia('2027-01-02') },
    anterior: { desde: dia('2026-12-31'), hasta: '2026-12-31T05:00:00.001Z' },
  });
});

test('«Últimos 7 días» y «Últimos 30 días» incluyen hoy y se comparan con los 7 o 30 días anteriores', () => {
  assert.deepEqual(tramos('7-dias', AHORA), {
    actual: { desde: dia('2026-11-20'), hasta: dia('2026-11-27') },
    anterior: { desde: dia('2026-11-13'), hasta: dia('2026-11-20') },
  });
  assert.deepEqual(
    tramos('7-dias', '2027-01-03T17:00:00Z'),
    {
      actual: { desde: dia('2026-12-28'), hasta: dia('2027-01-04') },
      anterior: { desde: dia('2026-12-21'), hasta: dia('2026-12-28') },
    },
    'cruza el fin de año',
  );
  assert.deepEqual(tramos('30-dias', AHORA), {
    actual: { desde: dia('2026-10-28'), hasta: dia('2026-11-27') },
    anterior: { desde: dia('2026-09-28'), hasta: dia('2026-10-28') },
  });
  assert.deepEqual(
    tramos('30-dias', '2028-03-01T17:00:00Z'),
    {
      actual: { desde: dia('2028-02-01'), hasta: dia('2028-03-02') },
      anterior: { desde: dia('2028-01-02'), hasta: dia('2028-02-01') },
    },
    'febrero de 2028 es bisiesto: del 01/02 al 01/03 son 30 días',
  );
});

test('«Mes actual» va del día 1 a hoy y se compara con los mismos días del mes anterior, como antes del filtro', () => {
  assert.deepEqual(tramos('mes', AHORA), {
    actual: { desde: dia('2026-11-01'), hasta: dia('2026-11-27') },
    anterior: { desde: dia('2026-10-01'), hasta: dia('2026-10-27') },
  });
  assert.deepEqual(
    tramos('mes', '2026-03-31T17:00:00Z'),
    {
      actual: { desde: dia('2026-03-01'), hasta: dia('2026-04-01') },
      anterior: { desde: dia('2026-02-01'), hasta: dia('2026-03-01') },
    },
    'fin de mes: febrero de 2026 tiene 28 días y entra entero',
  );
  assert.deepEqual(
    tramos('mes', '2027-01-15T17:00:00Z'),
    {
      actual: { desde: dia('2027-01-01'), hasta: dia('2027-01-16') },
      anterior: { desde: dia('2026-12-01'), hasta: dia('2026-12-16') },
    },
    'en enero, el mes anterior es diciembre del año anterior',
  );
  assert.deepEqual(
    tramos('mes', '2026-12-01T04:30:00Z'),
    {
      actual: { desde: dia('2026-11-01'), hasta: dia('2026-12-01') },
      anterior: { desde: dia('2026-10-01'), hasta: dia('2026-10-31') },
    },
    'el 01/12 04:30 Z todavía es el 30/11 en Lima',
  );
});

test('«Trimestre actual» se compara con el mismo tramo del trimestre anterior: el mismo mes del trimestre y el mismo día', () => {
  assert.deepEqual(tramos('trimestre', AHORA), {
    actual: { desde: dia('2026-10-01'), hasta: dia('2026-11-27') },
    anterior: { desde: dia('2026-07-01'), hasta: dia('2026-08-27') },
  });
  assert.deepEqual(
    tramos('trimestre', '2026-05-31T17:00:00Z'),
    {
      actual: { desde: dia('2026-04-01'), hasta: dia('2026-06-01') },
      anterior: { desde: dia('2026-01-01'), hasta: dia('2026-03-01') },
    },
    'el 31 de mayo corresponde al 28 de febrero',
  );
  assert.deepEqual(
    tramos('trimestre', '2026-12-31T17:00:00Z'),
    {
      actual: { desde: dia('2026-10-01'), hasta: dia('2027-01-01') },
      anterior: { desde: dia('2026-07-01'), hasta: dia('2026-10-01') },
    },
    'fin de trimestre y de año: el trimestre anterior entra entero (septiembre tiene 30 días)',
  );
  assert.deepEqual(
    tramos('trimestre', '2027-02-15T17:00:00Z'),
    {
      actual: { desde: dia('2027-01-01'), hasta: dia('2027-02-16') },
      anterior: { desde: dia('2026-10-01'), hasta: dia('2026-11-16') },
    },
    'en el primer trimestre, el anterior es el cuarto del año anterior',
  );
  assert.deepEqual(
    tramos('trimestre', '2026-04-01T05:00:00Z'),
    {
      actual: { desde: dia('2026-04-01'), hasta: dia('2026-04-02') },
      anterior: { desde: dia('2026-01-01'), hasta: dia('2026-01-02') },
    },
    'a medianoche del primer día del trimestre en Lima',
  );
});

test('«Año actual» va del 1 de enero a hoy y se compara con el mismo tramo del año anterior', () => {
  assert.deepEqual(tramos('anio', AHORA), {
    actual: { desde: dia('2026-01-01'), hasta: dia('2026-11-27') },
    anterior: { desde: dia('2025-01-01'), hasta: dia('2025-11-27') },
  });
  assert.deepEqual(
    tramos('anio', '2028-02-29T17:00:00Z'),
    {
      actual: { desde: dia('2028-01-01'), hasta: dia('2028-03-01') },
      anterior: { desde: dia('2027-01-01'), hasta: dia('2027-03-01') },
    },
    'el 29 de febrero corresponde al 28 de febrero del año anterior',
  );
  assert.deepEqual(
    tramos('anio', '2027-01-01T04:59:59Z'),
    {
      actual: { desde: dia('2026-01-01'), hasta: dia('2027-01-01') },
      anterior: { desde: dia('2025-01-01'), hasta: dia('2026-01-01') },
    },
    'fin de año: las 23:59:59 del 31/12 de Lima todavía son de 2026',
  );
});

test('un instante está en el tramo desde su inicio incluido hasta su fin excluido', () => {
  const { actual, anterior } = tramosDelPeriodo('hoy', new Date(AHORA));
  assert.equal(estaEnTramo('2026-11-26T05:00:00Z', actual), true, 'medianoche de hoy en Lima');
  assert.equal(estaEnTramo('2026-11-26T04:59:59.999Z', actual), false, 'las 23:59:59.999 de ayer');
  assert.equal(estaEnTramo('2026-11-27T04:59:59.999Z', actual), true, 'el último instante de hoy');
  assert.equal(estaEnTramo('2026-11-27T05:00:00Z', actual), false);
  assert.equal(estaEnTramo('2026-11-25T15:30:00Z', anterior), true, 'ayer a la misma hora, incluida');
  assert.equal(estaEnTramo('2026-11-25T15:30:00.001Z', anterior), false, 'un instante después, no');
  assert.equal(estaEnTramo('no es una fecha', actual), false);
});

test('la fecha del encabezado es la de Lima: el día de la semana y «26 noviembre, 2026»', () => {
  assert.deepEqual(fechaDelEncabezado(new Date(AHORA)), {
    diaDeLaSemana: 'jueves',
    fecha: '26 noviembre, 2026',
    iso: '2026-11-26',
  });
  assert.deepEqual(
    fechaDelEncabezado(new Date('2026-11-27T04:30:00Z')),
    { diaDeLaSemana: 'jueves', fecha: '26 noviembre, 2026', iso: '2026-11-26' },
    '23:30 en Lima',
  );
  assert.deepEqual(fechaDelEncabezado(new Date('2027-01-01T05:00:00Z')), {
    diaDeLaSemana: 'viernes',
    fecha: '1 enero, 2027',
    iso: '2027-01-01',
  });
});
