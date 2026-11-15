import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { TiendaFacade } from '../application/tienda.facade';
import { BYTES_MAXIMOS_FOTO } from '../domain/foto.rules';
import { ConfiguracionTienda } from '../domain/tienda.model';
import { BYTES_MAXIMOS_ARCHIVO, MENSAJE_FOTO_NO_CABE, reducirFoto } from './reducir-foto';

@Component({
  selector: 'ws-content-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatCheckboxModule],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Contenido y configuración</h1>
    <p class="mt-3 max-w-3xl text-sm text-muted">
      Edita logo gráfico, información fija, navegación superior/lateral, accesos inferiores y páginas
      predeterminadas. La tipografía permanece bloqueada a una sola fuente por acuerdo del MVP.
    </p>

    <form [formGroup]="form" (ngSubmit)="save()" class="admin-card mt-7 p-6">
      <div
        class="mb-6 grid gap-5 rounded-3xl border border-line bg-subtle p-5 md:grid-cols-[180px_1fr] md:items-center"
      >
        <div
          class="grid aspect-square place-items-center overflow-hidden rounded-3xl border border-line bg-surface p-3"
        >
          @if (form.controls.logoUrl.value) {
            <img
              [src]="form.controls.logoUrl.value"
              alt="Vista previa del logo"
              class="h-full w-full object-contain"
            />
          } @else {
            <span
              class="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-3xl font-semibold text-on-primary"
            >
              {{ form.controls.logoText.value || 'W' }}
            </span>
          }
        </div>
        <div>
          <h2 class="text-lg font-semibold">Logo de la tienda</h2>
          <p class="mt-1 text-sm leading-6 text-muted">
            Puedes cargar PNG, JPG, WebP o SVG. En esta demo se guarda como Data URL en el Mock BFF para que
            el Storefront lo consuma de inmediato.
          </p>
          <div class="mt-4 flex flex-wrap gap-3">
            <label
              class="cursor-pointer rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
            >
              Cargar logo
              <input type="file" accept="image/*,.svg" class="sr-only" (change)="onLogoSelected($event)" />
            </label>
            @if (form.controls.logoUrl.value) {
              <button
                type="button"
                class="rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold"
                (click)="removeLogo()"
              >
                Quitar logo
              </button>
            }
          </div>
          @if (logoError()) {
            <p class="mt-3 text-xs font-semibold text-danger" role="alert">{{ logoError() }}</p>
          }
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <mat-form-field>
          <mat-label>Nombre de tienda</mat-label>
          <input matInput formControlName="storeName" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Inicial de respaldo</mat-label>
          <input matInput formControlName="logoText" maxlength="3" />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>URL/Data URL del logo</mat-label>
          <textarea matInput rows="2" formControlName="logoUrl"></textarea>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Tipografía</mat-label>
          <input matInput formControlName="fontFamily" readonly />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Correo de contacto</mat-label>
          <input matInput formControlName="contactEmail" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="contactPhone" />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Mensaje superior</mat-label>
          <input matInput formControlName="headerMessage" />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Texto footer</mat-label>
          <input matInput formControlName="footerText" />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Navegación superior</mat-label>
          <input matInput formControlName="topNavigation" />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Orden preferido de categorías laterales</mat-label>
          <input matInput formControlName="sideNavigation" />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Accesos inferiores</mat-label>
          <input matInput formControlName="quickLinks" />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Beneficios (Título|Descripción; ...)</mat-label>
          <textarea matInput rows="3" formControlName="benefits"></textarea>
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Contenido de Contacto</mat-label>
          <textarea matInput rows="4" formControlName="contactContent"></textarea>
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Contenido de Envíos</mat-label>
          <textarea matInput rows="4" formControlName="shippingContent"></textarea>
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Política de privacidad</mat-label>
          <textarea matInput rows="7" formControlName="privacyContent"></textarea>
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Términos y condiciones</mat-label>
          <textarea matInput rows="7" formControlName="termsContent"></textarea>
        </mat-form-field>
      </div>

      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        <mat-checkbox formControlName="contactPageEnabled">Página Contacto</mat-checkbox>
        <mat-checkbox formControlName="shippingPageEnabled">Página Envíos</mat-checkbox>
        <mat-checkbox formControlName="privacyPageEnabled">Política de privacidad</mat-checkbox>
        <mat-checkbox formControlName="termsPageEnabled">Términos y condiciones</mat-checkbox>
      </div>

      @if (saveError()) {
        <p
          class="mt-6 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
          role="alert"
        >
          {{ saveError() }}
        </p>
      }
      <div class="mt-6 flex flex-wrap items-center gap-4">
        <button
          class="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
          type="submit"
          [disabled]="admin.saving()"
        >
          {{ admin.saving() ? 'Guardando…' : 'Guardar configuración' }}
        </button>
        @if (saved()) {
          <p class="text-sm text-on-primary-soft" role="status">Configuración publicada en la tienda.</p>
        }
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContenidoPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly form = new FormGroup({
    storeName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    logoText: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    logoUrl: new FormControl('', { nonNullable: true }),
    contactEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    contactPhone: new FormControl('', { nonNullable: true }),
    fontFamily: new FormControl('Source Sans 3 Variable', { nonNullable: true }),
    headerMessage: new FormControl('', { nonNullable: true }),
    footerText: new FormControl('', { nonNullable: true }),
    topNavigation: new FormControl('', { nonNullable: true }),
    sideNavigation: new FormControl('', { nonNullable: true }),
    quickLinks: new FormControl('', { nonNullable: true }),
    benefits: new FormControl('', { nonNullable: true }),
    contactContent: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    shippingContent: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    privacyContent: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    termsContent: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contactPageEnabled: new FormControl(true, { nonNullable: true }),
    shippingPageEnabled: new FormControl(true, { nonNullable: true }),
    privacyPageEnabled: new FormControl(true, { nonNullable: true }),
    termsPageEnabled: new FormControl(true, { nonNullable: true }),
  });

  /** La configuración tal como se cargó en el formulario: lo que cambió se calcula contra ella (PBI-0120). */
  private base: ConfiguracionTienda | null = null;
  /** Motivo del último guardado rechazado, junto al botón; el formulario conserva lo escrito (PBI-0125). */
  protected readonly saveError = signal<string | null>(null);
  /** Motivo por el que no se pudo usar el logo elegido. */
  protected readonly logoError = signal<string | null>(null);

  constructor() {
    // PBI-0125: los datos del BFF solo rellenan el formulario mientras la persona no lo editó; «Actualizar» o un
    // guardado fallido no reescriben lo escrito.
    effect(() => {
      const config = this.admin.config();
      if (!config || this.form.dirty) return;
      this.base = config;
      this.form.setValue(config, { emitEvent: false });
    });
  }

  /**
   * Carga el logo como Data URL. Una imagen de mapa de bits se reduce y se comprime como las fotos de los productos
   * (PBI-0119); un SVG se usa tal cual si no pesa más que una foto. Lo que no cabe se rechaza con un motivo.
   */
  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.logoError.set(null);
    if (!file) return;
    const svg = file.type === 'image/svg+xml' || file.name.toLocaleLowerCase().endsWith('.svg');
    if (!file.type.startsWith('image/') && !svg) {
      input.value = '';
      return;
    }
    if (file.size > BYTES_MAXIMOS_ARCHIVO) {
      input.value = '';
      this.logoError.set('El logo pesa más de 15 MB. Usa uno más liviano.');
      return;
    }
    if (!svg) {
      input.value = '';
      void reducirFoto(file).then((url) => this.usarLogo(url, MENSAJE_FOTO_NO_CABE));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      this.usarLogo(
        url.length <= BYTES_MAXIMOS_FOTO ? url : null,
        `El SVG pesa más de ${Math.round(BYTES_MAXIMOS_FOTO / 1024)} KB. Simplifícalo o usa una URL.`,
      );
      input.value = '';
    });
    reader.readAsDataURL(file);
  }

  private usarLogo(url: string | null, motivo: string): void {
    if (!url) {
      this.logoError.set(motivo);
      return;
    }
    this.form.controls.logoUrl.setValue(url);
    this.form.markAsDirty();
  }

  protected removeLogo(): void {
    this.form.controls.logoUrl.setValue('');
    this.form.markAsDirty();
  }

  protected readonly saved = signal(false);

  /** Guarda solo lo que cambió (PBI-0120); si falla, lo escrito se queda y el motivo sale junto al botón (PBI-0125). */
  protected async save(): Promise<void> {
    this.saved.set(false);
    this.saveError.set(null);
    const base = this.base;
    if (this.form.invalid || !base || this.admin.saving()) return;
    const editado = this.form.getRawValue();
    if (!(await this.admin.guardarConfiguracion(base, editado))) {
      this.saveError.set(this.admin.error() ?? 'No pudimos guardar la configuración. Inténtalo de nuevo.');
      return;
    }
    this.base = this.admin.config() ?? editado;
    this.form.markAsPristine();
    this.saved.set(true);
  }
}
