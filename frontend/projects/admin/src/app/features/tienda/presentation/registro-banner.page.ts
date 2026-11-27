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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';

import { TiendaFacade } from '../application/tienda.facade';
import {
  aHoraDeLima,
  errorDeBoton,
  ESTILO_POR_OMISION,
  estiloDeBoton,
  ESTILOS_DE_BOTON,
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
import { contadorDeCaracteres, parametrosAlVolverDelRegistro } from '../domain/registro.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { Banner, EstiloDeBoton, ETIQUETAS_UBICACION_BANNER, UbicacionBanner } from '../domain/tienda.model';
import { TonoDeFoto } from '../domain/tono-de-foto.rules';
import { conservarBorrador } from './borrador';
import { imagenDelBanner } from './reducir-foto';
import { DatosRegistroComponent } from './datos-registro.component';
import { EncabezadoRegistroComponent } from './encabezado-registro.component';
import { PieRegistroComponent } from './pie-registro.component';
import { SeccionRegistroComponent } from './seccion-registro.component';
import { IconoDirective } from '../../../shared/ui/icono.directive';
import { SinDatosComponent } from '../../../shared/ui/sin-datos.component';
import { TextoAyudaComponent } from '../../../shared/ui/texto-ayuda.component';

/** Las dos imágenes del banner (lote 24, PBI-0214): la de escritorio, obligatoria, y la del celular, opcional. */
type ImagenDelBanner = 'imageUrl' | 'mobileImageUrl';

/**
 * Interfaz de registro de un banner (lote 21, ADR-0025, PBI-0211): `/banners/nuevo` y `/banners/:id`. Tiene más de
 * tres campos, así que tiene su propia página, como «Nuevo producto». Desde el lote 24 (PBI-0214 y PBI-0221;
 * confirmado por Sebastián Avila), las imágenes se cargan como archivo, el tono de los controles del carrusel se
 * calcula al cargar la de escritorio, los campos tienen nombres y ayudas claras y la vigencia lleva fecha y hora de
 * Lima. Al editar trae los datos actuales con `refresh()`; con «Guardar», «Cancelar» y «Regresar» vuelve al listado con
 * sus filtros y su página (`queryParamsHandling: 'preserve'`). Desde el lote 44 (ADR-0033, PBI-0268) tiene la forma de
 * los formularios del SGC: secciones «Datos generales», «Botones», «Imágenes» y «Vigencia», el estado en la fila de
 * cabecera, el contador bajo el texto de cada botón y, al crear, «Guardar y continuar».
 */
@Component({
  selector: 'ws-banner-form-page',
  imports: [
    DatosRegistroComponent,
    EncabezadoRegistroComponent,
    IconoDirective,
    PieRegistroComponent,
    SeccionRegistroComponent,
    SinDatosComponent,
    TextoAyudaComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <!--
      Lote 44 (ADR-0033, PBI-0268): la forma de los formularios del SGC, con el estado en la fila de cabecera. Cada sección
      agrupa una parte del banner: sus datos, sus botones, sus imágenes y su vigencia.
    -->
    <div class="admin-card grid max-w-4xl gap-6 p-5 sm:p-6">
      <ws-admin-encabezado-registro
        tituloId="titulo-formulario-banner"
        [titulo]="(editing() ? 'Editar' : 'Nuevo') + ' banner'"
        [descripcion]="
          editing()
            ? 'Cambia los textos, los botones, las imágenes o la vigencia del banner.'
            : 'Completa dónde sale el banner, sus textos, sus botones, sus imágenes y su vigencia.'
        "
        listado="/banners"
      />
      @if (loadingBanner()) {
        <p class="border-t border-line pt-5 text-sm text-muted" role="status">Cargando…</p>
      } @else if (missing()) {
        <div class="border-t border-line pt-5" role="alert">
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
          aria-labelledby="titulo-formulario-banner"
        >
          <ws-admin-datos-registro [estado]="form.controls.active" />
          <ws-admin-seccion-registro titulo="Datos generales" icono="datos">
            <mat-form-field>
              <mat-label>Ubicación</mat-label>
              <mat-select formControlName="placement">
                @for (placement of placements; track placement) {
                  <mat-option [value]="placement">{{ placementLabels[placement] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
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
            </div>
            <mat-form-field>
              <mat-label>Descripción</mat-label>
              <textarea matInput rows="3" formControlName="description"></textarea>
              <mat-error>{{ mensaje(form.controls.description.errors) }}</mat-error>
            </mat-form-field>
          </ws-admin-seccion-registro>
          <!--
            PBI-0184: dos botones opcionales, cada uno con su texto y su enlace (los dos o ninguno). Lote 46 (PBI-0266):
            y con su estilo, uno de los cuatro del tema, con una muestra de cada uno en la lista.
          -->
          <ws-admin-seccion-registro titulo="Botones" icono="enlace">
            @for (boton of botones; track boton.texto) {
              <!-- En el celular, uno debajo del otro: en dos columnas, la etiqueta del campo no cabe. -->
              <div class="grid items-start gap-3 sm:grid-cols-2">
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ boton.nombre }}: lo que dice</mat-label>
                  <input matInput [formControlName]="boton.texto" [maxlength]="maximoTextoDeBoton" />
                  <mat-hint>
                    <ws-admin-texto-ayuda>{{ boton.ayuda }}</ws-admin-texto-ayuda>
                  </mat-hint>
                  <!-- Lote 44 (PBI-0268): el contador de caracteres bajo el campo con tope. -->
                  <mat-hint align="end">{{ contador(form.controls[boton.texto].value) }}</mat-hint>
                  <mat-error>{{ mensajeDeBoton(form.controls[boton.texto].errors) }}</mat-error>
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ boton.nombre }}: adónde lleva</mat-label>
                  <input matInput [formControlName]="boton.enlace" />
                  <mat-hint>
                    <ws-admin-texto-ayuda>
                      Una página de la tienda (/catalogo) o una web (https://…), que se abre en otra pestaña.
                    </ws-admin-texto-ayuda>
                  </mat-hint>
                  <mat-error>{{ mensajeDeBoton(form.controls[boton.enlace].errors) }}</mat-error>
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ boton.nombre }}: estilo</mat-label>
                  <mat-select [formControlName]="boton.estilo">
                    @for (estilo of estilos; track estilo.valor) {
                      <mat-option [value]="estilo.valor">
                        <span class="inline-flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            class="inline-block h-4 w-7 shrink-0 rounded"
                            [style.background]="muestras[estilo.valor].fondo"
                            [style.box-shadow]="'inset 0 0 0 1px ' + muestras[estilo.valor].borde"
                          ></span>
                          {{ estilo.nombre }}
                        </span>
                      </mat-option>
                    }
                  </mat-select>
                  <mat-hint>
                    <ws-admin-texto-ayuda>{{ boton.ayudaDelEstilo }}</ws-admin-texto-ayuda>
                  </mat-hint>
                </mat-form-field>
              </div>
            }
          </ws-admin-seccion-registro>
          <!--
            Lote 24 (ADR-0026, PBI-0214; confirmado por Sebastián Avila): las imágenes se cargan como archivo, ya no
            como URL. Una guardada antes se ve y se conserva hasta que se reemplace.
          -->
          <ws-admin-seccion-registro titulo="Imágenes" icono="banners">
            @for (imagen of imagenes; track imagen.campo) {
              <fieldset
                class="min-w-0 rounded-xl border border-line p-4"
                [attr.aria-describedby]="'ayuda-' + imagen.campo"
              >
                <legend class="px-1 text-sm font-semibold">{{ imagen.nombre }}</legend>
                <p [id]="'ayuda-' + imagen.campo" class="text-xs text-muted">
                  <ws-admin-texto-ayuda>{{ imagen.ayuda }}</ws-admin-texto-ayuda>
                </p>
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
                <ws-admin-texto-ayuda>
                  «Completa» muestra la foto entera, para fotos de producto. «Llena todo el espacio» puede
                  recortar los bordes, para fotos de ambiente.
                </ws-admin-texto-ayuda>
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
                <mat-hint>
                  <ws-admin-texto-ayuda>{{ ayudaDelTono() }}</ws-admin-texto-ayuda>
                </mat-hint>
              </mat-form-field>
            }
            @if (form.controls.imageFit.value === 'cover') {
              <mat-form-field>
                <mat-label>Posición vertical de la foto (%)</mat-label>
                <input matInput type="number" min="0" max="100" step="0.5" formControlName="imageFocusY" />
                <mat-error>{{ mensaje(form.controls.imageFocusY.errors) }}</mat-error>
                <mat-hint>
                  <ws-admin-texto-ayuda>
                    0 muestra la parte de arriba y 100 la de abajo. Vacío: 31,5 (como la sala).
                  </ws-admin-texto-ayuda>
                </mat-hint>
              </mat-form-field>
            }
          </ws-admin-seccion-registro>
          <!-- PBI-0221 (lote 24): la vigencia lleva fecha y hora de Lima. En el celular, una debajo de la otra. -->
          <ws-admin-seccion-registro titulo="Vigencia" icono="calendario">
            <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <mat-form-field>
                <mat-label>Inicio</mat-label>
                <input matInput type="datetime-local" formControlName="startAt" />
                <mat-hint>
                  <ws-admin-texto-ayuda>Fecha y hora de Lima.</ws-admin-texto-ayuda>
                </mat-hint>
                <mat-error>{{ mensaje(form.controls.startAt.errors) }}</mat-error>
              </mat-form-field>
              <!-- Con el error, el espacio de abajo crece para que un mensaje largo no tape el campo siguiente. -->
              <mat-form-field
                [subscriptSizing]="form.controls.endAt.hasError('antesDelInicio') ? 'dynamic' : 'fixed'"
              >
                <mat-label>Fin</mat-label>
                <input matInput type="datetime-local" formControlName="endAt" />
                <mat-hint>
                  <ws-admin-texto-ayuda>Fecha y hora de Lima.</ws-admin-texto-ayuda>
                </mat-hint>
                <mat-error>
                  {{
                    form.controls.endAt.hasError('antesDelInicio')
                      ? 'Debe ser igual o posterior al inicio.'
                      : mensaje(form.controls.endAt.errors)
                  }}
                </mat-error>
              </mat-form-field>
            </div>
          </ws-admin-seccion-registro>
          <ws-admin-pie-registro
            listado="/banners"
            [creando]="!editing()"
            [guardando]="admin.saving()"
            [deshabilitado]="preparando() !== null"
            [continuando]="continuando()"
            (continuar)="save(true)"
          >
            @if (error()) {
              <p class="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
                {{ error() }}
              </p>
            }
          </ws-admin-pie-registro>
        </form>
      }
    </div>
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
  /** Lote 44 (PBI-0268): el contador bajo el texto de cada botón, el único campo del banner con tope. */
  protected contador(texto: string): string {
    return contadorDeCaracteres(texto, MAXIMO_TEXTO_DE_BOTON);
  }
  /**
   * Los dos botones del banner (PBI-0184), cada uno con su texto, su enlace y, desde el lote 46 (PBI-0266), su estilo.
   * Se nombran por su orden: el color ya no depende de cuál es.
   */
  protected readonly botones = [
    {
      nombre: 'Primer botón',
      ayuda: 'Opcional. El texto que ve el comprador.',
      ayudaDelEstilo: 'Los colores del tema activo. Si no lo cambias, «Principal».',
      texto: 'cta',
      enlace: 'ctaUrl',
      estilo: 'ctaStyle',
    },
    {
      nombre: 'Segundo botón',
      ayuda: 'Opcional. El texto que ve el comprador.',
      ayudaDelEstilo: 'Los colores del tema activo. Si no lo cambias, «Secundario».',
      texto: 'secondaryCta',
      enlace: 'secondaryCtaUrl',
      estilo: 'secondaryCtaStyle',
    },
  ] as const;
  /** Los cuatro estilos del tema que puede llevar cada botón (lote 46, PBI-0266). */
  protected readonly estilos = ESTILOS_DE_BOTON;
  /**
   * La muestra de cada estilo en la lista: el relleno y el borde con que la tienda pinta el botón, con los tokens del
   * tema activo (`ws-btn-primary`, `ws-btn-accent`, `ws-btn-contrast` y `ws-btn-outline` de la tienda).
   */
  protected readonly muestras: Readonly<Record<EstiloDeBoton, { fondo: string; borde: string }>> = {
    primary: { fondo: 'var(--ws-primary)', borde: 'var(--ws-primary)' },
    accent: { fondo: 'var(--ws-accent)', borde: 'var(--ws-accent-line)' },
    contrast: { fondo: 'var(--ws-ink)', borde: 'var(--ws-ink)' },
    outline: { fondo: 'transparent', borde: 'var(--ws-link)' },
  };
  /**
   * Las dos imágenes del banner (lote 24, ADR-0026, PBI-0214; confirmado por Sebastián Avila), con el lado y el peso
   * máximos que acepta el BFF. Solo la de escritorio da el tono de los controles del carrusel (PBI-0221): en el
   * celular, los controles van sobre el fondo del texto, no sobre la foto.
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
    ctaStyle: new FormControl<EstiloDeBoton>(ESTILO_POR_OMISION.ctaStyle, { nonNullable: true }),
    secondaryCtaStyle: new FormControl<EstiloDeBoton>(ESTILO_POR_OMISION.secondaryCtaStyle, {
      nonNullable: true,
    }),
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
    // Un borrador de antes del lote 46 no trae los estilos: conservan los del formulario.
    restaurar: (valor) => this.form.setValue({ ...this.form.getRawValue(), ...valor }),
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
      ctaStyle: estiloDeBoton(banner.ctaStyle, ESTILO_POR_OMISION.ctaStyle),
      secondaryCtaStyle: estiloDeBoton(banner.secondaryCtaStyle, ESTILO_POR_OMISION.secondaryCtaStyle),
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

  /** El guardado en curso lo pidió «Guardar y continuar» (lote 44, PBI-0268). */
  protected readonly continuando = signal(false);
  /**
   * Guarda el banner. «Guardar» vuelve al listado; «Guardar y continuar» (`continuar`, solo al crear) abre el registro
   * creado en «Editar» para seguir completándolo, con los filtros del listado (lote 44, PBI-0268).
   */
  protected async save(continuar = false): Promise<void> {
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
    this.continuando.set(continuar);
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
    this.continuando.set(false);
    if (saved) {
      // Lote 44 (PBI-0265 y PBI-0268): tras crear con «Guardar», `nuevo` lleva al listado a la página del registro.
      await this.router.navigate(continuar ? ['/banners', id] : ['/banners'], {
        queryParams: parametrosAlVolverDelRegistro({ creado: !this.editing(), continuar, id: id }),
        queryParamsHandling: 'merge',
      });
      return;
    }
    this.error.set(this.admin.tomarError() ?? 'No pudimos guardar el banner. Inténtalo de nuevo.');
  }
}
