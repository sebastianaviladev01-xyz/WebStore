/**
 * Vigencia del banner con fecha y hora (lote 24, ADR-0025, PBI-0221; provisional). El backoffice envía el inicio y el
 * fin como instantes ISO 8601 con su zona (hora de Lima, `-05:00`); el BFF rechaza uno nuevo o cambiado que no lo sea y
 * un fin que no es posterior al inicio. Una vigencia guardada antes que no cambia sigue valiendo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { requireValidBanners } from '../../../../src/domain/admin/colecciones.rules.mjs';

const banner = (cambios = {}) => ({
  id: 'bn-1',
  title: 'Campaña',
  placement: 'hero',
  active: true,
  startAt: '2026-12-01T09:30:00.000-05:00',
  endAt: '2026-12-01T18:00:59.999-05:00',
  ...cambios,
});

const rechazaEn = (field) => (error) => {
  assert.equal(error.code, 'INVALID_COLLECTION');
  assert.deepEqual(error.details, { collection: 'banners', field, id: 'bn-1' });
  return true;
};

test('PBI-0221: acepta instantes con hora y zona, con o sin segundos', () => {
  const anterior = banner();
  for (const cambios of [
    {},
    { startAt: '2026-12-01T09:30-05:00', endAt: '2026-12-01T18:00-05:00' },
    { startAt: '2026-01-01T00:00:00.000Z', endAt: '2027-12-31T23:59:59.000Z' },
  ])
    assert.doesNotThrow(() => requireValidBanners([banner(cambios)], [anterior]));
});

test('PBI-0221: rechaza un inicio o un fin nuevos sin hora o sin zona', () => {
  for (const [field, valor] of [
    ['startAt', '2026-12-01'],
    ['startAt', '2026-12-01T09:30'],
    ['endAt', 'mañana'],
    ['endAt', '2026-13-01T09:30:00.000-05:00'],
  ])
    assert.throws(() => requireValidBanners([banner({ [field]: valor })], []), rechazaEn(field));
});

test('PBI-0221: el fin debe ser posterior al inicio, también el mismo día', () => {
  assert.throws(
    () => requireValidBanners([banner({ endAt: '2026-12-01T09:00:59.999-05:00' })], []),
    rechazaEn('endAt'),
  );
  assert.throws(
    () =>
      requireValidBanners(
        [banner({ startAt: '2026-12-01T09:30:00.000-05:00', endAt: '2026-12-01T09:30:00.000-05:00' })],
        [],
      ),
    rechazaEn('endAt'),
  );
  assert.doesNotThrow(() => requireValidBanners([banner({ endAt: '2026-12-01T09:30:59.999-05:00' })], []));
});

test('PBI-0221: una vigencia guardada antes que no es un instante sigue valiendo mientras no cambie', () => {
  const anterior = banner({ startAt: '2026-12-01', endAt: '2026-12-31' });
  assert.doesNotThrow(() => requireValidBanners([{ ...anterior, title: 'Otro' }], [anterior]));
});
