import type { ColoresTema, NombreToken, ParContraste, Tema, TokensTema } from './tema.model';

/**
 * Réplica en el Admin de las reglas de temas del BFF (`contraste.rules.mjs`, `tema.rules.mjs` y la
 * validación del nombre de `tema-propio.rules.mjs`). Las dos copias deben dar el mismo resultado: lo
 * comprueba TEST-14 con `casos-tema.json`, el mismo archivo de casos del BFF.
 *
 * Funciones puras, sin I/O. Solo importa tipos porque la prueba transpila este archivo y borra sus líneas
 * `import`. Los temas predefinidos no se replican: llegan como parámetro, tomados de la lista del BFF.
 */

/** Temas de los que se hereda la escala neutra: basta con sus colores y sus tokens. */
type Predefinidos = readonly Pick<Tema, 'colors' | 'tokens'>[];

type CampoDeColor = keyof ColoresTema;
type ValoresDeToken = Readonly<Record<string, string>>;

/** Texto de `ACTIVE_THEME_IN_USE` del BFF: el tema activo no se borra (AC-09; la prueba lo compara con el BFF). */
export const MENSAJE_TEMA_ACTIVO_EN_USO = 'Activa otro tema antes de borrar este.';

const FORMATO_HEX = /^#[0-9A-Fa-f]{6}$/;

/** Convierte `#RRGGBB` en sus tres canales (0 a 255). */
function canales(color: string): number[] {
  if (typeof color !== 'string' || !FORMATO_HEX.test(color)) {
    throw new Error(`Color inválido: se esperaba #RRGGBB y llegó ${String(color)}`);
  }
  return [1, 3, 5].map((inicio) => parseInt(color.slice(inicio, inicio + 2), 16));
}

