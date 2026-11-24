import { mezclarSrgb, relacionDeContraste, textoMasLegible } from './contraste.rules.mjs';

/**
 * Tokens CSS que forman el mapa de un tema, en el orden en que se sirven. La tienda y el Admin solo aplican
 * el mapa; los tokens fijos (`--ws-on-media`, `--ws-scrim`) no dependen del tema y viven solo en `tokens.css`.
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
  // Borde de los componentes rellenos con el acento (ADR-0023): justo después de su texto, fuera de la escala neutra.
  '--ws-accent-line',
  '--ws-link',
  // Texto y marcas sobre el color de los enlaces (ADR-0014): justo después de su fondo, fuera de la escala neutra.
  '--ws-on-link',
  '--ws-focus-ring',
  '--ws-topbar',
  '--ws-on-topbar',
  // Error y alerta (ADR-0019): los calcula el tema, fuera de la escala neutra.
  '--ws-danger',
  '--ws-danger-soft',
  '--ws-danger-line',
  '--ws-warning',
  '--ws-warning-soft',
  // Lienzo de la tienda (ADR-0013): justo antes de `--ws-bg`, fuera de la escala neutra.
  '--ws-store-bg',
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
const NEGRO = '#000000';
const TEXTO_MINIMO = 4.5;
const INTERFAZ_MINIMO = 3;
/** Cuánto se distingue, como mínimo, el acento con el puntero encima del acento (lote 20). */
const DIFERENCIA_AL_PASAR = 1.3;
/** Cuánto secundario lleva el secundario suave sobre la superficie (lote 28, ADR-0028; antes, 9 % y sin uso). */
const PESO_DEL_SECUNDARIO_SUAVE = 20;

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

/**
 * Variantes del error y de la alerta (ADR-0019). La de fondos claros son los colores que `tokens.css` fijaba antes
 * del tema; la de fondos oscuros, un rojo y un ámbar claros con el fondo suave y la línea mezclados con la superficie.
 */
const AVISOS = Object.freeze({
  danger: { claro: '#B42318', suave: '#FEF3F2', linea: '#FECDCA', oscuro: '#FDA29B' },
  warning: { claro: '#8A4B08', suave: '#FFF6E5', oscuro: '#FEC84B' },
});

/** Contraste del color con el peor de los fondos sobre los que se escribe (el fondo principal y la superficie). */
const legibilidadSobre = (color, fondos) =>
  Math.min(...fondos.map((fondo) => relacionDeContraste(color, fondo)));

/**
 * El error y la alerta: la variante cuyo texto se lee mejor sobre el fondo principal y la superficie del tema.
 * Sobre fondos claros, la de hoy; sobre fondos oscuros, la clara, con su fondo suave y su línea mezclados con la
 * superficie para que el aviso no sea un recuadro claro sobre una página oscura.
 */
function tokensDeAviso({ background: F, surface: Sf }) {
  const variante = ({ claro, oscuro }) =>
    legibilidadSobre(claro, [F, Sf]) >= legibilidadSobre(oscuro, [F, Sf]) ? claro : oscuro;
  const peligro = variante(AVISOS.danger);
  const alerta = variante(AVISOS.warning);
  const esClaro = (color, aviso) => color === aviso.claro;
  return {
    '--ws-danger': peligro,
    '--ws-danger-soft': esClaro(peligro, AVISOS.danger) ? AVISOS.danger.suave : mezcla(peligro, 12, Sf),
    '--ws-danger-line': esClaro(peligro, AVISOS.danger) ? AVISOS.danger.linea : mezcla(peligro, 40, Sf),
    '--ws-warning': alerta,
    '--ws-warning-soft': esClaro(alerta, AVISOS.warning) ? AVISOS.warning.suave : mezcla(alerta, 12, Sf),
  };
}

/**
 * Borde del acento (ADR-0023, PBI-0189): el secundario si llega a 3:1 sobre el fondo principal y la superficie
 * (WCAG 1.4.11); si no, su primera mezcla con el contraste, de 10 en 10 %, que llega; en último caso, el contraste,
 * que siempre llega porque `contrast/*` bloquea a 4.5:1. Así un acento claro sobre una base clara (un ámbar sobre el
 * blanco) se ve como tal: conserva su relleno y gana un contorno que lo separa del fondo.
 */
