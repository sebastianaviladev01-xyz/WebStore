// Escenarios del lote 11 (ADR-0021): PBI-0171, los botones del panel de filtros de los listados del Admin («Buscar»,
// «Limpiar» y «Agregar», a la derecha y con ícono); PBI-0170, el vendedor con Inventario y Pedidos (solo lectura) y su
// Resumen; PBI-0176, el registro de la categoría con la foto de hasta 1 MB; PBI-0162, la imagen de la categoría en la
// lista de Categorías del Admin, en el filtro del catálogo y en los accesos por categoría del inicio. Para que se vean,
// la copia de datos lleva una imagen de 100 × 100 px en tres categorías (Monitores queda sin imagen).
import { pulsar } from '../lib/qa.mjs';

/** El carrusel del inicio cambia de banner cada 8 s: se anula ese temporizador para que las dos tomas vean el primero. */
const sinRotar = (page) =>
  page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 ? 0 : original(manejador, plazo, ...resto);
  });

/** Abre el selector «Categoría» del panel de filtros del catálogo. */
const abrirCategorias = (page) =>
  page.getByRole('combobox', { name: 'Categoría' }).first().click({ timeout: 3000 });

/**
 * Las tarjetas «Compra por categoría» del inicio aparecen al desplazarse (`wsReveal`): en una toma de página completa
 * quedan ocultas. Con movimiento reducido, la directiva las muestra desde el principio, sin cambiar su diseño.
 */
const sinAparicion = async (page) => {
  await sinRotar(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
};

export const escenarios = {
  'productos-superadmin': { ruta: '/productos', rol: 'superadmin' },
  'categorias-superadmin': { ruta: '/categorias', rol: 'superadmin' },
  'marcas-superadmin': { ruta: '/marcas', rol: 'superadmin' },
  'inventario-superadmin': { ruta: '/inventario', rol: 'superadmin' },
  'clientes-superadmin': { ruta: '/clientes', rol: 'superadmin' },
  'usuarios-superadmin': { ruta: '/usuarios', rol: 'superadmin' },
  'banners-superadmin': { ruta: '/banners', rol: 'superadmin' },
  'reclamaciones-superadmin': { ruta: '/reclamaciones', rol: 'superadmin' },
  'pedidos-superadmin': { ruta: '/pedidos', rol: 'superadmin' },
  'envios-superadmin': { ruta: '/envios', rol: 'superadmin' },
  'nueva-categoria-superadmin': { ruta: '/categorias/nueva', rol: 'superadmin' },
  'editar-categoria-superadmin': { ruta: '/categorias/cat-tv', rol: 'superadmin' },
  'resumen-vendedor': { ruta: '/', rol: 'vendedor' },
  'inventario-vendedor': { ruta: '/inventario', rol: 'vendedor' },
  'pedidos-vendedor': { ruta: '/pedidos', rol: 'vendedor' },
  'tienda-inicio': { tienda: true, ruta: '/', antes: sinRotar },
  'tienda-inicio-compra-por-categoria': { tienda: true, ruta: '/', antes: sinAparicion },
  'tienda-catalogo': { tienda: true, ruta: '/catalogo' },
  'tienda-catalogo-filtro-categoria': {
    tienda: true,
    ruta: '/catalogo',
    accion: abrirCategorias,
  },
  'tienda-menu-movil': {
    tienda: true,
    ruta: '/',
    antes: sinRotar,
    accion: pulsar('Abrir menú de navegación'),
    soloMovil: true,
  },
};
