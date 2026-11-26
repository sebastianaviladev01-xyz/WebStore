// Cada import cabe en una línea: distribucion-ventas.rules.spec.mjs borra las líneas que empiezan por «import».
import type { Categoria, Pedido, Producto } from './tienda.model';

/** Una fila de «Distribución de ventas por categoría» (lote 45, ADR-0033, PBI-0270). */
export interface ParticipacionDeCategoria {
  /** El id de la categoría principal, `sin-categoria` u `otras`. */
  readonly clave: string;
  readonly nombre: string;
  /** Soles, a céntimos. */
  readonly monto: number;
  /** % entero; las filas suman 100. */
  readonly porcentaje: number;
}

/** Categorías que se muestran por su nombre; las demás se agrupan en «Otras». */
export const MAXIMO_DE_CATEGORIAS = 6;

const SIN_CATEGORIA = { clave: 'sin-categoria', nombre: 'Sin categoría' } as const;
const OTRAS = { clave: 'otras', nombre: 'Otras' } as const;

/**
 * Reparte `total` (entero) en partes proporcionales a `pesos`, enteras y que suman exactamente `total`, con el método
 * del mayor resto (en empate de restos, la primera). Sin pesos positivos, todo es 0.
 */
function repartir(total: number, pesos: readonly number[]): number[] {
  const suma = pesos.reduce((acumulado, peso) => acumulado + peso, 0);
  if (suma <= 0) return pesos.map(() => 0);
  const exactas = pesos.map((peso) => (peso * total) / suma);
  const partes = exactas.map(Math.floor);
  const orden = exactas
    .map((exacta, indice) => ({ indice, resto: exacta - Math.floor(exacta) }))
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice);
  const faltan = total - partes.reduce((acumulado, parte) => acumulado + parte, 0);
  for (const { indice } of orden.slice(0, faltan)) partes[indice] = (partes[indice] ?? 0) + 1;
  return partes;
}

/** La categoría principal (la raíz del árbol) de una categoría; `null` si no existe. No recorre un ciclo sin fin. */
function categoriaPrincipal(id: string, categorias: ReadonlyMap<string, Categoria>): Categoria | null {
  let actual = categorias.get(id) ?? null;
  const vistas = new Set<string>();
  while (actual?.parentId && categorias.has(actual.parentId) && !vistas.has(actual.id)) {
    vistas.add(actual.id);
    actual = categorias.get(actual.parentId) ?? actual;
  }
  return actual;
}

/**
 * Distribución de las ventas por categoría principal, de mayor a menor (en empate, por nombre), con «Otras» al final
 * para las que pasan de `MAXIMO_DE_CATEGORIAS`. Las ventas son las de «Total de ventas» (PBI-0186): el `subtotal` de los
 * pedidos no cancelados, sin el envío. Cada pedido reparte su `subtotal`, en céntimos, entre sus líneas según su valor
 * (`quantity × unitPrice`), así los montos suman exactamente las ventas aunque un pedido antiguo no cuadre con sus
 * líneas. Una línea cuyo producto o categoría ya no existen, y un pedido sin líneas con valor, van a «Sin categoría».
 * Sin ventas, no hay filas.
 */
export function distribucionPorCategoria(
  pedidos: readonly Pedido[],
  productos: readonly Pick<Producto, 'id' | 'categoryId'>[],
  categorias: readonly Categoria[],
): ParticipacionDeCategoria[] {
  const porId = new Map(categorias.map((categoria) => [categoria.id, categoria]));
  const categoriaDe = new Map(productos.map((producto) => [producto.id, producto.categoryId]));
  const centimos = new Map<string, { nombre: string; monto: number }>();
  const sumar = (clave: string, nombre: string, monto: number) => {
    const previo = centimos.get(clave);
    centimos.set(clave, { nombre, monto: (previo?.monto ?? 0) + monto });
  };

  for (const pedido of pedidos) {
    if (pedido.status === 'cancelled') continue;
    const subtotal = Math.round(pedido.subtotal * 100);
    const lineas = (pedido.items ?? []).map((linea) => {
      const categoria = categoriaPrincipal(categoriaDe.get(linea.productId) ?? '', porId);
      return {
        clave: categoria?.id ?? SIN_CATEGORIA.clave,
        nombre: categoria?.name ?? SIN_CATEGORIA.nombre,
        valor: Math.max(0, linea.quantity * linea.unitPrice),
      };
    });
    if (!lineas.some((linea) => linea.valor > 0)) {
      sumar(SIN_CATEGORIA.clave, SIN_CATEGORIA.nombre, subtotal);
      continue;
    }
    const partes = repartir(
      subtotal,
      lineas.map((linea) => linea.valor),
    );
    lineas.forEach((linea, indice) => sumar(linea.clave, linea.nombre, partes[indice] ?? 0));
  }

  const filas = [...centimos]
    .map(([clave, { nombre, monto }]) => ({ clave, nombre, monto }))
    .filter((fila) => fila.monto > 0)
    .sort((a, b) => b.monto - a.monto || a.nombre.localeCompare(b.nombre, 'es'));
  const visibles =
    filas.length > MAXIMO_DE_CATEGORIAS
      ? [
          ...filas.slice(0, MAXIMO_DE_CATEGORIAS),
          {
            ...OTRAS,
            monto: filas.slice(MAXIMO_DE_CATEGORIAS).reduce((suma, fila) => suma + fila.monto, 0),
          },
        ]
      : filas;
  const porcentajes = repartir(
    100,
    visibles.map((fila) => fila.monto),
  );
  return visibles.map((fila, indice) => ({
    clave: fila.clave,
    nombre: fila.nombre,
    monto: fila.monto / 100,
    porcentaje: porcentajes[indice] ?? 0,
  }));
}
