// Escenarios del lote 29 (ADR-0027): PBI-0239, el código hexadecimal de cada color en el editor de temas, y PBI-0238, la
// categoría con búsqueda en el filtro de Productos y en el registro del producto. Se toman con B y C (cookie de la vista
// previa del modo demo), a 1440 y 375 px.
//
// Datos: una copia creada desde la semilla, en modo demo, con un tema propio («Tema de prueba», o el nombre de
// `QA_TEMA_PROPIO`) creado por la API antes de la primera toma, sin activarlo: «Editar» necesita uno. Ningún escenario
// guarda.
import { sinGuardar } from '../lib/qa.mjs';

const PROPIO = process.env.QA_TEMA_PROPIO ?? 'Tema de prueba';

/** Pulsa un botón por su nombre exacto (el primero). */
const pulsarExacto = (nombre) => (page) =>
  page.getByRole('button', { name: nombre, exact: true }).first().click({ timeout: 3000 });

/** Abre la lista del campo «Categoría» (antes, el `mat-select`; después, el autocompletado). */
const abrirCategoria = (page) =>
  page.getByRole('combobox', { name: 'Categoría' }).first().click({ timeout: 3000 });

const admin = (ruta, tema, accion) => ({ ruta, rol: 'superadmin', tema, antes: sinGuardar, accion });

export const escenarios = {};
for (const tema of ['b', 'c']) {
  escenarios[`tema-nuevo-${tema}`] = admin('/temas', tema, pulsarExacto('Nuevo tema'));
  escenarios[`tema-editar-${tema}`] = admin('/temas', tema, pulsarExacto(`Editar ${PROPIO}`));
  escenarios[`productos-${tema}`] = admin('/productos', tema);
  escenarios[`productos-categoria-abierta-${tema}`] = admin('/productos', tema, abrirCategoria);
  escenarios[`producto-nuevo-${tema}`] = admin('/productos/nuevo', tema);
  escenarios[`producto-editar-${tema}`] = admin('/productos/p-004', tema);
}
