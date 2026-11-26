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
  aHoraDeLima,
  errorDeBoton,
  finAntesDelInicio,
  heroesQueCoinciden,
  instanteDeLaVigencia,
  MAXIMO_HEROES_ACTIVOS,
  MAXIMO_TEXTO_DE_BOTON,
} from '../domain/banner.rules';
import {
  LADO_IMAGEN_BANNER,
  LADO_IMAGEN_MOVIL_BANNER,
  MAX_CARACTERES_IMAGEN_BANNER,
  MAX_CARACTERES_IMAGEN_MOVIL_BANNER,
  motivoParaNoUsarFoto,
} from '../domain/foto.rules';
import { estadoDeLaEdicion } from '../domain/edicion.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { Banner, ETIQUETAS_UBICACION_BANNER, UbicacionBanner } from '../domain/tienda.model';
import { TonoDeFoto } from '../domain/tono-de-foto.rules';
import { conservarBorrador } from './borrador';
import { imagenDelBanner } from './reducir-foto';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';
import { SinDatosComponent } from '../../../shared/ui/sin-datos.component';

/** Las dos imágenes del banner (lote 24, PBI-0214): la de escritorio, obligatoria, y la del celular, opcional. */
type ImagenDelBanner = 'imageUrl' | 'mobileImageUrl';

/**
 * Interfaz de registro de un banner (lote 21, ADR-0025, PBI-0211): `/banners/nuevo` y `/banners/:id`. Tiene más de
 * tres campos, así que tiene su propia página, como «Nuevo producto». Desde el lote 24 (PBI-0214 y PBI-0221;
 * provisional), las imágenes se cargan como archivo, el tono de los controles del carrusel se calcula al cargar la de
 * escritorio, los campos tienen nombres y ayudas claras y la vigencia lleva fecha y hora de Lima. Al editar trae los
 * datos actuales con `refresh()`; al guardar, al cancelar y con «Volver a banners» vuelve al listado con sus filtros y
 * su página (`queryParamsHandling: 'preserve'`).
 */
