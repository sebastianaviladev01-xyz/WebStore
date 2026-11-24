import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { Rol, rolesGestionables } from '../../sesion/domain/rol.rules';
import { UsuarioAdmin } from '../../sesion/domain/usuario-admin.model';
import { TiendaFacade } from '../application/tienda.facade';
import { mensajeDeError } from '../domain/formulario.rules';
import { usuarioConElMismoCorreo } from '../domain/registro-unico.rules';
import { conservarBorrador } from './borrador';

const EMPTY_USER = {
  name: '',
  email: '',
  role: 'vendedor' as Rol,
  active: true,
  temporaryPassword: '',
};

/**
 * Interfaz de registro de un usuario del Admin (lote 21, ADR-0025, PBI-0211): `/usuarios/nuevo` y `/usuarios/:id`.
 * Tiene más de tres campos (nombre, correo, rol y contraseña temporal), así que tiene su propia página, como «Nuevo
 * producto». Es el formulario que antes estaba al costado de la lista, con los mismos campos, validaciones y permisos:
 * el rol de la sesión solo asigna los roles que gestiona (PBI-0013) y la contraseña temporal solo se pide al crear. Al
 * editar trae los datos actuales con `refresh()`; al guardar, al cancelar y con «Volver a usuarios» vuelve al listado
 * con sus filtros y su página (`queryParamsHandling: 'preserve'`).
 */
