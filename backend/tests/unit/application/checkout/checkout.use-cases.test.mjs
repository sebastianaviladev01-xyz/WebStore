/**
 * Validación del checkout y de los cambios del pedido (PBI-0096, parte del BFF; lote 01, ADR-0017), con un
 * almacén en memoria: fecha de entrega desde la primera que permite la tienda (lote 17, PBI-0178: por defecto, el día
 * calendario siguiente en Lima; la regla completa está en `entrega-y-terminos.use-cases.test.mjs`), método de pago de los que ofrece la tienda, cantidad
 * entera y positiva, y solo los campos conocidos de `customer` y `shipping`.
 */
import { mock, test } from 'node:test';
import assert from 'node:assert/strict';

import { createCheckoutUseCases } from '../../../../src/application/checkout/checkout.use-cases.mjs';
import { createPedidosUseCases } from '../../../../src/application/pedidos/pedidos.use-cases.mjs';

let secuencia = 0;
const security = {
  digest: (valor) => `h:${valor}`,
  createToken: () => `t${++secuencia}`,
  newId: () => `id${++secuencia}`,
};

function crearAlmacen() {
  return {
    state: {
      revision: 0,
      products: [
        { id: 'p-1', name: 'Uno', price: 100, stock: 5, active: true, brandId: 'b', categoryId: 'c' },
        { id: 'p-2', name: 'Dos', price: 50, stock: 5, active: true, brandId: 'b', categoryId: 'c' },
      ],
      brands: [],
      categories: [],
      rates: [{ id: 'r', origin: 'Lima Centro', destination: 'San Isidro', price: 12 }],
      orders: [],
      customers: [],
      accounts: [],
      accountSessions: [],
    },
    save() {},
  };
}

