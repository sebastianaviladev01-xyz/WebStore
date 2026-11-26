import { revisarContraste } from './tema.rules';
import type { ColoresTema, ParContraste, Tema } from './tema.model';

/**
 * Lote 47 (ADR-0033, PBI-0267): lo que «Revisión de contraste» dice de cada par que no llega a su mínimo. Daniel no
 * entendía «1.4:1» ni «4.5:1»: «tiene que ir con sugerencia», «que sea explicativo, informativo para el usuario». Cada
 * par dice dónde se ve y propone el color más cercano al elegido que lo hace llegar, aclarándolo u oscureciéndolo y
 * conservando su tono. La regla no cambia: lo que bloquea y lo que solo avisa siguen en `tema.rules.ts`, que es la
 * réplica del BFF; esto solo lo explica.
 *
 * Funciones puras, sin I/O. La prueba transpila este archivo con `tema.rules.ts` delante y borra sus líneas `import`: por
 * eso los nombres de aquí no repiten los de allí.
 */

type NombreDelPar = ParContraste['par'];
type CampoEditable = keyof ColoresTema;
type TemasDeBase = readonly Pick<Tema, 'colors' | 'tokens'>[];

/**
 * El color editable que se corrige para cada par: el del texto si sale de él (el contraste y sus mezclas), el del relleno
 * si el texto se elige solo entre el blanco, el contraste y la superficie (el principal y el secundario), y el fondo si lo
 * que se escribe tiene color fijo (el error y la alerta).
 */
export const CAMPO_DEL_PAR: Readonly<Record<NombreDelPar, CampoEditable>> = Object.freeze({
  'contrast/background': 'contrast',
  'contrast/surface': 'contrast',
  'muted/background': 'contrast',
  'muted/surface': 'contrast',
  'onPrimary/primary': 'primary',
  'onPrimary/primaryStrong': 'primary',
  'onPrimarySoft/primarySoft': 'primary',
  'onAccent/accent': 'secondary',
  // El enlace y el foco son el principal si se lee sobre los fondos; si no, el contraste, que es el que no llega.
  'link/background': 'contrast',
  'link/surface': 'contrast',
  'focusRing/background': 'contrast',
  'focusRing/surface': 'contrast',
  'footerText/footer': 'contrast',
  'onTopbar/topbar': 'primary',
  'disabledText/disabled': 'contrast',
  'contrast/storeBackground': 'contrast',
  'muted/storeBackground': 'contrast',
  'link/storeBackground': 'contrast',
  'focusRing/storeBackground': 'contrast',
  'borderStrong/surface': 'contrast',
  'onLink/link': 'primary',
  'danger/background': 'background',
  'danger/surface': 'surface',
  'danger/dangerSoft': 'surface',
  'warning/background': 'background',
  'warning/surface': 'surface',
  'warning/warningSoft': 'surface',
  // El secundario suave es el secundario al 20 % sobre la superficie: lo que lo tiñe es el secundario.
  'contrast/accentSoft': 'secondary',
  'muted/accentSoft': 'secondary',
});

