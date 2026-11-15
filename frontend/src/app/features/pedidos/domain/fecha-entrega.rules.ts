/**
 * Fecha de entrega del pedido con la fecha de Lima, no la de UTC (PBI-0096). La primera fecha permitida es hoy en
 * Lima, como en el BFF; la regla definitiva está en decisiones pendientes («Fecha mínima de entrega del pedido»).
 * La usan el checkout y el detalle del pedido (PBI-0146): vive en `pedidos`, del que depende `checkout` (lote 05).
 */
const FECHA_DE_LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Días que la tienda propone por defecto entre la compra y la entrega. */
const DIAS_PROPUESTOS = 2;

/** Fecha de calendario de Lima (`AAAA-MM-DD`) del instante dado. */
export function fechaDeLima(instante: Date): string {
  return FECHA_DE_LIMA.format(instante);
}

function sumarDias(fecha: string, dias: number): string {
  const dia = new Date(`${fecha}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}

/** La fecha que el checkout propone: dos días después de hoy en Lima. */
export function fechaDeEntregaPropuesta(instante: Date): string {
  return sumarDias(fechaDeLima(instante), DIAS_PROPUESTOS);
}

/** `AAAA-MM-DD` que existe en el calendario y no es anterior a `hoy` (la fecha de Lima). */
export function esFechaDeEntregaValida(valor: string, hoy: string): boolean {
  const partes = FECHA_ISO.exec(valor);
  if (!partes) return false;
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const existe =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  return existe && valor >= hoy;
}

/**
 * Fecha de entrega al cambiarla en el detalle del pedido (PBI-0146): desde hoy en Lima, o la que el pedido ya tiene,
 * que el BFF acepta aunque haya pasado.
 */
export function esCambioDeFechaValido(valor: string, hoy: string, vigente: string): boolean {
  return (valor !== '' && valor === vigente) || esFechaDeEntregaValida(valor, hoy);
}
