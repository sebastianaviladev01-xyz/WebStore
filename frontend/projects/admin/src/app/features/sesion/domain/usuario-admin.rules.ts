/** Primera letra (un punto de código, no una unidad UTF-16) de un texto ya normalizado, en mayúsculas. */
function primeraLetra(texto: string): string {
  const [letra = ''] = texto;
  return letra.toUpperCase();
}

/**
 * Iniciales del círculo del menú de usuario: la primera letra de la primera y de la última palabra del nombre
 * (una sola si el nombre tiene una palabra). Sin nombre, la primera letra del correo. Sin ninguno, `''`.
 * Normaliza a NFC para que una tilde descompuesta (`A` + `´`) dé la misma letra que la compuesta (`Á`).
 */
export function inicialesDeUsuario(nombre: string, correo: string): string {
  const palabras = nombre.normalize('NFC').split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return primeraLetra(correo.normalize('NFC').trim());
  const primera = palabras[0];
  const ultima = palabras[palabras.length - 1];
  return palabras.length === 1 ? primeraLetra(primera) : primeraLetra(primera) + primeraLetra(ultima);
}
