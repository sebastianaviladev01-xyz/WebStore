import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TiendaFacade } from '../application/tienda.facade';
import { SesionFacade } from '../../sesion/application/sesion.facade';

const MAX_GALLERY_PHOTOS = 6;
const MAX_PHOTO_BYTES = 400 * 1024;

@Component({
  selector: 'ws-products-page',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-ink">Productos</h1>
        <p class="mt-3 text-sm text-muted">
          Ficha comercial, imágenes, características y stock compartido con el storefront.
        </p>
      </div>
      @if (session.can('products.manage')) {
        <button
          class="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
          (click)="newItem()"
        >
          Nuevo producto
        </button>
      }
    </div>
    <div class="mt-7 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <section class="admin-card overflow-hidden">
        <div
          class="grid grid-cols-[1fr_120px_110px_90px] bg-subtle p-4 text-xs font-semibold uppercase text-muted"
        >
          <span>Producto</span>
          <span>Precio</span>
          <span>Stock</span>
          <span></span>
        </div>
        @for (p of admin.products(); track p.id) {
          <div class="grid grid-cols-[1fr_120px_110px_90px] items-center border-t border-line p-4 text-sm">
            <div class="min-w-0">
              <strong class="block truncate">{{ p.name }}</strong>
              <p class="text-xs text-muted">
                {{ p.sku }} · {{ p.highlights.length }} características · {{ p.gallery.length + 1 }}
                {{ p.gallery.length === 0 ? 'foto' : 'fotos' }}
              </p>
            </div>
            <span>{{ p.price | currency: 'PEN' : 'symbol' : '1.0-0' }}</span>
            <span [class.text-danger]="p.stock === 0" class="font-semibold">{{ p.stock }}</span>
            <div class="flex gap-2">
              <button class="font-semibold text-link" (click)="edit(p.id)">Editar</button>
              @if (session.can('products.manage')) {
                <button
                  class="min-h-10 font-semibold text-danger"
                  [attr.aria-label]="'Eliminar producto ' + p.name"
                  (click)="remove(p.id)"
                >
                  Eliminar
                </button>
              }
            </div>
          </div>
        }
      </section>
      <form [formGroup]="form" (ngSubmit)="save()" class="admin-card h-fit p-6">
        <h2 class="text-xl font-semibold">{{ editingId() ? 'Editar' : 'Nuevo' }} producto</h2>
        @if (!editingId() && !session.can('products.manage')) {
          <p class="mt-2 text-sm text-muted">
            Elige un producto de la lista para actualizar su ficha o su stock.
          </p>
        }
        <div class="mt-5 grid gap-3">
          <mat-form-field>
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>SKU</mat-label>
            <input matInput formControlName="sku" [readonly]="!session.can('products.manage')" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Descripción</mat-label>
            <textarea matInput rows="3" formControlName="description"></textarea>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Imagen principal</mat-label>
            <input matInput formControlName="imageUrl" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Miniatura optimizada</mat-label>
            <input matInput formControlName="thumbnailUrl" />
            <mat-hint>Opcional. Si la dejas vacía se usa la imagen principal.</mat-hint>
          </mat-form-field>
          <fieldset class="rounded-xl border border-line p-4">
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
              <mat-form-field class="flex-1" subscriptSizing="dynamic">
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
              @for (b of admin.brands(); track b.id) {
                <mat-option [value]="b.id">{{ b.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-checkbox formControlName="active">Activo</mat-checkbox>
        </div>
        <button
          class="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
          type="submit"
        >
          Guardar producto
        </button>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly session = inject(SesionFacade);
  protected readonly editingId = signal<string | null>(null);
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
    // En la demo la foto viaja como Data URL dentro del snapshot (límite del BFF: 2 MB por guardado).
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      this.photoError.set('Usa una imagen PNG, JPG o WebP.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.photoError.set('La foto supera 400 KB. Optimízala o usa una URL.');
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') this.addPhoto(reader.result);
    });
    reader.readAsDataURL(file);
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
  // resetForm (no form.reset) limpia también el estado "enviado", para que el formulario vacío no aparezca con errores.
  private readonly formDirective = viewChild.required(FormGroupDirective);
  protected newItem() {
    this.editingId.set(null);
    this.gallery.set([]);
    this.photoError.set(null);
    this.photoUrl.setValue('');
    this.formDirective().resetForm({
      name: '',
      sku: '',
      description: '',
      imageUrl: '',
      thumbnailUrl: '',
      highlights: '',
      price: 0,
      stock: 0,
      categoryId: '',
      brandId: '',
      active: true,
    });
  }
  protected edit(id: string) {
    const p = this.admin.products().find((item) => item.id === id);
    if (!p) return;
    this.editingId.set(id);
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
    const saved = await this.admin.upsertProduct({ id: this.editingId() ?? crypto.randomUUID(), ...safe });
    if (saved) this.newItem();
  }
  protected async remove(id: string) {
    if (this.session.can('products.manage') && confirm('¿Eliminar producto?'))
      await this.admin.deleteProduct(id);
  }
}
