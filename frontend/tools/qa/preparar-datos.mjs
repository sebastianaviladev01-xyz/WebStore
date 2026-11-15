// Prepara la copia de datos de las capturas (PBI-0057), una sola vez y antes de la primera toma: un pedido de invitado y
// un reclamo por la API pública, para que Pedidos, el Resumen y las páginas del pedido tengan algo que mostrar. Uso,
// desde frontend/:
//   node tools/qa/preparar-datos.mjs
// Cambia datos: solo contra un BFF levantado sobre una copia (`WEBSTORE_DATA_FILE=<ruta absoluta> npm run start:bff`),
// nunca sobre `backend/data.json`. Imprime el `id` y el `accessToken` del pedido, que un escenario puede usar para abrir
// su detalle (la tienda lo guarda en `localStorage`, clave `webstore-order-access-v1`).
import { BFF, crearPedidoDeInvitado } from './lib/qa.mjs';

const pedido = await crearPedidoDeInvitado();
console.log(`pedido ${pedido.id} (accessToken ${pedido.accessToken})`);
const respuesta = await fetch(`${BFF}/bff/complaints`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    name: 'Cliente de captura',
    document: '12345678',
    email: 'captura@example.com',
    phone: '999888777',
    address: 'Av. Captura 123',
    subject: 'Producto con falla',
    type: 'reclamo',
    detail: 'Detalle de captura.',
    request: 'Cambio del producto.',
    amount: 100,
  }),
});
console.log(`reclamo ${respuesta.status}`);
