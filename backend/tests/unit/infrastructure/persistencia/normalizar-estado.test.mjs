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

test('la versión del esquema es 5 (lote 22: productos destacados configurables)', () => {
  assert.equal(SCHEMA_VERSION, 5);
  assert.equal(normalizeState(estadoV2(), demoPasswords).schemaVersion, 5);
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

// --- Lote 03 (PBI-0068): un tema propio inválido no deja al BFF sin apariencia ---

const temaGuardado = (id, name, colors = { primary: '#123456', secondary: '#654321', ...BASE_DE_B }) => ({
  id,
  name,
  colors,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

/** Estado v3 con estos temas propios y este activo; devuelve el estado normalizado y los avisos. */
function cargarConTemas(customThemes, activeThemeId = 'b') {
  const v3 = normalizeState(estadoV2(), demoPasswords);
  v3.appearance = { revision: 5, activeThemeId, customThemes };
  const avisos = [];
  const next = normalizeState(v3, demoPasswords, (aviso) => avisos.push(aviso));
  return { next, avisos };
}

test('PBI-0068: un tema propio con un color que no es #RRGGBB se descarta al cargar y, si era el activo, queda B', () => {
  const roto = temaGuardado('t-roto', 'Roto', {
    ...temaGuardado('x', 'x').colors,
    primary: 'red;}body{display:none',
  });
  const bueno = temaGuardado('t-bueno', 'Bueno');
  const { next, avisos } = cargarConTemas([roto, bueno], 't-roto');
  assert.deepEqual(next.appearance.customThemes, [bueno]);
  assert.equal(next.appearance.activeThemeId, 'b');
  assert.equal(next.appearance.revision, 5);
  assert.equal(avisos.length, 2, avisos.join('\n'));
  assert.match(avisos[0], /t-roto/);
  assert.match(avisos[0], /INVALID_THEME_COLOR/);
  assert.match(
    avisos[0],
    /red;\}body\{display:none/,
    'el aviso guarda el tema descartado para poder recuperarlo',
  );
  assert.match(avisos[1], /t-roto.*b/);
});

test('PBI-0068: se descartan los temas que no son objetos, sin id de texto, con un id repetido o de un predefinido', () => {
  const bueno = temaGuardado('t-1', 'Bueno');
  const { next, avisos } = cargarConTemas([
    null,
    'texto',
    { ...temaGuardado('', 'Sin id') },
    { ...temaGuardado('t-x', 'Id numérico'), id: 7 },
    bueno,
    temaGuardado('t-1', 'Repite id'),
    temaGuardado('a', 'Pisa A'),
  ]);
  assert.deepEqual(next.appearance.customThemes, [bueno]);
  assert.equal(avisos.length, 6);
});

test('PBI-0068: se descartan los temas con un nombre inválido o con un contraste que impide guardarlos', () => {
  const { next, avisos } = cargarConTemas([
    temaGuardado('t-1', ''),
    temaGuardado('t-2', 'x'.repeat(41)),
    temaGuardado('t-3', 'Gris', {
      primary: '#1D4ED8',
      secondary: '#C2410C',
      ...BASE_DE_B,
      contrast: '#9CA3AF',
    }),
    { id: 't-4', name: 'Sin colores' },
  ]);
  assert.deepEqual(next.appearance.customThemes, []);
  assert.deepEqual(
    avisos.map((aviso) => /\b([A-Z_]{6,})\b/.exec(aviso)?.[1]),
    ['INVALID_THEME_NAME', 'INVALID_THEME_NAME', 'INSUFFICIENT_THEME_CONTRAST', 'INVALID_THEME_COLOR'],
  );
});

test('PBI-0068: un nombre repetido (también con un predefinido) se renombra con «(2)», «(3)»… y conserva el tema', () => {
  const { next, avisos } = cargarConTemas(
    [temaGuardado('t-1', 'Mi tema'), temaGuardado('t-2', 'mi TEMA'), temaGuardado('t-3', 'Azul cobalto')],
    't-2',
  );
  assert.deepEqual(
    next.appearance.customThemes.map(({ id, name }) => [id, name]),
    [
      ['t-1', 'Mi tema'],
      ['t-2', 'mi TEMA (2)'],
      ['t-3', 'Azul cobalto (2)'],
    ],
  );
  assert.equal(next.appearance.activeThemeId, 't-2');
  assert.equal(avisos.length, 2);
  assert.match(avisos[0], /mi TEMA \(2\)/);
});

test('PBI-0068: los temas válidos se conservan tal cual, con los colores en mayúsculas, y no se avisa de nada', () => {
  const bueno = temaGuardado('t-1', 'Bueno', { primary: '#123456', secondary: '#654321', ...BASE_DE_B });
  const minusculas = temaGuardado('t-2', 'Otro', { ...bueno.colors, primary: '#abcdef' });
  const { next, avisos } = cargarConTemas([bueno, minusculas], 't-1');
  assert.deepEqual(next.appearance.customThemes, [
    bueno,
    { ...minusculas, colors: { ...minusculas.colors, primary: '#ABCDEF' } },
  ]);
  assert.equal(next.appearance.activeThemeId, 't-1');
  assert.deepEqual(avisos, []);
});

test('PBI-0068: normalizar sin quien reciba los avisos no falla', () => {
  const v3 = normalizeState(estadoV2(), demoPasswords);
  v3.appearance.customThemes = [temaGuardado('t-1', '')];
  assert.deepEqual(normalizeState(v3, demoPasswords).appearance.customThemes, []);
});

test('PBI-0068 y PBI-0069: un nombre guardado con caracteres invisibles los pierde; si no queda nada, el tema se descarta', () => {
  const { next, avisos } = cargarConTemas([
    temaGuardado('t-1', 'Mi​tema'),
    temaGuardado('t-2', '​'),
    temaGuardado('t-3', 'Azul cobalto'),
  ]);
  assert.deepEqual(
    next.appearance.customThemes.map(({ id, name }) => [id, name]),
    [
      ['t-1', 'Mitema'],
      ['t-3', 'Azul cobalto (2)'],
    ],
  );
  assert.equal(avisos.length, 3);
  assert.match(avisos[1], /descartado.*INVALID_THEME_NAME/);
});

test('lote 07b (PBI-0028 y PBI-0033): un estado sin actividad ni «visto» carga con listas vacías, sin migración', () => {
  const guardado = { ...estadoV2(), schemaVersion: SCHEMA_VERSION };
  delete guardado.activity;
  delete guardado.adminNotificationsSeen;
  const estado = normalizeState(guardado, demoPasswords);
  assert.deepEqual(estado.activity, []);
  assert.deepEqual(estado.adminNotificationsSeen, []);
  assert.equal(estado.schemaVersion, SCHEMA_VERSION, 'las listas nuevas no cambian la versión del esquema');
  const larga = Array.from({ length: 70 }, (_, n) => ({
    id: `e-${n}`,
    at: 'x',
    type: 't',
    description: 'd',
  }));
  assert.equal(normalizeState({ ...guardado, activity: larga }, demoPasswords).activity.length, 50);
});

test('lote 13 (PBI-0173): un estado sin errores de compra carga con la lista vacía y descarta los mal formados', () => {
  const guardado = { ...estadoV2(), schemaVersion: SCHEMA_VERSION };
  delete guardado.checkoutErrors;
  assert.deepEqual(normalizeState(guardado, demoPasswords).checkoutErrors, []);
  const bueno = {
    id: 'e-1',
    at: '2026-11-23T15:00:00.000Z',
    code: 'INSUFFICIENT_STOCK',
    productId: 'p-1',
    attempt: null,
  };
  const estado = normalizeState({ ...guardado, checkoutErrors: [bueno, { id: 'x' }] }, demoPasswords);
  assert.deepEqual(estado.checkoutErrors, [bueno]);
  assert.equal(estado.schemaVersion, SCHEMA_VERSION, 'la lista nueva no cambia la versión del esquema');
});

test('lote 12 (PBI-0184): un banner guardado sin botón secundario recibe el «Ver todos los productos» que el inicio mostraba fijo', () => {
  const guardado = estadoV2();
  guardado.schemaVersion = SCHEMA_VERSION;
  guardado.banners = [
    { id: 'bn-h', title: 'Hero', placement: 'hero', active: true, cta: 'Ver', ctaUrl: '/catalogo' },
    { id: 'bn-p', title: 'Promo', placement: 'promotion', active: true, cta: 'Ver', ctaUrl: '/catalogo' },
    {
      id: 'bn-x',
      title: 'Sin secundario',
      placement: 'hero',
      active: true,
      cta: 'Ver',
      ctaUrl: '/catalogo',
      secondaryCta: '',
      secondaryCtaUrl: '',
    },
  ];
  const [hero, promocion, quitado] = normalizeState(guardado, demoPasswords).banners;
  // En el inicio, el héroe llevaba al lado de su botón el enlace fijo «Ver todos los productos»: pasa a su secundario.
  assert.equal(hero.secondaryCta, 'Ver todos los productos');
  assert.equal(hero.secondaryCtaUrl, '/catalogo');
  // Las promociones no tenían un segundo botón.
  assert.equal(promocion.secondaryCta, '');
  assert.equal(promocion.secondaryCtaUrl, '');
  // Un secundario que el Admin ya quitó no vuelve.
  assert.equal(quitado.secondaryCta, '');
  assert.equal(quitado.secondaryCtaUrl, '');
  // Normalizar otra vez no cambia nada.
  const otraVez = normalizeState(normalizeState(guardado, demoPasswords), demoPasswords).banners;
  assert.deepEqual(otraVez, normalizeState(guardado, demoPasswords).banners);
});

test('lote 46 (PBI-0266): un banner sin estilos en sus botones recibe los de siempre; uno con estilos, los conserva', () => {
  const guardado = estadoV2();
  guardado.schemaVersion = SCHEMA_VERSION;
  guardado.banners = [
    { id: 'bn-a', title: 'Antes', placement: 'hero', active: true, cta: 'Ver', ctaUrl: '/catalogo' },
    {
      id: 'bn-e',
      title: 'Con estilos',
      placement: 'promotion',
      active: true,
      ctaStyle: 'outline',
      secondaryCtaStyle: 'contrast',
    },
    // A mano en data.json: un estilo que no existe vuelve al de siempre.
    { id: 'bn-x', title: 'Mal', placement: 'hero', active: true, ctaStyle: 'rojo', secondaryCtaStyle: 7 },
  ];
  const [antes, conEstilos, mal] = normalizeState(guardado, demoPasswords).banners;
  // El primero con el principal y el segundo con el secundario, como hasta el lote: la tienda se ve igual.
  assert.equal(antes.ctaStyle, 'primary');
  assert.equal(antes.secondaryCtaStyle, 'accent');
  assert.equal(conEstilos.ctaStyle, 'outline');
  assert.equal(conEstilos.secondaryCtaStyle, 'contrast');
  assert.equal(mal.ctaStyle, 'primary');
  assert.equal(mal.secondaryCtaStyle, 'accent');
  // Sin migración: no cambia la versión del esquema, y normalizar otra vez no cambia nada.
  const estado = normalizeState(guardado, demoPasswords);
  assert.equal(estado.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(normalizeState(estado, demoPasswords).banners, estado.banners);
});

test('lote 12 (PBI-0184): los banners principales de la semilla llevan su botón secundario explícito', () => {
  const heroes = seed.banners.filter((banner) => banner.placement === 'hero');
  assert.ok(heroes.length > 0);
  for (const banner of heroes) {
    assert.equal(banner.secondaryCta, 'Ver todos los productos', banner.id);
    assert.equal(banner.secondaryCtaUrl, '/catalogo', banner.id);
  }
});

// --- Migración schemaVersion: 4 (lote 15, ADR-0021; PBI-0169, PBI-0175 y PBI-0185) ---

/** Estado guardado por la versión 3, con los campos de Contenido de texto. */
function estadoV3(contenido = {}) {
  const base = structuredClone(seed);
  for (const clave of ['contactEmails', 'contactPhones', 'socialLinks', 'announcements', 'quickLinks'])
    delete base.config[clave];
  return {
    ...base,
    schemaVersion: 3,
    revision: 9,
    adminCredentials: base.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
    config: {
      ...base.config,
      contactEmail: 'hola@mitienda.pe',
      contactPhone: '+51 01 555 0000',
      headerMessage: 'Envío gratis desde S/ 300.',
      topNavigation: 'Inicio, Productos, Pedidos, Envíos, Ayuda',
      quickLinks: 'Contacto, Envíos',
      ...contenido,
    },
  };
}

test('v3 → v4: el correo y el teléfono pasan a ser el primero de su lista y se quitan los campos de texto', () => {
  const { config } = normalizeState(estadoV3(), demoPasswords);
  assert.deepEqual(config.contactEmails, [{ value: 'hola@mitienda.pe', label: '' }]);
  assert.deepEqual(config.contactPhones, [{ value: '+51 01 555 0000', label: '' }]);
  assert.deepEqual(config.socialLinks, []);
  for (const campo of ['contactEmail', 'contactPhone', 'headerMessage', 'topNavigation'])
    assert.equal(campo in config, false, campo);
});

test('v3 → v4: el mensaje superior y la navegación pasan a ser los avisos; los accesos, el pie que se veía', () => {
  const { config } = normalizeState(estadoV3(), demoPasswords);
  assert.deepEqual(config.announcements, [
    { text: 'Envío gratis desde S/ 300.', url: '' },
    { text: 'Ayuda', url: '/info/contacto' },
  ]);
  assert.deepEqual(config.quickLinks, seed.config.quickLinks);
});

test('v3 → v4: un correo o teléfono vacío deja la lista vacía, nunca el de la demo', () => {
  const { config } = normalizeState(estadoV3({ contactEmail: '', contactPhone: ' ' }), demoPasswords);
  assert.deepEqual(config.contactEmails, []);
  assert.deepEqual(config.contactPhones, []);
});

test('v4: las listas guardadas se conservan y normalizar otra vez no cambia nada', () => {
  const v4 = normalizeState(estadoV3(), demoPasswords);
  v4.config.socialLinks = [{ label: 'Instagram', url: 'https://www.instagram.com/mitienda' }];
  const otraVez = normalizeState(structuredClone(v4), demoPasswords);
  assert.deepEqual(otraVez, v4);
});

test('la semilla normalizada conserva sus listas de Contenido', () => {
  const next = normalizeState(structuredClone(seed), demoPasswords);
  for (const clave of ['contactEmails', 'contactPhones', 'socialLinks', 'announcements', 'quickLinks'])
    assert.deepEqual(next.config[clave], seed.config[clave], clave);
});

test('lote 16 (PBI-0179): un estado sin el lugar de los sugeridos, o con uno desconocido, carga con el diálogo', () => {
  const sinCampo = estadoV3();
  delete sinCampo.config.addToCartDisplay;
  assert.equal(normalizeState(sinCampo, demoPasswords).config.addToCartDisplay, 'dialog');
  const desconocido = estadoV3();
  desconocido.config.addToCartDisplay = 'popup';
  assert.equal(normalizeState(desconocido, demoPasswords).config.addToCartDisplay, 'dialog');
  const panel = estadoV3();
  panel.config.addToCartDisplay = 'side-panel';
  assert.equal(normalizeState(panel, demoPasswords).config.addToCartDisplay, 'side-panel');
  assert.equal(seed.config.addToCartDisplay, 'dialog');
});
