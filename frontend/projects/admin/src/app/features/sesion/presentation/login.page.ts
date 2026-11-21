import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

import { CREDENCIALES_DE_PRUEBA } from '../../../core/credenciales-de-prueba';
import { SesionFacade } from '../application/sesion.facade';

@Component({
  selector: 'ws-admin-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <main class="grid min-h-screen place-items-center bg-canvas px-5 py-12">
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-full max-w-md rounded-2xl bg-surface p-8 border border-line shadow-[0_18px_55px_color-mix(in_srgb,var(--ws-ink)_8%,transparent)]"
      >
        <div class="flex items-center gap-3">
          <span
            class="grid h-11 w-11 place-items-center rounded-xl bg-primary text-lg font-semibold text-on-primary"
          >
            W
          </span>
          <strong class="text-lg">WebStore Admin</strong>
        </div>
        <h1 class="mt-9 text-3xl font-semibold tracking-[-.025em]">Acceso administrativo</h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          Usa una cuenta activa. Los permisos se validan nuevamente en cada solicitud al BFF.
        </p>
        <div class="mt-7 grid gap-3">
          <mat-form-field>
            <mat-label>Correo</mat-label>
            <input matInput autocomplete="username" type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Contraseña</mat-label>
            <input matInput autocomplete="current-password" type="password" formControlName="password" />
          </mat-form-field>
        </div>
        @if (session.error()) {
          <p class="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {{ session.error() }}
          </p>
        }
        <button
          class="mt-4 min-h-11 w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
          type="submit"
          [disabled]="session.pending()"
        >
          {{ session.pending() ? 'Verificando…' : 'Ingresar al panel' }}
        </button>
        <!-- PBI-0071: las credenciales de prueba solo en modo demo o si el BFF las pide; nunca en la instalación de un cliente. -->
        @if (credencialesDePrueba()) {
          <details class="mt-6 text-xs leading-5 text-muted">
            <summary class="cursor-pointer font-semibold">Credenciales del entorno local</summary>
            <p class="mt-2">Superadministrador: owner@webstore.demo / WebStore#2026</p>
            <p>Administrador: admin@webstore.demo / Admin#2026</p>
            <p>Vendedor: catalogo@webstore.demo / Catalogo#2026</p>
          </details>
        }
      </form>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  protected readonly session = inject(SesionFacade);
  protected readonly credencialesDePrueba = inject(CREDENCIALES_DE_PRUEBA);
  private readonly router = inject(Router);
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    // PBI-0151: tras una sesión vencida, vuelve a la página donde estaba (y a su borrador); si no, al Resumen.
    if (await this.session.login(value.email, value.password))
      await this.router.navigateByUrl(this.session.tomarRetorno());
  }
}
