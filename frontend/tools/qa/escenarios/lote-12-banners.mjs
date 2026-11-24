// Escenarios del lote 12 (ADR-0021): PBI-0184, los dos botones configurables de cada banner (el principal con la
// paleta primaria y el secundario con la secundaria del tema), en el carrusel del inicio, en las promociones y en el
// formulario del Admin; PBI-0174, los enlaces externos de los banners en otra pestaña (no cambia lo que se ve).
// La tienda se toma con A, B y C. Los datos son los de la copia, sin cambios; `conBotonesSecundarios` añade, solo en la
// respuesta de `/content/banners` de esa toma, un botón secundario a las promociones para ver los dos juntos.
import { sinGuardar } from '../lib/qa.mjs';

/** El carrusel cambia de banner cada 8 s y las secciones aparecen al desplazarse: se anulan las dos cosas. */
const quieto = async (page) => {
  await page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 ? 0 : original(manejador, plazo, ...resto);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
};

/** Las promociones llevan también un botón secundario (uno externo); el resto de la respuesta no cambia. */
const conBotonesSecundarios = async (page) => {
  await quieto(page);
  await page.route('**/content/banners', async (route) => {
    const respuesta = await route.fetch();
    const banners = await respuesta.json();
    await route.fulfill({
      response: respuesta,
      json: banners.map((banner) =>
        banner.placement === 'hero'
          ? banner
          : { ...banner, secondaryCtaLabel: 'Ver ofertas', secondaryCtaUrl: 'https://example.com/ofertas' },
      ),
    });
  });
};

const tienda = {};
for (const tema of ['a', 'b', 'c']) {
  tienda[`tienda-inicio-${tema}`] = { tienda: true, ruta: '/', tema, antes: quieto };
  tienda[`tienda-inicio-dos-botones-${tema}`] = {
    tienda: true,
    ruta: '/',
    tema,
    antes: conBotonesSecundarios,
  };
}

export const escenarios = {
  ...tienda,
  'banners-superadmin': { ruta: '/banners', rol: 'superadmin' },
  // Desde el lote 21 (PBI-0211), «Editar banner …» es un enlace a la página de registro: se abre por su ruta (lote 25).
  'banners-editar-hero-superadmin': { ruta: '/banners/bn-1', rol: 'superadmin', antes: sinGuardar },
};
