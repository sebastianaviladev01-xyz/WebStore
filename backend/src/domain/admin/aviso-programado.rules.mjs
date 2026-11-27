/**
 * Avisos programados de la barra superior (lote 30, ADR-0027, PBI-0244; confirmado por Sebastián Avila): cada
 * aviso de Contenido (`announcements`) lleva un «Desde» (`startAt`) y un «Hasta» (`endAt`) opcionales, instantes ISO
 * con zona que el backoffice elige en hora de Lima. La tienda solo muestra los vigentes y el backoffice marca cada uno
 * como programado, vigente o vencido.
 *
 * La regla recibe el instante: no lee el reloj del sistema (PBI-0245). Los extremos cuentan, como en los banners
 * (PBI-0221). Un aviso sin fechas está siempre vigente, como antes del lote; una fecha guardada que no se puede leer
 * (datos editados a mano) no oculta el aviso.
 */

/** Estados de un aviso respecto del instante dado. */
export const ESTADOS_DEL_AVISO = Object.freeze(['programado', 'vigente', 'vencido']);

function milisegundos(instante) {
  const valor =
    instante instanceof Date
      ? instante.getTime()
      : typeof instante === 'string'
        ? Date.parse(instante)
        : instante;
  if (typeof valor !== 'number' || !Number.isFinite(valor))
    throw new TypeError('La vigencia del aviso necesita un instante válido.');
  return valor;
}

const extremo = (valor) => (typeof valor === 'string' && valor.trim() ? Date.parse(valor) : NaN);

/** `programado` antes de su «Desde», `vencido` después de su «Hasta» y `vigente` en el resto. */
export function estadoDelAviso(aviso, instante) {
  const ahora = milisegundos(instante);
  const desde = extremo(aviso?.startAt);
  const hasta = extremo(aviso?.endAt);
  if (Number.isFinite(desde) && ahora < desde) return 'programado';
  if (Number.isFinite(hasta) && ahora > hasta) return 'vencido';
  return 'vigente';
}

/** Los avisos vigentes en el instante dado, en su orden. */
export function avisosVigentes(avisos, instante) {
  const ahora = milisegundos(instante);
  if (!Array.isArray(avisos)) return [];
  return avisos.filter((aviso) => estadoDelAviso(aviso, ahora) === 'vigente');
}
