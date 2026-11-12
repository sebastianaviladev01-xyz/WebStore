import { mezclarSrgb, relacionDeContraste, textoMasLegible } from './contraste.rules.mjs';

/**
 * Tokens CSS que forman el mapa de un tema, en el orden en que se sirven. La tienda y el Admin solo aplican
 * el mapa; los tokens fijos (`--ws-danger*`, `--ws-warning*`, `--ws-on-media`, `--ws-scrim`) no dependen del
 * tema y viven solo en `tokens.css`.
 */
export const TOKENS_DEL_TEMA = Object.freeze([
  '--ws-primary',
  '--ws-primary-strong',
  '--ws-primary-soft',
  '--ws-on-primary',
  '--ws-on-primary-soft',
  '--ws-accent',
  '--ws-accent-strong',
  '--ws-accent-soft',
  '--ws-on-accent',
  '--ws-link',
  '--ws-focus-ring',
  '--ws-topbar',
  '--ws-on-topbar',
  '--ws-bg',
  '--ws-surface',
  '--ws-surface-subtle',
  '--ws-surface-soft',
  '--ws-ink',
  '--ws-text',
  '--ws-muted-strong',
  '--ws-muted',
  '--ws-border',
  '--ws-border-strong',
  '--ws-disabled',
  '--ws-disabled-text',
  '--ws-dot',
  '--ws-footer',
  '--ws-footer-text',
  '--ws-footer-rule',
  '--ws-footer-heading',
]);

/** Escala neutra: la que un tema propio hereda de un predefinido cuando comparte su base (fondo, superficie y contraste). */
const ESCALA_NEUTRA = Object.freeze([
  '--ws-bg',
  '--ws-surface',
  '--ws-surface-subtle',
  '--ws-surface-soft',
  '--ws-ink',
  '--ws-text',
  '--ws-muted-strong',
  '--ws-muted',
  '--ws-border',
  '--ws-border-strong',
  '--ws-disabled',
  '--ws-disabled-text',
  '--ws-dot',
  '--ws-footer',
  '--ws-footer-text',
  '--ws-footer-rule',
  '--ws-footer-heading',
]);

const BLANCO = '#FFFFFF';
const TEXTO_MINIMO = 4.5;
const INTERFAZ_MINIMO = 3;

const mismoColor = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();

/** La mezcla tal como la escribe el BFF: `color-mix()` con colores literales, que el navegador calcula igual. */
const mezcla = (a, porcentaje, b) => `color-mix(in srgb, ${a} ${porcentaje}%, ${b})`;

function basePredefinida(colores, predefinidos) {
  return predefinidos.find(({ colors }) =>
    ['background', 'surface', 'contrast'].every((campo) => mismoColor(colors[campo], colores[campo])),
  );
}

function escalaNeutraDerivada({ primary: P, background: F, surface: Sf, contrast: C }) {
  return {
    '--ws-bg': F,
    '--ws-surface': Sf,
    '--ws-surface-subtle': mezcla(C, 3, Sf),
    '--ws-surface-soft': mezcla(C, 9, Sf),
    '--ws-ink': C,
    '--ws-text': C,
    '--ws-muted-strong': mezcla(C, 82, Sf),
    '--ws-muted': mezcla(C, 68, Sf),
    '--ws-border': mezcla(C, 14, Sf),
    '--ws-border-strong': mezcla(C, 50, Sf),
    '--ws-disabled': mezcla(C, 10, Sf),
    '--ws-disabled-text': mezcla(C, 68, Sf),
    '--ws-dot': mezcla(P, 30, Sf),
    '--ws-footer': C,
    '--ws-footer-text': mezcla(Sf, 78, C),
    '--ws-footer-rule': mezcla(Sf, 15, C),
    '--ws-footer-heading': Sf,
  };
}

