import { DestroyRef, inject, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { SesionFacade } from '../../sesion/application/sesion.facade';

const AVISO_RECUPERADO =
  'Recuperamos lo que escribiste antes de que venciera la sesión. Revísalo y guarda los cambios.';

interface OpcionesBorrador<T> {
  /** El formulario: solo se guarda si la persona lo cambió (`dirty`). */
  readonly form: AbstractControl;
  /** Lo que hay que conservar (el valor y, si hace falta, el registro sobre el que se editaba). */
  readonly guardar: () => T;
  /** Devuelve `false` si el borrador ya no sirve (por ejemplo, el registro ya no existe): se descarta sin aviso. */
  readonly restaurar: (borrador: T) => boolean | void;
  /** La página rellena el formulario más tarde (al traer el registro): restaura con `aplicar()` después. */
  readonly diferido?: boolean;
}

/**
 * Conserva lo escrito en un formulario si la sesión vence a mitad de la edición (lote 07, PBI-0151). Al salir de la
 * página con la sesión vencida, guarda el borrador en memoria en `SesionFacade` (nunca en el navegador); al volver
 * a la misma página tras ingresar la misma persona, lo restaura, marca el formulario como cambiado y devuelve el
 * aviso que la página muestra. Se llama en el constructor de la página (usa `inject`).
 */
export function conservarBorrador<T>(opciones: OpcionesBorrador<T>) {
  const session = inject(SesionFacade);
  const ruta =
    '/' +
    inject(ActivatedRoute)
      .snapshot.pathFromRoot.flatMap((parte) => parte.url.map((segmento) => segmento.path))
      .join('/');
  const aviso = signal<string | null>(null);
  let pendiente = session.tomarBorrador(ruta) as T | null;
  const aplicar = () => {
    if (pendiente === null) return;
    const borrador = pendiente;
    pendiente = null;
    if (opciones.restaurar(borrador) === false) return;
    opciones.form.markAsDirty();
    aviso.set(AVISO_RECUPERADO);
  };
  if (!opciones.diferido) aplicar();
  inject(DestroyRef).onDestroy(() => {
    if (session.sesionVencida() && opciones.form.dirty) session.guardarBorrador(ruta, opciones.guardar());
  });
  return { aviso: aviso.asReadonly(), aplicar };
}