@Component({
  selector: 'ws-user-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  template: `
    <a class="text-sm font-semibold text-link" routerLink="/usuarios" queryParamsHandling="preserve">
      ← Volver a usuarios
    </a>
    <h1 id="titulo-formulario-usuario" class="mt-3 text-3xl font-semibold tracking-tight text-ink">
      {{ editing() ? 'Editar' : 'Nuevo' }} usuario
    </h1>
    @if (loadingUser()) {
      <p class="admin-card mt-7 max-w-2xl p-6 text-sm text-muted" role="status">Cargando…</p>
    } @else if (missing()) {
      <div class="admin-card mt-7 max-w-2xl p-6" role="alert">
        <p class="font-semibold">Este usuario ya no existe</p>
        <p class="mt-2 text-sm text-muted">
          Otra persona lo eliminó. Vuelve al listado para ver los usuarios actuales.
        </p>
      </div>
    } @else {
      @if (borrador.aviso(); as aviso) {
        <p class="mt-7 max-w-2xl rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">
          {{ aviso }}
        </p>
      }
      @if (staleNotice()) {
        <p class="mt-7 max-w-2xl rounded-xl bg-warning-soft p-4 text-sm text-warning" role="alert">
          {{ staleNotice() }}
        </p>
      }
      <form
        [formGroup]="form"
        (ngSubmit)="save()"
        class="admin-card mt-7 max-w-2xl p-6"
        aria-labelledby="titulo-formulario-usuario"
      >
        <div class="grid gap-3">
          <mat-form-field>
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
            <mat-error>{{ error(form.controls.name.errors) }}</mat-error>
          </mat-form-field>
          <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
          <mat-form-field [subscriptSizing]="form.controls.email.hasError('repetido') ? 'dynamic' : 'fixed'">
            <mat-label>Correo</mat-label>
            <input matInput type="email" formControlName="email" />
            <mat-error>{{ error(form.controls.email.errors) }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Rol</mat-label>
            <mat-select formControlName="role">
              @for (role of rolesVisibles(); track role.id) {
                <mat-option [value]="role.id">{{ role.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (!editing()) {
            <mat-form-field>
              <mat-label>Contraseña temporal</mat-label>
              <input
                matInput
                type="password"
                autocomplete="new-password"
                formControlName="temporaryPassword"
              />
              <mat-hint>Mínimo 10 caracteres, con letras y números.</mat-hint>
              <mat-error>{{ errorClave(form.controls.temporaryPassword.errors) }}</mat-error>
            </mat-form-field>
          }
          <mat-checkbox formControlName="active">Activo</mat-checkbox>
        </div>
        @if (saveError()) {
          <p class="mt-3 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {{ saveError() }}
          </p>
        }
        <div class="mt-5 flex flex-wrap gap-3">
          <button
            class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            {{ admin.saving() ? 'Guardando…' : 'Guardar usuario' }}
          </button>
          <a
            class="inline-flex items-center rounded-lg border border-line px-5 py-2.5 text-sm font-medium"
            routerLink="/usuarios"
            queryParamsHandling="preserve"
          >
            Cancelar
          </a>
        </div>
      </form>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroUsuarioPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly session = inject(SesionFacade);
  private readonly router = inject(Router);
  /** `:id` de `/usuarios/:id` (`withComponentInputBinding`); no llega en `/usuarios/nuevo`. */
  readonly id = input<string>();
  protected readonly editing = computed(() => this.id() ?? null);
  /** Id del usuario nuevo, fijo mientras la página está abierta: un segundo envío no crea otro (PBI-0121). */
  private readonly idNuevo = crypto.randomUUID();
  /** El usuario tal como se cargó al abrir la edición: lo que cambió la persona se calcula contra él (PBI-0120). */
  private base: UsuarioAdmin | null = null;
  protected readonly loadingUser = signal(false);
  /** El usuario en edición ya no está en el snapshot (otra persona lo eliminó, o el rol de la sesión no lo gestiona). */
  protected readonly missing = signal(false);
  protected readonly staleNotice = signal<string | null>(null);
  /** Motivo del último guardado rechazado, junto al botón (p. ej. dejar la tienda sin superadministrador). */
  protected readonly saveError = signal<string | null>(null);
  /**
   * Roles que el rol de la sesión gestiona (PBI-0013): el administrador solo ve y asigna «Vendedor». El BFF solo le
   * envía esos usuarios y rechaza cualquier otro cambio.
   */
  protected readonly rolesVisibles = computed(() => {
    const gestionables = rolesGestionables(this.session.role());
    return this.admin.roles().filter((role) => gestionables.includes(role.id));
  });
  protected readonly error = mensajeDeError;
  /** La contraseña temporal dice su regla, no «revisa el formato». */
  protected errorClave(errores: Readonly<Record<string, unknown>> | null): string | null {
    if (!errores) return null;
    return 'required' in errores ? 'Completa este campo.' : 'Mínimo 10 caracteres, con letras y números.';
  }
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    role: new FormControl<Rol>('vendedor', { nonNullable: true }),
    active: new FormControl(true, { nonNullable: true }),
    temporaryPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.minLength(10), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)],
    }),
  });
  /**
   * PBI-0151: lo escrito vuelve si la sesión venció a mitad de la edición y se ingresa otra vez; se aplica después de
   * traer el usuario. La contraseña temporal no se conserva: hay que escribirla de nuevo.
   */
  protected readonly borrador = conservarBorrador({
    form: this.form,
    guardar: () => ({ ...this.form.getRawValue(), temporaryPassword: '' }),
    restaurar: (valor) => this.form.setValue(valor),
    diferido: true,
  });
  constructor() {
    // Al abrir la edición (o cambiar de `:id` sin salir de la página) se traen los datos actuales.
    effect(() => {
      const id = this.editing();
      if (id) untracked(() => void this.edit(id));
      else untracked(() => this.borrador.aplicar());
    });
  }
  /** Trae el snapshot actual y rellena el formulario; si ya no existe, lo dice; si la consulta falla, avisa. */
  private async edit(id: string) {
    this.loadingUser.set(true);
    this.missing.set(false);
    this.staleNotice.set(null);
    this.saveError.set(null);
    const current = await this.admin.refresh();
    if (!current) {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    const user = this.admin.users().find((candidate) => candidate.id === id);
    this.base = user ?? null;
    if (user) {
      this.form.setValue({
        ...EMPTY_USER,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      });
      this.borrador.aplicar();
    } else this.missing.set(true);
    this.loadingUser.set(false);
  }
  protected async save(): Promise<void> {
    if (this.admin.saving()) return;
    // PBI-0132: la contraseña temporal es obligatoria al crear, y el campo lo dice.
    if (!this.editing() && !this.form.controls.temporaryPassword.value)
      this.form.controls.temporaryPassword.setErrors({ required: true });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { temporaryPassword, ...datos } = this.form.getRawValue();
    const base = this.base;
    const usuario = { id: this.editing() ?? this.idNuevo, ...datos };
    // PBI-0123: un correo de otro usuario no se envía; esa cuenta nunca podría entrar.
    const otro = usuarioConElMismoCorreo(this.admin.users(), usuario);
    if (otro) {
      this.form.controls.email.setErrors({
        repetido: `Ya hay un usuario con ese correo: ${otro.name}. Usa otro.`,
      });
      this.form.controls.email.markAsTouched();
      return;
    }
    this.saveError.set(null);
    // La contraseña temporal solo viaja al crear el usuario.
    const saved = await this.admin.guardarUsuario(base, base ? usuario : { ...usuario, temporaryPassword });
    if (saved) {
      await this.router.navigate(['/usuarios'], { queryParamsHandling: 'preserve' });
      return;
    }
    this.saveError.set(this.admin.tomarError() ?? 'No pudimos guardar el usuario. Inténtalo de nuevo.');
  }
}
