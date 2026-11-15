import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { CuentaFacade } from '../application/cuenta.facade';
import { contrasenaSegura, MENSAJE_CONTRASENA } from './contrasena.validator';

@Component({
  selector: 'ws-recover-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, RouterLink],
  template: `
    <section class="ws-container grid min-h-[60vh] place-items-center py-12">
      <form [formGroup]="form" (ngSubmit)="submit()" class="ws-card ws-outline-fields w-full max-w-lg p-8">
        <h1 class="text-4xl font-semibold">Recuperar contraseña</h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          Primero enviaremos un código temporal. Después podrás definir una contraseña nueva.
        </p>
        <div class="mt-6 grid gap-3">
          <mat-form-field appearance="outline">
            <mat-label>Correo</mat-label>
            <input
              matInput
              autocomplete="email"
              type="email"
              formControlName="email"
              [readonly]="codeRequested()"
            />
            @if (form.controls.email.hasError('required')) {
              <mat-error>Ingresa tu correo.</mat-error>
            } @else if (form.controls.email.invalid) {
              <mat-error>Ingresa un correo válido.</mat-error>
            }
          </mat-form-field>
          @if (codeRequested()) {
            @if (demoCode()) {
              <p class="rounded-xl bg-primary-soft p-3 text-sm text-on-primary-soft">
                <strong>Canal local de demostración:</strong>
                {{ demoCode() }}
              </p>
            }
            <mat-form-field appearance="outline">
              <mat-label>Código de recuperación</mat-label>
              <input
                matInput
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                formControlName="code"
              />
              <mat-error>Ingresa el código de seis dígitos.</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nueva contraseña</mat-label>
              <input matInput autocomplete="new-password" type="password" formControlName="password" />
              <mat-hint>10 caracteres como mínimo, con letras y números.</mat-hint>
              @if (form.controls.password.hasError('required')) {
                <mat-error>Ingresa una contraseña.</mat-error>
              } @else {
                <mat-error>{{ mensajeContrasena }}</mat-error>
              }
            </mat-form-field>
          }
        </div>
        @if (message()) {
          <p class="rounded-xl bg-subtle p-3 text-sm font-semibold" role="status">{{ message() }}</p>
        }
        @if (error()) {
          <p class="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {{ error() }}
          </p>
        }
        <button class="ws-btn-primary mt-4 w-full" type="submit" [disabled]="auth.pending()">
          {{ auth.pending() ? 'Procesando…' : codeRequested() ? 'Actualizar contraseña' : 'Enviar código' }}
        </button>
        @if (codeRequested()) {
          <button
            class="mt-4 w-full text-sm font-semibold underline underline-offset-4"
            type="button"
            (click)="restart()"
          >
            Usar otro correo
          </button>
        }
        <a routerLink="/cuenta/login" class="mt-5 block text-center text-sm font-semibold">
          Volver a iniciar sesión
        </a>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarPage {
  protected readonly auth = inject(CuentaFacade);
  private readonly router = inject(Router);
  protected readonly codeRequested = signal(false);
  protected readonly demoCode = signal('');
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly mensajeContrasena = MENSAJE_CONTRASENA;
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, contrasenaSegura] }),
  });

  protected async submit() {
    this.error.set(null);
    this.message.set(null);
    const emailControl = this.form.controls.email;
    if (emailControl.invalid) {
      emailControl.markAsTouched();
      return;
    }
    if (!this.codeRequested()) {
      const result = await this.auth.requestPasswordReset(emailControl.value);
      this.error.set(result.error ?? null);
      if (result.ok) {
        this.codeRequested.set(true);
        this.demoCode.set(result.testCode ?? '');
        this.message.set('Si el correo está registrado, recibirás un código temporal.');
      }
      return;
    }
    if (this.form.controls.code.invalid || this.form.controls.password.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const result = await this.auth.resetPassword(value.email, value.code, value.password);
    this.error.set(result.error ?? null);
    if (result.ok) {
      this.message.set('Contraseña actualizada. Ya puedes iniciar sesión.');
      setTimeout(() => void this.router.navigate(['/cuenta/login']), 700);
    }
  }

  protected restart() {
    this.codeRequested.set(false);
    this.demoCode.set('');
    this.message.set(null);
    this.error.set(null);
    this.form.controls.code.reset('');
    this.form.controls.password.reset('');
  }
}
