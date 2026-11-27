// Escenarios del lote 44 (ADR-0033): PBI-0268, las páginas de registro como los formularios del SGC (tarjeta con
// «Regresar», fila de cabecera con estado, usuario y fecha, secciones con ícono, características en una tabla y el pie
// con «Cancelar», «Guardar y continuar» y «Guardar»), y PBI-0271, la ruta de navegación en la barra superior.
// Las páginas de registro (Nuevo y Editar producto, Nuevo usuario y Nuevo banner) y un listado (Productos, para la
// ruta), con B y C (cookie de la vista previa), a 1440 y 375 px. Cada registro se abre como lo abre la persona:
// «Agregar» o «Editar» del listado. La fecha de la cabecera es la del reloj: se fija con `page.clock` para que las tomas
// no difieran por la hora. Los guardados se cortan con `sinGuardar`: los datos de la copia no cambian entre tomas.
import { sinGuardar } from '../lib/qa.mjs';

/** 15:04 UTC del 2026-11-26: las 10:04 en Lima. */
const AHORA = new Date('2026-11-26T15:04:00Z');

const preparar = async (page) => {
  await page.clock.setFixedTime(AHORA);
  await sinGuardar(page);
};

/** Pulsa el enlace o el botón con ese nombre exacto. */
const abrir = (nombre) => async (page) => {
  const control = page
    .getByRole('link', { name: nombre, exact: true })
    .or(page.getByRole('button', { name: nombre, exact: true }));
  await control.first().click({ timeout: 5000 });
  await page.getByRole('form').first().waitFor({ timeout: 10000 });
};

const paginas = {
  'productos-listado': { ruta: '/productos' },
  'productos-nuevo': { ruta: '/productos', accion: abrir('Agregar producto') },
  'productos-editar': { ruta: '/productos', accion: abrir('Editar producto Soundbar Cinema 500') },
  'usuarios-nuevo': { ruta: '/usuarios', accion: abrir('Agregar usuario') },
  'banners-nuevo': { ruta: '/banners', accion: abrir('Agregar banner') },
};

export const escenarios = {};
for (const tema of ['b', 'c']) {
  for (const [nombre, pagina] of Object.entries(paginas)) {
    escenarios[`${nombre}-${tema}`] = { ...pagina, rol: 'superadmin', tema, antes: preparar };
  }
}
