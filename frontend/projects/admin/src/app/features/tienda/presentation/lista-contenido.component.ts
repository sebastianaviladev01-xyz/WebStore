import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { mensajeDeError } from '../domain/formulario.rules';
import { IconoDirective } from '../../../shared/ui/icono.directive';

/** Una columna de la lista: el control de cada fila y su etiqueta («Correo» → «Correo 1»). */
export interface CampoDeLista {
  readonly clave: string;
  readonly etiqueta: string;
  readonly pista?: string;
  /** Lote 30 (PBI-0244): `datetime-local` para el «Desde» y el «Hasta» de los avisos; por omisión, texto. */
  readonly tipo?: 'text' | 'datetime-local';
  /** La etiqueta de la fila `numero`, si no es «etiqueta número» (lote 30: «Desde (aviso 2)»). */
  readonly etiquetaDeFila?: (numero: number) => string;
  /** La pista en todas las filas, no solo en la primera (lote 30: la hora de Lima de cada fecha). */
  readonly pistaEnCadaFila?: boolean;
}

export type FilaDeLista = FormGroup<Record<string, FormControl<string>>>;

/**
 * Editor de una lista de Contenido (lote 15, ADR-0021): correos, teléfonos, redes, avisos y accesos inferiores. Cada
 * fila tiene sus campos y los botones «Subir» y «Quitar»; «Agregar» añade una fila vacía hasta el máximo. El orden
 * importa: el primero de los correos y de los teléfonos es el principal, los avisos rotan en ese orden y los accesos
 * forman las columnas del pie en el orden de sus grupos.
 */
@Component({
  selector: 'ws-content-list',
  imports: [IconoDirective, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <fieldset class="sm:col-span-2 rounded-2xl border border-line p-4">
      <legend class="px-1 text-sm font-semibold">{{ titulo() }}</legend>
      @if (descripcion()) {
        <p class="mb-3 text-xs leading-5 text-muted">{{ descripcion() }}</p>
      }
      @for (fila of lista().controls; track fila; let i = $index; let primera = $first) {
        <!-- Lote 25 (PBI-0212): separación entre campos apilados para la etiqueta flotante del contorno. -->
        <div
          class="grid items-start gap-x-3 gap-y-2"
          [class]="columnas[campos().length] ?? columnas[3]"
          [class.mt-2]="!primera"
        >
          @for (campo of campos(); track campo.clave) {
            <mat-form-field>
              <mat-label>
                {{ campo.etiquetaDeFila ? campo.etiquetaDeFila(i + 1) : campo.etiqueta + ' ' + (i + 1) }}
              </mat-label>
              <input matInput [type]="campo.tipo ?? 'text'" [formControl]="fila.controls[campo.clave]" />
              @if (campo.pista && (primera || campo.pistaEnCadaFila)) {
                <mat-hint>{{ campo.pista }}</mat-hint>
              }
              <mat-error>{{ mensaje(fila.controls[campo.clave].errors) }}</mat-error>
            </mat-form-field>
          }
          <div class="flex flex-wrap items-center gap-2 pb-5 sm:pt-2">
            <!-- Lote 30 (PBI-0244): el estado de la fila, si la lista lo calcula (los avisos: programado, vigente o vencido). -->
            @if (estado(); as estadoDe) {
              @if (estadoDe(fila); as valor) {
                <span class="rounded-full border border-line px-2.5 py-1 text-xs font-semibold">
                  <span class="sr-only">Estado del {{ nombre() }} {{ i + 1 }}:</span>
                  {{ valor }}
                </span>
              }
            }
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-semibold disabled:opacity-40"
              [disabled]="primera"
              [attr.aria-label]="'Subir ' + nombre() + ' ' + (i + 1)"
              (click)="subir(i)"
            >
              <svg wsAdminIcono="subir"></svg>
              Subir
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-semibold"
              [attr.aria-label]="'Quitar ' + nombre() + ' ' + (i + 1)"
              (click)="quitar(i)"
            >
              <svg wsAdminIcono="quitar"></svg>
              Quitar
            </button>
          </div>
        </div>
        <!-- Lote 30 (PBI-0244): lo que falla entre campos de la fila, como un «Hasta» anterior al «Desde». -->
        @if (mensaje(fila.errors); as aviso) {
          <p class="mb-3 text-xs font-semibold text-danger" role="alert">{{ aviso }}</p>
        }
      } @empty {
        <p class="mb-3 text-sm text-muted">{{ vacio() }}</p>
      }
      @if (mensaje(lista().errors); as aviso) {
        <p class="mb-3 text-xs font-semibold text-danger" role="alert">{{ aviso }}</p>
      }
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-40"
        [disabled]="lista().length >= maximo()"
        (click)="agregar()"
      >
        <svg wsAdminIcono="agregar"></svg>
        Agregar {{ nombre() }}
      </button>
      @if (lista().length >= maximo()) {
        <span class="ml-3 text-xs text-muted">Hasta {{ maximo() }}.</span>
      }
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaContenidoComponent {
  readonly titulo = input.required<string>();
  readonly descripcion = input('');
  readonly vacio = input('Sin elementos.');
  /** Nombre de un elemento, en minúsculas, para los botones («correo»). */
  readonly nombre = input.required<string>();
  readonly lista = input.required<FormArray<FilaDeLista>>();
  readonly campos = input.required<readonly CampoDeLista[]>();
  readonly maximo = input.required<number>();
  /** Fila vacía para «Agregar». */
  readonly nueva = input.required<() => FilaDeLista>();
  /** Lote 30 (PBI-0244): el estado que se muestra junto a cada fila, o `null` si la lista no lo tiene. */
  readonly estado = input<((fila: FilaDeLista) => string | null) | null>(null);
  protected readonly mensaje = mensajeDeError;
  /**
   * Columnas de cada fila según el número de campos, más la de los botones. Con cuatro (los avisos, desde el lote 30),
   * dos por línea (el texto y el enlace; el «Desde» y el «Hasta») y los botones debajo: en una sola no se leen.
   */
  protected readonly columnas: Readonly<Record<number, string>> = {
    1: 'sm:grid-cols-[minmax(0,1fr)_auto]',
    2: 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]',
    3: 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]',
    4: 'sm:grid-cols-2',
  };

  protected agregar(): void {
    this.lista().push(this.nueva()());
    this.lista().markAsDirty();
  }

  protected quitar(indice: number): void {
    this.lista().removeAt(indice);
    this.lista().markAsDirty();
  }

  protected subir(indice: number): void {
    if (indice === 0) return;
    const fila = this.lista().at(indice);
    this.lista().removeAt(indice, { emitEvent: false });
    this.lista().insert(indice - 1, fila);
    this.lista().markAsDirty();
  }
}
