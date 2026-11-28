import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

import { TiendaFacade } from '../application/tienda.facade';
import {
  avisoAFormulario,
  avisoDesdeFormulario,
  estadoDelAviso,
  FilaDeAviso,
  motivoDeVigenciaDeAviso,
} from '../domain/aviso.rules';
import { motivoParaNoUsarLogo } from '../domain/foto.rules';
import {
  LUGARES_DE_SUGERIDOS,
  MAXIMOS_DE_CONTENIDO,
  motivoDeCorreo,
  motivoDeDestino,
  motivoDeEnlaceDeAviso,
  motivoDeGrupos,
  motivoDeRed,
  motivoDeTelefono,
} from '../domain/contenido.rules';
import { ConfiguracionTienda, LugarDeSugeridos } from '../domain/tienda.model';
import {
  EJEMPLO_DE_WHATSAPP,
  enlaceDePruebaDeWhatsapp,
  MAXIMO_MENSAJE_DE_WHATSAPP,
  motivoDeMensajeDeWhatsapp,
  motivoDeNumeroDeWhatsapp,
} from '../domain/whatsapp.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { ZONA_HORARIA_LIMA } from '../domain/pedido.rules';
import { conservarBorrador } from './borrador';
import { CampoDeLista, FilaDeLista, ListaContenidoComponent } from './lista-contenido.component';
import { MENSAJE_LOGO_NO_CABE, reducirFoto } from './reducir-foto';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

/** Control de texto vacío con sus validadores. */
const texto = (...validators: ValidatorFn[]) => new FormControl('', { nonNullable: true, validators });

/** Validador a partir de una regla de `contenido.rules.ts`: su motivo, si lo hay. */
const conMotivo =
  (motivo: (valor: string) => string | null): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const aviso = motivo(String(control.value ?? ''));
    return aviso ? { motivo: aviso } : null;
  };

/** Correo o teléfono, con su etiqueta opcional. */
const filaDeContacto = (motivo: (valor: string) => string | null): FilaDeLista =>
  new FormGroup<Record<string, FormControl<string>>>({
    value: texto(conMotivo(motivo)),
    label: texto(Validators.maxLength(MAXIMOS_DE_CONTENIDO.etiqueta)),
  });

/** Filas vacías de cada lista, para «Agregar» y para rellenar el formulario. */
const nuevoCorreo = (): FilaDeLista => filaDeContacto(motivoDeCorreo);
const nuevoTelefono = (): FilaDeLista => filaDeContacto(motivoDeTelefono);
const nuevaRed = (): FilaDeLista =>
  new FormGroup<Record<string, FormControl<string>>>({
    label: texto(Validators.required, Validators.maxLength(MAXIMOS_DE_CONTENIDO.etiqueta)),
    url: texto(conMotivo(motivoDeRed)),
  });
/** Lote 30 (PBI-0244): con las dos fechas, el «Hasta» va después del «Desde»; el motivo sale bajo la fila. */
const vigenciaDeAvisoValida: ValidatorFn = (control) => {
  const fila = (control as FilaDeLista).getRawValue();
  const motivo = motivoDeVigenciaDeAviso(fila['startAt'] ?? '', fila['endAt'] ?? '');
  return motivo ? { motivo } : null;
};
const nuevoAviso = (): FilaDeLista =>
  new FormGroup<Record<string, FormControl<string>>>(
    {
      text: texto(Validators.required, Validators.maxLength(MAXIMOS_DE_CONTENIDO.textoDeAviso)),
      url: texto(conMotivo(motivoDeEnlaceDeAviso)),
      // Lote 30 (PBI-0244): «Desde» y «Hasta», opcionales, con fecha y hora de Lima (`AAAA-MM-DDTHH:mm`).
      startAt: texto(),
      endAt: texto(),
    },
    { validators: vigenciaDeAvisoValida },
  );
const nuevoAcceso = (): FilaDeLista =>
  new FormGroup<Record<string, FormControl<string>>>({
    group: texto(Validators.required, Validators.maxLength(MAXIMOS_DE_CONTENIDO.etiqueta)),
    label: texto(Validators.required, Validators.maxLength(MAXIMOS_DE_CONTENIDO.textoDeAcceso)),
    url: texto(conMotivo(motivoDeDestino)),
  });

