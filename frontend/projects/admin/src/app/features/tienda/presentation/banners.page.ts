import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { eliminarRegistro } from '../../../shared/ui/eliminar-registro';
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
import { Banner, UbicacionBanner, ETIQUETAS_UBICACION_BANNER } from '../domain/tienda.model';
import {
  FILTROS_BANNERS_VACIOS,
  filtrarBanners,
  leerFiltrosBanners,
  parametrosDeFiltrosBanners,
} from '../domain/filtro-listado.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { conservarBorrador } from './borrador';
import { filtrosDeListado } from './filtros-de-listado';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { enfocarPrimerCampo } from './enfocar-registro';

@Component({
  selector: 'ws-banners-page',
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Banners y campañas</h1>
    <p class="mt-3 max-w-3xl text-sm leading-6 text-muted">
      Administra hero, promociones y banners secundarios. La tienda publica como máximo tres banners activos
      en el carrusel principal.
    </p>

    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de banners"
      agregarQue="banner"
      (agregar)="nuevo()"
      [formGroup]="filtros.borrador"
      [buscando]="filtros.buscando()"
      [error]="filtros.error()"
      (buscar)="filtros.buscar()"
      (limpiar)="filtros.limpiar()"
    >
      <mat-form-field>
        <mat-label>Buscar banner</mat-label>
        <input matInput formControlName="texto" />
        <mat-hint>Por título</mat-hint>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Filtrar por estado</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="todos">Todos</mat-option>
          <mat-option value="activos">Activos</mat-option>
          <mat-option value="inactivos">Inactivos</mat-option>
        </mat-select>
      </mat-form-field>
    </ws-filter-panel>
    @if (borrador.aviso(); as aviso) {
      <p class="mt-6 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">{{ aviso }}</p>
    }

    <div class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
      <section class="admin-card overflow-hidden" aria-label="Lista de banners">
        @for (banner of pagina().items; track banner.id) {
          <article class="grid gap-4 border-b border-line p-5 sm:grid-cols-[110px_1fr_auto] sm:items-center">
            <div class="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-subtle p-3">
              <!-- Miniatura: la versión de celular pesa menos que la de escritorio. -->
              <img
                [src]="banner.mobileImageUrl || banner.imageUrl || 'assets/brand/hero.svg'"
                [alt]="banner.title"
                class="h-full w-full object-contain"
              />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <strong>{{ banner.title }}</strong>
                <span class="rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-on-primary-soft">
                  {{ placementLabels[banner.placement] }}
                </span>
              </div>
              <p class="mt-1 text-xs text-muted">
                {{ banner.startAt.slice(0, 10) }} → {{ banner.endAt.slice(0, 10) }} ·
                {{ banner.active ? 'Activo' : 'Inactivo' }}
              </p>
            </div>
            <div class="flex gap-3 text-sm font-semibold">
              <button
                type="button"
                class="text-link"
                [attr.aria-label]="'Editar banner ' + banner.title"
                (click)="edit(banner.id)"
              >
                Editar
              </button>
              <button
                type="button"
                class="text-danger"
                [attr.aria-label]="'Eliminar banner ' + banner.title"
                (click)="remove(banner.id)"
              >
                Eliminar
              </button>
            </div>
          </article>
        } @empty {
          <p class="p-8 text-center text-sm text-muted">
            {{
              admin.banners().length
                ? 'Ningún banner cumple los filtros.'
                : 'Aún no hay banners configurados.'
            }}
          </p>
        }
        <ws-pagination
          [pagina]="pagina()"
          etiqueta="Páginas de banners"
          (cambiar)="filtros.irAPagina($event)"
        />
      </section>

      <form #registro="ngForm" [formGroup]="form" (ngSubmit)="save()" class="admin-card p-6">
        <h2 class="text-xl font-semibold">{{ editing() ? 'Editar banner' : 'Nuevo banner' }}</h2>
        <div class="mt-5 grid gap-3">
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
          @if (editing()) {
            <button
              type="button"
              class="rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
              (click)="reset()"
            >
              Cancelar
            </button>
          }
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannersPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly placementLabels = ETIQUETAS_UBICACION_BANNER;
  protected readonly placements = Object.keys(ETIQUETAS_UBICACION_BANNER) as UbicacionBanner[];
  // Por referencia: el panel de filtros (PBI-0139) también es un FormGroupDirective y va antes en la plantilla.
  private readonly formDirective = viewChild.required<FormGroupDirective>('registro');
  /** El formulario de alta, para llevarle el foco desde «Agregar» (PBI-0171). */
  private readonly formulario = viewChild.required('registro', { read: ElementRef<HTMLFormElement> });
  protected readonly editing = signal<string | null>(null);
  /** El banner tal como se cargó al pulsar «Editar»: lo que cambió se calcula contra él (PBI-0120). */
  private base: Banner | null = null;
  /** Id del banner nuevo; cambia al empezar otro, para que un segundo envío no cree otro (PBI-0121). */
  private idNuevo = crypto.randomUUID();
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
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosBanners,
    escribir: parametrosDeFiltrosBanners,
    vacios: FILTROS_BANNERS_VACIOS,
    que: 'los banners',
  });
  protected readonly pagina = computed(() =>
    this.filtros.paginar(filtrarBanners(this.admin.banners(), this.filtros.aplicados())),
  );
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
  /** PBI-0151: lo escrito vuelve si la sesión venció a mitad de la edición y se ingresa otra vez. */
  protected readonly borrador = conservarBorrador({
    form: this.form,
    guardar: () => ({ base: this.base, idNuevo: this.idNuevo, valor: this.form.getRawValue() }),
    restaurar: (borrador) => {
      this.base = borrador.base;
      this.idNuevo = borrador.idNuevo;
      this.editing.set(borrador.base?.id ?? null);
      this.form.setValue(borrador.valor);
    },
  });

  /** El error de un campo de botón: lo que le falta o, si no, el mensaje general del campo. */
  protected mensajeDeBoton(errores: Readonly<Record<string, unknown>> | null): string | null {
    if (errores?.['sinEnlace']) return 'Falta el enlace del botón.';
    if (errores?.['sinTexto']) return 'Falta el texto del botón.';
    return mensajeDeError(errores);
  }

  protected edit(id: string): void {
    const banner = this.admin.banners().find((item) => item.id === id);
    if (!banner) return;
    this.base = banner;
    this.editing.set(id);
    this.error.set(null);
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
    // PBI-0128: un banner que no se cambió de fecha conserva las suyas; uno nuevo o con fechas nuevas, en días de Lima.
    const mismaFecha = (guardada: string | undefined, dia: string) => guardada?.slice(0, 10) === dia;
    const saved = await this.admin.guardarBanner(base, {
      id: base?.id ?? this.idNuevo,
      ...value,
      cta: value.cta.trim(),
      ctaUrl: value.ctaUrl.trim(),
      secondaryCta: value.secondaryCta.trim(),
      secondaryCtaUrl: value.secondaryCtaUrl.trim(),
      startAt:
        mismaFecha(base?.startAt, value.startAt) && base ? base.startAt : inicioDelDiaEnLima(value.startAt),
      endAt: mismaFecha(base?.endAt, value.endAt) && base ? base.endAt : finDelDiaEnLima(value.endAt),
    });
    if (saved) this.reset();
  }

  /** «Agregar» (PBI-0171): sale de la edición, como «Cancelar», y lleva el foco al formulario de alta. */
  protected nuevo(): void {
    if (this.editing()) this.reset();
    enfocarPrimerCampo(this.formulario().nativeElement);
  }
  protected reset(): void {
    this.editing.set(null);
    this.base = null;
    this.idNuevo = crypto.randomUUID();
    this.error.set(null);
    // resetForm (no form.reset) limpia también el estado "enviado"; si no, el formulario vacío se muestra con errores.
    this.formDirective().resetForm({
      eyebrow: '',
      title: '',
      description: '',
      cta: '',
      ctaUrl: '',
      secondaryCta: '',
      secondaryCtaUrl: '',
      imageUrl: 'assets/brand/hero.svg',
      imageFit: 'contain',
      imageTone: 'light',
      imageFocusY: null,
      mobileImageUrl: '',
      placement: 'hero',
      startAt: '',
      endAt: '',
      active: true,
    });
  }

  /** Si se elimina el banner en edición, el formulario sale de la edición: «Guardar» no lo vuelve a crear (PBI-0122). */
  protected async remove(id: string): Promise<void> {
    await eliminarRegistro({
      pregunta: '¿Eliminar banner?',
      id,
      editando: () => this.editing(),
      eliminar: (idEliminado) => this.admin.eliminarBanner(idEliminado),
      salirDeLaEdicion: () => this.reset(),
    });
  }
}
