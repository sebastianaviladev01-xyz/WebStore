import { galleryOf } from '../catalogo/producto.rules.mjs';

/**
 * Fotos de los pedidos anteriores (lote 27, ADR-0025, PBI-0236; ADR-0026, provisional). Un pedido guarda la ficha
 * pública del producto. Hasta el lote 25, esa ficha llevaba las fotos de la galería como Data URL (hasta 250 KB cada
 * una, dentro de cada pedido); desde entonces lleva su dirección. Estas reglas llevan un pedido anterior a esa forma:
 *
 * - Una foto de `images` que el producto todavía tiene en su galería pasa a `gallery/{n}`, su posición en `galleryOf`,
 *   como en un pedido nuevo. Si coincide con la imagen principal o la miniatura vigentes, a la de ese campo.
 * - La que el producto ya no tiene (o de un producto eliminado) se quita: ningún lugar muestra la galería de un pedido
 *   y el BFF no podría servirla.
 * - La imagen y la miniatura de la línea, que el detalle del pedido sí muestra, pasan a la dirección de su campo
 *   (`image` o `thumbnail`), como en un pedido creado desde el lote 24.
 *
 * `direccion(coleccion, id, campo, valor)` da la dirección pública (la del BFF, `direccionDeImagen`); si devuelve otra
 * Data URL, esa imagen no se sirve por dirección (una SVG): la de la línea se conserva y la de la galería se quita.
 */

const esDataUrl = (valor) => typeof valor === 'string' && /^data:/i.test(valor);

/** Campo del producto vigente que guarda `valor`: su foto de galería, la imagen principal o la miniatura. */
function campoVigente(producto, valor) {
  if (!producto) return null;
  const posicion = galleryOf(producto).indexOf(valor);
  if (posicion >= 0) return `gallery/${posicion}`;
  if (producto.imageUrl === valor) return 'image';
  if (producto.thumbnailUrl === valor) return 'thumbnail';
  return null;
}

/** La ficha de una línea sin Data URL, con lo que cambió; `null` si no cambia nada. */
function fichaSinDataUrl(ficha, id, producto, direccion) {
  let aDireccion = 0;
  let quitadas = 0;
  /** La imagen y la miniatura de la línea: la dirección de su propio campo, o tal cual si no se sirve por dirección. */
  const deLaLinea = (valor, campo) => {
    if (!esDataUrl(valor)) return valor;
    const nueva = direccion('products', id, campo, valor);
    if (!esDataUrl(nueva)) aDireccion++;
    return nueva;
  };
  const siguiente = { ...ficha };
  if ('imageUrl' in ficha) siguiente.imageUrl = deLaLinea(ficha.imageUrl, 'image');
  if ('thumbnailUrl' in ficha) siguiente.thumbnailUrl = deLaLinea(ficha.thumbnailUrl, 'thumbnail');
  if (Array.isArray(ficha.images)) {
    // La primera de `images` igual a la imagen de la línea es esa imagen: la ficha pública empieza por ella.
    const principal = ficha.images.indexOf(ficha.imageUrl);
    siguiente.images = ficha.images.flatMap((valor, posicion) => {
      if (!esDataUrl(valor)) return [valor];
      if (posicion === principal) return [siguiente.imageUrl];
      const campo = campoVigente(producto, valor);
      const nueva = campo ? direccion('products', id, campo, valor) : valor;
      if (esDataUrl(nueva)) {
        quitadas++;
        return [];
      }
      aDireccion++;
      return [nueva];
    });
  }
  return aDireccion + quitadas > 0 ? { ficha: siguiente, aDireccion, quitadas } : null;
}

/**
 * Los pedidos sin Data URL en sus fichas, con cuántas imágenes pasaron a una dirección y cuántas se quitaron. No
 * cambia lo que recibe; un pedido sin Data URL se devuelve tal cual, así que aplicarla otra vez no hace nada.
 */
export function pedidosSinDataUrl(orders, products, direccion) {
  let aDireccion = 0;
  let quitadas = 0;
  const siguientes = orders.map((order) => {
    if (!Array.isArray(order?.items)) return order;
    let cambio = false;
    const items = order.items.map((item) => {
      if (!item?.product || typeof item.product !== 'object') return item;
      const id = item.productId ?? item.product.id;
      const producto = products.find((candidato) => candidato.id === id);
      const resultado = fichaSinDataUrl(item.product, id, producto, direccion);
      if (!resultado) return item;
      cambio = true;
      aDireccion += resultado.aDireccion;
      quitadas += resultado.quitadas;
      return { ...item, product: resultado.ficha };
    });
    return cambio ? { ...order, items } : order;
  });
  return { orders: siguientes, aDireccion, quitadas };
}
