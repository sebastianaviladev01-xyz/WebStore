// Escenarios del lote 47 (ADR-0033, PBI-0267): «Revisión de contraste» del editor de temas explica la relación y sugiere un
// color que cumple. Se toma el diálogo «Nuevo tema» con B (cookie de la vista previa del modo demo), a 1440 y 375 px: sin
// avisos (los colores de partida), con un aviso (el contraste en #5F6B7A, el texto secundario no llega) y con un bloqueo
// (el contraste en #C8CDD5, el texto no llega). En cada toma, «Revisión de contraste» se lleva al principio del contenido
// del diálogo, que se desplaza dentro.
//
// Datos: una copia creada desde la semilla, en modo demo. Ningún escenario guarda (`sinGuardar`).
import { sinGuardar } from '../lib/qa.mjs';

/** Abre «Nuevo tema», escribe el código del contraste (si hay) y lleva «Revisión de contraste» arriba. */
const nuevoTemaCon = (contraste) => async (page) => {
  await page.getByRole('button', { name: 'Nuevo tema', exact: true }).first().click({ timeout: 3000 });
  const dialogo = page.getByRole('dialog');
  if (contraste) {
    const codigo = dialogo.getByRole('textbox', { name: 'Código hexadecimal de Contraste', exact: true });
    await codigo.fill(contraste);
    await codigo.press('Tab');
  }
  await dialogo
    .getByRole('heading', { name: 'Revisión de contraste' })
    .evaluate((titulo) => titulo.scrollIntoView({ block: 'start', behavior: 'instant' }));
};

const admin = (accion) => ({ ruta: '/temas', rol: 'superadmin', tema: 'b', antes: sinGuardar, accion });

export const escenarios = {
  'tema-nuevo-sin-avisos-b': admin(nuevoTemaCon(null)),
  'tema-nuevo-aviso-b': admin(nuevoTemaCon('#5F6B7A')),
  'tema-nuevo-bloqueo-b': admin(nuevoTemaCon('#C8CDD5')),
};
