import type { FechaLima, TramoMes } from './resumen.model';
import type { Pedido } from './tienda.model';

const FORMATO_FECHA_LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha civil de Lima de un instante, sin depender de la zona del navegador o del CI. */
export function fechaEnLima(instante: string | Date): FechaLima {
  const partes = FORMATO_FECHA_LIMA.formatToParts(new Date(instante));
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((p) => p.type === tipo)?.value);
  return { anio: valor('year'), mes: valor('month'), dia: valor('day') };
}

/** Último día de un mes (`mes` de 1 a 12), con el calendario gregoriano y sin depender de la zona horaria. */
function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Tramos que se comparan: del día 1 a hoy en el mes en curso y los mismos días del mes anterior,
 * recortados a su último día si es más corto (en enero, el anterior es diciembre del año anterior).
 */
export function tramosDeComparacion(hoy: FechaLima): { actual: TramoMes; anterior: TramoMes } {
  const anioAnterior = hoy.mes === 1 ? hoy.anio - 1 : hoy.anio;
  const mesAnterior = hoy.mes === 1 ? 12 : hoy.mes - 1;
  return {
    actual: { anio: hoy.anio, mes: hoy.mes, desde: 1, hasta: hoy.dia },
    anterior: {
      anio: anioAnterior,
      mes: mesAnterior,
      desde: 1,
      hasta: Math.min(hoy.dia, diasDelMes(anioAnterior, mesAnterior)),
    },
  };
}

const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();

/**
 * Fecha de Lima del primer pedido (el de menor `createdAt`) de cada cliente, por correo normalizado como
 * en el BFF. Cuenta también los pedidos cancelados (D6 no los excluye). Los clientes sin pedidos no aparecen.
 */
export function clientesNuevosPorFecha(pedidos: readonly Pedido[]): Map<string, FechaLima> {
  const primeros = new Map<string, number>();
  for (const pedido of pedidos) {
    const correo = normalizarCorreo(pedido.customerEmail);
    const instante = new Date(pedido.createdAt).getTime();
    const previo = primeros.get(correo);
    if (previo === undefined || instante < previo) primeros.set(correo, instante);
  }
  return new Map([...primeros].map(([correo, instante]) => [correo, fechaEnLima(new Date(instante))]));
}
