// Escenarios de PBI-0272 (hallazgo del lote 47): el diálogo «Nuevo tema» a 375 × 812 con B (cookie de la vista previa
// del modo demo), recién abierto, tras llegar con la rueda al final del contenido y con «Revisión de contraste» llevada al
// principio, como en las tomas del lote 47. Lo que importa es la ventana real (`-ventana-0`): la de página completa
// estira el lienzo. Antes de la corrección, al llegar al final se desplazaba la ventana entera y quedaba un hueco bajo
// «Cancelar» y «Guardar tema».
//
// Datos: una copia creada desde la semilla, en modo demo. Ningún escenario guarda (`sinGuardar`).
import { sinGuardar } from '../lib/qa.mjs';

/** Abre «Nuevo tema» y espera a que Material ponga el foco en «Nombre» (fin de la animación de apertura). */
async function abrirNuevoTema(page) {
  await page.getByRole('button', { name: 'Nuevo tema', exact: true }).first().click({ timeout: 3000 });
  const dialogo = page.getByRole('dialog');
  await dialogo.getByRole('textbox', { name: 'Nombre' }).waitFor();
  await page.waitForFunction(() => document.activeElement?.getAttribute('formcontrolname') === 'nombre');
  return dialogo;
}

/** Gira la rueda sobre el contenido hasta que la última nota se ve, y tres veces más. */
const ruedaAlFinal = async (page) => {
  const dialogo = await abrirNuevoTema(page);
  await dialogo.getByRole('group', { name: 'Colores' }).hover();
  const nota = dialogo.getByText('Solo cambia aquí.', { exact: false });
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, 600);
    const visible = await nota.evaluate((nodo) => nodo.getBoundingClientRect().bottom <= window.innerHeight);
    if (visible) break;
  }
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 600);
};

/** Como el lote 47: «Revisión de contraste» se lleva al principio del contenido. */
const revisionArriba = async (page) => {
  const dialogo = await abrirNuevoTema(page);
  await dialogo
    .getByRole('heading', { name: 'Revisión de contraste' })
    .evaluate((titulo) => titulo.scrollIntoView({ block: 'start', behavior: 'instant' }));
};

const admin = (accion) => ({
  ruta: '/temas',
  rol: 'superadmin',
  tema: 'b',
  antes: sinGuardar,
  accion,
  desplazamientos: [0],
});

export const anchos = [{ width: 375, height: 812 }];

export const escenarios = {
  'tema-nuevo-abierto-b': admin(abrirNuevoTema),
  'tema-nuevo-rueda-al-final-b': admin(ruedaAlFinal),
  'tema-nuevo-revision-arriba-b': admin(revisionArriba),
};
