import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TiendaFacade } from '../application/tienda.facade';
@Component({
  selector: 'ws-customers-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Clientes</h1>
    <p class="mt-3 text-sm text-muted">
      Cliente y usuario son registros distintos: una compra como invitado genera cliente sin obligar a crear
      cuenta.
    </p>
    <div class="mt-7 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section class="admin-card p-4">
        @for (c of admin.customers(); track c.id) {
          <div class="grid grid-cols-[1fr_140px_90px] items-center border-b border-line p-3">
            <div>
              <strong>{{ c.name }}</strong>
              <p class="text-xs text-muted">{{ c.email }} · {{ c.document }}</p>
            </div>
            <span class="text-sm">{{ c.orders }} pedidos</span>
            <div class="flex gap-2 text-sm font-semibold">
              <button class="text-link" (click)="edit(c.id)">Editar</button>
              <button
                class="text-danger"
                [attr.aria-label]="'Eliminar cliente ' + c.name"
                (click)="remove(c.id)"
              >
                Eliminar
              </button>
            </div>
          </div>
        }
      </section>
      <form [formGroup]="form" (ngSubmit)="save()" class="admin-card p-6">
        <h2 class="text-xl font-semibold">Cliente</h2>
        <div class="mt-5 grid gap-3">
          <mat-form-field>
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Correo</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Documento</mat-label>
            <input matInput formControlName="document" />
          </mat-form-field>
        </div>
        <button
          class="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
          type="submit"
        >
          Guardar
        </button>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesPage {
  protected readonly admin = inject(TiendaFacade);
  /** resetForm (no form.reset) limpia también el estado enviado; si no, el formulario vacío se muestra con errores. */
  private readonly formDirective = viewChild.required(FormGroupDirective);
  protected readonly editing = signal<string | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    document: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected edit(id: string) {
    const c = this.admin.customers().find((x) => x.id === id);
    if (!c) return;
    this.editing.set(id);
    this.form.setValue({ name: c.name, email: c.email, document: c.document });
  }
  protected async save() {
    if (this.form.invalid) return;
    const old = this.admin.customers().find((x) => x.id === this.editing());
    const saved = await this.admin.upsertCustomer({
      id: this.editing() ?? crypto.randomUUID(),
      orders: old?.orders ?? 0,
      ...this.form.getRawValue(),
    });
    if (!saved) return;
    this.editing.set(null);
    this.formDirective().resetForm({ name: '', email: '', document: '' });
  }
  protected async remove(id: string) {
    if (confirm('¿Eliminar cliente?')) await this.admin.deleteCustomer(id);
  }
}
