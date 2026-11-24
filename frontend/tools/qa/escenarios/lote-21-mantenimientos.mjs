// Escenarios del lote 21 (ADR-0025): mantenimientos del backoffice. PBI-0211, más de tres campos en página propia
// (Usuarios y Banners) y hasta tres en ventana emergente (Marcas, Clientes y Tarifas de envío); PBI-0213, las tarjetas
// de los roles sin el conteo; PBI-0216, el distrito de una lista; PBI-0217, sin el ajuste porcentual.
// Antes del lote, el registro va al costado de la lista (Marcas, en `/marcas/nueva`); después, en su página o en la
// ventana. Cada escenario abre el registro como lo abre la persona: «Agregar» o «Editar» del registro de ejemplo.
// Los guardados se cortan con `sinGuardar`: los datos de la copia no cambian entre tomas.
import { sinGuardar } from '../lib/qa.mjs';

/** Pulsa el primer botón o enlace con ese nombre exacto (antes era un botón; después puede ser un enlace). */
const abrir = (nombre) => async (page) => {
  const control = page
    .getByRole('button', { name: nombre, exact: true })
    .or(page.getByRole('link', { name: nombre, exact: true }));
  await control.first().click({ timeout: 3000 });
};

const listado = (ruta) => ({ ruta, rol: 'superadmin', antes: sinGuardar });
const registro = (ruta, nombre) => ({ ruta, rol: 'superadmin', antes: sinGuardar, accion: abrir(nombre) });

export const escenarios = {
  'usuarios-superadmin': listado('/usuarios'),
  'usuarios-agregar': registro('/usuarios', 'Agregar usuario'),
  'usuarios-editar': registro('/usuarios', 'Editar usuario Administración Demo'),
  'usuarios-admin': { ruta: '/usuarios', rol: 'admin', antes: sinGuardar },
  'banners-superadmin': listado('/banners'),
  'banners-agregar': registro('/banners', 'Agregar banner'),
  'banners-editar': registro('/banners', 'Editar banner El cine, en tu sala.'),
  'marcas-superadmin': listado('/marcas'),
  'marcas-agregar': registro('/marcas', 'Agregar marca'),
  'marcas-editar': registro('/marcas', 'Editar marca Nova'),
  'clientes-superadmin': listado('/clientes'),
  'clientes-agregar': registro('/clientes', 'Agregar cliente'),
  'clientes-editar': registro('/clientes', 'Editar cliente Cliente Demo'),
  'envios-superadmin': listado('/envios'),
  'envios-agregar': registro('/envios', 'Agregar tarifa'),
  'envios-editar': registro('/envios', 'Editar tarifa de Lima Centro a Breña'),
};
