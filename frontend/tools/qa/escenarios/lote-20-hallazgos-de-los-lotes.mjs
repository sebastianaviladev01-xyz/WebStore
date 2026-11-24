// Escenarios del lote 20 (ADR-0021, hallazgos de los lotes 11 a 17): recuperar la contraseña sin errores antes de
// escribir (los campos nuevos tras «Enviar código»), la versión de los términos en su página y el botón secundario de
// los banners con el puntero encima, con A, B y C. `tienda-inicio-b` es la toma de página completa del inicio sin
// preparar nada: sirve para comprobar que `capturas.mjs` muestra lo que aparece al desplazarse (`wsReveal`).
//
// Datos: la copia de las capturas (`backend/data-capturas.json`), creada desde la semilla. Ningún escenario guarda: el
// correo de recuperar no tiene cuenta, así que el BFF no genera un código que cambie entre tomas.

/** El carrusel de banners cambia cada 8 s y los avisos cada 6 s: se anulan para que las tomas coincidan. */
const quieto = (page) =>
  page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 || plazo === 6000 ? 0 : original(manejador, plazo, ...resto);
  });

/** Pide el código de recuperación para un correo sin cuenta: aparecen el código y la contraseña nueva, vacíos. */
const pedirCodigo = async (page) => {
  await page.getByRole('textbox', { name: 'Correo' }).fill('sin-cuenta@example.com');
  await page.getByRole('button', { name: 'Enviar código' }).click();
  await page.getByRole('textbox', { name: 'Código de recuperación' }).waitFor();
};

/** El puntero sobre el botón secundario del primer banner («Ver todos los productos», `ws-btn-accent`). */
const sobreElSecundario = async (page) => {
  const boton = page.getByRole('link', { name: 'Ver todos los productos' }).first();
  await boton.hover();
  // La transición del botón termina antes de la toma (`asentar` espera las animaciones que acaban).
};

const inicioConPuntero = (tema) => ({
  tienda: true,
  ruta: '/',
  tema,
  antes: quieto,
  accion: sobreElSecundario,
});

export const escenarios = {
  'tienda-recuperar-codigo-b': { tienda: true, ruta: '/cuenta/recuperar', tema: 'b', accion: pedirCodigo },
  'tienda-terminos-b': { tienda: true, ruta: '/info/terminos', tema: 'b' },
  'tienda-terminos-c': { tienda: true, ruta: '/info/terminos', tema: 'c' },
  'tienda-inicio-secundario-a': inicioConPuntero('a'),
  'tienda-inicio-secundario-b': inicioConPuntero('b'),
  'tienda-inicio-secundario-c': inicioConPuntero('c'),
  'tienda-inicio-b': { tienda: true, ruta: '/', tema: 'b', antes: quieto },
};
