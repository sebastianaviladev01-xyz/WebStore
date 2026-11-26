// Escenarios del lote 37 (ADR-0031): las herramientas de capturas, no un cambio de la tienda.
//   - PBI-0253: el inicio y la ficha de un producto con los temas A, B y C (cookie de la vista previa del modo demo) se
//     toman dos veces con el mismo código; la comparación mide el ruido de antialiasado entre tomas, como el de las
//     esquinas de «Ver electrohogar» y «Ver monitores» del inicio a 1440 px (lote 34).
//   - PBI-0252: la ficha se toma además en la ventana, arriba, a la mitad y al final (`desplazamientos`): la barra
//     pegada «Agregar al carrito» de 375 px sale en su sitio en cada posición, no a media página como en la toma de
//     página completa.
//
// Datos: una copia creada desde la semilla (`WEBSTORE_DATA_FILE`), con el BFF en modo demo. Ningún escenario guarda.
import { BFF } from '../lib/qa.mjs';

const productos = await (await fetch(`${BFF}/bff/catalog/products`)).json();
const conStock = productos.find((producto) => producto.stock > 0);

/** El carrusel cambia de banner cada 8 s y los avisos cada 6 s: se anulan, como en los lotes 28 y 34. */
const quieto = (page) =>
  page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 || plazo === 6000 ? 0 : original(manejador, plazo, ...resto);
  });

export const escenarios = {};
for (const tema of ['a', 'b', 'c']) {
  escenarios[`tienda-inicio-${tema}`] = { tienda: true, ruta: '/', tema, antes: quieto };
  escenarios[`tienda-ficha-${tema}`] = {
    tienda: true,
    ruta: `/catalogo/${conStock.slug}`,
    tema,
    antes: quieto,
    desplazamientos: [0, 'mitad', 'final'],
  };
}
