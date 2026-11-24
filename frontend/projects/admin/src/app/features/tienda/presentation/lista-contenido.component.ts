import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { mensajeDeError } from '../domain/formulario.rules';

/** Una columna de la lista: el control de cada fila y su etiqueta («Correo» → «Correo 1»). */
export interface CampoDeLista {
  readonly clave: string;
  readonly etiqueta: string;
  readonly pista?: string;
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
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
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
              <mat-label>{{ campo.etiqueta }} {{ i + 1 }}</mat-label>
              <input matInput [formControl]="fila.controls[campo.clave]" />
              @if (campo.pista && primera) {
                <mat-hint>{{ campo.pista }}</mat-hint>
              }
              <mat-error>{{ mensaje(fila.controls[campo.clave].errors) }}</mat-error>
            </mat-form-field>
          }
          <div class="flex gap-2 pb-5 sm:pt-2">
            <button
              type="button"
              class="rounded-full border border-line px-3 py-2 text-xs font-semibold disabled:opacity-40"
              [disabled]="primera"
              [attr.aria-label]="'Subir ' + nombre() + ' ' + (i + 1)"
              (click)="subir(i)"
            >
              Subir
            </button>
            <button
              type="button"
              class="rounded-full border border-line px-3 py-2 text-xs font-semibold"
              [attr.aria-label]="'Quitar ' + nombre() + ' ' + (i + 1)"
              (click)="quitar(i)"
            >
              Quitar
            </button>
          </div>
        </div>
      } @empty {
        <p class="mb-3 text-sm text-muted">{{ vacio() }}</p>
      }
      @if (mensaje(lista().errors); as aviso) {
        <p class="mb-3 text-xs font-semibold text-danger" role="alert">{{ aviso }}</p>
      }
      <button
        type="button"
        class="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-40"
        [disabled]="lista().length >= maximo()"
        (click)="agregar()"
      >
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
  protected readonly mensaje = mensajeDeError;
  /** Columnas de cada fila según el número de campos, más la de los botones. */
  protected readonly columnas: Readonly<Record<number, string>> = {
    1: 'sm:grid-cols-[minmax(0,1fr)_auto]',
    2: 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]',
    3: 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]',
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
