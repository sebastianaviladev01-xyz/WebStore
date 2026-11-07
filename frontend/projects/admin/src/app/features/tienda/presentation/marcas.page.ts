import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TiendaFacade } from '../application/tienda.facade';
@Component({
  selector: 'ws-brands-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatCheckboxModule],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Marcas</h1>
    <div class="mt-7 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section class="admin-card p-4">
        @for (b of admin.brands(); track b.id) {
          <div class="flex items-center justify-between border-b border-line p-3">
            <div>
              <strong>{{ b.name }}</strong>
              <p class="text-xs text-muted">{{ b.active ? 'Activa' : 'Inactiva' }}</p>
            </div>
            <div class="flex gap-3 text-sm font-semibold">
              <button class="text-primary" (click)="edit(b.id)">Editar</button>
              <button class="text-danger" (click)="remove(b.id)">Eliminar</button>
            </div>
          </div>
        }
      </section>
      <form [formGroup]="form" (ngSubmit)="save()" class="admin-card p-6">
        <h2 class="text-xl font-semibold">Marca</h2>
        <mat-form-field class="mt-5">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-checkbox formControlName="active">Activa</mat-checkbox>
        <button
          class="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          type="submit"
        >
          Guardar
        </button>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarcasPage {
  protected readonly admin = inject(TiendaFacade);
  /** resetForm (no form.reset) limpia también el estado enviado; si no, el formulario vacío se muestra con errores. */
  private readonly formDirective = viewChild.required(FormGroupDirective);
  protected readonly editing = signal<string | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    active: new FormControl(true, { nonNullable: true }),
  });
  protected edit(id: string) {
    const b = this.admin.brands().find((x) => x.id === id);
    if (!b) return;
    this.editing.set(id);
    this.form.setValue({ name: b.name, active: b.active });
  }
  protected async save() {
    if (this.form.invalid) return;
    const saved = await this.admin.upsertBrand({
      id: this.editing() ?? crypto.randomUUID(),
      ...this.form.getRawValue(),
    });
    if (!saved) return;
    this.editing.set(null);
    this.formDirective().resetForm({ name: '', active: true });
  }
  protected async remove(id: string) {
    if (confirm('¿Eliminar marca?')) await this.admin.deleteBrand(id);
  }
}
