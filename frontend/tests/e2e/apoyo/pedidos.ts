import { expect, test, type Page } from '@playwright/test';

import { enviarCambios, leerProductos, leerSnapshot } from './catalogo';
import { urls } from './entorno';

/**
 * Las suites comparten el stock de los productos de la semilla: una que deja pedidos abiertos deja sin stock a las
 * siguientes (hallazgo del lote 19, PBI-0207). `conservarElStock()`, al principio de cada spec que crea pedidos, anota
 * los pedidos y el stock al empezar y, al terminar la spec, cancela desde el Admin los pedidos nuevos que siguen
 * abiertos (cancelar libera su stock, en cualquier estado) y comprueba que el stock quedó como estaba. Las specs van en
 * serie (`workers: 1`), así que los pedidos nuevos son los de la spec.
 */
export function conservarElStock(): void {
  let pedidosAntes = new Set<string>();
  let stockAntes = new Map<string, number>();
  test.beforeAll(async () => {
    pedidosAntes = new Set((await leerSnapshot()).orders.map((pedido) => pedido.id));
    stockAntes = new Map((await leerProductos()).map((producto) => [producto.id, producto.stock]));
  });
  test.afterAll(async () => {
    const abiertos = (await leerSnapshot()).orders.filter(
      (pedido) => !pedidosAntes.has(pedido.id) && pedido.status !== 'cancelled',
    );
    if (abiertos.length)
      await enviarCambios({
        orders: { upsert: abiertos.map(({ id }) => ({ id, status: 'cancelled' })) },
      });
    const stockDespues = new Map((await leerProductos()).map((producto) => [producto.id, producto.stock]));
    for (const [id, stock] of stockAntes)
      if (stockDespues.has(id))
        expect(stockDespues.get(id), `stock de ${id} al terminar la spec`).toBe(stock);
  });
}

/**
 * Cancela, con el token que guarda la tienda, los pedidos de invitado que la prueba hizo en este navegador: devuelve su
 * stock antes de la prueba siguiente de la misma spec.
 */
export async function cancelarLosPedidosDelNavegador(page: Page): Promise<void> {
  const accesos = await page
    .evaluate(() => localStorage.getItem('webstore-order-access-v1'))
    .catch(() => null);
  for (const [id, token] of Object.entries(JSON.parse(accesos ?? '{}') as Record<string, string>))
    await page.request.patch(`${urls.bff}/bff/orders/${id}/cancel`, {
      headers: { 'x-order-token': token },
      data: {},
    });
}
