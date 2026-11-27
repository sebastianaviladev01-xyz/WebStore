import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// TEST-01 y TEST-02 (feature 008): reglas genéricas de los listados del Admin.
const source = await readFile(new URL('./listado.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { textoBuscable, contieneTexto, paginar } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('TEST-01: el texto buscable no tiene mayúsculas, tildes ni espacios en los extremos', () => {
  assert.equal(textoBuscable('  Jesús María  '), 'jesus maria');
  assert.equal(textoBuscable('ÁÉÍÓÚ Ü'), 'aeiou u');
  assert.equal(textoBuscable('Ñandú'), 'nandu');
  assert.equal(textoBuscable(''), '');
});

test('TEST-01: contieneTexto ignora mayúsculas, tildes y espacios de los extremos', () => {
  assert.equal(contieneTexto('Jesús María', 'jesus maria'), true);
  assert.equal(contieneTexto('Cooler portátil', '  COOLER '), true);
  assert.equal(contieneTexto('Cooler portátil', 'PORTATIL'), true);
  assert.equal(contieneTexto('Audífonos', 'cooler'), false);
  assert.equal(
    contieneTexto('Cooler portátil', 'cooler  portatil'),
    false,
    'los espacios interiores cuentan',
  );
});

test('TEST-01: un filtro vacío o de solo espacios no filtra', () => {
  assert.equal(contieneTexto('Audífonos', ''), true);
  assert.equal(contieneTexto('Audífonos', '   '), true);
  assert.equal(contieneTexto('', ''), true);
});

const numeros = (n) => Array.from({ length: n }, (_, indice) => indice + 1);

// Desde el lote 43 (PBI-0265) el tamaño se elige (10, 25 o 50); los casos de 25 siguen valiendo para ese tamaño.
test('TEST-02: 25 elementos en una página de 25', () => {
  const pagina = paginar(numeros(25), 1, 25);
  assert.deepEqual(
    [pagina.page, pagina.pages, pagina.from, pagina.to, pagina.total, pagina.items.length],
    [1, 1, 1, 25, 25, 25],
  );
});

test('TEST-02: 26 elementos dan dos páginas, la segunda con uno', () => {
  const primera = paginar(numeros(26), 1, 25);
  assert.deepEqual([primera.page, primera.pages, primera.from, primera.to], [1, 2, 1, 25]);
  assert.deepEqual(primera.items, numeros(25));
  const segunda = paginar(numeros(26), 2, 25);
  assert.deepEqual(
    [segunda.page, segunda.pages, segunda.from, segunda.to, segunda.total],
    [2, 2, 26, 26, 26],
  );
  assert.deepEqual(segunda.items, [26]);
});

test('TEST-02: una página mayor que la última muestra la última', () => {
  const pagina = paginar(numeros(30), 7, 25);
  assert.deepEqual([pagina.page, pagina.pages, pagina.from, pagina.to], [2, 2, 26, 30]);
  assert.deepEqual(pagina.items, [26, 27, 28, 29, 30]);
});

test('TEST-02: una página menor que 1 muestra la primera, y una decimal se redondea hacia abajo', () => {
  assert.equal(paginar(numeros(30), 0, 25).page, 1);
  assert.equal(paginar(numeros(30), -3, 25).page, 1);
  assert.equal(paginar(numeros(30), 1.9, 25).page, 1);
});

test('TEST-02: sin elementos, página 1 de 1 con from y to en 0', () => {
  const pagina = paginar([], 3, 25);
  assert.deepEqual(
    [pagina.page, pagina.pages, pagina.from, pagina.to, pagina.total, pagina.items.length],
    [1, 1, 0, 0, 0, 0],
  );
});