/** PBI-0185: el pie admite hasta tres grupos, además de «Productos». */
const gruposDelPieValidos: ValidatorFn = (control) => {
  const filas = (control as FormArray<FilaDeLista>).getRawValue();
  const aviso = motivoDeGrupos(filas.map((fila) => fila['group'] ?? ''));
  return aviso ? { motivo: aviso } : null;
};

@Component({
  selector: 'ws-content-page',
  imports: [
    IconoDirective,
    TituloPaginaDirective,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatRadioModule,
    ListaContenidoComponent,
  ],
  template: `
    <h1 wsAdminTitulo class="text-3xl font-semibold tracking-tight text-ink">Contenido y configuración</h1>
    <p class="mt-3 max-w-3xl text-sm text-muted">
      Edita logo gráfico, información fija, contacto y redes, WhatsApp, avisos de la barra superior,
      navegación lateral, accesos inferiores y páginas predeterminadas. La tipografía permanece bloqueada a
      una sola fuente por acuerdo del MVP.
    </p>

    @if (borrador.aviso(); as aviso) {
      <p class="mt-7 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">{{ aviso }}</p>
    }
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
          <!--
            Lote 50 (ADR-0037, PBI-0289): el logo se carga como las demás imágenes; el campo de la URL se queda
            (Sebastián Avila, 2026-11-27).
          -->
          <p class="mt-1 text-sm leading-6 text-muted">
            Puedes cargar PNG, JPG o WebP de hasta 15 MB: lo reducimos y la tienda lo recibe como las demás
            imágenes. También puedes escribir la dirección de un logo publicado en «URL/Data URL del logo».
          </p>
          <div class="mt-4 flex flex-wrap gap-3">
            <label
              class="inline-flex items-center gap-2 cursor-pointer rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
            >
              <svg wsAdminIcono="cargar"></svg>
              Cargar logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="sr-only"
                (change)="onLogoSelected($event)"
              />
            </label>
            @if (form.controls.logoUrl.value) {
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold"
                (click)="removeLogo()"
              >
                <svg wsAdminIcono="quitar"></svg>
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
          <mat-error>{{ mensaje(form.controls.storeName.errors) }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Inicial de respaldo</mat-label>
          <input matInput formControlName="logoText" maxlength="3" />
          <mat-error>{{ mensaje(form.controls.logoText.errors) }}</mat-error>
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>URL/Data URL del logo</mat-label>
          <textarea matInput rows="2" formControlName="logoUrl"></textarea>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Tipografía</mat-label>
          <input matInput formControlName="fontFamily" readonly />
        </mat-form-field>
        <!-- Lote 15 (ADR-0021), PBI-0169: varios correos, teléfonos y redes; el primero es el principal. -->
        <ws-content-list
          class="contents"
          titulo="Correos de la tienda"
          descripcion="El primero es el principal. La etiqueta es opcional, por ejemplo «Ventas» o «Soporte»."
          vacio="La tienda no muestra ningún correo."
          nombre="correo"
          [lista]="form.controls.contactEmails"
          [campos]="camposDeCorreo"
          [maximo]="maximos.contactEmails"
          [nueva]="nuevoCorreo"
        />
        <ws-content-list
          class="contents"
          titulo="Teléfonos de la tienda"
          descripcion="El primero es el principal. La etiqueta es opcional, por ejemplo «Ventas» o «Soporte»."
          vacio="La tienda no muestra ningún teléfono."
          nombre="teléfono"
          [lista]="form.controls.contactPhones"
          [campos]="camposDeTelefono"
          [maximo]="maximos.contactPhones"
          [nueva]="nuevoTelefono"
        />
        <ws-content-list
          class="contents"
          titulo="Redes sociales"
          descripcion="La tienda las muestra en el pie y en Contacto, y las abre en otra pestaña."
          vacio="La tienda no muestra redes sociales."
          nombre="red"
          [lista]="form.controls.socialLinks"
          [campos]="camposDeRed"
          [maximo]="maximos.socialLinks"
          [nueva]="nuevaRed"
        />
        <!-- Lote 49 (ADR-0035, PBI-0241): el botón de WhatsApp de la tienda. Un campo propio, no el primer teléfono:
             no todo teléfono tiene WhatsApp. Sin número, la tienda no muestra el botón. -->
        <fieldset class="rounded-2xl border border-line p-4 sm:col-span-2">
          <legend class="px-1 text-sm font-semibold">WhatsApp</legend>
          <p id="ws-whatsapp-ayuda" class="text-xs leading-5 text-muted">
            La tienda muestra un botón de WhatsApp abajo a la derecha, en todas las páginas menos el pago, y
            lo abre en otra pestaña. Sin número, no hay botón.
          </p>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Número de WhatsApp</mat-label>
              <input
                matInput
                formControlName="whatsappNumber"
                inputmode="tel"
                autocomplete="off"
                aria-describedby="ws-whatsapp-ayuda"
              />
              <mat-hint>Con el código de país; por ejemplo, {{ ejemploDeWhatsapp }}.</mat-hint>
              <mat-error>{{ mensaje(form.controls.whatsappNumber.errors) }}</mat-error>
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Mensaje inicial</mat-label>
              <textarea matInput rows="2" formControlName="whatsappMessage"></textarea>
              <mat-hint>{{ ayudaDelMensajeDeWhatsapp }}</mat-hint>
              <mat-error>{{ mensaje(form.controls.whatsappMessage.errors) }}</mat-error>
            </mat-form-field>
          </div>
          @if (pruebaDeWhatsapp(); as enlace) {
            <a
              class="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold"
              [href]="enlace"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg wsAdminIcono="enlace"></svg>
              Probar
              <span class="sr-only">el enlace de WhatsApp (se abre en otra pestaña)</span>
            </a>
          }
        </fieldset>
        <!-- PBI-0175: la barra superior de la tienda muestra estos avisos; con varios, pasan uno tras otro. Lote 30
             (PBI-0244): cada uno con «Desde» y «Hasta» opcionales y su estado. -->
        <ws-content-list
          class="contents"
          titulo="Avisos de la barra superior"
          descripcion="Avisos generales para los clientes, como un mantenimiento o una próxima oferta. El enlace es opcional. «Desde» y «Hasta» también: con fecha y hora de Lima, programan cuándo se ve el aviso; sin ellos, se ve siempre. La tienda solo muestra los vigentes y, con varios, uno tras otro."
          vacio="La barra superior no muestra avisos."
          nombre="aviso"
          [lista]="form.controls.announcements"
          [campos]="camposDeAviso"
          [maximo]="maximos.announcements"
          [nueva]="nuevoAviso"
          [estado]="estadoDeAviso"
        />
        <mat-form-field class="sm:col-span-2">
          <mat-label>Texto footer</mat-label>
          <input matInput formControlName="footerText" />
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Orden preferido de categorías laterales</mat-label>
          <input matInput formControlName="sideNavigation" />
        </mat-form-field>
        <!-- PBI-0185: el pie de la tienda sale de estos accesos; cada grupo es una columna. -->
        <ws-content-list
          class="contents"
          titulo="Accesos inferiores"
          descripcion="Las columnas del pie de la tienda, después de «Productos»: hasta tres grupos. Un acceso a una página desactivada no se muestra."
          vacio="El pie solo muestra «Productos»."
          nombre="acceso"
          [lista]="form.controls.quickLinks"
          [campos]="camposDeAcceso"
          [maximo]="maximos.quickLinks"
          [nueva]="nuevoAcceso"
        />
        <mat-form-field class="sm:col-span-2">
          <mat-label>Beneficios (Título|Descripción; ...)</mat-label>
          <textarea matInput rows="3" formControlName="benefits"></textarea>
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Contenido de Contacto</mat-label>
          <textarea matInput rows="4" formControlName="contactContent"></textarea>
          <mat-error>{{ mensaje(form.controls.contactContent.errors) }}</mat-error>
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Contenido de Envíos</mat-label>
          <textarea matInput rows="4" formControlName="shippingContent"></textarea>
          <mat-error>{{ mensaje(form.controls.shippingContent.errors) }}</mat-error>
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Política de privacidad</mat-label>
          <textarea matInput rows="7" formControlName="privacyContent"></textarea>
          <mat-error>{{ mensaje(form.controls.privacyContent.errors) }}</mat-error>
        </mat-form-field>
        <mat-form-field class="sm:col-span-2">
          <mat-label>Términos y condiciones</mat-label>
          <textarea
            matInput
            rows="7"
            formControlName="termsContent"
            aria-describedby="ws-version-terminos"
          ></textarea>
          <mat-error>{{ mensaje(form.controls.termsContent.errors) }}</mat-error>
        </mat-form-field>
        <!-- Lote 17 (ADR-0021, PBI-0177; confirmado por Sebastián Avila): la versión vigente de los términos la numera el BFF. -->
        @if (versionDeTerminos(); as version) {
          <p id="ws-version-terminos" class="-mt-2 text-xs leading-5 text-muted sm:col-span-2">
            {{ version }}
          </p>
        }
      </div>

      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        <mat-checkbox formControlName="contactPageEnabled">Página Contacto</mat-checkbox>
        <mat-checkbox formControlName="shippingPageEnabled">Página Envíos</mat-checkbox>
        <mat-checkbox formControlName="privacyPageEnabled">Política de privacidad</mat-checkbox>
        <mat-checkbox formControlName="termsPageEnabled">Términos y condiciones</mat-checkbox>
      </div>

      <!-- Lote 16 (ADR-0021, PBI-0179; confirmado por Sebastián Avila): dónde muestra la tienda «Producto agregado» con los sugeridos. -->
      <fieldset class="mt-6 rounded-2xl border border-line p-4">
        <legend id="ws-lugar-sugeridos" class="px-1 text-sm font-semibold">
          Productos sugeridos al agregar al carrito
        </legend>
        <p id="ws-lugar-sugeridos-ayuda" class="text-xs leading-5 text-muted">
          Dónde muestra la tienda «Producto agregado», con hasta tres productos de la misma categoría.
        </p>
        <mat-radio-group
          formControlName="addToCartDisplay"
          class="mt-3 grid gap-2 sm:grid-cols-2"
          aria-labelledby="ws-lugar-sugeridos"
          aria-describedby="ws-lugar-sugeridos-ayuda"
        >
          @for (lugar of lugaresDeSugeridos; track lugar.valor) {
            <mat-radio-button [value]="lugar.valor">{{ lugar.etiqueta }}</mat-radio-button>
          }
        </mat-radio-group>
      </fieldset>

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
          class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
          type="submit"
          [disabled]="admin.saving()"
        >
          <svg wsAdminIcono="guardar"></svg>
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
    fontFamily: new FormControl('Source Sans 3 Variable', { nonNullable: true }),
    contactEmails: new FormArray<FilaDeLista>([]),
    contactPhones: new FormArray<FilaDeLista>([]),
    socialLinks: new FormArray<FilaDeLista>([]),
    announcements: new FormArray<FilaDeLista>([]),
    footerText: new FormControl('', { nonNullable: true }),
    sideNavigation: new FormControl('', { nonNullable: true }),
    quickLinks: new FormArray<FilaDeLista>([], { validators: gruposDelPieValidos }),
    benefits: new FormControl('', { nonNullable: true }),
    contactContent: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    shippingContent: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    privacyContent: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    termsContent: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contactPageEnabled: new FormControl(true, { nonNullable: true }),
    shippingPageEnabled: new FormControl(true, { nonNullable: true }),
    privacyPageEnabled: new FormControl(true, { nonNullable: true }),
    termsPageEnabled: new FormControl(true, { nonNullable: true }),
    addToCartDisplay: new FormControl<LugarDeSugeridos>('dialog', { nonNullable: true }),
    // Lote 49 (PBI-0241): el número de WhatsApp (opcional) y el mensaje inicial, con las reglas del BFF.
    whatsappNumber: texto(conMotivo(motivoDeNumeroDeWhatsapp)),
    whatsappMessage: texto(conMotivo(motivoDeMensajeDeWhatsapp)),
  });

  // --- WhatsApp (lote 49, ADR-0035, PBI-0241) ---
  protected readonly ejemploDeWhatsapp = EJEMPLO_DE_WHATSAPP;
  /** En una sola interpolación: un texto partido en varias líneas deja un espacio delante de la ayuda. */
  protected readonly ayudaDelMensajeDeWhatsapp = `Opcional: el cliente lo ve escrito al abrir la conversación. Hasta ${MAXIMO_MENSAJE_DE_WHATSAPP} caracteres.`;
  /**
   * «Probar» abre el enlace que tendrá la tienda, solo con un número válido. Lee el formulario al dibujar, como la vista
   * previa del logo: al rellenarlo con lo que llega del BFF no se emite `valueChanges`.
   */
  protected pruebaDeWhatsapp(): string | null {
    const { whatsappNumber, whatsappMessage } = this.form.controls;
    return enlaceDePruebaDeWhatsapp(whatsappNumber.value, whatsappMessage.value);
  }

  /** La configuración tal como se cargó en el formulario: lo que cambió se calcula contra ella (PBI-0120). */
  private base: ConfiguracionTienda | null = null;
  protected readonly mensaje = mensajeDeError;
  /**
   * La versión vigente de los términos y cuándo se publicó, en la hora de Lima (lote 17, PBI-0177): la numera el BFF al
   * guardar un texto distinto.
   */
  protected readonly versionDeTerminos = computed(() => {
    const config = this.admin.config();
    if (!config?.termsVersion) return null;
    const publicada = config.termsPublishedAt
      ? `, publicada el ${formatDate(config.termsPublishedAt, 'dd/MM/yyyy HH:mm', 'es-PE', ZONA_HORARIA_LIMA)}`
      : ' (anterior al registro de versiones)';
    return `Versión vigente de los términos: ${config.termsVersion}${publicada}. Si cambias el texto y guardas, se publica la versión ${config.termsVersion + 1}: cada pedido guarda la versión que aceptó el comprador.`;
  });
  /** PBI-0151: lo escrito vuelve si la sesión venció a mitad de la edición y se ingresa otra vez. */
  protected readonly borrador = conservarBorrador({
    form: this.form,
    guardar: () => ({ base: this.base, valor: this.form.getRawValue() }),
    restaurar: (borrador) => {
      if (!borrador.base) return false;
      this.base = borrador.base;
      // El borrador ya es el valor del formulario (las fechas de los avisos en hora de Lima): no se convierte.
      this.rellenar(borrador.valor as unknown as ReturnType<ContenidoPage['form']['getRawValue']>);
      return true;
    },
  });
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
      this.cargar(config);
    });
  }

  /**
   * Carga el logo como las demás imágenes (lote 50, ADR-0037, PBI-0289): un PNG, un JPG o un WebP que se reduce y se
   * comprime como la imagen principal del producto (PBI-0119); el BFF lo guarda y la tienda lo recibe por dirección
   * (ADR-0026). Lo que no se puede usar, o no cabe, se rechaza con un motivo.
   */
  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.logoError.set(null);
    if (!file) return;
    const motivo = motivoParaNoUsarLogo(file);
    if (motivo) {
      this.logoError.set(motivo);
      return;
    }
    void reducirFoto(file).then((url) => this.usarLogo(url, MENSAJE_LOGO_NO_CABE));
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

  // --- Listas de Contenido (lote 15, ADR-0021) ---
  protected readonly maximos = MAXIMOS_DE_CONTENIDO;
  protected readonly lugaresDeSugeridos = LUGARES_DE_SUGERIDOS;
  protected readonly camposDeCorreo: readonly CampoDeLista[] = [
    { clave: 'value', etiqueta: 'Correo' },
    { clave: 'label', etiqueta: 'Etiqueta del correo', pista: 'Opcional.' },
  ];
  protected readonly camposDeTelefono: readonly CampoDeLista[] = [
    { clave: 'value', etiqueta: 'Teléfono' },
    { clave: 'label', etiqueta: 'Etiqueta del teléfono', pista: 'Opcional.' },
  ];
  protected readonly camposDeRed: readonly CampoDeLista[] = [
    { clave: 'label', etiqueta: 'Nombre de la red', pista: 'Por ejemplo, Instagram.' },
    { clave: 'url', etiqueta: 'Dirección de la red', pista: 'https://…' },
  ];
  protected readonly camposDeAviso: readonly CampoDeLista[] = [
    { clave: 'text', etiqueta: 'Aviso' },
    { clave: 'url', etiqueta: 'Enlace del aviso', pista: 'Opcional: /catalogo o https://…' },
    // Lote 30 (PBI-0244): la ayuda va en cada fila, porque cada fecha se lee por su cuenta.
    {
      clave: 'startAt',
      etiqueta: 'Desde',
      etiquetaDeFila: (numero) => `Desde (aviso ${numero})`,
      tipo: 'datetime-local',
      pista: 'Opcional. Fecha y hora de Lima.',
      pistaEnCadaFila: true,
    },
    {
      clave: 'endAt',
      etiqueta: 'Hasta',
      etiquetaDeFila: (numero) => `Hasta (aviso ${numero})`,
      tipo: 'datetime-local',
      pista: 'Opcional. Fecha y hora de Lima.',
      pistaEnCadaFila: true,
    },
  ];
  /**
   * Lote 30 (PBI-0244): «Programado», «Vigente» o «Vencido» con lo que hay escrito en la fila, en este momento. La regla
   * recibe el instante; la página lo lee al dibujar la fila.
   */
  protected readonly estadoDeAviso = (fila: FilaDeLista): string | null => {
    const { startAt = '', endAt = '' } = fila.getRawValue();
    return estadoDelAviso(startAt, endAt, Date.now());
  };
  protected readonly camposDeAcceso: readonly CampoDeLista[] = [
    { clave: 'group', etiqueta: 'Grupo', pista: 'La columna, por ejemplo «Ayuda».' },
    { clave: 'label', etiqueta: 'Texto del acceso' },
    { clave: 'url', etiqueta: 'Destino', pista: '/info/envios o https://…' },
  ];
  protected readonly nuevoCorreo = nuevoCorreo;
  protected readonly nuevoTelefono = nuevoTelefono;
  protected readonly nuevaRed = nuevaRed;
  protected readonly nuevoAviso = nuevoAviso;
  protected readonly nuevoAcceso = nuevoAcceso;

  /** Lo que llega del BFF, en el formulario: los avisos con su «Desde» y su «Hasta» en hora de Lima (lote 30). */
  private cargar(config: ConfiguracionTienda): void {
    this.rellenar({
      ...config,
      announcements: (config.announcements ?? []).map(avisoAFormulario),
    } as unknown as ReturnType<ContenidoPage['form']['getRawValue']>);
  }

  /**
   * Rellena el formulario: cada lista recibe tantas filas como elementos y después se copia el valor. Usa las funciones
   * del módulo, no los campos de la clase: el borrador se restaura mientras la clase aún se está construyendo.
   */
  private rellenar(config: ReturnType<ContenidoPage['form']['getRawValue']>): void {
    const listas = [
      [this.form.controls.contactEmails, config.contactEmails, nuevoCorreo],
      [this.form.controls.contactPhones, config.contactPhones, nuevoTelefono],
      [this.form.controls.socialLinks, config.socialLinks, nuevaRed],
      [this.form.controls.announcements, config.announcements, nuevoAviso],
      [this.form.controls.quickLinks, config.quickLinks, nuevoAcceso],
    ] as const;
    // Lote 20 (ADR-0021): las filas que ya había se conservan, vacías y sin tocar, y solo se añaden o quitan las que
    // faltan o sobran. Con filas nuevas en cada carga, el `@for` de la lista (que sigue cada fila por identidad)
    // volvía a crearlas todas y Angular avisaba NG0956.
    for (const [lista, elementos, nueva] of listas) {
      const cuantas = (elementos ?? []).length;
      while (lista.length > cuantas) lista.removeAt(lista.length - 1, { emitEvent: false });
      lista.controls.forEach((fila) => fila.reset(undefined, { emitEvent: false }));
      while (lista.length < cuantas) lista.push(nueva(), { emitEvent: false });
    }
    // Solo los campos del formulario: la configuración trae también los de «Entregas y feriados» y la versión de los
    // términos (lote 17), que esta página no edita.
    const valores = config as unknown as Record<string, unknown>;
    // Lote 49: un campo que no llega (un borrador o un BFF de antes, sin los de WhatsApp) queda con su valor inicial.
    const delFormulario = Object.fromEntries(
      Object.keys(this.form.controls).map((clave) => [
        clave,
        valores[clave] ?? (this.form.get(clave) as FormControl<unknown> | null)?.defaultValue,
      ]),
    );
    this.form.setValue(delFormulario as ReturnType<ContenidoPage['form']['getRawValue']>, {
      emitEvent: false,
    });
  }

  /** Guarda solo lo que cambió (PBI-0120); si falla, lo escrito se queda y el motivo sale junto al botón (PBI-0125). */
  protected async save(): Promise<void> {
    this.saved.set(false);
    this.saveError.set(null);
    const base = this.base;
    if (!base || this.admin.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Lo que esta página no edita (lote 17) se queda como estaba: solo viaja lo que cambió. Lote 30 (PBI-0244): cada
    // aviso vuelve con sus fechas como instantes de Lima; las que no cambiaron conservan el instante guardado.
    const valor = this.form.getRawValue();
    const announcements = valor.announcements.map((fila, indice) =>
      avisoDesdeFormulario(fila as unknown as FilaDeAviso, base.announcements?.[indice]),
    );
    const editado = { ...base, ...valor, announcements } as unknown as ConfiguracionTienda;
    if (!(await this.admin.guardarConfiguracion(base, editado))) {
      this.saveError.set(
        this.admin.tomarError() ?? 'No pudimos guardar la configuración. Inténtalo de nuevo.',
      );
      return;
    }
    this.base = this.admin.config() ?? editado;
    this.form.markAsPristine();
    this.saved.set(true);
  }
}
