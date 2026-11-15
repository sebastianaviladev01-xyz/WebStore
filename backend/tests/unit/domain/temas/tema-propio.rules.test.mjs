/**
 * Pruebas unitarias de las reglas de un tema propio: validación del nombre (largo y unicidad), de los cinco
 * colores y del contraste que bloquea el guardado, y comprobación de que un tema se puede editar o borrar.
 * Funciones puras. Los nombres salen de `casos-tema.json`, que también recorre la réplica del Admin (TEST-14).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  exigirTemaBorrable,
  exigirTemaPropio,
  exigirTemaValido,
} from '../../../../src/domain/temas/tema-propio.rules.mjs';

const casos = JSON.parse(readFileSync(new URL('./casos-tema.json', import.meta.url), 'utf8'));
const coloresB = casos.predefinidos.find(({ id }) => id === 'b').colors;

const temaPropio = (id, name) => ({
  id,
  name,
  colors: { ...coloresB },
  createdAt: '2026-11-11T10:00:00.000Z',
  updatedAt: '2026-11-11T10:00:00.000Z',
});
const falla =
  (kind, code, extra = {}) =>
  (error) => {
    assert.equal(error.kind, kind);
    assert.equal(error.code, code);
    for (const [clave, valor] of Object.entries(extra)) assert.deepEqual(error[clave], valor, clave);
    return true;
  };

for (const { nombre, existentes, resultado, error } of casos.nombresDeTema) {
  test(`exigirTemaValido, nombre ${JSON.stringify(nombre)} frente a ${JSON.stringify(existentes)}`, () => {
    const temasPropios = existentes.map((name, indice) => temaPropio(`p${indice}`, name));
    const validar = () => exigirTemaValido({ name: nombre, colors: coloresB }, temasPropios);
    if (error) {
      assert.throws(validar, (e) => e.code === error && ['validation', 'conflict'].includes(e.kind));
    } else {
      assert.equal(validar().name, resultado);
    }
  });
}

test('los errores del nombre llevan su tipo y su mensaje', () => {
  assert.throws(
    () => exigirTemaValido({ name: '', colors: coloresB }, []),
    falla('validation', 'INVALID_THEME_NAME'),
  );
  assert.throws(
    () => exigirTemaValido({ name: 'Azul cobalto', colors: coloresB }, []),
    falla('conflict', 'THEME_NAME_TAKEN'),
  );
  assert.throws(() => exigirTemaValido({ name: '', colors: coloresB }, []), {
    message: 'El nombre del tema debe tener entre 1 y 40 caracteres.',
  });
  assert.throws(() => exigirTemaValido({ name: 'Azul cobalto', colors: coloresB }, []), {
    message: 'Ya existe un tema con ese nombre.',
  });
  // PBI-0069: un nombre con caracteres invisibles dice por qué se rechaza.
  assert.throws(() => exigirTemaValido({ name: 'Mi​tema', colors: coloresB }, []), {
    message: 'El nombre del tema no puede llevar caracteres invisibles.',
  });
});

test('un nombre ausente o que no es texto se trata como vacío o como texto', () => {
  assert.throws(() => exigirTemaValido({ colors: coloresB }, []), falla('validation', 'INVALID_THEME_NAME'));
  assert.throws(() => exigirTemaValido(undefined, []), falla('validation', 'INVALID_THEME_NAME'));
  assert.equal(exigirTemaValido({ name: 123, colors: coloresB }, []).name, '123');
});

const conColores = (colors) => () => exigirTemaValido({ name: 'Tema nuevo', colors }, []);
const colorInvalido = (field) => falla('validation', 'INVALID_THEME_COLOR', { details: { field } });

test('colors ausente falla en primary', () => {
  assert.throws(() => exigirTemaValido({ name: 'Tema nuevo' }, []), colorInvalido('primary'));
});

test('el primer color inválido, en el orden primary, secondary, background, surface y contrast, da el error', () => {
  const { secondary: _omitido, ...sinSecundario } = coloresB;
  assert.throws(conColores(sinSecundario), colorInvalido('secondary'));
  assert.throws(conColores({ ...coloresB, primary: '#12345' }), colorInvalido('primary'));
  assert.throws(conColores({ ...coloresB, background: 'rgb(1, 2, 3)' }), colorInvalido('background'));
  assert.throws(conColores({ ...coloresB, surface: '#GGGGGG' }), colorInvalido('surface'));
  assert.throws(conColores({ ...coloresB, contrast: 123456 }), colorInvalido('contrast'));
  assert.throws(conColores({ ...coloresB, secondary: 'azul', contrast: 'rojo' }), colorInvalido('secondary'));
});

test('un color con más de seis dígitos o sin almohadilla no es válido', () => {
  assert.throws(conColores({ ...coloresB, primary: '#1D4ED8FF' }), colorInvalido('primary'));
  assert.throws(conColores({ ...coloresB, primary: '1D4ED8' }), colorInvalido('primary'));
});

test('los colores en minúsculas se normalizan a mayúsculas y la entrada no se muta', () => {
  const entrada = {
    name: '  Tema nuevo ',
    colors: {
      primary: '#1d4ed8',
      secondary: '#c2410c',
      background: '#f3f5f8',
      surface: '#ffffff',
      contrast: '#0f172a',
    },
  };
  const copia = structuredClone(entrada);
  const resultado = exigirTemaValido(entrada, []);
  assert.deepEqual(resultado, { name: 'Tema nuevo', colors: coloresB });
  assert.deepEqual(entrada, copia);
  assert.notEqual(resultado.colors, entrada.colors);
});

test('un contraste que no se lee sobre los fondos lista solo los pares que bloquean y están bajo el mínimo', () => {
  assert.throws(
    () => exigirTemaValido({ name: 'Tema nuevo', colors: { ...coloresB, contrast: '#9CA3AF' } }, []),
    falla('validation', 'INSUFFICIENT_THEME_CONTRAST', {
      details: {
        pairs: [
          { pair: 'contrast/background', ratio: 2.3, minimum: 4.5 },
          { pair: 'contrast/surface', ratio: 2.5, minimum: 4.5 },
        ],
      },
    }),
  );
  assert.throws(
    () => exigirTemaValido({ name: 'Tema nuevo', colors: { ...coloresB, contrast: '#9CA3AF' } }, []),
    { message: 'El color de contraste no se lee bien sobre los fondos.' },
  );
});

test('un par bloqueante bajo el mínimo no arrastra a los demás: solo se lista el que falla', () => {
  assert.throws(
    () => exigirTemaValido({ name: 'Tema nuevo', colors: { ...coloresB, contrast: '#717171' } }, []),
    falla('validation', 'INSUFFICIENT_THEME_CONTRAST', {
      details: { pairs: [{ pair: 'contrast/background', ratio: 4.4, minimum: 4.5 }] },
    }),
  );
});

test('la base oscura con avisos de contraste (sin pares bloqueantes) se acepta', () => {
  const oscura = {
    primary: '#3B82F6',
    secondary: '#F97316',
    background: '#111318',
    surface: '#1B1E25',
    contrast: '#F5F7FA',
  };
  assert.deepEqual(exigirTemaValido({ name: 'Tema oscuro', colors: oscura }, []), {
    name: 'Tema oscuro',
    colors: oscura,
  });
});

test('el orden de los errores: nombre, nombre repetido, colores y contraste', () => {
  assert.throws(
    () => exigirTemaValido({ name: '', colors: { primary: 'x' } }, []),
    falla('validation', 'INVALID_THEME_NAME'),
  );
  assert.throws(
    () => exigirTemaValido({ name: 'Azul cobalto', colors: { primary: 'x' } }, []),
    falla('conflict', 'THEME_NAME_TAKEN'),
  );
  assert.throws(
    () =>
      exigirTemaValido(
        { name: 'Tema nuevo', colors: { ...coloresB, primary: 'x', contrast: '#9CA3AF' } },
        [],
      ),
    colorInvalido('primary'),
  );
});

test('exigirTemaPropio devuelve el tema propio; un predefinido o un id desconocido fallan', () => {
  const propios = [temaPropio('t1', 'Mi tema'), temaPropio('t2', 'Otro')];
  assert.equal(exigirTemaPropio('t2', propios), propios[1]);
  assert.throws(() => exigirTemaPropio('b', propios), falla('conflict', 'PREDEFINED_THEME_READ_ONLY'));
  assert.throws(() => exigirTemaPropio('b', propios), {
    message: 'Los temas predefinidos no se editan ni se borran.',
  });
  assert.throws(() => exigirTemaPropio('nope', propios), falla('not-found', 'THEME_NOT_FOUND'));
  assert.throws(() => exigirTemaPropio('nope', propios), { message: 'El tema no existe.' });
});

test('exigirTemaBorrable rechaza el tema activo con el texto de AC-09', () => {
  const apariencia = {
    revision: 3,
    activeThemeId: 't1',
    customThemes: [temaPropio('t1', 'Mi tema'), temaPropio('t2', 'Otro')],
  };
  assert.throws(() => exigirTemaBorrable('t1', apariencia), falla('conflict', 'ACTIVE_THEME_IN_USE'));
  assert.throws(() => exigirTemaBorrable('t1', apariencia), {
    message: 'Activa otro tema antes de borrar este.',
  });
});

test('exigirTemaBorrable devuelve un tema que no es el activo y rechaza predefinidos e inexistentes', () => {
  const apariencia = {
    revision: 3,
    activeThemeId: 'b',
    customThemes: [temaPropio('t1', 'Mi tema')],
  };
  assert.equal(exigirTemaBorrable('t1', apariencia), apariencia.customThemes[0]);
  assert.throws(() => exigirTemaBorrable('b', apariencia), falla('conflict', 'PREDEFINED_THEME_READ_ONLY'));
  assert.throws(() => exigirTemaBorrable('nope', apariencia), falla('not-found', 'THEME_NOT_FOUND'));
});

// Lote 08 (ADR-0017), PBI-0079: el texto de ACTIVE_THEME_IN_USE se exporta para que el Admin no lo copie a mano.
test('MENSAJE_TEMA_ACTIVO_EN_USO es el texto de ACTIVE_THEME_IN_USE', async () => {
  const { MENSAJE_TEMA_ACTIVO_EN_USO } = await import('../../../../src/domain/temas/tema-propio.rules.mjs');
  assert.equal(MENSAJE_TEMA_ACTIVO_EN_USO, 'Activa otro tema antes de borrar este.');
  const apariencia = { revision: 1, activeThemeId: 't1', customThemes: [temaPropio('t1', 'Mi tema')] };
  assert.throws(() => exigirTemaBorrable('t1', apariencia), { message: MENSAJE_TEMA_ACTIVO_EN_USO });
});
