// Escenarios del lote 46 (ADR-0033): PBI-0266, el estilo de cada botón del banner («Principal», «Secundario»,
// «Contraste» y «Con borde»), en el carrusel del inicio y en las promociones, y la sección «Botones» del registro del
// banner en el backoffice.
// La tienda se toma con A, B y C, sobre la foto clara de los datos (la sala de «bn-1») y sobre una foto oscura, la de
// las e2e del tono (`#1F2937`, con «Controles del carrusel sobre la foto: Oscuros»). Las respuestas se cambian solo en
// la toma, con `page.route`: los datos de la copia no cambian.
// - `por-omision`: los banners como están, sin estilos; antes y después deben ser iguales (0 diferencias).
// - `estilos`: el banner activo lleva «Contraste» y «Con borde», y las promociones los cuatro estilos repartidos.
import { sinGuardar } from '../lib/qa.mjs';

/** Foto oscura: la de la e2e del tono de los controles (`admin-imagenes-y-banners.spec.ts`). */
const FOTO_OSCURA = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1024"><rect width="100%" height="100%" fill="#1f2937"/></svg>',
)}`;

/** El carrusel cambia de banner cada 8 s y las secciones aparecen al desplazarse: se anulan las dos cosas. */
const quieto = async (page) => {
  await page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 ? 0 : original(manejador, plazo, ...resto);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
};

/** Estilos de las promociones: entre las dos, los cuatro. */
const PROMOCIONES = [
  { ctaStyle: 'contrast', secondaryCtaStyle: 'outline' },
  { ctaStyle: 'outline', secondaryCtaStyle: 'primary' },
];

/**
 * Cambia la respuesta de `/content/banners`: con `oscura`, el primer banner principal lleva la foto oscura y los
 * controles oscuros; con `estilos`, ese banner lleva «Contraste» y «Con borde», y cada promoción, dos botones con los
 * estilos de `PROMOCIONES`.
 */
const conBanners =
  ({ oscura = false, estilos = false }) =>
  async (page) => {
    await quieto(page);
    await page.route('**/content/banners', async (route) => {
      const respuesta = await route.fetch();
      const banners = await respuesta.json();
      const primerHero = banners.find((banner) => banner.placement === 'hero');
      let promocion = 0;
      await route.fulfill({
        response: respuesta,
        json: banners.map((banner) => {
          if (banner === primerHero)
            return {
              ...banner,
              ...(oscura ? { imageUrl: FOTO_OSCURA, mobileImageUrl: FOTO_OSCURA, imageTone: 'dark' } : {}),
              ...(estilos ? { ctaStyle: 'contrast', secondaryCtaStyle: 'outline' } : {}),
            };
          if (!estilos || banner.placement === 'hero') return banner;
          const estilo = PROMOCIONES[promocion++ % PROMOCIONES.length];
          return { ...banner, secondaryCtaLabel: 'Ver ofertas', secondaryCtaUrl: '/catalogo', ...estilo };
        }),
      });
    });
  };

/** La fila de cabecera del registro muestra la fecha y la hora: el reloj se fija, como en el lote 44. */
const registroQuieto = async (page) => {
  await page.clock.setFixedTime(new Date('2026-11-26T15:04:00Z'));
  await sinGuardar(page);
};

const tienda = {};
for (const tema of ['a', 'b', 'c']) {
  for (const [foto, oscura] of [
    ['foto-clara', false],
    ['foto-oscura', true],
  ]) {
    tienda[`tienda-por-omision-${foto}-${tema}`] = {
      tienda: true,
      ruta: '/',
      tema,
      antes: conBanners({ oscura }),
    };
    tienda[`tienda-estilos-${foto}-${tema}`] = {
      tienda: true,
      ruta: '/',
      tema,
      antes: conBanners({ oscura, estilos: true }),
    };
  }
}

export const escenarios = {
  ...tienda,
  // La sección «Botones» del registro, con el banner «bn-1» (sus dos botones). El guardado se corta.
  'banners-editar-hero-b': { ruta: '/banners/bn-1', rol: 'superadmin', tema: 'b', antes: registroQuieto },
};
