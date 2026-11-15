import { AbstractControl, ValidationErrors } from '@angular/forms';

import { esContrasenaSegura } from '../domain/cuenta.rules';

/** La política de contraseñas del BFF en un formulario (PBI-0117); vacía, la marca `required`. */
export function contrasenaSegura(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || esContrasenaSegura(control.value) ? null : { contrasenaDebil: true };
}

/** El mensaje de la política, el mismo que responde el BFF (`WEAK_PASSWORD`). */
export const MENSAJE_CONTRASENA = 'Usa al menos 10 caracteres e incluye una letra y un número.';