/** Dónde se ve cada par, en palabras de quien edita la tienda; sigue a «Se ve en». */
export const DONDE_SE_VE_EL_PAR: Readonly<Record<NombreDelPar, string>> = Object.freeze({
  'contrast/background': 'los textos y los titulares sobre el fondo principal',
  'contrast/surface': 'los textos de las tarjetas, los formularios y la cabecera',
  'muted/background': 'las descripciones y las ayudas sobre el fondo principal',
  'muted/surface': 'las descripciones y las ayudas de las tarjetas y los formularios',
  'onPrimary/primary': 'el texto de los botones principales',
  'onPrimary/primaryStrong': 'el texto de los botones principales con el puntero encima',
  'onPrimarySoft/primarySoft': 'el texto de los avisos de confirmación y del elemento activo de los menús',
  'onAccent/accent': 'el texto de los botones secundarios, las ofertas y el contador del carrito',
  'link/background': 'los enlaces sobre el fondo principal',
  'link/surface': 'los enlaces de las tarjetas y los formularios',
  'focusRing/background': 'el contorno que marca dónde está el teclado, sobre el fondo principal',
  'focusRing/surface': 'el contorno que marca dónde está el teclado, en las tarjetas y los formularios',
  'footerText/footer': 'el texto del pie de página',
  'onTopbar/topbar': 'el texto de la franja de avisos de la tienda',
  'disabledText/disabled': 'el texto de los botones deshabilitados',
  'contrast/storeBackground': 'los textos y los titulares de la tienda',
  'muted/storeBackground': 'las descripciones y las ayudas de la tienda',
  'link/storeBackground': 'los enlaces de la tienda',
  'focusRing/storeBackground': 'el contorno que marca dónde está el teclado, en la tienda',
  'borderStrong/surface': 'el borde de los campos',
  'onLink/link': 'la marca de las casillas y los controles marcados',
  'danger/background': 'los mensajes de error sobre el fondo principal',
  'danger/surface': 'los mensajes de error de las tarjetas y los formularios',
  'danger/dangerSoft': 'los mensajes de error dentro de su recuadro',
  'warning/background': 'las alertas sobre el fondo principal',
  'warning/surface': 'las alertas de las tarjetas y los formularios',
  'warning/warningSoft': 'las alertas dentro de su recuadro',
  'contrast/accentSoft': 'el texto de los menús con el puntero encima',
  'muted/accentSoft': 'las descripciones de los menús con el puntero encima',
});

/**
 * Lo que se propone para un par que no llega: un color para su campo, o por qué no hay ninguno. `imposible`: ni
 * aclarando ni oscureciendo el campo llega al mínimo. `bloquearia`: llega, pero cada color que lo hace impide guardar el
 * tema (crea un bloqueo que no había).
 */
export type SugerenciaDeColor =
  | {
      readonly tipo: 'color';
      readonly campo: CampoEditable;
      readonly color: string;
      readonly sentido: 'aclarar' | 'oscurecer';
    }
  | { readonly tipo: 'imposible'; readonly campo: CampoEditable }
  | { readonly tipo: 'bloquearia'; readonly campo: CampoEditable };

/** Tono (0 a 360), saturación y luminosidad (0 a 1) HSL. */
type Hsl = readonly [number, number, number];

