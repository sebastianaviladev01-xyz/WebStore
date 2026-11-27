/**
 * Banners públicos (`GET /content/banners`), lote 12 (ADR-0021, PBI-0184): cada banner expone sus dos botones
 * opcionales, el principal (`ctaLabel` y `ctaUrl`) y el secundario (`secondaryCtaLabel` y `secondaryCtaUrl`). Un botón
 * sin configurar llega con texto y enlace vacíos, y la tienda no lo muestra.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createContenidoQueries } from '../../../../src/application/contenido/contenido.queries.mjs';

const publicos = (banners) =>
  createContenidoQueries({ store: { state: { banners, config: {} } } }).listBanners();

const base = { id: 'bn-1', title: 'Hero', placement: 'hero', active: true };

test('PBI-0184: el banner público trae el botón principal y el secundario', () => {
  const [banner] = publicos([
    {
      ...base,
      cta: 'Ver',
      ctaUrl: '/catalogo',
      secondaryCta: 'Ofertas',
      secondaryCtaUrl: 'https://example.com',
    },
  ]);
  assert.equal(banner.ctaLabel, 'Ver');
  assert.equal(banner.ctaUrl, '/catalogo');
  assert.equal(banner.secondaryCtaLabel, 'Ofertas');
  assert.equal(banner.secondaryCtaUrl, 'https://example.com');
  assert.equal('secondaryCta' in banner, false);
});

test('PBI-0184: un botón sin configurar llega vacío, sin texto ni enlace por defecto', () => {
  const [banner] = publicos([{ ...base, cta: '', ctaUrl: '' }]);
  assert.equal(banner.ctaLabel, '');
  assert.equal(banner.ctaUrl, '');
  assert.equal(banner.secondaryCtaLabel, '');
  assert.equal(banner.secondaryCtaUrl, '');
});

// --- PBI-0266 (lote 46, ADR-0033): el estilo de cada botón ---

test('PBI-0266: el banner público trae el estilo de cada botón', () => {
  const [banner] = publicos([{ ...base, ctaStyle: 'contrast', secondaryCtaStyle: 'outline' }]);
  assert.equal(banner.ctaStyle, 'contrast');
  assert.equal(banner.secondaryCtaStyle, 'outline');
});

test('PBI-0266: sin estilo, o con uno que no existe, el primero es el principal y el segundo el secundario', () => {
  const [sinEstilo, desconocido] = publicos([
    base,
    { ...base, id: 'bn-2', ctaStyle: 'rojo', secondaryCtaStyle: '' },
  ]);
  for (const banner of [sinEstilo, desconocido]) {
    assert.equal(banner.ctaStyle, 'primary', banner.id);
    assert.equal(banner.secondaryCtaStyle, 'accent', banner.id);
  }
});

// --- PBI-0244 (lote 30, ADR-0027; provisional): avisos programados ---

const ajustes = (announcements, ahora) =>
  createContenidoQueries({
    store: { state: { banners: [], config: { storeName: 'Tienda', announcements }, termsVersions: [] } },
    now: () => new Date(ahora),
  }).getSettings();

const programados = [
  { text: 'Fijo', url: '' },
  {
    text: 'Black Friday',
    url: '/catalogo',
    startAt: '2026-11-27T00:00:00.000-05:00',
    endAt: '2026-11-27T23:59:59.999-05:00',
  },
  { text: 'Navidad', url: '', startAt: '2026-12-20T00:00:00.000-05:00' },
  { text: 'Mantenimiento pasado', url: '', endAt: '2026-11-01T04:00:00.000-05:00' },
];

test('PBI-0244: los ajustes públicos solo traen los avisos vigentes según el reloj inyectado', () => {
  assert.deepEqual(
    ajustes(programados, '2026-11-24T10:00:00.000-05:00').announcements.map((aviso) => aviso.text),
    ['Fijo'],
  );
  assert.deepEqual(ajustes(programados, '2026-11-27T10:00:00.000-05:00').announcements, [
    programados[0],
    programados[1],
  ]);
  assert.deepEqual(
    ajustes(programados, '2026-12-25T10:00:00.000-05:00').announcements.map((aviso) => aviso.text),
    ['Fijo', 'Navidad'],
  );
});

test('PBI-0244: el aviso aparece y desaparece sin guardar nada: cada lectura usa el instante de ese momento', () => {
  let ahora = Date.parse('2026-11-26T23:59:00.000-05:00');
  const consultas = createContenidoQueries({
    store: { state: { banners: [], config: { announcements: programados }, termsVersions: [] } },
    now: () => new Date(ahora),
  });
  assert.equal(consultas.getSettings().announcements.length, 1);
  ahora = Date.parse('2026-11-27T00:00:00.000-05:00');
  assert.equal(consultas.getSettings().announcements.length, 2);
  ahora = Date.parse('2026-11-28T00:00:00.000-05:00');
  assert.equal(consultas.getSettings().announcements.length, 1);
});

test('PBI-0244: los ajustes públicos no cambian los avisos guardados (el Admin los ve todos)', () => {
  const config = { announcements: programados };
  createContenidoQueries({
    store: { state: { banners: [], config, termsVersions: [] } },
    now: () => new Date('2026-11-24T10:00:00.000-05:00'),
  }).getSettings();
  assert.equal(config.announcements.length, 4);
});

test('PBI-0244: un estado sin avisos sigue respondiendo una lista vacía', () => {
  assert.deepEqual(
    createContenidoQueries({
      store: { state: { banners: [], config: {}, termsVersions: [] } },
      now: () => new Date(),
    }).getSettings().announcements,
    [],
  );
});