function bordeDelAcento(S, F, Sf, C) {
  for (let peso = 100; peso > 0; peso -= 10) {
    const color = peso === 100 ? S : mezclarSrgb(S, peso / 100, C);
    if (legibilidadSobre(color, [F, Sf]) >= INTERFAZ_MINIMO) return peso === 100 ? S : mezcla(S, peso, C);
  }
  return C;
}

/**
 * Acento fuerte: el botón secundario con el puntero encima (ADR-0023; lote 20). Sirve un color que deja el texto sobre
 * el acento a 4.5:1 y que se distingue del acento (`DIFERENCIA_AL_PASAR`, como B, 1.37:1). Primero, la mezcla al 78 %
 * con el contraste, la de siempre; si no sirve (un secundario igual al contraste, como el grafito de C, o un texto
 * oscuro que no llega sobre la mezcla), la primera mezcla con el blanco o el negro, de 10 en 10 % (90 %, 80 %…), que
 * sirva; con un secundario oscuro, el blanco. Si ninguna sirve, el acento, como antes.
 */
function acentoFuerte(S, C, texto) {
  const sirve = (color) =>
    relacionDeContraste(texto, color) >= TEXTO_MINIMO && relacionDeContraste(color, S) >= DIFERENCIA_AL_PASAR;
  if (sirve(mezclarSrgb(S, 0.78, C))) return mezcla(S, 78, C);
  for (let peso = 90; peso > 0; peso -= 10)
    for (const polo of [BLANCO, NEGRO])
      if (sirve(mezclarSrgb(S, peso / 100, polo))) return mezcla(S, peso, polo);
  return S;
}

function tokensDeMarca({ primary: P, secondary: S, background: F, surface: Sf, contrast: C }) {
  // El más legible entre el blanco, el contraste y la superficie (ADR-0019): con un principal muy claro sobre una
  // base oscura, el blanco y el contraste son claros y solo la superficie se lee. A lo fija con su literal.
  const sobrePrincipal = textoMasLegible(P, [BLANCO, C, Sf]);
  const pesoFuerte = mismoColor(sobrePrincipal, BLANCO) ? 62 : 88;
  const fuerteLegible =
    relacionDeContraste(sobrePrincipal, mezclarSrgb(P, pesoFuerte / 100, C)) >= TEXTO_MINIMO;
  const principalFuerte = fuerteLegible ? mezcla(P, pesoFuerte, C) : P;
  const colorFuerte = fuerteLegible ? mezclarSrgb(P, pesoFuerte / 100, C) : P;
  const legibleSobreFondos = (minimo) =>
    relacionDeContraste(P, F) >= minimo && relacionDeContraste(P, Sf) >= minimo;
  const enlace = legibleSobreFondos(TEXTO_MINIMO) ? P : C;
  // Como el texto sobre el principal (ADR-0019): sobre un acento claro en una base oscura, solo la superficie se lee.
  const sobreAcento = textoMasLegible(S, [BLANCO, C, Sf]);
  return {
    '--ws-primary': P,
    '--ws-primary-strong': principalFuerte,
    '--ws-primary-soft': mezcla(P, 10, Sf),
    '--ws-on-primary': sobrePrincipal,
    '--ws-on-primary-soft':
      relacionDeContraste(colorFuerte, mezclarSrgb(P, 0.1, Sf)) >= TEXTO_MINIMO ? principalFuerte : C,
    '--ws-accent': S,
    '--ws-accent-strong': acentoFuerte(S, C, sobreAcento),
    // Fondo con el puntero encima o con el foco en la tienda (lote 28, ADR-0028): el secundario al 20 % sobre la superficie.
    '--ws-accent-soft': mezcla(S, PESO_DEL_SECUNDARIO_SUAVE, Sf),
    '--ws-on-accent': sobreAcento,
    '--ws-accent-line': bordeDelAcento(S, F, Sf, C),
    '--ws-link': enlace,
    // A diferencia de `--ws-on-primary`, la superficie también es candidata: en un tema oscuro el contraste es
    // claro y solo la superficie se lee sobre un enlace claro (ADR-0014).
    '--ws-on-link': textoMasLegible(enlace, [BLANCO, C, Sf]),
    '--ws-focus-ring': legibleSobreFondos(INTERFAZ_MINIMO) ? P : C,
    // Franja superior de la tienda: en un tema propio, el principal fuerte; A y C la fijan como se presentó.
    '--ws-topbar': principalFuerte,
    // Con los mismos candidatos que el texto sobre el principal: la franja es el principal fuerte, que en una base
    // oscura se aclara hacia el contraste (ADR-0019).
    '--ws-on-topbar': textoMasLegible(colorFuerte, [BLANCO, C, Sf]),
  };
}

