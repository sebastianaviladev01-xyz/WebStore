import { DestroyRef, inject, TemplateRef } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

interface OpcionesDialogo {
  /** La plantilla del formulario (`<ng-template>` de la página): sus enlaces siguen siendo los de la página. */
  readonly plantilla: () => TemplateRef<unknown>;
  /** Al cerrarse sin que la página se destruya (guardado, «Cancelar», Escape o clic fuera): sale de la edición. */
  readonly alCerrar: () => void;
}

/**
 * Registro en ventana emergente (lote 21, ADR-0025, PBI-0211): un formulario de hasta tres campos se crea y se edita
 * en un `MatDialog`, no al costado de la lista. La ventana muestra una plantilla de la página, así que el formulario,
 * su borrador (PBI-0151 y PBI-0157) y sus validaciones siguen en la página. `MatDialog` pone el título como nombre de
 * la ventana (`mat-dialog-title`), atrapa el foco, lo lleva al primer campo, cierra con Escape y devuelve el foco al
 * botón que la abrió. Si la página se destruye (por ejemplo, al vencer la sesión), la ventana se cierra con ella, sin
 * tocar el formulario: el borrador ya lo guardó la página. Se llama en el constructor de la página (usa `inject`).
 */
export function dialogoDeRegistro(opciones: OpcionesDialogo) {
  const dialog = inject(MatDialog);
  let abierto: MatDialogRef<unknown> | null = null;
  let destruida = false;
  inject(DestroyRef).onDestroy(() => {
    destruida = true;
    abierto?.close();
  });
  return {
    abrir(): void {
      if (abierto) return;
      const ref = dialog.open(opciones.plantilla(), {
        width: '480px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
      });
      abierto = ref;
      ref.afterClosed().subscribe(() => {
        abierto = null;
        if (!destruida) opciones.alCerrar();
      });
    },
    cerrar(): void {
      abierto?.close();
    },
  };
}
