/**
 * Tomas de cada escenario de `capturas.mjs` (lote 37, PBI-0252, ADR-0031): la de página completa de siempre y, si el
 * escenario pide `desplazamientos`, una captura de la ventana en cada posición, con un nombre estable que `comparar.mjs`
 * empareja entre «antes» y «después».
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolverDesplazamiento, tomasDeEscenario } from './tomas.mjs';

test('PBI-0252: un escenario sin `desplazamientos` da solo la toma de página completa, con el nombre de siempre', () => {
  assert.deepEqual(tomasDeEscenario('tienda-ficha-a', { tienda: true, ruta: '/' }, 375), [
    { archivo: 'tienda-ficha-a-375.png', posicion: null },
  ]);
  assert.deepEqual(tomasDeEscenario('demo-productos-b', { ruta: '/productos', rol: 'superadmin' }, 1440), [
    { archivo: 'demo-productos-b-1440.png', posicion: null },
  ]);
});

test('PBI-0252: una lista de `desplazamientos` vacía tampoco cambia las tomas', () => {
  assert.deepEqual(tomasDeEscenario('tienda-inicio-b', { desplazamientos: [] }, 1440), [
    { archivo: 'tienda-inicio-b-1440.png', posicion: null },
  ]);
});

test('PBI-0252: cada posición pedida da una captura de la ventana con un nombre estable, después de la página completa', () => {
  assert.deepEqual(
    tomasDeEscenario('tienda-ficha-a', { desplazamientos: [0, 'mitad', 'final', 1200] }, 375),
    [
      { archivo: 'tienda-ficha-a-375.png', posicion: null },
      { archivo: 'tienda-ficha-a-375-ventana-0.png', posicion: 0 },
      { archivo: 'tienda-ficha-a-375-ventana-mitad.png', posicion: 'mitad' },
      { archivo: 'tienda-ficha-a-375-ventana-final.png', posicion: 'final' },
      { archivo: 'tienda-ficha-a-375-ventana-1200.png', posicion: 1200 },
    ],
  );
});

test('PBI-0252: una posición que no es un entero ≥ 0, «mitad» ni «final», o repetida, se rechaza al cargar', () => {
  for (const desplazamientos of [[-5], [1.5], ['medio'], [0, 0], ['final', 'final'], 'final', [null]]) {
    assert.throws(
      () => tomasDeEscenario('x', { desplazamientos }, 375),
      /desplazamientos/,
      JSON.stringify(desplazamientos),
    );
  }
});

test('PBI-0252: la posición se resuelve en píxeles dentro del desplazamiento posible de la página', () => {
  const medidas = { altoDelDocumento: 3000, altoDeLaVentana: 812 };
  assert.equal(resolverDesplazamiento(0, medidas), 0);
  assert.equal(resolverDesplazamiento('mitad', medidas), 1094);
  assert.equal(resolverDesplazamiento('final', medidas), 2188);
  assert.equal(resolverDesplazamiento(1200, medidas), 1200);
  assert.equal(resolverDesplazamiento(5000, medidas), 2188);
  // Una página más corta que la ventana no se desplaza.
  const corta = { altoDelDocumento: 600, altoDeLaVentana: 812 };
  assert.equal(resolverDesplazamiento('final', corta), 0);
  assert.equal(resolverDesplazamiento('mitad', corta), 0);
  assert.equal(resolverDesplazamiento(300, corta), 0);
});