/**
 * Mapa completo de tokens de un tema a partir de sus cinco colores (derivación D2). Si el fondo, la
 * superficie y el contraste coinciden con los de un predefinido, hereda su escala neutra; los tokens de
 * marca se derivan siempre. El lienzo de la tienda (`--ws-store-bg`, ADR-0013) es siempre el fondo principal:
 * no se hereda con la escala, y A, B y C lo fijan con su literal. `predefinidos` llega como parámetro: el
 * Admin lo toma de la lista del BFF. Los colores se escriben en mayúsculas, como se guardan.
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
  const tokens = {
    ...tokensDeMarca(colores),
    ...tokensDeAviso(colores),
    '--ws-store-bg': colores.background,
    ...neutra,
  };
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
  // Sobre el lienzo de la tienda (ADR-0013) y el contorno de los campos (WCAG 1.4.11): solo avisan.
  {
    par: 'contrast/storeBackground',
    texto: '--ws-ink',
    fondo: '--ws-store-bg',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'muted/storeBackground',
    texto: '--ws-muted',
    fondo: '--ws-store-bg',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'link/storeBackground',
    texto: '--ws-link',
    fondo: '--ws-store-bg',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'focusRing/storeBackground',
    texto: '--ws-focus-ring',
    fondo: '--ws-store-bg',
    minimo: INTERFAZ_MINIMO,
    bloquea: false,
  },
  {
    par: 'borderStrong/surface',
    texto: '--ws-border-strong',
    fondo: '--ws-surface',
    minimo: INTERFAZ_MINIMO,
    bloquea: false,
  },
  // Texto y marcas sobre el enlace, que Material pinta con su `on-primary` (ADR-0014): pide texto y solo avisa.
  { par: 'onLink/link', texto: '--ws-on-link', fondo: '--ws-link', minimo: TEXTO_MINIMO, bloquea: false },
  // El error y la alerta (ADR-0019) sobre los fondos en que se escriben y sobre su propio fondo suave: solo avisan.
  { par: 'danger/background', texto: '--ws-danger', fondo: '--ws-bg', minimo: TEXTO_MINIMO, bloquea: false },
  {
    par: 'danger/surface',
    texto: '--ws-danger',
    fondo: '--ws-surface',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'danger/dangerSoft',
    texto: '--ws-danger',
    fondo: '--ws-danger-soft',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'warning/background',
    texto: '--ws-warning',
    fondo: '--ws-bg',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'warning/surface',
    texto: '--ws-warning',
    fondo: '--ws-surface',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'warning/warningSoft',
    texto: '--ws-warning',
    fondo: '--ws-warning-soft',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  // Lo que se escribe sobre el secundario suave, el fondo con el puntero encima o con el foco en la tienda (lote 28,
  // ADR-0028): el texto y el texto tenue de los menús. Con el puntero encima, la tienda escribe con el contraste, no
  // con el color de los enlaces, que en un tema oscuro no siempre se lee sobre él. Solo avisan.
  {
    par: 'contrast/accentSoft',
    texto: '--ws-ink',
    fondo: '--ws-accent-soft',
    minimo: TEXTO_MINIMO,
    bloquea: false,
  },
  {
    par: 'muted/accentSoft',
    texto: '--ws-muted',
    fondo: '--ws-accent-soft',
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
 * Revisión de contraste de un tema (AC-14, D7): los 29 pares de `PARES_DE_CONTRASTE`, en ese orden, medidos
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
