/**
 * Pruebas unitarias de los casos de uso de temas (TEST-07): crear, editar, borrar y activar con un almacén
 * en memoria. Comprueban la revisión propia de los temas (ADR-0011), que una regla que falla no cambia ni
 * guarda nada y que `state.revision` no se toca.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createTemasUseCases } from '../../../../src/application/temas/temas.use-cases.mjs';

const colores = {
  primary: '#0a7a5a',
  secondary: '#ff8800',
  background: '#f0f0f0',
  surface: '#ffffff',
  contrast: '#111111',
};

const propio = (id, name, createdAt = '2026-01-01T00:00:00.000Z') => ({
  id,
  name,
  colors: { ...colores, primary: '#0A7A5A' },
  createdAt,
  updatedAt: createdAt,
});

function crearAlmacen(activeThemeId = 'b') {
  return {
    state: {
      revision: 7,
      appearance: {
        revision: 3,
        activeThemeId,
        customThemes: [propio('p1', 'Bosque'), propio('p2', 'Zafiro')],
      },
    },
    guardados: 0,
    save() {
      this.guardados += 1;
    },
  };
}

const seguridad = { newId: () => 'nuevo-1' };

function preparar(activeThemeId) {
  const store = crearAlmacen(activeThemeId);
  return { store, casos: createTemasUseCases({ store, security: seguridad }) };
}

/** Ejecuta `accion`, exige que lance, que el estado quede igual a `antes` y que no se guarde; devuelve el error. */
function exigirSinCambios(store, antes, accion) {
  let lanzado;
  try {
    accion();
  } catch (error) {
    lanzado = error;
  }
  assert.ok(lanzado, 'la operación debía fallar');
  assert.deepEqual(store.state, antes);
  assert.equal(store.guardados, 0);
  return lanzado;
}

const entrada = (extra = {}) => ({ revision: 3, name: 'Océano', colors: colores, ...extra });

