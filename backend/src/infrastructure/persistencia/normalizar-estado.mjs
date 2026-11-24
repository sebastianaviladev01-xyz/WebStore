import { normalizarActividad } from '../../domain/admin/actividad.rules.mjs';
import { sinColoresDeContenido } from '../../domain/admin/configuracion.rules.mjs';
import {
  CAMPOS_ANTERIORES_DE_CONTENIDO,
  MODO_DE_SUGERIDOS_POR_DEFECTO,
  esModoDeSugeridos,
  listasDesdeContenidoAnterior,
} from '../../domain/admin/contenido.rules.mjs';
import { normalizarErroresDeCompra } from '../../domain/admin/errores-de-compra.rules.mjs';
import { normalizarVistos } from '../../domain/admin/notificaciones.rules.mjs';
import { normalizarVersionesDeTerminos } from '../../domain/admin/terminos.rules.mjs';
import {
  diasNoLaborablesIniciales,
  normalizarDiasNoLaborables,
} from '../../domain/calendario/dias-no-laborables.rules.mjs';
import {
  ENTREGA_POR_DEFECTO,
  esHoraDeCorte,
  esReglaDePrimeraEntrega,
} from '../../domain/pedidos/primera-fecha-de-entrega.rules.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import { normalizeEmail } from '../../domain/comun/validacion.rules.mjs';
import { migrateRole } from '../../domain/sesion/rol.rules.mjs';
import { isSessionAlive } from '../../domain/sesion/sesion.rules.mjs';
import { exigirTemaValido } from '../../domain/temas/tema-propio.rules.mjs';
import { TEMA_POR_DEFECTO, TEMAS_PREDEFINIDOS } from '../../domain/temas/temas-predefinidos.mjs';
import { hashPassword } from '../seguridad/password-hasher.mjs';
import { newId } from '../seguridad/tokens.mjs';
import { seed } from './seed.mjs';

/**
 * 2: roles fijos superadmin/admin/vendedor (antes owner/catalog-maintainer).
 * 3: temas (`appearance`); los colores de Contenido pasan a un tema propio y se retiran de `config` (D3).
 * 4: listas de Contenido (lote 15, ADR-0021): correos, teléfonos, avisos y accesos inferiores.
 */
export const SCHEMA_VERSION = 4;

const COLORES_DE_B = TEMAS_PREDEFINIDOS.find((tema) => tema.id === TEMA_POR_DEFECTO).colors;
const NOMBRE_DEL_TEMA_MIGRADO = 'Colores de Contenido';
const COLOR_HEX = /^#[0-9a-f]{6}$/i;
/** Colores por defecto anteriores a la paleta B (borgoña y bronce): cuentan como los de B. */
const LEGACY_DEFAULT_COLORS = { primaryColor: '#6E173C', secondaryColor: '#8C6845' };

const COLLECTIONS = [
  'categories',
  'brands',
  'customers',
  'users',
  'rates',
  'orders',
  'accounts',
  'accountSessions',
  'adminSessions',
  'complaints',
];

const demoPasswordFor = (demoPasswords, role) => demoPasswords[role] ?? demoPasswords.vendedor;

/** Migración única: traduce los roles anteriores y agrega la cuenta demo del rol Administrador. */
function migrateAdminRoles(next, demoPasswords) {
  next.users = next.users.map((user) => ({ ...user, role: migrateRole(user.role) }));
  for (const demo of seed.users) {
    const exists = next.users.some(
      (user) => user.id === demo.id || normalizeEmail(user.email) === normalizeEmail(demo.email),
    );
    if (exists) continue;
    next.users.push(structuredClone(demo));
    next.adminCredentials.push({
      userId: demo.id,
      ...hashPassword(demoPasswordFor(demoPasswords, demo.role)),
    });
  }
}

/** Color guardado en Contenido, en mayúsculas; si falta, no es #RRGGBB o es el anterior por defecto, el de B. */
function colorDeContenido(config, clave, deB) {
  const valor = config[clave];
  if (typeof valor !== 'string' || !COLOR_HEX.test(valor)) return deB;
  const color = valor.toUpperCase();
  return color === LEGACY_DEFAULT_COLORS[clave] ? deB : color;
}

