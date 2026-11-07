import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { CuentaFacade } from '../application/cuenta.facade';
@Component({
  selector: 'ws-register-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="ws-container grid place-items-center py-12">
      <form [formGroup]="form" (ngSubmit)="submit()" class="ws-card w-full max-w-2xl p-7 sm:p-9">
        <h1 class="text-4xl font-semibold">Crear cuenta</h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          Tu cuenta es opcional para comprar y te permite administrar tus datos y pedidos.
        </p>
        <div class="mt-7 grid gap-3 sm:grid-cols-2">
          <mat-form-field>
            <mat-label>Nombres y apellidos</mat-label>
            <input matInput autocomplete="name" formControlName="fullName" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Correo</mat-label>
            <input matInput autocomplete="email" type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Teléfono</mat-label>
            <input matInput autocomplete="tel" formControlName="phone" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>DNI</mat-label>
            <input matInput inputmode="numeric" formControlName="document" />
          </mat-form-field>
          <mat-form-field class="sm:col-span-2">
            <mat-label>Contraseña</mat-label>
            <input matInput autocomplete="new-password" type="password" formControlName="password" />
            <mat-hint>10 caracteres como mínimo, con letras y números.</mat-hint>
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
  protected readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.pattern(/^(?=.*[A-Za-zÁÉÍÓÚÑáéíóúñ])(?=.*\d).+$/),
      ],
    }),
  });
  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const r = await this.auth.register(v);
    this.error.set(r.error ?? null);
    if (r.ok)
      await this.router.navigate(['/cuenta/verificar'], {
        queryParams: { email: v.email, ...(r.testCode ? { demoCode: r.testCode } : {}) },
      });
  }
}
