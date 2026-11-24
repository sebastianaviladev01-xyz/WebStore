/**
 * Datos de contacto de la tienda (lote 15, ADR-0021; PBI-0169): varios correos, varios teléfonos y varias redes. El
 * primero de cada lista es el principal donde la tienda solo muestra uno; un teléfono se marca con `tel:` y una red
 * solo se muestra si es una dirección `https://` con nombre.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./contacto.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { enlaceDeTelefono, contactosVisibles, redesVisibles } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0169: el enlace de un teléfono conserva el + inicial y solo los dígitos', () => {
  assert.equal(enlaceDeTelefono('+51 999 000 000'), 'tel:+51999000000');
  assert.equal(enlaceDeTelefono('(01) 555-0000'), 'tel:015550000');
  assert.equal(enlaceDeTelefono(' 999.000.000 '), 'tel:999000000');
});

test('PBI-0169: los contactos visibles conservan el orden y descartan los vacíos', () => {
  assert.deepEqual(
    contactosVisibles([
      { value: ' contacto@tienda.pe ', label: '' },
      { value: '  ', label: 'Vacío' },
      { value: 'ventas@tienda.pe', label: ' Ventas ' },
    ]),
    [
      { value: 'contacto@tienda.pe', label: '' },
      { value: 'ventas@tienda.pe', label: 'Ventas' },
    ],
  );
});

test('PBI-0169: sin lista (contenido de antes o incompleto) no hay contactos', () => {
  assert.deepEqual(contactosVisibles(undefined), []);
  assert.deepEqual(contactosVisibles('contacto@tienda.pe'), []);
});

test('PBI-0169: solo se muestran las redes con nombre y una dirección https://', () => {
  assert.deepEqual(
    redesVisibles([
      { label: 'Instagram', url: 'https://www.instagram.com/tienda' },
      { label: '', url: 'https://x.com/tienda' },
      { label: 'Inseguro', url: 'http://x.com/tienda' },
      { label: 'Script', url: 'javascript:alert(1)' },
      { label: ' Facebook ', url: ' HTTPS://facebook.com/tienda ' },
    ]),
    [
      { label: 'Instagram', url: 'https://www.instagram.com/tienda' },
      { label: 'Facebook', url: 'HTTPS://facebook.com/tienda' },
    ],
  );
  assert.deepEqual(redesVisibles(undefined), []);
});
