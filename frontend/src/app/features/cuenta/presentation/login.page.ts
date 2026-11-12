import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { CuentaFacade } from '../application/cuenta.facade';
@Component({
  selector: 'ws-login-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, RouterLink],
  template: `
    <section class="ws-container grid min-h-[65vh] place-items-center py-12">
      <form [formGroup]="form" (ngSubmit)="submit()" class="ws-card w-full max-w-lg p-7 sm:p-9">
        <h1 class="text-4xl font-semibold">Iniciar sesión</h1>
        <p class="mt-3 text-sm text-muted">
          La cuenta es opcional para comprar, pero permite gestionar pedidos y datos personales.
        </p>
        <div class="mt-7 grid gap-3">
          <mat-form-field>
            <mat-label>Correo</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" />
          </mat-form-field>
        </div>
        @if (error()) {
          <p class="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {{ error() }}
          </p>
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
  protected readonly auth = inject(CuentaFacade);
  private readonly router = inject(Router);
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const r = await this.auth.login(this.form.value.email!, this.form.value.password!);
    this.error.set(r.error ?? null);
    if (r.ok) await this.router.navigate(['/cuenta/perfil']);
  }
}
