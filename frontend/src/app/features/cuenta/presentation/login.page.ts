import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { CuentaFacade } from '../application/cuenta.facade';
import { rutaDeRetorno } from '../domain/cuenta.rules';
@Component({
  selector: 'ws-login-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, RouterLink],
  template: `
    <section class="ws-container grid min-h-[65vh] place-items-center py-12">
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="ws-card ws-outline-fields w-full max-w-lg p-7 sm:p-9"
      >
        <h1 class="text-4xl font-semibold">Iniciar sesión</h1>
        <p class="mt-3 text-sm text-muted">
          La cuenta es opcional para comprar, pero permite gestionar pedidos y datos personales.
        </p>
        @if (auth.sesionVencida()) {
          <p class="mt-4 rounded-xl bg-subtle p-3 text-sm font-semibold" role="status">
            Tu sesión venció. Ingresa de nuevo para continuar.
          </p>
        }
        <div class="mt-7 grid gap-3">
          <mat-form-field>
            <mat-label>Correo</mat-label>
            <input matInput type="email" autocomplete="email" formControlName="email" />
            @if (form.controls.email.hasError('required')) {
              <mat-error>Ingresa tu correo.</mat-error>
            } @else if (form.controls.email.invalid) {
              <mat-error>Ingresa un correo válido.</mat-error>
            }
          </mat-form-field>
          <mat-form-field>
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" autocomplete="current-password" formControlName="password" />
            <mat-error>Ingresa tu contraseña.</mat-error>
          </mat-form-field>
        </div>
        @if (error()) {
          <div class="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            <p>{{ error() }}</p>
            @if (sinVerificar()) {
              <a
                routerLink="/cuenta/verificar"
                [queryParams]="{ email: form.controls.email.value }"
                class="mt-2 inline-block underline underline-offset-4"
              >
                Verificar cuenta
              </a>
            }
          </div>
        }
        <button class="ws-btn-primary mt-4 w-full" type="submit" [disabled]="auth.pending()">
          {{ auth.pending() ? 'Ingresando…' : 'Ingresar' }}
        </button>
        <div class="mt-5 flex flex-wrap justify-between gap-3 text-sm font-semibold">
          <a routerLink="/cuenta/registro" class="text-link">Crear cuenta</a>
          <a routerLink="/cuenta/recuperar">Olvidé mi contraseña</a>
        </div>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  /** Página a la que se vuelve después de ingresar, por ejemplo tras una sesión vencida (PBI-0114). */
  readonly volver = input<string | undefined>();
  protected readonly auth = inject(CuentaFacade);
  private readonly router = inject(Router);
  protected readonly error = signal<string | null>(null);
  /** El BFF respondió que la cuenta no está verificada: se ofrece ir a verificarla (PBI-0098). */
  protected readonly sinVerificar = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.auth.olvidarSesionVencida());
  }

  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const r = await this.auth.login(this.form.value.email!, this.form.value.password!);
    this.error.set(r.error ?? null);
    this.sinVerificar.set(r.code === 'ACCOUNT_NOT_VERIFIED');
    if (r.ok) await this.router.navigateByUrl(rutaDeRetorno(this.volver()));
  }
}
