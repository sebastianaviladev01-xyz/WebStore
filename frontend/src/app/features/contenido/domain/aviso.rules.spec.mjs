/**
 * Avisos de la barra superior (lote 15, ADR-0021; PBI-0175, provisional): Daniel aclaró que la «Navegación superior»
 * se pensó para avisos generales a los clientes (mantenimiento, próximas ofertas…), con enlace opcional. La tienda
 * muestra cada aviso con su texto y, si tiene, su enlace: una ruta de la tienda pasa por el router y una dirección
 * `https://` se abre en otra pestaña. Con varios, rotan; el índice da la vuelta en los dos sentidos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./aviso.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { avisosVisibles, avisoSiguiente, avisoAnterior, INTERVALO_DE_AVISOS_MS } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0175: cada aviso lleva su texto y el tipo de su enlace', () => {
  assert.deepEqual(
    avisosVisibles([
      { text: ' Mantenimiento el domingo ', url: '' },
      { text: 'Ofertas de verano', url: ' /catalogo?categoria=cat-tv ' },
      { text: 'Síguenos', url: 'https://www.instagram.com/tienda' },
    ]),
    [
      { texto: 'Mantenimiento el domingo', enlace: null },
      { texto: 'Ofertas de verano', enlace: { tipo: 'ruta', url: '/catalogo?categoria=cat-tv' } },
      { texto: 'Síguenos', enlace: { tipo: 'externo', url: 'https://www.instagram.com/tienda' } },
    ],
  );
});

test('PBI-0175: un aviso sin texto no se muestra; un enlace que no es de la tienda ni https:// se ignora', () => {
  assert.deepEqual(
    avisosVisibles([
      { text: '   ', url: '/catalogo' },
      { text: 'Aviso', url: 'javascript:alert(1)' },
      { text: 'Otro', url: '//otra.com' },
      { text: 'Inseguro', url: 'http://x.com' },
    ]),
    [
      { texto: 'Aviso', enlace: null },
      { texto: 'Otro', enlace: null },
      { texto: 'Inseguro', enlace: null },
    ],
  );
  assert.deepEqual(avisosVisibles(undefined), []);
  assert.deepEqual(avisosVisibles([null, 'texto', { url: '/x' }]), []);
});

test('PBI-0175: con varios avisos, el siguiente y el anterior dan la vuelta', () => {
  assert.equal(avisoSiguiente(0, 3), 1);
  assert.equal(avisoSiguiente(2, 3), 0);
  assert.equal(avisoAnterior(0, 3), 2);
  assert.equal(avisoAnterior(1, 3), 0);
  // Si la lista se acorta (llegó otro contenido), el índice vuelve a una posición válida.
  assert.equal(avisoSiguiente(5, 2), 0);
  assert.equal(avisoSiguiente(0, 0), 0);
  assert.equal(avisoAnterior(0, 0), 0);
});

test('PBI-0175: los avisos rotan cada 6 s (más de 5 s, con pausa: WCAG 2.2.2)', () => {
  assert.equal(INTERVALO_DE_AVISOS_MS, 6000);
});
