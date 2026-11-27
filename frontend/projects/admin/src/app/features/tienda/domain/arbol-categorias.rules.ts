import { aplanarArbolCategorias } from './categoria.rules';
import { FiltrosCategorias, SIN_PADRE } from './filtro-catalogo.model';
import { contieneTexto } from './listado.rules';
import { Categoria } from './tienda.model';

/**
 * Árbol de Categorías del Admin (lote 22, ADR-0025, PBI-0220; confirmado por Sebastián Avila). Daniel pidió una
 * jerarquía con vista de árbol que se abre por niveles, como la configuración de Reddit, en lugar de la ruta en texto de
 * cada categoría. Una categoría sin hijas es el último nivel.
 */
export interface NodoCategoria {
  readonly category: Categoria;
  readonly children: readonly NodoCategoria[];
  /** Con un filtro de nombre, si esta categoría es una de las que coinciden (las demás están por contenerlas). */
  readonly coincide: boolean;
}

export interface ArbolDeCategorias {
  /** Las de primer nivel, o las hijas de la «Categoría padre» elegida, con sus ramas. */
  readonly raices: readonly NodoCategoria[];
  /** Las que contienen una que coincide con el nombre: empiezan abiertas para que se vea. */
  readonly abiertas: ReadonlySet<string>;
}

/** Una fila visible del árbol, con lo que necesita `treeitem`: nivel, posición entre sus hermanas y si está abierta. */
export interface FilaDeCategoria {
  readonly category: Categoria;
  /** Desde 1 (`aria-level`). */
  readonly nivel: number;
  /** Desde 1 (`aria-posinset`), entre `total` hermanas (`aria-setsize`). */
  readonly posicion: number;
  readonly total: number;
  readonly tieneHijas: boolean;
  readonly abierta: boolean;
  readonly coincide: boolean;
  /** La categoría que la contiene en el árbol que se ve; las raíces no tienen. */
  readonly padreId?: string;
}

/** Las categorías como árbol, en el orden de siempre (`aplanarArbolCategorias`): orden explícito y luego alfabético. */
function bosque(categorias: readonly Categoria[]): readonly NodoCategoria[] {
  type Nodo = { category: Categoria; children: Nodo[]; coincide: boolean };
  const raices: Nodo[] = [];
  const camino: Nodo[] = [];
  for (const { category, depth } of aplanarArbolCategorias(categorias)) {
    const nodo: Nodo = { category, children: [], coincide: false };
    camino.length = depth;
    (depth ? camino[depth - 1].children : raices).push(nodo);
    camino.push(nodo);
  }
  return raices;
}

/** Deja las que coinciden y las que las contienen; de una que coincide conserva sus ramas enteras. */
function podar(nodos: readonly NodoCategoria[], nombre: string, abiertas: Set<string>): NodoCategoria[] {
  const resultado: NodoCategoria[] = [];
  for (const nodo of nodos) {
    if (contieneTexto(nodo.category.name, nombre)) {
      resultado.push({ ...nodo, coincide: true });
      continue;
    }
    const children = podar(nodo.children, nombre, abiertas);
    if (!children.length) continue;
    abiertas.add(nodo.category.id);
    resultado.push({ ...nodo, children });
  }
  return resultado;
}

function buscar(nodos: readonly NodoCategoria[], id: string): NodoCategoria | undefined {
  for (const nodo of nodos) {
    if (nodo.category.id === id) return nodo;
    const encontrado = buscar(nodo.children, id);
    if (encontrado) return encontrado;
  }
  return undefined;
}

/**
 * El árbol con los filtros de la lista: «Categoría padre» deja como raíces las hijas directas de esa categoría (con sus
 * ramas; `SIN_PADRE` o vacío, las de primer nivel), y «Nombre» deja las que coinciden y las que las contienen.
 */
export function arbolDeCategorias(
  categorias: readonly Categoria[],
  filtros: FiltrosCategorias,
): ArbolDeCategorias {
  const todas = bosque(categorias);
  const base =
    filtros.padreId && filtros.padreId !== SIN_PADRE
      ? (buscar(todas, filtros.padreId)?.children ?? [])
      : todas;
  const abiertas = new Set<string>();
  if (!filtros.nombre.trim()) return { raices: base, abiertas };
  return { raices: podar(base, filtros.nombre, abiertas), abiertas };
}

/** Las filas que se ven: las raíces y, de cada abierta, sus hijas justo debajo. */
export function filasVisibles(
  raices: readonly NodoCategoria[],
  abiertas: ReadonlySet<string>,
): readonly FilaDeCategoria[] {
  const filas: FilaDeCategoria[] = [];
  const recorrer = (nodos: readonly NodoCategoria[], nivel: number, padreId?: string) =>
    nodos.forEach((nodo, indice) => {
      const tieneHijas = nodo.children.length > 0;
      const abierta = tieneHijas && abiertas.has(nodo.category.id);
      filas.push({
        category: nodo.category,
        nivel,
        posicion: indice + 1,
        total: nodos.length,
        tieneHijas,
        abierta,
        coincide: nodo.coincide,
        ...(padreId ? { padreId } : {}),
      });
      if (abierta) recorrer(nodo.children, nivel + 1, nodo.category.id);
    });
  recorrer(raices, 1);
  return filas;
}

/** Lo que hace una tecla en el árbol: a qué fila va el foco y qué categorías se abren o se cierran. */
export interface MovimientoEnArbol {
  readonly foco: string;
  readonly abrir: readonly string[];
  readonly cerrar: readonly string[];
}

/**
 * Teclado del árbol (patrón de árbol de WAI-ARIA): ↓ y ↑ recorren las filas visibles; Inicio y Fin van a la primera y a
 * la última; → abre una cerrada o, abierta, baja a su primera hija; ← cierra una abierta o sube a su padre; `*` abre las
 * hermanas que tienen hijas. Otra tecla devuelve `null` (no es del árbol). Si la fila con el foco ya no se ve, cualquier
 * tecla del árbol lleva a la primera.
 */
export function moverEnArbol(
  filas: readonly FilaDeCategoria[],
  actualId: string,
  tecla: string,
): MovimientoEnArbol | null {
  if (!filas.length) return null;
  const ir = (foco: string, abrir: string[] = [], cerrar: string[] = []) => ({ foco, abrir, cerrar });
  const indice = filas.findIndex((fila) => fila.category.id === actualId);
  const esDelArbol = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', '*'].includes(tecla);
  if (!esDelArbol) return null;
  if (indice < 0) return ir(filas[0].category.id);
  const fila = filas[indice];
  const id = fila.category.id;
  switch (tecla) {
    case 'ArrowDown':
      return ir(filas[Math.min(indice + 1, filas.length - 1)].category.id);
    case 'ArrowUp':
      return ir(filas[Math.max(indice - 1, 0)].category.id);
    case 'Home':
      return ir(filas[0].category.id);
    case 'End':
      return ir(filas[filas.length - 1].category.id);
    case 'ArrowRight':
      if (!fila.tieneHijas) return ir(id);
      return fila.abierta ? ir(filas[indice + 1].category.id) : ir(id, [id]);
    case 'ArrowLeft':
      if (fila.abierta) return ir(id, [], [id]);
      return ir(fila.padreId ?? id);
    default:
      return ir(
        id,
        filas
          .filter((otra) => otra.padreId === fila.padreId && otra.tieneHijas)
          .map((otra) => otra.category.id),
      );
  }
}
