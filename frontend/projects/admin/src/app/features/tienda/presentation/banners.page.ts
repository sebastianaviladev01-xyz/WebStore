import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { eliminarRegistro } from '../../../shared/ui/eliminar-registro';
import { TiendaFacade } from '../application/tienda.facade';
import { ETIQUETAS_UBICACION_BANNER } from '../domain/tienda.model';
import {
  FILTROS_BANNERS_VACIOS,
  filtrarBanners,
  leerFiltrosBanners,
  parametrosDeFiltrosBanners,
} from '../domain/filtro-listado.rules';
import { filtrosDeListado } from './filtros-de-listado';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';

/**
 * Banners y campañas. Lote 21 (ADR-0025, PBI-0211): el banner se crea y se edita en su propia interfaz,
 * `/banners/nuevo` y `/banners/:id` (`RegistroBannerPage`), porque tiene más de tres campos; la lista va a todo el ancho.
 */
@Component({
  selector: 'ws-banners-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Banners y campañas</h1>
    <p class="mt-3 max-w-3xl text-sm leading-6 text-muted">
      Administra hero, promociones y banners secundarios. La tienda publica como máximo tres banners activos
      en el carrusel principal.
    </p>

    <ws-filter-panel
      class="mt-7"
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

    <section class="admin-card mt-6 overflow-hidden" aria-label="Lista de banners">
      @for (banner of pagina().items; track banner.id) {
        <article class="grid gap-4 border-b border-line p-5 sm:grid-cols-[110px_1fr_auto] sm:items-center">
          <div class="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-subtle p-3">
            <!-- Miniatura: la versión de celular pesa menos que la de escritorio. -->
            <img
              [src]="banner.mobileImageUrl || banner.imageUrl || 'assets/brand/hero.svg'"
              [alt]="banner.title"
              class="h-full w-full object-contain"
            />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <strong>{{ banner.title }}</strong>
              <span class="rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-on-primary-soft">
                {{ placementLabels[banner.placement] }}
              </span>
            </div>
            <p class="mt-1 text-xs text-muted">
              {{ banner.startAt.slice(0, 10) }} → {{ banner.endAt.slice(0, 10) }} ·
              {{ banner.active ? 'Activo' : 'Inactivo' }}
            </p>
          </div>
          <div class="flex gap-3 text-sm font-semibold">
            <!-- inline-flex items-center: como enlace, centra el texto en la altura de «Eliminar», como el botón de antes. -->
            <a
              class="inline-flex items-center text-link"
              [routerLink]="['/banners', banner.id]"
              queryParamsHandling="preserve"
              [attr.aria-label]="'Editar banner ' + banner.title"
            >
              Editar
            </a>
            <button
              type="button"
              class="text-danger"
              [attr.aria-label]="'Eliminar banner ' + banner.title"
              (click)="remove(banner.id)"
            >
              Eliminar
            </button>
          </div>
        </article>
      } @empty {
        <p class="p-8 text-center text-sm text-muted">
          {{
            admin.banners().length ? 'Ningún banner cumple los filtros.' : 'Aún no hay banners configurados.'
          }}
        </p>
      }
      <ws-pagination
        [pagina]="pagina()"
        etiqueta="Páginas de banners"
        (cambiar)="filtros.irAPagina($event)"
      />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannersPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly placementLabels = ETIQUETAS_UBICACION_BANNER;
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosBanners,
    escribir: parametrosDeFiltrosBanners,
    vacios: FILTROS_BANNERS_VACIOS,
    que: 'los banners',
  });
  protected readonly pagina = computed(() =>
    this.filtros.paginar(filtrarBanners(this.admin.banners(), this.filtros.aplicados())),
  );

  protected async remove(id: string): Promise<void> {
    await eliminarRegistro({
      pregunta: '¿Eliminar banner?',
      id,
      // El registro está en su propia página: aquí no hay un formulario en edición.
      editando: () => null,
      eliminar: (idEliminado) => this.admin.eliminarBanner(idEliminado),
      salirDeLaEdicion: () => undefined,
    });
  }
}
