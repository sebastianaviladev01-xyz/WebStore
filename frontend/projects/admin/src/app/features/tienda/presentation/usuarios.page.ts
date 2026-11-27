import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { confirmarEliminacion } from '../../../shared/ui/confirmacion.dialog';
import { focoTrasEliminar } from '../../../shared/ui/foco-tras-eliminar';
import { eliminarRegistro } from '../../../shared/ui/eliminar-registro';
import { TiendaFacade } from '../application/tienda.facade';
import { Rol, rolesGestionables } from '../../sesion/domain/rol.rules';
import { TablaExportable } from '../domain/exportacion.rules';
import {
  FILTROS_USUARIOS_VACIOS,
  filtrarUsuarios,
  leerFiltrosUsuarios,
  parametrosDeFiltrosUsuarios,
} from '../domain/filtro-listado.rules';
import { contarPorClave, numeroDeFila, textoDeCantidad, textoDelTotal } from '../domain/listado.rules';
import { filtrosDeListado } from './filtros-de-listado';
import { CLASES_ACCION, CLASES_ACCION_ELIMINAR, clasesDeInsignia, FichaDeResumen } from './insignia';
import { ListadoComponent } from './listado.component';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { IconoDirective } from '../../../shared/ui/icono.directive';

/** Plural del nombre de un rol para las fichas del pie: «Vendedor» → «vendedores». */
function pluralDelRol(nombre: string): string {
  const minusculas = nombre.toLocaleLowerCase('es-PE');
  return /[aeiou]$/.test(minusculas) ? `${minusculas}s` : `${minusculas}es`;
}

/**
 * Usuarios y roles. Lote 21 (ADR-0025): el usuario se crea y se edita en su propia interfaz, `/usuarios/nuevo` y
 * `/usuarios/:id` (`RegistroUsuarioPage`), porque tiene más de tres campos (PBI-0211); las tarjetas de los roles dicen
 * su nombre y su descripción, sin el conteo de usuarios (PBI-0213).
 *
 * Lote 43 (ADR-0033, PBI-0265): la lista en un solo panel, como la lista de proveedores del SGC, con «N°», el rol, el
 * estado como insignia, las acciones de solo ícono, «Exportar» y el pie con el total, cada estado y cada rol. Las
 * tarjetas de los roles van debajo del panel.
 */
