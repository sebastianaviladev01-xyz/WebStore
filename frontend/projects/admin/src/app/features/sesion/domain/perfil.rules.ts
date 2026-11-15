/**
 * Perfil propio del Admin (lote 07b, ADR-0017, PBI-0034): la contraseña nueva sigue la política del BFF
 * (`requirePassword` de `backend/src/domain/cuentas/cuenta.rules.mjs`), que la prueba compara caso por caso. El BFF la
 * vuelve a validar.
 */
export const MENSAJE_CONTRASENA_DEBIL = 'Usa al menos 10 caracteres e incluye una letra y un número.';

export function esContrasenaSegura(valor: string): boolean {
  return valor.length >= 10 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(valor) && /\d/.test(valor);
}
