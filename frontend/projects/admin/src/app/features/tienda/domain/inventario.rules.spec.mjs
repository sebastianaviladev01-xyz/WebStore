import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017), PBI-0127: el campo de stock de Inventario solo guarda un entero mayor o igual a 0; vacío o
// con decimales no se guarda y dice qué escribir.
const source = await readFile(new URL('./inventario.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { leerStock } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const MENSAJE = 'Usa un número entero desde 0. No se guardó.';

test('PBI-0127: un entero mayor o igual a 0 se lee como número', () => {
  assert.deepEqual(leerStock('12'), { valido: true, stock: 12 });
  assert.deepEqual(leerStock(' 0 '), { valido: true, stock: 0 });
});

test('PBI-0127: vacío, decimales, negativos o texto no se guardan', () => {
  for (const texto of ['', '   ', '2.5', '2,5', '-1', 'abc', '1e3']) {
    assert.deepEqual(leerStock(texto), { valido: false, mensaje: MENSAJE }, JSON.stringify(texto));
  }
});

// Lote 08 (ADR-0017), PBI-0079: el umbral de stock bajo está en un solo lugar. El Dashboard («Stock bajo») y Inventario
// (el estado de cada producto) no pueden discrepar: antes, uno comparaba con 5 y el otro con su propia copia.
const { conPocoStock, estadoDeStock, STOCK_BAJO, NOTA_STOCK_BAJO } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0079: con poco stock es el agotado y el que llega al umbral, y el Dashboard y Inventario coinciden', () => {
  assert.equal(conPocoStock(0), true, 'agotado');
  assert.equal(conPocoStock(STOCK_BAJO), true, 'justo en el umbral');
  assert.equal(conPocoStock(STOCK_BAJO + 1), false, 'un producto por encima del umbral');
  for (let stock = 0; stock <= STOCK_BAJO + 10; stock++) {
    assert.equal(conPocoStock(stock), estadoDeStock(stock) !== 'disponible', `stock ${stock}`);
  }
});

test('PBI-0079: el texto del Dashboard dice el umbral que se usa', () => {
  assert.equal(STOCK_BAJO, 5);
  assert.equal(NOTA_STOCK_BAJO, 'Productos con 5 unidades o menos');
});

// Lote 23 (ADR-0025, PBI-0226; confirmado por Sebastián Avila): el stock sale del registro del producto y se
// gestiona solo en Inventario. Guardar la ficha no cambia el stock: conserva el del producto, y uno nuevo empieza sin
// stock. Así, si Inventario (o una venta) lo cambió mientras la ficha estaba abierta, el guardado no lo pisa ni choca.
const { productoDeLaFicha } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);
const fuenteCambio = await readFile(new URL('./cambio-registro.rules.ts', import.meta.url), 'utf8');
const { prepararCambio } = await import(
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(fuenteCambio.replace(/^import [\s\S]*?;$/gm, ''), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  ).toString('base64')}`
);

const ficha = { id: 'p-001', name: 'OLED Vision', price: 3999, active: true };

test('PBI-0226: un producto nuevo empieza sin stock', () => {
  assert.deepEqual(productoDeLaFicha(null, ficha), { ...ficha, stock: 0 });
});

test('PBI-0226: la ficha de un producto conserva su stock, aunque cambie otro campo', () => {
  const base = { ...ficha, stock: 9 };
  assert.deepEqual(productoDeLaFicha(base, { ...ficha, price: 3799 }), { ...ficha, price: 3799, stock: 9 });
});

test('PBI-0226: guardar la ficha no envía el stock ni choca si Inventario lo cambió mientras tanto', () => {
  const base = { ...ficha, stock: 9 };
  const vigente = { ...ficha, stock: 2 }; // Inventario o una venta lo cambiaron con la ficha abierta
  const editado = productoDeLaFicha(base, { ...ficha, price: 3799 });
  assert.deepEqual(prepararCambio(vigente, base, editado), {
    tipo: 'listo',
    cambio: { id: 'p-001', price: 3799 },
  });
});