function tokensDeMarca({ primary: P, secondary: S, background: F, surface: Sf, contrast: C }) {
  const sobrePrincipal = textoMasLegible(P, [BLANCO, C]);
  const pesoFuerte = mismoColor(sobrePrincipal, BLANCO) ? 62 : 88;
  const fuerteLegible =
    relacionDeContraste(sobrePrincipal, mezclarSrgb(P, pesoFuerte / 100, C)) >= TEXTO_MINIMO;
  const principalFuerte = fuerteLegible ? mezcla(P, pesoFuerte, C) : P;
  const colorFuerte = fuerteLegible ? mezclarSrgb(P, pesoFuerte / 100, C) : P;
  const legibleSobreFondos = (minimo) =>
    relacionDeContraste(P, F) >= minimo && relacionDeContraste(P, Sf) >= minimo;
  return {
    '--ws-primary': P,
    '--ws-primary-strong': principalFuerte,
    '--ws-primary-soft': mezcla(P, 10, Sf),
    '--ws-on-primary': sobrePrincipal,
    '--ws-on-primary-soft':
      relacionDeContraste(colorFuerte, mezclarSrgb(P, 0.1, Sf)) >= TEXTO_MINIMO ? principalFuerte : C,
    '--ws-accent': S,
    '--ws-accent-strong': mezcla(S, 78, C),
    '--ws-accent-soft': mezcla(S, 9, Sf),
    '--ws-on-accent': textoMasLegible(S, [BLANCO, C]),
    '--ws-link': legibleSobreFondos(TEXTO_MINIMO) ? P : C,
    '--ws-focus-ring': legibleSobreFondos(INTERFAZ_MINIMO) ? P : C,
    // Franja superior de la tienda: en un tema propio, el principal fuerte; A y C la fijan como se presentó.
    '--ws-topbar': principalFuerte,
    '--ws-on-topbar': textoMasLegible(colorFuerte, [BLANCO, C]),
  };
}

/**
 * Mapa completo de tokens de un tema a partir de sus cinco colores (derivación D2). Si el fondo, la
 * superficie y el contraste coinciden con los de un predefinido, hereda su escala neutra; los tokens de
 * marca se derivan siempre. `predefinidos` llega como parámetro: el Admin lo toma de la lista del BFF.
 * Los colores se escriben en mayúsculas, como se guardan.
 */
export function tokensDelTema(entrada, predefinidos = []) {
  const colores = Object.fromEntries(
    ['primary', 'secondary', 'background', 'surface', 'contrast'].map((campo) => [
      campo,
      String(entrada[campo]).toUpperCase(),
    ]),
  );
  const base = basePredefinida(colores, predefinidos);
  const neutra = base
    ? Object.fromEntries(ESCALA_NEUTRA.map((nombre) => [nombre, base.tokens[nombre]]))
    : escalaNeutraDerivada(colores);
  const tokens = { ...tokensDeMarca(colores), ...neutra };
  return Object.freeze(Object.fromEntries(TOKENS_DEL_TEMA.map((nombre) => [nombre, tokens[nombre]])));
}

const VARIABLE = /^var\((--[\w-]+)\)$/;
const MEZCLA_SRGB = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/;
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Color `#RRGGBB` que pinta el navegador para cada token: resuelve `var()` entre tokens del mapa y
 * `color-mix(in srgb, …)` con la misma cuenta. Sirve para medir el contraste de un mapa literal, como el de B.
 */
export function coloresCalculados(tokens) {
  const calculados = {};
  const enCurso = new Set();
  const resolverToken = (nombre) => {
    if (calculados[nombre]) return calculados[nombre];
    if (!(nombre in tokens) || enCurso.has(nombre)) throw new Error(`Token sin valor calculable: ${nombre}`);
    enCurso.add(nombre);
    calculados[nombre] = resolver(tokens[nombre]);
    enCurso.delete(nombre);
    return calculados[nombre];
  };
  const resolver = (valor) => {
    const texto = String(valor).trim();
    const variable = VARIABLE.exec(texto);
    if (variable) return resolverToken(variable[1]);
    const mezclaSrgb = MEZCLA_SRGB.exec(texto);
    if (mezclaSrgb)
      return mezclarSrgb(resolver(mezclaSrgb[1]), Number(mezclaSrgb[2]) / 100, resolver(mezclaSrgb[3]));
    if (HEX.test(texto)) return texto.toUpperCase();
    throw new Error(`Valor de color no reconocido: ${texto}`);
  };
  return Object.fromEntries(Object.keys(tokens).map((nombre) => [nombre, resolverToken(nombre)]));
}

