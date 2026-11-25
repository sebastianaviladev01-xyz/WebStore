import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { TemasFacade } from '../application/temas.facade';
import {
  EJEMPLO_DE_CODIGO_HEXADECIMAL,
  leerCodigoHexadecimal,
  revisarContraste,
  tokensDelTema,
  validarNombreTema,
} from '../domain/tema.rules';
import { ColoresTema, ParContraste, Tema } from '../domain/tema.model';
import { VistaPreviaTemaComponent } from './vista-previa-tema.component';

/** Lo que recibe el diálogo: el tema propio que se edita (o null para crear uno) y los colores de partida. */
export interface DatosTemaDialog {
  readonly tema: Tema | null;
  readonly coloresIniciales: ColoresTema;
}

/** Resultado al cerrar tras guardar; `undefined` si se canceló. */
export interface ResultadoTemaDialog {
  readonly accion: 'creado' | 'editado';
  readonly nombre: string;
}

type CampoDeColor = keyof ColoresTema;

/** Los cinco colores de un tema, en el orden del contrato, con el nombre que ve la persona y para qué sirven. */
const CAMPOS_DE_COLOR: readonly {
  readonly campo: CampoDeColor;
  readonly etiqueta: string;
  readonly uso: string;
}[] = [
  { campo: 'primary', etiqueta: 'Principal', uso: 'Botones, cabecera y marca.' },
  {
    campo: 'secondary',
    etiqueta: 'Secundario',
    // Lote 28 (PBI-0240, ADR-0028): el secundario rellena los botones secundarios y tiñe el fondo con el puntero encima.
    uso: 'Botones secundarios, ofertas, contador del carrito y fondo de los menús con el puntero encima.',
  },
  { campo: 'background', etiqueta: 'Fondo principal', uso: 'Lienzo de las páginas.' },
  { campo: 'surface', etiqueta: 'Fondo secundario', uso: 'Tarjetas, formularios y cabecera.' },
  { campo: 'contrast', etiqueta: 'Contraste', uso: 'Texto, titulares y pie de página.' },
];

/** Nombre de cada par de texto y fondo, como lo lee la persona (AC-14). */
const NOMBRE_DEL_PAR: Readonly<Record<ParContraste['par'], string>> = {
  'contrast/background': 'Texto sobre el fondo principal',
  'contrast/surface': 'Texto sobre el fondo secundario',
  'muted/background': 'Texto secundario sobre el fondo principal',
  'muted/surface': 'Texto secundario sobre el fondo secundario',
  'onPrimary/primary': 'Texto sobre el color principal',
  'onPrimary/primaryStrong': 'Texto sobre el principal oscuro',
  'onPrimarySoft/primarySoft': 'Texto sobre el principal suave',
  'onAccent/accent': 'Texto sobre el color secundario',
  'link/background': 'Enlaces sobre el fondo principal',
  'link/surface': 'Enlaces sobre el fondo secundario',
  'focusRing/background': 'Contorno de foco sobre el fondo principal',
  'focusRing/surface': 'Contorno de foco sobre el fondo secundario',
  'footerText/footer': 'Texto del pie de página',
  'onTopbar/topbar': 'Texto de la barra superior',
  'disabledText/disabled': 'Texto deshabilitado',
  'contrast/storeBackground': 'Texto sobre el fondo de la tienda',
  'muted/storeBackground': 'Texto secundario sobre el fondo de la tienda',
  'link/storeBackground': 'Enlaces sobre el fondo de la tienda',
  'focusRing/storeBackground': 'Contorno de foco sobre el fondo de la tienda',
  'borderStrong/surface': 'Contorno de los campos sobre el fondo secundario',
  'onLink/link': 'Texto y marcas sobre el color de los enlaces',
  'danger/background': 'Error sobre el fondo principal',
  'danger/surface': 'Error sobre el fondo secundario',
  'danger/dangerSoft': 'Error sobre su recuadro',
  'warning/background': 'Alerta sobre el fondo principal',
  'warning/surface': 'Alerta sobre el fondo secundario',
  'warning/warningSoft': 'Alerta sobre su recuadro',
  'contrast/accentSoft': 'Texto sobre el secundario suave (con el puntero encima)',
  'muted/accentSoft': 'Texto secundario sobre el secundario suave',
};

