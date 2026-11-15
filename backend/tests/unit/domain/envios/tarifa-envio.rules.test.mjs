/**
 * Tarifa de envío por destino (lote 02, PBI-0102): la tabla origen → destino da el precio; con varios orígenes
 * se toma la tarifa más baja, que corresponde a la tienda más próxima.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bestShippingRate } from '../../../../src/domain/envios/tarifa-envio.rules.mjs';

const tarifas = [
  { id: 'r-1', origin: 'Lima Centro', destination: 'San Isidro', price: 12 },
  { id: 'r-2', origin: 'Callao', destination: 'San Isidro', price: 9.5 },
  { id: 'r-3', origin: 'Lima Centro', destination: 'Miraflores', price: 15 },
  { id: 'r-4', origin: 'Surco', destination: 'San Isidro', price: 9.5 },
];

test('sin origen, gana la tarifa más baja de ese destino', () => {
  assert.equal(bestShippingRate(tarifas, 'San Isidro').id, 'r-2');
  assert.equal(bestShippingRate(tarifas, 'Miraflores').id, 'r-3');
});

test('con el mismo precio, gana la primera de la tabla', () => {
  assert.equal(bestShippingRate([tarifas[3], tarifas[1]], 'San Isidro').id, 'r-4');
});

test('con origen, solo cuentan las tarifas de ese origen', () => {
  assert.equal(bestShippingRate(tarifas, 'San Isidro', 'Lima Centro').id, 'r-1');
  assert.equal(bestShippingRate(tarifas, 'Miraflores', 'Callao'), null);
});

test('un destino sin tarifa, o una tabla vacía, no devuelve nada', () => {
  assert.equal(bestShippingRate(tarifas, 'Barranco'), null);
  assert.equal(bestShippingRate([], 'San Isidro'), null);
});

test('el destino se compara tal cual: sin mayúsculas ni espacios de más no hay tarifa', () => {
  assert.equal(bestShippingRate(tarifas, 'san isidro'), null);
  assert.equal(bestShippingRate(tarifas, 'San Isidro '), null);
});

test('una tarifa gratuita (precio 0) es válida y gana a las demás', () => {
  const gratis = [...tarifas, { id: 'r-5', origin: 'Lima Centro', destination: 'San Isidro', price: 0 }];
  assert.equal(bestShippingRate(gratis, 'San Isidro').price, 0);
});

test('no modifica la tabla recibida', () => {
  const copia = structuredClone(tarifas);
  bestShippingRate(tarifas, 'San Isidro');
  assert.deepEqual(tarifas, copia);
});
