/** Prueba de `sinColoresDeContenido`: Contenido ya no guarda colores; el color vive en los temas (D3, AC-22). */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sinColoresDeContenido } from '../../../../src/domain/admin/configuracion.rules.mjs';

test('descarta primaryColor y secondaryColor y conserva el resto de la configuración', () => {
  const config = {
    storeName: 'Mi tienda',
    logoUrl: '',
    primaryColor: '#123456',
    secondaryColor: '#654321',
    footerText: 'Pie',
  };
  assert.deepEqual(sinColoresDeContenido(config), { storeName: 'Mi tienda', logoUrl: '', footerText: 'Pie' });
});

test('no modifica la configuración recibida', () => {
  const config = { storeName: 'Mi tienda', primaryColor: '#123456' };
  sinColoresDeContenido(config);
  assert.deepEqual(config, { storeName: 'Mi tienda', primaryColor: '#123456' });
});

test('una configuración sin colores sale igual, en un objeto nuevo', () => {
  const config = { storeName: 'Mi tienda' };
  const resultado = sinColoresDeContenido(config);
  assert.deepEqual(resultado, config);
  assert.notEqual(resultado, config);
});

test('descarta los colores aunque lleguen vacíos o con otro formato', () => {
  assert.deepEqual(sinColoresDeContenido({ storeName: 'X', primaryColor: '', secondaryColor: null }), {
    storeName: 'X',
  });
});

test('lo que no es un objeto se devuelve sin cambios: validarlo no es tarea de esta regla', () => {
  for (const valor of [null, 'texto', 3, ['a']]) assert.equal(sinColoresDeContenido(valor), valor);
});
