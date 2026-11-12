/**
 * TEST-10: normalización y migraciones del estado guardado (`normalizeState`), sin disco ni red.
 * Las pruebas «caracterización» fijaron el comportamiento anterior a `schemaVersion: 3` y siguen vigentes;
 * las de los colores anteriores pasan a la migración `migrarColoresDeContenido` (D3, AC-23 y AC-24).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeState,
  SCHEMA_VERSION,
} from '../../../../src/infrastructure/persistencia/normalizar-estado.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

const demoPasswords = { superadmin: 'Prueba#1', admin: 'Prueba#2', vendedor: 'Prueba#3' };
const BASE_DE_B = { background: '#F3F5F8', surface: '#FFFFFF', contrast: '#0F172A' };

/** Estado guardado por la versión 2 (roles ya migrados, colores en Contenido), con credenciales. */
function estadoV2(colores = { primaryColor: '#1D4ED8', secondaryColor: '#C2410C' }) {
  const base = structuredClone(seed);
  delete base.appearance;
  return {
    ...base,
    schemaVersion: 2,
    revision: 7,
    adminCredentials: base.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
    config: { ...base.config, ...colores },
  };
}

const sinColores = (config) => !('primaryColor' in config) && !('secondaryColor' in config);

// --- Caracterización (en verde sobre el código anterior; siguen vigentes) ---

test('caracterización: completa con la semilla lo que falta en config y conserva la revisión', () => {
  const guardado = estadoV2();
  delete guardado.config.footerText;
  const next = normalizeState(guardado, demoPasswords);
  assert.equal(next.config.footerText, seed.config.footerText);
  assert.equal(next.revision, 7);
  assert.deepEqual(next.adminCredentials, guardado.adminCredentials);
});

test('caracterización: un estado ya migrado no vuelve a recibir las cuentas demo que se borraron', () => {
  const guardado = estadoV2();
  guardado.users = guardado.users.filter((user) => user.id !== 'u-3');
  guardado.adminCredentials = guardado.adminCredentials.filter((item) => item.userId !== 'u-3');
  const next = normalizeState(guardado, demoPasswords);
  assert.deepEqual(
    next.users.map((user) => user.id),
    ['u-1', 'u-2'],
  );
});

test('caracterización: un estado sin schemaVersion traduce los roles anteriores', () => {
  const guardado = estadoV2();
  delete guardado.schemaVersion;
  guardado.users = [{ ...guardado.users[0], role: 'owner' }];
  guardado.adminCredentials = [{ userId: 'u-1', salt: 's', hash: 'h' }];
  const next = normalizeState(guardado, demoPasswords);
  assert.equal(next.users.find((user) => user.id === 'u-1').role, 'superadmin');
  assert.ok(next.users.some((user) => user.id === 'u-3'));
});

test('caracterización: normalizar otra vez el resultado no lo cambia', () => {
  const una = normalizeState(estadoV2({ primaryColor: '#123456' }), demoPasswords);
  const dos = normalizeState(structuredClone(una), demoPasswords);
  assert.deepEqual(dos, una);
});

// --- Migración schemaVersion: 3 ---

test('la versión del esquema es 3', () => {
  assert.equal(SCHEMA_VERSION, 3);
  assert.equal(normalizeState(estadoV2(), demoPasswords).schemaVersion, 3);
});

test('sin estado guardado (la semilla): B activo, revisión 0, sin temas propios y Contenido sin colores', () => {
  assert.ok(sinColores(seed.config));
  assert.deepEqual(seed.appearance, { revision: 0, activeThemeId: 'b', customThemes: [] });
  const next = normalizeState(structuredClone(seed), demoPasswords);
  assert.deepEqual(next.appearance, { revision: 0, activeThemeId: 'b', customThemes: [] });
  assert.ok(sinColores(next.config));
});

test('v2 con un color propio crea «Colores de Contenido» activo, con la base de B, y quita los colores', () => {
  const next = normalizeState(
    estadoV2({ primaryColor: '#123456', secondaryColor: '#7c2d12' }),
    demoPasswords,
  );
  assert.equal(next.appearance.customThemes.length, 1);
  const [tema] = next.appearance.customThemes;
  assert.equal(tema.name, 'Colores de Contenido');
  assert.deepEqual(tema.colors, { primary: '#123456', secondary: '#7C2D12', ...BASE_DE_B });
  assert.match(tema.id, /^[0-9a-f-]{36}$/);
  assert.ok(!Number.isNaN(Date.parse(tema.createdAt)));
  assert.equal(tema.updatedAt, tema.createdAt);
  assert.equal(next.appearance.activeThemeId, tema.id);
  assert.equal(next.appearance.revision, 0);
  assert.ok(sinColores(next.config));
  assert.equal(next.revision, 7);
});

