import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { confirmarEliminacion } from '../../../shared/ui/confirmacion.dialog';
import { focoTrasEliminar } from '../../../shared/ui/foco-tras-eliminar';
import { eliminarRegistro } from '../../../shared/ui/eliminar-registro';
import { TiendaFacade } from '../application/tienda.facade';
import { vigenciaVisible } from '../domain/banner.rules';
import { TablaExportable } from '../domain/exportacion.rules';
import { Banner, ETIQUETAS_UBICACION_BANNER } from '../domain/tienda.model';
import {
  FILTROS_BANNERS_VACIOS,
  filtrarBanners,
  leerFiltrosBanners,
  parametrosDeFiltrosBanners,
} from '../domain/filtro-listado.rules';
import { contarPorClave, numeroDeFila, textoDeCantidad, textoDelTotal } from '../domain/listado.rules';
import { filtrosDeListado } from './filtros-de-listado';
import { CLASES_ACCION, CLASES_ACCION_ELIMINAR, clasesDeInsignia, FichaDeResumen } from './insignia';
import { ListadoComponent } from './listado.component';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { IconoDirective } from '../../../shared/ui/icono.directive';

/**
 * Banners y campañas. Lote 21 (ADR-0025, PBI-0211): el banner se crea y se edita en su propia interfaz,
 * `/banners/nuevo` y `/banners/:id` (`RegistroBannerPage`), porque tiene más de tres campos.
 *
 * Lote 43 (ADR-0033, PBI-0265): la lista en un solo panel, como la lista de proveedores del SGC: una tabla con «N°», la
 * miniatura, el título y su ubicación, la vigencia, el estado como insignia y las acciones de solo ícono; «Exportar» y
 * el pie con el total, los activos y los inactivos.
 */
