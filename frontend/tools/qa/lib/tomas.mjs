// Tomas de cada escenario de `capturas.mjs` (lote 37, PBI-0252, ADR-0031). Funciones puras, sin Playwright, probadas
// en `tomas.spec.mjs`.
//
// La captura de página completa dibuja los elementos fijos o pegados (`position: fixed` o `sticky`) en su lugar del
// primer viewport: en una página más alta que la ventana quedan a media página y dejan huecos o solapes que no existen
// en la ventana real (la barra «Agregar al carrito» de la ficha a 375 px). Un escenario puede pedir además capturas de
// la ventana, del tamaño del viewport, en posiciones de desplazamiento: `desplazamientos: [0, 'mitad', 'final', 1200]`.
//   - Un entero ≥ 0 es la posición en píxeles desde arriba (si la página no da para tanto, se queda en el final).
//   - 'mitad' es la mitad del desplazamiento posible y 'final', el final de la página.
// Cada posición se guarda en `<escenario>-<ancho>-ventana-<posición>.png`, junto a la de página completa
// (`<escenario>-<ancho>.png`, que no cambia), y `comparar.mjs` las empareja por el nombre como a cualquier otra.

const POSICIONES_CON_NOMBRE = ['mitad', 'final'];

/** Comprueba la lista `desplazamientos` de un escenario; lanza un error que lo dice si alguna posición no vale. */
function validarDesplazamientos(nombre, desplazamientos) {
  if (!Array.isArray(desplazamientos)) {
    throw new Error(`«${nombre}»: \`desplazamientos\` debe ser una lista, por ejemplo [0, 'mitad', 'final']`);
  }
  const vistas = new Set();
  for (const posicion of desplazamientos) {
    const valida = (Number.isInteger(posicion) && posicion >= 0) || POSICIONES_CON_NOMBRE.includes(posicion);
    if (!valida) {
      throw new Error(
        `«${nombre}»: la posición ${JSON.stringify(posicion)} de \`desplazamientos\` no es un entero ≥ 0, 'mitad' ni 'final'`,
      );
    }
    if (vistas.has(posicion)) {
      throw new Error(`«${nombre}»: la posición ${posicion} de \`desplazamientos\` está repetida`);
    }
    vistas.add(posicion);
  }
}

/**
 * Las tomas de un escenario a un ancho, en orden: primero la de página completa (`posicion: null`), con el nombre de
 * siempre, y después una captura de la ventana por cada posición de `escenario.desplazamientos`.
 */
export function tomasDeEscenario(nombre, escenario, ancho) {
  const desplazamientos = escenario.desplazamientos ?? [];
  validarDesplazamientos(nombre, desplazamientos);
  return [
    { archivo: `${nombre}-${ancho}.png`, posicion: null },
    ...desplazamientos.map((posicion) => ({
      archivo: `${nombre}-${ancho}-ventana-${posicion}.png`,
      posicion,
    })),
  ];
}

/** Posición en píxeles de una toma de la ventana, dentro del desplazamiento posible de la página. */
export function resolverDesplazamiento(posicion, { altoDelDocumento, altoDeLaVentana }) {
  const maximo = Math.max(0, altoDelDocumento - altoDeLaVentana);
  if (posicion === 'final') return maximo;
  if (posicion === 'mitad') return Math.floor(maximo / 2);
  return Math.min(posicion, maximo);
}