test('crear agrega un tema propio sin activarlo, sube la revisión y guarda una vez', () => {
  const { store, casos } = preparar();
  const vista = casos.crear(entrada());

  assert.equal(vista.revision, 4);
  assert.equal(vista.activeThemeId, 'b');
  const nuevo = vista.themes.find(({ id }) => id === 'nuevo-1');
  assert.equal(nuevo.kind, 'custom');
  assert.equal(nuevo.name, 'Océano');
  assert.equal(nuevo.colors.primary, '#0A7A5A');
  assert.equal(nuevo.colors.contrast, '#111111');
  assert.equal(store.guardados, 1);
  assert.equal(store.state.appearance.revision, 4);
  assert.equal(store.state.appearance.activeThemeId, 'b');
  assert.equal(store.state.revision, 7);
  const guardado = store.state.appearance.customThemes.find(({ id }) => id === 'nuevo-1');
  assert.equal(guardado.createdAt, guardado.updatedAt);
  assert.match(guardado.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal('tokens' in guardado, false);
});

test('crear con el nombre de un predefinido da THEME_NAME_TAKEN sin cambios', () => {
  const { store, casos } = preparar();
  const antes = structuredClone(store.state);
  const error = exigirSinCambios(store, antes, () => casos.crear(entrada({ name: 'Violeta tienda' })));
  assert.equal(error.code, 'THEME_NAME_TAKEN');
});

test('editar conserva id y createdAt, actualiza los datos y acepta su mismo nombre', () => {
  const { store, casos } = preparar();
  const vista = casos.editar('p1', entrada({ name: 'Bosque', colors: { ...colores, primary: '#123456' } }));

  assert.equal(vista.revision, 4);
  const guardado = store.state.appearance.customThemes.find(({ id }) => id === 'p1');
  assert.equal(guardado.id, 'p1');
  assert.equal(guardado.createdAt, '2026-01-01T00:00:00.000Z');
  assert.notEqual(guardado.updatedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(guardado.name, 'Bosque');
  assert.equal(guardado.colors.primary, '#123456');
  assert.equal(store.guardados, 1);
  assert.equal(store.state.revision, 7);
});

test('editar con el nombre de otro tema propio da THEME_NAME_TAKEN sin cambios', () => {
  const { store, casos } = preparar();
  const antes = structuredClone(store.state);
  const error = exigirSinCambios(store, antes, () => casos.editar('p1', entrada({ name: 'zafiro' })));
  assert.equal(error.code, 'THEME_NAME_TAKEN');
});

test('borrar quita un tema propio que no es el activo', () => {
  const { store, casos } = preparar();
  const vista = casos.borrar('p1', 3);

  assert.equal(vista.revision, 4);
  assert.deepEqual(
    vista.themes.map(({ id }) => id),
    ['a', 'b', 'c', 'p2'],
  );
  assert.equal(store.state.appearance.customThemes.length, 1);
  assert.equal(store.guardados, 1);
  assert.equal(store.state.revision, 7);
});

test('borrar el tema activo da ACTIVE_THEME_IN_USE sin cambios', () => {
  const { store, casos } = preparar('p1');
  const antes = structuredClone(store.state);
  const error = exigirSinCambios(store, antes, () => casos.borrar('p1', 3));
  assert.equal(error.code, 'ACTIVE_THEME_IN_USE');
});

test('editar y borrar un predefinido da PREDEFINED_THEME_READ_ONLY sin cambios', () => {
  for (const accion of [(casos) => casos.editar('a', entrada()), (casos) => casos.borrar('c', 3)]) {
    const { store, casos } = preparar();
    const antes = structuredClone(store.state);
    const error = exigirSinCambios(store, antes, () => accion(casos));
    assert.equal(error.code, 'PREDEFINED_THEME_READ_ONLY');
  }
});

test('activar fija un predefinido o un tema propio', () => {
  const { store, casos } = preparar();

  const primera = casos.activar({ revision: 3, themeId: 'c' });
  assert.equal(primera.activeThemeId, 'c');
  assert.equal(primera.revision, 4);

  const segunda = casos.activar({ revision: 4, themeId: 'p2' });
  assert.equal(segunda.activeThemeId, 'p2');
  assert.equal(segunda.revision, 5);
  assert.equal(store.state.appearance.activeThemeId, 'p2');
  assert.equal(store.guardados, 2);
  assert.equal(store.state.revision, 7);
});

test('activar, editar y borrar un id inexistente dan THEME_NOT_FOUND sin cambios', () => {
  const operaciones = [
    (casos) => casos.activar({ revision: 3, themeId: 'fantasma' }),
    (casos) => casos.editar('fantasma', entrada()),
    (casos) => casos.borrar('fantasma', 3),
  ];
  for (const operacion of operaciones) {
    const { store, casos } = preparar();
    const antes = structuredClone(store.state);
    const error = exigirSinCambios(store, antes, () => operacion(casos));
    assert.equal(error.code, 'THEME_NOT_FOUND');
    assert.equal(error.kind, 'not-found');
  }
});

test('una revisión vieja o ausente da STALE_THEMES en las cuatro operaciones, sin cambios ni save', () => {
  const operaciones = [
    (casos, revision) => casos.crear({ ...entrada(), revision }),
    (casos, revision) => casos.editar('p1', { ...entrada(), revision }),
    (casos, revision) => casos.borrar('p1', revision),
    (casos, revision) => casos.activar({ revision, themeId: 'c' }),
  ];
  for (const operacion of operaciones) {
    for (const revision of [2, undefined, '3', null]) {
      const { store, casos } = preparar();
      const antes = structuredClone(store.state);
      const error = exigirSinCambios(store, antes, () => operacion(casos, revision));
      assert.equal(error.code, 'STALE_THEMES');
      assert.equal(error.kind, 'conflict');
      assert.equal(error.message, 'Otra persona cambió los temas. Recarga la lista y vuelve a intentarlo.');
    }
  }
});

test('la revisión se comprueba antes que los datos', () => {
  const { store, casos } = preparar();
  const antes = structuredClone(store.state);
  const error = exigirSinCambios(store, antes, () =>
    casos.crear({ revision: 2, name: '', colors: { primary: 'rojo' } }),
  );
  assert.equal(error.code, 'STALE_THEMES');
});

test('con la revisión vigente, los datos inválidos no cambian nada', () => {
  const { store, casos } = preparar();
  const antes = structuredClone(store.state);
  const error = exigirSinCambios(store, antes, () => casos.crear(entrada({ name: '   ' })));
  assert.equal(error.code, 'INVALID_THEME_NAME');
});
