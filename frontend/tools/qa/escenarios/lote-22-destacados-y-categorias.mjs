// Escenarios del lote 22 (ADR-0025): PBI-0215, los productos destacados configurables (el inicio con los cuatro de
// siempre, con A, B y C, debe verse igual; con más de cuatro, el carrusel) y la casilla «Es destacado» del registro del
// producto; PBI-0220, la lista de Categorías del Admin como árbol que se abre por niveles.
//
// Datos: la copia de las capturas (`backend/data-capturas.json`), creada desde la semilla. Ningún escenario guarda.
import { sinGuardar } from '../lib/qa.mjs';

/** El carrusel de banners cambia cada 8 s y los avisos cada 6 s: se anulan para que las tomas coincidan. */
const quieto = (page) =>
  page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 || plazo === 6000 ? 0 : original(manejador, plazo, ...resto);
  });

/**
 * Todos los productos activos marcados como destacados en la respuesta del catálogo (no en la copia de datos): antes
 * del lote, el inicio mostraba solo cuatro; después, el carrusel con los que tienen stock.
 */
const todosDestacados = async (page) => {
  await quieto(page);
  await page.route('**/bff/catalog/products', async (ruta) => {
    const respuesta = await ruta.fetch();
    const productos = await respuesta.json();
    await ruta.fulfill({ response: respuesta, json: productos.map((p) => ({ ...p, featured: true })) });
  });
};

const inicio = (tema) => ({ tienda: true, ruta: '/', tema, antes: quieto });

/** Abre «TV y audio» en el árbol de Categorías (después del lote); antes no hay nada que abrir. */
const abrirTvYAudio = async (page) => {
  const fila = page.getByRole('treeitem', { name: 'TV y audio' });
  if (await fila.count()) await fila.click({ position: { x: 16, y: 16 } });
};

export const escenarios = {
  'tienda-inicio-a': inicio('a'),
  'tienda-inicio-b': inicio('b'),
  'tienda-inicio-c': inicio('c'),
  'tienda-inicio-todos-destacados-b': { tienda: true, ruta: '/', tema: 'b', antes: todosDestacados },
  'categorias-superadmin-b': { ruta: '/categorias', rol: 'superadmin', tema: 'b' },
  'categorias-abierta-superadmin-b': {
    ruta: '/categorias',
    rol: 'superadmin',
    tema: 'b',
    accion: abrirTvYAudio,
  },
  'categorias-filtro-oled-superadmin-b': { ruta: '/categorias?nombre=oled', rol: 'superadmin', tema: 'b' },
  'editar-producto-superadmin-b': {
    ruta: '/productos/p-001',
    rol: 'superadmin',
    tema: 'b',
    antes: sinGuardar,
  },
  'nuevo-producto-superadmin-b': {
    ruta: '/productos/nuevo',
    rol: 'superadmin',
    tema: 'b',
    antes: sinGuardar,
  },
};
