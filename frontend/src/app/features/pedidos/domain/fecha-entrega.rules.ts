/**
 * Fecha de entrega del pedido con la fecha de Lima, no la de UTC (PBI-0096). Desde el lote 17 (ADR-0021, PBI-0178;
 * confirmado por Sebastián Avila) la primera fecha que puede elegir el comprador la calcula el BFF con la configuración
 * de la tienda (`GET /checkout/delivery-dates`): la tienda no repite la regla, la usa como mínimo del campo y como
 * fecha propuesta. La usan el checkout y el detalle del pedido (PBI-0146): vive en `pedidos`, del que depende
 * `checkout` (lote 05).
 */
const FECHA_DE_LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Fecha de calendario de Lima (`AAAA-MM-DD`) del instante dado. */
export function fechaDeLima(instante: Date): string {
  return FECHA_DE_LIMA.format(instante);
}

/** Una fecha `AAAA-MM-DD` como se lee en los mensajes: `DD/MM/AAAA`. */
export function fechaVisible(fecha: string): string {
  return fecha.split('-').reverse().join('/');
}

/** `AAAA-MM-DD` que existe en el calendario y no es anterior a `primera` (la primera fecha de entrega). */
export function esFechaDeEntregaValida(valor: string, primera: string): boolean {
  const partes = FECHA_ISO.exec(valor);
  if (!partes) return false;
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const existe =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  return existe && valor >= primera;
}

/**
 * La fecha que propone el checkout cuando llega la primera fecha de entrega: la que ya eligió el comprador si sigue
 * siendo válida, o la primera.
 */
export function fechaDeEntregaPropuesta(elegida: string, primera: string): string {
  return esFechaDeEntregaValida(elegida, primera) ? elegida : primera;
}

/**
 * Fecha de entrega al cambiarla en el detalle del pedido (PBI-0146): desde la primera fecha de entrega, o la que el
 * pedido ya tiene, que el BFF acepta aunque sea anterior.
 */
export function esCambioDeFechaValido(valor: string, primera: string, vigente: string): boolean {
  return (valor !== '' && valor === vigente) || esFechaDeEntregaValida(valor, primera);
}