/** «Texto sobre el fondo principal: 2.1:1, mínimo 4.5:1», el formato de AC-14. */
const describirPar = ({ par, relacion, minimo }: ParContraste): string =>
  `${NOMBRE_DEL_PAR[par]}: ${relacion.toFixed(1)}:1, mínimo ${minimo}:1`;

const CODIGOS_DEL_NOMBRE = new Set(['INVALID_THEME_NAME', 'THEME_NAME_TAKEN']);

/**
 * Formulario de un tema propio (AC-06 a AC-08, AC-11, AC-14): nombre, cinco selectores de color, vista
 * previa al momento y revisión de contraste con las reglas replicadas del BFF. Un par que bloquea impide
 * guardar; los demás solo avisan. Los errores del BFF se muestran en su campo; si los temas cambiaron
 * mientras tanto (AC-19), la facade ya recargó la lista y el diálogo muestra el aviso sin reintentar.
 */
@Component({
  selector: 'ws-admin-tema-dialog',
  imports: [
    CdkScrollable,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    VistaPreviaTemaComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ datos.tema ? 'Editar tema' : 'Nuevo tema' }}</h2>
    <form class="contents" [formGroup]="formulario" (ngSubmit)="guardar()">
      <!--
        Lote 27 (PBI-0235): el contenido crece en alto hasta lo que deja la ventana (maxHeight al abrirla) y se desplaza
        dentro; los botones quedan a la vista. No es mat-dialog-content, que fija su alto máximo en 65vh sin un token.
      -->
      <div class="ws-tema-dialog-contenido" cdkScrollable>
        @if (aviso()) {
          <div class="mb-4 rounded-lg bg-warning-soft p-3 text-sm text-warning" role="alert">
            {{ aviso() }}
          </div>
        }
        @if (errorGeneral()) {
          <div
            class="mb-4 rounded-lg border border-danger-line bg-danger-soft p-3 text-sm text-danger"
            role="alert"
          >
            {{ errorGeneral() }}
          </div>
        }
        <!-- Lote 25 (PBI-0224): desde lg, la vista previa ocupa más que los colores (7 a 5). -->
        <div
          class="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        >
          <div class="min-w-0">
            <!-- PBI-0237: un error de dos líneas (a 375 px) agranda el espacio de abajo y no tapa «Colores». -->
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Nombre</mat-label>
              <input matInput maxlength="40" autocomplete="off" formControlName="nombre" />
              @if (nombre.errors?.['nombre']; as motivo) {
                <mat-error>{{ motivo }}</mat-error>
              }
            </mat-form-field>
            <fieldset class="mt-1 grid gap-3">
              <legend class="mb-2 text-sm font-semibold text-ink">Colores</legend>
              <!-- Lote 29 (PBI-0239): la ayuda de los campos del código, que la nombran en su descripción. -->
              <p id="tema-colores-ayuda" class="-mt-1 text-xs text-muted">
                Elige cada color en su muestra o escribe su código hexadecimal, como {{ ejemplo }}.
              </p>
              @for (c of campos; track c.campo) {
                <div class="flex items-center gap-3">
                  <input
                    type="color"
                    class="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1"
                    [id]="'tema-color-' + c.campo"
                    [value]="colores()[c.campo]"
                    [attr.aria-describedby]="'tema-color-' + c.campo + '-uso'"
                    [attr.aria-invalid]="errorDeColor()?.campo === c.campo"
                    (input)="cambiarColor(c.campo, $any($event.target).value)"
                  />
                  <div class="min-w-0 flex-1">
                    <label class="block text-sm font-semibold text-ink" [for]="'tema-color-' + c.campo">
                      {{ c.etiqueta }}
                    </label>
                    <p class="text-xs text-muted" [id]="'tema-color-' + c.campo + '-uso'">
                      {{ c.uso }}
                      @if (errorDeColor()?.campo === c.campo) {
                        <span class="block font-semibold text-danger">{{ errorDeColor()?.mensaje }}</span>
                      }
                      @if (erroresDeCodigo()[c.campo]; as motivo) {
                        <span
                          class="block font-semibold text-danger"
                          [id]="'tema-codigo-' + c.campo + '-error'"
                        >
                          {{ motivo }}
                        </span>
                      }
                    </p>
                  </div>
                  <!--
                    Lote 29 (ADR-0027, PBI-0239): donde se leía el código, un campo para escribirlo. Daniel: «yo quiero
                    escribir hexadecimal». Se sincroniza con el selector; uno mal escrito no se aplica y se marca al salir.
                  -->
                  <label class="sr-only" [for]="'tema-codigo-' + c.campo">
                    Código hexadecimal de {{ c.etiqueta }}
                  </label>
                  <input
                    type="text"
                    class="h-11 w-24 shrink-0 rounded-lg border bg-surface px-2 text-sm tabular-nums text-ink"
                    [class.border-line]="!erroresDeCodigo()[c.campo]"
                    [class.border-danger]="!!erroresDeCodigo()[c.campo]"
                    maxlength="9"
                    spellcheck="false"
                    autocomplete="off"
                    [id]="'tema-codigo-' + c.campo"
                    [value]="codigos()[c.campo]"
                    [attr.aria-invalid]="erroresDeCodigo()[c.campo] ? 'true' : null"
                    [attr.aria-describedby]="
                      'tema-colores-ayuda' +
                      (erroresDeCodigo()[c.campo] ? ' tema-codigo-' + c.campo + '-error' : '')
                    "
                    (input)="escribirCodigo(c.campo, $any($event.target).value)"
                    (blur)="confirmarCodigo(c.campo)"
                  />
                </div>
              }
            </fieldset>
            <section class="mt-5" aria-labelledby="tema-contraste-titulo">
              <h3 id="tema-contraste-titulo" class="text-sm font-semibold text-ink">Revisión de contraste</h3>
              <div class="mt-2 grid gap-2" aria-live="polite">
                @if (bloqueos().length) {
                  <div
                    class="rounded-lg border border-danger-line bg-danger-soft p-3 text-sm text-danger"
                    data-contraste="bloqueo"
                  >
                    <p class="font-semibold">No se puede guardar: el color de contraste no se lee bien.</p>
                    <ul class="mt-1 grid gap-0.5">
                      @for (par of bloqueos(); track par.par) {
                        <li>{{ describir(par) }}</li>
                      }
                    </ul>
                  </div>
                }
                @if (avisos().length) {
                  <div class="rounded-lg bg-warning-soft p-3 text-sm text-warning" data-contraste="aviso">
                    <p class="font-semibold">Puedes guardar, pero estos pares no alcanzan su mínimo:</p>
                    <ul class="mt-1 grid gap-0.5">
                      @for (par of avisos(); track par.par) {
                        <li>{{ describir(par) }}</li>
                      }
                    </ul>
                  </div>
                }
                @if (!bloqueos().length && !avisos().length) {
                  <p class="text-sm text-muted" data-contraste="correcto">
                    Todos los pares de texto y fondo alcanzan su mínimo de contraste.
                  </p>
                }
              </div>
            </section>
          </div>
          <div class="min-w-0">
            <h3 class="mb-2 text-sm font-semibold text-ink">Vista previa</h3>
            <ws-admin-vista-previa-tema [tokens]="tokens()" />
            <p class="mt-2 text-xs text-muted">
              Solo cambia aquí. El tema se aplica a la tienda y al Admin cuando lo activas.
            </p>
          </div>
        </div>
      </div>
      <mat-dialog-actions align="end">
        <button
          type="button"
          class="min-h-11 rounded-xl border border-line px-5 text-sm font-semibold hover:bg-subtle"
          mat-dialog-close
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
          [disabled]="bloqueos().length > 0 || temas.guardando()"
        >
          {{ temas.guardando() ? 'Guardando…' : 'Guardar tema' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  // Lote 27 (PBI-0235): lo que daba mat-dialog-content, con sus mismos tokens públicos, salvo el alto máximo de 65vh. En
  // la columna flexible de la ventana, el contenido ocupa lo que dejan el título y los botones y se desplaza dentro.
  styles: `
    .ws-tema-dialog-contenido {
      display: block;
      flex: 1 1 auto;
      min-height: 0;
      box-sizing: border-box;
      margin: 0;
      overflow: auto;
      padding: var(--mat-dialog-with-actions-content-padding, 20px 24px 0);
      color: var(--mat-dialog-supporting-text-color, var(--mat-sys-on-surface-variant));
      font-family: var(--mat-dialog-supporting-text-font, var(--mat-sys-body-medium-font, inherit));
      line-height: var(
        --mat-dialog-supporting-text-line-height,
        var(--mat-sys-body-medium-line-height, 1.5rem)
      );
      font-size: var(--mat-dialog-supporting-text-size, var(--mat-sys-body-medium-size, 1rem));
      font-weight: var(--mat-dialog-supporting-text-weight, var(--mat-sys-body-medium-weight, 400));
      letter-spacing: var(
        --mat-dialog-supporting-text-tracking,
        var(--mat-sys-body-medium-tracking, 0.03125em)
      );
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemaDialog {
  protected readonly datos = inject<DatosTemaDialog>(MAT_DIALOG_DATA);
  protected readonly temas = inject(TemasFacade);
  private readonly ref = inject<MatDialogRef<TemaDialog, ResultadoTemaDialog>>(MatDialogRef);

  protected readonly campos = CAMPOS_DE_COLOR;
  protected readonly ejemplo = EJEMPLO_DE_CODIGO_HEXADECIMAL;
  protected readonly describir = describirPar;
  protected readonly colores = signal<ColoresTema>({ ...this.datos.coloresIniciales });
  /** Lo que se lee en el campo del código de cada color (lote 29, PBI-0239): lo escrito, aunque todavía no valga. */
  protected readonly codigos = signal<Record<CampoDeColor, string>>(
    Object.fromEntries(
      CAMPOS_DE_COLOR.map(({ campo }) => [campo, this.datos.coloresIniciales[campo].toUpperCase()]),
    ) as Record<CampoDeColor, string>,
  );
  /** Motivo de cada código mal escrito; se marca al salir del campo o al guardar. */
  protected readonly erroresDeCodigo = signal<Partial<Record<CampoDeColor, string>>>({});
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly errorDeColor = signal<{ campo: string; mensaje: string } | null>(null);
  protected readonly errorGeneral = signal<string | null>(null);
  /** Aviso de datos desactualizados del último guardado de este diálogo (AC-19). */
  protected readonly aviso = signal<string | null>(null);

  /** Los predefinidos de la lista del BFF: de ellos hereda la escala neutra un tema con su misma base. */
  private readonly predefinidos = computed(
    () => this.temas.temasAdmin()?.themes.filter((tema) => tema.kind === 'predefined') ?? [],
  );
  protected readonly tokens = computed(() => tokensDelTema(this.colores(), this.predefinidos()));
  private readonly pares = computed(() => revisarContraste(this.colores(), this.predefinidos()));
  protected readonly bloqueos = computed(() =>
    this.pares().filter(({ bloquea, relacion, minimo }) => bloquea && relacion < minimo),
  );
  protected readonly avisos = computed(() =>
    this.pares().filter(({ bloquea, relacion, minimo }) => !bloquea && relacion < minimo),
  );

  protected readonly nombre = new FormControl(this.datos.tema?.name ?? '', {
    nonNullable: true,
    validators: (control: AbstractControl<string>) => this.validarNombre(control.value),
  });
  /** Envuelve el nombre para que `ngSubmit` (Intro en el campo) llame a `guardar()` sin envío nativo. */
  protected readonly formulario = new FormGroup({ nombre: this.nombre });

  protected cambiarColor(campo: CampoDeColor, valor: string): void {
    this.colores.update((actuales) => ({ ...actuales, [campo]: valor.toUpperCase() }));
    this.codigos.update((actuales) => ({ ...actuales, [campo]: valor.toUpperCase() }));
    this.quitarErrorDeCodigo(campo);
    if (this.errorDeColor()?.campo === campo) this.errorDeColor.set(null);
  }

  /** Lo escrito en el campo del código: si es un código válido, se aplica al selector, a la vista previa y al contraste. */
  protected escribirCodigo(campo: CampoDeColor, texto: string): void {
    this.codigos.update((actuales) => ({ ...actuales, [campo]: texto }));
    const lectura = leerCodigoHexadecimal(texto);
    if (!lectura.valido) return;
    this.colores.update((actuales) => ({ ...actuales, [campo]: lectura.color }));
    this.quitarErrorDeCodigo(campo);
    if (this.errorDeColor()?.campo === campo) this.errorDeColor.set(null);
  }

  /** Al salir del campo: un código válido se muestra como `#RRGGBB` en mayúsculas; uno inválido, con su motivo. */
  protected confirmarCodigo(campo: CampoDeColor): boolean {
    const lectura = leerCodigoHexadecimal(this.codigos()[campo]);
    if (lectura.valido) {
      this.codigos.update((actuales) => ({ ...actuales, [campo]: lectura.color }));
      return true;
    }
    this.erroresDeCodigo.update((actuales) => ({ ...actuales, [campo]: lectura.mensaje }));
    return false;
  }

  private quitarErrorDeCodigo(campo: CampoDeColor): void {
    if (!this.erroresDeCodigo()[campo]) return;
    this.erroresDeCodigo.update((actuales) => {
      const resto = { ...actuales };
      delete resto[campo];
      return resto;
    });
  }

  protected async guardar(): Promise<void> {
    this.nombre.markAsTouched();
    // Lote 29 (PBI-0239): un código mal escrito no se guarda; se marca y el foco va al primero.
    const invalidos = this.campos.filter(({ campo }) => !this.confirmarCodigo(campo));
    if (invalidos.length) {
      this.host.nativeElement.querySelector<HTMLInputElement>(`#tema-codigo-${invalidos[0].campo}`)?.focus();
      return;
    }
    if (this.nombre.invalid || this.bloqueos().length > 0) return;
    this.errorGeneral.set(null);
    this.errorDeColor.set(null);
    this.aviso.set(null);
    const entrada = { name: this.nombre.value.trim(), colors: this.colores() };
    const guardado = this.datos.tema
      ? await this.temas.editar(this.datos.tema.id, entrada)
      : await this.temas.crear(entrada);
    if (guardado) {
      this.ref.close({ accion: this.datos.tema ? 'editado' : 'creado', nombre: entrada.name });
      return;
    }
    this.mostrarRechazo();
  }

  /**
   * Lleva el rechazo del BFF a su campo. Si los temas cambiaron mientras tanto (AC-19), la facade ya recargó
   * la lista y no reintenta: se muestra su aviso arriba del formulario.
   */
  private mostrarRechazo(): void {
    const regla = this.temas.errorDeRegla();
    if (regla && CODIGOS_DEL_NOMBRE.has(regla.code)) {
      this.nombre.setErrors({ nombre: regla.message });
      return;
    }
    const campo = (regla?.details as { field?: unknown } | undefined)?.field;
    if (regla?.code === 'INVALID_THEME_COLOR' && typeof campo === 'string') {
      this.errorDeColor.set({ campo, mensaje: regla.message });
      return;
    }
    if (this.temas.aviso()) this.aviso.set(this.temas.aviso());
    else this.errorGeneral.set(this.temas.error());
  }

  /** Mismas reglas que el BFF; los nombres existentes no incluyen el del tema que se edita. */
  private validarNombre(valor: string): ValidationErrors | null {
    const existentes = (this.temas.temasAdmin()?.themes ?? [])
      .filter((tema) => tema.id !== this.datos.tema?.id)
      .map((tema) => tema.name);
    const resultado = validarNombreTema(valor, existentes);
    return resultado.valido ? null : { nombre: resultado.mensaje };
  }
}
