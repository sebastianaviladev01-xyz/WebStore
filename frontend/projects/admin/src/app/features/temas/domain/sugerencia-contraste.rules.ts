import { revisarContraste } from './tema.rules';
import type { ColoresTema, ParContraste, Tema } from './tema.model';

/**
 * Lote 47 (ADR-0033, PBI-0267): lo que «Revisión de contraste» dice de cada par que no llega a su mínimo. Daniel no
 * entendía «1.4:1» ni «4.5:1»: «tiene que ir con sugerencia», «que sea explicativo, informativo para el usuario». Cada
 * par dice dónde se ve y con qué color editable se corrige; por cada color, una sola sugerencia: el más cercano al
 * elegido que hace llegar todos los pares que dependen de él, aclarándolo u oscureciéndolo y conservando su tono (en la
 * revisión del lote, ocho botones para el mismo color confundían). La regla no cambia: lo que bloquea y lo que solo avisa siguen en `tema.rules.ts`, que es la
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
  // Sobre el secundario suave (el secundario al 20 % sobre la superficie) se escribe con el contraste, que no se elige
  // solo: se corrige el contraste, no el secundario, que es un color de marca (lote 47, revisión de la cadena).
  'contrast/accentSoft': 'contrast',
  'muted/accentSoft': 'contrast',
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
 * Lo que se propone para un color editable con pares que no llegan (`pares`, en el orden de la revisión): una sola
 * sugerencia por color, no una por par.
 * - `color`: el color, los pares suyos que hace llegar (`corrige`: todos, o los más que se puede) y todos los que arregla,
 *   de cualquier color (`arregla`: el texto sobre el secundario suave también depende del contraste).
 * - `imposible`: ni aclarando ni oscureciendo llega ninguno.
 * - `bloquearia`: alguno llegaría, pero cada color que lo hace impide guardar el tema (crea un bloqueo que no había).
 * - `empeoraria`: alguno llegaría, pero cada color que lo hace deja sin llegar otro par que sí llegaba.
 */
export type SugerenciaDeColor =
  | {
      readonly tipo: 'color';
      readonly campo: CampoEditable;
      readonly pares: readonly NombreDelPar[];
      readonly color: string;
      readonly sentido: 'aclarar' | 'oscurecer';
      readonly corrige: readonly NombreDelPar[];
      readonly arregla: readonly NombreDelPar[];
    }
  | {
      readonly tipo: 'imposible' | 'bloquearia' | 'empeoraria';
      readonly campo: CampoEditable;
      readonly pares: readonly NombreDelPar[];
    };

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

/** Paso de la búsqueda en luminosidad (2 %) y vueltas del ajuste fino entre el último que no sirve y el primero que sí. */
const PASO_DE_LUMINOSIDAD = 0.02;
const VUELTAS_DEL_AJUSTE = 8;

/** Los colores editables en el orden del formulario: a igualdad, la cadena sigue este orden. */
const ORDEN_DE_LOS_CAMPOS: readonly CampoEditable[] = [
  'primary',
  'secondary',
  'background',
  'surface',
  'contrast',
];

const bajoSuMinimo = (pares: readonly ParContraste[]): NombreDelPar[] =>
  pares.filter(({ relacion, minimo }) => relacion < minimo).map(({ par }) => par);
const bloqueosDe = (pares: readonly ParContraste[]): Set<NombreDelPar> =>
  new Set(
    pares.filter(({ bloquea, relacion, minimo }) => bloquea && relacion < minimo).map(({ par }) => par),
  );

/** La sugerencia para un color editable; `null` si ninguno de sus pares queda bajo su mínimo. */
export function sugerirColor(
  colores: ColoresTema,
  campo: CampoEditable,
  predefinidos: TemasDeBase = [],
): SugerenciaDeColor | null {
  const actuales = revisarContraste(colores, predefinidos);
  const pares = bajoSuMinimo(actuales).filter((par) => CAMPO_DEL_PAR[par] === campo);
  if (!pares.length) return null;
  return buscar(colores, campo, Object.freeze(pares), actuales, predefinidos);
}

/**
 * Las sugerencias en cadena (lote 47, PBI-0267): primero, la del color que arregla más pares (a igualdad, en el orden
 * del formulario); después, con esa ya aplicada, se vuelve a mirar qué pares siguen sin llegar y se sigue igual. Un color
 * cuyos pares ya arregló una sugerencia anterior no aparece: no se pide cambiar un color de marca sin necesidad. Los que
 * no tienen color posible van al final. Sin pares que no lleguen, ninguna.
 */
export function sugerirColores(
  colores: ColoresTema,
  predefinidos: TemasDeBase = [],
): readonly SugerenciaDeColor[] {
  const cadena: SugerenciaDeColor[] = [];
  const pendientes = new Set(ORDEN_DE_LOS_CAMPOS);
  let actuales = colores;
  for (;;) {
    const candidatas = ORDEN_DE_LOS_CAMPOS.filter((campo) => pendientes.has(campo))
      .map((campo) => sugerirColor(actuales, campo, predefinidos))
      .filter((sugerencia): sugerencia is SugerenciaDeColor => sugerencia !== null);
    const conColor = candidatas.filter((sugerencia) => sugerencia.tipo === 'color');
    if (!conColor.length) {
      cadena.push(...candidatas);
      break;
    }
    const mejor = conColor.reduce((a, b) => (b.arregla.length > a.arregla.length ? b : a));
    cadena.push(mejor);
    pendientes.delete(mejor.campo);
    actuales = { ...actuales, [mejor.campo]: mejor.color };
  }
  return Object.freeze(cadena);
}

