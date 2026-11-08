/** Fecha civil en `America/Lima`; `mes` va de 1 a 12. */
export interface FechaLima {
  readonly anio: number;
  readonly mes: number;
  readonly dia: number;
}

/** Días de un mes, ambos incluidos, que se comparan entre el mes en curso y el anterior. */
export interface TramoMes {
  readonly anio: number;
  readonly mes: number;
  readonly desde: number;
  readonly hasta: number;
}

/** Cifra de una tarjeta y su variación en % entero; `null` si el tramo anterior vale 0 (se muestra «—»). */
export interface Indicador {
  readonly total: number;
  readonly variacion: number | null;
}

export interface IndicadoresResumen {
  readonly pedidos: Indicador;
  readonly ventas: Indicador;
  readonly clientes: Indicador;
}

/** Un punto del gráfico: pedidos creados y clientes nuevos en un día del mes en curso. */
export interface DiaDelMes {
  readonly dia: number;
  readonly pedidos: number;
  readonly clientesNuevos: number;
}

export interface PedidosDistrito {
  readonly distrito: string;
  readonly pedidos: number;
}

/** Porcentajes enteros de pedidos por grupo de estado; suman 100, o 0 sin pedidos. */
export interface DistribucionEstados {
  readonly completados: number;
  readonly enProceso: number;
  readonly otros: number;
}
