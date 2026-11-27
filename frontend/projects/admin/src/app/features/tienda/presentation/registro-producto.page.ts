import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  signal,
  untracked,
} from '@angular/core';
import {
  type AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';

import { TiendaFacade } from '../application/tienda.facade';
import { estadoDeLaEdicion } from '../domain/edicion.rules';
import { motivoDeProductoRepetido, slugDe } from '../domain/registro-unico.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { hayLugarEnLaGaleria, mensajeDeGaleriaLlena, motivoParaNoUsarFoto } from '../domain/foto.rules';
import { productoDeLaFicha } from '../domain/inventario.rules';
import {
  caracteristicasDeLasFilas,
  filasDeCaracteristicas,
  parametrosAlVolverDelRegistro,
} from '../domain/registro.rules';
import { conservarBorrador } from './borrador';
import { Producto } from '../domain/tienda.model';
import { MENSAJE_FOTO_DE_GALERIA_NO_CABE, reducirFoto, versionesDelProducto } from './reducir-foto';
import { SelectorCategoriaComponent } from './selector-categoria.component';
import { DatosRegistroComponent } from './datos-registro.component';
import { EncabezadoRegistroComponent } from './encabezado-registro.component';
import { PieRegistroComponent } from './pie-registro.component';
import { SeccionRegistroComponent } from './seccion-registro.component';
import { IconoDirective } from '../../../shared/ui/icono.directive';
import { SinDatosComponent } from '../../../shared/ui/sin-datos.component';
import { TextoAyudaComponent } from '../../../shared/ui/texto-ayuda.component';

/** Una característica por fila (lote 44, PBI-0268). */
const filaDeCaracteristica = (valor = '') => new FormControl(valor, { nonNullable: true });

/** La tabla de características tiene al menos una escrita: la ficha no se guarda sin ninguna. */
const conAlgunaCaracteristica = (filas: AbstractControl<string[]>): ValidationErrors | null =>
  caracteristicasDeLasFilas(filas.value).length ? null : { required: true };

/**
 * Interfaz de registro de un producto (feature 008): `/productos/nuevo` y `/productos/:id`. Es el formulario que
 * antes estaba junto a la lista, con los mismos campos, validaciones, galería y reglas del vendedor. Al editar trae
 * los datos actuales con `refresh()`; con «Guardar», «Cancelar» y «Regresar» vuelve al listado con sus filtros y su
 * página (`queryParamsHandling: 'preserve'`). Desde el lote 44 (ADR-0033, PBI-0268) tiene la forma de los formularios del
 * SGC: secciones «Datos generales», «Precio y stock», «Imágenes» y «Características» (una tabla editable), el estado
 * en la fila de cabecera y, al crear, «Guardar y continuar», que abre el producto creado en «Editar».
 */
@Component({
  selector: 'ws-product-form-page',
  imports: [
    DatosRegistroComponent,
    EncabezadoRegistroComponent,
    IconoDirective,
    PieRegistroComponent,
    SeccionRegistroComponent,
    SinDatosComponent,
    TextoAyudaComponent,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    SelectorCategoriaComponent,
  ],
  template: `
    <!--
      Lote 44 (ADR-0033, PBI-0268): la forma de los formularios del SGC. Una tarjeta con el título, su descripción y
      «Regresar»; la fila de cabecera (estado, usuario y fecha); las secciones con su ícono; y el pie con «Cancelar»,
      «Guardar y continuar» (solo al crear) y «Guardar».
    -->
    <div class="admin-card grid max-w-4xl gap-6 p-5 sm:p-6">
      <ws-admin-encabezado-registro
        tituloId="titulo-formulario-producto"
        [titulo]="(editingId() ? 'Editar' : 'Nuevo') + ' producto'"
        [descripcion]="
          editingId()
            ? 'Cambia los datos, el precio, las imágenes o las características del producto.'
            : 'Completa los datos, el precio, las imágenes y las características del producto.'
        "
        listado="/productos"
      />
      @if (loadingProduct()) {
        <p class="border-t border-line pt-5 text-sm text-muted" role="status">Cargando…</p>
      } @else if (missing()) {
        <div class="border-t border-line pt-5" role="alert">
          <p class="font-semibold">Este producto ya no existe</p>
          <p class="mt-2 text-sm text-muted">
            Otra persona lo eliminó. Vuelve al listado para ver los productos actuales.
          </p>
        </div>
      } @else if (sinDatos()) {
        <!-- PBI-0256: la consulta falló y el panel no tenía el producto; no se sabe si existe. -->
        <ws-admin-sin-datos registro="del producto" (reintentar)="reintentar()" />
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
          aria-labelledby="titulo-formulario-producto"
        >
          <ws-admin-datos-registro [estado]="form.controls.active" />
          <ws-admin-seccion-registro titulo="Datos generales" icono="datos">
            <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
              <mat-form-field
                [subscriptSizing]="form.controls.name.hasError('repetido') ? 'dynamic' : 'fixed'"
              >
                <mat-label>Nombre</mat-label>
                <input matInput formControlName="name" />
                <mat-error>{{ mensaje(form.controls.name.errors) }}</mat-error>
              </mat-form-field>
              <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
              <mat-form-field
                [subscriptSizing]="form.controls.sku.hasError('repetido') ? 'dynamic' : 'fixed'"
              >
                <mat-label>SKU</mat-label>
                <input matInput formControlName="sku" />
                <mat-error>{{ mensaje(form.controls.sku.errors) }}</mat-error>
              </mat-form-field>
              <!-- Lote 29 (ADR-0027, PBI-0238; provisional): la categoría se elige con búsqueda, con su ruta en el árbol. -->
              <ws-admin-selector-categoria
                [control]="form.controls.categoryId"
                [categorias]="admin.categories()"
              />
              <mat-form-field>
                <mat-label>Marca</mat-label>
                <mat-select formControlName="brandId">
                  @for (b of marcasElegibles(); track b.id) {
                    <mat-option [value]="b.id">{{ b.name }}</mat-option>
                  }
                </mat-select>
                <mat-error>{{ mensaje(form.controls.brandId.errors) }}</mat-error>
              </mat-form-field>
            </div>
            <mat-form-field>
              <mat-label>Descripción</mat-label>
              <textarea matInput rows="3" formControlName="description"></textarea>
              <mat-error>{{ mensaje(form.controls.description.errors) }}</mat-error>
            </mat-form-field>
            <!-- Lote 22 (PBI-0215): sin tope; con más de cuatro, el inicio los muestra en un carrusel. -->
            <div>
              <mat-checkbox formControlName="featured" aria-describedby="ayuda-destacado">
                Es destacado
              </mat-checkbox>
              <p id="ayuda-destacado" class="ml-11 text-xs text-muted">
                <ws-admin-texto-ayuda>
                  Sale en «Productos destacados» del inicio si tiene stock. Con más de cuatro, se muestran en
                  un carrusel.
                </ws-admin-texto-ayuda>
              </p>
            </div>
          </ws-admin-seccion-registro>
          <ws-admin-seccion-registro titulo="Precio y stock" icono="precio">
            <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <mat-form-field>
                <mat-label>Precio</mat-label>
                <input matInput type="number" formControlName="price" />
                <mat-error>{{ mensaje(form.controls.price.errors) }}</mat-error>
              </mat-form-field>
              <!--
                Lote 23 (ADR-0025, PBI-0226; provisional): el stock sale del registro y se gestiona solo en Inventario.
                Un producto nuevo empieza sin stock.
              -->
              <p class="self-center pb-5 text-xs text-muted">
                <ws-admin-texto-ayuda>
                  {{ editingId() ? 'El stock se gestiona en' : 'Empieza sin stock: se carga en' }}
                  <a class="font-semibold text-link" routerLink="/inventario">Inventario</a>
                </ws-admin-texto-ayuda>
              </p>
            </div>
          </ws-admin-seccion-registro>
          <ws-admin-seccion-registro titulo="Imágenes" icono="banners">
            <!--
              Lote 24 (ADR-0026, PBI-0214; provisional): la imagen se carga como archivo una sola vez y el Admin genera la
              versión de la ficha y la miniatura de los listados; ya no se escribe una URL.
            -->
            <fieldset
              class="min-w-0 rounded-xl border border-line p-4"
              aria-describedby="ayuda-imagen-principal"
            >
              <legend class="px-1 text-sm font-semibold">Imagen principal</legend>
              <p id="ayuda-imagen-principal" class="text-xs text-muted">
                <ws-admin-texto-ayuda>
                  Cárgala una sola vez: se guarda una versión para la ficha y una miniatura para los listados.
                  PNG, JPG o WebP de hasta 15 MB.
                </ws-admin-texto-ayuda>
              </p>
              @if (form.controls.imageUrl.value; as imagen) {
                <img
                  [src]="imagen"
                  alt="Imagen principal actual"
                  class="mt-3 aspect-[4/3] w-48 max-w-full rounded-lg border border-line bg-subtle object-contain p-1"
                />
              }
              <label
                class="mt-3 items-center gap-2 inline-flex cursor-pointer rounded-xl border border-line px-4 py-2.5 text-sm font-semibold"
              >
                <svg wsAdminIcono="cargar"></svg>
                {{ form.controls.imageUrl.value ? 'Reemplazar imagen' : 'Cargar imagen' }}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="sr-only"
                  (change)="onMainImageSelected($event)"
                />
              </label>
              @if (preparandoImagen()) {
                <p class="mt-2 text-xs text-muted" role="status">Preparando la imagen…</p>
              }
              @if (imageError()) {
                <p class="mt-2 text-xs font-semibold text-danger" role="alert">{{ imageError() }}</p>
              } @else if (form.controls.imageUrl.touched && form.controls.imageUrl.invalid) {
                <p class="mt-2 text-xs font-semibold text-danger" role="alert">Carga la imagen principal.</p>
              }
            </fieldset>
            <fieldset class="min-w-0 rounded-xl border border-line p-4">
              <legend class="px-1 text-sm font-semibold">Galería de fotos</legend>
              <!--
                Lote 25 (ADR-0026; provisional): las fotos se cargan como archivo, como la imagen principal; ya no se
                escribe una URL (Daniel: «no adjuntas como URL»).
              -->
              <p class="text-xs text-muted">
                <ws-admin-texto-ayuda>
                  La imagen principal va primero; estas fotos se muestran después en la ficha. PNG, JPG o WebP
                  de hasta 15 MB.
                </ws-admin-texto-ayuda>
              </p>
              @if (gallery().length) {
                <ul class="mt-3 grid grid-cols-3 gap-2">
                  @for (url of gallery(); track url; let i = $index) {
                    <li class="relative overflow-hidden rounded-lg border border-line bg-subtle">
                      <img
                        [src]="url"
                        [alt]="'Foto ' + (i + 2) + ' del producto'"
                        class="aspect-square w-full object-contain p-1"
                      />
                      <button
                        type="button"
                        class="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-surface text-sm font-semibold text-danger shadow"
                        [attr.aria-label]="'Quitar foto ' + (i + 2)"
                        (click)="removePhoto(i)"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          class="h-3.5 w-3.5 fill-none stroke-current"
                          stroke-width="2.25"
                          stroke-linecap="round"
                        >
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </li>
                  }
                </ul>
              }
              <label
                class="mt-3 items-center gap-2 inline-flex cursor-pointer rounded-xl border border-line px-4 py-2.5 text-sm font-semibold"
              >
                <svg wsAdminIcono="cargar"></svg>
                Cargar foto
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="sr-only"
                  (change)="onPhotoSelected($event)"
                />
              </label>
              @if (photoError()) {
                <p class="mt-2 text-xs font-semibold text-danger" role="alert">{{ photoError() }}</p>
              }
            </fieldset>
          </ws-admin-seccion-registro>
          <!--
            Lote 44 (PBI-0268): las características, que antes eran un textarea «una por línea», son una tabla editable
            con «Agregar fila» y una papelera por fila. Se guardan igual: la lista de textos sin las filas vacías.
          -->
          <ws-admin-seccion-registro titulo="Características" icono="lista">
            <p class="text-xs text-muted">
              <ws-admin-texto-ayuda>
                Una característica por fila, en el orden en que se muestran en la ficha. Las filas vacías no
                se guardan.
              </ws-admin-texto-ayuda>
            </p>
            <table class="w-full border-collapse text-sm" aria-label="Características">
              <thead>
                <tr class="border-b border-line text-left text-xs text-muted">
                  <th scope="col" class="w-10 py-2 pr-2 font-semibold">N.º</th>
                  <th scope="col" class="py-2 pr-2 font-semibold">Característica</th>
                  <th scope="col" class="w-11 py-2"><span class="sr-only">Quitar</span></th>
                </tr>
              </thead>
              <tbody>
                @for (fila of form.controls.highlights.controls; track fila; let i = $index) {
                  <tr class="border-b border-line">
                    <td class="py-2 pr-2 text-muted">{{ i + 1 }}</td>
                    <td class="py-2 pr-2">
                      <input
                        class="min-h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink"
                        [id]="'caracteristica-' + i"
                        [formControl]="fila"
                        [attr.aria-label]="'Característica ' + (i + 1)"
                      />
                    </td>
                    <td class="py-2 text-right">
                      <button
                        type="button"
                        class="inline-grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-danger hover:bg-danger-soft"
                        [attr.aria-label]="'Quitar la característica ' + (i + 1)"
                        (click)="quitarCaracteristica(i)"
                      >
                        <svg wsAdminIcono="eliminar"></svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (form.controls.highlights.touched && form.controls.highlights.invalid) {
              <p class="text-xs font-semibold text-danger" role="alert">
                Escribe al menos una característica.
              </p>
            }
            <div>
              <button
                type="button"
                class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-subtle"
                (click)="agregarCaracteristica()"
              >
                <svg wsAdminIcono="agregar"></svg>
                Agregar fila
              </button>
            </div>
          </ws-admin-seccion-registro>
          <ws-admin-pie-registro
            listado="/productos"
            [creando]="!editingId()"
            [guardando]="admin.saving()"
            [deshabilitado]="preparandoImagen()"
            [continuando]="continuando()"
            (continuar)="save(true)"
          >
            @if (saveError()) {
              <p
                class="mb-4 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
                role="alert"
              >
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
export class RegistroProductoPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly router = inject(Router);
  /** `:id` de `/productos/:id` (`withComponentInputBinding`); no llega en `/productos/nuevo`. */
  readonly id = input<string>();
  protected readonly editingId = computed(() => this.id() ?? null);
  /** Id del producto nuevo, fijo mientras la página está abierta: un segundo envío no crea otro (PBI-0121). */
  private readonly idNuevo = crypto.randomUUID();
  /** Mientras la edición trae los datos actuales: «Cargando…» en lugar del formulario. */
  protected readonly loadingProduct = signal(false);
  /** La consulta respondió y el producto en edición no está en el snapshot actual: otra persona lo eliminó. */
  protected readonly missing = signal(false);
  /**
   * PBI-0256 (lote 40, ADR-0032; provisional, por confirmar con Daniel): la consulta falló y el panel no tenía el
   * producto (por ejemplo, en una carga nueva). No se dice que no existe: se avisa del fallo con «Reintentar».
   */
  protected readonly sinDatos = signal(false);
  /** Aviso si no se pudieron traer los datos actuales y el formulario usa los que había en memoria. */
  protected readonly staleNotice = signal<string | null>(null);
  /** Motivo del último guardado rechazado, junto al botón; el formulario conserva lo escrito. */
  protected readonly saveError = signal<string | null>(null);
  /** El producto tal como se cargó al abrir la edición: lo que cambió la persona se calcula contra él (PBI-0120). */
  private base: Producto | null = null;
  /** Marca del producto al abrirlo: sigue en la lista aunque esté inactiva. */
  private readonly marcaActual = signal<string | null>(null);
  /**
   * PBI-0131 (confirmado por Daniel el 2026-11-18): una marca inactiva no se ofrece para los productos; solo sigue en
   * la lista la que ya tenía el producto en edición.
   */
  protected readonly marcasElegibles = computed(() =>
    this.admin.brands().filter((marca) => marca.active || marca.id === this.marcaActual()),
  );
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    imageUrl: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    thumbnailUrl: new FormControl('', { nonNullable: true }),
    /** Lote 44 (PBI-0268): una fila por característica, en lugar del textarea «una por línea». */
    highlights: new FormArray([filaDeCaracteristica()], { validators: conAlgunaCaracteristica }),
    price: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    brandId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    active: new FormControl(true, { nonNullable: true }),
    featured: new FormControl(false, { nonNullable: true }),
  });
  protected readonly mensaje = mensajeDeError;
  /**
   * PBI-0151: lo escrito (con la galería) vuelve si la sesión venció a mitad de la edición; se aplica después de
   * traer el producto.
   */
  protected readonly borrador = conservarBorrador({
    form: this.form,
    guardar: () => ({ valor: this.form.getRawValue(), galeria: this.gallery() }),
    restaurar: (borrador) => {
      this.ponerCaracteristicas(filasDeCaracteristicas(borrador.valor.highlights));
      // patchValue: un borrador guardado antes de la casilla «Es destacado» (lote 22) no la trae.
      this.form.patchValue(borrador.valor);
      this.gallery.set(borrador.galeria);
    },
    diferido: true,
  });
  constructor() {
    // Al abrir la edición (o cambiar de `:id` sin salir de la página) se traen los datos actuales.
    effect(() => {
      const id = this.editingId();
      if (id) untracked(() => void this.edit(id));
      else untracked(() => this.borrador.aplicar());
    });
  }
  private readonly injector = inject(Injector);
  /** El guardado en curso lo pidió «Guardar y continuar» (lote 44, PBI-0268). */
  protected readonly continuando = signal(false);
  /** Reemplaza las filas de la tabla de características (lote 44, PBI-0268). */
  private ponerCaracteristicas(filas: readonly string[]) {
    const tabla = this.form.controls.highlights;
    tabla.clear({ emitEvent: false });
    for (const fila of filas) tabla.push(filaDeCaracteristica(fila), { emitEvent: false });
    tabla.updateValueAndValidity();
  }
  /** «Agregar fila»: una fila vacía al final, con el foco para escribir en ella. */
  protected agregarCaracteristica() {
    const tabla = this.form.controls.highlights;
    tabla.push(filaDeCaracteristica());
    tabla.markAsDirty();
    const indice = tabla.length - 1;
    afterNextRender(() => document.getElementById(`caracteristica-${indice}`)?.focus(), {
      injector: this.injector,
    });
  }
  /** La papelera de una fila la quita; si era la única, queda una vacía para escribir. */
  protected quitarCaracteristica(indice: number) {
    const tabla = this.form.controls.highlights;
    tabla.removeAt(indice);
    if (!tabla.length) tabla.push(filaDeCaracteristica());
    tabla.markAsDirty();
    tabla.markAsTouched();
  }
  /** Fotos adicionales del producto en edición; se guardan junto con el resto del formulario. */
  protected readonly gallery = signal<readonly string[]>([]);
  protected readonly photoError = signal<string | null>(null);
  /** Lote 24 (PBI-0214): mientras se generan la imagen de la ficha y la miniatura, no se guarda. */
  protected readonly preparandoImagen = signal(false);
  protected readonly imageError = signal<string | null>(null);
  /**
   * PBI-0214 (lote 24): la imagen principal se carga como archivo. Se genera la versión de la ficha y su miniatura
   * (`versionesDelProducto`); las dos se guardan juntas. Una imagen ya guardada (una ruta de `assets/`) se conserva
   * hasta que se reemplace.
   */
  protected onMainImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const motivo = motivoParaNoUsarFoto(file);
    this.imageError.set(motivo);
    if (motivo) return;
    this.preparandoImagen.set(true);
    void versionesDelProducto(file).then((versiones) => {
      this.preparandoImagen.set(false);
      if (!versiones) {
        this.imageError.set('No pudimos preparar la imagen. Usa otra foto.');
        return;
      }
      this.form.patchValue({ imageUrl: versiones.imagen, thumbnailUrl: versiones.miniatura });
      this.form.controls.imageUrl.markAsTouched();
      this.form.markAsDirty();
    });
  }
  protected removePhoto(index: number) {
    this.gallery.update((items) => items.filter((_, i) => i !== index));
  }
  protected onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    // Lote 25: las mismas reglas que la imagen principal (tipo y 15 MB), sin ofrecer una URL.
    const motivo = motivoParaNoUsarFoto(file);
    this.photoError.set(motivo);
    if (motivo) return;
    // PBI-0119: la foto se reduce y se comprime antes de agregarla; el BFF la guarda y la tienda la pide por su
    // dirección (lote 25, ADR-0026).
    void reducirFoto(file).then((url) => {
      if (url) this.addPhoto(url);
      else this.photoError.set(MENSAJE_FOTO_DE_GALERIA_NO_CABE);
    });
  }
  private addPhoto(url: string) {
    this.photoError.set(null);
    if (url === this.form.controls.imageUrl.value || this.gallery().includes(url)) {
      this.photoError.set('Esa foto ya está en el producto.');
      return;
    }
    if (!hayLugarEnLaGaleria(this.gallery().length)) {
      this.photoError.set(mensajeDeGaleriaLlena());
      return;
    }
    this.gallery.update((items) => [...items, url]);
  }
  /**
   * Trae el snapshot actual y rellena el formulario. Si la consulta responde sin el producto, dice que ya no existe;
   * si falla, usa los datos que ya tenía el panel con un aviso o, si no los tenía, avisa del fallo (PBI-0256).
   */
  private async edit(id: string) {
    this.loadingProduct.set(true);
    this.missing.set(false);
    this.sinDatos.set(false);
    this.staleNotice.set(null);
    const consultaRespondio = await this.admin.refresh();
    const p = this.admin.products().find((item) => item.id === id);
    const estado = estadoDeLaEdicion({ consultaRespondio, registroEncontrado: !!p });
    if (estado === 'desactualizada') {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    this.missing.set(estado === 'no-existe');
    this.sinDatos.set(estado === 'sin-datos');
    this.base = p ?? null;
    if (p) {
      this.fill(p);
      this.borrador.aplicar();
    }
    this.loadingProduct.set(false);
  }
  /** «Reintentar» del aviso de PBI-0256: vuelve a pedir el snapshot. */
  protected reintentar() {
    const id = this.editingId();
    if (id) void this.edit(id);
  }
  private fill(p: Producto) {
    this.marcaActual.set(p.brandId);
    this.gallery.set(p.gallery ?? []);
    this.photoError.set(null);
    this.imageError.set(null);
    this.ponerCaracteristicas(filasDeCaracteristicas(p.highlights));
    this.form.setValue({
      name: p.name,
      sku: p.sku,
      description: p.description,
      imageUrl: p.imageUrl,
      thumbnailUrl: p.thumbnailUrl,
      highlights: filasDeCaracteristicas(p.highlights),
      price: p.price,
      categoryId: p.categoryId,
      brandId: p.brandId,
      active: p.active,
      featured: p.featured ?? false,
    });
  }
  /**
   * Guarda el producto. «Guardar» vuelve al listado; «Guardar y continuar» (`continuar`, solo al crear) abre el
   * producto creado en «Editar» para seguir completándolo, con los filtros del listado (lote 44, PBI-0268).
   */
  protected async save(continuar = false) {
    if (this.admin.saving()) return;
    // Crear y editar piden `products.manage` (la ruta lo exige); la rama de «solo la ficha» se quitó (PBI-0158).
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const parsed = {
      ...value,
      highlights: caracteristicasDeLasFilas(value.highlights),
      // PBI-0214 (lote 24): la miniatura es la que se generó con la imagen; una guardada antes se conserva.
      thumbnailUrl: value.thumbnailUrl,
      gallery: this.gallery(),
    };
    // PBI-0226 (lote 23): la ficha no cambia el stock; conserva el del producto, y uno nuevo empieza sin stock.
    const editado = productoDeLaFicha<Producto>(this.base, {
      id: this.editingId() ?? this.idNuevo,
      ...parsed,
    });
    // PBI-0129: SKU y dirección de ficha únicos, comprobados antes de enviar (el BFF los vuelve a comprobar).
    // Un choque que ya existía antes de editar (datos anteriores) no bloquea: solo se revisa lo que cambió.
    const repetido = motivoDeProductoRepetido(this.admin.products(), editado);
    const base = this.base;
    const yaChocaba =
      base &&
      (repetido?.campo === 'sku'
        ? base.sku.trim().toLowerCase() === editado.sku.trim().toLowerCase()
        : slugDe(base.name) === slugDe(editado.name));
    if (repetido && !yaChocaba) {
      const campo = this.form.controls[repetido.campo];
      campo.setErrors({ repetido: repetido.mensaje });
      campo.markAsTouched();
      return;
    }
    this.saveError.set(null);
    this.continuando.set(continuar);
    const saved = await this.admin.guardarProducto(this.base, editado);
    this.continuando.set(false);
    if (saved) {
      // Lote 44 (PBI-0265 y PBI-0268): tras crear con «Guardar», `nuevo` lleva al listado a la página del registro.
      await this.router.navigate(continuar ? ['/productos', editado.id] : ['/productos'], {
        queryParams: parametrosAlVolverDelRegistro({ creado: !this.editingId(), continuar, id: editado.id }),
        queryParamsHandling: 'merge',
      });
      return;
    }
    this.saveError.set(this.admin.tomarError() ?? 'No pudimos guardar el producto. Inténtalo de nuevo.');
  }
}
