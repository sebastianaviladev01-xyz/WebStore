import { DomainError } from '../comun/domain-error.mjs';
import { revisarContraste } from './tema.rules.mjs';
import { TEMAS_PREDEFINIDOS } from './temas-predefinidos.mjs';

/**
 * Reglas de los temas propios: validan lo que llega del cliente y comprueban que un tema se puede editar o
 * borrar. Viven aparte de `tema.rules.mjs` porque `temas-predefinidos.mjs` llama a `tokensDelTema` al cargarse:
 * si `tema.rules.mjs` importara los predefinidos se formaría un ciclo de módulos.
 */

const CAMPOS_DE_COLOR = Object.freeze(['primary', 'secondary', 'background', 'surface', 'contrast']);
const LARGO_MAXIMO_DEL_NOMBRE = 40;
const COLOR_HEX = /^#[0-9a-f]{6}$/i;

/** Caracteres que no se ven: de control (Cc) y de formato, como los de ancho cero o de dirección (Cf). */
const INVISIBLES = /[\p{Cc}\p{Cf}]/u;

/**
 * Clave con la que se comparan los nombres (PBI-0069): dos nombres que se ven iguales tienen la misma clave. Une
 * las formas Unicode equivalentes (NFKC: «Á» compuesta o con tilde combinada, letras de ancho completo, espacio
 * duro), quita lo invisible, junta los espacios seguidos y no distingue mayúsculas.
 */
const claveDelNombre = (nombre) =>
  String(nombre)
    .normalize('NFKC')
    .replace(new RegExp(INVISIBLES.source, 'gu'), '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('es');

function exigirNombreValido(entrada) {
  const nombre = String(entrada?.name ?? '').trim();
  if (INVISIBLES.test(nombre))
    throw new DomainError(
      'validation',
      'INVALID_THEME_NAME',
      'El nombre del tema no puede llevar caracteres invisibles.',
    );
  if (nombre.length === 0 || nombre.length > LARGO_MAXIMO_DEL_NOMBRE)
    throw new DomainError(
      'validation',
      'INVALID_THEME_NAME',
      `El nombre del tema debe tener entre 1 y ${LARGO_MAXIMO_DEL_NOMBRE} caracteres.`,
    );
  return nombre;
}

function exigirNombreLibre(nombre, temasPropios) {
  const clave = claveDelNombre(nombre);
  const repetido = [...TEMAS_PREDEFINIDOS, ...temasPropios].some(
    (tema) => claveDelNombre(tema.name) === clave,
  );
  if (repetido) throw new DomainError('conflict', 'THEME_NAME_TAKEN', 'Ya existe un tema con ese nombre.');
}

function exigirColoresValidos(entrada) {
  return Object.fromEntries(
    CAMPOS_DE_COLOR.map((campo) => {
      const valor = entrada?.colors?.[campo];
      if (typeof valor !== 'string' || !COLOR_HEX.test(valor))
        throw new DomainError(
          'validation',
          'INVALID_THEME_COLOR',
          'Elige un color válido en formato #RRGGBB.',
          {
            field: campo,
          },
        );
      return [campo, valor.toUpperCase()];
    }),
  );
}

function exigirContrasteLegible(colores) {
  const pares = revisarContraste(colores, TEMAS_PREDEFINIDOS)
    .filter(({ bloquea, relacion, minimo }) => bloquea && relacion < minimo)
    .map(({ par, relacion, minimo }) => ({ pair: par, ratio: relacion, minimum: minimo }));
  if (pares.length > 0)
    throw new DomainError(
      'validation',
      'INSUFFICIENT_THEME_CONTRAST',
      'El color de contraste no se lee bien sobre los fondos.',
      { pairs: pares },
    );
}

/**
 * Valida el nombre y los colores de un tema propio, tal como llegan del cliente, y devuelve `{ name, colors }`
 * normalizados (nombre recortado, colores en mayúsculas) sin mutar la entrada. Lanza el primer error en este
 * orden: nombre, nombre repetido, colores y contraste. `temasPropios` son los temas contra los que el nombre
 * debe ser único; quien edita un tema quita de la lista el que edita.
 */
export function exigirTemaValido(entrada, temasPropios) {
  const name = exigirNombreValido(entrada);
  exigirNombreLibre(name, temasPropios);
  const colors = exigirColoresValidos(entrada);
  exigirContrasteLegible(colors);
  return { name, colors };
}

/** Devuelve el tema propio `id`; un predefinido es de solo lectura y un id desconocido no existe. */
export function exigirTemaPropio(id, temasPropios) {
  if (TEMAS_PREDEFINIDOS.some((tema) => tema.id === id))
    throw new DomainError(
      'conflict',
      'PREDEFINED_THEME_READ_ONLY',
      'Los temas predefinidos no se editan ni se borran.',
    );
  const tema = temasPropios.find((propio) => propio.id === id);
  if (!tema) throw new DomainError('not-found', 'THEME_NOT_FOUND', 'El tema no existe.');
  return tema;
}

/** Texto de `ACTIVE_THEME_IN_USE`; el Admin lo toma de aquí (lote 08, PBI-0079). */
export const MENSAJE_TEMA_ACTIVO_EN_USO = 'Activa otro tema antes de borrar este.';

/** Devuelve el tema propio `id` si se puede borrar: debe existir, no ser predefinido ni el tema activo (AC-09). */
export function exigirTemaBorrable(id, apariencia) {
  const tema = exigirTemaPropio(id, apariencia.customThemes);
  if (id === apariencia.activeThemeId)
    throw new DomainError('conflict', 'ACTIVE_THEME_IN_USE', MENSAJE_TEMA_ACTIVO_EN_USO);
  return tema;
}
