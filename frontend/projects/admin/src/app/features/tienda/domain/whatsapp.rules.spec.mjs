import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 49 (ADR-0035, PBI-0241; decidido por Sebastián Avila el 2026-11-27): la sección «WhatsApp» de Contenido avisa
// antes de enviar con las mismas reglas que el BFF (`backend/src/domain/admin/whatsapp.rules.mjs`), que es quien decide,
// y arma el enlace «Probar» solo si el número es válido.
const fuente = await readFile(new URL('./whatsapp.rules.ts', import.meta.url), 'utf8');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  MAXIMO_MENSAJE_DE_WHATSAPP,
  motivoDeNumeroDeWhatsapp,
  motivoDeMensajeDeWhatsapp,
  enlaceDePruebaDeWhatsapp,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

test('PBI-0241: el número es opcional; con él, de 8 a 15 dígitos escritos como un teléfono', () => {
  for (const valido of ['', '   ', '51 987 654 321', '+51 (987) 654-321', '51987654321', '5068 1234'])
    assert.equal(motivoDeNumeroDeWhatsapp(valido), null, valido);
  for (const malo of ['51 987 abc 321', '1234567', '1234567890123456', '51+987654321']) {
    const motivo = motivoDeNumeroDeWhatsapp(malo);
    assert.match(motivo, /de 8 a 15 dígitos/, malo);
    assert.match(motivo, /51 987 654 321/, malo);
  }
});

test('PBI-0241: un celular peruano sin el 51 pide el código de país, como el BFF', () => {
  assert.match(motivoDeNumeroDeWhatsapp('987 654 321'), /código de país/);
});

test('PBI-0241: el mensaje es opcional y admite hasta 200 caracteres, como el BFF', () => {
  assert.equal(MAXIMO_MENSAJE_DE_WHATSAPP, 200);
  assert.equal(motivoDeMensajeDeWhatsapp(''), null);
  assert.equal(motivoDeMensajeDeWhatsapp(` ${'x'.repeat(200)} `), null);
  assert.match(motivoDeMensajeDeWhatsapp('x'.repeat(201)), /200 caracteres/);
});

test('PBI-0241: «Probar» abre wa.me con los dígitos y el mensaje, solo si el número es válido', () => {
  assert.equal(enlaceDePruebaDeWhatsapp('+51 987 654 321', ''), 'https://wa.me/51987654321');
  assert.equal(
    enlaceDePruebaDeWhatsapp('51987654321', ' Hola, ¿tienen stock? '),
    'https://wa.me/51987654321?text=Hola%2C%20%C2%BFtienen%20stock%3F',
  );
  for (const numero of ['', '987654321', 'abc', '1234567'])
    assert.equal(enlaceDePruebaDeWhatsapp(numero, 'Hola'), null, numero);
});
