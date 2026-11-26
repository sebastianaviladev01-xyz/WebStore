/**
 * Qué muestra la interfaz de edición de un registro tras volver a pedir el snapshot al abrirla (lote 40, ADR-0032,
 * PBI-0256; provisional, por confirmar con Daniel):
 * - `lista`: la consulta respondió y el registro está; el formulario, sin aviso.
 * - `no-existe`: la consulta respondió y el registro no está; otra persona lo eliminó.
 * - `desactualizada`: la consulta falló, pero el panel ya tenía el registro; el formulario con esos datos y un aviso.
 * - `sin-datos`: la consulta falló y el panel no tenía el registro (por ejemplo, en una carga nueva). No se sabe si
 *   existe: se avisa del fallo y se ofrece reintentar, sin decir que no existe.
 */
export type EstadoDeLaEdicion = 'lista' | 'no-existe' | 'desactualizada' | 'sin-datos';

export function estadoDeLaEdicion(consulta: {
  readonly consultaRespondio: boolean;
  readonly registroEncontrado: boolean;
}): EstadoDeLaEdicion {
  if (consulta.consultaRespondio) return consulta.registroEncontrado ? 'lista' : 'no-existe';
  return consulta.registroEncontrado ? 'desactualizada' : 'sin-datos';
}