/** Pares de texto y fondo que se miden en cada tema, con el token de primer plano, el de fondo y su mínimo. */
export const PARES_DE_CONTRASTE = Object.freeze([
  { par: 'contrast/background', texto: '--ws-ink', fondo: '--ws-bg', minimo: TEXTO_MINIMO, bloquea: true },
  { par: 'contrast/surface', texto: '--ws-ink', fondo: '--ws-surface', minimo: TEXTO_MINIMO, bloquea: true },
  { par: 'muted/background', texto: '--ws-muted', fondo: '--ws-bg', minimo: TEXTO_MINIMO, bloquea: false },
  { par: 'muted/surface', texto: '--ws-muted', fondo: '--ws-surface', minimo: TEXTO_MINIMO, bloquea: false },
  {
    par: 'onPrimary/primary',
    texto: '--ws-on-primary',
    fondo: '--ws-primary',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'onPrimary/primaryStrong',
    texto: '--ws-on-primary',
    fondo: '--ws-primary-strong',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'onPrimarySoft/primarySoft',
    texto: '--ws-on-primary-soft',
    fondo: '--ws-primary-soft',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'onAccent/accent',
    texto: '--ws-on-accent',
    fondo: '--ws-accent',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  { par: 'link/background', texto: '--ws-link', fondo: '--ws-bg', minimo: TEXTO_MINIMO, bloquea: false },
  { par: 'link/surface', texto: '--ws-link', fondo: '--ws-surface', minimo: TEXTO_MINIMO, bloquea: false },
  {
    par: 'focusRing/background',
    texto: '--ws-focus-ring',
    fondo: '--ws-bg',
    minimo: INTERFAZ_MINIMO,
    bloquea: false,
  },
  {
    par: 'focusRing/surface',
    texto: '--ws-focus-ring',
    fondo: '--ws-surface',
    minimo: INTERFAZ_MINIMO,
    bloquea: false,
  },
  {
    par: 'footerText/footer',
    texto: '--ws-footer-text',
    fondo: '--ws-footer',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'onTopbar/topbar',
    texto: '--ws-on-topbar',
    fondo: '--ws-topbar',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'disabledText/disabled',
    texto: '--ws-disabled-text',
    fondo: '--ws-disabled',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
]);

/** Relación de contraste, sin redondear, de cada par de `PARES_DE_CONTRASTE` en un mapa de tokens. */
export function medirPares(tokens) {
  const colores = coloresCalculados(tokens);
  return Object.fromEntries(
    PARES_DE_CONTRASTE.map(({ par, texto, fondo }) => [
      par,
      relacionDeContraste(colores[texto], colores[fondo]),
    ]),
  );
}

/**
 * Revisión de contraste de un tema (AC-14, D7): los 15 pares de `PARES_DE_CONTRASTE`, en ese orden, medidos
 * sobre los tokens que derivan de sus cinco colores. Cada `ParContraste` trae `par`, `relacion`, `minimo` y
 * `bloquea`; `bloquea` dice si ese par impide guardar cuando queda bajo su mínimo y no depende de la medida.
 *
 * La relación se redondea a un decimal hacia abajo, no al más cercano: así un par que no llega a su mínimo
 * nunca se muestra con una cifra igual o mayor que él (4.47 se informa como 4.4, no como 4.5) y comparar
 * `relacion < minimo` da el mismo resultado que con el valor exacto.
 */
export function revisarContraste(colores, predefinidos = []) {
  const medidas = medirPares(tokensDelTema(colores, predefinidos));
  return Object.freeze(
    PARES_DE_CONTRASTE.map(({ par, minimo, bloquea }) => ({
      par,
      relacion: Math.floor(medidas[par] * 10) / 10,
      minimo,
      bloquea,
    })),
  );
}
