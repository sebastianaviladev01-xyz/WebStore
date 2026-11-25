import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 31 (ADR-0027, PBI-0243; provisional, por confirmar con Daniel): el título de cada página del backoffice lleva el
// ícono de su módulo, el mismo de su entrada del menú lateral. Los dos lo toman de `iconoDelModulo()`, así que no
// pueden separarse; los botones toman sus íconos del mismo `ICONOS`.
const fuente = await readFile(new URL('./iconos.ts', import.meta.url), 'utf8');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { ICONOS, iconoDelModulo } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

/** Las entradas del menú lateral (`layout/app.layout.ts`) y el ícono que llevaban antes del lote 31. */
const MENU = {
  '/': 'dashboard',
  '/productos': 'productos',
  '/inventario': 'inventario',
  '/categorias': 'categorias',
  '/marcas': 'marcas',
  '/pedidos': 'pedidos',
  '/clientes': 'clientes',
  '/reclamaciones': 'reclamaciones',
  '/banners': 'banners',
  '/contenido': 'contenido',
  '/entregas': 'entregas',
  '/temas': 'temas',
  '/envios': 'envios',
  '/usuarios': 'usuarios',
};

test('cada entrada del menú lateral tiene su ícono de módulo, con su trazo', () => {
  for (const [ruta, icono] of Object.entries(MENU)) {
    assert.equal(iconoDelModulo(ruta), icono, ruta);
    assert.match(ICONOS[icono], /^M/, `trazo de ${icono}`);
  }
});

test('los trazos de los módulos no cambian: el menú se ve igual que antes del lote 31', () => {
  assert.equal(ICONOS.dashboard, 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z');
  assert.equal(ICONOS.productos, 'M3 12V4h8l9 9-8 8zM7.5 7.5h.01');
  assert.equal(ICONOS.categorias, 'M3 6h6l2 2h10v11H3z');
});

test('el registro de un mantenimiento lleva el ícono del módulo de su listado', () => {
  assert.equal(iconoDelModulo('/productos/nuevo'), 'productos');
  assert.equal(iconoDelModulo('/productos/p-004'), 'productos');
  assert.equal(iconoDelModulo('/categorias/nueva'), 'categorias');
  assert.equal(iconoDelModulo('/usuarios/u-002'), 'usuarios');
  assert.equal(iconoDelModulo('/banners/nuevo'), 'banners');
});

test('los parámetros, el fragmento y la barra final no cambian el módulo', () => {
  assert.equal(iconoDelModulo('/productos?categoria=c-1&pagina=2'), 'productos');
  assert.equal(iconoDelModulo('/productos/nuevo?nombre=tv#galeria'), 'productos');
  assert.equal(iconoDelModulo('/?x=1'), 'dashboard');
  assert.equal(iconoDelModulo(''), 'dashboard');
  assert.equal(iconoDelModulo('/pedidos/'), 'pedidos');
  // Sin la barra inicial, como la arma `ActivatedRoute` con los tramos de la URL.
  assert.equal(iconoDelModulo('marcas'), 'marcas');
});

test('las páginas sin entrada en el menú tienen un ícono propio: Perfil e Ingreso', () => {
  assert.equal(iconoDelModulo('/perfil'), 'perfil');
  assert.equal(iconoDelModulo('/login'), 'ingresar');
  assert.match(ICONOS.perfil, /^M/);
  assert.match(ICONOS.ingresar, /^M/);
});

test('una ruta que no es de ningún módulo no tiene ícono', () => {
  assert.equal(iconoDelModulo('/no-existe'), null);
  assert.equal(iconoDelModulo('/productosx'), null);
});

test('cada ícono es un trazo de 24 × 24 que empieza con un movimiento', () => {
  for (const [nombre, trazo] of Object.entries(ICONOS)) {
    assert.equal(typeof trazo, 'string', nombre);
    assert.match(trazo, /^M[\d.]/, nombre);
  }
});
