/**
 * Banners del inicio (PBI-0117, lote 05, ADR-0017): vigentes si están activos y dentro de su ventana, y como mucho
 * tres por zona, el mismo máximo de héroes activos que comprueba el Admin (`MAXIMO_HEROES_ACTIVOS`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./banner.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { MAXIMO_BANNERS_POR_ZONA, bannersVigentes, bannersDeZona } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);
const admin = await readFile(
  new URL('../../../../../projects/admin/src/app/features/tienda/domain/banner.rules.ts', import.meta.url),
  'utf8',
);

const banner = (id, placement, startAt, endAt, active = true) => ({ id, placement, startAt, endAt, active });
const ahora = new Date('2026-11-14T15:00:00Z');

test('vigente: activo, ya empezó y todavía no termina (los extremos cuentan)', () => {
  const lista = [
    banner('vigente', 'hero', '2026-11-01T00:00:00Z', '2026-11-30T00:00:00Z'),
    banner('inactivo', 'hero', '2026-11-01T00:00:00Z', '2026-11-30T00:00:00Z', false),
    banner('futuro', 'hero', '2026-11-15T00:00:00Z', '2026-11-30T00:00:00Z'),
    banner('vencido', 'hero', '2026-10-01T00:00:00Z', '2026-11-14T14:59:59Z'),
    banner('empieza-ya', 'hero', '2026-11-14T15:00:00Z', '2026-11-30T00:00:00Z'),
    banner('termina-ya', 'hero', '2026-11-01T00:00:00Z', '2026-11-14T15:00:00Z'),
  ];
  assert.deepEqual(
    bannersVigentes(lista, ahora).map((b) => b.id),
    ['vigente', 'empieza-ya', 'termina-ya'],
  );
});

test('como mucho tres por zona, el mismo máximo que el Admin', () => {
  assert.equal(MAXIMO_BANNERS_POR_ZONA, 3);
  assert.match(admin, /MAXIMO_HEROES_ACTIVOS = 3;/);
  const lista = ['h1', 'p1', 'h2', 's1', 'h3', 'h4', 'p2'].map((id) =>
    banner(
      id,
      { h: 'hero', p: 'promotion', s: 'secondary' }[id[0]],
      '2026-01-01T00:00:00Z',
      '2027-01-01T00:00:00Z',
    ),
  );
  assert.deepEqual(
    bannersDeZona(lista, ['hero']).map((b) => b.id),
    ['h1', 'h2', 'h3'],
  );
  assert.deepEqual(
    bannersDeZona(lista, ['promotion', 'secondary']).map((b) => b.id),
    ['p1', 's1', 'p2'],
  );
});

// Lote 24 (ADR-0025, PBI-0221; provisional): la vigencia lleva hora de Lima. El Admin guarda el inicio al empezar el
// minuto y el fin al terminarlo, con `-05:00`; la tienda compara instantes, así que respeta la hora y la zona.
test('PBI-0221: un banner de 09:30 a 18:00 de Lima sale a esas horas, no cinco horas antes', () => {
  const lista = [banner('mañana', 'hero', '2026-12-10T09:30:00.000-05:00', '2026-12-10T18:00:59.999-05:00')];
  const ids = (instante) => bannersVigentes(lista, new Date(instante)).map((b) => b.id);
  assert.deepEqual(ids('2026-12-10T09:29:59.999-05:00'), [], 'todavía no empieza');
  assert.deepEqual(ids('2026-12-10T09:30:00.000-05:00'), ['mañana']);
  assert.deepEqual(ids('2026-12-10T18:00:59.999-05:00'), ['mañana'], 'el minuto del fin cuenta entero');
  assert.deepEqual(ids('2026-12-10T18:01:00.000-05:00'), [], 'ya terminó');
  // A las 09:30 UTC todavía son las 04:30 en Lima.
  assert.deepEqual(ids('2026-12-10T09:30:00.000Z'), []);
});
