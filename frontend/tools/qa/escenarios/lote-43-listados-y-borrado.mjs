// Escenarios del lote 43 (ADR-0033): PBI-0265, cada listado del backoffice en un solo panel, como la lista de
// proveedores del SGC, y PBI-0269, la ventana propia para confirmar los borrados. Con B y C (cookie de la vista previa),
// a 1440 y 375 px:
//   - `<listado>-<tema>`: Productos, Clientes, Usuarios y Pedidos. El cambio es intencionado: antes y después difieren
//     y cada diferencia se revisa a ojo (una sola tarjeta, filtros en una fila, «N°», insignias, acciones de solo ícono
//     y el pie con el resumen y la paginación).
//   - `borrado-<tema>` y `cancelar-pedido-<tema>`: las ventanas nuevas, solo en «después» (con `despues` en la línea de
//     órdenes); en «antes» eran el `confirm()` del navegador, que no sale en la captura.
//
// Datos: una copia creada desde la semilla, en modo demo (`WEBSTORE_DEMO_MODE=true`), con `preparar-datos.mjs` una
// sola vez, sin cambios entre las dos tomas. Ningún escenario guarda: `sinGuardar` corta los guardados.
import { sinGuardar } from '../lib/qa.mjs';

const despues = process.argv.includes('despues');

const listados = {
  productos: '/productos',
  clientes: '/clientes',
  usuarios: '/usuarios',
  pedidos: '/pedidos',
};

export const escenarios = {};
for (const tema of ['b', 'c']) {
  for (const [listado, ruta] of Object.entries(listados)) {
    escenarios[`${listado}-${tema}`] = { ruta, rol: 'superadmin', tema, antes: sinGuardar };
  }
  if (!despues) continue;
  escenarios[`borrado-${tema}`] = {
    ruta: '/clientes',
    rol: 'superadmin',
    tema,
    antes: sinGuardar,
    accion: (page) =>
      page
        .getByRole('button', { name: /^Eliminar cliente / })
        .first()
        .click({ timeout: 3000 }),
  };
  escenarios[`cancelar-pedido-${tema}`] = {
    ruta: '/pedidos',
    rol: 'superadmin',
    tema,
    antes: sinGuardar,
    accion: async (page) => {
      await page.getByRole('combobox', { name: 'Cambiar estado' }).click({ timeout: 3000 });
      await page.getByRole('option', { name: 'Cancelado' }).click({ timeout: 3000 });
    },
  };
}
