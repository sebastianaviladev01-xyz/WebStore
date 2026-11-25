import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injectable,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { TiendaFacade } from '../application/tienda.facade';
import {
  arbolDeCategorias,
  FilaDeCategoria,
  filasVisibles,
  moverEnArbol,
} from '../domain/arbol-categorias.rules';
import { aplanarArbolCategorias } from '../domain/categoria.rules';
import { motivoParaNoEliminarCategoria } from '../domain/eliminacion.rules';
import { FILTROS_CATEGORIAS_VACIOS, SIN_PADRE } from '../domain/filtro-catalogo.model';
import {
  leerFiltrosCategorias,
  leerPagina,
  ParametrosUrl,
  parametrosDeFiltrosCategorias,
} from '../domain/filtro-catalogo.rules';
import { ELEMENTOS_POR_PAGINA, paginar } from '../domain/listado.rules';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

/**
 * Categorías abiertas del árbol (lote 22, PBI-0220) mientras dura la sesión del panel: al volver de editar una
 * categoría, el árbol sigue abierto donde estaba. `filtros` son los aplicados con que se calcularon: al cambiar, se
 * vuelven a abrir solo las que contienen las que coinciden con el nombre.
 */
@Injectable({ providedIn: 'root' })
export class EstadoArbolCategorias {
  readonly abiertas = signal<ReadonlySet<string>>(new Set());
  filtros: string | null = null;
}

/**
 * Listado de categorías (feature 008): panel de filtros debajo del título, la lista a todo el ancho y la paginación.
 * Los filtros aplicados y la página viven en la URL; el panel edita un borrador que «Buscar» aplica después de traer los
 * datos actuales. El registro se abre en `/categorias/nueva` y `/categorias/:id` (`RegistroCategoriaPage`).
 *
 * Lote 22 (ADR-0025, PBI-0220; provisional, por confirmar con Daniel): la lista es un árbol que se abre y se cierra por
 * niveles (`tree` y `treeitem` con `aria-expanded`), en lugar de la ruta en texto. La paginación cuenta las categorías
 * de primer nivel, cada una con sus ramas. Teclado: ↑ ↓ Inicio y Fin recorren las filas, → abre o baja a la primera
 * hija, ← cierra o sube a la que la contiene, `*` abre las hermanas, Intro o Espacio abre o cierra, y Tab lleva a
 * «Editar» y «Eliminar» de la fila con el foco.
 */
