/**
 * Botones del banner en el guardado del Admin (lote 12, ADR-0021, PBI-0184; provisional): cada banner lleva hasta dos
 * botones opcionales, el principal (`cta` y `ctaUrl`) y el secundario (`secondaryCta` y `secondaryCtaUrl`). Un botón
 * con texto necesita su enlace y uno con enlace necesita su texto; el texto admite hasta `MAXIMO_TEXTO_DE_BOTON`
 * caracteres. Un banner guardado antes con un botón a medias sigue valiendo mientras ese botón no cambie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAXIMO_TEXTO_DE_BOTON,
  requireValidBanners,
} from '../../../../src/domain/admin/colecciones.rules.mjs';

const banner = (botones = {}, id = 'bn-1') => ({
  id,
  title: 'El cine, en tu sala.',
  placement: 'hero',
  active: true,
  cta: '',
  ctaUrl: '',
  secondaryCta: '',
  secondaryCtaUrl: '',
  ...botones,
});

const rechaza = (field, mensaje) => (error) => {
  assert.equal(error.code, 'INVALID_COLLECTION');
  assert.deepEqual(error.details, { collection: 'banners', field, id: 'bn-1' });
  assert.match(error.message, mensaje);
  return true;
};

test('PBI-0184: acepta un banner con los dos botones, con uno solo o sin ninguno', () => {
  const principal = { cta: 'Ver ofertas', ctaUrl: '/catalogo' };
  const secundario = { secondaryCta: 'Escríbenos', secondaryCtaUrl: 'mailto:ventas@example.com' };
  for (const botones of [{ ...principal, ...secundario }, principal, secundario, {}])
    assert.doesNotThrow(() => requireValidBanners([banner(botones)], []), JSON.stringify(botones));
  // Un banner de antes, sin los campos del secundario, también vale.
  const { secondaryCta, secondaryCtaUrl, ...anterior } = banner(principal);
  assert.equal(secondaryCta, '');
  assert.equal(secondaryCtaUrl, '');
  assert.doesNotThrow(() => requireValidBanners([anterior], []));
});

test('PBI-0184: un botón con texto y sin enlace se rechaza en el enlace', () => {
  assert.throws(
    () => requireValidBanners([banner({ cta: 'Ver ofertas', ctaUrl: '  ' })], []),
    rechaza('ctaUrl', /el botón principal necesita un enlace/),
  );
  assert.throws(
    () => requireValidBanners([banner({ secondaryCta: 'Ver más' })], []),
    rechaza('secondaryCtaUrl', /el botón secundario necesita un enlace/),
  );
});

test('PBI-0184: un botón con enlace y sin texto se rechaza en el texto', () => {
  assert.throws(
    () => requireValidBanners([banner({ ctaUrl: '/catalogo' })], []),
    rechaza('cta', /el botón principal necesita un texto/),
  );
  assert.throws(
    () => requireValidBanners([banner({ secondaryCta: ' ', secondaryCtaUrl: 'https://example.com' })], []),
    rechaza('secondaryCta', /el botón secundario necesita un texto/),
  );
});

test(`PBI-0184: el texto de cada botón admite hasta ${MAXIMO_TEXTO_DE_BOTON} caracteres`, () => {
  assert.equal(MAXIMO_TEXTO_DE_BOTON, 40);
  const justo = 'x'.repeat(MAXIMO_TEXTO_DE_BOTON);
  assert.doesNotThrow(() =>
    requireValidBanners([banner({ cta: justo, ctaUrl: '/', secondaryCta: justo, secondaryCtaUrl: '/' })], []),
  );
  assert.throws(
    () => requireValidBanners([banner({ cta: `${justo}x`, ctaUrl: '/' })], []),
    rechaza('cta', /el texto del botón principal admite hasta 40 caracteres/),
  );
  assert.throws(
    () => requireValidBanners([banner({ secondaryCta: `${justo}x`, secondaryCtaUrl: '/' })], []),
    rechaza('secondaryCta', /el texto del botón secundario admite hasta 40 caracteres/),
  );
});

test('PBI-0184: el texto y el enlace de los botones deben ser textos', () => {
  assert.throws(
    () => requireValidBanners([banner({ secondaryCta: 3, secondaryCtaUrl: '/' })], []),
    rechaza('secondaryCta', /hay un texto del banner que no es válido/),
  );
});

test('PBI-0184: un botón a medias guardado antes sigue valiendo mientras no cambie', () => {
  const anterior = banner({ cta: '', ctaUrl: '/catalogo' });
  assert.doesNotThrow(() => requireValidBanners([{ ...anterior, title: 'Otro título' }], [anterior]));
  // Si se toca ese botón, ya se valida.
  assert.throws(
    () => requireValidBanners([{ ...anterior, ctaUrl: '/catalogo?categoria=cat-tv' }], [anterior]),
    rechaza('cta', /el botón principal necesita un texto/),
  );
  // El de otro banner no cuenta como «guardado antes».
  assert.throws(
    () => requireValidBanners([anterior], [{ ...anterior, id: 'bn-2' }]),
    rechaza('cta', /el botón principal necesita un texto/),
  );
});
