import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { IconoDirective } from './icono.directive';
import { ICONOS } from './iconos';

/** Lo que muestra la ventana de confirmación. */
export interface DatosConfirmacion {
  /** Título y nombre accesible de la ventana: «Confirmar eliminación». */
  readonly titulo: string;
  /** Pregunta antes del nombre: «¿Deseas eliminar el registro de:». */
  readonly pregunta: string;
  /** Nombre del registro, que se muestra entre comillas en un recuadro gris. */
  readonly nombre: string;
  /** Aviso opcional debajo del nombre (por ejemplo, que el stock vuelve al inventario). */
  readonly aviso?: string;
  /** Texto del botón que cierra sin hacer nada; lleva el foco al abrir. */
  readonly cancelar: string;
  /** Texto del botón que confirma. */
  readonly aceptar: string;
  /** La papelera grande de arriba, solo en los borrados. */
  readonly papelera: boolean;
}

/**
 * Ventana propia del backoffice para confirmar un borrado (lote 43, ADR-0033, PBI-0269), como la del SGC, en lugar del
 * `confirm()` del navegador: una papelera grande, «Confirmar eliminación», «¿Deseas eliminar el registro de:» y el
 * nombre entre comillas en un recuadro gris; «No, cancelar (Esc)» con borde y con el foco al abrir, y «Sí, eliminar»
 * relleno del principal con una marca. Esc, el clic fuera o «No, cancelar» cierran sin confirmar. El título es el
 * nombre accesible (`mat-dialog-title`) y la pregunta con el nombre, su descripción. La cancelación de un pedido usa la
 * misma ventana con otros textos y sin la papelera (`confirmarCancelacionDePedido`).
 */
@Component({
  selector: 'ws-admin-confirmacion',
  imports: [IconoDirective, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-6 pt-6 text-center">
      @if (datos.papelera) {
        <!-- Decorativa: el título ya dice qué se confirma. -->
        <span class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-danger-soft text-danger">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
            class="h-11 w-11"
          >
            <path [attr.d]="trazoPapelera" />
          </svg>
        </span>
      }
    </div>
    <h2 mat-dialog-title class="text-center">{{ datos.titulo }}</h2>
    <mat-dialog-content>
      <div id="ws-confirmacion-detalle" class="text-center">
        <p class="text-base text-body">{{ datos.pregunta }}</p>
        <p class="mt-3 break-words rounded-xl bg-soft px-4 py-3 text-base font-semibold text-ink">
          «{{ datos.nombre }}»
        </p>
        @if (datos.aviso) {
          <p class="mt-3 text-sm text-muted">{{ datos.aviso }}</p>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="center" class="gap-2 !pb-6">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong px-5 py-2.5 text-sm font-semibold text-body"
        [mat-dialog-close]="false"
        cdkFocusInitial
      >
        <svg wsAdminIcono="cancelar"></svg>
        {{ datos.cancelar }}
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
        [mat-dialog-close]="true"
      >
        <svg wsAdminIcono="confirmar"></svg>
        {{ datos.aceptar }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmacionDialog {
  protected readonly datos = inject<DatosConfirmacion>(MAT_DIALOG_DATA);
  protected readonly trazoPapelera = ICONOS.eliminar;
}

/** Abre la ventana y responde `true` solo si la persona confirma; Esc, el clic fuera o cancelar dan `false`. */
export async function pedirConfirmacion(dialog: MatDialog, datos: DatosConfirmacion): Promise<boolean> {
  const ref = dialog.open<ConfirmacionDialog, DatosConfirmacion, boolean>(ConfirmacionDialog, {
    data: datos,
    role: 'alertdialog',
    width: '440px',
    maxWidth: 'calc(100vw - 32px)',
    autoFocus: 'first-tabbable',
    ariaDescribedBy: 'ws-confirmacion-detalle',
  });
  return (await firstValueFrom(ref.afterClosed())) === true;
}

/** Confirmación de un borrado (PBI-0269): «Confirmar eliminación» con el nombre del registro. */
export function confirmarEliminacion(dialog: MatDialog, nombre: string): Promise<boolean> {
  return pedirConfirmacion(dialog, {
    titulo: 'Confirmar eliminación',
    pregunta: '¿Deseas eliminar el registro de:',
    nombre,
    cancelar: 'No, cancelar (Esc)',
    aceptar: 'Sí, eliminar',
    papelera: true,
  });
}

/** Cancelación de un pedido (PBI-0269): la misma ventana, con su título, sin la papelera y el aviso del stock. */
export function confirmarCancelacionDePedido(dialog: MatDialog, pedido: string): Promise<boolean> {
  return pedirConfirmacion(dialog, {
    titulo: 'Cancelar pedido',
    pregunta: '¿Deseas cancelar el pedido:',
    nombre: pedido,
    aviso: 'El stock reservado vuelve al inventario.',
    cancelar: 'No, volver',
    aceptar: 'Sí, cancelar pedido',
    papelera: false,
  });
}
