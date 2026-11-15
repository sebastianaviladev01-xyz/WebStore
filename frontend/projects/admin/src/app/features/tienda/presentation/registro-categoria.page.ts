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
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';

import { TiendaFacade } from '../application/tienda.facade';
import { mensajeDeError } from '../domain/formulario.rules';
import { motivoDeCategoriaRepetida, slugDe } from '../domain/registro-unico.rules';
import { conservarBorrador } from './borrador';
import { idsDescendientes, aplanarArbolCategorias } from '../domain/categoria.rules';
import { Categoria } from '../domain/tienda.model';

/**
 * Interfaz de registro de una categoría (feature 008): `/categorias/nueva` y `/categorias/:id`. Es el formulario que
 * antes estaba junto a la lista, con los mismos campos, la exclusión de sí misma y de sus subcategorías y el aviso de
 * ciclo. Al editar trae los datos actuales con `refresh()`; al guardar, al cancelar y con «Volver a categorías»
 * vuelve al listado con sus filtros y su página (`queryParamsHandling: 'preserve'`).
 */
@Component({
  selector: 'ws-category-form-page',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <a class="text-sm font-semibold text-link" routerLink="/categorias" queryParamsHandling="preserve">
      ← Volver a categorías
    </a>
    <h1 id="titulo-formulario-categoria" class="mt-3 text-3xl font-semibold tracking-tight text-ink">
      {{ editing() ? 'Editar' : 'Nueva' }} categoría
    </h1>
    @if (loadingCategory()) {
      <p class="admin-card mt-7 max-w-2xl p-6 text-sm text-muted" role="status">Cargando…</p>
    } @else if (missing()) {
      <div class="admin-card mt-7 max-w-2xl p-6" role="alert">
        <p class="font-semibold">Esta categoría ya no existe</p>
        <p class="mt-2 text-sm text-muted">
          Otra persona la eliminó. Vuelve al listado para ver las categorías actuales.
        </p>
      </div>
    } @else {
      @if (borrador.aviso(); as aviso) {
        <p class="mt-7 max-w-2xl rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">
          {{ aviso }}
        </p>
      }
      @if (staleNotice()) {
        <p class="mt-7 max-w-2xl rounded-xl bg-warning-soft p-4 text-sm text-warning" role="alert">
          {{ staleNotice() }}
        </p>
      }
      <form
        [formGroup]="form"
        (ngSubmit)="save()"
        class="admin-card mt-7 max-w-2xl p-6"
        aria-labelledby="titulo-formulario-categoria"
      >
        <div class="grid gap-3">
          <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
          <mat-form-field [subscriptSizing]="form.controls.name.hasError('repetido') ? 'dynamic' : 'fixed'">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
            <mat-error>{{ mensaje(form.controls.name.errors) }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Categoría padre</mat-label>
            <mat-select formControlName="parentId">
              <mat-option value="">Sin padre</mat-option>
              @for (entry of parentOptions(); track entry.category.id) {
                <mat-option [value]="entry.category.id">
                  {{ indent(entry.depth) }}{{ entry.category.name }}
                </mat-option>
              }
            </mat-select>
            @if (editing()) {
              <mat-hint>No se puede elegir la misma categoría ni una de sus subcategorías.</mat-hint>
            }
          </mat-form-field>
          <mat-form-field>
            <mat-label>Orden (opcional)</mat-label>
            <input matInput type="number" formControlName="order" />
          </mat-form-field>
        </div>
        @if (error()) {
          <p class="mt-3 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {{ error() }}
          </p>
        }
        <div class="mt-4 flex gap-3">
          <button
            class="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            {{ admin.saving() ? 'Guardando…' : 'Guardar' }}
          </button>
          <a
            class="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
            routerLink="/categorias"
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
export class RegistroCategoriaPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly router = inject(Router);
  /** `:id` de `/categorias/:id` (`withComponentInputBinding`); no llega en `/categorias/nueva`. */
  readonly id = input<string>();
  protected readonly editing = computed(() => this.id() ?? null);
  /** Id de la categoría nueva, fijo mientras la página está abierta: un segundo envío no crea otra (PBI-0121). */
  private readonly idNuevo = crypto.randomUUID();
  /** La categoría tal como se cargó al abrir la edición: lo que cambió se calcula contra ella (PBI-0120). */
  private base: Categoria | null = null;
  /** Mientras la edición trae los datos actuales: «Cargando…» en lugar del formulario. */
  protected readonly loadingCategory = signal(false);
  /** La categoría en edición ya no está en el snapshot actual: otra persona la eliminó. */
  protected readonly missing = signal(false);
  /** Aviso si no se pudieron traer los datos actuales y el formulario usa los que había en memoria. */
  protected readonly staleNotice = signal<string | null>(null);
  /** Aviso de ciclo o motivo del último guardado rechazado, junto al botón; el formulario conserva lo escrito. */
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    parentId: new FormControl('', { nonNullable: true }),
    order: new FormControl<number | null>(null),
  });
  protected readonly mensaje = mensajeDeError;
  /** PBI-0151: lo escrito vuelve si la sesión venció a mitad de la edición; se aplica después de traer la categoría. */
  protected readonly borrador = conservarBorrador({
    form: this.form,
    guardar: () => this.form.getRawValue(),
    restaurar: (valor) => this.form.setValue(valor),
    diferido: true,
  });
  /** Lista en orden jerárquico: cada subcategoría debajo de su padre. */
  protected readonly tree = computed(() => aplanarArbolCategorias(this.admin.categories()));
  /** Una categoría no puede colgar de sí misma ni de una de sus subcategorías: formaría un ciclo en el menú de la tienda. */
  protected readonly parentOptions = computed(() => {
    const id = this.editing();
    if (!id) return this.tree();
    const excluded = idsDescendientes(this.admin.categories(), id);
    return this.tree().filter((entry) => entry.category.id !== id && !excluded.has(entry.category.id));
  });
  constructor() {
    // Al abrir la edición (o cambiar de `:id` sin salir de la página) se traen los datos actuales.
    effect(() => {
      const id = this.editing();
      if (id) untracked(() => void this.edit(id));
      else untracked(() => this.borrador.aplicar());
    });
  }
  protected indent(depth: number) {
    return '  '.repeat(depth) + (depth ? '↳ ' : '');
  }
  /** Trae el snapshot actual y rellena el formulario; si ya no existe, lo dice; si la consulta falla, avisa. */
  private async edit(id: string) {
    this.loadingCategory.set(true);
    this.missing.set(false);
    this.staleNotice.set(null);
    this.error.set(null);
    const current = await this.admin.refresh();
    if (!current) {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    const c = this.admin.categories().find((x) => x.id === id);
    this.base = c ?? null;
    if (c) {
      this.form.setValue({ name: c.name, parentId: c.parentId ?? '', order: c.order ?? null });
      this.borrador.aplicar();
    } else this.missing.set(true);
    this.loadingCategory.set(false);
  }
  protected async save() {
    if (this.admin.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const id = this.editing() ?? this.idNuevo;
    if (v.parentId && (v.parentId === id || idsDescendientes(this.admin.categories(), id).has(v.parentId))) {
      this.error.set('Elige un padre que no sea la misma categoría ni una de sus subcategorías.');
      return;
    }
    // PBI-0148: dirección única, comprobada antes de enviar (el BFF la vuelve a comprobar). Un choque que ya existía
    // antes de editar (datos anteriores) no bloquea: solo se revisa si el nombre cambia de dirección.
    const repetida = motivoDeCategoriaRepetida(this.admin.categories(), { id, name: v.name });
    if (repetida && (!this.base || slugDe(this.base.name) !== slugDe(v.name))) {
      this.form.controls.name.setErrors({ repetido: repetida });
      this.form.controls.name.markAsTouched();
      return;
    }
    this.error.set(null);
    const saved = await this.admin.guardarCategoria(this.base, {
      id,
      name: v.name,
      parentId: v.parentId || undefined,
      order: v.order ?? undefined,
    });
    if (saved) {
      await this.router.navigate(['/categorias'], { queryParamsHandling: 'preserve' });
      return;
    }
    this.error.set(this.admin.tomarError() ?? 'No pudimos guardar la categoría. Inténtalo de nuevo.');
  }
}
