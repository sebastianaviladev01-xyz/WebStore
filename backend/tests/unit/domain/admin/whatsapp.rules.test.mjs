/**
 * Acceso a WhatsApp de la tienda (lote 49, ADR-0035, PBI-0241; decidido por Sebastián Avila el 2026-11-27): el número,
 * en formato internacional con código de país, se escribe como los teléfonos de contacto (espacios, `+`, guiones o
 * paréntesis) y se guardan solo sus dígitos, de 8 a 15. Vacío, la tienda no muestra el botón. El mensaje inicial es
 * opcional, recortado y de hasta 200 caracteres. Al cargar un estado, lo que no se pueda usar queda vacío.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAXIMO_MENSAJE_DE_WHATSAPP,
  validarMensajeDeWhatsapp,
  validarNumeroDeWhatsapp,
  whatsappGuardado,
} from '../../../../src/domain/admin/whatsapp.rules.mjs';

test('PBI-0241: el número se guarda solo con sus dígitos, escrito como un teléfono de contacto', () => {
  assert.deepEqual(validarNumeroDeWhatsapp('51 987 654 321'), { valor: '51987654321' });
  assert.deepEqual(validarNumeroDeWhatsapp(' +51 (987) 654-321 '), { valor: '51987654321' });
  assert.deepEqual(validarNumeroDeWhatsapp('+1.415.555.0100'), { valor: '14155550100' });
  // De 8 a 15 dígitos, el largo de un número internacional.
  assert.deepEqual(validarNumeroDeWhatsapp('5068 1234'), { valor: '50681234' });
  assert.deepEqual(validarNumeroDeWhatsapp('123456789012345'), { valor: '123456789012345' });
});

test('PBI-0241: vacío, la tienda no tiene WhatsApp y el campo queda vacío', () => {
  assert.deepEqual(validarNumeroDeWhatsapp(''), { valor: '' });
  assert.deepEqual(validarNumeroDeWhatsapp('   '), { valor: '' });
});

test('PBI-0241: un número con letras, pocos o demasiados dígitos se rechaza con un ejemplo', () => {
  for (const malo of ['51 987 abc 321', '1234567', '1234567890123456', '51+987654321', '+', '----']) {
    const { error, valor } = validarNumeroDeWhatsapp(malo);
    assert.equal(valor, undefined, malo);
    assert.match(error, /número de WhatsApp/, malo);
    assert.match(error, /de 8 a 15 dígitos/, malo);
    assert.match(error, /51 987 654 321/, malo);
  }
});

test('PBI-0241: un celular peruano sin el 51 pide el código de país, porque wa.me no lo abriría', () => {
  const { error } = validarNumeroDeWhatsapp('987 654 321');
  assert.match(error, /código de país/);
  assert.match(error, /51 987 654 321/);
  // Con el código, vale; y otros números de 9 dígitos que no empiezan con 9 siguen valiendo.
  assert.deepEqual(validarNumeroDeWhatsapp('51987654321'), { valor: '51987654321' });
  assert.deepEqual(validarNumeroDeWhatsapp('598 912 345'), { valor: '598912345' });
});

test('PBI-0241: un número que no es texto se rechaza', () => {
  assert.match(validarNumeroDeWhatsapp(51987654321).error, /número de WhatsApp no es válido/);
  assert.match(validarNumeroDeWhatsapp(null).error, /número de WhatsApp no es válido/);
});

test('PBI-0241: el mensaje inicial es opcional, se recorta y admite hasta 200 caracteres', () => {
  assert.equal(MAXIMO_MENSAJE_DE_WHATSAPP, 200);
  assert.deepEqual(validarMensajeDeWhatsapp('  Hola, quiero comprar  '), { valor: 'Hola, quiero comprar' });
  assert.deepEqual(validarMensajeDeWhatsapp(''), { valor: '' });
  assert.deepEqual(validarMensajeDeWhatsapp('x'.repeat(200)), { valor: 'x'.repeat(200) });
  assert.deepEqual(validarMensajeDeWhatsapp(` ${'x'.repeat(200)} `), { valor: 'x'.repeat(200) });
  assert.match(validarMensajeDeWhatsapp('x'.repeat(201)).error, /hasta 200 caracteres/);
  assert.match(validarMensajeDeWhatsapp(42).error, /mensaje de WhatsApp no es válido/);
});

test('PBI-0241: al cargar un estado, sin los campos o con valores que no sirven, quedan vacíos', () => {
  assert.deepEqual(whatsappGuardado({}), { whatsappNumber: '', whatsappMessage: '' });
  assert.deepEqual(whatsappGuardado({ whatsappNumber: 'abc', whatsappMessage: 7 }), {
    whatsappNumber: '',
    whatsappMessage: '',
  });
  // Uno guardado a mano con espacios pasa a sus dígitos; un mensaje largo se corta a 200.
  assert.deepEqual(
    whatsappGuardado({ whatsappNumber: '+51 987 654 321', whatsappMessage: 'y'.repeat(250) }),
    {
      whatsappNumber: '51987654321',
      whatsappMessage: 'y'.repeat(200),
    },
  );
});
