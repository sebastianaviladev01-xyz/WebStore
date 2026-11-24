import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { CuentaFacade } from '../application/cuenta.facade';
import { contrasenaSegura, MENSAJE_CONTRASENA } from './contrasena.validator';

/**
 * Recuperar la contraseña (PBI-0154, lote 08). Lote 16 (ADR-0021, PBI-0180): como en `/cuenta/verificar`, los textos
 * dicen «te enviamos un código», como pidió Daniel. Sin correo real (PBI-0008), el código de demostración se muestra en
 * la página, en el «Canal local de demostración».
 *
 * Lote 20 (ADR-0021): el código y la contraseña nueva aparecen sin errores al pedir el código. Material marca en rojo
 * un campo inválido de un formulario ya enviado, y «Enviar código» lo envía; por eso, al aparecer, el formulario vuelve
 * a «no enviado» (`resetForm` con los mismos valores). Como en el resto de la tienda, el error sale al salir del campo o
 * al intentar enviar.
 */
@Component({
  selector: 'ws-recover-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, RouterLink],
  template: `
    <section class="ws-container grid min-h-[60vh] place-items-center py-12">
      <form
        #formulario="ngForm"
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="ws-card ws-outline-fields w-full max-w-lg p-8"
      >
        <h1 class="text-4xl font-semibold">Recuperar contraseña</h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          Escribe el correo de tu cuenta y te enviaremos un código temporal. Después podrás definir una
          contraseña nueva.
        </p>
        <div class="mt-6 grid gap-3">
          <mat-form-field>
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
            <mat-form-field>
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
            <mat-form-field>
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
  private readonly formulario = viewChild.required<FormGroupDirective>('formulario');
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
        this.formulario().resetForm(this.form.getRawValue());
        this.codeRequested.set(true);
        this.demoCode.set(result.testCode ?? '');
        this.message.set('Si hay una cuenta con ese correo, te enviamos un código temporal.');
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
