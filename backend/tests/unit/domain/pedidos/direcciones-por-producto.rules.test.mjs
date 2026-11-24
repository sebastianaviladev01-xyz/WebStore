/**
 * Una dirección por pedido o una por producto (lote 19, ADR-0021, PBI-0006; provisional, por confirmar con Daniel).
 * Daniel: «la configuración de la tienda decidirá si un pedido lleva una sola dirección de entrega o una por producto».
 *
 * - La tienda elige `per-order` (por defecto, lo de siempre) o `per-product`.
 * - Con `per-product`, cada línea puede llevar su dirección; una igual a la principal no se guarda aparte.
 * - Con `per-order`, una línea con dirección se rechaza con `PER_PRODUCT_ADDRESS_DISABLED`.
 * - El envío se cobra una vez por cada destino distinto, no por línea, con la tarifa más baja de su distrito.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MODOS_DE_DIRECCION,
  MODO_DE_DIRECCION_POR_DEFECTO,
  destinosDelPedido,
  direccionesDeLasLineas,
  envioPorDestinos,
  esModoDeDireccion,
  mismaDireccion,
} from '../../../../src/domain/pedidos/direcciones-por-producto.rules.mjs';

const principal = {
  addressLine: 'Av. Demo 123',
  district: 'San Isidro',
  province: 'Lima',
  department: 'Lima',
};
const otra = {
  addressLine: 'Calle Regalo 456',
  district: 'Miraflores',
  province: 'Lima',
  department: 'Lima',
};
const tarifas = [
  { id: 'r-1', origin: 'Lima Centro', destination: 'San Isidro', price: 12 },
  { id: 'r-2', origin: 'Callao', destination: 'Miraflores', price: 9.5 },
  { id: 'r-3', origin: 'Lima Centro', destination: 'Miraflores', price: 15 },
];

const rechazo = (code) => (error) => {
  assert.equal(error.code, code);
  return true;
};

test('los modos son una por pedido (por defecto) y una por producto', () => {
  assert.deepEqual(MODOS_DE_DIRECCION, ['per-order', 'per-product']);
  assert.equal(MODO_DE_DIRECCION_POR_DEFECTO, 'per-order');
  assert.equal(esModoDeDireccion('per-order'), true);
  assert.equal(esModoDeDireccion('per-product'), true);
  for (const otro of ['per-line', '', null, undefined, true, 1])
    assert.equal(esModoDeDireccion(otro), false, String(otro));
});

test('dos direcciones son la misma sin distinguir mayúsculas, tildes ni espacios de más, y sin mirar la referencia', () => {
  assert.equal(
    mismaDireccion(principal, {
      addressLine: '  av.  demo 123 ',
      district: 'SAN ISIDRO',
      province: 'lima',
      department: 'Lima',
      reference: 'Portón verde',
    }),
    true,
  );
  assert.equal(
    mismaDireccion({ ...otra, district: 'Jesús María' }, { ...otra, district: 'Jesus Maria' }),
    true,
  );
  assert.equal(mismaDireccion(principal, otra), false);
  assert.equal(mismaDireccion(principal, { ...principal, addressLine: 'Av. Demo 124' }), false);
  assert.equal(mismaDireccion(principal, { ...principal, province: 'Callao' }), false);
});

test('sin direcciones en las líneas no hay nada que guardar, en cualquier modo', () => {
  const items = [
    { productId: 'p-1', quantity: 1 },
    { product: { id: 'p-2' }, quantity: 2 },
  ];
  assert.equal(direccionesDeLasLineas(items, 'per-order', principal).size, 0);
  assert.equal(direccionesDeLasLineas(items, 'per-product', principal).size, 0);
  assert.equal(
    direccionesDeLasLineas([{ productId: 'p-1', quantity: 1, shipping: null }], 'per-order', principal).size,
    0,
  );
});

test('con una por producto, la dirección de cada línea se guarda con lista blanca y por producto', () => {
  const direcciones = direccionesDeLasLineas(
    [
      { productId: 'p-1', quantity: 1 },
      {
        product: { id: 'p-2' },
        quantity: 1,
        shipping: { ...otra, addressLine: ' Calle Regalo 456 ', reference: ' Portón verde ', extra: 'x' },
      },
    ],
    'per-product',
    principal,
  );
  assert.deepEqual([...direcciones], [['p-2', { ...otra, reference: 'Portón verde' }]]);
});

test('una dirección de línea igual a la principal no se guarda aparte', () => {
  const direcciones = direccionesDeLasLineas(
    [{ productId: 'p-1', quantity: 1, shipping: { ...principal, district: 'san isidro' } }],
    'per-product',
    principal,
  );
  assert.equal(direcciones.size, 0);
});

test('con una por pedido, una línea con dirección se rechaza con un error claro', () => {
  assert.throws(
    () => direccionesDeLasLineas([{ productId: 'p-1', quantity: 1, shipping: otra }], 'per-order', principal),
    (error) => {
      assert.equal(error.kind, 'conflict');
      assert.equal(error.code, 'PER_PRODUCT_ADDRESS_DISABLED');
      assert.match(error.message, /una sola dirección/);
      return true;
    },
  );
  // Un modo desconocido cuenta como el de por defecto.
  assert.throws(
    () => direccionesDeLasLineas([{ productId: 'p-1', quantity: 1, shipping: otra }], undefined, principal),
    rechazo('PER_PRODUCT_ADDRESS_DISABLED'),
  );
});

test('una dirección de línea incompleta se rechaza como la principal', () => {
  assert.throws(
    () =>
      direccionesDeLasLineas(
        [{ productId: 'p-1', quantity: 1, shipping: { ...otra, district: ' ' } }],
        'per-product',
        principal,
      ),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.deepEqual(error.details, { fields: ['district'] });
      return true;
    },
  );
  assert.throws(
    () =>
      direccionesDeLasLineas(
        [{ productId: 'p-1', quantity: 1, shipping: 'Miraflores' }],
        'per-product',
        principal,
      ),
    rechazo('VALIDATION_ERROR'),
  );
});

test('el mismo producto repetido con dos direcciones distintas se rechaza', () => {
  assert.throws(
    () =>
      direccionesDeLasLineas(
        [
          { productId: 'p-1', quantity: 1, shipping: otra },
          { productId: 'p-1', quantity: 1 },
        ],
        'per-product',
        principal,
      ),
    rechazo('INVALID_ORDER_ITEMS'),
  );
  // Repetido con la misma dirección, se acepta (las líneas se unen).
  const iguales = direccionesDeLasLineas(
    [
      { productId: 'p-1', quantity: 1, shipping: otra },
      { productId: 'p-1', quantity: 2, shipping: { ...otra, district: 'miraflores' } },
    ],
    'per-product',
    principal,
  );
  assert.deepEqual([...iguales.keys()], ['p-1']);
});

test('los destinos del pedido son las direcciones distintas que usan sus líneas, en orden', () => {
  assert.deepEqual(destinosDelPedido(principal, [{ productId: 'p-1' }, { productId: 'p-2' }]), [principal]);
  assert.deepEqual(
    destinosDelPedido(principal, [
      { productId: 'p-1', shipping: otra },
      { productId: 'p-2' },
      { productId: 'p-3', shipping: { ...otra, addressLine: 'CALLE REGALO 456' } },
    ]),
    [otra, principal],
  );
  // Si todas las líneas van a otra dirección, la principal no es un destino.
  assert.deepEqual(destinosDelPedido(principal, [{ productId: 'p-1', shipping: otra }]), [otra]);
});

test('el envío se cobra una vez por destino distinto, con la tarifa más baja de su distrito', () => {
  assert.deepEqual(envioPorDestinos(tarifas, [principal]), {
    shippingCost: 12,
    destinations: [{ district: 'San Isidro', origin: 'Lima Centro', price: 12 }],
  });
  assert.deepEqual(envioPorDestinos(tarifas, [principal, otra]), {
    shippingCost: 21.5,
    destinations: [
      { district: 'San Isidro', origin: 'Lima Centro', price: 12 },
      { district: 'Miraflores', origin: 'Callao', price: 9.5 },
    ],
  });
  // Dos direcciones distintas del mismo distrito son dos entregas.
  assert.equal(envioPorDestinos(tarifas, [otra, { ...otra, addressLine: 'Otra calle 1' }]).shippingCost, 19);
});

test('un destino sin tarifa responde SHIPPING_UNAVAILABLE', () => {
  assert.throws(
    () => envioPorDestinos(tarifas, [principal, { ...otra, district: 'Barranco' }]),
    rechazo('SHIPPING_UNAVAILABLE'),
  );
});
