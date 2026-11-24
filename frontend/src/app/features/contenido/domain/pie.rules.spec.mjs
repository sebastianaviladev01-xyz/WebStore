/**
 * Pie de la tienda a partir de los «Accesos inferiores» de Contenido (lote 15, ADR-0021; PBI-0185). Cada grupo es una
 * columna, en el orden en que aparece; un acceso a una página informativa desactivada no se muestra (como el pie
 * escrito en el código, hasta el lote 15) y un grupo sin accesos visibles tampoco.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./pie.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { gruposDelPie } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const todas = {
  contactPageEnabled: true,
  shippingPageEnabled: true,
  privacyPageEnabled: true,
  termsPageEnabled: true,
};

const SEMILLA = [
  ['Mi cuenta', 'Ingresar', '/cuenta/login'],
  ['Mi cuenta', 'Mi perfil', '/cuenta/perfil'],
  ['Mi cuenta', 'Mis pedidos', '/pedidos'],
  ['Mi cuenta', 'Recuperar acceso', '/cuenta/recuperar'],
  ['Información', 'Envíos', '/info/envios'],
  ['Información', 'Privacidad', '/info/privacidad'],
  ['Información', 'Términos', '/info/terminos'],
  ['Ayuda', 'Contacto', '/info/contacto'],
  ['Ayuda', 'Libro de reclamaciones', '/libro-reclamaciones'],
  ['Ayuda', 'Carrito', '/carrito'],
].map(([group, label, url]) => ({ group, label, url }));

const ruta = (label, url) => ({ label, url, externo: false });

test('PBI-0185: con los accesos de la semilla, el pie tiene las columnas de antes del lote', () => {
  assert.deepEqual(gruposDelPie(SEMILLA, todas), [
    {
      titulo: 'Mi cuenta',
      enlaces: [
        ruta('Ingresar', '/cuenta/login'),
        ruta('Mi perfil', '/cuenta/perfil'),
        ruta('Mis pedidos', '/pedidos'),
        ruta('Recuperar acceso', '/cuenta/recuperar'),
      ],
    },
    {
      titulo: 'Información',
      enlaces: [
        ruta('Envíos', '/info/envios'),
        ruta('Privacidad', '/info/privacidad'),
        ruta('Términos', '/info/terminos'),
      ],
    },
    {
      titulo: 'Ayuda',
      enlaces: [
        ruta('Contacto', '/info/contacto'),
        ruta('Libro de reclamaciones', '/libro-reclamaciones'),
        ruta('Carrito', '/carrito'),
      ],
    },
  ]);
});

test('PBI-0185: un acceso a una página informativa desactivada no se muestra, y su grupo vacío tampoco', () => {
  const grupos = gruposDelPie(SEMILLA, {
    contactPageEnabled: false,
    shippingPageEnabled: false,
    privacyPageEnabled: false,
    termsPageEnabled: false,
  });
  assert.deepEqual(
    grupos.map((grupo) => grupo.titulo),
    ['Mi cuenta', 'Ayuda'],
  );
  assert.deepEqual(
    grupos[1].enlaces.map((enlace) => enlace.label),
    ['Libro de reclamaciones', 'Carrito'],
  );
  // Con parámetros o un ancla, sigue siendo la misma página.
  assert.deepEqual(
    gruposDelPie([{ group: 'A', label: 'Envíos', url: '/info/envios?zona=lima' }], {
      ...todas,
      shippingPageEnabled: false,
    }),
    [],
  );
});

test('PBI-0185: los grupos salen en el orden en que aparecen; una dirección https:// es externa', () => {
  assert.deepEqual(
    gruposDelPie(
      [
        { group: 'Ayuda', label: 'Contacto', url: '/info/contacto' },
        { group: 'Síguenos', label: 'Blog', url: 'https://blog.tienda.pe' },
        { group: 'Ayuda', label: 'Carrito', url: '/carrito' },
      ],
      todas,
    ),
    [
      { titulo: 'Ayuda', enlaces: [ruta('Contacto', '/info/contacto'), ruta('Carrito', '/carrito')] },
      { titulo: 'Síguenos', enlaces: [{ label: 'Blog', url: 'https://blog.tienda.pe', externo: true }] },
    ],
  );
});

test('PBI-0185: lo mal formado no se muestra y, como el BFF, el pie llega hasta tres grupos', () => {
  assert.deepEqual(gruposDelPie(undefined, todas), []);
  assert.deepEqual(gruposDelPie('Contacto, Envíos', todas), []);
  assert.deepEqual(
    gruposDelPie(
      [null, { group: '', label: 'X', url: '/' }, { group: 'A', label: 'Mal', url: 'javascript:alert(1)' }],
      todas,
    ),
    [],
  );
  const cuatro = ['A', 'B', 'C', 'D'].map((group) => ({ group, label: group, url: '/' }));
  assert.deepEqual(
    gruposDelPie(cuatro, todas).map((grupo) => grupo.titulo),
    ['A', 'B', 'C'],
  );
});