/**
 * Migración única a la versión 3 (planning.md, «Estado del BFF»): si los colores de Contenido difieren de los
 * de B, crea con ellos el tema propio «Colores de Contenido» sobre la base de B y lo activa. Si el nombre ya
 * existe, prueba «(2)», «(3)»… Las reglas del dominio validan y normalizan el tema; la base de B cumple siempre
 * D7. Las dos claves se quitan de `config` después, con el resto de la normalización.
 */
function migrarColoresDeContenido(next) {
  const primary = colorDeContenido(next.config, 'primaryColor', COLORES_DE_B.primary);
  const secondary = colorDeContenido(next.config, 'secondaryColor', COLORES_DE_B.secondary);
  if (primary === COLORES_DE_B.primary && secondary === COLORES_DE_B.secondary) return;
  const colors = { ...COLORES_DE_B, primary, secondary };
  const propios = next.appearance.customThemes;
  for (let intento = 1; ; intento++) {
    const name = intento === 1 ? NOMBRE_DEL_TEMA_MIGRADO : `${NOMBRE_DEL_TEMA_MIGRADO} (${intento})`;
    let tema;
    try {
      tema = exigirTemaValido({ name, colors }, propios);
    } catch (error) {
      if (error?.code === 'THEME_NAME_TAKEN') continue;
      throw error;
    }
    const ahora = nowIso();
    const migrado = { id: newId(), name: tema.name, colors: tema.colors, createdAt: ahora, updatedAt: ahora };
    propios.push(migrado);
    next.appearance.activeThemeId = migrado.id;
    return;
  }
}

const descripcion = (tema) => {
  try {
    return JSON.stringify(tema);
  } catch {
    return String(tema);
  }
};

/** Caracteres que no se ven en un nombre (de control y de formato): un nombre guardado antes de PBI-0069 los pierde. */
const INVISIBLES = /[\p{Cc}\p{Cf}]/gu;

/**
 * Un tema propio guardado, tal como lo dejaría crearlo hoy. Pasa por las mismas reglas que al crearlo
 * (`exigirTemaValido`) contra los ya aceptados. Se repara el nombre: pierde los caracteres invisibles y, si se repite,
 * se renombra con «(2)», «(3)»… como en la migración de los colores de Contenido. Lo que no se puede reparar lanza
 * un error con su código.
 */
function temaUtilizable(tema, aceptados) {
  if (tema === null || typeof tema !== 'object' || Array.isArray(tema))
    throw Object.assign(new Error('no es un objeto'), { code: 'INVALID_THEME' });
  if (typeof tema.id !== 'string' || tema.id.length === 0)
    throw Object.assign(new Error('no tiene un id de texto'), { code: 'INVALID_THEME_ID' });
  if ([...TEMAS_PREDEFINIDOS, ...aceptados].some((otro) => otro.id === tema.id))
    throw Object.assign(new Error('repite el id de otro tema'), { code: 'DUPLICATE_THEME_ID' });
  for (let intento = 1; ; intento++) {
    const visible = typeof tema.name === 'string' ? tema.name.replace(INVISIBLES, '') : tema.name;
    const name = intento === 1 ? visible : `${String(visible ?? '').trim()} (${intento})`;
    try {
      const valido = exigirTemaValido({ name, colors: tema.colors }, aceptados);
      return { ...tema, name: valido.name, colors: valido.colors };
    } catch (error) {
      if (error?.code !== 'THEME_NAME_TAKEN') throw error;
    }
  }
}

/**
 * Temas propios que se pueden servir (PBI-0068). Un tema guardado a mano o por una versión anterior podía dejar al
 * BFF respondiendo `500` en `/bff/appearance` y `theme.css`. Cada tema se repara (su nombre) o se descarta,
 * en el orden guardado, y cada cambio se avisa con el tema completo para poder recuperarlo desde el log.
 */
