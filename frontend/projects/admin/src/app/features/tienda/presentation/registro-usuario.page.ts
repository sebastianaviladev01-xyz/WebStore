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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { Rol, rolesGestionables } from '../../sesion/domain/rol.rules';
import { UsuarioAdmin } from '../../sesion/domain/usuario-admin.model';
import { TiendaFacade } from '../application/tienda.facade';
import { estadoDeLaEdicion } from '../domain/edicion.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { usuarioConElMismoCorreo } from '../domain/registro-unico.rules';
import { conservarBorrador } from './borrador';
import { DatosRegistroComponent } from './datos-registro.component';
import { EncabezadoRegistroComponent } from './encabezado-registro.component';
import { PieRegistroComponent } from './pie-registro.component';
import { SeccionRegistroComponent } from './seccion-registro.component';
import { SinDatosComponent } from '../../../shared/ui/sin-datos.component';
import { TextoAyudaComponent } from '../../../shared/ui/texto-ayuda.component';

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
 * editar trae los datos actuales con `refresh()`; con «Guardar», «Cancelar» y «Regresar» vuelve al listado con sus
 * filtros y su página (`queryParamsHandling: 'preserve'`). Desde el lote 44 (ADR-0033, PBI-0268) tiene la forma de los
 * formularios del SGC: secciones «Datos de la persona» y «Acceso», el estado en la fila de cabecera y, al crear,
 * «Guardar y continuar».
 */
