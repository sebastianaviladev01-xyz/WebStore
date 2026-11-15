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
import { motivoDeProductoRepetido, slugDe } from '../domain/registro-unico.rules';
import { Producto } from '../domain/tienda.model';
import { SesionFacade } from '../../sesion/application/sesion.facade';
import { BYTES_MAXIMOS_ARCHIVO, MENSAJE_FOTO_NO_CABE, reducirFoto } from './reducir-foto';

const MAX_GALLERY_PHOTOS = 6;

/**
 * Interfaz de registro de un producto (feature 008): `/productos/nuevo` y `/productos/:id`. Es el formulario que
 * antes estaba junto a la lista, con los mismos campos, validaciones, galería y reglas del vendedor. Al editar trae
 * los datos actuales con `refresh()`; al guardar, al cancelar y con «Volver a productos» vuelve al listado con sus
 * filtros y su página (`queryParamsHandling: 'preserve'`).
 */
@Component({
  selector: 'ws-product-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  template: `
    <a class="text-sm font-semibold text-link" routerLink="/productos" queryParamsHandling="preserve">
      ← Volver a productos
    </a>
    <h1 id="titulo-formulario-producto" class="mt-3 text-3xl font-semibold tracking-tight text-ink">
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
    } @else {
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
            @if (form.controls.name.hasError('repetido')) {
              <mat-error>{{ form.controls.name.getError('repetido') }}</mat-error>
            }
          </mat-form-field>
          <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
          <mat-form-field [subscriptSizing]="form.controls.sku.hasError('repetido') ? 'dynamic' : 'fixed'">
            <mat-label>SKU</mat-label>
            <input matInput formControlName="sku" [readonly]="!session.can('products.manage')" />
            @if (form.controls.sku.hasError('repetido')) {
              <mat-error>{{ form.controls.sku.getError('repetido') }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field>
            <mat-label>Descripción</mat-label>
            <textarea matInput rows="3" formControlName="description"></textarea>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Imagen principal</mat-label>
            <input matInput formControlName="imageUrl" />
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Miniatura optimizada</mat-label>
            <input matInput formControlName="thumbnailUrl" />
            <mat-hint>Opcional. Si la dejas vacía se usa la imagen principal.</mat-hint>
          </mat-form-field>
          <fieldset class="min-w-0 rounded-xl border border-line p-4">
            <legend class="px-1 text-sm font-semibold">Galería de fotos</legend>
            <p class="text-xs text-muted">
              La imagen principal va primero; estas fotos se muestran después en la ficha.
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
            <div class="mt-3 flex gap-2">
              <mat-form-field class="min-w-0 flex-1" subscriptSizing="dynamic">
                <mat-label>URL de foto</mat-label>
                <input
                  matInput
                  [formControl]="photoUrl"
                  (keydown.enter)="$event.preventDefault(); addPhotoUrl()"
                />
              </mat-form-field>
              <button
                type="button"
                class="min-h-11 self-start rounded-xl border border-line px-4 text-sm font-semibold"
                (click)="addPhotoUrl()"
              >
                Agregar
              </button>
            </div>
            <label
              class="mt-3 inline-flex cursor-pointer rounded-xl border border-line px-4 py-2.5 text-sm font-semibold"
            >
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
          </mat-form-field>
          <div class="grid grid-cols-2 gap-3">
            <mat-form-field>
              <mat-label>Precio</mat-label>
              <input
                matInput
                type="number"
                formControlName="price"
                [readonly]="!session.can('products.manage')"
              />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Stock</mat-label>
              <input matInput type="number" formControlName="stock" />
            </mat-form-field>
          </div>
          <mat-form-field>
            <mat-label>Categoría</mat-label>
            <mat-select formControlName="categoryId">
              @for (c of admin.categories(); track c.id) {
                <mat-option [value]="c.id">{{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Marca</mat-label>
            <mat-select formControlName="brandId">
              @for (b of marcasElegibles(); track b.id) {
                <mat-option [value]="b.id">{{ b.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-checkbox formControlName="active">Activo</mat-checkbox>
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
            class="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            {{ admin.saving() ? 'Guardando…' : 'Guardar producto' }}
          </button>
          <a
            class="inline-flex min-h-11 items-center rounded-xl border border-line px-5 py-2.5 text-sm font-semibold"
            routerLink="/productos"
            queryParamsHandling="preserve"
          >
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
  protected readonly session = inject(SesionFacade);
  private readonly router = inject(Router);
  /** `:id` de `/productos/:id` (`withComponentInputBinding`); no llega en `/productos/nuevo`. */
  readonly id = input<string>();
  protected readonly editingId = computed(() => this.id() ?? null);
  /** Id del producto nuevo, fijo mientras la página está abierta: un segundo envío no crea otro (PBI-0121). */
  private readonly idNuevo = crypto.randomUUID();
  /** Mientras la edición trae los datos actuales: «Cargando…» en lugar del formulario. */
  protected readonly loadingProduct = signal(false);
  /** El producto en edición ya no está en el snapshot actual: otra persona lo eliminó. */
  protected readonly missing = signal(false);
  /** Aviso si no se pudieron traer los datos actuales y el formulario usa los que había en memoria. */
  protected readonly staleNotice = signal<string | null>(null);
  /** Motivo del último guardado rechazado, junto al botón; el formulario conserva lo escrito. */
  protected readonly saveError = signal<string | null>(null);
  /** El producto tal como se cargó al abrir la edición: lo que cambió la persona se calcula contra él (PBI-0120). */
  private base: Producto | null = null;
  /** Marca del producto al abrirlo: sigue en la lista aunque esté inactiva. */
  private readonly marcaActual = signal<string | null>(null);
  /**
   * PBI-0131 (decisión provisional): una marca inactiva no se ofrece para los productos; solo sigue en la lista la
   * que ya tenía el producto en edición.
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
    stock: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    brandId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    active: new FormControl(true, { nonNullable: true }),
  });
  constructor() {
    // El vendedor no cambia categoría, marca ni estado: se deshabilitan en el control (getRawValue los conserva).
    if (!this.session.can('products.manage')) {
      for (const control of [
        this.form.controls.categoryId,
        this.form.controls.brandId,
        this.form.controls.active,
      ])
        control.disable();
    }
    // Al abrir la edición (o cambiar de `:id` sin salir de la página) se traen los datos actuales.
    effect(() => {
      const id = this.editingId();
      if (id) untracked(() => void this.edit(id));
    });
  }
  /** Fotos adicionales del producto en edición; se guardan junto con el resto del formulario. */
  protected readonly gallery = signal<readonly string[]>([]);
  protected readonly photoUrl = new FormControl('', { nonNullable: true });
  protected readonly photoError = signal<string | null>(null);
  protected addPhotoUrl() {
    const url = this.photoUrl.value.trim();
    if (!url) return;
    this.addPhoto(url);
    this.photoUrl.setValue('');
  }
  protected removePhoto(index: number) {
    this.gallery.update((items) => items.filter((_, i) => i !== index));
  }
  protected onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      this.photoError.set('Usa una imagen PNG, JPG o WebP.');
      return;
    }
    if (file.size > BYTES_MAXIMOS_ARCHIVO) {
      this.photoError.set('La foto pesa más de 15 MB. Usa una más liviana o una URL.');
      return;
    }
    // PBI-0119: la foto viaja como Data URL dentro del producto; se reduce y se comprime antes de agregarla.
    void reducirFoto(file).then((url) => {
      if (url) this.addPhoto(url);
      else this.photoError.set(MENSAJE_FOTO_NO_CABE);
    });
  }
  private addPhoto(url: string) {
    this.photoError.set(null);
    if (url === this.form.controls.imageUrl.value || this.gallery().includes(url)) {
      this.photoError.set('Esa foto ya está en el producto.');
      return;
    }
    if (this.gallery().length >= MAX_GALLERY_PHOTOS) {
      this.photoError.set(`Máximo ${MAX_GALLERY_PHOTOS} fotos adicionales.`);
      return;
    }
    this.gallery.update((items) => [...items, url]);
  }
  /** Trae el snapshot actual y rellena el formulario; si ya no existe, lo dice; si la consulta falla, avisa. */
  private async edit(id: string) {
    this.loadingProduct.set(true);
    this.missing.set(false);
    this.staleNotice.set(null);
    const current = await this.admin.refresh();
    if (!current) {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    const p = this.admin.products().find((item) => item.id === id);
    this.base = p ?? null;
    if (p) this.fill(p);
    else this.missing.set(true);
    this.loadingProduct.set(false);
  }
  private fill(p: Producto) {
    this.marcaActual.set(p.brandId);
    this.gallery.set(p.gallery ?? []);
    this.photoError.set(null);
    this.form.setValue({
      name: p.name,
      sku: p.sku,
      description: p.description,
      imageUrl: p.imageUrl,
      thumbnailUrl: p.thumbnailUrl,
      highlights: p.highlights.join('\n'),
      price: p.price,
      stock: p.stock,
      categoryId: p.categoryId,
      brandId: p.brandId,
      active: p.active,
    });
  }
  protected async save() {
    if (this.admin.saving()) return;
    if (this.form.invalid || (!this.session.can('products.manage') && !this.editingId())) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const old = this.admin.products().find((item) => item.id === this.editingId());
    const parsed = {
      ...value,
      highlights: value.highlights
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      thumbnailUrl: value.thumbnailUrl.trim() || value.imageUrl,
      gallery: this.gallery(),
    };
    const safe =
      !this.session.can('products.manage') && old
        ? {
            ...parsed,
            sku: old.sku,
            price: old.price,
            categoryId: old.categoryId,
            brandId: old.brandId,
            active: old.active,
          }
        : parsed;
    const editado: Producto = { id: this.editingId() ?? this.idNuevo, ...safe };
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
    this.saveError.set(this.admin.error() ?? 'No pudimos guardar el producto. Inténtalo de nuevo.');
  }
}
