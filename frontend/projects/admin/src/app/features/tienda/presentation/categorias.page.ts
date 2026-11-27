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
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { TiendaFacade } from '../application/tienda.facade';
import {
  arbolDeCategorias,
  FilaDeCategoria,
  filasVisibles,
  moverEnArbol,
  NodoCategoria,
} from '../domain/arbol-categorias.rules';
import { aplanarArbolCategorias, opcionesDeCategoria } from '../domain/categoria.rules';
import { motivoParaNoEliminarCategoria } from '../domain/eliminacion.rules';
import { TablaExportable } from '../domain/exportacion.rules';
import { FILTROS_CATEGORIAS_VACIOS, SIN_PADRE } from '../domain/filtro-catalogo.model';
import {
  leerFiltrosCategorias,
  ParametrosUrl,
  parametrosDeFiltrosCategorias,
} from '../domain/filtro-catalogo.rules';
import { textoDeCantidad, textoDelTotal } from '../domain/listado.rules';
import { CLASES_ACCION, CLASES_ACCION_ELIMINAR, FichaDeResumen } from './insignia';
import { ListadoComponent } from './listado.component';
import { paginacionDeLaUrl } from './paginacion-de-la-url';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { confirmarEliminacion } from '../../../shared/ui/confirmacion.dialog';
import { focoTrasEliminar } from '../../../shared/ui/foco-tras-eliminar';
import { IconoDirective } from '../../../shared/ui/icono.directive';

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
 *
 * Lote 43 (ADR-0033, PBI-0265): en un solo panel, como la lista de proveedores del SGC, con las acciones de solo ícono,
 * «Exportar» (todas las categorías que cumplen los filtros, con su ruta) y el pie con el total, las de primer nivel y la
 * paginación de 10, 25 o 50. La lista sigue siendo un árbol (PBI-0220): la numeración «N°» va en las de primer nivel,
 * que son las que cuenta la paginación.
 */