@Component({
  selector: 'ws-banners-page',
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
      titulo="Banners y campañas"
      descripcion="Administra hero, promociones y banners secundarios. La tienda publica como máximo tres banners activos en el carrusel principal."
      que="banners"
      [exportacion]="exportacion"
      [pagina]="pagina()"
      [tamano]="filtros.tamano()"
      [fichas]="fichas()"
      (cambiarPagina)="filtros.irAPagina($event)"
      (cambiarTamano)="filtros.cambiarTamano($event)"
    >
      <ws-filter-panel
        etiqueta="Filtros de banners"
        agregarQue="banner"
        rutaAgregar="/banners/nuevo"
        [formGroup]="filtros.borrador"
        [buscando]="filtros.buscando()"
        [error]="filtros.error()"
        (buscar)="filtros.buscar()"
        (limpiar)="filtros.limpiar()"
      >
        <mat-form-field>
          <mat-label>Buscar banner</mat-label>
          <input matInput formControlName="texto" />
          <mat-hint>Por título</mat-hint>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Filtrar por estado</mat-label>
          <mat-select formControlName="estado">
            <mat-option value="todos">Todos</mat-option>
            <mat-option value="activos">Activos</mat-option>
            <mat-option value="inactivos">Inactivos</mat-option>
          </mat-select>
        </mat-form-field>
      </ws-filter-panel>

      <section class="border-t border-line" aria-label="Lista de banners">
        <div role="table" aria-label="Banners">
          <div
            role="row"
            class="grid grid-cols-[2.5rem_88px_minmax(0,1fr)_minmax(0,220px)_96px_88px] gap-x-4 bg-subtle px-5 py-3 text-xs font-semibold uppercase text-muted max-md:sr-only"
          >
            <span role="columnheader">N°</span>
            <span role="columnheader"><span class="sr-only">Imagen</span></span>
            <span role="columnheader">Banner</span>
            <span role="columnheader">Vigencia</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader"><span class="sr-only">Acciones</span></span>
          </div>
          @for (banner of pagina().items; track banner.id; let i = $index) {
            <div
              role="row"
              class="grid grid-cols-[2.5rem_88px_minmax(0,1fr)_minmax(0,220px)_96px_88px] items-center gap-x-4 border-t border-line px-5 py-3 max-md:grid-cols-[2rem_72px_minmax(0,1fr)] max-md:gap-y-2"
            >
              <span role="cell" class="text-sm tabular-nums text-muted max-md:self-start">
                {{ numero(i) }}
              </span>
              <div role="cell">
                <div class="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-subtle p-2">
                  <!-- Miniatura: la versión de celular pesa menos que la de escritorio. -->
                  <img
                    [src]="banner.mobileImageUrl || banner.imageUrl || 'assets/brand/hero.svg'"
                    [alt]="banner.title"
                    class="h-full w-full object-contain"
                  />
                </div>
              </div>
              <div role="cell" class="min-w-0">
                <strong class="block break-words">{{ banner.title }}</strong>
                <span
                  class="mt-1 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-on-primary-soft"
                >
                  {{ placementLabels[banner.placement] }}
                </span>
              </div>
              <!-- PBI-0221 (lote 24): la vigencia, con la hora, en hora de Lima. -->
              <span role="cell" class="text-xs text-muted max-md:col-span-2 max-md:col-start-2">
                {{ vigencia(banner.startAt, banner.endAt) }}
              </span>
              <span role="cell" class="max-md:col-start-2">
                <span [class]="insignia(banner.active ? 'exito' : 'alerta')">
                  {{ banner.active ? 'Activo' : 'Inactivo' }}
                </span>
              </span>
              <div role="cell" class="flex justify-end gap-2 max-md:col-start-3">
                <a
                  [class]="accion"
                  [routerLink]="['/banners', banner.id]"
                  queryParamsHandling="preserve"
                  [attr.aria-label]="'Editar banner ' + banner.title"
                  matTooltip="Editar"
                >
                  <svg wsAdminIcono="editar"></svg>
                </a>
                <button
                  type="button"
                  [class]="accionEliminar"
                  [attr.aria-label]="'Eliminar banner ' + banner.title"
                  matTooltip="Eliminar"
                  data-eliminar
                  (click)="remove(banner.id, $event)"
                >
                  <svg wsAdminIcono="eliminar"></svg>
                </button>
              </div>
            </div>
          }
        </div>
        @if (!pagina().items.length) {
          <p class="border-t border-line p-8 text-center text-sm text-muted">
            {{
              admin.banners().length
                ? 'Ningún banner cumple los filtros.'
                : 'Aún no hay banners configurados.'
            }}
          </p>
        }
      </section>
    </ws-admin-listado>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannersPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly dialog = inject(MatDialog);
  /** Lote 43 (PBI-0269): el foco tras eliminar, en la fila que ocupa su lugar. */
  // PBI-0273: con la página, el foco sabe cuándo la lista volvió a la anterior.
  private readonly foco = focoTrasEliminar({ pagina: () => this.pagina().page });
  protected readonly placementLabels = ETIQUETAS_UBICACION_BANNER;
  protected readonly vigencia = vigenciaVisible;
  protected readonly insignia = clasesDeInsignia;
  protected readonly accion = CLASES_ACCION;
  protected readonly accionEliminar = CLASES_ACCION_ELIMINAR;
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosBanners,
    escribir: parametrosDeFiltrosBanners,
    vacios: FILTROS_BANNERS_VACIOS,
    que: 'los banners',
  });
  protected readonly resultados = computed(() =>
    filtrarBanners(this.admin.banners(), this.filtros.aplicados()),
  );
  protected readonly pagina = computed(() => this.filtros.paginar(this.resultados()));
  /**
   * Lote 43 (PBI-0265): si la página de registro vuelve con `?nuevo=<id>` tras crear, el listado va a la página de ese
   * registro (o, si los filtros lo dejan fuera, los quita y va a su página).
   */
  private readonly registroNuevo = this.filtros.seguirRegistroNuevo<Banner>({
    filtrados: () => this.resultados(),
    todos: () => filtrarBanners(this.admin.banners(), FILTROS_BANNERS_VACIOS),
    es: (banner, id) => banner.id === id,
  });
  protected readonly fichas = computed((): FichaDeResumen[] => {
    const resultados = this.resultados();
    const [activos, inactivos] = contarPorClave(resultados, (b) => (b.active ? 'activos' : 'inactivos'), [
      'activos',
      'inactivos',
    ]);
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
    ];
  });
  protected readonly exportacion = (): TablaExportable => ({
    titulo: 'Banners',
    columnas: ['N°', 'Banner', 'Ubicación', 'Vigencia', 'Estado'],
    filas: this.resultados().map((b, i) => [
      i + 1,
      b.title,
      this.placementLabels[b.placement],
      this.vigencia(b.startAt, b.endAt),
      b.active ? 'Activo' : 'Inactivo',
    ]),
  });

  protected numero(indice: number): number {
    return numeroDeFila(this.pagina(), indice);
  }

  protected async remove(id: string, evento: Event): Promise<void> {
    const lugar = this.foco.recordar(evento);
    const eliminado = await eliminarRegistro({
      nombre: this.admin.banners().find((b) => b.id === id)?.title ?? '',
      id,
      confirmar: (nombre) => confirmarEliminacion(this.dialog, nombre),
      // El registro está en su propia página: aquí no hay un formulario en edición.
      editando: () => null,
      eliminar: (idEliminado) => this.admin.eliminarBanner(idEliminado),
      salirDeLaEdicion: () => undefined,
    });
    if (eliminado) this.foco.restaurar(lugar);
  }
}
