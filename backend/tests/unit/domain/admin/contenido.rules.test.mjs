/**
 * Listas de Contenido (lote 15, ADR-0021): correos, teléfonos y redes de la tienda (PBI-0169), avisos de la barra
 * superior (PBI-0175) y accesos inferiores del pie (PBI-0185). Cada lista se valida y se normaliza antes de guardarla,
 * y los campos de antes (`contactEmail`, `contactPhone`, `headerMessage`, `topNavigation` y el texto `quickLinks`)
 * se migran a ellas sin perder lo que la tienda mostraba.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCESOS_DEL_PIE,
  LISTAS_DE_CONTENIDO,
  listasDesdeContenidoAnterior,
  validarListaDeContenido,
} from '../../../../src/domain/admin/contenido.rules.mjs';

const valida = (clave, valor) => {
  const resultado = validarListaDeContenido(clave, valor);
  assert.equal(resultado.error, undefined, `${clave}: ${resultado.error}`);
  return resultado.valor;
};
const error = (clave, valor) => {
  const resultado = validarListaDeContenido(clave, valor);
  assert.ok(resultado.error, `${clave} debía rechazar ${JSON.stringify(valor)}`);
  return resultado.error;
};

test('las listas de Contenido son correos, teléfonos, redes, avisos y accesos inferiores', () => {
  assert.deepEqual(
    [...LISTAS_DE_CONTENIDO].sort(),
    ['announcements', 'contactEmails', 'contactPhones', 'quickLinks', 'socialLinks'].sort(),
  );
});

// --- PBI-0169: correos, teléfonos y redes ---

test('PBI-0169: varios correos con etiqueta opcional; recorta y descarta campos desconocidos', () => {
  assert.deepEqual(
    valida('contactEmails', [
      { value: ' Ventas@Tienda.pe ', label: ' Ventas ', extra: 1 },
      { value: 'soporte@tienda.pe' },
    ]),
    [
      { value: 'Ventas@Tienda.pe', label: 'Ventas' },
      { value: 'soporte@tienda.pe', label: '' },
    ],
  );
  assert.deepEqual(valida('contactEmails', []), []);
});

test('PBI-0169: un correo no válido, repetido o con etiqueta larga se rechaza con su motivo', () => {
  assert.match(error('contactEmails', [{ value: 'no-es-correo' }]), /correo «no-es-correo» no es válido/);
  assert.match(error('contactEmails', [{ value: 'a@b.pe' }, { value: 'A@B.pe ' }]), /repetido/);
  assert.match(error('contactEmails', [{ value: 'a@b.pe', label: 'x'.repeat(31) }]), /30 caracteres/);
  assert.match(error('contactEmails', 'a@b.pe'), /lista/);
  assert.match(error('contactEmails', [null]), /no es válido/);
  assert.match(
    error(
      'contactEmails',
      Array.from({ length: 6 }, (_, i) => ({ value: `c${i}@b.pe` })),
    ),
    /hasta 5/,
  );
});

test('PBI-0169: varios teléfonos con dígitos, espacios, +, guiones y paréntesis', () => {
  assert.deepEqual(
    valida('contactPhones', [{ value: ' +51 999 000 000 ' }, { value: '(01) 555-0000', label: 'Soporte' }]),
    [
      { value: '+51 999 000 000', label: '' },
      { value: '(01) 555-0000', label: 'Soporte' },
    ],
  );
  for (const valor of ['abc', '12345', '+51 999 000 000 ext. 2', '9'.repeat(16), '+'])
    assert.match(error('contactPhones', [{ value: valor }]), /teléfono/, valor);
  assert.match(error('contactPhones', [{ value: '999 000 000' }, { value: '999000000' }]), /repetido/);
});

test('PBI-0169: las redes llevan nombre y una dirección https://', () => {
  assert.deepEqual(
    valida('socialLinks', [{ label: ' Instagram ', url: ' https://www.instagram.com/tienda ' }]),
    [{ label: 'Instagram', url: 'https://www.instagram.com/tienda' }],
  );
  assert.match(error('socialLinks', [{ label: '', url: 'https://x.com/t' }]), /nombre/);
  for (const url of ['http://x.com/t', 'javascript:alert(1)', 'www.x.com', '/catalogo', 'https://', ''])
    assert.match(error('socialLinks', [{ label: 'X', url }]), /https:\/\//, url);
});

// --- PBI-0175: avisos de la barra superior ---

test('PBI-0175: cada aviso lleva su texto y un enlace opcional (ruta de la tienda o https://)', () => {
  assert.deepEqual(
    valida('announcements', [
      { text: ' Mantenimiento el domingo ', url: '' },
      { text: 'Ofertas de verano', url: '/catalogo?categoria=cat-tv' },
      { text: 'Síguenos', url: 'https://www.instagram.com/tienda' },
      { text: 'Sin enlace' },
    ]),
    [
      { text: 'Mantenimiento el domingo', url: '' },
      { text: 'Ofertas de verano', url: '/catalogo?categoria=cat-tv' },
      { text: 'Síguenos', url: 'https://www.instagram.com/tienda' },
      { text: 'Sin enlace', url: '' },
    ],
  );
});

test('PBI-0175: un aviso sin texto, demasiado largo o con un enlace que no es de la tienda ni https:// se rechaza', () => {
  assert.match(error('announcements', [{ text: '  ', url: '' }]), /texto/);
  assert.match(error('announcements', [{ text: 'x'.repeat(141) }]), /140 caracteres/);
  for (const url of ['//otro.com', 'javascript:alert(1)', 'http://x.com', 'catalogo', '/con espacio'])
    assert.match(error('announcements', [{ text: 'Aviso', url }]), /enlace/, url);
});

// --- PBI-0185: accesos inferiores del pie ---

test('PBI-0185: cada acceso del pie lleva su grupo, su texto y su destino', () => {
  assert.deepEqual(valida('quickLinks', [{ group: ' Ayuda ', label: ' Contacto ', url: '/info/contacto' }]), [
    { group: 'Ayuda', label: 'Contacto', url: '/info/contacto' },
  ]);
  assert.match(error('quickLinks', [{ group: '', label: 'Contacto', url: '/info/contacto' }]), /grupo/);
  assert.match(error('quickLinks', [{ group: 'Ayuda', label: '', url: '/info/contacto' }]), /texto/);
  assert.match(error('quickLinks', [{ group: 'Ayuda', label: 'Contacto', url: 'contacto' }]), /destino/);
});

test('PBI-0185: el pie admite hasta tres grupos, además de Productos', () => {
  const acceso = (group) => ({ group, label: 'Enlace', url: '/' });
  valida('quickLinks', ['A', 'B', 'C', 'A'].map(acceso));
  assert.match(error('quickLinks', ['A', 'B', 'C', 'D'].map(acceso)), /tres grupos/);
});

test('PBI-0185: los accesos de la semilla son el pie de antes del lote, validos', () => {
  assert.deepEqual(valida('quickLinks', ACCESOS_DEL_PIE), ACCESOS_DEL_PIE);
  assert.deepEqual(
    [...new Set(ACCESOS_DEL_PIE.map((acceso) => acceso.group))],
    ['Mi cuenta', 'Información', 'Ayuda'],
  );
  assert.deepEqual(
    ACCESOS_DEL_PIE.map((acceso) => acceso.label),
    [
      'Ingresar',
      'Mi perfil',
      'Mis pedidos',
      'Recuperar acceso',
      'Envíos',
      'Privacidad',
      'Términos',
      'Contacto',
      'Libro de reclamaciones',
      'Carrito',
    ],
  );
});

// --- Migración desde los campos de antes ---

const ANTERIOR = {
  storeName: 'Mi tienda',
  contactEmail: 'contacto@mitienda.pe',
  contactPhone: '+51 999 111 222',
  headerMessage: 'Despachos en Lima. Consulta cobertura y tarifas.',
  topNavigation: 'Inicio, Productos, Pedidos, Envíos',
  quickLinks: 'Contacto, Envíos, Privacidad, Términos, Libro de reclamaciones',
};

test('migración: el correo y el teléfono de antes pasan a ser el primero de cada lista', () => {
  const listas = listasDesdeContenidoAnterior(ANTERIOR);
  assert.deepEqual(listas.contactEmails, [{ value: 'contacto@mitienda.pe', label: '' }]);
  assert.deepEqual(listas.contactPhones, [{ value: '+51 999 111 222', label: '' }]);
  assert.deepEqual(listas.socialLinks, []);
});

test('migración: sin correo ni teléfono, las listas quedan vacías (nunca los de la demo)', () => {
  const listas = listasDesdeContenidoAnterior({ contactEmail: '  ', storeName: 'X' });
  assert.deepEqual(listas.contactEmails, []);
  assert.deepEqual(listas.contactPhones, []);
});

test('migración: el mensaje superior es el primer aviso; los textos de la navegación, avisos con su enlace deducido', () => {
  // Inicio, Productos y Pedidos no se mostraban (los ofrece la cabecera), y Envíos queda fijo en la cabecera.
  assert.deepEqual(listasDesdeContenidoAnterior(ANTERIOR).announcements, [
    { text: 'Despachos en Lima. Consulta cobertura y tarifas.', url: '' },
  ]);
  assert.deepEqual(
    listasDesdeContenidoAnterior({
      headerMessage: '',
      topNavigation: 'Ofertas, Ayuda, Términos y condiciones, Despachos a provincia',
    }).announcements,
    [
      { text: 'Ofertas', url: '' },
      { text: 'Ayuda', url: '/info/contacto' },
      { text: 'Términos y condiciones', url: '/info/terminos' },
      { text: 'Despachos a provincia', url: '' },
    ],
  );
});

test('migración: sin mensaje superior ni navegación, no hay avisos', () => {
  assert.deepEqual(listasDesdeContenidoAnterior({}).announcements, []);
});

test('migración: los accesos de texto, que la tienda no usaba, pasan a ser el pie que se veía', () => {
  assert.deepEqual(listasDesdeContenidoAnterior(ANTERIOR).quickLinks, ACCESOS_DEL_PIE);
});

test('migración: un dato de antes que no cumple las reglas nuevas se conserva tal cual (no se pierde)', () => {
  // Se valida cuando el Admin vuelva a guardar esa lista; hasta entonces la tienda lo muestra como antes.
  const listas = listasDesdeContenidoAnterior({
    contactEmail: ' no-es-correo ',
    contactPhone: 'llámanos',
    headerMessage: 'x'.repeat(200),
  });
  assert.deepEqual(listas.contactEmails, [{ value: 'no-es-correo', label: '' }]);
  assert.deepEqual(listas.contactPhones, [{ value: 'llámanos', label: '' }]);
  assert.equal(listas.announcements[0].text.length, 200);
});
