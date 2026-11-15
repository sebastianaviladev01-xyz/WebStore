import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ReclamosFacade } from '../application/reclamos.facade';
import { ConstanciaReclamo, TipoReclamo } from '../domain/reclamo.model';

@Component({
  selector: 'ws-complaints-page',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <section class="ws-container py-12">
      <h1 class="text-4xl font-semibold sm:text-6xl">Libro de reclamaciones</h1>
      <p class="mt-4 max-w-2xl text-muted">
        Registra un reclamo relacionado con un producto o una queja sobre la atención. Conserva el código para
        el seguimiento.
      </p>
      @if (receipt(); as item) {
        <div class="ws-card mt-8 max-w-3xl p-8" role="status">
          <h2 class="text-2xl font-semibold">Solicitud registrada</h2>
          <dl class="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-sm text-muted">Código</dt>
              <dd class="text-xl font-semibold">{{ item.id }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Fecha</dt>
              <dd class="font-semibold">{{ item.createdAt | date: 'medium' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Fecha límite de respuesta</dt>
              <dd class="font-semibold">{{ item.dueAt | date: 'd MMM y' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Tipo</dt>
              <dd class="font-semibold">{{ tipos[item.type] }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Monto declarado</dt>
              <dd class="font-semibold">{{ item.amount | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd>
            </div>
          </dl>
          <p class="mt-6 text-sm leading-6 text-muted">
            La respuesta será enviada al correo registrado. Guarda este código y una copia de la información
            enviada.
          </p>
          <button type="button" class="ws-btn-secondary mt-6" (click)="newRequest()">
            Registrar otra solicitud
          </button>
        </div>
      } @else {
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="ws-card ws-outline-fields mt-8 grid gap-4 p-7 sm:grid-cols-2"
        >
          <mat-form-field>
            <mat-label>Nombre completo</mat-label>
            <input matInput autocomplete="name" formControlName="name" />
            <mat-error>Ingresa tu nombre completo (al menos 3 caracteres).</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>DNI / documento</mat-label>
            <input matInput inputmode="numeric" formControlName="document" />
            <mat-error>Ingresa tu documento (al menos 8 caracteres).</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Correo</mat-label>
            <input matInput autocomplete="email" type="email" formControlName="email" />
            <mat-error>Ingresa un correo válido.</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Teléfono</mat-label>
            <input matInput autocomplete="tel" formControlName="phone" />
            <mat-error>Ingresa un teléfono válido.</mat-error>
          </mat-form-field>
          <mat-form-field class="sm:col-span-2">
            <mat-label>Domicilio</mat-label>
            <input matInput autocomplete="street-address" formControlName="address" />
            <mat-error>Ingresa tu domicilio (al menos 5 caracteres).</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Producto o servicio</mat-label>
            <input matInput formControlName="subject" />
            <mat-error>Indica el producto o servicio.</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Monto del bien</mat-label>
            <input matInput min="0" type="number" formControlName="amount" />
            <mat-error>Ingresa un monto de 0 o más.</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Tipo de solicitud</mat-label>
            <mat-select formControlName="type">
              <mat-option value="reclamo">Reclamo sobre producto o servicio</mat-option>
              <mat-option value="queja">Queja sobre la atención</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field class="sm:col-span-2">
            <mat-label>Detalle de lo ocurrido</mat-label>
            <textarea matInput rows="5" formControlName="detail"></textarea>
            <mat-error>Cuéntanos qué pasó (al menos 10 caracteres).</mat-error>
          </mat-form-field>
          <mat-form-field class="sm:col-span-2">
            <mat-label>Pedido del consumidor</mat-label>
            <textarea matInput rows="3" formControlName="request"></textarea>
            <mat-error>Indica qué solicitas (al menos 5 caracteres).</mat-error>
          </mat-form-field>
          @if (service.error()) {
            <p
              class="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger sm:col-span-2"
              role="alert"
            >
              {{ service.error() }}
            </p>
          }
          <button type="submit" class="ws-btn-primary sm:col-span-2" [disabled]="service.submitting()">
            {{ service.submitting() ? 'Registrando…' : 'Registrar solicitud' }}
          </button>
        </form>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibroReclamacionesPage {
  /** El tipo como se ve en la constancia (PBI-0112). */
  protected readonly tipos: Record<TipoReclamo, string> = { reclamo: 'Reclamo', queja: 'Queja' };
  protected readonly service = inject(ReclamosFacade);
  protected readonly receipt = signal<ConstanciaReclamo | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(7)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)],
    }),
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    type: new FormControl<TipoReclamo>('reclamo', { nonNullable: true }),
    detail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
    request: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)],
    }),
  });
  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.receipt.set(await this.service.submit(this.form.getRawValue()));
  }
  protected newRequest() {
    this.receipt.set(null);
    this.form.reset({
      name: '',
      document: '',
      email: '',
      phone: '',
      address: '',
      subject: '',
      amount: 0,
      type: 'reclamo',
      detail: '',
      request: '',
    });
  }
}
