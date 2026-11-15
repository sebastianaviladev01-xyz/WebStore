import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 07 (ADR-0017), PBI-0153: Contenido avisa, sin bloquear, cuando un texto de la «Navegación superior» no lleva a
// ninguna página de la tienda. La regla del Admin replica la de la tienda (`navegacion.rules.ts` de `contenido`,
// lote 05): las dos aplicaciones no se importan entre sí, así que esta prueba las compara.
const cargar = async (url, sinImports = false) => {
  const fuente = await readFile(url, 'utf8');
  const salida = ts.transpileModule(sinImports ? fuente.replace(/^import [\s\S]*?;$/gm, '') : fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);
};
const { destinoDeTexto, textosSinDestino, avisoDeNavegacion } = await cargar(
  new URL('./navegacion.rules.ts', import.meta.url),
);
const tienda = await cargar(
  new URL('../../../../../../../src/app/features/contenido/domain/navegacion.rules.ts', import.meta.url),
  true,
);

const todas = {
  contactPageEnabled: true,
  shippingPageEnabled: true,
  privacyPageEnabled: true,
  termsPageEnabled: true,
};
const ninguna = {
  contactPageEnabled: false,
  shippingPageEnabled: false,
  privacyPageEnabled: false,
  termsPageEnabled: false,
};

test('PBI-0153: el Admin deduce el mismo destino que la tienda para cada texto', () => {
  const textos = [
    'Envíos',
    'Despachos',
    'Contacto',
    'Ayuda',
    'Privacidad',
    'Términos y condiciones',
    'Libro de reclamaciones',
    'Mi cuenta',
    'Ofertas',
    '  ENVÍOS gratis ',
  ];
  for (const paginas of [todas, ninguna])
    for (const texto of textos)
      assert.equal(
        destinoDeTexto(texto, paginas),
        tienda.enlaceDeNavegacion(texto, paginas)?.route ?? null,
        `${texto} con ${paginas === todas ? 'todas' : 'ninguna'} de las páginas`,
      );
});

test('PBI-0153: Inicio, Productos y Pedidos no se avisan: la cabecera de la tienda ya los ofrece', () => {
  assert.deepEqual(textosSinDestino('Inicio, Productos, Pedidos, Envíos', todas), {
    sinPagina: [],
    desactivados: [],
  });
});

test('PBI-0153: un texto que no se reconoce o cuya página está desactivada se avisa', () => {
  assert.deepEqual(textosSinDestino('Inicio, Despachos, Envíos, Ofertas,, ', todas), {
    sinPagina: ['Despachos', 'Ofertas'],
    desactivados: [],
  });
  assert.deepEqual(
    textosSinDestino('Envíos, Contacto, Reclamaciones', { ...todas, shippingPageEnabled: false }),
    {
      sinPagina: [],
      desactivados: ['Envíos'],
    },
  );
});

test('PBI-0153: el aviso nombra los textos y dice qué palabras reconoce la tienda; sin problemas, no hay aviso', () => {
  assert.equal(avisoDeNavegacion('Inicio, Productos, Envíos', todas), null);
  assert.equal(
    avisoDeNavegacion('Despachos, Ofertas', todas),
    '«Despachos» y «Ofertas» no llevan a ninguna página de la tienda y no se mostrarán. La tienda enlaza los textos con Envíos, Contacto o Ayuda, Privacidad, Términos, Reclamaciones o Cuenta; Inicio, Productos y Pedidos ya están en su cabecera.',
  );
  assert.equal(
    avisoDeNavegacion('Envíos', { ...todas, shippingPageEnabled: false }),
    '«Envíos» lleva a una página desactivada y no se mostrará. Activa la página o quita el texto.',
  );
});