@Component({
  selector: 'ws-categories-page',
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
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 wsAdminTitulo class="text-3xl font-semibold tracking-tight text-ink">Categorías</h1>
        <p class="mt-3 text-sm text-muted">
          Estructura por nombres y subcategorías; el orden puede ser explícito o alfabético.
        </p>
      </div>
    </div>
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de categorías"
      agregarQue="categoría"
      rutaAgregar="/categorias/nueva"
      [formGroup]="borrador"
      [buscando]="buscando()"
      [error]="errorBusqueda()"
      (buscar)="buscar()"
      (limpiar)="limpiar()"
    >
      <mat-form-field>
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="nombre" />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Categoría padre</mat-label>
        <mat-select formControlName="padreId">
          <mat-option value="">Todas</mat-option>
          <mat-option [value]="sinPadre">Sin padre</mat-option>
          @for (entry of tree(); track entry.category.id) {
            <mat-option [value]="entry.category.id">
              {{ indent(entry.depth) }}{{ entry.category.name }}
            </mat-option>
          }
        </mat-select>
      </mat-form-field>
    </ws-filter-panel>
    @if (avisoEliminar()) {
      <p class="mt-6 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
        {{ avisoEliminar() }}
      </p>
    }
    <section class="admin-card mt-6 p-4" aria-label="Lista de categorías">
      @if (filas().length) {
        <ul role="tree" aria-label="Árbol de categorías">
          @for (fila of filas(); track fila.category.id) {
            <li
              role="treeitem"
              class="flex cursor-pointer items-center justify-between border-b border-line p-3"
              [id]="'nodo-' + fila.category.id"
              [style.padding-left.px]="12 + (fila.nivel - 1) * 24"
              [attr.aria-level]="fila.nivel"
              [attr.aria-setsize]="fila.total"
              [attr.aria-posinset]="fila.posicion"
              [attr.aria-expanded]="fila.tieneHijas ? fila.abierta : null"
              [attr.aria-labelledby]="'nombre-' + fila.category.id"
              [attr.aria-describedby]="'detalle-' + fila.category.id"
              [attr.tabindex]="enfocable() === fila.category.id ? 0 : -1"
              [attr.aria-selected]="enfocable() === fila.category.id"
              (focus)="foco.set(fila.category.id)"
              (keydown)="tecla($event, fila)"
              (click)="pulsar($event, fila)"
            >
              <div class="flex min-w-0 items-center gap-3">
                <!-- Con el puntero, toda la fila abre o cierra; sin hijas, la flecha solo ocupa su lugar. -->
                <span class="grid h-6 w-6 shrink-0 place-items-center text-muted" aria-hidden="true">
                  @if (fila.tieneHijas) {
                    <svg
                      viewBox="0 0 24 24"
                      class="h-4 w-4 fill-none stroke-current transition-transform motion-reduce:transition-none"
                      [class.rotate-90]="fila.abierta"
                      stroke-width="2.25"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  }
                </span>
                <!-- Lote 11 (PBI-0162): la miniatura de la imagen de la categoría, si tiene; sin ella, la fila como antes. -->
                @if (fila.category.imageUrl) {
                  <img
                    class="h-10 w-10 shrink-0 rounded-lg border border-line bg-subtle object-contain"
                    [src]="fila.category.imageUrl"
                    alt=""
                  />
                }
                <div class="min-w-0">
                  <strong [id]="'nombre-' + fila.category.id">{{ fila.category.name }}</strong>
                  <p class="text-xs text-muted" [id]="'detalle-' + fila.category.id">
                    Orden: {{ fila.category.order ?? 'alfabético' }}{{ subcategorias(fila) }}
                  </p>
                </div>
              </div>
              <div class="flex gap-3 text-sm font-semibold">
                <!-- inline-flex items-center: como enlace, centra el texto en la altura de «Eliminar» igual que el botón de antes. -->
                <a
                  class="inline-flex items-center gap-2 text-link"
                  [routerLink]="['/categorias', fila.category.id]"
                  queryParamsHandling="preserve"
                  [attr.tabindex]="enfocable() === fila.category.id ? 0 : -1"
                  [attr.aria-label]="'Editar categoría ' + fila.category.name"
                >
                  <svg wsAdminIcono="editar"></svg>
                  Editar
                </a>
                <button
                  class="inline-flex items-center gap-2 text-danger"
                  [attr.tabindex]="enfocable() === fila.category.id ? 0 : -1"
                  [attr.aria-label]="'Eliminar categoría ' + fila.category.name"
                  (click)="remove(fila.category.id)"
                >
                  <svg wsAdminIcono="eliminar"></svg>
                  Eliminar
                </button>
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="p-10 text-center text-sm text-muted">
          {{
            admin.categories().length ? 'Ninguna categoría cumple los filtros.' : 'Todavía no hay categorías.'
          }}
        </p>
      }
      <ws-pagination [pagina]="pagina()" etiqueta="Páginas de categorías" (cambiar)="irAPagina($event)" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly estado = inject(EstadoArbolCategorias);
  private readonly injector = inject(Injector);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  protected readonly sinPadre = SIN_PADRE;
  /** Parámetros de consulta de la URL; con un parámetro repetido, el primero. */
  private readonly parametros = toSignal(
    this.route.queryParamMap.pipe(
      map((mapa): ParametrosUrl =>
        Object.fromEntries(mapa.keys.map((clave) => [clave, mapa.get(clave) ?? undefined])),
      ),
    ),
    { requireSync: true },
  );
  /** Filtros de la última búsqueda, los de la URL. */
  protected readonly aplicados = computed(() => leerFiltrosCategorias(this.parametros()));
  /** El árbol con los filtros aplicados: sus raíces y las que empiezan abiertas por el filtro de nombre. */
  protected readonly arbol = computed(() => arbolDeCategorias(this.admin.categories(), this.aplicados()));
  /** La página cuenta las categorías de primer nivel del árbol, cada una con sus ramas. */
  protected readonly pagina = computed(() =>
    paginar(this.arbol().raices, leerPagina(this.parametros()), ELEMENTOS_POR_PAGINA),
  );
  /** Las filas que se ven en la página: sus raíces y las hijas de las abiertas. */
  protected readonly filas = computed(() => filasVisibles(this.pagina().items, this.estado.abiertas()));
  /** La fila que tuvo el foco por última vez. */
  protected readonly foco = signal<string | null>(null);
  /** La única fila a la que se llega con Tab (con sus acciones): la del foco si se ve; si no, la primera. */
  protected readonly enfocable = computed(() => {
    const filas = this.filas();
    const foco = this.foco();
    return filas.some((fila) => fila.category.id === foco) ? foco : (filas[0]?.category.id ?? null);
  });
  /** Opciones de «Categoría padre»: todas, en orden jerárquico. */
  protected readonly tree = computed(() => aplanarArbolCategorias(this.admin.categories()));
  /** Lo que se escribe en el panel; se aplica con «Buscar». */
  protected readonly borrador = new FormGroup({
    nombre: new FormControl('', { nonNullable: true }),
    padreId: new FormControl('', { nonNullable: true }),
  });
  protected readonly buscando = signal(false);
  protected readonly errorBusqueda = signal<string | null>(null);
  /** Por qué no se puede eliminar la categoría elegida (PBI-0131): subcategorías o productos. */
  protected readonly avisoEliminar = signal<string | null>(null);
  constructor() {
    // El borrador se iguala a los filtros aplicados cada vez que cambia la URL (también con atrás y adelante).
    effect(() => {
      const aplicados = this.aplicados();
      untracked(() => this.borrador.setValue({ ...aplicados }));
    });
    // Con otros filtros, el árbol vuelve a abrir solo lo que contiene las que coinciden con el nombre.
    effect(() => {
      const clave = JSON.stringify(this.aplicados());
      const abiertas = this.arbol().abiertas;
      untracked(() => {
        if (this.estado.filtros === clave) return;
        this.estado.filtros = clave;
        this.estado.abiertas.set(new Set(abiertas));
      });
    });
  }
  /** Trae los datos actuales y aplica el borrador desde la página 1; si falla, conserva filtros y resultados. */
  protected async buscar() {
    this.buscando.set(true);
    this.errorBusqueda.set(null);
    const actual = await this.admin.refresh();
    this.buscando.set(false);
    if (!actual) {
      this.errorBusqueda.set(
        'No pudimos consultar las categorías actuales. La lista muestra la última búsqueda; inténtalo de nuevo.',
      );
      return;
    }
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: parametrosDeFiltrosCategorias(this.borrador.getRawValue()),
    });
  }
  /** Vacía todos los filtros del panel de una vez, sin buscar (AC-14). */
  protected limpiar() {
    this.borrador.setValue({ ...FILTROS_CATEGORIAS_VACIOS });
  }
  protected irAPagina(numero: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina: numero > 1 ? numero : null },
      queryParamsHandling: 'merge',
    });
  }
  protected indent(depth: number) {
    return '  '.repeat(depth) + (depth ? '↳ ' : '');
  }
  /** « · 2 subcategorías» de una categoría con hijas en el árbol; nada en el último nivel. */
  protected subcategorias(fila: FilaDeCategoria): string {
    if (!fila.tieneHijas) return '';
    const cantidad = this.admin.categories().filter((c) => c.parentId === fila.category.id).length;
    return cantidad ? ` · ${cantidad} ${cantidad === 1 ? 'subcategoría' : 'subcategorías'}` : '';
  }
  /** Abre o cierra una categoría; si la fila con el foco queda dentro de una cerrada, el foco pasa a esa categoría. */
  private alternar(id: string, abrir: boolean) {
    this.estado.abiertas.update((actuales) => {
      const siguientes = new Set(actuales);
      if (abrir) siguientes.add(id);
      else siguientes.delete(id);
      return siguientes;
    });
    const foco = this.foco();
    if (!abrir && foco && !this.filas().some((fila) => fila.category.id === foco)) this.enfocar(id);
  }
  /** Lleva el foco a una fila cuando ya está en pantalla (puede aparecer recién al abrir la que la contiene). */
  private enfocar(id: string) {
    this.foco.set(id);
    afterNextRender(() => this.host.querySelector<HTMLElement>(`#${CSS.escape('nodo-' + id)}`)?.focus(), {
      injector: this.injector,
    });
  }
  /** Teclado del árbol sobre la fila; sobre «Editar» y «Eliminar» las teclas hacen lo de siempre. */
  protected tecla(evento: KeyboardEvent, fila: FilaDeCategoria) {
    if (evento.target !== evento.currentTarget) return;
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      if (fila.tieneHijas) this.alternar(fila.category.id, !fila.abierta);
      return;
    }
    const movimiento = moverEnArbol(this.filas(), fila.category.id, evento.key);
    if (!movimiento) return;
    evento.preventDefault();
    for (const id of movimiento.abrir) this.alternar(id, true);
    for (const id of movimiento.cerrar) this.alternar(id, false);
    this.enfocar(movimiento.foco);
  }
  /** Con el puntero, la fila se abre o se cierra (salvo al pulsar «Editar» o «Eliminar»). */
  protected pulsar(evento: MouseEvent, fila: FilaDeCategoria) {
    if ((evento.target as HTMLElement).closest('a, button')) return;
    this.foco.set(fila.category.id);
    if (fila.tieneHijas) this.alternar(fila.category.id, !fila.abierta);
  }
  /** PBI-0131: una categoría con subcategorías o productos no se elimina; se dice por qué, sin pedir confirmación. */
  protected async remove(id: string) {
    this.avisoEliminar.set(null);
    const categoria = this.admin.categories().find((item) => item.id === id);
    if (!categoria) return;
    const motivo = motivoParaNoEliminarCategoria(categoria, this.admin.categories(), this.admin.products());
    if (motivo) {
      this.avisoEliminar.set(motivo);
      return;
    }
    if (confirm('¿Eliminar categoría?')) await this.admin.eliminarCategoria(id);
  }
}
