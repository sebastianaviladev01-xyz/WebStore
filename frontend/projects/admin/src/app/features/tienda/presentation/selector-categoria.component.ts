import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { startWith, switchMap } from 'rxjs';

import {
  buscarCategorias,
  MINIMO_PARA_BUSCAR_CATEGORIA,
  opcionesDeCategoria,
  SEPARADOR_DE_RUTA,
} from '../domain/categoria.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { textoBuscable } from '../domain/listado.rules';
import { Categoria } from '../domain/tienda.model';

/**
 * Selección de una categoría con búsqueda (lote 29, ADR-0027, PBI-0238; provisional, por confirmar con Daniel). La usan
 * el filtro «Categoría» de Productos y el campo «Categoría» del registro del producto, en lugar del `mat-select` con las
 * categorías sangradas. Daniel: «es un input select» que busca «en todos los niveles donde esté una categoría», desde
 * «mínimo tres caracteres», y «en tu caso […] limitarlo únicamente a una categoría».
 *
 * - Es un autocompletado de Material (`role="combobox"` con su lista): flechas, Enter, Escape y Tab, como el patrón de
 *   WAI-ARIA. Al enfocarlo, la lista muestra todo el árbol, para elegir sin escribir; desde el tercer carácter (sin
 *   espacios ni tildes) se filtra en todos los niveles y la primera coincidencia queda activa: Enter la elige, también
 *   con la lista cerrada.
 * - Cada opción muestra la ruta («Electrodomésticos › Refrigeradoras › Side by side»), y la elegida se ve en el campo.
 * - `control` guarda el `id` de la categoría, o `''` sin ninguna: solo cambia al elegir o al quitar. Lo escrito sin elegir
 *   se descarta al salir del campo; si se borra todo el texto, se quita la categoría.
 * - Con una categoría elegida, «Quitar la categoría» la vacía; sin ella, una flecha decorativa indica que hay lista.
 * - El error y el asterisco de obligatorio salen de `control` (`mensajeDeError`), como en los demás campos.
 */
