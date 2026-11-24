import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 21 (ADR-0025), PBI-0216: en Tarifas de envío el distrito se elige de una lista. La regla se transpila sin sus
// `import`, detrás de la regla de la que depende.
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const fuente = [await leer('./listado.rules.ts'), await leer('./distrito.rules.ts')].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { DISTRITOS_DE_LIMA_Y_CALLAO, opcionesDeDistrito, distritoDeLasOpciones } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

const tarifa = (destination) => ({ id: destination, origin: 'Lima Centro', destination, price: 10 });
const comparable = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-PE').trim();

test('la lista trae los 43 distritos de Lima Metropolitana y los 7 del Callao, sin repetidos', () => {
  assert.equal(DISTRITOS_DE_LIMA_Y_CALLAO.length, 50);
  assert.equal(new Set(DISTRITOS_DE_LIMA_Y_CALLAO.map(comparable)).size, 50);
  for (const distrito of [
    'Miraflores',
    'San Juan de Lurigancho',
    'Villa El Salvador',
    'Bellavista',
    'Ventanilla',
  ])
    assert.ok(DISTRITOS_DE_LIMA_Y_CALLAO.includes(distrito), distrito);
});

test('los distritos de los datos de ejemplo están en la lista con el mismo nombre', () => {
  // Los de `seed.mjs`: elegirlos de la lista actualiza esas tarifas en lugar de crear otras.
  const deEjemplo = ['San Isidro', 'Miraflores', 'Surco', 'La Molina', 'Lince', 'Jesús María', 'Breña'];
  deEjemplo.push('Los Olivos', 'Independencia', 'Comas', 'San Martín de Porres');
  for (const distrito of deEjemplo) assert.ok(DISTRITOS_DE_LIMA_Y_CALLAO.includes(distrito), distrito);
});

test('las opciones suman a la lista los distritos que ya tienen tarifa, sin repetir y en orden alfabético', () => {
  const opciones = opcionesDeDistrito([tarifa('Huacho'), tarifa('jesus maria'), tarifa('Huacho')]);
  assert.ok(
    opciones.includes('Huacho'),
    'un distrito con tarifa fuera de la lista se puede elegir al editar',
  );
  assert.equal(opciones.filter((distrito) => comparable(distrito) === 'huacho').length, 1);
  assert.equal(
    opciones.filter((distrito) => comparable(distrito) === 'jesus maria').length,
    1,
    'sin tildes ni mayúsculas es el mismo distrito: queda el nombre de la lista',
  );
  assert.ok(opciones.includes('Jesús María'));
  assert.equal(opciones.length, 51);
  assert.deepEqual(
    opciones,
    [...opciones].sort((a, b) => a.localeCompare(b, 'es')),
  );
});

test('sin tarifas, las opciones son la lista completa', () => {
  assert.equal(opcionesDeDistrito([]).length, 50);
});

test('al editar, el distrito de la tarifa se muestra con el nombre de las opciones', () => {
  const opciones = opcionesDeDistrito([tarifa('jesus maria')]);
  assert.equal(distritoDeLasOpciones(opciones, 'jesus maria'), 'Jesús María');
  assert.equal(distritoDeLasOpciones(opciones, 'Huaral'), 'Huaral', 'uno que no está queda igual');
});
