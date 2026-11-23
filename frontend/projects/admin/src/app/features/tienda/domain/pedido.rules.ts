/**
 * Fechas de los pedidos en el Admin (lote 06, ADR-0017; PBI-0067). Se muestran en la hora de Lima, como cuentan el
 * gráfico y las reglas del Dashboard, y no en la zona del navegador.
 */

/** Zona de Lima para el pipe `date` de Angular (UTC-5; Perú no tiene horario de verano). */
export const ZONA_HORARIA_LIMA = '-0500';

/** La fecha de entrega es un día (`AAAA-MM-DD`), no un instante: se muestra tal cual, como `dd/MM/aaaa`. */
export function fechaDeEntrega(dia: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '—';
}