function hexAHsl(color: string): Hsl {
  const [r, g, b] = [1, 3, 5].map((inicio) => parseInt(color.slice(inicio, inicio + 2), 16) / 255);
  const mayor = Math.max(r, g, b);
  const menor = Math.min(r, g, b);
  const l = (mayor + menor) / 2;
  if (mayor === menor) return [0, 0, l];
  const d = mayor - menor;
  const s = l > 0.5 ? d / (2 - mayor - menor) : d / (mayor + menor);
  const h = mayor === r ? (g - b) / d + (g < b ? 6 : 0) : mayor === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslAHex([h, s, l]: Hsl): string {
  const a = s * Math.min(l, 1 - l);
  const canal = (n: number): string => {
    const k = (n + h / 30) % 12;
    const valor = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(valor * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${canal(0)}${canal(8)}${canal(4)}`.toUpperCase();
}

/** Paso de la búsqueda en luminosidad (1 %) y vueltas del ajuste fino entre el último que no sirve y el primero que sí. */
const PASO_DE_LUMINOSIDAD = 0.01;
const VUELTAS_DEL_AJUSTE = 7;

const bloqueosDe = (pares: readonly ParContraste[]): Set<NombreDelPar> =>
  new Set(
    pares.filter(({ bloquea, relacion, minimo }) => bloquea && relacion < minimo).map(({ par }) => par),
  );

/**
 * Sugerencias para cada par que no llega a su mínimo, por su nombre; los que llegan no aparecen. Cada búsqueda mide el
 * tema con el campo cambiado; las medidas se guardan por campo y color, porque varios pares comparten campo.
 */
export function sugerirColores(
  colores: ColoresTema,
  predefinidos: TemasDeBase = [],
): Readonly<Partial<Record<NombreDelPar, SugerenciaDeColor>>> {
  const actuales = revisarContraste(colores, predefinidos);
  const bloqueosActuales = bloqueosDe(actuales);
  const medidas = new Map<string, readonly ParContraste[]>();
  const medir = (campo: CampoEditable, color: string): readonly ParContraste[] => {
    const clave = `${campo}${color}`;
    let pares = medidas.get(clave);
    if (!pares) {
      pares = revisarContraste({ ...colores, [campo]: color }, predefinidos);
      medidas.set(clave, pares);
    }
    return pares;
  };
  const resultado: Partial<Record<NombreDelPar, SugerenciaDeColor>> = {};
  for (const { par, relacion, minimo } of actuales) {
    if (relacion >= minimo) continue;
    resultado[par] = buscar(colores, par, bloqueosActuales, medir);
  }
  return Object.freeze(resultado);
}

/** La sugerencia para un par; `null` si el par ya llega a su mínimo. */
export function sugerirColor(
  colores: ColoresTema,
  par: NombreDelPar,
  predefinidos: TemasDeBase = [],
): SugerenciaDeColor | null {
  return sugerirColores(colores, predefinidos)[par] ?? null;
}

/**
 * El color más cercano al del campo, en luminosidad HSL y con el mismo tono y saturación, que hace llegar el par a su
 * mínimo (con la cifra redondeada hacia abajo, como la muestra la revisión) sin crear un bloqueo nuevo. Recorre la
 * luminosidad de 1 en 1 % hacia el blanco y hacia el negro; en cada sentido, el primero que sirve se afina entre él y el
 * anterior. Si un color llega pero crearía un bloqueo, sigue con el siguiente. Gana el sentido que menos se aleja.
 */
function buscar(
  colores: ColoresTema,
  par: NombreDelPar,
  bloqueosActuales: ReadonlySet<NombreDelPar>,
  medir: (campo: CampoEditable, color: string) => readonly ParContraste[],
): SugerenciaDeColor {
  const campo = CAMPO_DEL_PAR[par];
  const [h, s, l] = hexAHsl(colores[campo]);
  let alguno = false;
  const evaluar = (luminosidad: number): { color: string; sirve: boolean } => {
    const color = hslAHex([h, s, luminosidad]);
    const pares = medir(campo, color);
    const medida = pares.find((p) => p.par === par);
    const llega = !!medida && medida.relacion >= medida.minimo;
    if (llega) alguno = true;
    const sirve = llega && [...bloqueosDe(pares)].every((bloqueo) => bloqueosActuales.has(bloqueo));
    return { color, sirve };
  };
  /** Entre el último que no sirve (`cerca`) y el primero que sí (`lejos`), el que sirve más cerca del original. */
  const afinar = (cerca: number, lejos: number, color: string) => {
    let elegido = color;
    for (let vuelta = 0; vuelta < VUELTAS_DEL_AJUSTE; vuelta++) {
      const medio = (lejos + cerca) / 2;
      const intento = evaluar(medio);
      if (intento.sirve) {
        lejos = medio;
        elegido = intento.color;
      } else cerca = medio;
    }
    return { color: elegido, distancia: Math.abs(lejos - l) };
  };
  // Los dos sentidos avanzan a la par: en cuanto uno encuentra un color que sirve, el otro ya no puede quedar más cerca
  // que el paso en que va.
  const sentidos = [
    { signo: 1, sentido: 'aclarar' as const, anterior: l, activo: true },
    { signo: -1, sentido: 'oscurecer' as const, anterior: l, activo: true },
  ];
  for (let paso = 1; sentidos.some(({ activo }) => activo); paso++) {
    const hallados: { color: string; distancia: number; sentido: 'aclarar' | 'oscurecer' }[] = [];
    for (const actual of sentidos) {
      if (!actual.activo) continue;
      const luminosidad = Math.min(1, Math.max(0, l + actual.signo * paso * PASO_DE_LUMINOSIDAD));
      const prueba = evaluar(luminosidad);
      if (prueba.sirve) {
        hallados.push({ ...afinar(actual.anterior, luminosidad, prueba.color), sentido: actual.sentido });
        continue;
      }
      if (luminosidad === 0 || luminosidad === 1) actual.activo = false;
      actual.anterior = luminosidad;
    }
    if (hallados.length) {
      const mejor = hallados.reduce((a, b) => (b.distancia < a.distancia ? b : a));
      return { tipo: 'color', campo, color: mejor.color, sentido: mejor.sentido };
    }
  }
  return { tipo: alguno ? 'bloquearia' : 'imposible', campo };
}