@Component({
  selector: 'ws-banner-form-page',
  imports: [
    IconoDirective,
    SinDatosComponent,
    TituloPaginaDirective,
    ReactiveFormsModule,
    RouterLink,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <a
      class="inline-flex items-center gap-2 text-sm font-semibold text-link"
      routerLink="/banners"
      queryParamsHandling="preserve"
    >
      <svg wsAdminIcono="volver"></svg>
      Volver a banners
    </a>
    <h1
      wsAdminTitulo
      id="titulo-formulario-banner"
      class="mt-3 text-3xl font-semibold tracking-tight text-ink"
    >
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
    } @else if (sinDatos()) {
      <!-- PBI-0256: la consulta falló y el panel no tenía el banner; no se sabe si existe. -->
      <ws-admin-sin-datos registro="del banner" (reintentar)="reintentar()" />
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
                <mat-label>{{ boton.nombre }}: lo que dice</mat-label>
                <input matInput [formControlName]="boton.texto" [maxlength]="maximoTextoDeBoton" />
                <mat-hint>{{ boton.ayuda }}</mat-hint>
                <mat-error>{{ mensajeDeBoton(form.controls[boton.texto].errors) }}</mat-error>
              </mat-form-field>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{ boton.nombre }}: adónde lleva</mat-label>
                <input matInput [formControlName]="boton.enlace" />
                <mat-hint>
                  Una página de la tienda (/catalogo) o una web (https://…), que se abre en otra pestaña.
                </mat-hint>
                <mat-error>{{ mensajeDeBoton(form.controls[boton.enlace].errors) }}</mat-error>
              </mat-form-field>
            </div>
          }
          <!--
            Lote 24 (ADR-0026, PBI-0214; provisional): las imágenes se cargan como archivo, ya no como URL. Una guardada
            antes se ve y se conserva hasta que se reemplace.
          -->
          @for (imagen of imagenes; track imagen.campo) {
            <fieldset
              class="min-w-0 rounded-xl border border-line p-4"
              [attr.aria-describedby]="'ayuda-' + imagen.campo"
            >
              <legend class="px-1 text-sm font-semibold">{{ imagen.nombre }}</legend>
              <p [id]="'ayuda-' + imagen.campo" class="text-xs text-muted">{{ imagen.ayuda }}</p>
              @if (form.controls[imagen.campo].value; as actual) {
                <img
                  [src]="actual"
                  [alt]="imagen.nombre + ', la actual'"
                  class="mt-3 max-h-40 max-w-full rounded-lg border border-line bg-subtle object-contain"
                />
              }
              <div class="mt-3 flex flex-wrap gap-2">
                <label
                  class="inline-flex items-center gap-2 cursor-pointer rounded-xl border border-line px-4 py-2.5 text-sm font-semibold"
                >
                  <svg wsAdminIcono="cargar"></svg>
                  {{ form.controls[imagen.campo].value ? 'Reemplazar' : 'Cargar' }} {{ imagen.accion }}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="sr-only"
                    (change)="onImageSelected($event, imagen.campo)"
                  />
                </label>
                @if (imagen.opcional && form.controls[imagen.campo].value) {
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-danger"
                    (click)="quitarImagen(imagen.campo)"
                  >
                    <svg wsAdminIcono="quitar"></svg>
                    Quitar {{ imagen.accion }}
                  </button>
                }
              </div>
              @if (preparando() === imagen.campo) {
                <p class="mt-2 text-xs text-muted" role="status">Preparando la imagen…</p>
              }
              @if (errorDeImagen()[imagen.campo]; as motivo) {
                <p class="mt-2 text-xs font-semibold text-danger" role="alert">{{ motivo }}</p>
              } @else if (form.controls[imagen.campo].touched && form.controls[imagen.campo].invalid) {
                <p class="mt-2 text-xs font-semibold text-danger" role="alert">
                  Carga la {{ imagen.accion }}.
                </p>
              }
            </fieldset>
          }
          <!-- PBI-0221 (lote 24): nombres y ayudas que dicen qué hace cada opción. -->
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Cómo se ajusta la foto</mat-label>
            <mat-select formControlName="imageFit">
              <mat-option value="contain">Completa, con espacio alrededor</mat-option>
              <mat-option value="cover">Llena todo el espacio</mat-option>
            </mat-select>
            <mat-hint>
              «Completa» muestra la foto entera, para fotos de producto. «Llena todo el espacio» puede
              recortar los bordes, para fotos de ambiente.
            </mat-hint>
          </mat-form-field>
          <!-- El tono solo cambia los controles del carrusel del inicio, que llevan los banners principales. -->
          @if (form.controls.placement.value === 'hero') {
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Controles del carrusel sobre la foto</mat-label>
              <mat-select formControlName="imageTone">
                <mat-option value="light">Claros, para fotos claras</mat-option>
                <mat-option value="dark">Oscuros, para fotos oscuras</mat-option>
              </mat-select>
              <mat-hint>{{ ayudaDelTono() }}</mat-hint>
            </mat-form-field>
          }
          @if (form.controls.imageFit.value === 'cover') {
            <mat-form-field>
              <mat-label>Posición vertical de la foto (%)</mat-label>
              <input matInput type="number" min="0" max="100" step="0.5" formControlName="imageFocusY" />
              <mat-error>{{ mensaje(form.controls.imageFocusY.errors) }}</mat-error>
              <mat-hint>0 muestra la parte de arriba y 100 la de abajo. Vacío: 31,5 (como la sala).</mat-hint>
            </mat-form-field>
          }
          <!-- PBI-0221 (lote 24): la vigencia lleva fecha y hora de Lima. En el celular, una debajo de la otra. -->
          <div class="grid gap-3 sm:grid-cols-2">
            <mat-form-field>
              <mat-label>Inicio</mat-label>
              <input matInput type="datetime-local" formControlName="startAt" />
              <mat-hint>Fecha y hora de Lima.</mat-hint>
              <mat-error>{{ mensaje(form.controls.startAt.errors) }}</mat-error>
            </mat-form-field>
            <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
            <mat-form-field
              [subscriptSizing]="form.controls.endAt.hasError('antesDelInicio') ? 'dynamic' : 'fixed'"
            >
              <mat-label>Fin</mat-label>
              <input matInput type="datetime-local" formControlName="endAt" />
              <mat-hint>Fecha y hora de Lima.</mat-hint>
              <mat-error>
                {{
                  form.controls.endAt.hasError('antesDelInicio')
                    ? 'Debe ser igual o posterior al inicio.'
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
            class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving() || preparando() !== null"
          >
            <svg wsAdminIcono="guardar"></svg>
            {{ admin.saving() ? 'Guardando…' : 'Guardar' }}
          </button>
          <a
            class="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
            routerLink="/banners"
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
  /** PBI-0256: la consulta falló y el panel no tenía el banner; se avisa del fallo con «Reintentar». */
  protected readonly sinDatos = signal(false);
  protected readonly staleNotice = signal<string | null>(null);
  /** Motivo por el que no se guardó (el tope del hero o el rechazo del BFF), junto al botón. */
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = mensajeDeError;
  protected readonly maximoTextoDeBoton = MAXIMO_TEXTO_DE_BOTON;
  /** Los dos botones del banner (PBI-0184): el principal con la paleta primaria y el secundario con la secundaria. */
  protected readonly botones = [
    {
      nombre: 'Botón principal',
      ayuda: 'Opcional. El texto que ve el comprador, con el color principal del tema.',
      texto: 'cta',
      enlace: 'ctaUrl',
    },
    {
      nombre: 'Botón secundario',
      ayuda: 'Opcional. El texto que ve el comprador, con el color secundario del tema.',
      texto: 'secondaryCta',
      enlace: 'secondaryCtaUrl',
    },
  ] as const;
  /**
   * Las dos imágenes del banner (lote 24, ADR-0026, PBI-0214; provisional), con el lado y el peso máximos que acepta el
   * BFF. Solo la de escritorio da el tono de los controles del carrusel (PBI-0221): en el celular, los controles van
   * sobre el fondo del texto, no sobre la foto.
   */
  protected readonly imagenes = [
    {
      campo: 'imageUrl',
      nombre: 'Imagen de escritorio',
      accion: 'imagen de escritorio',
      ayuda: 'Se ve en computadoras y tablets. PNG, JPG o WebP de hasta 15 MB; la reducimos para la tienda.',
      opcional: false,
      medidas: { ladoMaximo: LADO_IMAGEN_BANNER, maximo: MAX_CARACTERES_IMAGEN_BANNER },
    },
    {
      campo: 'mobileImageUrl',
      nombre: 'Imagen del celular (opcional)',
      accion: 'imagen del celular',
      ayuda: 'Se ve en pantallas de celular. Sin ella, el celular usa la de escritorio.',
      opcional: true,
      medidas: { ladoMaximo: LADO_IMAGEN_MOVIL_BANNER, maximo: MAX_CARACTERES_IMAGEN_MOVIL_BANNER },
    },
  ] as const;
  /** La imagen que se está preparando (reducir y comprimir), o `null`: mientras tanto, no se guarda. */
  protected readonly preparando = signal<ImagenDelBanner | null>(null);
  protected readonly errorDeImagen = signal<Partial<Record<ImagenDelBanner, string>>>({});
  /** El tono calculado al cargar la imagen de escritorio en esta edición, o `null` si no se cargó ninguna. */
  protected readonly tonoCalculado = signal<TonoDeFoto | null>(null);
  protected readonly ayudaDelTono = computed(() => {
    const tono = this.tonoCalculado();
    if (!tono)
      return 'Se elige solo al cargar la imagen de escritorio, según lo clara u oscura que sea su esquina inferior derecha, donde van los controles. Cámbialo solo si no se leen bien.';
    const esquina = tono === 'dark' ? 'oscura' : 'clara';
    return `Lo elegimos al cargar la imagen: su esquina inferior derecha, donde van los controles, es ${esquina}. Cámbialo solo si no se leen bien.`;
  });
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
    imageUrl: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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

  /**
   * PBI-0214 y PBI-0221 (lote 24): la imagen se reduce y se comprime en el navegador; la de escritorio, además, da el
   * tono de los controles del carrusel, que la persona puede cambiar después.
   */
  protected onImageSelected(event: Event, campo: ImagenDelBanner): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const motivo = motivoParaNoUsarFoto(file);
    this.errorDeImagen.update((errores) => ({ ...errores, [campo]: motivo ?? undefined }));
    if (motivo) return;
    const imagen = this.imagenes.find((candidata) => candidata.campo === campo);
    if (!imagen) return;
    this.preparando.set(campo);
    void imagenDelBanner(file, imagen.medidas).then((resultado) => {
      this.preparando.set(null);
      if (!resultado) {
        this.errorDeImagen.update((errores) => ({
          ...errores,
          [campo]: 'No pudimos preparar la imagen. Usa otra foto.',
        }));
        return;
      }
      this.form.controls[campo].setValue(resultado.imagen);
      this.form.controls[campo].markAsTouched();
      if (campo === 'imageUrl') {
        this.form.controls.imageTone.setValue(resultado.tono);
        this.tonoCalculado.set(resultado.tono);
      }
      this.form.markAsDirty();
    });
  }

  /** La imagen del celular es opcional: sin ella, el celular usa la de escritorio. */
  protected quitarImagen(campo: ImagenDelBanner): void {
    this.form.controls[campo].setValue('');
    this.form.markAsDirty();
  }

  /** El error de un campo de botón: lo que le falta o, si no, el mensaje general del campo. */
  protected mensajeDeBoton(errores: Readonly<Record<string, unknown>> | null): string | null {
    if (errores?.['sinEnlace']) return 'Falta el enlace del botón.';
    if (errores?.['sinTexto']) return 'Falta el texto del botón.';
    return mensajeDeError(errores);
  }

  /**
   * Trae el snapshot actual y rellena el formulario. Si la consulta responde sin el banner, dice que ya no existe; si
   * falla, usa los datos que ya tenía el panel con un aviso o, si no los tenía, avisa del fallo (PBI-0256).
   */
  private async edit(id: string) {
    this.loadingBanner.set(true);
    this.missing.set(false);
    this.sinDatos.set(false);
    this.staleNotice.set(null);
    this.error.set(null);
    const consultaRespondio = await this.admin.refresh();
    const banner = this.admin.banners().find((item) => item.id === id);
    const estado = estadoDeLaEdicion({ consultaRespondio, registroEncontrado: !!banner });
    if (estado === 'desactualizada') {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    this.missing.set(estado === 'no-existe');
    this.sinDatos.set(estado === 'sin-datos');
    this.base = banner ?? null;
    if (banner) {
      this.fill(banner);
      this.borrador.aplicar();
    }
    this.loadingBanner.set(false);
  }
  /** «Reintentar» del aviso de PBI-0256: vuelve a pedir el snapshot. */
  protected reintentar() {
    const id = this.editing();
    if (id) void this.edit(id);
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
      // PBI-0221 (lote 24): en hora de Lima, con la hora.
      startAt: aHoraDeLima(banner.startAt),
      endAt: aHoraDeLima(banner.endAt),
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
    const saved = await this.admin.guardarBanner(base, {
      id,
      ...value,
      cta: value.cta.trim(),
      ctaUrl: value.ctaUrl.trim(),
      secondaryCta: value.secondaryCta.trim(),
      secondaryCtaUrl: value.secondaryCtaUrl.trim(),
      // PBI-0128 y PBI-0221: un extremo que no se cambió conserva el instante guardado; uno nuevo, en hora de Lima.
      startAt: instanteDeLaVigencia(base?.startAt, value.startAt, 'inicio'),
      endAt: instanteDeLaVigencia(base?.endAt, value.endAt, 'fin'),
    });
    if (saved) {
      await this.router.navigate(['/banners'], { queryParamsHandling: 'preserve' });
      return;
    }
    this.error.set(this.admin.tomarError() ?? 'No pudimos guardar el banner. Inténtalo de nuevo.');
  }
}
