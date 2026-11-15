import { tokensDelTema } from './tema.rules.mjs';

/**
 * Temas predefinidos (D1): constantes del dominio, no se guardan en el estado ni se editan.
 * A y C toman los valores presentados el 05/11 y derivan el resto con la fórmula de los temas propios
 * (D2). B copia `frontend/src/styles/tokens.css` al pie de la letra (AC-01). La franja superior
 * (`--ws-topbar`) de A y C es la presentada: `#2E1A5C` y el grafito `#1F2328`, con texto blanco.
 * El lienzo de la tienda (`--ws-store-bg`, ADR-0013) es un literal en los tres (D2 de la feature 004): el tono
 * intermedio que Daniel eligió frente al blanco el 2026-11-13 (AC-14). `--ws-border-strong` de B es `#8894a6` (WCAG 1.4.11).
 */
const predefinido = (id, name, colors, tokens) =>
  Object.freeze({ id, name, colors: Object.freeze(colors), tokens: Object.freeze(tokens) });

const coloresA = {
  primary: '#4C2A92',
  secondary: '#F5A524',
  background: '#F4F4F6',
  surface: '#FFFFFF',
  contrast: '#17151C',
};

const coloresB = {
  primary: '#1D4ED8',
  secondary: '#C2410C',
  background: '#F3F5F8',
  surface: '#FFFFFF',
  contrast: '#0F172A',
};

const coloresC = {
  primary: '#F2B705',
  secondary: '#1F2328',
  background: '#F2F3F5',
  surface: '#FFFFFF',
  contrast: '#1F2328',
};

export const TEMAS_PREDEFINIDOS = Object.freeze([
  predefinido('a', 'Violeta tienda', coloresA, {
    ...tokensDelTema(coloresA),
    '--ws-primary-strong': '#2E1A5C',
    '--ws-primary-soft': '#EFE9FB',
    '--ws-on-primary': '#FFFFFF',
    '--ws-on-primary-soft': '#3A1F72',
    '--ws-on-accent': '#2B1700',
    '--ws-topbar': '#2E1A5C',
    '--ws-on-topbar': '#FFFFFF',
    '--ws-store-bg': '#FAFAFB',
    '--ws-muted': '#5B5866',
    '--ws-footer': '#1E1530',
    '--ws-footer-text': '#CFC8E0',
    '--ws-footer-heading': '#FFFFFF',
  }),
  predefinido('b', 'Azul cobalto', coloresB, {
    '--ws-primary': '#1d4ed8',
    '--ws-primary-strong': 'color-mix(in srgb, var(--ws-primary) 62%, #0f172a)',
    '--ws-primary-soft': 'color-mix(in srgb, var(--ws-primary) 10%, #ffffff)',
    '--ws-on-primary': '#ffffff',
    '--ws-on-primary-soft': 'var(--ws-primary-strong)',
    '--ws-accent': '#c2410c',
    '--ws-accent-strong': 'color-mix(in srgb, var(--ws-accent) 78%, #0f172a)',
    '--ws-accent-soft': 'color-mix(in srgb, var(--ws-accent) 9%, #ffffff)',
    '--ws-on-accent': '#ffffff',
    '--ws-link': 'var(--ws-primary)',
    '--ws-on-link': '#ffffff',
    '--ws-focus-ring': 'var(--ws-primary)',
    '--ws-topbar': 'var(--ws-primary-strong)',
    '--ws-on-topbar': '#ffffff',
    '--ws-danger': '#b42318',
    '--ws-danger-soft': '#fef3f2',
    '--ws-danger-line': '#fecdca',
    '--ws-warning': '#8a4b08',
    '--ws-warning-soft': '#fff6e5',
    '--ws-store-bg': '#f9fafc',
    '--ws-bg': '#f3f5f8',
    '--ws-surface': '#ffffff',
    '--ws-surface-subtle': '#f6f8fa',
    '--ws-surface-soft': '#e9edf3',
    '--ws-ink': '#0f172a',
    '--ws-text': '#1e293b',
    '--ws-muted-strong': '#3b4759',
    '--ws-muted': '#526075',
    '--ws-border': '#dde3ec',
    '--ws-border-strong': '#8894a6',
    '--ws-disabled': '#e6e9ee',
    '--ws-disabled-text': '#5a6577',
    '--ws-dot': '#b9c8f2',
    '--ws-footer': '#0f1b33',
    '--ws-footer-text': '#c5cedd',
    '--ws-footer-rule': '#22314f',
    '--ws-footer-heading': '#ffffff',
  }),
  predefinido('c', 'Grafito y ámbar', coloresC, {
    ...tokensDelTema(coloresC),
    '--ws-primary-soft': '#FFF6D6',
    '--ws-on-primary': '#1F2328',
    '--ws-on-primary-soft': '#8A5A00',
    '--ws-on-accent': '#F2B705',
    '--ws-link': '#1F2328',
    '--ws-focus-ring': '#1F2328',
    // La franja superior presentada el 05/11 es grafito con texto blanco, no el ámbar oscuro derivado.
    '--ws-topbar': '#1F2328',
    '--ws-on-topbar': '#FFFFFF',
    '--ws-store-bg': '#F9F9FA',
    '--ws-muted': '#555B65',
    '--ws-footer': '#16181C',
    '--ws-footer-text': '#C9CDD3',
    '--ws-footer-heading': '#FFFFFF',
  }),
]);
