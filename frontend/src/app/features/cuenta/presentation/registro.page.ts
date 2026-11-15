import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { CuentaFacade } from '../application/cuenta.facade';
import { contrasenaSegura, MENSAJE_CONTRASENA } from './contrasena.validator';
@Component({
  selector: 'ws-register-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="ws-container grid place-items-center py-12">
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="ws-card ws-outline-fields w-full max-w-2xl p-7 sm:p-9"
      >
        <h1 class="text-4xl font-semibold">Crear cuenta</h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          Tu cuenta es opcional para comprar y te permite administrar tus datos y pedidos.
        </p>
        <div class="mt-7 grid gap-3 sm:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>Nombres y apellidos</mat-label>
            <input matInput autocomplete="name" formControlName="fullName" />
            <mat-error>Ingresa tu nombre y apellidos.</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Correo</mat-label>
            <input matInput autocomplete="email" type="email" formControlName="email" />
            @if (form.controls.email.hasError('required')) {
              <mat-error>Ingresa tu correo.</mat-error>
            } @else if (form.controls.email.invalid) {
              <mat-error>Ingresa un correo válido.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Teléfono</mat-label>
            <input matInput autocomplete="tel" formControlName="phone" />
            <mat-error>Ingresa tu teléfono.</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>DNI</mat-label>
            <input matInput inputmode="numeric" formControlName="document" />
            <mat-error>Ingresa tu DNI (al menos 8 caracteres).</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="sm:col-span-2">
            <mat-label>Contraseña</mat-label>
            <input matInput autocomplete="new-password" type="password" formControlName="password" />
            <mat-hint>10 caracteres como mínimo, con letras y números.</mat-hint>
            @if (form.controls.password.hasError('required')) {
              <mat-error>Ingresa una contraseña.</mat-error>
            } @else {
              <mat-error>{{ mensajeContrasena }}</mat-error>
            }
          </mat-form-field>
        </div>
        @if (error()) {
          <p class="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {{ error() }}
          </p>
        }
        <button class="ws-btn-primary mt-4" type="submit" [disabled]="auth.pending()">
          {{ auth.pending() ? 'Creando cuenta…' : 'Registrar y verificar correo' }}
        </button>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroPage {
  protected readonly auth = inject(CuentaFacade);
  private readonly router = inject(Router);
  protected readonly error = signal<string | null>(null);
  protected readonly mensajeContrasena = MENSAJE_CONTRASENA;
  protected readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, contrasenaSegura] }),
  });
  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const r = await this.auth.register(v);
    this.error.set(r.error ?? null);
    // El código de demostración queda en la facade, en memoria: no viaja en la URL (PBI-0098).
    if (r.ok) await this.router.navigate(['/cuenta/verificar'], { queryParams: { email: v.email } });
  }
}
