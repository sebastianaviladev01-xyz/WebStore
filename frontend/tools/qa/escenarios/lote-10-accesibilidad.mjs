// Escenarios del lote 10 (PBI-0167): el vidrio oscuro de los controles del carrusel (con «Tono de la foto: Oscura») sube
// de opacidad para que el contador llegue a 4,5:1 sobre una foto blanca. Cubre el inicio con A, B y C. El seed no tiene
// un banner de tono oscuro: la toma mantiene la clase `is-dark-tone` en el carrusel, como la pondría el banner. Solo se
// ve a 1440 px; a 375 los controles no usan el vidrio oscuro y la toma debe salir igual.

/** El carrusel cambia de banner cada 8 s: se anula ese temporizador para que las dos tomas vean el primero. */
const sinRotar = (page) =>
  page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 ? 0 : original(manejador, plazo, ...resto);
  });

/**
 * Mantiene la clase `is-dark-tone` en el carrusel aunque Angular lo vuelva a pintar, como la tendría un banner de tono
 * oscuro. La toma de página completa cambia el tamaño de la ventana y eso vuelve a pintar el carrusel: sin transición,
 * el vidrio no se captura a medio cambiar de color.
 */
const conFotoOscura = (page) =>
  page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const estilo = document.createElement('style');
      estilo.textContent = '.ws-hero-controls { transition: none !important; }';
      document.head.appendChild(estilo);
    });
    // Solo si falta: `classList.add` de una clase presente también cuenta como cambio y el observador no pararía.
    const poner = () => {
      const carrusel = document.querySelector('.ws-hero');
      if (carrusel && !carrusel.classList.contains('is-dark-tone')) carrusel.classList.add('is-dark-tone');
    };
    new MutationObserver(poner).observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  });

export const escenarios = {};
for (const tema of ['a', 'b', 'c']) {
  escenarios[`tienda-inicio-foto-oscura-${tema}`] = {
    tienda: true,
    ruta: '/',
    tema,
    antes: async (page) => {
      await sinRotar(page);
      await conFotoOscura(page);
    },
  };
}
