import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SesionFacade } from '../application/sesion.facade';
import { PerfilError } from '../domain/sesion.gateway';
import { esContrasenaSegura, MENSAJE_CONTRASENA_DEBIL } from '../domain/perfil.rules';
import { definicionDeRol } from '../domain/rol.rules';

const contrasenaSegura = (control: AbstractControl): ValidationErrors | null =>
  !control.value || esContrasenaSegura(control.value) ? null : { debil: true };

const repetidaIgual = (grupo: AbstractControl): ValidationErrors | null => {
  const { nueva, repetida } = grupo.value as { nueva: string; repetida: string };
  return repetida && nueva !== repetida ? { distintas: true } : null;
};

/**
 * Perfil de la cuenta de la sesión (feature 003, AC-12, D5): nombre, correo, rol y lo que ese rol puede hacer. Desde
 * el lote 07b (ADR-0017, PBI-0034) los tres roles editan su nombre y su correo y
 * cambian su contraseña pidiendo la actual, con las rutas propias del BFF (no el snapshot). Al cambiar la contraseña,
 * el BFF cierra las demás sesiones de la persona. Daniel respondió el 2026-11-18 que el correo nuevo debe verificarse
 * (PBI-0161): espera al correo real (PBI-0008); hasta entonces, el correo cambia sin verificar.
 */
