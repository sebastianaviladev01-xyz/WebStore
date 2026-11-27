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

/**
 * Tramo de tiempo de un periodo del Dashboard (lote 45, PBI-0270), en milisegundos desde la época: `desde` incluido y
 * `hasta` excluido.
 */
export interface TramoDeTiempo {
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

/** Porcentajes enteros de pedidos por grupo de estado; suman 100, o 0 sin pedidos. */
export interface DistribucionEstados {
  readonly completados: number;
  readonly enProceso: number;
  readonly otros: number;
}

/**
 * Cómo agrupa el gráfico de pedidos el periodo del filtro principal (auditoría del lote 45, PBI-0270): por hora (Hoy),
 * por día (7 y 30 días y el mes), por semana desde el lunes (el trimestre) o por mes (el año).
 */
export type AgrupacionDeSerie = 'hora' | 'dia' | 'semana' | 'mes';

/** Un punto del gráfico: su etiqueta en el eje, su nombre para leerlo y lo que pasó en él. */
export interface PuntoDeSerie {
  readonly etiqueta: string;
  readonly nombre: string;
  readonly pedidos: number;
  readonly clientesNuevos: number;
}

/** El gráfico de un periodo: su agrupación, el tramo en palabras y sus puntos. */
export interface SerieDelPeriodo {
  readonly agrupacion: AgrupacionDeSerie;
  /** «noviembre de 2026» con «Mes actual»; «Del 1 de octubre al 26 de noviembre de 2026», con los demás. */
  readonly descripcion: string;
  readonly puntos: readonly PuntoDeSerie[];
}
