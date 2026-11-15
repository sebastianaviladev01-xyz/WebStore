import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { TiendaFacade } from '../application/tienda.facade';
import { Rol, rolesGestionables } from '../../sesion/domain/rol.rules';
import { UsuarioAdmin } from '../../sesion/domain/usuario-admin.model';
import { usuarioConElMismoCorreo } from '../domain/registro-unico.rules';

const EMPTY_USER = {
  name: '',
  email: '',
  role: 'vendedor' as Rol,
  active: true,
  temporaryPassword: '',
};

@Component({
  selector: 'ws-users-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Usuarios y roles</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Los roles son fijos: se asignan a cada usuario, pero no se crean ni se modifican. El BFF valida el rol
      en cada operación.
    </p>

    <section class="mt-6 grid gap-3 md:grid-cols-3" aria-label="Roles disponibles">
      @for (role of rolesVisibles(); track role.id) {
        <article class="admin-card p-4">
          <h2 class="font-semibold text-ink">{{ role.label }}</h2>
          <p class="mt-1 text-sm text-muted">{{ role.description }}</p>
          <p class="mt-3 text-xs text-muted">
            {{ countByRole().get(role.id) ?? 0 }}
            {{ (countByRole().get(role.id) ?? 0) === 1 ? 'usuario' : 'usuarios' }}
          </p>
        </article>
      }
    </section>

    <div class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section class="admin-card overflow-hidden" aria-label="Usuarios administrativos">
        @for (user of admin.users(); track user.id) {
          <div
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_170px_auto]"
          >
            <div class="min-w-0">
              <strong class="block truncate font-semibold">{{ user.name }}</strong>
              <p class="truncate text-xs text-muted">{{ user.email }}</p>
            </div>
            <span
              class="hidden w-fit rounded-full bg-soft px-3 py-1 text-xs font-medium text-body sm:inline-block"
            >
              {{ roleLabel(user.role) }}{{ user.active ? '' : ' · inactivo' }}
            </span>
            <div class="flex gap-3 text-sm font-medium">
              <button
                class="text-link"
                type="button"
                [attr.aria-label]="'Editar usuario ' + user.name"
                (click)="edit(user.id)"
              >
                Editar
              </button>
              @if (session.can('users.delete') && user.id !== session.user()?.id) {
                <button
                  class="text-danger"
                  type="button"
                  [attr.aria-label]="'Eliminar usuario ' + user.name"
                  (click)="remove(user.id)"
                >
                  Eliminar
                </button>
              }
            </div>
          </div>
        }
      </section>

      <form [formGroup]="form" (ngSubmit)="save()" class="admin-card h-fit p-6">
        <h2 class="text-xl font-semibold">{{ editing() ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
        <div class="mt-5 grid gap-3">
          <mat-form-field>
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
          <mat-form-field [subscriptSizing]="form.controls.email.hasError('repetido') ? 'dynamic' : 'fixed'">
            <mat-label>Correo</mat-label>
            <input matInput type="email" formControlName="email" />
            @if (form.controls.email.hasError('repetido')) {
              <mat-error>{{ form.controls.email.getError('repetido') }}</mat-error>
            }
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
            </mat-form-field>
          }
          <mat-checkbox formControlName="active">Activo</mat-checkbox>
        </div>
        <div class="mt-5 flex flex-wrap gap-3">
          <button
            class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            {{ admin.saving() ? 'Guardando…' : 'Guardar usuario' }}
          </button>
          @if (editing()) {
            <button
              class="rounded-lg border border-line px-5 py-2.5 text-sm font-medium"
              type="button"
              (click)="reset()"
            >
              Cancelar
            </button>
          }
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly session = inject(SesionFacade);
  /** resetForm (no form.reset) limpia también el estado enviado; si no, el formulario vacío se muestra con errores. */
  private readonly formDirective = viewChild.required(FormGroupDirective);
  protected readonly editing = signal<string | null>(null);
  /** El usuario tal como se cargó al pulsar «Editar»: lo que cambió se calcula contra él (PBI-0120). */
  private base: UsuarioAdmin | null = null;
  /** Id del usuario nuevo; cambia al empezar otro, para que un segundo envío no cree otro (PBI-0121). */
  private idNuevo = crypto.randomUUID();
  /**
   * Roles que el rol de la sesión gestiona (PBI-0013): el administrador solo ve y asigna «Vendedor». El BFF solo le
   * envía esos usuarios y rechaza cualquier otro cambio.
   */
  protected readonly rolesVisibles = computed(() => {
    const gestionables = rolesGestionables(this.session.role());
    return this.admin.roles().filter((role) => gestionables.includes(role.id));
  });
  protected readonly countByRole = computed(() => {
    const counts = new Map<Rol, number>();
    for (const user of this.admin.users()) counts.set(user.role, (counts.get(user.role) ?? 0) + 1);
    return counts;
  });
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

  protected roleLabel(role: Rol): string {
    return this.admin.roles().find((definition) => definition.id === role)?.label ?? role;
  }

  protected edit(id: string): void {
    const user = this.admin.users().find((candidate) => candidate.id === id);
    if (!user) return;
    this.base = user;
    this.editing.set(id);
    this.form.setValue({
      ...EMPTY_USER,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    });
  }

  protected async save(): Promise<void> {
    if (this.admin.saving()) return;
    if (this.form.invalid || (!this.editing() && !this.form.controls.temporaryPassword.value)) {
      this.form.markAllAsTouched();
      return;
    }
    const { temporaryPassword, ...datos } = this.form.getRawValue();
    const base = this.base;
    const usuario = { id: base?.id ?? this.idNuevo, ...datos };
    // PBI-0123: un correo de otro usuario no se envía; esa cuenta nunca podría entrar.
    const otro = usuarioConElMismoCorreo(this.admin.users(), usuario);
    if (otro) {
      this.form.controls.email.setErrors({
        repetido: `Ya hay un usuario con ese correo: ${otro.name}. Usa otro.`,
      });
      this.form.controls.email.markAsTouched();
      return;
    }
    // Si el BFF lo rechaza (p. ej. dejar la tienda sin superadministrador), el panel muestra el motivo. La contraseña
    // temporal solo viaja al crear el usuario.
    const saved = await this.admin.guardarUsuario(base, base ? usuario : { ...usuario, temporaryPassword });
    if (saved) this.reset();
  }

  /** Si se elimina el usuario en edición, el formulario sale de la edición: «Guardar» no lo vuelve a crear (PBI-0122). */
  protected async remove(id: string): Promise<void> {
    if (!this.session.can('users.delete') || !confirm('¿Eliminar usuario?')) return;
    if ((await this.admin.eliminarUsuario(id)) && this.editing() === id) this.reset();
  }

  protected reset(): void {
    this.editing.set(null);
    this.base = null;
    this.idNuevo = crypto.randomUUID();
    this.formDirective().resetForm(EMPTY_USER);
  }
}
