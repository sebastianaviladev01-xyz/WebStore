/**
 * Reglas de la cuenta del cliente (lote 05, ADR-0017). La política de contraseñas es la del BFF
 * (`backend/src/domain/cuentas/cuenta.rules.mjs`, `requirePassword`), que la vuelve a comprobar (PBI-0117).
 */
const LETRA = /[A-Za-zÁÉÍÓÚÑáéíóúñ]/;
const DIGITO = /\d/;
export const LARGO_MINIMO_CONTRASENA = 10;

/** 10 caracteres como mínimo, con al menos una letra y un número. */
export function esContrasenaSegura(valor: string): boolean {
  return valor.length >= LARGO_MINIMO_CONTRASENA && LETRA.test(valor) && DIGITO.test(valor);
}

/** A dónde se va después de ingresar si no hay una página de retorno válida. */
export const RUTA_DESPUES_DE_INGRESAR = '/cuenta/perfil';

/**
 * La página a la que se vuelve después de ingresar (PBI-0114): solo una ruta de la tienda (empieza por una sola `/`)
 * que no sea el propio ingreso. Cualquier otra cosa, incluida una dirección de otro sitio, lleva al perfil.
 */
export function rutaDeRetorno(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\'))
    return RUTA_DESPUES_DE_INGRESAR;
  if (valor === '/cuenta/login' || valor.startsWith('/cuenta/login?')) return RUTA_DESPUES_DE_INGRESAR;
  return valor;
}
