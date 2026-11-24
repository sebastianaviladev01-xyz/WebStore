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
import {
  errorDeBoton,
  finAntesDelInicio,
  finDelDiaEnLima,
  heroesQueCoinciden,
  inicioDelDiaEnLima,
  MAXIMO_HEROES_ACTIVOS,
  MAXIMO_TEXTO_DE_BOTON,
} from '../domain/banner.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { Banner, ETIQUETAS_UBICACION_BANNER, UbicacionBanner } from '../domain/tienda.model';
import { conservarBorrador } from './borrador';

/**
 * Interfaz de registro de un banner (lote 21, ADR-0025, PBI-0211): `/banners/nuevo` y `/banners/:id`. Tiene más de
 * tres campos, así que tiene su propia página, como «Nuevo producto». Es el formulario que antes estaba al costado de
 * la lista, con los mismos campos y validaciones (los rediseña el lote 24). Al editar trae los datos actuales con
 * `refresh()`; al guardar, al cancelar y con «Volver a banners» vuelve al listado con sus filtros y su página
 * (`queryParamsHandling: 'preserve'`).
 */
@Component({
  selector: 'ws-banner-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <a class="text-sm font-semibold text-link" routerLink="/banners" queryParamsHandling="preserve">
      ← Volver a banners
    </a>
    <h1 id="titulo-formulario-banner" class="mt-3 text-3xl font-semibold tracking-tight text-ink">
      {{ editing() ? 'Editar' : 'Nuevo' }} banner
    </h1>
    @if (loadingBanner()) {
      <p class="admin-card mt-7 max-w-2xl p-6 text-sm text-muted" role="status">Cargando…</p>
    } @else if (missing()) {
      <div class="admin-card mt-7 max-w-2xl p-6" role="alert">
        <p class="font-semibold">Este banner ya no existe</p>
        <p class="mt-2 text-sm text-muted">
          Otra persona lo eliminó. Vuelve al listado para ver los banners actuales.
        </p>
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
        aria-labelledby="titulo-formulario-banner"
      >
        <div class="grid gap-3">
          <mat-form-field>
            <mat-label>Ubicación</mat-label>
            <mat-select formControlName="placement">
              @for (placement of placements; track placement) {
                <mat-option [value]="placement">{{ placementLabels[placement] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Antetítulo</mat-label>
            <input matInput formControlName="eyebrow" />
            <mat-error>{{ mensaje(form.controls.eyebrow.errors) }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Título</mat-label>
            <input matInput formControlName="title" />
            <mat-error>{{ mensaje(form.controls.title.errors) }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Descripción</mat-label>
            <textarea matInput rows="3" formControlName="description"></textarea>
            <mat-error>{{ mensaje(form.controls.description.errors) }}</mat-error>
          </mat-form-field>
          <!-- PBI-0184: dos botones opcionales, cada uno con su texto y su enlace (los dos o ninguno). -->
          @for (boton of botones; track boton.texto) {
            <!-- En el celular, uno debajo del otro: en dos columnas, la etiqueta del campo no cabe. -->
            <div class="grid items-start gap-3 sm:grid-cols-2">
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{ boton.nombre }}: texto</mat-label>
                <input matInput [formControlName]="boton.texto" [maxlength]="maximoTextoDeBoton" />
                <mat-hint>{{ boton.paleta }}</mat-hint>
                <mat-error>{{ mensajeDeBoton(form.controls[boton.texto].errors) }}</mat-error>
              </mat-form-field>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{ boton.nombre }}: enlace</mat-label>
                <input matInput [formControlName]="boton.enlace" />
                <mat-hint>/catalogo o https://…</mat-hint>
                <mat-error>{{ mensajeDeBoton(form.controls[boton.enlace].errors) }}</mat-error>
              </mat-form-field>
            </div>
          }
          <mat-form-field>
            <mat-label>Imagen desktop</mat-label>
            <input matInput formControlName="imageUrl" />
            <mat-error>{{ mensaje(form.controls.imageUrl.errors) }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Presentación de imagen</mat-label>
            <mat-select formControlName="imageFit">
              <mat-option value="contain">Producto completo</mat-option>
              <mat-option value="cover">Fotografía de ambiente</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Tono de la foto</mat-label>
            <mat-select formControlName="imageTone">
              <mat-option value="light">Clara (controles claros)</mat-option>
              <mat-option value="dark">Oscura (controles oscuros)</mat-option>
            </mat-select>
            <mat-hint>Elige "Oscura" si la esquina inferior derecha de la foto es oscura.</mat-hint>
          </mat-form-field>
          @if (form.controls.imageFit.value === 'cover') {
            <mat-form-field>
              <mat-label>Posición vertical de la foto (%)</mat-label>
              <input matInput type="number" min="0" max="100" step="0.5" formControlName="imageFocusY" />
              <mat-error>{{ mensaje(form.controls.imageFocusY.errors) }}</mat-error>
              <mat-hint>0 muestra la parte de arriba y 100 la de abajo. Vacío: 31,5 (como la sala).</mat-hint>
            </mat-form-field>
          }
          <mat-form-field>
            <mat-label>Imagen móvil (opcional)</mat-label>
            <input matInput formControlName="mobileImageUrl" />
          </mat-form-field>
          <div class="grid grid-cols-2 gap-3">
            <mat-form-field>
              <mat-label>Inicio</mat-label>
              <input matInput type="date" formControlName="startAt" />
              <mat-error>{{ mensaje(form.controls.startAt.errors) }}</mat-error>
            </mat-form-field>
            <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
            <mat-form-field
              [subscriptSizing]="form.controls.endAt.hasError('antesDelInicio') ? 'dynamic' : 'fixed'"
            >
              <mat-label>Fin</mat-label>
              <input matInput type="date" formControlName="endAt" />
              <mat-error>
                {{
                  form.controls.endAt.hasError('antesDelInicio')
                    ? 'Debe ser el día del inicio o después.'
                    : mensaje(form.controls.endAt.errors)
                }}
              </mat-error>
            </mat-form-field>
          </div>
          <mat-checkbox formControlName="active">Activo</mat-checkbox>
        </div>
        @if (error()) {
          <p class="mt-3 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {{ error() }}
          </p>
        }
        <div class="mt-5 flex gap-3">
          <button
            class="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            {{ admin.saving() ? 'Guardando…' : 'Guardar' }}
          </button>
          <a
            class="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
            routerLink="/banners"
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
export class RegistroBannerPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly router = inject(Router);
  protected readonly placementLabels = ETIQUETAS_UBICACION_BANNER;
  protected readonly placements = Object.keys(ETIQUETAS_UBICACION_BANNER) as UbicacionBanner[];
  /** `:id` de `/banners/:id` (`withComponentInputBinding`); no llega en `/banners/nuevo`. */
  readonly id = input<string>();
  protected readonly editing = computed(() => this.id() ?? null);
  /** Id del banner nuevo, fijo mientras la página está abierta: un segundo envío no crea otro (PBI-0121). */
  private readonly idNuevo = crypto.randomUUID();
  /** El banner tal como se cargó al abrir la edición: lo que cambió se calcula contra él (PBI-0120). */
  private base: Banner | null = null;
  protected readonly loadingBanner = signal(false);
  protected readonly missing = signal(false);
  protected readonly staleNotice = signal<string | null>(null);
  /** Motivo por el que no se guardó (el tope del hero o el rechazo del BFF), junto al botón. */
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = mensajeDeError;
  protected readonly maximoTextoDeBoton = MAXIMO_TEXTO_DE_BOTON;
  /** Los dos botones del banner (PBI-0184): el principal con la paleta primaria y el secundario con la secundaria. */
  protected readonly botones = [
    {
      nombre: 'Botón principal',
      paleta: 'Opcional. Color principal del tema.',
      texto: 'cta',
      enlace: 'ctaUrl',
    },
    {
      nombre: 'Botón secundario',
      paleta: 'Opcional. Color secundario del tema.',
      texto: 'secondaryCta',
      enlace: 'secondaryCtaUrl',
    },
  ] as const;
  protected readonly form = new FormGroup({
    eyebrow: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    cta: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(MAXIMO_TEXTO_DE_BOTON)],
    }),
    ctaUrl: new FormControl('', { nonNullable: true }),
    secondaryCta: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(MAXIMO_TEXTO_DE_BOTON)],
    }),
    secondaryCtaUrl: new FormControl('', { nonNullable: true }),
    imageUrl: new FormControl('assets/brand/hero.svg', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    imageFit: new FormControl<'cover' | 'contain'>('contain', { nonNullable: true }),
    imageTone: new FormControl<'light' | 'dark'>('light', { nonNullable: true }),
    imageFocusY: new FormControl<number | null>(null, [Validators.min(0), Validators.max(100)]),
    mobileImageUrl: new FormControl('', { nonNullable: true }),
    placement: new FormControl<UbicacionBanner>('hero', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    active: new FormControl(true, { nonNullable: true }),
  });
  /** PBI-0151: lo escrito vuelve si la sesión venció a mitad de la edición; se aplica después de traer el banner. */
  protected readonly borrador = conservarBorrador({
    form: this.form,
    guardar: () => this.form.getRawValue(),
    restaurar: (valor) => this.form.setValue(valor),
    diferido: true,
  });
  constructor() {
    // Al abrir la edición (o cambiar de `:id` sin salir de la página) se traen los datos actuales.
    effect(() => {
      const id = this.editing();
      if (id) untracked(() => void this.edit(id));
      else untracked(() => this.borrador.aplicar());
    });
  }

  /** El error de un campo de botón: lo que le falta o, si no, el mensaje general del campo. */
  protected mensajeDeBoton(errores: Readonly<Record<string, unknown>> | null): string | null {
    if (errores?.['sinEnlace']) return 'Falta el enlace del botón.';
    if (errores?.['sinTexto']) return 'Falta el texto del botón.';
    return mensajeDeError(errores);
  }

  /** Trae el snapshot actual y rellena el formulario; si ya no existe, lo dice; si la consulta falla, avisa. */
  private async edit(id: string) {
    this.loadingBanner.set(true);
    this.missing.set(false);
    this.staleNotice.set(null);
    this.error.set(null);
    const current = await this.admin.refresh();
    if (!current) {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    const banner = this.admin.banners().find((item) => item.id === id);
    this.base = banner ?? null;
    if (banner) {
      this.fill(banner);
      this.borrador.aplicar();
    } else this.missing.set(true);
    this.loadingBanner.set(false);
  }

  private fill(banner: Banner): void {
    this.form.setValue({
      eyebrow: banner.eyebrow,
      title: banner.title,
      description: banner.description,
      cta: banner.cta ?? '',
      ctaUrl: banner.ctaUrl ?? '',
      secondaryCta: banner.secondaryCta ?? '',
      secondaryCtaUrl: banner.secondaryCtaUrl ?? '',
      imageUrl: banner.imageUrl,
      imageFit: banner.imageFit ?? 'contain',
      imageTone: banner.imageTone ?? 'light',
      imageFocusY: banner.imageFocusY ?? null,
      mobileImageUrl: banner.mobileImageUrl,
      placement: banner.placement,
      startAt: banner.startAt.slice(0, 10),
      endAt: banner.endAt.slice(0, 10),
      active: banner.active,
    });
  }

  protected async save(): Promise<void> {
    if (this.admin.saving()) return;
    const value = this.form.getRawValue();
    // PBI-0128: el fin va el mismo día del inicio o después; el error queda en el campo «Fin». Se vuelve a validar
    // primero para quitar el aviso de un intento anterior si ya se corrigió el inicio.
    this.form.controls.endAt.updateValueAndValidity();
    if (finAntesDelInicio(value.startAt, value.endAt)) {
      this.form.controls.endAt.setErrors({ antesDelInicio: true });
      this.form.controls.endAt.markAsTouched();
    }
    // PBI-0184: cada botón va completo o vacío; el error queda en el campo que falta.
    for (const { texto, enlace } of this.botones) {
      this.form.controls[texto].updateValueAndValidity();
      this.form.controls[enlace].updateValueAndValidity();
      const falta = errorDeBoton(value[texto], value[enlace]);
      const campo = this.form.controls[falta === 'sinTexto' ? texto : enlace];
      if (falta) {
        campo.setErrors({ ...campo.errors, [falta]: true });
        campo.markAsTouched();
      }
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const base = this.base;
    const id = this.editing() ?? this.idNuevo;
    // PBI-0128: el tope de banners principales activos solo cuenta los que coinciden en fechas (no los vencidos).
    const coinciden = heroesQueCoinciden(this.admin.banners(), {
      id: base?.id ?? null,
      startAt: value.startAt,
      endAt: value.endAt,
    });
    if (value.active && value.placement === 'hero' && coinciden >= MAXIMO_HEROES_ACTIVOS) {
      this.error.set('Solo pueden existir tres banners activos en el hero principal en las mismas fechas.');
      return;
    }
    this.error.set(null);
    // PBI-0128: un banner que no se cambió de fecha conserva las suyas; uno nuevo o con fechas nuevas, en días de Lima.
    const mismaFecha = (guardada: string | undefined, dia: string) => guardada?.slice(0, 10) === dia;
    const saved = await this.admin.guardarBanner(base, {
      id,
      ...value,
      cta: value.cta.trim(),
      ctaUrl: value.ctaUrl.trim(),
      secondaryCta: value.secondaryCta.trim(),
      secondaryCtaUrl: value.secondaryCtaUrl.trim(),
      startAt:
        mismaFecha(base?.startAt, value.startAt) && base ? base.startAt : inicioDelDiaEnLima(value.startAt),
      endAt: mismaFecha(base?.endAt, value.endAt) && base ? base.endAt : finDelDiaEnLima(value.endAt),
    });
    if (saved) {
      await this.router.navigate(['/banners'], { queryParamsHandling: 'preserve' });
      return;
    }
    this.error.set(this.admin.tomarError() ?? 'No pudimos guardar el banner. Inténtalo de nuevo.');
  }
}
