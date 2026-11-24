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
import { BYTES_MAXIMOS_FOTO } from '../domain/foto.rules';
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
import { mensajeDeError } from '../domain/formulario.rules';
import { ZONA_HORARIA_LIMA } from '../domain/pedido.rules';
import { conservarBorrador } from './borrador';
import { CampoDeLista, FilaDeLista, ListaContenidoComponent } from './lista-contenido.component';
import { BYTES_MAXIMOS_ARCHIVO, MENSAJE_FOTO_NO_CABE, reducirFoto } from './reducir-foto';

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
const nuevoAviso = (): FilaDeLista =>
  new FormGroup<Record<string, FormControl<string>>>({
    text: texto(Validators.required, Validators.maxLength(MAXIMOS_DE_CONTENIDO.textoDeAviso)),
    url: texto(conMotivo(motivoDeEnlaceDeAviso)),
  });
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
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatRadioModule,
    ListaContenidoComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Contenido y configuración</h1>
    <p class="mt-3 max-w-3xl text-sm text-muted">
      Edita logo gráfico, información fija, contacto y redes, avisos de la barra superior, navegación lateral,
      accesos inferiores y páginas predeterminadas. La tipografía permanece bloqueada a una sola fuente por
      acuerdo del MVP.
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
        <!-- PBI-0175: la barra superior de la tienda muestra estos avisos; con varios, pasan uno tras otro. -->
        <ws-content-list
          class="contents"
          titulo="Avisos de la barra superior"
          descripcion="Avisos generales para los clientes, como un mantenimiento o una próxima oferta. El enlace es opcional. Con varios, la tienda los muestra uno tras otro."
          vacio="La barra superior no muestra avisos."
          nombre="aviso"
          [lista]="form.controls.announcements"
          [campos]="camposDeAviso"
          [maximo]="maximos.announcements"
          [nueva]="nuevoAviso"
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
        <!-- Lote 17 (ADR-0021, PBI-0177; provisional): la versión vigente de los términos la numera el BFF. -->
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

      <!-- Lote 16 (ADR-0021, PBI-0179; provisional): dónde muestra la tienda «Producto agregado» con los sugeridos. -->
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
  });

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
      this.cargar(borrador.valor as unknown as ConfiguracionTienda);
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
  ];
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

  /**
   * Rellena el formulario: cada lista recibe tantas filas como elementos y después se copia el valor. Usa las funciones
   * del módulo, no los campos de la clase: el borrador se restaura mientras la clase aún se está construyendo.
   */
  private cargar(config: ConfiguracionTienda): void {
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
    const delFormulario = Object.fromEntries(
      Object.keys(this.form.controls).map((clave) => [clave, valores[clave]]),
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
    // Lo que esta página no edita (lote 17) se queda como estaba: solo viaja lo que cambió.
    const editado = { ...base, ...this.form.getRawValue() } as unknown as ConfiguracionTienda;
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
