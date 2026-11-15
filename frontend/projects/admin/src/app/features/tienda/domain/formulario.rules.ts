/**
 * Mensaje de un campo de un formulario del Admin con errores (lote 07, ADR-0017; PBI-0132): antes solo se veía el
 * borde rojo. Recibe los errores del control (`control.errors`) y devuelve qué hacer, o `null` si no hay. Un motivo
 * propio del formulario, como un dato repetido (`repetido`, lote 06), se muestra tal cual y antes que los demás.
 */
export function mensajeDeError(errores: Readonly<Record<string, unknown>> | null): string | null {
  if (!errores) return null;
  const claves = Object.keys(errores);
  if (!claves.length) return null;
  const repetido = errores['repetido'];
  if (typeof repetido === 'string') return repetido;
  const detalle = (clave: string, campo: string) =>
    (errores[clave] as Readonly<Record<string, number>> | undefined)?.[campo];
  if ('required' in errores) return 'Completa este campo.';
  if ('email' in errores) return 'Escribe un correo válido, como nombre@dominio.pe.';
  if ('min' in errores) return `Usa un número desde ${detalle('min', 'min')}.`;
  if ('max' in errores) return `Usa un número hasta ${detalle('max', 'max')}.`;
  if ('minlength' in errores) return `Usa al menos ${detalle('minlength', 'requiredLength')} caracteres.`;
  if ('maxlength' in errores) return `Usa como máximo ${detalle('maxlength', 'requiredLength')} caracteres.`;
  if ('pattern' in errores) return 'Revisa el formato de este campo.';
  return 'Revisa este campo.';
}
