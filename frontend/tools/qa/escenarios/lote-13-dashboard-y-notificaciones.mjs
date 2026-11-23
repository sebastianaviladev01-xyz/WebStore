// Escenarios del lote 13 (ADR-0021): el Dashboard (el «Resumen» hasta este lote, PBI-0168) del superadministrador y del
// vendedor, con las cifras plegables (PBI-0187), la ayuda de «Total de ventas» (PBI-0186) y sin «Personas en línea»
// (PBI-0172); y la campana abierta con los pedidos, los reclamos y los errores de compra (PBI-0173). Los guardados se
// cortan con `sinGuardar`: abrir la campana no marca «visto», así las dos tomas ven los mismos avisos. Tomadas «antes»
// sobre la base del lote, las acciones que no existían (plegar «Cifras», abrir la ayuda) fallan y la captura queda como
// la página sin acción.
import { pulsar, sinGuardar } from '../lib/qa.mjs';

const campana = (page) => page.getByRole('button', { name: /^Notificaciones/ }).click({ timeout: 3000 });
const ayudaDeVentas = (page) =>
  page.getByRole('button', { name: 'Qué incluye: Total de ventas' }).click({ timeout: 3000 });

export const escenarios = {
  'dashboard-superadmin': { ruta: '/', rol: 'superadmin', antes: sinGuardar },
  'dashboard-vendedor': { ruta: '/', rol: 'vendedor', antes: sinGuardar },
  'dashboard-cifras-plegadas-superadmin': {
    ruta: '/',
    rol: 'superadmin',
    antes: sinGuardar,
    accion: pulsar('Cifras'),
  },
  'dashboard-ayuda-ventas-superadmin': {
    ruta: '/',
    rol: 'superadmin',
    antes: sinGuardar,
    accion: ayudaDeVentas,
  },
  'campana-superadmin': { ruta: '/', rol: 'superadmin', antes: sinGuardar, accion: campana },
  'campana-vendedor': { ruta: '/', rol: 'vendedor', antes: sinGuardar, accion: campana },
};
