import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TiendaFacade } from '../application/tienda.facade';
import { idsDescendientes, aplanarArbolCategorias } from '../domain/categoria.rules';
@Component({
  selector: 'ws-categories-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-ink">Categorías</h1>
      <p class="mt-3 text-sm text-muted">
        Estructura por nombres y subcategorías; el orden puede ser explícito o alfabético.
      </p>
    </div>
    <div class="mt-7 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section class="admin-card p-4">
        @for (entry of tree(); track entry.category.id) {
          <div
            class="flex items-center justify-between border-b border-line p-3"
            [style.padding-left.px]="12 + entry.depth * 24"
          >
            <div>
              <strong>{{ entry.depth ? '↳ ' : '' }}{{ entry.category.name }}</strong>
              <p class="text-xs text-muted">
                Orden: {{ entry.category.order ?? 'alfabético' }} · Padre:
                {{ parentName(entry.category.parentId) }}
              </p>
            </div>
            <div class="flex gap-3 text-sm font-semibold">
              <button class="text-primary" (click)="edit(entry.category.id)">Editar</button>
              <button class="text-danger" (click)="remove(entry.category.id)">Eliminar</button>
            </div>
          </div>
        }
      </section>
      <form [formGroup]="form" (ngSubmit)="save()" class="admin-card p-6">
        <h2 class="text-xl font-semibold">{{ editing() ? 'Editar' : 'Nueva' }} categoría</h2>
        <div class="mt-5 grid gap-3">
          <mat-form-field>
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
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
          <button class="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white" type="submit">
            Guardar
          </button>
          @if (editing()) {
            <button
              type="button"
              class="rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
              (click)="cancel()"
            >
              Cancelar
            </button>
          }
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasPage {
  protected readonly admin = inject(TiendaFacade);
  /** resetForm (no form.reset) limpia también el estado enviado; si no, el formulario vacío se muestra con errores. */
  private readonly formDirective = viewChild.required(FormGroupDirective);
  protected readonly editing = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    parentId: new FormControl('', { nonNullable: true }),
    order: new FormControl<number | null>(null),
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
  protected indent(depth: number) {
    return '  '.repeat(depth) + (depth ? '↳ ' : '');
  }
  protected parentName(id?: string) {
    return id ? (this.admin.categories().find((c) => c.id === id)?.name ?? id) : '—';
  }
  protected edit(id: string) {
    const c = this.admin.categories().find((x) => x.id === id);
    if (!c) return;
    this.editing.set(id);
    this.error.set(null);
    this.form.setValue({ name: c.name, parentId: c.parentId ?? '', order: c.order ?? null });
  }
  protected cancel() {
    this.editing.set(null);
    this.error.set(null);
    this.formDirective().resetForm({ name: '', parentId: '', order: null });
  }
  protected async save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const id = this.editing() ?? crypto.randomUUID();
    if (v.parentId && (v.parentId === id || idsDescendientes(this.admin.categories(), id).has(v.parentId))) {
      this.error.set('Elige un padre que no sea la misma categoría ni una de sus subcategorías.');
      return;
    }
    const saved = await this.admin.upsertCategory({
      id,
      name: v.name,
      parentId: v.parentId || undefined,
      order: v.order ?? undefined,
    });
    if (saved) this.cancel();
  }
  protected async remove(id: string) {
    if (confirm('¿Eliminar categoría?')) await this.admin.deleteCategory(id);
  }
}
