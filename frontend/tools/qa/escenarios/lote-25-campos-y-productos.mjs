// Escenarios del lote 25 (ADR-0025): PBI-0212, los campos del Admin con el contorno de la tienda (registro del
// producto, listados con sus filtros, una ventana de registro, Contenido, Temas con su ventana, Reclamaciones con el
// detalle abierto, Inventario, Entregas y feriados, y el perfil), con A, B y C y con un tema propio oscuro; PBI-0218 y
// PBI-0219, el listado de Productos con el SKU en su columna y el precio con dos decimales; PBI-0224, la ventana
// «Nuevo tema» más grande; la reclamación abierta marcada en la lista; y la ficha del producto de la tienda, que no
// debe cambiar (la foto principal declara su conjunto de tamaños para no avisar NG02960).
//
// Datos: una copia creada desde la semilla, en modo demo, preparada una vez con `preparar-datos.mjs` y con un tema
// propio oscuro creado y activado por la API antes de la primera toma. A, B y C se ven con la cookie de la vista previa;
// el oscuro (`tema: 'oscuro'`, que la vista previa no conoce) es el activo. Ningún escenario guarda.
import { sinGuardar } from '../lib/qa.mjs';

const TEMAS = ['a', 'b', 'c', 'oscuro'];

/** Abre la primera reclamación de la lista, la que creó `preparar-datos.mjs`. */
const abrirReclamacion = (page) =>
  page
    .getByRole('region', { name: 'Lista de reclamaciones' })
    .getByRole('button')
    .first()
    .click({ timeout: 3000 });

/** Pulsa un botón por su nombre exacto (el primero). */
const pulsarExacto = (nombre) => (page) =>
  page.getByRole('button', { name: nombre, exact: true }).first().click({ timeout: 3000 });

const admin = (ruta, tema, extra = {}) => ({ ruta, rol: 'superadmin', tema, antes: sinGuardar, ...extra });

export const escenarios = {};
for (const tema of TEMAS) {
  escenarios[`nuevo-producto-${tema}`] = admin('/productos/nuevo', tema);
  escenarios[`productos-${tema}`] = admin('/productos', tema);
  escenarios[`usuarios-${tema}`] = admin('/usuarios', tema);
  escenarios[`marca-ventana-${tema}`] = admin('/marcas', tema, { accion: pulsarExacto('Agregar marca') });
  escenarios[`contenido-${tema}`] = admin('/contenido', tema);
  escenarios[`temas-ventana-${tema}`] = admin('/temas', tema, { accion: pulsarExacto('Nuevo tema') });
  escenarios[`reclamaciones-${tema}`] = admin('/reclamaciones', tema, { accion: abrirReclamacion });
  escenarios[`inventario-${tema}`] = admin('/inventario', tema);
}
escenarios['entregas-b'] = admin('/entregas', 'b');
escenarios['perfil-b'] = admin('/perfil', 'b');
for (const tema of ['a', 'b', 'c'])
  escenarios[`tienda-ficha-${tema}`] = { tienda: true, ruta: '/catalogo/oled-vision-55-4k', tema };