@Component({
  selector: 'ws-users-page',
  imports: [
    IconoDirective,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ListadoComponent,
    PanelFiltrosComponent,
  ],
  template: `
    <ws-admin-listado
      titulo="Usuarios y roles"
      descripcion="Los roles son fijos: se asignan a cada usuario, pero no se crean ni se modifican. El BFF valida el rol en cada operación."
      que="usuarios"
      [exportacion]="exportacion"
      [pagina]="pagina()"
      [tamano]="filtros.tamano()"
      [fichas]="fichas()"
      (cambiarPagina)="filtros.irAPagina($event)"
      (cambiarTamano)="filtros.cambiarTamano($event)"
    >
      <ws-filter-panel
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

      <section class="border-t border-line" aria-label="Usuarios administrativos">
        <div role="table" aria-label="Usuarios">
          <div
            role="row"
            class="grid grid-cols-[2.5rem_minmax(0,1fr)_170px_96px_88px] gap-x-4 bg-subtle px-5 py-3 text-xs font-semibold uppercase text-muted max-md:sr-only"
          >
            <span role="columnheader">N°</span>
            <span role="columnheader">Usuario</span>
            <span role="columnheader">Rol</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader"><span class="sr-only">Acciones</span></span>
          </div>
          @for (user of pagina().items; track user.id; let i = $index) {
            <div
              role="row"
              class="grid grid-cols-[2.5rem_minmax(0,1fr)_170px_96px_88px] items-center gap-x-4 border-t border-line px-5 py-3 max-md:grid-cols-[2rem_minmax(0,1fr)_auto] max-md:gap-y-2"
            >
              <span role="cell" class="text-sm tabular-nums text-muted max-md:self-start">
                {{ numero(i) }}
              </span>
              <div role="cell" class="min-w-0 max-md:col-span-2">
                <strong class="block truncate font-semibold">{{ user.name }}</strong>
                <p class="truncate text-xs text-muted">{{ user.email }}</p>
              </div>
              <span role="cell" class="max-md:col-start-2">
                <span class="w-fit rounded-full bg-soft px-3 py-1 text-xs font-medium text-body">
                  {{ roleLabel(user.role) }}
                </span>
              </span>
              <span role="cell" class="max-md:col-start-2 max-md:row-start-3">
                <span [class]="insignia(user.active ? 'exito' : 'alerta')">
                  {{ user.active ? 'Activo' : 'Inactivo' }}
                </span>
              </span>
              <div
                role="cell"
                class="flex justify-end gap-2 max-md:col-start-3 max-md:row-span-2 max-md:row-start-2"
              >
                <a
                  [class]="accion"
                  [routerLink]="['/usuarios', user.id]"
                  queryParamsHandling="preserve"
                  [attr.aria-label]="'Editar usuario ' + user.name"
                  matTooltip="Editar"
                >
                  <svg wsAdminIcono="editar"></svg>
                </a>
                @if (session.can('users.delete') && user.id !== session.user()?.id) {
                  <button
                    type="button"
                    [class]="accionEliminar"
                    [attr.aria-label]="'Eliminar usuario ' + user.name"
                    matTooltip="Eliminar"
                    data-eliminar
                    (click)="remove(user.id, $event)"
                  >
                    <svg wsAdminIcono="eliminar"></svg>
                  </button>
                }
              </div>
            </div>
          }
        </div>
        @if (!pagina().items.length) {
          <p class="border-t border-line p-8 text-center text-sm text-muted">
            {{ admin.users().length ? 'Ningún usuario cumple los filtros.' : 'Todavía no hay usuarios.' }}
          </p>
        }
      </section>
    </ws-admin-listado>

    <section class="mt-6 grid gap-3 md:grid-cols-3" aria-label="Roles disponibles">
      @for (role of rolesVisibles(); track role.id) {
        <article class="admin-card p-4">
          <h2 class="font-semibold text-ink">{{ role.label }}</h2>
          <p class="mt-1 text-sm text-muted">{{ role.description }}</p>
        </article>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly session = inject(SesionFacade);
  private readonly dialog = inject(MatDialog);
  /** Lote 43 (PBI-0269): el foco tras eliminar, en la fila que ocupa su lugar. */
  private readonly foco = focoTrasEliminar();
  protected readonly insignia = clasesDeInsignia;
  protected readonly accion = CLASES_ACCION;
  protected readonly accionEliminar = CLASES_ACCION_ELIMINAR;
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
  protected readonly resultados = computed(() =>
    filtrarUsuarios(this.admin.users(), this.filtros.aplicados()),
  );
  protected readonly pagina = computed(() => this.filtros.paginar(this.resultados()));
  /** El total, cuántos activos e inactivos y cuántos de cada rol que la sesión ve (lote 43, PBI-0265). */
  protected readonly fichas = computed((): FichaDeResumen[] => {
    const resultados = this.resultados();
    const [activos, inactivos] = contarPorClave(resultados, (u) => (u.active ? 'activos' : 'inactivos'), [
      'activos',
      'inactivos',
    ]);
    const roles = this.rolesVisibles();
    const porRol = contarPorClave(
      resultados,
      (u) => u.role,
      roles.map((role) => role.id),
    );
    return [
      { texto: textoDelTotal(resultados.length), tono: 'principal', icono: 'lista' },
      {
        texto: textoDeCantidad(activos?.cantidad ?? 0, 'activo', 'activos'),
        tono: 'exito',
        icono: 'activar',
      },
      {
        texto: textoDeCantidad(inactivos?.cantidad ?? 0, 'inactivo', 'inactivos'),
        tono: 'alerta',
        icono: 'inactivo',
      },
      ...porRol.map(({ clave, cantidad }): FichaDeResumen => {
        const nombre = this.roleLabel(clave);
        return {
          texto: textoDeCantidad(cantidad, nombre.toLocaleLowerCase('es-PE'), pluralDelRol(nombre)),
          tono: 'neutro',
          icono: 'perfil',
        };
      }),
    ];
  });
  protected readonly exportacion = (): TablaExportable => ({
    titulo: 'Usuarios',
    columnas: ['N°', 'Usuario', 'Correo', 'Rol', 'Estado'],
    filas: this.resultados().map((u, i) => [
      i + 1,
      u.name,
      u.email,
      this.roleLabel(u.role),
      u.active ? 'Activo' : 'Inactivo',
    ]),
  });

  protected numero(indice: number): number {
    return numeroDeFila(this.pagina(), indice);
  }

  protected roleLabel(role: Rol): string {
    return this.admin.roles().find((definition) => definition.id === role)?.label ?? role;
  }

  protected async remove(id: string, evento: Event): Promise<void> {
    const lugar = this.foco.recordar(evento);
    if (!this.session.can('users.delete')) return;
    const eliminado = await eliminarRegistro({
      nombre: this.admin.users().find((u) => u.id === id)?.name ?? '',
      id,
      confirmar: (nombre) => confirmarEliminacion(this.dialog, nombre),
      // El registro está en su propia página: aquí no hay un formulario en edición.
      editando: () => null,
      eliminar: (idEliminado) => this.admin.eliminarUsuario(idEliminado),
      salirDeLaEdicion: () => undefined,
    });
    if (eliminado) this.foco.restaurar(lugar);
  }
}
