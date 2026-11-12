import { sinColoresDeContenido } from '../../domain/admin/configuracion.rules.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import { normalizeEmail } from '../../domain/comun/validacion.rules.mjs';
import { migrateRole } from '../../domain/sesion/rol.rules.mjs';
import { isSessionAlive } from '../../domain/sesion/sesion.rules.mjs';
import { exigirTemaValido } from '../../domain/temas/tema-propio.rules.mjs';
import { TEMAS_PREDEFINIDOS } from '../../domain/temas/temas-predefinidos.mjs';
import { hashPassword } from '../seguridad/password-hasher.mjs';
import { newId } from '../seguridad/tokens.mjs';
import { seed } from './seed.mjs';

/**
 * 2: roles fijos superadmin/admin/vendedor (antes owner/catalog-maintainer).
 * 3: temas (`appearance`); los colores de Contenido pasan a un tema propio y se retiran de `config` (D3).
 */
export const SCHEMA_VERSION = 3;

const TEMA_POR_DEFECTO = 'b';
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

/** `appearance` con su forma completa: revisión entera, lista de temas propios y el id activo tal como llegó. */
function normalizarApariencia(apariencia) {
  const actual = apariencia !== null && typeof apariencia === 'object' ? apariencia : {};
  return {
    revision: Number.isInteger(actual.revision) ? actual.revision : 0,
    activeThemeId: actual.activeThemeId,
    customThemes: Array.isArray(actual.customThemes) ? actual.customThemes : [],
  };
}

/** Un tema activo que no existe (ni predefinido ni propio) pasa a B. */
function temaActivoExistente({ activeThemeId, customThemes }) {
  const existe = [...TEMAS_PREDEFINIDOS, ...customThemes].some((tema) => tema.id === activeThemeId);
  return existe ? activeThemeId : TEMA_POR_DEFECTO;
}

/** Completa con la semilla lo que falte en data.json, descarta sesiones vencidas y aplica migraciones. */
export function normalizeState(input, demoPasswords) {
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
  next.appearance = normalizarApariencia(input.appearance ?? structuredClone(seed.appearance));
  // Cada migración se ejecuta una sola vez, al pasar de una versión anterior a la suya.
  const versionGuardada = input.schemaVersion ?? 1;
  if (versionGuardada < 2) migrateAdminRoles(next, demoPasswords);
  if (versionGuardada < 3) migrarColoresDeContenido(next);
  next.config = sinColoresDeContenido(next.config);
  next.appearance.activeThemeId = temaActivoExistente(next.appearance);
  next.schemaVersion = SCHEMA_VERSION;
  return next;
}
