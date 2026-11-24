// Escenarios del lote 27 (ADR-0025): PBI-0235, la ventana del tema («Nuevo tema» y «Editar») crece también en alto,
// hasta casi toda la pantalla, con el contenido desplazable dentro y los botones siempre a la vista. Se toma con A, B y
// C, a 1440 y 375 px.
//
// Datos: una copia creada desde la semilla, en modo demo, con un tema propio («Tema de prueba», o el nombre de
// `QA_TEMA_PROPIO`) creado por la API antes de la primera toma, sin activarlo: «Editar» necesita uno. A, B y C se ven con
// la cookie de la vista previa. Ningún escenario guarda.
import { sinGuardar } from '../lib/qa.mjs';

const PROPIO = process.env.QA_TEMA_PROPIO ?? 'Tema de prueba';

/** Pulsa un botón por su nombre exacto (el primero). */
const pulsarExacto = (nombre) => (page) =>
  page.getByRole('button', { name: nombre, exact: true }).first().click({ timeout: 3000 });

const temas = (tema, accion) => ({ ruta: '/temas', rol: 'superadmin', tema, antes: sinGuardar, accion });

export const escenarios = {};
for (const tema of ['a', 'b', 'c']) {
  escenarios[`tema-nuevo-${tema}`] = temas(tema, pulsarExacto('Nuevo tema'));
  escenarios[`tema-editar-${tema}`] = temas(tema, pulsarExacto(`Editar ${PROPIO}`));
}