@Component({
  selector: 'ws-admin-selector-categoria',
  imports: [MatAutocompleteModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <mat-form-field [floatLabel]="textoSinElegir() ? 'always' : 'auto'">
      <mat-label>{{ etiqueta() }}</mat-label>
      <input
        #entrada
        matInput
        type="text"
        autocomplete="off"
        [formControl]="consulta"
        [matAutocomplete]="lista"
        [required]="requerido()"
        [placeholder]="textoSinElegir() ?? ''"
        [errorStateMatcher]="errores"
        (input)="escribir(entrada.value)"
        (keydown.enter)="pulsarEnter($event)"
        (blur)="salir()"
      />
      @if (hayAlgoQueQuitar()) {
        <button
          matSuffix
          type="button"
          class="mr-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
          [attr.aria-label]="'Quitar la ' + etiqueta().toLocaleLowerCase('es-PE')"
          [disabled]="deshabilitado()"
          (click)="quitar()"
        >
          <svg
            class="h-[18px] w-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      } @else {
        <svg
          matSuffix
          class="mr-3 h-5 w-5 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7 10l5 5 5-5" />
        </svg>
      }
      <mat-autocomplete
        #lista="matAutocomplete"
        [autoActiveFirstOption]="filtrando()"
        [displayWith]="mostrar"
        (optionSelected)="elegir($event.option.value)"
        (closed)="restaurar()"
      >
        @for (opcion of visibles(); track opcion.category.id) {
          <mat-option [value]="opcion.category.id">
            @for (ancestro of opcion.ancestros; track $index) {
              <span>{{ ancestro }}{{ separador }}</span>
            }
            <span class="font-semibold">{{ opcion.category.name }}</span>
          </mat-option>
        } @empty {
          <mat-option disabled>Ninguna categoría coincide</mat-option>
        }
      </mat-autocomplete>
      <mat-hint>Escribe {{ minimo }} caracteres para buscar.</mat-hint>
      <mat-error>{{ mensaje() }}</mat-error>
    </mat-form-field>
  `,
})
export class SelectorCategoriaComponent {
  /** Control del formulario de la página: el `id` de la categoría elegida, o `''` si no hay ninguna. */
  readonly control = input.required<FormControl<string>>();
  readonly categorias = input.required<readonly Categoria[]>();
  readonly etiqueta = input('Categoría');
  /** Texto del campo vacío (en el filtro, «Todas»); sin él, la etiqueta ocupa el campo mientras está vacío. */
  readonly textoSinElegir = input<string | null>(null);

  protected readonly minimo = MINIMO_PARA_BUSCAR_CATEGORIA;
  /** « › », con sus espacios: en la plantilla, el formato los recortaría. */
  protected readonly separador = SEPARADOR_DE_RUTA;
  /** Lo que muestra el campo: el `id` elegido (se ve su ruta, `mostrar`) o lo que se escribe. */
  protected readonly consulta = new FormControl<string | null>(null);
  /** Lo que se escribió desde la última elección; vacío si el campo muestra la categoría elegida. */
  protected readonly escrito = signal('');

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly entrada = viewChild.required<ElementRef<HTMLInputElement>>('entrada');
  private readonly trigger = viewChild.required(MatAutocompleteTrigger);

  protected readonly opciones = computed(() => opcionesDeCategoria(this.categorias()));
  private readonly rutas = computed(
    () => new Map(this.opciones().map((opcion) => [opcion.category.id, opcion.ruta])),
  );
  protected readonly visibles = computed(() => buscarCategorias(this.opciones(), this.escrito()));
  protected readonly filtrando = computed(
    () => textoBuscable(this.escrito()).length >= MINIMO_PARA_BUSCAR_CATEGORIA,
  );

  /** Se vuelve a leer `control` cada vez que cambia su valor, su estado o si se tocó (también desde la página). */
  private readonly version = signal(0);
  private readonly valor = computed(() => (this.version(), this.control().value));
  protected readonly requerido = computed(
    () => (this.version(), this.control().hasValidator(Validators.required)),
  );
  protected readonly deshabilitado = computed(() => (this.version(), this.control().disabled));
  protected readonly mensaje = computed(() => (this.version(), mensajeDeError(this.control().errors)));
  protected readonly hayAlgoQueQuitar = computed(() => !!this.valor() || !!this.escrito());

  /** El error se ve como en los demás campos: el control es inválido y se tocó o se envió el formulario. */
  protected readonly errores: ErrorStateMatcher = {
    isErrorState: (_control, formulario) => {
      const control = this.control();
      return control.invalid && (control.touched || !!formulario?.submitted);
    },
  };

  /** El campo muestra la ruta de la categoría elegida; lo que se escribe se muestra tal cual. */
  protected readonly mostrar = (valor: string | null): string =>
    (valor && this.rutas().get(valor)) ?? valor ?? '';

  constructor() {
    toObservable(this.control)
      .pipe(
        switchMap((control) => control.events.pipe(startWith(null))),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        this.version.update((n) => n + 1);
        this.cdr.markForCheck();
      });
    // El campo refleja el valor del control (al abrir, con «Limpiar» o al volver atrás) y su ruta cuando llegan las
    // categorías, salvo mientras se escribe.
    effect(() => {
      const valor = this.valor();
      this.rutas();
      const deshabilitado = this.deshabilitado();
      untracked(() => {
        if (deshabilitado) this.consulta.disable({ emitEvent: false });
        else this.consulta.enable({ emitEvent: false });
        if (!this.escrito()) this.consulta.setValue(valor || null, { emitEvent: false });
      });
    });
  }

  protected escribir(texto: string): void {
    this.escrito.set(texto);
  }

  protected elegir(id: string): void {
    const control = this.control();
    this.escrito.set('');
    if (control.value !== id) {
      control.setValue(id);
      control.markAsDirty();
    }
    this.consulta.setValue(id, { emitEvent: false });
  }

  /** Quita la categoría elegida y deja el foco en el campo. */
  protected quitar(): void {
    this.vaciar();
    this.entrada().nativeElement.focus();
  }

  /**
   * Enter con una opción activa lo resuelve Material (la elige). Si no, y hay texto escrito sin elegir: desde el tercer
   * carácter elige la primera coincidencia; con menos, no hace nada. En ninguno de los dos casos envía el formulario con
   * una categoría que no es la que se ve. Sin texto pendiente, Enter sigue su curso (en el filtro, «Buscar»).
   */
  protected pulsarEnter(evento: Event): void {
    const trigger = this.trigger();
    if (trigger.panelOpen && trigger.activeOption) return;
    if (!this.escrito()) return;
    evento.preventDefault();
    const primera = this.filtrando() ? this.visibles()[0] : undefined;
    if (!primera) return;
    this.elegir(primera.category.id);
    trigger.closePanel();
  }

  protected salir(): void {
    this.control().markAsTouched();
    if (!this.trigger().panelOpen) this.restaurar();
  }

  /**
   * Al cerrar la lista o salir del campo sin elegir: con el texto vacío se quita la categoría; si no, el campo vuelve a
   * mostrar la elegida.
   */
  protected restaurar(): void {
    if (!this.escrito()) return;
    if (!this.entrada().nativeElement.value.trim()) {
      this.vaciar();
      return;
    }
    this.escrito.set('');
    this.consulta.setValue(this.control().value || null, { emitEvent: false });
  }

  private vaciar(): void {
    const control = this.control();
    this.escrito.set('');
    if (control.value) {
      control.setValue('');
      control.markAsDirty();
    }
    this.consulta.setValue(null, { emitEvent: false });
  }
}
