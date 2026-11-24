/**
 * Una dirección por pedido o una por producto (lote 19, ADR-0021, PBI-0006; provisional, por confirmar con Daniel).
 * La tienda repite la regla del BFF para mostrar el envío antes de enviar el pedido; el BFF vuelve a calcularlo y
 * decide. La prueba compara los casos con `backend/src/domain/pedidos/direcciones-por-producto.rules.mjs`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./direccion-por-producto.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { modoDeDireccion, mismaDireccion, destinosDelPedido, envioPorDestinos, direccionVisible } =
  await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
const bff = await import(
  new URL('../../../../../../backend/src/domain/pedidos/direcciones-por-producto.rules.mjs', import.meta.url)
);

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

test('el modo es una por producto solo si la configuración lo elige; si no, una por pedido', () => {
  assert.equal(modoDeDireccion({ deliveryAddressMode: 'per-product' }), 'per-product');
  assert.equal(modoDeDireccion({ deliveryAddressMode: 'per-order' }), 'per-order');
  assert.equal(modoDeDireccion({}), bff.MODO_DE_DIRECCION_POR_DEFECTO);
  assert.equal(modoDeDireccion({ deliveryAddressMode: 'per-line' }), 'per-order');
});

test('dos direcciones son la misma con la regla del BFF', () => {
  const casos = [
    [principal, { ...principal, addressLine: '  av.  demo 123 ', district: 'SAN ISIDRO', reference: 'x' }],
    [
      { ...otra, district: 'Jesús María' },
      { ...otra, district: 'Jesus Maria' },
    ],
    [principal, otra],
    [principal, { ...principal, addressLine: 'Av. Demo 124' }],
    [principal, { ...principal, province: 'Callao' }],
  ];
  for (const [a, b] of casos) assert.equal(mismaDireccion(a, b), bff.mismaDireccion(a, b), JSON.stringify(b));
});

test('los destinos son las direcciones distintas que usan las líneas, como en el BFF', () => {
  const casos = [
    [{}, {}],
    [{ shipping: otra }, {}, { shipping: { ...otra, addressLine: 'CALLE REGALO 456' } }],
    [{ shipping: otra }],
  ];
  for (const lineas of casos)
    assert.deepEqual(destinosDelPedido(principal, lineas), bff.destinosDelPedido(principal, lineas));
});

test('el envío es una tarifa por destino distinto, la más baja de su distrito, como en el BFF', () => {
  for (const destinos of [[principal], [principal, otra], [otra, { ...otra, addressLine: 'Otra calle 1' }]]) {
    const envio = envioPorDestinos(tarifas, destinos);
    const delBff = bff.envioPorDestinos(tarifas, destinos);
    assert.equal(envio.total, delBff.shippingCost);
    assert.deepEqual(
      envio.desglose.map(({ direccion, precio }) => [direccion.district, precio]),
      delBff.destinations.map(({ district, price }) => [district, price]),
    );
  }
});

test('un destino sin tarifa deja el envío sin calcular', () => {
  assert.equal(envioPorDestinos(tarifas, [principal, { ...otra, district: 'Barranco' }]), null);
  assert.equal(envioPorDestinos([], [principal]), null);
});

test('la dirección se muestra en una línea, con la referencia si la trae', () => {
  assert.equal(direccionVisible(otra), 'Calle Regalo 456, Miraflores, Lima, Lima');
  assert.equal(
    direccionVisible({ ...otra, reference: 'Portón verde' }),
    'Calle Regalo 456, Miraflores, Lima, Lima (Portón verde)',
  );
});
