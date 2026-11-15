import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';

import { CuentaFacade } from '../application/cuenta.facade';

/**
 * Verificar la cuenta (PBI-0098, lote 05). El correo llega por la URL o se escribe; el código de demostración solo
 * vive en memoria (`CuentaFacade.codigoDeDemostracion`), nunca en la URL; «Enviar un código nuevo» usa el reenvío del
 * BFF. Los textos no dicen que se envió un correo: no hay correo real (PBI-0008).
 */
@Component({
  selector: 'ws-verify-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="ws-container grid min-h-[60vh] place-items-center py-12">
      <form [formGroup]="form" (ngSubmit)="verify()" class="ws-card ws-outline-fields w-full max-w-lg p-8">
        <h1 class="text-4xl font-semibold">Verifica tu cuenta</h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          Ingresa el correo de tu cuenta y el código de verificación de seis dígitos.
        </p>
        @if (demoCode(); as code) {
          <p class="mt-4 rounded-xl bg-primary-soft p-3 text-sm text-on-primary-soft">
            <strong>Canal local de demostración:</strong>
            {{ code }}
          </p>
        }
        <div class="mt-6 grid gap-3">
          <mat-form-field appearance="outline">
            <mat-label>Correo</mat-label>
            <input matInput type="email" autocomplete="email" formControlName="email" />
            @if (form.controls.email.hasError('required')) {
              <mat-error>Ingresa tu correo.</mat-error>
            } @else if (form.controls.email.invalid) {
              <mat-error>Ingresa un correo válido.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Código</mat-label>
            <input
              matInput
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              formControlName="code"
            />
            <mat-error>Ingresa el código de seis dígitos.</mat-error>
          </mat-form-field>
        </div>
        @if (message()) {
          <p class="rounded-xl bg-subtle p-3 text-sm font-semibold" role="status">{{ message() }}</p>
        }
        @if (error()) {
          <p class="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {{ error() }}
          </p>
        }
        <button class="ws-btn-primary mt-3 w-full" type="submit" [disabled]="auth.pending()">
          {{ auth.pending() ? 'Verificando…' : 'Verificar cuenta' }}
        </button>
        <button
          class="ws-btn-secondary mt-3 w-full"
          type="button"
          [disabled]="auth.pending()"
          (click)="resend()"
        >
          Enviar un código nuevo
        </button>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificarPage {
  protected readonly auth = inject(CuentaFacade);
  private readonly router = inject(Router);
  protected readonly form = new FormGroup({
    email: new FormControl(inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });
  private readonly email = signal(this.form.controls.email.value);
  /** El código de demostración del correo escrito, si el último alta o reenvío fue de ese correo. */
  protected readonly demoCode = computed(() => {
    const demo = this.auth.codigoDeDemostracion();
    return demo && demo.email === this.email().trim().toLowerCase() ? demo.code : null;
  });
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.form.controls.email.valueChanges.subscribe((email) => this.email.set(email));
  }

  protected async verify() {
    this.message.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, code } = this.form.getRawValue();
    const result = await this.auth.verify(email, code);
    this.error.set(result.error ?? null);
    if (result.ok) await this.router.navigate(['/cuenta/login']);
  }

  protected async resend() {
    this.message.set(null);
    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsTouched();
      return;
    }
    const result = await this.auth.resendVerification(email.value);
    this.error.set(result.error ?? null);
    if (result.ok)
      this.message.set(
        'Si hay una cuenta sin verificar con ese correo, generamos un código nuevo y el anterior deja de valer.',
      );
  }
}