// Lote 43 (ADR-0033, PBI-0265): el pie de cada listado, como la lista de proveedores del SGC. «Elementos por página»
// con 10, 25 o 50 (10 por omisión), el rango «1 - 8 de 8», la columna «N°» continua entre páginas y las fichas del
// resumen: el total y cuántos hay de cada estado.
const {
  TAMANOS_DE_PAGINA,
  TAMANO_DE_PAGINA_POR_OMISION,
  leerTamanoDePagina,
  rangoDePagina,
  numeroDeFila,
  contarPorClave,
  textoDeCantidad,
  textoDelTotal,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

test('PBI-0265: el tamaño de página es 10, 25 o 50, con 10 por omisión', () => {
  assert.deepEqual([...TAMANOS_DE_PAGINA], [10, 25, 50]);
  assert.equal(TAMANO_DE_PAGINA_POR_OMISION, 10);
});

test('PBI-0265: el tamaño se lee de la URL; uno desconocido o mal escrito es el de omisión', () => {
  assert.equal(leerTamanoDePagina('25'), 25);
  assert.equal(leerTamanoDePagina('50'), 50);
  assert.equal(leerTamanoDePagina('10'), 10);
  assert.equal(leerTamanoDePagina(undefined), 10);
  for (const valor of ['', '30', '100', '025', ' 25', '25.0', 'abc', '-25'])
    assert.equal(leerTamanoDePagina(valor), 10, `«${valor}»`);
});

test('PBI-0265: con 10 por página, 23 elementos dan tres páginas y la tercera muestra 21 a 23', () => {
  const pagina = paginar(numeros(23), 3, 10);
  assert.deepEqual([pagina.page, pagina.pages, pagina.from, pagina.to, pagina.total], [3, 3, 21, 23, 23]);
  assert.deepEqual(pagina.items, [21, 22, 23]);
});

test('PBI-0265: el rango dice «desde - hasta de total», como el SGC', () => {
  assert.equal(rangoDePagina(paginar(numeros(8), 1, 10)), '1 - 8 de 8');
  assert.equal(rangoDePagina(paginar(numeros(23), 2, 10)), '11 - 20 de 23');
  assert.equal(rangoDePagina(paginar(numeros(23), 3, 10)), '21 - 23 de 23');
  assert.equal(rangoDePagina(paginar(numeros(60), 2, 50)), '51 - 60 de 60');
  assert.equal(rangoDePagina(paginar([], 1, 10)), '0 de 0');
});

test('PBI-0265: la columna «N°» sigue la numeración entre páginas', () => {
  const primera = paginar(numeros(23), 1, 10);
  assert.equal(numeroDeFila(primera, 0), 1);
  assert.equal(numeroDeFila(primera, 9), 10);
  const segunda = paginar(numeros(23), 2, 10);
  assert.equal(numeroDeFila(segunda, 0), 11);
  assert.equal(numeroDeFila(segunda, 9), 20);
  assert.equal(numeroDeFila(paginar(numeros(23), 3, 25), 4), 5, 'la página pedida se ajusta a la última');
});

test('PBI-0265: el resumen cuenta cada estado en el orden pedido, también los que no tienen ninguno', () => {
  const productos = [{ active: true }, { active: false }, { active: true }, { active: true }];
  assert.deepEqual(
    contarPorClave(productos, (p) => (p.active ? 'activos' : 'inactivos'), ['activos', 'inactivos']),
    [
      { clave: 'activos', cantidad: 3 },
      { clave: 'inactivos', cantidad: 1 },
    ],
  );
  assert.deepEqual(
    contarPorClave([], () => 'x', ['activos', 'inactivos']),
    [
      { clave: 'activos', cantidad: 0 },
      { clave: 'inactivos', cantidad: 0 },
    ],
  );
  // Un estado que no está en la lista no se cuenta en ninguna ficha (el total lo sigue contando).
  assert.deepEqual(
    contarPorClave(['a', 'b', 'c'], (x) => x, ['a', 'b']),
    [
      { clave: 'a', cantidad: 1 },
      { clave: 'b', cantidad: 1 },
    ],
  );
});

test('PBI-0265: el texto de cada ficha va en singular o en plural, y el total dice «en total»', () => {
  assert.equal(textoDeCantidad(1, 'activo', 'activos'), '1 activo');
  assert.equal(textoDeCantidad(0, 'activo', 'activos'), '0 activos');
  assert.equal(textoDeCantidad(3, 'inactivo', 'inactivos'), '3 inactivos');
  assert.equal(textoDelTotal(8), '8 en total');
  assert.equal(textoDelTotal(0), '0 en total');
});
