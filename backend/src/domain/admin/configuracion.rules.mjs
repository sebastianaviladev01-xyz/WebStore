/** Claves de color que Contenido tuvo hasta `schemaVersion: 2`. Desde la 3, el color vive solo en los temas. */
export const COLORES_RETIRADOS_DE_CONTENIDO = Object.freeze(['primaryColor', 'secondaryColor']);

/**
 * Configuración de Contenido sin el color principal ni el secundario (D3, AC-22). Un Admin anterior que aún
 * los envíe no los aplica: se descartan sin error. Devuelve un objeto nuevo y no modifica el recibido; lo que
 * no es un objeto se devuelve tal cual, porque validarlo no es tarea de esta regla.
 */
export function sinColoresDeContenido(config) {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) return config;
  const resultado = { ...config };
  for (const clave of COLORES_RETIRADOS_DE_CONTENIDO) delete resultado[clave];
  return resultado;
}
