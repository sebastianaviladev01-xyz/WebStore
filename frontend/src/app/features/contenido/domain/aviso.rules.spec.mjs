/**
 * Avisos de la barra superior (lote 15, ADR-0021; PBI-0175, confirmado por Sebastián Avila): Daniel aclaró que la
 * «Navegación superior» se pensó para avisos generales a los clientes (mantenimiento, próximas ofertas…), con enlace
 * opcional. La tienda muestra cada aviso con su texto y, si tiene, su enlace: una ruta de la tienda pasa por el router
 * y una dirección `https://` se abre en otra pestaña. Con varios, rotan; el índice da la vuelta en los dos sentidos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./aviso.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { avisosVisibles, avisosSinVencer, avisoSiguiente, avisoAnterior, INTERVALO_DE_AVISOS_MS } =
  await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

test('PBI-0175: cada aviso lleva su texto y el tipo de su enlace', () => {
  assert.deepEqual(
    avisosVisibles([
      { text: ' Mantenimiento el domingo ', url: '' },
      { text: 'Ofertas de verano', url: ' /catalogo?categoria=cat-tv ' },
      { text: 'Síguenos', url: 'https://www.instagram.com/tienda' },
    ]),
    [
      { texto: 'Mantenimiento el domingo', enlace: null, hasta: null },
      {
        texto: 'Ofertas de verano',
        enlace: { tipo: 'ruta', url: '/catalogo?categoria=cat-tv' },
        hasta: null,
      },
      {
        texto: 'Síguenos',
        enlace: { tipo: 'externo', url: 'https://www.instagram.com/tienda' },
        hasta: null,
      },
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
      { texto: 'Aviso', enlace: null, hasta: null },
      { texto: 'Otro', enlace: null, hasta: null },
      { texto: 'Inseguro', enlace: null, hasta: null },
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

// Lote 30 (ADR-0027, PBI-0244; confirmado por Sebastián Avila): el BFF solo envía los avisos vigentes. La tienda,
// además, deja de mostrar el que vence mientras la página sigue abierta: cada aviso lleva el instante de su «Hasta» y
// la barra los filtra con el instante que recibe, sin leer el reloj en la regla. Un aviso programado no llega hasta
// recargar o volver a la pestaña, y la tienda no filtra por el «Desde», para no ocultar por un reloj del equipo
// adelantado o atrasado uno que el BFF ya publicó.
test('PBI-0244: cada aviso lleva el instante de su «Hasta»; sin «Hasta» o con uno ilegible, ninguno', () => {
  assert.deepEqual(
    avisosVisibles([
      {
        text: 'Black Friday',
        url: '/catalogo',
        startAt: '2026-11-27T00:00:00.000-05:00',
        endAt: '2026-11-27T23:59:59.999-05:00',
      },
      { text: 'Sin fin', url: '', startAt: '2026-11-27T00:00:00.000-05:00' },
      { text: 'Ilegible', url: '', endAt: 'mañana' },
    ]),
    [
      {
        texto: 'Black Friday',
        enlace: { tipo: 'ruta', url: '/catalogo' },
        hasta: Date.parse('2026-11-27T23:59:59.999-05:00'),
      },
      { texto: 'Sin fin', enlace: null, hasta: null },
      { texto: 'Ilegible', enlace: null, hasta: null },
    ],
  );
});

test('PBI-0244: con la página abierta, un aviso deja de mostrarse cuando pasa su «Hasta» (el extremo cuenta)', () => {
  const hasta = Date.parse('2026-11-27T23:59:59.999-05:00');
  const avisos = [
    { texto: 'Siempre', enlace: null, hasta: null },
    { texto: 'Hoy', enlace: null, hasta },
  ];
  assert.deepEqual(
    avisosSinVencer(avisos, hasta).map((aviso) => aviso.texto),
    ['Siempre', 'Hoy'],
  );
  assert.deepEqual(
    avisosSinVencer(avisos, hasta + 1).map((aviso) => aviso.texto),
    ['Siempre'],
  );
  assert.deepEqual(avisosSinVencer([], hasta), []);
});