/**
 * El color más cercano al del campo, en luminosidad HSL y con el mismo tono y saturación, que hace llegar a su mínimo
 * (con la cifra redondeada hacia abajo, como la muestra la revisión) todos los pares del campo sin crear un bloqueo
 * nuevo ni dejar sin llegar un par que llegaba. Si ninguno los hace llegar todos, el que hace llegar más y, entre esos,
 * el más cercano.
 *
 * Recorre la luminosidad de 2 en 2 % hacia el blanco y hacia el negro a la par, hasta que un paso los hace llegar todos o
 * hasta los extremos. El más cercano de los que hacen llegar más se afina entre él y el paso anterior, que hacía llegar
 * menos.
 */
function buscar(
  colores: ColoresTema,
  campo: CampoEditable,
  pares: readonly NombreDelPar[],
  actuales: readonly ParContraste[],
  predefinidos: TemasDeBase,
): SugerenciaDeColor {
  const [h, s, l] = hexAHsl(colores[campo]);
  const bloqueosActuales = bloqueosDe(actuales);
  const noLlegaban = new Set(bajoSuMinimo(actuales));
  interface Medida {
    readonly color: string;
    readonly corrige: readonly NombreDelPar[];
    readonly arregla: readonly NombreDelPar[];
  }
  const medidas = new Map<string, Medida>();
  let llegaAlguno = false;
  let llegaSinBloquear = false;
  /** Los pares que hace llegar un color, o ninguno si crearía un bloqueo o dejaría sin llegar un par que llegaba. */
  const evaluar = (luminosidad: number): Medida => {
    const color = hslAHex([h, s, luminosidad]);
    let medida = medidas.get(color);
    if (!medida) {
      const despues = revisarContraste({ ...colores, [campo]: color }, predefinidos);
      const noLlegan = new Set(bajoSuMinimo(despues));
      const llegan = pares.filter((par) => !noLlegan.has(par));
      const sinBloqueosNuevos = [...bloqueosDe(despues)].every((bloqueo) => bloqueosActuales.has(bloqueo));
      const sinPeores = [...noLlegan].every((par) => noLlegaban.has(par));
      if (llegan.length) llegaAlguno = true;
      if (llegan.length && sinBloqueosNuevos) llegaSinBloquear = true;
      medida =
        sinBloqueosNuevos && sinPeores
          ? { color, corrige: llegan, arregla: [...noLlegaban].filter((par) => !noLlegan.has(par)) }
          : { color, corrige: [], arregla: [] };
      medidas.set(color, medida);
    }
    return medida;
  };

  interface Punto extends Medida {
    readonly luminosidad: number;
    readonly anterior: number;
    readonly paso: number;
    readonly sentido: 'aclarar' | 'oscurecer';
  }
  const puntos: Punto[] = [];
  const sentidos = [
    { signo: 1, sentido: 'aclarar' as const, anterior: l, activo: true },
    { signo: -1, sentido: 'oscurecer' as const, anterior: l, activo: true },
  ];
  for (let paso = 1; sentidos.some(({ activo }) => activo); paso++) {
    let todos = false;
    for (const actual of sentidos) {
      if (!actual.activo) continue;
      const luminosidad = Math.min(1, Math.max(0, l + actual.signo * paso * PASO_DE_LUMINOSIDAD));
      const medida = evaluar(luminosidad);
      puntos.push({ ...medida, luminosidad, anterior: actual.anterior, paso, sentido: actual.sentido });
      if (medida.corrige.length === pares.length) todos = true;
      if (luminosidad === 0 || luminosidad === 1) actual.activo = false;
      actual.anterior = luminosidad;
    }
    // Lo que queda por recorrer está más lejos: no puede ganar a uno que los hace llegar todos.
    if (todos) break;
  }

  const mejor = Math.max(0, ...puntos.map(({ corrige }) => corrige.length));
  if (mejor === 0) {
    const tipo = llegaSinBloquear ? 'empeoraria' : llegaAlguno ? 'bloquearia' : 'imposible';
    return { tipo, campo, pares };
  }
  const primerPaso = Math.min(
    ...puntos.filter(({ corrige }) => corrige.length === mejor).map(({ paso }) => paso),
  );
  const afinados = puntos
    .filter(({ corrige, paso }) => corrige.length === mejor && paso === primerPaso)
    .map((punto) => {
      // Entre el paso anterior (`cerca`, hace llegar menos) y este (`lejos`), el más cercano que hace llegar tantos.
      let cerca = punto.anterior;
      let lejos = punto.luminosidad;
      let elegido: Medida = punto;
      for (let vuelta = 0; vuelta < VUELTAS_DEL_AJUSTE; vuelta++) {
        const medio = (lejos + cerca) / 2;
        const intento = evaluar(medio);
        if (intento.corrige.length >= mejor) {
          lejos = medio;
          elegido = intento;
        } else cerca = medio;
      }
      return { ...elegido, sentido: punto.sentido, distancia: Math.abs(lejos - l) };
    });
  const elegido = afinados.reduce((a, b) => (b.distancia < a.distancia ? b : a));
  return {
    tipo: 'color',
    campo,
    pares,
    color: elegido.color,
    sentido: elegido.sentido,
    corrige: elegido.corrige,
    arregla: elegido.arregla,
  };
}
