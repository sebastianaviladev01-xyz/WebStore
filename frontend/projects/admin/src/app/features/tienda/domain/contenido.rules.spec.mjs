import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 15 (ADR-0021): Contenido edita listas de correos, teléfonos y redes (PBI-0169), avisos de la barra superior
// (PBI-0175) y accesos inferiores del pie (PBI-0185). El formulario avisa antes de enviar con las mismas reglas que el
// BFF (`backend/src/domain/admin/contenido.rules.mjs`), que es quien decide. Cada regla devuelve qué hacer o `null`.
const fuente = await readFile(new URL('./contenido.rules.ts', import.meta.url), 'utf8');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  motivoDeCorreo,
  motivoDeTelefono,
  motivoDeRed,
  motivoDeEnlaceDeAviso,
  motivoDeDestino,
  motivoDeGrupos,
  MAXIMOS_DE_CONTENIDO,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

test('PBI-0169: un correo válido no tiene motivo; uno vacío o mal escrito, sí', () => {
  assert.equal(motivoDeCorreo('ventas@tienda.pe'), null);
  assert.equal(motivoDeCorreo(' ventas@tienda.pe '), null);
  assert.equal(motivoDeCorreo(''), 'Escribe el correo o quita esta fila.');
  assert.equal(motivoDeCorreo('ventas@'), 'Escribe un correo válido, como nombre@dominio.pe.');
});

test('PBI-0169: un teléfono lleva de 6 a 15 dígitos, con espacios, +, guiones o paréntesis', () => {
  for (const valor of ['+51 999 000 000', '(01) 555-0000', '999000'])
    assert.equal(motivoDeTelefono(valor), null, valor);
  assert.equal(motivoDeTelefono(''), 'Escribe el teléfono o quita esta fila.');
  for (const valor of ['12345', 'llámanos', '9'.repeat(16), '+'])
    assert.equal(
      motivoDeTelefono(valor),
      'Usa de 6 a 15 dígitos; se admiten espacios, +, guiones y paréntesis.',
      valor,
    );
});

test('PBI-0169: una red necesita una dirección https://', () => {
  assert.equal(motivoDeRed('https://www.instagram.com/tienda'), null);
  assert.equal(motivoDeRed(''), 'Escribe la dirección de la red o quita esta fila.');
  for (const url of ['http://x.com/t', 'www.x.com', '/catalogo', 'https://'])
    assert.equal(motivoDeRed(url), 'Usa una dirección que empiece con https://.', url);
});

test('PBI-0175: el enlace de un aviso es opcional: vacío, una ruta de la tienda o https://', () => {
  for (const url of ['', '  ', '/catalogo', '/catalogo?categoria=cat-tv', 'https://www.tienda.pe/ofertas'])
    assert.equal(motivoDeEnlaceDeAviso(url), null, url);
  for (const url of ['catalogo', '//otra.com', 'http://x.com', 'javascript:alert(1)', '/con espacio'])
    assert.equal(
      motivoDeEnlaceDeAviso(url),
      'Usa una ruta de la tienda (/catalogo) o una dirección https://, o déjalo vacío.',
      url,
    );
});

test('PBI-0185: el destino de un acceso inferior es obligatorio: una ruta de la tienda o https://', () => {
  assert.equal(motivoDeDestino('/info/envios'), null);
  assert.equal(motivoDeDestino('https://blog.tienda.pe'), null);
  assert.equal(motivoDeDestino(''), 'Escribe el destino: una ruta de la tienda (/info/envios) o https://.');
  assert.equal(
    motivoDeDestino('envios'),
    'Escribe el destino: una ruta de la tienda (/info/envios) o https://.',
  );
});

test('PBI-0185: el pie admite hasta tres grupos, además de Productos', () => {
  assert.equal(motivoDeGrupos(['Mi cuenta', 'Información', 'Ayuda', 'Ayuda', ' Ayuda ']), null);
  assert.equal(
    motivoDeGrupos(['A', 'B', 'C', 'D']),
    'El pie admite hasta tres grupos de accesos, además de Productos. Ahora hay 4: A, B, C y D.',
  );
});

test('los máximos de cada lista son los del BFF', () => {
  assert.deepEqual(MAXIMOS_DE_CONTENIDO, {
    contactEmails: 5,
    contactPhones: 5,
    socialLinks: 8,
    announcements: 5,
    quickLinks: 24,
    etiqueta: 30,
    textoDeAviso: 140,
    textoDeAcceso: 40,
  });
});
