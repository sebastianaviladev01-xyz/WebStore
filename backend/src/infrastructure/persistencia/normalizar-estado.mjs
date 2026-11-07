import { normalizeEmail } from '../../domain/comun/validacion.rules.mjs';
import { migrateRole } from '../../domain/sesion/rol.rules.mjs';
import { isSessionAlive } from '../../domain/sesion/sesion.rules.mjs';
import { hashPassword } from '../seguridad/password-hasher.mjs';
import { seed } from './seed.mjs';

/** 2: roles fijos superadmin/admin/vendedor (antes owner/catalog-maintainer). */
export const SCHEMA_VERSION = 2;

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

/** Completa con la semilla lo que falte en data.json, descarta sesiones vencidas y aplica migraciones. */
export function normalizeState(input, demoPasswords) {
  const next = { ...structuredClone(seed), ...input };
  next.config = { ...seed.config, ...(input.config ?? {}) };
  // Migración de la paleta: los colores por defecto anteriores (borgoña/bronce) pasan a la paleta B acordada.
  // Un color personalizado por la tienda se respeta.
  for (const [key, legacy] of Object.entries(LEGACY_DEFAULT_COLORS)) {
    if (String(next.config[key]).toUpperCase() === legacy) next.config[key] = seed.config[key];
  }
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
  if ((input.schemaVersion ?? 1) < SCHEMA_VERSION) migrateAdminRoles(next, demoPasswords);
  next.schemaVersion = SCHEMA_VERSION;
  return next;
}