/** Fecha `AAAA-MM-DD` de Lima desplazada `dias` desde hoy. */
function fechaDeLima(dias) {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const fecha = new Date(`${hoy}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

const pedido = (cambios = {}) => ({
  customer: { fullName: 'Ana Pérez', email: 'ana@example.com', phone: '999999999', document: '12345678' },
  shipping: { addressLine: 'Av Demo 123', district: 'San Isidro', province: 'Lima', department: 'Lima' },
  deliveryDate: fechaDeLima(1),
  paymentMethod: 'card',
  items: [{ productId: 'p-1', quantity: 1 }],
  termsAccepted: true,
  // Lote 17 (PBI-0177): la versión de los términos que mostró la tienda; sin registro, la vigente es la 1.
  termsVersion: 1,
  ...cambios,
});

const comprar = (cambios) =>
  createCheckoutUseCases({ store: crearAlmacen(), security }).placeOrder(pedido(cambios), '');
comprar.conClave = (clave) =>
  createCheckoutUseCases({ store: crearAlmacen(), security }).placeOrder(pedido(), '', clave);

test('una fecha de entrega pasada, mal formada o ausente responde INVALID_DELIVERY_DATE', () => {
  for (const deliveryDate of [fechaDeLima(-1), '2020-01-05', '05/01/2030', '2030-02-30', '', undefined])
    assert.throws(() => comprar({ deliveryDate }), { code: 'INVALID_DELIVERY_DATE' }, String(deliveryDate));
});

test('por defecto, la primera fecha de entrega es mañana en Lima: hoy ya no se acepta (lote 17, PBI-0178)', () => {
  assert.throws(() => comprar({ deliveryDate: fechaDeLima(0) }), {
    code: 'INVALID_DELIVERY_DATE',
    details: { minimum: fechaDeLima(1) },
  });
  assert.equal(comprar({ deliveryDate: fechaDeLima(1) }).deliveryDate, fechaDeLima(1));
});

test('un método de pago que la tienda no ofrece responde INVALID_PAYMENT_METHOD', () => {
  for (const paymentMethod of ['bitcoin', '', undefined, 3])
    assert.throws(
      () => comprar({ paymentMethod }),
      { code: 'INVALID_PAYMENT_METHOD' },
      String(paymentMethod),
    );
  for (const paymentMethod of ['card', 'yape-plin', 'transfer'])
    assert.equal(comprar({ paymentMethod }).paymentMethod, paymentMethod);
});

test('una cantidad decimal, cero, negativa o no numérica responde INVALID_ORDER_ITEMS', () => {
  for (const quantity of [1.5, 0, -1, '2', 'x', null])
    assert.throws(
      () => comprar({ items: [{ productId: 'p-1', quantity }] }),
      { code: 'INVALID_ORDER_ITEMS' },
      String(quantity),
    );
});

test('los campos de más de customer y shipping se descartan', () => {
  const resultado = comprar({
    customer: { ...pedido().customer, isAdmin: true, notes: 'x' },
    shipping: { ...pedido().shipping, reference: 'Puerta azul', price: 0, injected: { a: 1 } },
  });
  assert.deepEqual(Object.keys(resultado.customer).sort(), ['document', 'email', 'fullName', 'phone']);
  assert.deepEqual(Object.keys(resultado.shipping).sort(), [
    'addressLine',
    'department',
    'district',
    'province',
    'reference',
  ]);
  assert.equal(resultado.shipping.reference, 'Puerta azul');
});

test('las líneas repetidas del mismo producto quedan como una sola en el pedido', () => {
  const resultado = comprar({
    items: [
      { productId: 'p-1', quantity: 1 },
      { productId: 'p-2', quantity: 1 },
      { product: { id: 'p-1' }, quantity: 2 },
    ],
  });
  assert.deepEqual(
    resultado.items.map((item) => [item.productId, item.quantity]),
    [
      ['p-1', 3],
      ['p-2', 1],
    ],
  );
  assert.equal(resultado.subtotal, 350);
});

test('cambiar la fecha del pedido exige la primera fecha o después, salvo que se conserve la que ya tiene', () => {
  const store = crearAlmacen();
  const creado = createCheckoutUseCases({ store, security }).placeOrder(pedido(), '');
  const pedidos = createPedidosUseCases({ store, security });
  const credenciales = { bearerToken: '', orderToken: creado.accessToken };
  const orden = pedidos.requireModifiableOrder(creado.id, credenciales);
  assert.throws(() => pedidos.modify(orden, 'delivery-date', { deliveryDate: fechaDeLima(-1) }), {
    code: 'INVALID_DELIVERY_DATE',
  });
  // La tienda reenvía la fecha vigente al actualizar la dirección: aunque ya haya pasado, se acepta igual.
  orden.deliveryDate = fechaDeLima(-1);
  assert.equal(
    pedidos.modify(orden, 'delivery-date', { deliveryDate: fechaDeLima(-1) }).deliveryDate,
    fechaDeLima(-1),
  );
  assert.equal(
    pedidos.modify(orden, 'delivery-date', { deliveryDate: fechaDeLima(3) }).deliveryDate,
    fechaDeLima(3),
  );
});

test('cambiar la dirección del pedido también descarta los campos de más', () => {
  const store = crearAlmacen();
  const creado = createCheckoutUseCases({ store, security }).placeOrder(pedido(), '');
  const pedidos = createPedidosUseCases({ store, security });
  const orden = pedidos.requireModifiableOrder(creado.id, {
    bearerToken: '',
    orderToken: creado.accessToken,
  });
  const cambiado = pedidos.modify(orden, 'shipping', {
    shipping: { ...pedido().shipping, total: 0, extra: true },
  });
  assert.deepEqual(Object.keys(cambiado.shipping).sort(), [
    'addressLine',
    'department',
    'district',
    'province',
  ]);
});

// Lote 04 (ADR-0017): términos y condiciones (PBI-0040), total mostrado (PBI-0106) y doble envío (PBI-0086).

test('sin aceptar los términos y condiciones responde TERMS_NOT_ACCEPTED y no crea el pedido', () => {
  for (const termsAccepted of [undefined, false, 'true', 1]) {
    const store = crearAlmacen();
    assert.throws(
      () => createCheckoutUseCases({ store, security }).placeOrder(pedido({ termsAccepted }), ''),
      { code: 'TERMS_NOT_ACCEPTED' },
      String(termsAccepted),
    );
    assert.equal(store.state.orders.length, 0);
    assert.equal(store.state.products[0].stock, 5);
  }
});

test('el pedido guarda la fecha y hora en que se aceptaron los términos', () => {
  const antes = Date.now();
  const creado = comprar();
  const aceptado = Date.parse(creado.termsAcceptedAt);
  assert.ok(aceptado >= antes && aceptado <= Date.now(), creado.termsAcceptedAt);
  assert.equal(creado.termsAcceptedAt, creado.createdAt);
});

test('un total distinto del que calcula el BFF responde ORDER_TOTAL_CHANGED sin crear el pedido', () => {
  const store = crearAlmacen();
  const checkout = createCheckoutUseCases({ store, security });
  // 100 del producto + 12 de envío a San Isidro = 112.
  assert.throws(
    () => checkout.placeOrder(pedido({ total: 105 }), ''),
    (error) =>
      error.code === 'ORDER_TOTAL_CHANGED' &&
      error.kind === 'conflict' &&
      error.details.total === 112 &&
      error.details.subtotal === 100 &&
      error.details.shippingCost === 12,
  );
  assert.equal(store.state.orders.length, 0);
  assert.equal(store.state.products[0].stock, 5);
  assert.equal(checkout.placeOrder(pedido({ total: 112 }), '').total, 112);
  // Sin total (otro cliente del BFF), no se compara.
  assert.equal(checkout.placeOrder(pedido(), '').total, 112);
});

test('la misma clave de idempotencia devuelve el mismo pedido y no descuenta stock dos veces', () => {
  const store = crearAlmacen();
  const checkout = createCheckoutUseCases({ store, security });
  const pedidos = createPedidosUseCases({ store, security });
  const clave = 'intento-0123456789abcdef';
  assert.equal(checkout.replay(clave), null);
  const primero = checkout.placeOrder(pedido({ items: [{ productId: 'p-1', quantity: 2 }] }), '', clave);
  const repetido = checkout.replay(clave);
  assert.equal(repetido.id, primero.id);
  assert.equal(store.state.orders.length, 1);
  assert.equal(store.state.products[0].stock, 3);
  assert.equal('idempotencyKeyHash' in primero, false);
  assert.equal('idempotencyKeyHash' in repetido, false);
  // La respuesta repetida trae un token de acceso que sirve para consultar el pedido.
  assert.equal(
    pedidos.getOrder(primero.id, { bearerToken: '', orderToken: repetido.accessToken }).id,
    primero.id,
  );
  // Otra clave, o ninguna, es otro intento de compra.
  assert.equal(checkout.replay('intento-fedcba9876543210'), null);
  assert.equal(checkout.replay(''), null);
  assert.notEqual(checkout.placeOrder(pedido(), '', 'intento-fedcba9876543210').id, undefined);
  assert.equal(store.state.orders.length, 2);
});

test('una clave de idempotencia mal formada responde INVALID_IDEMPOTENCY_KEY', () => {
  for (const clave of ['corta', 'x'.repeat(129), 'con espacios 1234567890', 'ñandú-0123456789abcdef'])
    assert.throws(() => comprar.conClave(clave), { code: 'INVALID_IDEMPOTENCY_KEY' }, clave);
});

// Lote 02 (PBI-0102): los montos con IGV y envío, y lo que el checkout rechaza o registra.

test('los montos: el subtotal incluye el IGV (18 %), el envío se suma aparte y el total es de los dos', () => {
  const resultado = comprar();
  assert.deepEqual(
    [resultado.subtotal, resultado.igv, resultado.shippingCost, resultado.total],
    [100, 15.25, 12, 112],
  );
});

test('los montos de varias líneas se redondean a céntimos una sola vez, sobre el subtotal', () => {
  const resultado = comprar({
    items: [
      { productId: 'p-1', quantity: 3 },
      { productId: 'p-2', quantity: 1 },
    ],
  });
  // 350 de productos: el IGV incluido es 350 − 350 / 1,18 = 53,39.
  assert.deepEqual(
    [resultado.subtotal, resultado.igv, resultado.shippingCost, resultado.total],
    [350, 53.39, 12, 362],
  );
  const decimales = crearAlmacen();
  decimales.state.products[0].price = 19.99;
  const conCentavos = createCheckoutUseCases({ store: decimales, security }).placeOrder(
    pedido({ items: [{ productId: 'p-1', quantity: 3 }] }),
    '',
  );
  assert.deepEqual([conCentavos.subtotal, conCentavos.igv, conCentavos.total], [59.97, 9.15, 71.97]);
});

test('el precio de las líneas sale del estado del BFF, no de lo que envía la tienda', () => {
  const resultado = comprar({
    items: [{ product: { id: 'p-1', price: 1, name: 'Otro' }, quantity: 2, price: 1 }],
    shippingCost: 0,
    subtotal: 1,
    igv: 0,
  });
  assert.deepEqual([resultado.subtotal, resultado.shippingCost, resultado.total], [200, 12, 212]);
  assert.equal(resultado.items[0].product.price, 100);
  assert.equal(resultado.items[0].product.name, 'Uno');
});

test('el envío es la tarifa más baja del distrito y guarda su origen', () => {
  const store = crearAlmacen();
  store.state.rates.push(
    { id: 'r2', origin: 'Callao', destination: 'San Isidro', price: 8 },
    { id: 'r3', origin: 'Surco', destination: 'San Isidro', price: 20 },
    { id: 'r4', origin: 'Callao', destination: 'Miraflores', price: 5 },
  );
  const resultado = createCheckoutUseCases({ store, security }).placeOrder(pedido(), '');
  assert.deepEqual([resultado.shippingCost, resultado.shippingOrigin, resultado.total], [8, 'Callao', 108]);
});

test('un distrito sin tarifa responde SHIPPING_UNAVAILABLE y no reserva stock ni crea el pedido', () => {
  const store = crearAlmacen();
  assert.throws(
    () =>
      createCheckoutUseCases({ store, security }).placeOrder(
        pedido({ shipping: { ...pedido().shipping, district: 'Barranco' } }),
        '',
      ),
    { code: 'SHIPPING_UNAVAILABLE', kind: 'validation' },
  );
  assert.equal(store.state.orders.length, 0);
  assert.equal(store.state.products[0].stock, 5);
});

test('un producto inactivo, sin stock o inexistente se rechaza completo, sin descontar lo demás', () => {
  const casos = [
    ['PRODUCT_UNAVAILABLE', (state) => (state.products[1].active = false)],
    ['INSUFFICIENT_STOCK', (state) => (state.products[1].stock = 0)],
  ];
  for (const [codigo, preparar] of casos) {
    const store = crearAlmacen();
    preparar(store.state);
    assert.throws(
      () =>
        createCheckoutUseCases({ store, security }).placeOrder(
          pedido({
            items: [
              { productId: 'p-1', quantity: 1 },
              { productId: 'p-2', quantity: 1 },
            ],
          }),
          '',
        ),
      { code: codigo, kind: 'conflict' },
      codigo,
    );
    assert.equal(store.state.products[0].stock, 5, codigo);
    assert.equal(store.state.orders.length, 0, codigo);
  }
  assert.throws(() => comprar({ items: [{ productId: 'p-9', quantity: 1 }] }), {
    code: 'INSUFFICIENT_STOCK',
  });
});

test('un pedido sin productos, con un correo inválido o con datos del comprador vacíos se rechaza', () => {
  for (const items of [[], undefined, 'p-1'])
    assert.throws(() => comprar({ items }), { code: 'EMPTY_ORDER' }, String(items));
  assert.throws(() => comprar({ customer: { ...pedido().customer, email: 'no-es-correo' } }), {
    code: 'INVALID_EMAIL',
  });
  assert.throws(() => comprar({ customer: { ...pedido().customer, fullName: '   ' } }), {
    code: 'VALIDATION_ERROR',
    details: { fields: ['fullName'] },
  });
  assert.throws(() => comprar({ shipping: { ...pedido().shipping, addressLine: '' } }), {
    code: 'VALIDATION_ERROR',
    details: { fields: ['addressLine'] },
  });
});

test('el pedido descuenta el stock, sube la revisión, deja su actividad y se guarda una vez', () => {
  const store = crearAlmacen();
  let guardados = 0;
  store.save = () => (guardados += 1);
  const resultado = createCheckoutUseCases({ store, security }).placeOrder(
    pedido({ items: [{ productId: 'p-1', quantity: 2 }] }),
    '',
  );
  assert.equal(store.state.products[0].stock, 3);
  assert.equal(store.state.revision, 1);
  assert.equal(guardados, 1);
  assert.equal(resultado.status, 'confirmed');
  assert.equal(store.state.orders[0].id, resultado.id);
  assert.equal(store.state.activity.length, 1);
  assert.equal(store.state.activity[0].type, 'order-created');
  assert.match(store.state.activity[0].description, new RegExp(resultado.id));
});

test('la respuesta trae el token de acceso, pero no guarda su valor ni expone hashes ni la cuenta', () => {
  const store = crearAlmacen();
  const resultado = createCheckoutUseCases({ store, security }).placeOrder(pedido(), '');
  assert.equal(typeof resultado.accessToken, 'string');
  assert.equal(store.state.orders[0].accessTokenHash, security.digest(resultado.accessToken));
  assert.notEqual(store.state.orders[0].accessTokenHash, resultado.accessToken);
  for (const campo of ['accessTokenHash', 'idempotencyKeyHash', 'accountId'])
    assert.equal(campo in resultado, false, campo);
});

test('con la sesión de una cuenta, el pedido queda a su nombre; sin sesión o con una vencida, es de invitado', () => {
  const vigente = new Date(Date.now() + 60_000).toISOString();
  const vencida = new Date(Date.now() - 60_000).toISOString();
  const preparar = (expiresAt) => {
    const store = crearAlmacen();
    store.state.accounts.push({ id: 'a-1', email: 'ana@example.com', verified: true });
    store.state.accountSessions.push({ tokenHash: 'h:token-de-ana', accountId: 'a-1', expiresAt });
    return store;
  };
  const conCuenta = preparar(vigente);
  createCheckoutUseCases({ store: conCuenta, security }).placeOrder(pedido(), 'token-de-ana');
  assert.equal(conCuenta.state.orders[0].accountId, 'a-1');
  for (const [store, token] of [
    [preparar(vencida), 'token-de-ana'],
    [preparar(vigente), 'token-ajeno'],
    [preparar(vigente), ''],
  ]) {
    createCheckoutUseCases({ store, security }).placeOrder(pedido(), token);
    assert.equal('accountId' in store.state.orders[0], false);
  }
});

test('cada compra crea la ficha del cliente o actualiza la que tiene su correo, sin distinguir mayúsculas', () => {
  const store = crearAlmacen();
  const checkout = createCheckoutUseCases({ store, security });
  checkout.placeOrder(pedido(), '');
  assert.deepEqual(
    store.state.customers.map(({ name, email, document, orders }) => ({ name, email, document, orders })),
    [{ name: 'Ana Pérez', email: 'ana@example.com', document: '12345678', orders: 1 }],
  );
  checkout.placeOrder(
    pedido({
      customer: {
        ...pedido().customer,
        email: ' ANA@Example.com ',
        fullName: 'Ana P. de López',
        document: '87654321',
      },
    }),
    '',
  );
  assert.equal(store.state.customers.length, 1);
  assert.deepEqual(
    [store.state.customers[0].name, store.state.customers[0].document, store.state.customers[0].orders],
    ['Ana P. de López', '87654321', 2],
  );
  checkout.placeOrder(pedido({ customer: { ...pedido().customer, email: 'luis@example.com' } }), '');
  assert.equal(store.state.customers.length, 2);
});

// Lote 02 (PBI-0103): el código del pedido no se repite.

test('40 pedidos en el mismo milisegundo reciben códigos distintos, con la forma WS-NNNNNNNN', () => {
  mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-15T15:00:00.000Z') });
  try {
    const store = crearAlmacen();
    store.state.products[0].stock = 100;
    const checkout = createCheckoutUseCases({ store, security });
    const ids = Array.from({ length: 40 }, () => checkout.placeOrder(pedido(), '').id);
    assert.equal(new Set(ids).size, 40);
    for (const id of ids) assert.match(id, /^WS-\d{8}$/);
    assert.equal(new Set(store.state.activity.map((evento) => evento.id)).size, 40);
  } finally {
    mock.timers.reset();
  }
});

test('un código ya emitido por otro pedido guardado, aunque sea del mismo instante, no se reutiliza', () => {
  mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-15T15:00:00.000Z') });
  try {
    const store = crearAlmacen();
    const checkout = createCheckoutUseCases({ store, security });
    const primero = checkout.placeOrder(pedido(), '').id;
    store.state.orders = store.state.orders.map((orden) => ({ ...orden }));
    assert.notEqual(checkout.placeOrder(pedido(), '').id, primero);
  } finally {
    mock.timers.reset();
  }
});

// Lote 13 (ADR-0021), PBI-0173: los intentos rechazados porque la tienda cambió quedan como errores de compra para
// la campana del Admin, sin datos del comprador ni del pago y sin cambiar la revisión del snapshot.

test('PBI-0173: un checkout rechazado por total, stock, producto o envío deja su error de compra', () => {
  const casos = [
    ['ORDER_TOTAL_CHANGED', () => {}, { total: 105 }, null],
    ['INSUFFICIENT_STOCK', (state) => (state.products[0].stock = 0), {}, 'p-1'],
    ['PRODUCT_UNAVAILABLE', (state) => (state.products[0].active = false), {}, 'p-1'],
    ['SHIPPING_UNAVAILABLE', () => {}, { shipping: { ...pedido().shipping, district: 'Barranco' } }, null],
  ];
  for (const [codigo, preparar, cambios, productId] of casos) {
    const store = crearAlmacen();
    let guardados = 0;
    store.save = () => (guardados += 1);
    preparar(store.state);
    const checkout = createCheckoutUseCases({ store, security });
    assert.throws(() => checkout.placeOrder(pedido(cambios), '', 'intento-0123456789abcdef'), {
      code: codigo,
    });
    assert.equal(store.state.checkoutErrors.length, 1, codigo);
    const [registrado] = store.state.checkoutErrors;
    assert.deepEqual(Object.keys(registrado).sort(), ['at', 'attempt', 'code', 'id', 'productId'], codigo);
    assert.equal(registrado.code, codigo);
    assert.equal(registrado.productId, productId, codigo);
    assert.equal(registrado.attempt, 'h:intento-0123456789abcdef', 'el digest de la clave, no la clave');
    assert.ok(!JSON.stringify(registrado).includes('ana@example.com'), 'sin datos del comprador');
    assert.equal(store.state.revision, 0, 'no invalida el snapshot que el Admin está editando');
    assert.equal(guardados, 1, codigo);
    assert.equal(store.state.orders.length, 0, codigo);
  }
});

test('PBI-0173: el mismo intento rechazado dos veces por lo mismo cuenta una sola vez', () => {
  const store = crearAlmacen();
  const checkout = createCheckoutUseCases({ store, security });
  for (let vez = 0; vez < 2; vez += 1)
    assert.throws(() => checkout.placeOrder(pedido({ total: 105 }), '', 'intento-0123456789abcdef'), {
      code: 'ORDER_TOTAL_CHANGED',
    });
  assert.equal(store.state.checkoutErrors.length, 1);
});

test('PBI-0173: los errores de validación del formulario no son errores de compra', () => {
  const store = crearAlmacen();
  const checkout = createCheckoutUseCases({ store, security });
  assert.throws(() => checkout.placeOrder(pedido({ paymentMethod: 'bitcoin' }), ''), {
    code: 'INVALID_PAYMENT_METHOD',
  });
  assert.throws(() => checkout.placeOrder(pedido({ termsAccepted: false }), ''), {
    code: 'TERMS_NOT_ACCEPTED',
  });
  assert.equal((store.state.checkoutErrors ?? []).length, 0);
});
