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

import { TiendaFacade } from '../application/tienda.facade';
import { estadoDeLaEdicion } from '../domain/edicion.rules';
import { motivoDeProductoRepetido, slugDe } from '../domain/registro-unico.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { hayLugarEnLaGaleria, mensajeDeGaleriaLlena, motivoParaNoUsarFoto } from '../domain/foto.rules';
import { productoDeLaFicha } from '../domain/inventario.rules';
import { conservarBorrador } from './borrador';
import { Producto } from '../domain/tienda.model';
import { MENSAJE_FOTO_DE_GALERIA_NO_CABE, reducirFoto, versionesDelProducto } from './reducir-foto';
import { SelectorCategoriaComponent } from './selector-categoria.component';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

/**
 * Interfaz de registro de un producto (feature 008): `/productos/nuevo` y `/productos/:id`. Es el formulario que
 * antes estaba junto a la lista, con los mismos campos, validaciones, galería y reglas del vendedor. Al editar trae
 * los datos actuales con `refresh()`; al guardar, al cancelar y con «Volver a productos» vuelve al listado con sus
 * filtros y su página (`queryParamsHandling: 'preserve'`).
 */
@Component({
  selector: 'ws-product-form-page',
  imports: [
    IconoDirective,
    TituloPaginaDirective,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    SelectorCategoriaComponent,
  ],
  template: `
    <a
      class="inline-flex items-center gap-2 text-sm font-semibold text-link"
      routerLink="/productos"
      queryParamsHandling="preserve"
    >
      <svg wsAdminIcono="volver"></svg>
      Volver a productos
    </a>
    <h1
      wsAdminTitulo
      id="titulo-formulario-producto"
      class="mt-3 text-3xl font-semibold tracking-tight text-ink"
    >
      {{ editingId() ? 'Editar' : 'Nuevo' }} producto
    </h1>
    @if (loadingProduct()) {
      <p class="admin-card mt-7 max-w-2xl p-6 text-sm text-muted" role="status">Cargando…</p>
    } @else if (missing()) {
      <div class="admin-card mt-7 max-w-2xl p-6" role="alert">
        <p class="font-semibold">Este producto ya no existe</p>
        <p class="mt-2 text-sm text-muted">
          Otra persona lo eliminó. Vuelve al listado para ver los productos actuales.
        </p>
      </div>
    } @else if (sinDatos()) {
      <!-- PBI-0256: la consulta falló y el panel no tenía el producto; no se sabe si existe. -->
      <div class="admin-card mt-7 max-w-2xl p-6" role="alert">
        <p class="font-semibold">No pudimos traer los datos del producto</p>
        <p class="mt-2 text-sm text-muted">El panel no respondió. Vuelve a intentarlo en un momento.</p>
        <button
          class="inline-flex min-h-11 gap-2 items-center mt-5 rounded-xl border border-line px-5 py-2.5 text-sm font-semibold"
          type="button"
          (click)="reintentar()"
        >
          <svg wsAdminIcono="actualizar"></svg>
          Reintentar
        </button>
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
        aria-labelledby="titulo-formulario-producto"
      >
        <div class="grid gap-3">
          <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
          <mat-form-field [subscriptSizing]="form.controls.name.hasError('repetido') ? 'dynamic' : 'fixed'">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
            <mat-error>{{ mensaje(form.controls.name.errors) }}</mat-error>
          </mat-form-field>
          <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
          <mat-form-field [subscriptSizing]="form.controls.sku.hasError('repetido') ? 'dynamic' : 'fixed'">
            <mat-label>SKU</mat-label>
            <input matInput formControlName="sku" />
            <mat-error>{{ mensaje(form.controls.sku.errors) }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Descripción</mat-label>
            <textarea matInput rows="3" formControlName="description"></textarea>
            <mat-error>{{ mensaje(form.controls.description.errors) }}</mat-error>
          </mat-form-field>
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
              Cárgala una sola vez: se guarda una versión para la ficha y una miniatura para los listados.
              PNG, JPG o WebP de hasta 15 MB.
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
              La imagen principal va primero; estas fotos se muestran después en la ficha. PNG, JPG o WebP de
              hasta 15 MB.
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
          <mat-form-field>
            <mat-label>Características (una por línea)</mat-label>
            <textarea matInput rows="4" formControlName="highlights"></textarea>
            <mat-error>{{ mensaje(form.controls.highlights.errors) }}</mat-error>
          </mat-form-field>
          <div class="grid grid-cols-2 gap-3">
            <mat-form-field>
              <mat-label>Precio</mat-label>
              <input matInput type="number" formControlName="price" />
              <mat-error>{{ mensaje(form.controls.price.errors) }}</mat-error>
            </mat-form-field>
            <!--
              Lote 23 (ADR-0025, PBI-0226; provisional): el stock sale del registro y se gestiona solo en Inventario. Un
              producto nuevo empieza sin stock.
            -->
            <p class="self-center pb-5 text-xs text-muted">
              {{ editingId() ? 'El stock se gestiona en' : 'Empieza sin stock: se carga en' }}
              <a class="font-semibold text-link" routerLink="/inventario">Inventario</a>
            </p>
          </div>
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
          <mat-checkbox formControlName="active">Activo</mat-checkbox>
          <!-- Lote 22 (PBI-0215): sin tope; con más de cuatro, el inicio los muestra en un carrusel. -->
          <div>
            <mat-checkbox formControlName="featured" aria-describedby="ayuda-destacado">
              Es destacado
            </mat-checkbox>
            <p id="ayuda-destacado" class="ml-11 text-xs text-muted">
              Sale en «Productos destacados» del inicio si tiene stock. Con más de cuatro, se muestran en un
              carrusel.
            </p>
          </div>
        </div>
        @if (saveError()) {
          <p
            class="mt-5 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
            role="alert"
          >
            {{ saveError() }}
          </p>
        }
        <div class="mt-5 flex flex-wrap gap-3">
          <button
            class="inline-flex items-center gap-2 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving() || preparandoImagen()"
          >
            <svg wsAdminIcono="guardar"></svg>
            {{ admin.saving() ? 'Guardando…' : 'Guardar producto' }}
          </button>
          <a
            class="inline-flex min-h-11 gap-2 items-center rounded-xl border border-line px-5 py-2.5 text-sm font-semibold"
            routerLink="/productos"
            queryParamsHandling="preserve"
          >
            <svg wsAdminIcono="cancelar"></svg>
            Cancelar
          </a>
        </div>
      </form>
    }
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
    highlights: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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
    this.form.setValue({
      name: p.name,
      sku: p.sku,
      description: p.description,
      imageUrl: p.imageUrl,
      thumbnailUrl: p.thumbnailUrl,
      highlights: p.highlights.join('\n'),
      price: p.price,
      categoryId: p.categoryId,
      brandId: p.brandId,
      active: p.active,
      featured: p.featured ?? false,
    });
  }
  protected async save() {
    if (this.admin.saving()) return;
    // Crear y editar piden `products.manage` (la ruta lo exige); la rama de «solo la ficha» se quitó (PBI-0158).
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const parsed = {
      ...value,
      highlights: value.highlights
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
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
    const saved = await this.admin.guardarProducto(this.base, editado);
    if (saved) {
      await this.router.navigate(['/productos'], { queryParamsHandling: 'preserve' });
      return;
    }
    this.saveError.set(this.admin.tomarError() ?? 'No pudimos guardar el producto. Inténtalo de nuevo.');
  }
}
