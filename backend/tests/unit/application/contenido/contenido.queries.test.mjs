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