@Component({
  selector: 'ws-categories-page',
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
      titulo="Categorías"
      descripcion="Estructura por nombres y subcategorías; el orden puede ser explícito o alfabético."
      que="categorías"
      [exportacion]="exportacion"
      [pagina]="pagina()"
      [tamano]="paginacion.tamano()"
      [fichas]="fichas()"
      (cambiarPagina)="paginacion.irAPagina($event)"
      (cambiarTamano)="paginacion.cambiarTamano($event)"
    >
      <ws-filter-panel
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
          <input matInput formControlName="nombre" placeholder="Buscar por nombre…" />
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
        <p
          class="mx-5 mb-5 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger sm:mx-6"
          role="alert"
        >
          {{ avisoEliminar() }}
        </p>
      }
      <section class="border-t border-line px-2 py-2 sm:px-3" aria-label="Lista de categorías">
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
                  <!-- Lote 43 (PBI-0265): «N°» de las de primer nivel, que son las que cuenta la paginación. -->
                  <span class="w-6 shrink-0 text-right text-sm tabular-nums text-muted" aria-hidden="true">
                    {{ fila.nivel === 1 ? numeroDeRaiz(fila.category.id) : '' }}
                  </span>
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
                <div class="flex shrink-0 gap-2">
                  <a
                    [class]="accion"
                    [routerLink]="['/categorias', fila.category.id]"
                    queryParamsHandling="preserve"
                    [attr.tabindex]="enfocable() === fila.category.id ? 0 : -1"
                    [attr.aria-label]="'Editar categoría ' + fila.category.name"
                    matTooltip="Editar"
                  >
                    <svg wsAdminIcono="editar"></svg>
                  </a>
                  <button
                    type="button"
                    [class]="accionEliminar"
                    [attr.tabindex]="enfocable() === fila.category.id ? 0 : -1"
                    [attr.aria-label]="'Eliminar categoría ' + fila.category.name"
                    matTooltip="Eliminar"
                    data-eliminar
                    (click)="remove(fila.category.id, $event)"
                  >
                    <svg wsAdminIcono="eliminar"></svg>
                  </button>
                </div>
              </li>
            }
          </ul>
        } @else {
          <p class="p-10 text-center text-sm text-muted">
            {{
              admin.categories().length
                ? 'Ninguna categoría cumple los filtros.'
                : 'Todavía no hay categorías.'
            }}
          </p>
        }
      </section>
    </ws-admin-listado>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  /** Lote 43 (PBI-0269): el foco tras eliminar, en la fila que ocupa su lugar. */
  private readonly focoTrasBorrar = focoTrasEliminar();
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
  /** La página y su tamaño, en la URL (lote 43). */
  protected readonly paginacion = paginacionDeLaUrl(this.parametros);
  protected readonly pagina = computed(() => this.paginacion.paginar(this.arbol().raices));
  /**
   * Lote 43 (PBI-0265): si la página de registro vuelve con `?nuevo=<id>` tras crear, el listado va a la página de ese
   * registro (o, si los filtros lo dejan fuera, los quita y va a su página). La paginación cuenta las de primer nivel:
   * se va a la página de la que la contiene.
   */
  private readonly registroNuevo = this.paginacion.seguirRegistroNuevo<NodoCategoria>({
    filtrados: () => this.arbol().raices,
    todos: () => arbolDeCategorias(this.admin.categories(), FILTROS_CATEGORIAS_VACIOS).raices,
    es: function contiene(nodo, id): boolean {
      return nodo.category.id === id || nodo.children.some((hija) => contiene(hija, id));
    },
  });
  /** Todas las categorías del árbol filtrado, en su orden: las que cuenta el total y las que se exportan. */
  private readonly enElArbol = computed(() => {
    const todas: NodoCategoria[] = [];
    const recorrer = (nodos: readonly NodoCategoria[]) => {
      for (const nodo of nodos) {
        todas.push(nodo);
        recorrer(nodo.children);
      }
    };
    recorrer(this.arbol().raices);
    return todas;
  });
  /** El total de las que cumplen los filtros (con las que las contienen) y cuántas son de primer nivel (lote 43). */
  protected readonly fichas = computed((): FichaDeResumen[] => [
    { texto: textoDelTotal(this.enElArbol().length), tono: 'principal', icono: 'lista' },
    {
      texto: textoDeCantidad(this.arbol().raices.length, 'de primer nivel', 'de primer nivel'),
      tono: 'neutro',
      icono: 'categorias',
    },
  ]);
  protected readonly exportacion = (): TablaExportable => {
    const rutas = new Map(opcionesDeCategoria(this.admin.categories()).map((o) => [o.category.id, o.ruta]));
    return {
      titulo: 'Categorías',
      columnas: ['N°', 'Categoría', 'Ruta', 'Orden'],
      filas: this.enElArbol().map(({ category }, i) => [
        i + 1,
        category.name,
        rutas.get(category.id) ?? category.name,
        category.order ?? 'Alfabético',
      ]),
    };
  };
  protected readonly accion = CLASES_ACCION;
  protected readonly accionEliminar = CLASES_ACCION_ELIMINAR;
  /** «N°» de una categoría de primer nivel de la página, continuo entre páginas. */
  protected numeroDeRaiz(id: string): number {
    const pagina = this.pagina();
    return pagina.from + pagina.items.findIndex((nodo) => nodo.category.id === id);
  }
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
      queryParams: {
        ...parametrosDeFiltrosCategorias(this.borrador.getRawValue()),
        ...this.paginacion.conservar(),
      },
    });
  }
  /** Vacía todos los filtros del panel de una vez, sin buscar (AC-14). */
  protected limpiar() {
    this.borrador.setValue({ ...FILTROS_CATEGORIAS_VACIOS });
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
  protected async remove(id: string, evento: Event) {
    this.avisoEliminar.set(null);
    const categoria = this.admin.categories().find((item) => item.id === id);
    if (!categoria) return;
    const motivo = motivoParaNoEliminarCategoria(categoria, this.admin.categories(), this.admin.products());
    if (motivo) {
      this.avisoEliminar.set(motivo);
      return;
    }
    // Lote 43 (ADR-0033, PBI-0269): la ventana propia de confirmación, con el nombre de la categoría.
    const lugar = this.focoTrasBorrar.recordar(evento);
    if (!(await confirmarEliminacion(this.dialog, categoria.name))) return;
    if (await this.admin.eliminarCategoria(id)) this.focoTrasBorrar.restaurar(lugar);
  }
}
