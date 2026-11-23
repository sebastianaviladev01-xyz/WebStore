/**
 * Botones del banner en la tienda (lote 12, ADR-0021, PBI-0184; provisional): cada banner muestra hasta dos botones,
 * primero el principal (paleta primaria) y después el secundario (paleta secundaria). Solo se muestra un botón con
 * texto y enlace; uno a medias o sin configurar no sale.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./banner.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { botonesDelBanner } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const banner = (botones) => ({
  ctaLabel: '',
  ctaUrl: '',
  secondaryCtaLabel: '',
  secondaryCtaUrl: '',
  ...botones,
});

test('PBI-0184: los dos botones, el principal primero, cada uno con su paleta', () => {
  assert.deepEqual(
    botonesDelBanner(
      banner({
        ctaLabel: 'Ver TV',
        ctaUrl: '/catalogo?categoria=cat-tv',
        secondaryCtaLabel: 'Ver todos los productos',
        secondaryCtaUrl: '/catalogo',
      }),
    ),
    [
      { etiqueta: 'Ver TV', enlace: '/catalogo?categoria=cat-tv', paleta: 'primaria' },
      { etiqueta: 'Ver todos los productos', enlace: '/catalogo', paleta: 'secundaria' },
    ],
  );
});

test('PBI-0184: un banner con un solo botón muestra solo ese, sea el principal o el secundario', () => {
  assert.deepEqual(botonesDelBanner(banner({ ctaLabel: 'Ver', ctaUrl: '/catalogo' })), [
    { etiqueta: 'Ver', enlace: '/catalogo', paleta: 'primaria' },
  ]);
  assert.deepEqual(
    botonesDelBanner(banner({ secondaryCtaLabel: 'Escríbenos', secondaryCtaUrl: 'mailto:a@b.pe' })),
    [{ etiqueta: 'Escríbenos', enlace: 'mailto:a@b.pe', paleta: 'secundaria' }],
  );
});

test('PBI-0184: un botón sin texto o sin enlace no sale, y los espacios no cuentan', () => {
  assert.deepEqual(botonesDelBanner(banner({})), []);
  assert.deepEqual(botonesDelBanner(banner({ ctaLabel: 'Ver', secondaryCtaUrl: '/catalogo' })), []);
  assert.deepEqual(botonesDelBanner(banner({ ctaLabel: '  ', ctaUrl: '/catalogo' })), []);
  // Un banner de un BFF anterior, sin los campos del secundario.
  assert.deepEqual(botonesDelBanner({ ctaLabel: ' Ver ', ctaUrl: ' /catalogo ' }), [
    { etiqueta: 'Ver', enlace: '/catalogo', paleta: 'primaria' },
  ]);
});
