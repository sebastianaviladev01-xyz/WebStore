import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { CuentaFacade } from '../application/cuenta.facade';

@Component({
  selector: 'ws-profile-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, RouterLink],
  template: `
    <section class="ws-container py-12">
      @if (!auth.ready()) {
        <div class="ws-card p-8 text-center" role="status">Cargando tu cuenta…</div>
      } @else if (auth.currentUser(); as user) {
        <div class="grid gap-6 lg:grid-cols-[1fr_300px]">
          <form [formGroup]="form" (ngSubmit)="save()" class="ws-card p-7">
            <h1 class="text-4xl font-semibold">Datos personales</h1>
            <p class="mt-2 text-sm text-muted">{{ user.email }} · cuenta verificada</p>
            <div class="mt-7 grid gap-3 sm:grid-cols-2">
              <mat-form-field>
                <mat-label>Nombre</mat-label>
                <input matInput autocomplete="name" formControlName="fullName" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Teléfono</mat-label>
                <input matInput autocomplete="tel" formControlName="phone" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>DNI</mat-label>
                <input matInput formControlName="document" />
              </mat-form-field>
            </div>
            @if (message()) {
              <p class="mb-4 rounded-xl bg-subtle p-3 text-sm font-semibold" role="status">{{ message() }}</p>
            }
            @if (error()) {
              <p class="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
                {{ error() }}
              </p>
            }
            <button class="ws-btn-primary" type="submit" [disabled]="auth.pending()">
              {{ auth.pending() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </form>
          <aside class="ws-card p-6">
            <a routerLink="/pedidos" class="ws-btn-secondary w-full">Mis pedidos</a>
            <button class="ws-btn-secondary mt-3 w-full" type="button" (click)="logout()">
              Cerrar sesión
            </button>
            <button class="mt-6 min-h-11 text-sm font-semibold text-danger" type="button" (click)="remove()">
              Eliminar mi cuenta
            </button>
          </aside>
        </div>
      } @else {
        <div class="ws-card p-8 text-center">
          <h1 class="text-3xl font-semibold">Inicia sesión para administrar tu cuenta</h1>
          <a routerLink="/cuenta/login" class="ws-btn-primary mt-6">Iniciar sesión</a>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilPage {
  protected readonly auth = inject(CuentaFacade);
  private readonly router = inject(Router);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user)
        this.form.setValue(
          { fullName: user.fullName, phone: user.phone, document: user.document },
          { emitEvent: false },
        );
    });
  }

  protected async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const result = await this.auth.updateProfile(this.form.getRawValue());
    this.error.set(result.error ?? null);
    this.message.set(result.ok ? 'Cambios guardados.' : null);
  }
  protected async logout() {
    await this.auth.logout();
    await this.router.navigate(['/']);
  }
  protected async remove() {
    if (!confirm('¿Eliminar tu cuenta? Esta acción cerrará la sesión y eliminará tus credenciales.')) return;
    const result = await this.auth.deleteAccount();
    this.error.set(result.error ?? null);
    if (result.ok) await this.router.navigate(['/']);
  }
}
