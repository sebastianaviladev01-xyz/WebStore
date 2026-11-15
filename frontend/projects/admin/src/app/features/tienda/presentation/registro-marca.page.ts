import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router, RouterLink } from '@angular/router';

import { TiendaFacade } from '../application/tienda.facade';
import { Marca } from '../domain/tienda.model';

/**
 * Interfaz de registro de una marca (feature 008): `/marcas/nueva` y `/marcas/:id`. Es el formulario que antes
 * estaba junto a la lista, con los mismos campos («Nombre» y «Activa»). Al editar trae los datos actuales con
 * `refresh()`; al guardar, al cancelar y con «Volver a marcas» vuelve al listado con sus filtros y su página
 * (`queryParamsHandling: 'preserve'`).
 */
@Component({
  selector: 'ws-brand-form-page',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatCheckboxModule],
  template: `
    <a class="text-sm font-semibold text-link" routerLink="/marcas" queryParamsHandling="preserve">
      ← Volver a marcas
    </a>
    <h1 id="titulo-formulario-marca" class="mt-3 text-3xl font-semibold tracking-tight text-ink">
      {{ editing() ? 'Editar' : 'Nueva' }} marca
    </h1>
    @if (loadingBrand()) {
      <p class="admin-card mt-7 max-w-2xl p-6 text-sm text-muted" role="status">Cargando…</p>
    } @else if (missing()) {
      <div class="admin-card mt-7 max-w-2xl p-6" role="alert">
        <p class="font-semibold">Esta marca ya no existe</p>
        <p class="mt-2 text-sm text-muted">
          Otra persona la eliminó. Vuelve al listado para ver las marcas actuales.
        </p>
      </div>
    } @else {
      @if (staleNotice()) {
        <p class="mt-7 max-w-2xl rounded-xl bg-warning-soft p-4 text-sm text-warning" role="alert">
          {{ staleNotice() }}
        </p>
      }
      <form
        [formGroup]="form"
        (ngSubmit)="save()"
        class="admin-card mt-7 max-w-2xl p-6"
        aria-labelledby="titulo-formulario-marca"
      >
        <mat-form-field>
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-checkbox formControlName="active">Activa</mat-checkbox>
        @if (error()) {
          <p class="mt-3 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {{ error() }}
          </p>
        }
        <div class="mt-5 flex gap-3">
          <button
            class="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            {{ admin.saving() ? 'Guardando…' : 'Guardar' }}
          </button>
          <a
            class="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
            routerLink="/marcas"
            queryParamsHandling="preserve"
          >
            Cancelar
          </a>
        </div>
      </form>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroMarcaPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly router = inject(Router);
  /** `:id` de `/marcas/:id` (`withComponentInputBinding`); no llega en `/marcas/nueva`. */
  readonly id = input<string>();
  protected readonly editing = computed(() => this.id() ?? null);
  /** Id de la marca nueva, fijo mientras la página está abierta: un segundo envío no crea otra (PBI-0121). */
  private readonly idNuevo = crypto.randomUUID();
  /** La marca tal como se cargó al abrir la edición: lo que cambió la persona se calcula contra ella (PBI-0120). */
  private base: Marca | null = null;
  /** Mientras la edición trae los datos actuales: «Cargando…» en lugar del formulario. */
  protected readonly loadingBrand = signal(false);
  /** La marca en edición ya no está en el snapshot actual: otra persona la eliminó. */
  protected readonly missing = signal(false);
  /** Aviso si no se pudieron traer los datos actuales y el formulario usa los que había en memoria. */
  protected readonly staleNotice = signal<string | null>(null);
  /** Motivo del último guardado rechazado, junto al botón; el formulario conserva lo escrito. */
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    active: new FormControl(true, { nonNullable: true }),
  });
  constructor() {
    // Al abrir la edición (o cambiar de `:id` sin salir de la página) se traen los datos actuales.
    effect(() => {
      const id = this.editing();
      if (id) untracked(() => void this.edit(id));
    });
  }
  /** Trae el snapshot actual y rellena el formulario; si ya no existe, lo dice; si la consulta falla, avisa. */
  private async edit(id: string) {
    this.loadingBrand.set(true);
    this.missing.set(false);
    this.staleNotice.set(null);
    this.error.set(null);
    const current = await this.admin.refresh();
    if (!current) {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    const b = this.admin.brands().find((x) => x.id === id);
    this.base = b ?? null;
    if (b) this.form.setValue({ name: b.name, active: b.active });
    else this.missing.set(true);
    this.loadingBrand.set(false);
  }
  protected async save() {
    if (this.form.invalid || this.admin.saving()) return;
    this.error.set(null);
    const saved = await this.admin.guardarMarca(this.base, {
      id: this.editing() ?? this.idNuevo,
      ...this.form.getRawValue(),
    });
    if (saved) {
      await this.router.navigate(['/marcas'], { queryParamsHandling: 'preserve' });
      return;
    }
    this.error.set(this.admin.error() ?? 'No pudimos guardar la marca. Inténtalo de nuevo.');
  }
}