@Component({
  selector: 'ws-admin-perfil',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Perfil</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Datos de la cuenta con la que iniciaste sesión.</p>

    @if (session.user()) {
      <form
        [formGroup]="datos"
        (ngSubmit)="guardarDatos()"
        class="admin-card mt-6 max-w-2xl p-6"
        aria-labelledby="perfil-datos"
      >
        <h2 id="perfil-datos" class="text-lg font-semibold">Datos de la cuenta</h2>
        <div class="mt-4 grid gap-3">
          <mat-form-field>
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" autocomplete="name" />
            <mat-error>Completa este campo.</mat-error>
          </mat-form-field>
          <mat-form-field [subscriptSizing]="datos.controls.email.hasError('bff') ? 'dynamic' : 'fixed'">
            <mat-label>Correo</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            <mat-error>{{ errorDeCorreo() }}</mat-error>
          </mat-form-field>
        </div>
        <dl class="mt-1 grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
          <dt class="text-sm font-semibold text-muted">Rol</dt>
          <dd class="text-ink">
            <span class="font-semibold">{{ rol()?.label }}</span>
            <span class="mt-1 block text-sm text-muted">{{ rol()?.description }}</span>
          </dd>
        </dl>
        @if (errorDatos(); as mensaje) {
          <p
            class="mt-5 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
            role="alert"
          >
            {{ mensaje }}
          </p>
        }
        @if (datosGuardados()) {
          <p class="mt-5 rounded-xl bg-primary-soft p-3 text-sm text-on-primary-soft" role="status">
            Guardamos tus datos.
          </p>
        }
        <button
          class="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
          type="submit"
          [disabled]="guardandoDatos()"
        >
          {{ guardandoDatos() ? 'Guardando…' : 'Guardar datos' }}
        </button>
      </form>

      <form
        [formGroup]="contrasena"
        (ngSubmit)="cambiarContrasena()"
        class="admin-card mt-6 max-w-2xl p-6"
        aria-labelledby="perfil-contrasena"
      >
        <h2 id="perfil-contrasena" class="text-lg font-semibold">Cambiar contraseña</h2>
        <p class="mt-1 text-sm text-muted">Al cambiarla se cierran tus otras sesiones abiertas.</p>
        <div class="mt-4 grid gap-3">
          <mat-form-field
            [subscriptSizing]="contrasena.controls.actual.hasError('bff') ? 'dynamic' : 'fixed'"
          >
            <mat-label>Contraseña actual</mat-label>
            <input matInput type="password" formControlName="actual" autocomplete="current-password" />
            <mat-error>{{ errorDe(contrasena.controls.actual) }}</mat-error>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Nueva contraseña</mat-label>
            <input matInput type="password" formControlName="nueva" autocomplete="new-password" />
            <mat-hint>{{ politica }}</mat-hint>
            <mat-error>{{ errorDe(contrasena.controls.nueva) }}</mat-error>
          </mat-form-field>
          <mat-form-field class="mt-2">
            <mat-label>Repite la nueva contraseña</mat-label>
            <input matInput type="password" formControlName="repetida" autocomplete="new-password" />
            <mat-error>{{ errorDeRepetida() }}</mat-error>
          </mat-form-field>
        </div>
        @if (errorContrasena(); as mensaje) {
          <p
            class="mt-5 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
            role="alert"
          >
            {{ mensaje }}
          </p>
        }
        @if (contrasenaCambiada()) {
          <p class="mt-5 rounded-xl bg-primary-soft p-3 text-sm text-on-primary-soft" role="status">
            Cambiamos tu contraseña y cerramos tus otras sesiones.
          </p>
        }
        <button
          class="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
          type="submit"
          [disabled]="cambiando()"
        >
          {{ cambiando() ? 'Cambiando…' : 'Cambiar contraseña' }}
        </button>
      </form>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilPage {
  protected readonly session = inject(SesionFacade);
  protected readonly rol = computed(() => definicionDeRol(this.session.role()));
  protected readonly politica = MENSAJE_CONTRASENA_DEBIL;

  protected readonly datos = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  protected readonly contrasena = new FormGroup(
    {
      actual: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      nueva: new FormControl('', { nonNullable: true, validators: [Validators.required, contrasenaSegura] }),
      repetida: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: repetidaIgual },
  );

  protected readonly guardandoDatos = signal(false);
  protected readonly datosGuardados = signal(false);
  protected readonly errorDatos = signal<string | null>(null);
  protected readonly cambiando = signal(false);
  protected readonly contrasenaCambiada = signal(false);
  protected readonly errorContrasena = signal<string | null>(null);

  constructor() {
    // Los campos empiezan con los datos de la sesión y se igualan a ellos cada vez que cambian (al guardar).
    effect(() => {
      const usuario = this.session.user();
      if (usuario) untracked(() => this.datos.reset({ name: usuario.name, email: usuario.email }));
    });
  }

  protected errorDeCorreo(): string {
    const control = this.datos.controls.email;
    if (control.hasError('bff')) return control.getError('bff');
    return control.hasError('required') ? 'Completa este campo.' : 'Ingresa un correo válido.';
  }

  protected errorDe(control: AbstractControl): string {
    if (control.hasError('bff')) return control.getError('bff');
    if (control.hasError('debil')) return MENSAJE_CONTRASENA_DEBIL;
    return 'Completa este campo.';
  }

  protected errorDeRepetida(): string {
    return this.contrasena.controls.repetida.hasError('required')
      ? 'Completa este campo.'
      : 'Las contraseñas no coinciden.';
  }

  protected async guardarDatos(): Promise<void> {
    if (this.guardandoDatos()) return;
    this.datosGuardados.set(false);
    this.errorDatos.set(null);
    if (this.datos.invalid) {
      this.datos.markAllAsTouched();
      return;
    }
    this.guardandoDatos.set(true);
    const { name, email } = this.datos.getRawValue();
    const error = await this.session.actualizarPerfil({ name: name.trim(), email: email.trim() });
    this.guardandoDatos.set(false);
    if (!error) this.datosGuardados.set(true);
    else this.mostrar(error, this.errorDatos);
  }

  protected async cambiarContrasena(): Promise<void> {
    if (this.cambiando()) return;
    this.contrasenaCambiada.set(false);
    this.errorContrasena.set(null);
    // Un repetido distinto marca su campo; el resto lo marca cada control.
    const repetida = this.contrasena.controls.repetida;
    if (this.contrasena.hasError('distintas')) repetida.setErrors({ ...repetida.errors, distintas: true });
    if (this.contrasena.invalid) {
      this.contrasena.markAllAsTouched();
      return;
    }
    this.cambiando.set(true);
    const { actual, nueva } = this.contrasena.getRawValue();
    const error = await this.session.cambiarContrasena(actual, nueva);
    this.cambiando.set(false);
    if (!error) {
      this.contrasena.reset();
      this.contrasenaCambiada.set(true);
    } else this.mostrar(error, this.errorContrasena);
  }

  /** El motivo del BFF va junto a su campo si corresponde a uno; si no, en el aviso del formulario. */
  private mostrar(error: PerfilError, aviso: WritableSignal<string | null>): void {
    const campo =
      error.campo === 'email'
        ? this.datos.controls.email
        : error.campo === 'currentPassword'
          ? this.contrasena.controls.actual
          : error.campo === 'newPassword'
            ? this.contrasena.controls.nueva
            : null;
    if (!campo) {
      aviso.set(error.message);
      return;
    }
    campo.setErrors({ bff: error.message });
    campo.markAsTouched();
  }
}