function temasPropiosUtilizables(guardados, avisar) {
  const aceptados = [];
  for (const tema of guardados) {
    try {
      const utilizable = temaUtilizable(tema, aceptados);
      if (utilizable.name !== String(tema.name).trim())
        avisar(
          `[temas] Tema propio «${tema.id}» renombrado al cargar los datos: «${tema.name}» pasa a «${utilizable.name}».`,
        );
      aceptados.push(utilizable);
    } catch (error) {
      avisar(
        `[temas] Tema propio descartado al cargar los datos (${error?.code ?? 'INVALID_THEME'}: ${error?.message}): ${descripcion(tema)}`,
      );
    }
  }
  return aceptados;
}

/** `appearance` con su forma completa: revisión entera, temas propios utilizables y el id activo tal como llegó. */
function normalizarApariencia(apariencia, avisar) {
  const actual = apariencia !== null && typeof apariencia === 'object' ? apariencia : {};
  return {
    revision: Number.isInteger(actual.revision) ? actual.revision : 0,
    activeThemeId: actual.activeThemeId,
    customThemes: temasPropiosUtilizables(
      Array.isArray(actual.customThemes) ? actual.customThemes : [],
      avisar,
    ),
  };
}

/** Un tema activo que no existe (ni predefinido ni propio) pasa a B; si tenía un id, se avisa. */
function temaActivoExistente({ activeThemeId, customThemes }, avisar) {
  const existe = [...TEMAS_PREDEFINIDOS, ...customThemes].some((tema) => tema.id === activeThemeId);
  if (existe) return activeThemeId;
  if (activeThemeId !== undefined)
    avisar(
      `[temas] El tema activo «${String(activeThemeId)}» no existe: queda activo «${TEMA_POR_DEFECTO}».`,
    );
  return TEMA_POR_DEFECTO;
}

/**
 * Lote 12 (PBI-0184): hasta entonces, el inicio mostraba al lado del botón de cada banner principal un enlace fijo,
 * «Ver todos los productos». Un banner guardado antes, sin botón secundario, lo recibe como tal, así se sigue viendo
 * igual; el resto queda sin secundario. Uno que ya tiene el campo (aunque vacío, si el Admin lo quitó) no cambia.
 */
function botonSecundarioAnterior(banner) {
  if (banner.secondaryCta !== undefined) return {};
  return (banner.placement ?? 'hero') === 'hero'
    ? { secondaryCta: 'Ver todos los productos', secondaryCtaUrl: '/catalogo' }
    : { secondaryCta: '', secondaryCtaUrl: '' };
}

/**
 * Migración única a la versión 4 (lote 15, ADR-0021; PBI-0169, PBI-0175 y PBI-0185): los campos de texto de Contenido
 * pasan a sus listas (`listasDesdeContenidoAnterior`) y se quitan. Cada lista se toma de lo guardado solo si estaba el
 * campo anterior; si no, queda la que ya hay (la de la semilla).
 */
function migrarListasDeContenido(next, guardado) {
  const listas = listasDesdeContenidoAnterior(guardado);
  if ('contactEmail' in guardado) next.config.contactEmails = listas.contactEmails;
  if ('contactPhone' in guardado) next.config.contactPhones = listas.contactPhones;
  if ('headerMessage' in guardado || 'topNavigation' in guardado)
    next.config.announcements = listas.announcements;
  // Los accesos de texto no los usaba la tienda: pasan a ser el pie que se veía.
  if (!Array.isArray(guardado.quickLinks)) next.config.quickLinks = listas.quickLinks;
}

/**
 * Completa con la semilla lo que falte en data.json, descarta sesiones vencidas y aplica migraciones. `avisar`
 * recibe un texto por cada dato que se repara o se descarta al cargar (hoy, los temas propios: PBI-0068). `opciones`
 * (lote 17): `fechasNoLaborablesIniciales`, las de `WEBSTORE_NON_WORKING_DATES`, que solo cuentan si el estado no tiene
 * calendario, y `ahora`, la fecha con que se registra una versión de los términos que cambió fuera del BFF.
 */