@Component({
  selector: 'ws-user-form-page',
  imports: [
    DatosRegistroComponent,
    EncabezadoRegistroComponent,
    PieRegistroComponent,
    SeccionRegistroComponent,
    SinDatosComponent,
    TextoAyudaComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <!-- Lote 44 (ADR-0033, PBI-0268): la forma de los formularios del SGC, con el estado en la fila de cabecera. -->
    <div class="admin-card grid max-w-4xl gap-6 p-5 sm:p-6">
      <ws-admin-encabezado-registro
        tituloId="titulo-formulario-usuario"
        [titulo]="(editing() ? 'Editar' : 'Nuevo') + ' usuario'"
        [descripcion]="
          editing()
            ? 'Cambia los datos de la persona, su rol o su estado.'
            : 'Completa los datos de la persona, su rol y su contraseña temporal para entrar al backoffice.'
        "
        listado="/usuarios"
      />
      @if (loadingUser()) {
        <p class="border-t border-line pt-5 text-sm text-muted" role="status">Cargando…</p>
      } @else if (missing()) {
        <div class="border-t border-line pt-5" role="alert">
          <p class="font-semibold">Este usuario ya no existe</p>
          <p class="mt-2 text-sm text-muted">
            Otra persona lo eliminó. Vuelve al listado para ver los usuarios actuales.
          </p>
        </div>
      } @else if (sinDatos()) {
        <!-- PBI-0256: la consulta falló y el panel no tenía el usuario; no se sabe si existe. -->
        <ws-admin-sin-datos registro="del usuario" (reintentar)="reintentar()" />
      } @else {
        @if (borrador.aviso(); as aviso) {
          <p class="rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">
            {{ aviso }}
          </p>
        }
        @if (staleNotice()) {
          <p class="rounded-xl bg-warning-soft p-4 text-sm text-warning" role="alert">
            {{ staleNotice() }}
          </p>
        }
        <form
          [formGroup]="form"
          (ngSubmit)="save()"
          class="grid gap-6"
          aria-labelledby="titulo-formulario-usuario"
        >
          <ws-admin-datos-registro [estado]="form.controls.active" />
          <ws-admin-seccion-registro titulo="Datos de la persona" icono="perfil">
            <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <mat-form-field>
                <mat-label>Nombre</mat-label>
                <input matInput formControlName="name" />
                <mat-error>{{ error(form.controls.name.errors) }}</mat-error>
              </mat-form-field>
              <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
              <mat-form-field
                [subscriptSizing]="form.controls.email.hasError('repetido') ? 'dynamic' : 'fixed'"
              >
                <mat-label>Correo</mat-label>
                <input matInput type="email" formControlName="email" />
                <mat-error>{{ error(form.controls.email.errors) }}</mat-error>
              </mat-form-field>
            </div>
          </ws-admin-seccion-registro>
          <ws-admin-seccion-registro titulo="Acceso" icono="contrasena">
            <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <mat-form-field>
                <mat-label>Rol</mat-label>
                <mat-select formControlName="role">
                  @for (role of rolesVisibles(); track role.id) {
                    <mat-option [value]="role.id">{{ role.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (!editing()) {
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>Contraseña temporal</mat-label>
                  <input
                    matInput
                    type="password"
                    autocomplete="new-password"
                    formControlName="temporaryPassword"
                  />
                  <mat-hint>
                    <ws-admin-texto-ayuda>Mínimo 10 caracteres, con letras y números.</ws-admin-texto-ayuda>
                  </mat-hint>
                  <mat-error>{{ errorClave(form.controls.temporaryPassword.errors) }}</mat-error>
                </mat-form-field>
              }
            </div>
          </ws-admin-seccion-registro>
          <ws-admin-pie-registro
            listado="/usuarios"
            [creando]="!editing()"
            [guardando]="admin.saving()"
            [continuando]="continuando()"
            (continuar)="save(true)"
          >
            @if (saveError()) {
              <p class="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
                {{ saveError() }}
              </p>
            }
          </ws-admin-pie-registro>
        </form>
      }
    </div>
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
  /** PBI-0256: la consulta falló y el panel no tenía el usuario; se avisa del fallo con «Reintentar». */
  protected readonly sinDatos = signal(false);
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
  /**
   * Trae el snapshot actual y rellena el formulario. Si la consulta responde sin el usuario, dice que ya no existe; si
   * falla, usa los datos que ya tenía el panel con un aviso o, si no los tenía, avisa del fallo (PBI-0256).
   */
  private async edit(id: string) {
    this.loadingUser.set(true);
    this.missing.set(false);
    this.sinDatos.set(false);
    this.staleNotice.set(null);
    this.saveError.set(null);
    const consultaRespondio = await this.admin.refresh();
    const user = this.admin.users().find((candidate) => candidate.id === id);
    const estado = estadoDeLaEdicion({ consultaRespondio, registroEncontrado: !!user });
    if (estado === 'desactualizada') {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    this.missing.set(estado === 'no-existe');
    this.sinDatos.set(estado === 'sin-datos');
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
    }
    this.loadingUser.set(false);
  }
  /** «Reintentar» del aviso de PBI-0256: vuelve a pedir el snapshot. */
  protected reintentar() {
    const id = this.editing();
    if (id) void this.edit(id);
  }
  /** El guardado en curso lo pidió «Guardar y continuar» (lote 44, PBI-0268). */
  protected readonly continuando = signal(false);
  /**
   * Guarda el usuario. «Guardar» vuelve al listado; «Guardar y continuar» (`continuar`, solo al crear) abre el registro
   * creado en «Editar» para seguir completándolo, con los filtros del listado (lote 44, PBI-0268).
   */
  protected async save(continuar = false): Promise<void> {
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
    this.continuando.set(continuar);
    // La contraseña temporal solo viaja al crear el usuario.
    const saved = await this.admin.guardarUsuario(base, base ? usuario : { ...usuario, temporaryPassword });
    this.continuando.set(false);
    if (saved) {
      await this.router.navigate(continuar ? ['/usuarios', usuario.id] : ['/usuarios'], {
        queryParamsHandling: 'preserve',
      });
      return;
    }
    this.saveError.set(this.admin.tomarError() ?? 'No pudimos guardar el usuario. Inténtalo de nuevo.');
  }
}
