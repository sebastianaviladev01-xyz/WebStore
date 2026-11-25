import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { eliminarRegistro } from '../../../shared/ui/eliminar-registro';
import { TiendaFacade } from '../application/tienda.facade';
import { Rol, rolesGestionables } from '../../sesion/domain/rol.rules';
import {
  FILTROS_USUARIOS_VACIOS,
  filtrarUsuarios,
  leerFiltrosUsuarios,
  parametrosDeFiltrosUsuarios,
} from '../domain/filtro-listado.rules';
import { filtrosDeListado } from './filtros-de-listado';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

/**
 * Usuarios y roles. Lote 21 (ADR-0025): el usuario se crea y se edita en su propia interfaz, `/usuarios/nuevo` y
 * `/usuarios/:id` (`RegistroUsuarioPage`), porque tiene más de tres campos (PBI-0211); la lista va a todo el ancho, y
 * las tarjetas de los roles dicen su nombre y su descripción, sin el conteo de usuarios (PBI-0213).
 */
@Component({
  selector: 'ws-users-page',
  imports: [
    IconoDirective,
    TituloPaginaDirective,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <h1 wsAdminTitulo class="text-3xl font-semibold tracking-tight text-ink">Usuarios y roles</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Los roles son fijos: se asignan a cada usuario, pero no se crean ni se modifican. El BFF valida el rol
      en cada operación.
    </p>

    <section class="mt-6 grid gap-3 md:grid-cols-3" aria-label="Roles disponibles">
      @for (role of rolesVisibles(); track role.id) {
        <article class="admin-card p-4">
          <h2 class="font-semibold text-ink">{{ role.label }}</h2>
          <p class="mt-1 text-sm text-muted">{{ role.description }}</p>
        </article>
      }
    </section>

    <!-- PBI-0139: panel de filtros encima de la lista. -->
    <ws-filter-panel
      class="mt-6"
      etiqueta="Filtros de usuarios"
      agregarQue="usuario"
      rutaAgregar="/usuarios/nuevo"
      [formGroup]="filtros.borrador"
      [buscando]="filtros.buscando()"
      [error]="filtros.error()"
      (buscar)="filtros.buscar()"
      (limpiar)="filtros.limpiar()"
    >
      <mat-form-field>
        <mat-label>Buscar usuario</mat-label>
        <input matInput formControlName="texto" />
        <mat-hint>Nombre o correo</mat-hint>
      </mat-form-field>
      @if (rolesVisibles().length > 1) {
        <mat-form-field>
          <mat-label>Filtrar por rol</mat-label>
          <mat-select formControlName="rol">
            <mat-option value="">Todos</mat-option>
            @for (role of rolesVisibles(); track role.id) {
              <mat-option [value]="role.id">{{ role.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
      <mat-form-field>
        <mat-label>Filtrar por estado</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="todos">Todos</mat-option>
          <mat-option value="activos">Activos</mat-option>
          <mat-option value="inactivos">Inactivos</mat-option>
        </mat-select>
      </mat-form-field>
    </ws-filter-panel>

    <section class="admin-card mt-6 overflow-hidden" aria-label="Usuarios administrativos">
      @for (user of pagina().items; track user.id) {
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
            <!-- inline-flex items-center: como enlace, centra el texto en la altura de «Eliminar», como el botón de antes. -->
            <a
              class="inline-flex items-center gap-2 text-link"
              [routerLink]="['/usuarios', user.id]"
              queryParamsHandling="preserve"
              [attr.aria-label]="'Editar usuario ' + user.name"
            >
              <svg wsAdminIcono="editar"></svg>
              Editar
            </a>
            @if (session.can('users.delete') && user.id !== session.user()?.id) {
              <button
                class="inline-flex items-center gap-2 text-danger"
                type="button"
                [attr.aria-label]="'Eliminar usuario ' + user.name"
                (click)="remove(user.id)"
              >
                <svg wsAdminIcono="eliminar"></svg>
                Eliminar
              </button>
            }
          </div>
        </div>
      } @empty {
        <p class="p-8 text-center text-sm text-muted">
          {{ admin.users().length ? 'Ningún usuario cumple los filtros.' : 'Todavía no hay usuarios.' }}
        </p>
      }
      <ws-pagination
        [pagina]="pagina()"
        etiqueta="Páginas de usuarios"
        (cambiar)="filtros.irAPagina($event)"
      />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly session = inject(SesionFacade);
  /**
   * Roles que el rol de la sesión gestiona (PBI-0013): el administrador solo ve «Vendedor». El BFF solo le envía esos
   * usuarios y rechaza cualquier otro cambio.
   */
  protected readonly rolesVisibles = computed(() => {
    const gestionables = rolesGestionables(this.session.role());
    return this.admin.roles().filter((role) => gestionables.includes(role.id));
  });
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosUsuarios,
    escribir: parametrosDeFiltrosUsuarios,
    vacios: FILTROS_USUARIOS_VACIOS,
    que: 'los usuarios',
  });
  protected readonly pagina = computed(() =>
    this.filtros.paginar(filtrarUsuarios(this.admin.users(), this.filtros.aplicados())),
  );

  protected roleLabel(role: Rol): string {
    return this.admin.roles().find((definition) => definition.id === role)?.label ?? role;
  }

  protected async remove(id: string): Promise<void> {
    if (!this.session.can('users.delete')) return;
    await eliminarRegistro({
      pregunta: '¿Eliminar usuario?',
      id,
      // El registro está en su propia página: aquí no hay un formulario en edición.
      editando: () => null,
      eliminar: (idEliminado) => this.admin.eliminarUsuario(idEliminado),
      salirDeLaEdicion: () => undefined,
    });
  }
}