/** Luminancia relativa WCAG 2.1 de un color `#RRGGBB`. */
function luminanciaRelativa(color: string): number {
  const [r, g, b] = canales(color).map((canal) => {
    const v = canal / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Relación de contraste WCAG 2.1 entre dos colores, entre 1 y 21. Es simétrica y se devuelve sin
 * redondear.
 */
export function relacionDeContraste(a: string, b: string): number {
  const la = luminanciaRelativa(a);
  const lb = luminanciaRelativa(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Mezcla dos colores opacos como `color-mix(in srgb, a peso%, b)`: por canal, sobre los valores
 * codificados (sin linealizar). `peso` va de 0 a 1 y es la parte de `a`. Devuelve `#RRGGBB` en
 * mayúsculas.
 */
export function mezclarSrgb(a: string, peso: number, b: string): string {
  const ca = canales(a);
  const cb = canales(b);
  const mezcla = ca.map((canal, i) => Math.round(canal * peso + cb[i] * (1 - peso)));
  return `#${mezcla.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * Devuelve el candidato con mayor relación de contraste sobre `fondo`. En empate gana el primero y
 * se devuelve tal como llegó.
 */
export function textoMasLegible(fondo: string, candidatos: readonly string[]): string {
  let elegido = '';
  let mejorRelacion = -1;
  for (const candidato of candidatos) {
    const relacion = relacionDeContraste(fondo, candidato);
    if (relacion > mejorRelacion) {
      mejorRelacion = relacion;
      elegido = candidato;
    }
  }
  return elegido;
}

/**
 * Tokens CSS que forman el mapa de un tema, en el orden en que se sirven. Los tokens fijos (`--ws-on-media`,
 * `--ws-scrim`) no dependen del tema.
 */
export const TOKENS_DEL_TEMA: readonly NombreToken[] = Object.freeze<NombreToken[]>([
  '--ws-primary',
  '--ws-primary-strong',
  '--ws-primary-soft',
  '--ws-on-primary',
  '--ws-on-primary-soft',
  '--ws-accent',
  '--ws-accent-strong',
  '--ws-accent-soft',
  '--ws-on-accent',
  // Borde de los componentes rellenos con el acento (ADR-0023): justo después de su texto, fuera de `ESCALA_NEUTRA`.
  '--ws-accent-line',
  '--ws-link',
  // Texto y marcas sobre el color de los enlaces (ADR-0014): justo después de su fondo, para quedar fuera de
  // `ESCALA_NEUTRA`.
  '--ws-on-link',
  '--ws-focus-ring',
  '--ws-topbar',
  '--ws-on-topbar',
  // Error y alerta (ADR-0019): los calcula el tema, fuera de `ESCALA_NEUTRA`.
  '--ws-danger',
  '--ws-danger-soft',
  '--ws-danger-line',
  '--ws-warning',
  '--ws-warning-soft',
  // Lienzo de la tienda (ADR-0013): justo antes de `--ws-bg`, para quedar fuera de `ESCALA_NEUTRA`.
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
const ESCALA_NEUTRA: readonly NombreToken[] = TOKENS_DEL_TEMA.slice(TOKENS_DEL_TEMA.indexOf('--ws-bg'));

const CAMPOS_DE_COLOR: readonly CampoDeColor[] = [
  'primary',
  'secondary',
  'background',
  'surface',
  'contrast',
];

const BLANCO = '#FFFFFF';
const TEXTO_MINIMO = 4.5;
const INTERFAZ_MINIMO = 3;

const mismoColor = (a: string, b: string): boolean => String(a).toUpperCase() === String(b).toUpperCase();

/** La mezcla tal como la escribe el BFF: `color-mix()` con colores literales, que el navegador calcula igual. */
const mezcla = (a: string, porcentaje: number, b: string): string =>
  `color-mix(in srgb, ${a} ${porcentaje}%, ${b})`;

function basePredefinida(colores: ColoresTema, predefinidos: Predefinidos) {
  return predefinidos.find(({ colors }) =>
    (['background', 'surface', 'contrast'] as const).every((campo) =>
      mismoColor(colors[campo], colores[campo]),
    ),
  );
}

function escalaNeutraDerivada({
  primary: P,
  background: F,
  surface: Sf,
  contrast: C,
}: ColoresTema): Partial<Record<NombreToken, string>> {
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
const AVISOS = {
  danger: { claro: '#B42318', suave: '#FEF3F2', linea: '#FECDCA', oscuro: '#FDA29B' },
  warning: { claro: '#8A4B08', suave: '#FFF6E5', oscuro: '#FEC84B' },
} as const;

/** Contraste del color con el peor de los fondos sobre los que se escribe (el fondo principal y la superficie). */
const legibilidadSobre = (color: string, fondos: readonly string[]): number =>
  Math.min(...fondos.map((fondo) => relacionDeContraste(color, fondo)));

/**
 * El error y la alerta: la variante cuyo texto se lee mejor sobre el fondo principal y la superficie del tema.
 * Sobre fondos claros, la de hoy; sobre fondos oscuros, la clara, con su fondo suave y su línea mezclados con la
 * superficie.
 */
function tokensDeAviso({ background: F, surface: Sf }: ColoresTema): Partial<Record<NombreToken, string>> {
  const variante = ({ claro, oscuro }: { readonly claro: string; readonly oscuro: string }): string =>
    legibilidadSobre(claro, [F, Sf]) >= legibilidadSobre(oscuro, [F, Sf]) ? claro : oscuro;
  const peligro = variante(AVISOS.danger);
  const alerta = variante(AVISOS.warning);
  const peligroClaro = peligro === AVISOS.danger.claro;
  const alertaClara = alerta === AVISOS.warning.claro;
  return {
    '--ws-danger': peligro,
    '--ws-danger-soft': peligroClaro ? AVISOS.danger.suave : mezcla(peligro, 12, Sf),
    '--ws-danger-line': peligroClaro ? AVISOS.danger.linea : mezcla(peligro, 40, Sf),
    '--ws-warning': alerta,
    '--ws-warning-soft': alertaClara ? AVISOS.warning.suave : mezcla(alerta, 12, Sf),
  };
}

/**
 * Borde del acento (ADR-0023, PBI-0189): el secundario si llega a 3:1 sobre el fondo principal y la superficie
 * (WCAG 1.4.11); si no, su primera mezcla con el contraste, de 10 en 10 %, que llega; en último caso, el contraste.
 */
function bordeDelAcento(S: string, F: string, Sf: string, C: string): string {
  for (let peso = 100; peso > 0; peso -= 10) {
    const color = peso === 100 ? S : mezclarSrgb(S, peso / 100, C);
    if (legibilidadSobre(color, [F, Sf]) >= INTERFAZ_MINIMO) return peso === 100 ? S : mezcla(S, peso, C);
  }
  return C;
}

function tokensDeMarca({
  primary: P,
  secondary: S,
  background: F,
  surface: Sf,
  contrast: C,
}: ColoresTema): Partial<Record<NombreToken, string>> {
  // El más legible entre el blanco, el contraste y la superficie (ADR-0019): con un principal muy claro sobre una
  // base oscura, el blanco y el contraste son claros y solo la superficie se lee. A y C lo fijan con su literal.
  const sobrePrincipal = textoMasLegible(P, [BLANCO, C, Sf]);
  const pesoFuerte = mismoColor(sobrePrincipal, BLANCO) ? 62 : 88;
  const fuerteLegible =
    relacionDeContraste(sobrePrincipal, mezclarSrgb(P, pesoFuerte / 100, C)) >= TEXTO_MINIMO;
  const principalFuerte = fuerteLegible ? mezcla(P, pesoFuerte, C) : P;
  const colorFuerte = fuerteLegible ? mezclarSrgb(P, pesoFuerte / 100, C) : P;
  const legibleSobreFondos = (minimo: number): boolean =>
    relacionDeContraste(P, F) >= minimo && relacionDeContraste(P, Sf) >= minimo;
  const enlace = legibleSobreFondos(TEXTO_MINIMO) ? P : C;
  // Como el texto sobre el principal (ADR-0019): sobre un acento claro en una base oscura, solo la superficie se lee.
  const sobreAcento = textoMasLegible(S, [BLANCO, C, Sf]);
  // Como el principal fuerte: si el texto sobre el acento no llega a 4.5:1 sobre la mezcla (el botón secundario con
  // el puntero encima), el acento fuerte es el acento (ADR-0023).
  const acentoFuerte =
    relacionDeContraste(sobreAcento, mezclarSrgb(S, 0.78, C)) >= TEXTO_MINIMO ? mezcla(S, 78, C) : S;
  return {
    '--ws-primary': P,
    '--ws-primary-strong': principalFuerte,
    '--ws-primary-soft': mezcla(P, 10, Sf),
    '--ws-on-primary': sobrePrincipal,
    '--ws-on-primary-soft':
      relacionDeContraste(colorFuerte, mezclarSrgb(P, 0.1, Sf)) >= TEXTO_MINIMO ? principalFuerte : C,
    '--ws-accent': S,
    '--ws-accent-strong': acentoFuerte,
    '--ws-accent-soft': mezcla(S, 9, Sf),
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
export function tokensDelTema(entrada: ColoresTema, predefinidos: Predefinidos = []): TokensTema {
  const colores = Object.fromEntries(
    CAMPOS_DE_COLOR.map((campo) => [campo, String(entrada[campo]).toUpperCase()]),
  ) as unknown as ColoresTema;
  const base = basePredefinida(colores, predefinidos);
  const neutra: Partial<Record<NombreToken, string>> = base
    ? Object.fromEntries(ESCALA_NEUTRA.map((nombre) => [nombre, base.tokens[nombre]]))
    : escalaNeutraDerivada(colores);
  const tokens = {
    ...tokensDeMarca(colores),
    ...tokensDeAviso(colores),
    '--ws-store-bg': colores.background,
    ...neutra,
  };
  return Object.freeze(
    Object.fromEntries(TOKENS_DEL_TEMA.map((nombre) => [nombre, tokens[nombre]])),
  ) as TokensTema;
}

const VARIABLE = /^var\((--[\w-]+)\)$/;
const MEZCLA_SRGB = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/;
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Color `#RRGGBB` que pinta el navegador para cada token: resuelve `var()` entre tokens del mapa y
 * `color-mix(in srgb, …)` con la misma cuenta. Sirve para medir el contraste de un mapa literal, como el de B.
 */
export function coloresCalculados(tokens: ValoresDeToken): Record<string, string> {
  const calculados: Record<string, string> = {};
  const enCurso = new Set<string>();
  const resolverToken = (nombre: string): string => {
    if (calculados[nombre]) return calculados[nombre];
    if (!(nombre in tokens) || enCurso.has(nombre)) throw new Error(`Token sin valor calculable: ${nombre}`);
    enCurso.add(nombre);
    calculados[nombre] = resolver(tokens[nombre]);
    enCurso.delete(nombre);
    return calculados[nombre];
  };
  const resolver = (valor: string): string => {
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

interface DefinicionDePar {
  readonly par: ParContraste['par'];
  readonly texto: NombreToken;
  readonly fondo: NombreToken;
  readonly minimo: ParContraste['minimo'];
  readonly bloquea: boolean;
}

/** Pares de texto y fondo que se miden en cada tema, con el token de primer plano, el de fondo y su mínimo. */
export const PARES_DE_CONTRASTE: readonly DefinicionDePar[] = Object.freeze<DefinicionDePar[]>([
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
]);

/** Relación de contraste, sin redondear, de cada par de `PARES_DE_CONTRASTE` en un mapa de tokens. */
export function medirPares(tokens: ValoresDeToken): Record<string, number> {
  const colores = coloresCalculados(tokens);
  return Object.fromEntries(
    PARES_DE_CONTRASTE.map(({ par, texto, fondo }) => [
      par,
      relacionDeContraste(colores[texto], colores[fondo]),
    ]),
  );
}

/**
 * Revisión de contraste de un tema (AC-14, D7): los 27 pares de `PARES_DE_CONTRASTE`, en ese orden, medidos
 * sobre los tokens que derivan de sus cinco colores. `bloquea` dice si ese par impide guardar cuando queda
 * bajo su mínimo y no depende de la medida.
 *
 * La relación se redondea a un decimal hacia abajo, no al más cercano: así un par que no llega a su mínimo
 * nunca se muestra con una cifra igual o mayor que él (4.47 se informa como 4.4, no como 4.5) y comparar
 * `relacion < minimo` da el mismo resultado que con el valor exacto.
 */
export function revisarContraste(
  colores: ColoresTema,
  predefinidos: Predefinidos = [],
): readonly ParContraste[] {
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

const LARGO_MAXIMO_DEL_NOMBRE = 40;

/** Caracteres que no se ven: de control (Cc) y de formato, como los de ancho cero o de dirección (Cf). */
const INVISIBLES = /[\p{Cc}\p{Cf}]/u;

/**
 * Clave con la que se comparan los nombres, como en el BFF (PBI-0069): dos nombres que se ven iguales tienen la misma
 * clave. Une las formas Unicode equivalentes (NFKC), quita lo invisible, junta los espacios y no distingue mayúsculas.
 */
const claveDelNombre = (nombre: string): string =>
  String(nombre)
    .normalize('NFKC')
    .replace(new RegExp(INVISIBLES.source, 'gu'), '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('es');

/** Resultado de validar el nombre de un tema: el nombre recortado, o el código y el mensaje del rechazo. */
export type ValidacionNombreTema =
  | { readonly valido: true; readonly nombre: string }
  | {
      readonly valido: false;
      readonly codigo: 'INVALID_THEME_NAME' | 'THEME_NAME_TAKEN';
      readonly mensaje: string;
    };

/**
 * Valida el nombre de un tema con las reglas del BFF: sin caracteres invisibles, de 1 a 40 caracteres tras
 * recortarlo y distinto a la vista de los demás (sin distinguir mayúsculas, espacios ni formas Unicode equivalentes). `nombresExistentes` son los nombres de los predefinidos y de los temas propios,
 * sin el del tema que se edita.
 */
export function validarNombreTema(
  nombre: string,
  nombresExistentes: readonly string[],
): ValidacionNombreTema {
  const recortado = String(nombre ?? '').trim();
  if (INVISIBLES.test(recortado))
    return {
      valido: false,
      codigo: 'INVALID_THEME_NAME',
      mensaje: 'El nombre del tema no puede llevar caracteres invisibles.',
    };
  if (recortado.length === 0 || recortado.length > LARGO_MAXIMO_DEL_NOMBRE)
    return {
      valido: false,
      codigo: 'INVALID_THEME_NAME',
      mensaje: `El nombre del tema debe tener entre 1 y ${LARGO_MAXIMO_DEL_NOMBRE} caracteres.`,
    };
  const clave = claveDelNombre(recortado);
  if (nombresExistentes.some((existente) => claveDelNombre(existente) === clave))
    return { valido: false, codigo: 'THEME_NAME_TAKEN', mensaje: 'Ya existe un tema con ese nombre.' };
  return { valido: true, nombre: recortado };
}
