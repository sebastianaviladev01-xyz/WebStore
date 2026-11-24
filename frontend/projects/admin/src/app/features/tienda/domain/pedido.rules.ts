import { DireccionDeLinea } from './tienda.model';

/**
 * Fechas de los pedidos en el Admin (lote 06, ADR-0017; PBI-0067). Se muestran en la hora de Lima, como cuentan el
 * gráfico y las reglas del Dashboard, y no en la zona del navegador.
 */

/** Zona de Lima para el pipe `date` de Angular (UTC-5; Perú no tiene horario de verano). */
export const ZONA_HORARIA_LIMA = '-0500';

/**
 * La versión de los términos que aceptó el comprador (lote 17, ADR-0021, PBI-0177; provisional): los pedidos anteriores
 * al registro de versiones no la tienen.
 */
export function versionDeTerminos(version: number | null | undefined): string {
  return typeof version === 'number' ? `Versión ${version}` : 'Sin registro de versión';
}

/** La fecha de entrega es un día (`AAAA-MM-DD`), no un instante: se muestra tal cual, como `dd/MM/aaaa`. */
export function fechaDeEntrega(dia: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '—';
}

/**
 * La dirección de una línea que va a otra dirección (lote 19, ADR-0021, PBI-0006; provisional), en una línea de texto:
 * dirección, distrito, provincia y departamento, y la referencia entre paréntesis si la trae.
 */
export function direccionVisible(direccion: DireccionDeLinea): string {
  const texto = [direccion.addressLine, direccion.district, direccion.province, direccion.department].join(
    ', ',
  );
  const referencia = direccion.reference?.trim();
  return referencia ? `${texto} (${referencia})` : texto;
}
