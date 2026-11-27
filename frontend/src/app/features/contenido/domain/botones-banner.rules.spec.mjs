/**
 * Botones del banner en la tienda (lote 12, ADR-0021, PBI-0184; confirmado por Sebastián Avila): cada banner muestra
 * hasta dos botones, primero el primero y después el segundo. Solo se muestra un botón con texto y enlace; uno a medias
 * o sin configurar no sale. Lote 46 (ADR-0033, PBI-0266): cada botón lleva el estilo que se eligió al registrar el
 * banner, uno de los cuatro del tema (`primary`, `accent`, `contrast` u `outline`); sin estilo, o con uno desconocido,
 * el primero es `primary` y el segundo `accent`, como hasta el lote.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./banner.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { botonesDelBanner, ESTILOS_DE_BOTON_BANNER } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const banner = (botones) => ({
  ctaLabel: '',
  ctaUrl: '',
  secondaryCtaLabel: '',
  secondaryCtaUrl: '',
  ...botones,
});

const dos = {
  ctaLabel: 'Ver TV',
  ctaUrl: '/catalogo?categoria=cat-tv',
  secondaryCtaLabel: 'Ver todos los productos',
  secondaryCtaUrl: '/catalogo',
};

test('PBI-0184 y PBI-0266: sin estilos, el primero con el principal y el segundo con el secundario, en ese orden', () => {
  assert.deepEqual(botonesDelBanner(banner(dos)), [
    { posicion: 'primero', etiqueta: 'Ver TV', enlace: '/catalogo?categoria=cat-tv', estilo: 'primary' },
    { posicion: 'segundo', etiqueta: 'Ver todos los productos', enlace: '/catalogo', estilo: 'accent' },
  ]);
});

test('PBI-0266: cada botón sale con el estilo elegido', () => {
  assert.deepEqual(
    botonesDelBanner(banner({ ...dos, ctaStyle: 'outline', secondaryCtaStyle: 'contrast' })).map(
      ({ estilo }) => estilo,
    ),
    ['outline', 'contrast'],
  );
  // Los cuatro sirven en los dos botones.
  for (const estilo of ESTILOS_DE_BOTON_BANNER) {
    const [primero, segundo] = botonesDelBanner(
      banner({ ...dos, ctaStyle: estilo, secondaryCtaStyle: estilo }),
    );
    assert.equal(primero.estilo, estilo);
    assert.equal(segundo.estilo, estilo);
    // Con el mismo estilo, cada botón sigue identificado por su posición.
    assert.notEqual(primero.posicion, segundo.posicion);
  }
});

test('PBI-0266: un estilo que la tienda no conoce cae al de siempre de ese botón', () => {
  assert.deepEqual(
    botonesDelBanner(banner({ ...dos, ctaStyle: 'rojo', secondaryCtaStyle: '' })).map(({ estilo }) => estilo),
    ['primary', 'accent'],
  );
});

test('PBI-0266: los estilos son los cuatro del tema', () => {
  assert.deepEqual(ESTILOS_DE_BOTON_BANNER, ['primary', 'accent', 'contrast', 'outline']);
});

test('PBI-0184: un banner con un solo botón muestra solo ese, sea el primero o el segundo, con su estilo', () => {
  assert.deepEqual(botonesDelBanner(banner({ ctaLabel: 'Ver', ctaUrl: '/catalogo' })), [
    { posicion: 'primero', etiqueta: 'Ver', enlace: '/catalogo', estilo: 'primary' },
  ]);
  assert.deepEqual(
    botonesDelBanner(
      banner({
        secondaryCtaLabel: 'Escríbenos',
        secondaryCtaUrl: 'mailto:a@b.pe',
        secondaryCtaStyle: 'outline',
      }),
    ),
    [{ posicion: 'segundo', etiqueta: 'Escríbenos', enlace: 'mailto:a@b.pe', estilo: 'outline' }],
  );
});

test('PBI-0184: un botón sin texto o sin enlace no sale, y los espacios no cuentan', () => {
  assert.deepEqual(botonesDelBanner(banner({})), []);
  assert.deepEqual(botonesDelBanner(banner({ ctaLabel: 'Ver', secondaryCtaUrl: '/catalogo' })), []);
  assert.deepEqual(botonesDelBanner(banner({ ctaLabel: '  ', ctaUrl: '/catalogo' })), []);
  // Un banner de un BFF anterior, sin los campos del segundo botón ni los estilos.
  assert.deepEqual(botonesDelBanner({ ctaLabel: ' Ver ', ctaUrl: ' /catalogo ' }), [
    { posicion: 'primero', etiqueta: 'Ver', enlace: '/catalogo', estilo: 'primary' },
  ]);
});
