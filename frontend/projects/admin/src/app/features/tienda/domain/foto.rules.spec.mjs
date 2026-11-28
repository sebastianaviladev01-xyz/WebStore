import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017), PBI-0119: el Admin reduce cada foto antes de guardarla (lado mayor acotado) y prueba
// calidades de mayor a menor hasta que cabe; si ni con la menor cabe, la rechaza.
const source = await readFile(new URL('./foto.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { medidasReducidas, primeraQueCabe, LADO_MAXIMO_FOTO, BYTES_MAXIMOS_FOTO, CALIDADES_FOTO } =
  await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

test('PBI-0119: el lado mayor se reduce al máximo conservando la proporción; una foto chica no se agranda', () => {
  assert.equal(LADO_MAXIMO_FOTO, 1600);
  assert.deepEqual(medidasReducidas(4000, 3000), { ancho: 1600, alto: 1200 });
  assert.deepEqual(medidasReducidas(1000, 3000), { ancho: 533, alto: 1600 });
  assert.deepEqual(medidasReducidas(800, 600), { ancho: 800, alto: 600 });
});

test('PBI-0119: se usa la primera calidad cuya foto cabe, y ninguna si ni la última cabe', () => {
  assert.equal(BYTES_MAXIMOS_FOTO, 250 * 1024);
  assert.deepEqual([...CALIDADES_FOTO], [0.85, 0.75, 0.6, 0.45]);
  const dataUrl = (bytes) => `data:image/jpeg;base64,${'A'.repeat(bytes)}`;
  assert.equal(primeraQueCabe([dataUrl(300_000), dataUrl(200_000), dataUrl(100_000)]), dataUrl(200_000));
  assert.equal(primeraQueCabe([dataUrl(300_000), dataUrl(260_000)]), null);
});

// Lote 07b (ADR-0017), PBI-0052: la imagen de la categoría se reduce más (es pequeña) y cabe en lo que acepta el BFF.
// Lote 11 (ADR-0021), PBI-0176: una sola versión de 100 × 100 px, el lado que exige el BFF.
test('PBI-0052 y PBI-0176: la imagen de la categoría mide 100 × 100 px y cabe en el máximo del BFF', async () => {
  const { LADO_IMAGEN_CATEGORIA, MAX_CARACTERES_IMAGEN_CATEGORIA } = await import(
    `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
  );
  const { MAX_IMAGEN_DE_CATEGORIA } =
    await import('../../../../../../../../backend/src/domain/admin/colecciones.rules.mjs');
  const { LADO_IMAGEN_DE_CATEGORIA } =
    await import('../../../../../../../../backend/src/domain/catalogo/imagen.rules.mjs');
  assert.equal(LADO_IMAGEN_CATEGORIA, 100);
  assert.equal(LADO_IMAGEN_CATEGORIA, LADO_IMAGEN_DE_CATEGORIA);
  assert.equal(MAX_CARACTERES_IMAGEN_CATEGORIA, MAX_IMAGEN_DE_CATEGORIA);
  const dataUrl = (n) => `data:image/webp;base64,${'A'.repeat(n)}`;
  assert.equal(
    primeraQueCabe([dataUrl(120_000), dataUrl(90_000)], MAX_CARACTERES_IMAGEN_CATEGORIA),
    dataUrl(90_000),
  );
  assert.equal(primeraQueCabe([dataUrl(120_000)], MAX_CARACTERES_IMAGEN_CATEGORIA), null);
});

// Lote 11 (ADR-0021), PBI-0176: el Admin acepta la foto original de menos de 1 MB, PNG, JPG o WebP (Daniel: «una foto de
// menos de 1 MB»), y la encaja entera, centrada y sin agrandarla, en el cuadrado de 100 × 100 px.
test('PBI-0176: la foto de la categoría es PNG, JPG o WebP de menos de 1 MB; si no, se dice por qué', async () => {
  const { LIMITE_ARCHIVO_CATEGORIA, motivoParaNoUsarFotoDeCategoria } = await import(
    `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
  );
  assert.equal(LIMITE_ARCHIVO_CATEGORIA, 1024 * 1024);
  for (const type of ['image/png', 'image/jpeg', 'image/webp'])
    assert.equal(motivoParaNoUsarFotoDeCategoria({ type, size: 1024 * 1024 - 1 }), null, type);
  for (const type of ['image/svg+xml', 'image/gif', 'application/pdf', ''])
    assert.equal(motivoParaNoUsarFotoDeCategoria({ type, size: 10 }), 'Usa una foto PNG, JPG o WebP.', type);
  assert.equal(
    motivoParaNoUsarFotoDeCategoria({ type: 'image/jpeg', size: 1024 * 1024 }),
    'La foto pesa 1 MB o más. Usa una de menos de 1 MB.',
  );
});

test('PBI-0176: la foto se encaja entera y centrada en el cuadrado, sin agrandarla', async () => {
  const { encajeEnCuadrado } = await import(
    `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
  );
  assert.deepEqual(encajeEnCuadrado(400, 400, 100), { x: 0, y: 0, ancho: 100, alto: 100 });
  assert.deepEqual(encajeEnCuadrado(800, 400, 100), { x: 0, y: 25, ancho: 100, alto: 50 });
  assert.deepEqual(encajeEnCuadrado(300, 600, 100), { x: 25, y: 0, ancho: 50, alto: 100 });
  assert.deepEqual(encajeEnCuadrado(40, 20, 100), { x: 30, y: 40, ancho: 40, alto: 20 });
});

// Lote 08 (ADR-0017), PBI-0134: el límite de la galería es una regla de dominio, no una constante de la página.
test('PBI-0134: la galería admite seis fotos adicionales y avisa al llegar al máximo', async () => {
  const { MAXIMO_FOTOS_DE_GALERIA, hayLugarEnLaGaleria, mensajeDeGaleriaLlena } = await import(
    `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
  );
  assert.equal(MAXIMO_FOTOS_DE_GALERIA, 6);
  assert.equal(hayLugarEnLaGaleria(0), true);
  assert.equal(hayLugarEnLaGaleria(5), true, 'con cinco entra la sexta');
  assert.equal(hayLugarEnLaGaleria(6), false, 'con seis ya no entra otra');
  assert.equal(mensajeDeGaleriaLlena(), 'Máximo 6 fotos adicionales.');
});

test('PBI-0119: la galería llena y la foto principal, con el resto del producto, caben en un guardado de 2 MB', async () => {
  const { MAXIMO_FOTOS_DE_GALERIA } = await import(
    `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
  );
  assert.ok((MAXIMO_FOTOS_DE_GALERIA + 1) * BYTES_MAXIMOS_FOTO < 2 * 1024 * 1024 - 64 * 1024);
});

// Lote 24 (ADR-0025 y ADR-0026, PBI-0214; confirmado por Sebastián Avila): la imagen principal y la miniatura del
// producto y las imágenes del banner se cargan como archivo. El Admin genera cada versión con los mismos lados y pesos
// máximos que valida el BFF.
test('PBI-0214: cada versión tiene el lado y el peso máximos que acepta el BFF', async () => {
  const foto = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
  const bff = await import('../../../../../../../../backend/src/domain/catalogo/imagen.rules.mjs');
  assert.equal(foto.LADO_MAXIMO_FOTO, bff.LADO_IMAGEN_DE_PRODUCTO);
  assert.equal(foto.BYTES_MAXIMOS_FOTO, bff.MAX_IMAGEN_DE_PRODUCTO);
  assert.equal(foto.LADO_MINIATURA, 480);
  assert.equal(foto.LADO_MINIATURA, bff.LADO_MINIATURA_DE_PRODUCTO);
  assert.equal(foto.MAX_CARACTERES_MINIATURA, bff.MAX_MINIATURA_DE_PRODUCTO);
  assert.equal(foto.LADO_IMAGEN_BANNER, bff.LADO_IMAGEN_DE_BANNER);
  assert.equal(foto.MAX_CARACTERES_IMAGEN_BANNER, bff.MAX_IMAGEN_DE_BANNER);
  assert.equal(foto.LADO_IMAGEN_MOVIL_BANNER, bff.LADO_IMAGEN_MOVIL_DE_BANNER);
  assert.equal(foto.MAX_CARACTERES_IMAGEN_MOVIL_BANNER, bff.MAX_IMAGEN_MOVIL_DE_BANNER);
});

test('PBI-0214: la miniatura es la reducción de la imagen principal, sin agrandarla', async () => {
  const { medidasDeMiniatura } = await import(
    `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
  );
  assert.deepEqual(medidasDeMiniatura(1600, 1200), { ancho: 480, alto: 360 });
  assert.deepEqual(medidasDeMiniatura(1448, 1086), { ancho: 480, alto: 360 });
  assert.deepEqual(medidasDeMiniatura(300, 200), { ancho: 300, alto: 200 });
});

test('PBI-0214: la foto es PNG, JPG o WebP de hasta 15 MB, como la de la galería; si no, se dice por qué', async () => {
  const { LIMITE_ARCHIVO_FOTO, motivoParaNoUsarFoto } = await import(
    `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
  );
  assert.equal(LIMITE_ARCHIVO_FOTO, 15 * 1024 * 1024);
  for (const type of ['image/png', 'image/jpeg', 'image/webp'])
    assert.equal(motivoParaNoUsarFoto({ type, size: LIMITE_ARCHIVO_FOTO }), null, type);
  for (const type of ['image/svg+xml', 'image/gif', 'application/pdf', ''])
    assert.equal(motivoParaNoUsarFoto({ type, size: 10 }), 'Usa una foto PNG, JPG o WebP.', type);
  assert.equal(
    motivoParaNoUsarFoto({ type: 'image/jpeg', size: LIMITE_ARCHIVO_FOTO + 1 }),
    'La foto pesa más de 15 MB. Usa una más liviana.',
  );
});

test('PBI-0214: el producto con la galería llena y la miniatura, y el banner con sus dos imágenes, caben en un guardado', async () => {
  const foto = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
  const limite = 2 * 1024 * 1024 - 64 * 1024;
  assert.ok(
    (foto.MAXIMO_FOTOS_DE_GALERIA + 1) * foto.BYTES_MAXIMOS_FOTO + foto.MAX_CARACTERES_MINIATURA < limite,
  );
  assert.ok(foto.MAX_CARACTERES_IMAGEN_BANNER + foto.MAX_CARACTERES_IMAGEN_MOVIL_BANNER < limite);
});

// Lote 50 (ADR-0037, PBI-0289; decisión de Sebastián Avila del 2026-11-27): el logo se carga como las demás imágenes. Es
// un PNG, un JPG o un WebP de hasta 15 MB que el Admin reduce como la imagen principal, con los límites que valida el BFF
// (ya no un SVG, que la tienda no puede recibir por dirección). El campo de la URL se queda para escribir otra.
test('PBI-0289: el logo es PNG, JPG o WebP de hasta 15 MB, con los límites del BFF; si no, se dice por qué', async () => {
  const foto = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
  const bff = await import('../../../../../../../../backend/src/domain/catalogo/imagen.rules.mjs');
  assert.equal(foto.LADO_MAXIMO_FOTO, bff.LADO_LOGO);
  assert.equal(foto.BYTES_MAXIMOS_FOTO, bff.MAX_LOGO);
  const { LIMITE_ARCHIVO_FOTO, motivoParaNoUsarLogo } = foto;
  for (const type of ['image/png', 'image/jpeg', 'image/webp'])
    assert.equal(motivoParaNoUsarLogo({ type, size: LIMITE_ARCHIVO_FOTO }), null, type);
  for (const type of ['image/svg+xml', 'image/gif', 'application/pdf', ''])
    assert.equal(
      motivoParaNoUsarLogo({ type, size: 10 }),
      'Usa un logo PNG, JPG o WebP, o escribe su dirección en «URL/Data URL del logo».',
      type,
    );
  assert.equal(
    motivoParaNoUsarLogo({ type: 'image/png', size: LIMITE_ARCHIVO_FOTO + 1 }),
    'El logo pesa más de 15 MB. Usa uno más liviano.',
  );
});
