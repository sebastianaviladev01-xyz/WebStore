/** Lo que necesita eliminar un registro desde su página (lote 08, PBI-0134). */
export interface EliminacionDeRegistro {
  /** Pregunta de la confirmación, por ejemplo «¿Eliminar cliente?». */
  readonly pregunta: string;
  readonly id: string;
  /** `id` del registro que el formulario está editando, o `null`. Se lee al terminar, no al empezar. */
  readonly editando: () => string | null;
  /** Por omisión, el `confirm()` del navegador. */
  readonly confirmar?: (pregunta: string) => boolean;
  /** Elimina en el BFF; devuelve `true` si lo eliminó. */
  readonly eliminar: (id: string) => Promise<boolean>;
  /** Vuelve el formulario a «Nuevo»: «Guardar» no debe recrear el registro eliminado (PBI-0122). */
  readonly salirDeLaEdicion: () => void;
}

/**
 * Elimina un registro tras confirmarlo y, si era el que se estaba editando, saca el formulario de la edición. Es el
 * mismo flujo en Clientes, Usuarios, Tarifas de envío y Banners. Devuelve `true` si se eliminó.
 */
export async function eliminarRegistro({
  pregunta,
  id,
  editando,
  confirmar = (texto) => confirm(texto),
  eliminar,
  salirDeLaEdicion,
}: EliminacionDeRegistro): Promise<boolean> {
  if (!confirmar(pregunta)) return false;
  if (!(await eliminar(id))) return false;
  if (editando() === id) salirDeLaEdicion();
  return true;
}
