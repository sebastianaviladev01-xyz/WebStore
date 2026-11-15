import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017), PBI-0128: la vigencia de un banner es en días de Lima, el fin no va antes del inicio y el
// tope de tres banners principales activos solo cuenta los que coinciden en fechas con el que se guarda.
const source = await readFile(new URL('./banner.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { inicioDelDiaEnLima, finDelDiaEnLima, finAntesDelInicio, heroesQueCoinciden } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0128: el día de inicio y el de fin se guardan en la hora de Lima', () => {
  assert.equal(inicioDelDiaEnLima('2026-12-10'), '2026-12-10T00:00:00.000-05:00');
  assert.equal(finDelDiaEnLima('2026-12-31'), '2026-12-31T23:59:59.999-05:00');
  // El inicio en Lima es a las 05:00 UTC, no a las 00:00 UTC (cinco horas antes).
  assert.equal(new Date(inicioDelDiaEnLima('2026-12-10')).toISOString(), '2026-12-10T05:00:00.000Z');
});

test('PBI-0128: el fin no puede ir antes del inicio; el mismo día sí vale', () => {
  assert.equal(finAntesDelInicio('2026-12-10', '2026-12-01'), true);
  assert.equal(finAntesDelInicio('2026-12-10', '2026-12-10'), false);
  assert.equal(finAntesDelInicio('2026-12-10', '2027-01-01'), false);
  assert.equal(finAntesDelInicio('', '2026-12-01'), false, 'sin inicio no hay comparación');
});

const banner = (id, startAt, endAt, cambios = {}) => ({
  id,
  placement: 'hero',
  active: true,
  startAt,
  endAt,
  ...cambios,
});

test('PBI-0128: el tope de banners principales no cuenta los vencidos, los inactivos ni otras ubicaciones', () => {
  const banners = [
    banner('b1', '2026-01-01T00:00:00.000Z', '2027-12-31T23:59:59.000Z'),
    banner('b2', '2026-01-01T00:00:00.000Z', '2026-06-30T23:59:59.000Z'),
    banner('b3', '2026-01-01T00:00:00.000Z', '2027-12-31T23:59:59.000Z', { active: false }),
    banner('b4', '2026-01-01T00:00:00.000Z', '2027-12-31T23:59:59.000Z', { placement: 'promotion' }),
    banner('b5', '2027-03-01T00:00:00.000-05:00', '2027-03-31T23:59:59.999-05:00'),
  ];
  assert.equal(heroesQueCoinciden(banners, { id: 'nuevo', startAt: '2026-12-01', endAt: '2026-12-31' }), 1);
  assert.equal(heroesQueCoinciden(banners, { id: 'nuevo', startAt: '2027-03-15', endAt: '2027-04-15' }), 2);
  assert.equal(
    heroesQueCoinciden(banners, { id: 'b1', startAt: '2027-03-15', endAt: '2027-04-15' }),
    1,
    'no se cuenta a sí mismo',
  );
});