export function normalizeState(input, demoPasswords, avisar = () => {}, opciones = {}) {
  const { fechasNoLaborablesIniciales = new Set(), ahora = nowIso() } = opciones;
  const next = { ...structuredClone(seed), ...input };
  next.config = { ...seed.config, ...(input.config ?? {}) };
  next.products = (input.products ?? seed.products).map((product) => {
    const productSeed = seed.products.find((candidate) => candidate.id === product.id);
    return {
      highlights: productSeed?.highlights ?? [],
      thumbnailUrl: productSeed?.thumbnailUrl ?? product.imageUrl,
      gallery: productSeed?.gallery ?? [],
      ...product,
    };
  });
  next.banners = (input.banners ?? seed.banners).map((banner) => ({
    eyebrow: 'Selección WebStore',
    description: 'Promoción configurable desde el panel administrativo.',
    ctaUrl: '/catalogo',
    imageUrl: 'assets/brand/hero.svg',
    mobileImageUrl: '',
    placement: 'hero',
    imageTone: 'light',
    ...botonSecundarioAnterior(banner),
    ...banner,
  }));
  for (const key of COLLECTIONS) {
    next[key] = Array.isArray(input[key]) ? input[key] : structuredClone(seed[key] ?? []);
  }
  next.revision = Number.isInteger(input.revision) ? input.revision : 0;
  next.accountSessions = next.accountSessions.filter(isSessionAlive);
  next.adminSessions = next.adminSessions.filter(isSessionAlive);
  next.adminCredentials = Array.isArray(input.adminCredentials)
    ? input.adminCredentials
    : next.users.map((user) => ({
        userId: user.id,
        ...hashPassword(demoPasswordFor(demoPasswords, migrateRole(user.role))),
      }));
  // Lote 07b (PBI-0028 y PBI-0033): listas nuevas; sin ellas quedan vacías, sin migración ni cambio de versión.
  next.activity = normalizarActividad(input.activity);
  next.adminNotificationsSeen = normalizarVistos(input.adminNotificationsSeen);
  // Lote 13 (PBI-0173): los errores de compra de la campana; sin la lista, vacía, sin migración.
  next.checkoutErrors = normalizarErroresDeCompra(input.checkoutErrors);
  next.appearance = normalizarApariencia(input.appearance ?? structuredClone(seed.appearance), avisar);
  // Cada migración se ejecuta una sola vez, al pasar de una versión anterior a la suya.
  const versionGuardada = input.schemaVersion ?? 1;
  if (versionGuardada < 2) migrateAdminRoles(next, demoPasswords);
  if (versionGuardada < 3) migrarColoresDeContenido(next);
  if (versionGuardada < 4) migrarListasDeContenido(next, input.config ?? {});
  next.config = sinColoresDeContenido(next.config);
  // Lote 16 (PBI-0179): sin el campo lo completa la semilla; un valor desconocido vuelve al diálogo, sin migración.
  if (!esModoDeSugeridos(next.config.addToCartDisplay))
    next.config.addToCartDisplay = MODO_DE_SUGERIDOS_POR_DEFECTO;
  // Lote 17 (ADR-0021), sin migración ni cambio de versión. PBI-0178: la primera fecha de entrega, la de por defecto si
  // falta o no se conoce. PBI-0183: sin calendario guardado, el de `WEBSTORE_NON_WORKING_DATES`. PBI-0177: sin
  // versiones de los términos, el texto vigente es la versión 1.
  if (!esReglaDePrimeraEntrega(next.config.firstDeliveryDay))
    next.config.firstDeliveryDay = ENTREGA_POR_DEFECTO.firstDeliveryDay;
  if (!esHoraDeCorte(next.config.deliveryCutoffTime))
    next.config.deliveryCutoffTime = ENTREGA_POR_DEFECTO.deliveryCutoffTime;
  next.nonWorkingDates = normalizarDiasNoLaborables(
    input.nonWorkingDates,
    diasNoLaborablesIniciales(fechasNoLaborablesIniciales),
  );
  next.termsVersions = normalizarVersionesDeTerminos(input.termsVersions, next.config.termsContent, ahora);
  for (const clave of CAMPOS_ANTERIORES_DE_CONTENIDO) delete next.config[clave];
  next.appearance.activeThemeId = temaActivoExistente(next.appearance, avisar);
  next.schemaVersion = SCHEMA_VERSION;
  return next;
}
