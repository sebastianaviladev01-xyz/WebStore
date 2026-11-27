import { NombreIcono } from '../../../shared/ui/iconos';

/**
 * Tonos de las insignias de estado y de las fichas del resumen de los listados (lote 43, ADR-0033, PBI-0265), como la
 * lista de proveedores del SGC: verde «Activo», naranja «Inactivo». Cada insignia lleva su propio fondo suave y el texto
 * del mismo tono, a 4.5:1 o más con A, B y C (ADR-0022): `exito` es un par fijo; `alerta` y `peligro` los calcula el
 * tema (ADR-0019); `principal`, el principal suave con su texto.
 */
export type Tono = 'exito' | 'alerta' | 'peligro' | 'principal' | 'neutro';

const INSIGNIA: Readonly<Record<Tono, string>> = {
  exito: 'bg-success-soft text-success',
  alerta: 'bg-warning-soft text-warning',
  peligro: 'bg-danger-soft text-danger',
  principal: 'bg-primary-soft text-on-primary-soft',
  neutro: 'bg-soft text-body',
};

/** Color del punto de una ficha del resumen (decorativo: la cifra y su nombre ya dicen qué cuenta). */
const PUNTO: Readonly<Record<Tono, string>> = {
  exito: 'bg-success',
  alerta: 'bg-warning',
  peligro: 'bg-danger',
  principal: 'bg-primary',
  neutro: 'bg-line-strong',
};

/** Clases de la insignia de un estado en una fila: píldora con el fondo suave y el texto de su tono. */
export function clasesDeInsignia(tono: Tono): string {
  return `inline-flex w-fit items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${INSIGNIA[tono]}`;
}

export function clasesDelPunto(tono: Tono): string {
  return PUNTO[tono];
}

/** Una ficha del pie de un listado: un punto de color, su ícono y su cifra («8 en total», «5 activos»). */
export interface FichaDeResumen {
  readonly texto: string;
  readonly tono: Tono;
  readonly icono: NombreIcono;
}

/**
 * Clases de los botones de acción de cada fila: solo ícono, con borde, con su nombre accesible (`aria-label`) y su
 * descripción emergente (`matTooltip`). El borde y el ícono se distinguen a 3:1 o más (ADR-0023).
 */
export const CLASES_ACCION =
  'inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line-strong bg-surface text-body transition-colors hover:bg-subtle motion-reduce:transition-none';
/**
 * «Cancelar» del pie de las ventanas emergentes de registro (Marcas, Clientes y Tarifas de envío; lote 43, PBI-0268):
 * relleno suave, a la izquierda de «Guardar», relleno del principal.
 */
export const CLASES_CANCELAR_SUAVE =
  'inline-flex items-center gap-2 rounded-lg bg-soft px-5 py-2.5 text-sm font-semibold text-body hover:bg-line';

/** La de eliminar se pone roja con el puntero o con el foco del teclado. */
export const CLASES_ACCION_ELIMINAR = `${CLASES_ACCION} hover:border-danger hover:bg-danger-soft hover:text-danger focus-visible:border-danger focus-visible:text-danger`;
