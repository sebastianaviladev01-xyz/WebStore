/**
 * Pruebas unitarias de las consultas de temas (TEST-08): la apariencia pública con y sin modo demo, la vista
 * del Admin y la hoja de estilos `theme.css` con vista previa válida, inexistente o ignorada fuera del modo demo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createTemasQueries } from '../../../../src/application/temas/temas.queries.mjs';
import { TOKENS_DEL_TEMA, tokensDelTema } from '../../../../src/domain/temas/tema.rules.mjs';
import { TEMAS_PREDEFINIDOS } from '../../../../src/domain/temas/temas-predefinidos.mjs';

const colores = {
  primary: '#0A7A5A',
  secondary: '#FF8800',
  background: '#F0F0F0',
  surface: '#FFFFFF',
  contrast: '#111111',
};

const propio = (id, name) => ({
  id,
  name,
  colors: { ...colores },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
});

function crearAlmacen(activeThemeId = 'b') {
  return {
    state: {
      revision: 7,
      appearance: {
        revision: 3,
        activeThemeId,
        // Orden de inserción distinto del orden por nombre con `localeCompare('es')`.
        customThemes: [propio('z', 'Zafiro'), propio('n', 'Ñandú'), propio('b1', 'árbol')],
      },
    },
  };
}

const consultas = (activeThemeId) => createTemasQueries({ store: crearAlmacen(activeThemeId) });

// Lote 14 (PBI-0188, ADR-0022): la tuerca de la demo ofrece solo A, B y C. La apariencia pública en modo demo trae los
// tres predefinidos y, si el activo es un tema propio, también el activo, para que la tienda y el Admin lo pinten.
test('apariencia(true) trae A, B y C, sin los temas propios, si el activo es un predefinido', () => {
  const vista = consultas().apariencia(true);
  assert.equal(vista.demoMode, true);
  assert.equal(vista.activeThemeId, 'b');
  assert.deepEqual(
    vista.themes.map(({ id }) => id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    vista.themes.map(({ kind }) => kind),
    ['predefined', 'predefined', 'predefined'],
  );
});

test('apariencia(true) con un tema propio activo trae A, B, C y el activo, sin los demás propios', () => {
  const vista = consultas('n').apariencia(true);
  assert.equal(vista.activeThemeId, 'n');
  assert.deepEqual(
    vista.themes.map(({ id }) => id),
    ['a', 'b', 'c', 'n'],
  );
  assert.equal(vista.themes[3].kind, 'custom');
});

test('apariencia(false) trae solo el tema activo y demoMode en falso', () => {
  const vista = consultas('n').apariencia(false);
  assert.equal(vista.demoMode, false);
  assert.equal(vista.activeThemeId, 'n');
  assert.deepEqual(
    vista.themes.map(({ id }) => id),
    ['n'],
  );
  assert.equal(consultas().apariencia(undefined).demoMode, false);
});

test('apariencia: testCredentials en modo demo o si se piden, sin cambiar demoMode ni los temas (PBI-0071)', () => {
  assert.equal(consultas().apariencia(true).testCredentials, true, 'en modo demo');
  assert.equal(consultas().apariencia(false).testCredentials, false, 'por defecto, no');
  assert.equal(consultas().apariencia(undefined).testCredentials, false);
  const pedidas = consultas('n').apariencia(false, true);
  assert.equal(pedidas.testCredentials, true);
  assert.equal(pedidas.demoMode, false, 'las credenciales no encienden la tuerca');
  assert.deepEqual(
    pedidas.themes.map(({ id }) => id),
    ['n'],
  );
});

test('un activeThemeId inexistente se trata como B', () => {
  const vista = consultas('fantasma').apariencia(false);
  assert.equal(vista.activeThemeId, 'b');
  assert.deepEqual(
    vista.themes.map(({ id }) => id),
    ['b'],
  );
});

test('el DTO no trae fechas y los tokens de un propio se calculan al leer', () => {
  const store = crearAlmacen();
  const antes = structuredClone(store.state);
  const { themes } = createTemasQueries({ store }).temasAdmin();
  const tema = themes.find(({ id }) => id === 'z');

  assert.deepEqual(tema.tokens, tokensDelTema(colores, TEMAS_PREDEFINIDOS));
  assert.deepEqual(Object.keys(tema).sort(), ['colors', 'id', 'kind', 'name', 'tokens']);
  assert.deepEqual(tema.colors, colores);
  assert.deepEqual(store.state, antes);
  assert.equal('tokens' in store.state.appearance.customThemes[0], false);
});

test('los predefinidos salen como copias planas, no como las referencias congeladas', () => {
  const { themes } = consultas().apariencia(true);
  const a = themes.find(({ id }) => id === 'a');
  assert.notEqual(a.colors, TEMAS_PREDEFINIDOS[0].colors);
  assert.notEqual(a.tokens, TEMAS_PREDEFINIDOS[0].tokens);
  assert.equal(Object.isFrozen(a.colors), false);
  assert.equal(Object.isFrozen(a.tokens), false);
  assert.deepEqual(a.tokens, TEMAS_PREDEFINIDOS[0].tokens);
});

test('temasAdmin trae la revisión, el activo y todos los temas', () => {
  const vista = consultas('c').temasAdmin();
  assert.equal(vista.revision, 3);
  assert.equal(vista.activeThemeId, 'c');
  assert.equal(vista.themes.length, 6);
});

test('hojaDeEstilos: con modo demo y la vista previa de un predefinido sirve la vista previa', () => {
  const css = consultas('b').hojaDeEstilos(true, 'a');
  assert.ok(css.includes(`  --ws-primary: ${TEMAS_PREDEFINIDOS[0].tokens['--ws-primary']};\n`));
  assert.ok(!css.includes('#1d4ed8'));
  assert.equal(consultas('n').hojaDeEstilos(true, 'c'), consultas('c').hojaDeEstilos(false));
});

test('hojaDeEstilos: con modo demo, la vista previa de un tema propio se ignora y sirve el activo (PBI-0188)', () => {
  assert.equal(consultas('b').hojaDeEstilos(true, 'n'), consultas('b').hojaDeEstilos(false));
  assert.equal(consultas('c').hojaDeEstilos(true, 'z'), consultas('c').hojaDeEstilos(false));
  // Un tema propio activo se sirve como activo, con su id en la cookie o con el de otro propio.
  assert.equal(consultas('n').hojaDeEstilos(true, 'n'), consultas('n').hojaDeEstilos(false));
  assert.equal(consultas('n').hojaDeEstilos(true, 'z'), consultas('n').hojaDeEstilos(false));
  assert.ok(consultas('n').hojaDeEstilos(false).includes('  --ws-primary: #0A7A5A;\n'));
});

test('hojaDeEstilos: una vista previa inexistente o vacía sirve el activo', () => {
  const esperado = consultas('b').hojaDeEstilos(false, undefined);
  for (const id of ['fantasma', '', undefined, null]) {
    assert.equal(consultas('b').hojaDeEstilos(true, id), esperado);
  }
});

test('hojaDeEstilos: sin modo demo ignora la vista previa', () => {
  const esperado = consultas('b').hojaDeEstilos(false, undefined);
  assert.equal(consultas('b').hojaDeEstilos(false, 'a'), esperado);
  assert.equal(consultas('b').hojaDeEstilos(undefined, 'a'), esperado);
});

test('hojaDeEstilos: un activo inexistente sirve B', () => {
  assert.equal(consultas('fantasma').hojaDeEstilos(false), consultas('b').hojaDeEstilos(false));
});

test('hojaDeEstilos: formato exacto, cada token una vez y en orden', () => {
  const css = consultas('b').hojaDeEstilos(false);
  assert.ok(css.startsWith(':root:root {\n'));
  assert.ok(css.endsWith('}\n'));
  const lineas = css.slice(':root:root {\n'.length, -'}\n'.length).split('\n');
  assert.equal(lineas.pop(), '');
  assert.equal(lineas.length, TOKENS_DEL_TEMA.length);
  lineas.forEach((linea, indice) => {
    assert.match(linea, /^ {2}--ws-[a-z-]+: [^;\n]+;$/);
    assert.ok(linea.startsWith(`  ${TOKENS_DEL_TEMA[indice]}: `));
  });
  assert.ok(css.includes('  --ws-primary: #1d4ed8;\n'));
});

const declaraciones = (css) => css.slice(':root:root {\n'.length, -'}\n'.length).trimEnd().split('\n');

test('hojaDeEstilos: 37 declaraciones, con el lienzo de la tienda justo antes del fondo principal (B y un propio)', () => {
  const casos = [
    ['b', '  --ws-store-bg: #f9fafc;', '  --ws-bg: #f3f5f8;'],
    ['n', '  --ws-store-bg: #F0F0F0;', '  --ws-bg: #F0F0F0;'],
  ];
  for (const [id, lienzo, fondo] of casos) {
    const lineas = declaraciones(consultas(id).hojaDeEstilos(false));
    assert.equal(lineas.length, 37, id);
    const indice = lineas.indexOf(lienzo);
    assert.ok(indice >= 0, `${id}: falta «${lienzo.trim()}»`);
    assert.equal(lineas[indice + 1], fondo, id);
  }
});

// TEST-04 (feature 005, ADR-0014): theme.css declara el texto sobre el enlace justo después del enlace.
test('hojaDeEstilos: --ws-on-link justo después de --ws-link, con su valor (B y un propio)', () => {
  const casos = [
    ['b', '  --ws-link: var(--ws-primary);', '  --ws-on-link: #ffffff;'],
    ['n', '  --ws-link: #0A7A5A;', '  --ws-on-link: #FFFFFF;'],
  ];
  for (const [id, enlace, sobreEnlace] of casos) {
    const lineas = declaraciones(consultas(id).hojaDeEstilos(false));
    const indice = lineas.indexOf(enlace);
    assert.ok(indice >= 0, `${id}: falta «${enlace.trim()}»`);
    assert.equal(lineas[indice + 1], sobreEnlace, id);
    assert.equal(lineas.filter((linea) => linea.startsWith('  --ws-on-link:')).length, 1, id);
  }
});