test('v2 con los colores de B en minúsculas no crea nada: B activo', () => {
  const next = normalizeState(
    estadoV2({ primaryColor: '#1d4ed8', secondaryColor: '#c2410c' }),
    demoPasswords,
  );
  assert.deepEqual(next.appearance, { revision: 0, activeThemeId: 'b', customThemes: [] });
  assert.ok(sinColores(next.config));
});

test('v2 con los colores por defecto anteriores (borgoña y bronce) no crea nada: B activo', () => {
  const next = normalizeState(
    estadoV2({ primaryColor: '#6e173c', secondaryColor: '#8C6845' }),
    demoPasswords,
  );
  assert.deepEqual(next.appearance, { revision: 0, activeThemeId: 'b', customThemes: [] });
  assert.ok(sinColores(next.config));
});

test('un color anterior por defecto, ausente o inválido cuenta como el de B', () => {
  const casos = [
    [
      { primaryColor: '#123456', secondaryColor: '#8c6845' },
      { primary: '#123456', secondary: '#C2410C' },
    ],
    [
      { primaryColor: '#6E173C', secondaryColor: '#654321' },
      { primary: '#1D4ED8', secondary: '#654321' },
    ],
    [{ secondaryColor: '#654321' }, { primary: '#1D4ED8', secondary: '#654321' }],
    [{ primaryColor: 'rojo', secondaryColor: '#12345' }, null],
    [{ primaryColor: 'rgb(1, 2, 3)', secondaryColor: 42 }, null],
  ];
  for (const [colores, esperado] of casos) {
    const guardado = estadoV2();
    delete guardado.config.primaryColor;
    delete guardado.config.secondaryColor;
    Object.assign(guardado.config, colores);
    const next = normalizeState(guardado, demoPasswords);
    if (esperado === null) {
      assert.deepEqual(next.appearance.customThemes, [], JSON.stringify(colores));
      assert.equal(next.appearance.activeThemeId, 'b');
    } else {
      assert.deepEqual(
        next.appearance.customThemes[0].colors,
        { ...esperado, ...BASE_DE_B },
        JSON.stringify(colores),
      );
    }
    assert.ok(sinColores(next.config));
  }
});

test('si el nombre ya existe, usa «(2)», «(3)» y así sucesivamente, sin distinguir mayúsculas', () => {
  const propio = (id, name) => ({
    id,
    name,
    colors: { primary: '#000000', secondary: '#111111', ...BASE_DE_B },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  const guardado = estadoV2({ primaryColor: '#123456' });
  guardado.appearance = {
    revision: 4,
    activeThemeId: 'c',
    customThemes: [propio('t-1', 'colores de contenido'), propio('t-2', 'Colores de Contenido (2)')],
  };
  const next = normalizeState(guardado, demoPasswords);
  assert.equal(next.appearance.customThemes.length, 3);
  const migrado = next.appearance.customThemes[2];
  assert.equal(migrado.name, 'Colores de Contenido (3)');
  assert.equal(next.appearance.activeThemeId, migrado.id);
  assert.equal(next.appearance.revision, 4);
});

test('un estado v3 no cambia al normalizarlo otra vez', () => {
  const v3 = normalizeState(estadoV2({ primaryColor: '#123456', secondaryColor: '#654321' }), demoPasswords);
  assert.deepEqual(normalizeState(structuredClone(v3), demoPasswords), v3);
});

test('un estado v3 con colores en Contenido los descarta sin crear temas', () => {
  const v3 = normalizeState(estadoV2(), demoPasswords);
  v3.config.primaryColor = '#123456';
  const next = normalizeState(v3, demoPasswords);
  assert.deepEqual(next.appearance.customThemes, []);
  assert.equal(next.appearance.activeThemeId, 'b');
  assert.ok(sinColores(next.config));
});

test('un activeThemeId desconocido pasa a b; uno de un tema propio existente se conserva', () => {
  const v3 = normalizeState(estadoV2({ primaryColor: '#123456' }), demoPasswords);
  const idPropio = v3.appearance.activeThemeId;
  assert.equal(normalizeState({ ...structuredClone(v3) }, demoPasswords).appearance.activeThemeId, idPropio);
  for (const activo of ['zz', undefined, null, 3]) {
    const guardado = structuredClone(v3);
    guardado.appearance.activeThemeId = activo;
    assert.equal(normalizeState(guardado, demoPasswords).appearance.activeThemeId, 'b', String(activo));
  }
  const conC = structuredClone(v3);
  conC.appearance.activeThemeId = 'c';
  assert.equal(normalizeState(conC, demoPasswords).appearance.activeThemeId, 'c');
});

test('una apariencia v3 incompleta se completa: revisión 0 y lista vacía', () => {
  const v3 = normalizeState(estadoV2(), demoPasswords);
  v3.appearance = { activeThemeId: 'a' };
  assert.deepEqual(normalizeState(v3, demoPasswords).appearance, {
    revision: 0,
    activeThemeId: 'a',
    customThemes: [],
  });
});
