// Escenarios del lote 23 (ADR-0025): PBI-0222, el Dashboard del superadministrador y del vendedor, con «Clientes web
// nuevos» en el gráfico y sin «Pedidos por distrito»; PBI-0226, el registro del producto (nuevo y en edición) sin el
// campo «Stock», que se gestiona solo en Inventario, y la página de Inventario del superadministrador y del vendedor,
// que no debe cambiar.
//
// Datos: la copia de las capturas (`backend/data-capturas.json`), creada desde la semilla y preparada con
// `preparar-datos.mjs`. Ningún escenario guarda.
import { sinGuardar } from '../lib/qa.mjs';

const pagina = (ruta, rol) => ({ ruta, rol, tema: 'b', antes: sinGuardar });

export const escenarios = {
  'dashboard-superadmin': pagina('/', 'superadmin'),
  'dashboard-vendedor': pagina('/', 'vendedor'),
  'nuevo-producto-superadmin': pagina('/productos/nuevo', 'superadmin'),
  'editar-producto-superadmin': pagina('/productos/p-001', 'superadmin'),
  'inventario-superadmin': pagina('/inventario', 'superadmin'),
  'inventario-vendedor': pagina('/inventario', 'vendedor'),
};
