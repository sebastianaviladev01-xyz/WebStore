import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 44 (ADR-0033, PBI-0271): la barra superior del backoffice muestra la ruta de navegación, como el SGC: el ícono
// del módulo, el grupo del menú lateral y la página. Las páginas que no están en el menú (registros) llevan, además, su
// listado como enlace. Los nombres salen del menú configurado (`menu.ts`) y del título de la ruta, sin repetirlos. Los
// archivos se transpilan sin sus import y se anteponen los que usa (PBI-0080).
const fuente = [
  await readFile(new URL('../shared/ui/iconos.ts', import.meta.url), 'utf8'),
  await readFile(new URL('./menu.ts', import.meta.url), 'utf8'),
  await readFile(new URL('./ruta-de-navegacion.ts', import.meta.url), 'utf8'),
].join('\n');
const salida = ts.transpileModule(fuente.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { MENU, rutaDeNavegacion, paginaDelTitulo } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

/** Solo las etiquetas, los enlaces y la página actual, para comparar de un vistazo. */
const tramos = (ruta) => ruta.tramos.map(({ etiqueta, enlace, actual }) => ({ etiqueta, enlace, actual }));

test('PBI-0271: el título de la ruta da el nombre de la página, sin el prefijo de la pestaña', () => {
  assert.equal(paginaDelTitulo('WebStore Admin | Nuevo producto'), 'Nuevo producto');
  assert.equal(paginaDelTitulo('WebStore Admin | Perfil'), 'Perfil');
  assert.equal(paginaDelTitulo('Perfil'), 'Perfil');
  assert.equal(paginaDelTitulo(undefined), null);
  assert.equal(paginaDelTitulo(''), null);
});

test('PBI-0271: una página del menú es su grupo y su nombre, sin enlaces, con el ícono del módulo', () => {
  const ruta = rutaDeNavegacion('/productos', MENU, 'WebStore Admin | Productos');
  assert.equal(ruta.icono, 'productos');
  assert.deepEqual(tramos(ruta), [
    { etiqueta: 'Catálogo', enlace: null, actual: false },
    { etiqueta: 'Productos', enlace: null, actual: true },
  ]);
});

test('PBI-0271: los parámetros de la URL no cambian la ruta', () => {
  const ruta = rutaDeNavegacion('/productos?nombre=tv&pagina=2#lista', MENU, 'WebStore Admin | Productos');
  assert.deepEqual(
    ruta.tramos.map((tramo) => tramo.etiqueta),
    ['Catálogo', 'Productos'],
  );
});

test('PBI-0271: el Dashboard es «General › Dashboard» y solo la raíz exacta lo es', () => {
  const ruta = rutaDeNavegacion('/', MENU, 'WebStore Admin | Dashboard');
  assert.equal(ruta.icono, 'dashboard');
  assert.deepEqual(
    ruta.tramos.map((tramo) => tramo.etiqueta),
    ['General', 'Dashboard'],
  );
});

test('PBI-0271: cada entrada del menú da su grupo y su etiqueta del menú, no el título de la ruta', () => {
  for (const grupo of MENU) {
    for (const item of grupo.items) {
      // Un título distinto del menú (como «Envíos» frente a «Tarifas de envío») no cambia el nombre de la página.
      const ruta = rutaDeNavegacion(item.path, MENU, 'WebStore Admin | Otro nombre');
      assert.deepEqual(
        ruta.tramos.map((tramo) => tramo.etiqueta),
        [grupo.label, item.label],
        item.path,
      );
      assert.equal(ruta.tramos.at(-1).actual, true, item.path);
    }
  }
  assert.deepEqual(
    rutaDeNavegacion('/envios', MENU, 'WebStore Admin | Envíos').tramos.map((tramo) => tramo.etiqueta),
    ['Tienda', 'Tarifas de envío'],
  );
});

test('PBI-0271: un registro es el grupo, su listado como enlace y la página actual', () => {
  assert.deepEqual(
    tramos(rutaDeNavegacion('/productos/nuevo?nombre=tv', MENU, 'WebStore Admin | Nuevo producto')),
    [
      { etiqueta: 'Catálogo', enlace: null, actual: false },
      { etiqueta: 'Productos', enlace: '/productos', actual: false },
      { etiqueta: 'Nuevo producto', enlace: null, actual: true },
    ],
  );
  const usuario = rutaDeNavegacion('/usuarios/u-3', MENU, 'WebStore Admin | Editar usuario');
  assert.equal(usuario.icono, 'usuarios');
  assert.deepEqual(tramos(usuario), [
    { etiqueta: 'Accesos', enlace: null, actual: false },
    { etiqueta: 'Usuarios y roles', enlace: '/usuarios', actual: false },
    { etiqueta: 'Editar usuario', enlace: null, actual: true },
  ]);
  assert.deepEqual(
    rutaDeNavegacion('/categorias/nueva', MENU, 'WebStore Admin | Nueva categoría').tramos.map(
      (t) => t.etiqueta,
    ),
    ['Catálogo', 'Categorías', 'Nueva categoría'],
  );
  assert.deepEqual(
    rutaDeNavegacion('/banners/bn-1', MENU, 'WebStore Admin | Editar banner').tramos.map((t) => t.etiqueta),
    ['Tienda', 'Banners', 'Editar banner'],
  );
});

test('PBI-0271: un registro sin título conocido muestra el grupo y el listado, que pasa a ser la página actual', () => {
  assert.deepEqual(tramos(rutaDeNavegacion('/productos/p-1', MENU, undefined)), [
    { etiqueta: 'Catálogo', enlace: null, actual: false },
    { etiqueta: 'Productos', enlace: null, actual: true },
  ]);
});

test('PBI-0271: una página fuera del menú, como Perfil, es solo su nombre con su ícono', () => {
  const ruta = rutaDeNavegacion('/perfil', MENU, 'WebStore Admin | Perfil');
  assert.equal(ruta.icono, 'perfil');
  assert.deepEqual(tramos(ruta), [{ etiqueta: 'Perfil', enlace: null, actual: true }]);
});

test('PBI-0271: un prefijo que no es un tramo no se confunde con otro módulo', () => {
  const ruta = rutaDeNavegacion('/productosx', MENU, 'WebStore Admin | Otra');
  assert.equal(ruta.icono, null);
  assert.deepEqual(
    ruta.tramos.map((tramo) => tramo.etiqueta),
    ['Otra'],
  );
});

test('PBI-0271: sin título ni entrada del menú, la ruta queda vacía', () => {
  assert.deepEqual(rutaDeNavegacion('/no-existe', MENU, undefined).tramos, []);
});
