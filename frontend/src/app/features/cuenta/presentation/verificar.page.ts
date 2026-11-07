import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CuentaFacade } from '../application/cuenta.facade';

@Component({
  selector: 'ws-verify-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, RouterLink],
  template: `
    <section class="ws-container grid min-h-[60vh] place-items-center py-12">
      <div class="ws-card w-full max-w-lg p-8">
        <h1 class="text-4xl font-semibold">Verifica tu cuenta</h1>
        @if (!email) {
          <p class="mt-3 text-sm leading-6 text-muted">
            No sabemos qué correo verificar. Regístrate o inicia sesión para recibir un código nuevo.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <a routerLink="/cuenta/registro" class="ws-btn-primary">Crear cuenta</a>
            <a routerLink="/cuenta/login" class="ws-btn-secondary">Iniciar sesión</a>
          </div>
        } @else {
          <p class="mt-3 text-sm leading-6 text-muted">Ingresa el código temporal enviado a {{ email }}.</p>
          @if (demoCode) {
            <p class="mt-4 rounded-xl bg-primary-soft p-3 text-sm text-primary-strong">
              <strong>Canal local de demostración:</strong>
              {{ demoCode }}
            </p>
          }
          <mat-form-field class="mt-6">
            <mat-label>Código</mat-label>
            <input
              matInput
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              [formControl]="code"
            />
          </mat-form-field>
          @if (error()) {
            <p class="text-sm font-semibold text-danger" role="alert">{{ error() }}</p>
          }
          <button
            class="ws-btn-primary mt-3 w-full"
            type="button"
            [disabled]="auth.pending()"
            (click)="verify()"
          >
            {{ auth.pending() ? 'Verificando…' : 'Verificar cuenta' }}
          </button>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificarPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(CuentaFacade);
  private readonly router = inject(Router);
  protected readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
  protected readonly demoCode = this.route.snapshot.queryParamMap.get('demoCode') ?? '';
  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  protected readonly error = signal<string | null>(null);
  protected async verify() {
    if (this.code.invalid) {
      this.code.markAsTouched();
      this.error.set('Ingresa el código de seis dígitos.');
      return;
    }
    const result = await this.auth.verify(this.email, this.code.value);
    this.error.set(result.error ?? null);
    if (result.ok) await this.router.navigate(['/cuenta/login']);
  }
}
