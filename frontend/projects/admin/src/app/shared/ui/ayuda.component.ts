import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

let siguienteId = 0;

/**
 * Ayuda (tooltip) del Admin (lote 13, ADR-0021, PBI-0186): un botón «i» que muestra un texto breve al pasar el puntero,
 * al enfocarlo con el teclado o al tocarlo, y lo oculta con Escape (WCAG 1.4.13: se puede descartar, se puede recorrer
 * con el puntero y no desaparece solo). El texto está siempre en el DOM y el botón lo nombra con `aria-describedby`.
 *
 * El texto se posiciona respecto del primer antecesor posicionado (por ejemplo, `.admin-card`), así no se sale de la
 * tarjeta ni lo recorta un plegable; quien la usa decide dónde cae con `posicion` (clases de Tailwind).
 */
@Component({
  selector: 'ws-admin-ayuda',
  host: {
    class: 'inline-flex',
    '(mouseenter)': 'puntero.set(true)',
    '(mouseleave)': 'puntero.set(false); descartada.set(false)',
    '(focusin)': 'foco.set(true)',
    '(focusout)': 'alSalirDelFoco()',
    '(keydown.escape)': 'descartada.set(true)',
  },
  template: `
    <button
      type="button"
      class="grid h-5 w-5 cursor-help place-items-center rounded-full"
      [class]="sobreColor() ? 'text-current' : 'text-muted hover:text-ink'"
      [attr.aria-label]="etiqueta()"
      [attr.aria-describedby]="id"
      (click)="alTocar()"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        class="h-4 w-4 fill-none stroke-current"
        stroke-width="1.5"
        stroke-linecap="round"
      >
        <circle cx="8" cy="8" r="6.25" />
        <path d="M8 7.25v3.5" />
        <path d="M8 5.1v.01" stroke-width="2" />
      </svg>
    </button>
    <span
      role="tooltip"
      class="ws-ayuda-texto absolute z-10 rounded-lg border border-line bg-surface p-3 text-left text-xs leading-relaxed font-normal text-body"
      [class]="posicion()"
      [class.invisible]="!visible()"
      [id]="id"
    >
      {{ texto() }}
    </span>
  `,
  styles: `
    .ws-ayuda-texto {
      box-shadow: var(--ws-shadow);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaComponent {
  /** El texto de la ayuda. */
  readonly texto = input.required<string>();
  /** Nombre accesible del botón: qué aclara la ayuda. */
  readonly etiqueta = input.required<string>();
  /** Dónde cae el texto respecto del antecesor posicionado. */
  readonly posicion = input('inset-x-3 top-12');
  /**
   * Sobre un fondo de color (las tarjetas de cifras del Dashboard, lote 45, PBI-0270): el «i» toma el color del texto de
   * la tarjeta, que el tema calcula para ese fondo, en lugar del tenue, que no tiene contraste allí.
   */
  readonly sobreColor = input(false);

  protected readonly id = `ws-ayuda-${++siguienteId}`;
  protected readonly puntero = signal(false);
  protected readonly foco = signal(false);
  protected readonly tocada = signal(false);
  protected readonly descartada = signal(false);
  protected readonly visible = computed(
    () => (this.puntero() || this.foco() || this.tocada()) && !this.descartada(),
  );

  /** Tocarla en una pantalla táctil la abre; tocarla de nuevo la cierra. Tras Escape, la vuelve a abrir. */
  protected alTocar(): void {
    this.tocada.set(this.descartada() || !this.tocada());
    this.descartada.set(false);
  }

  protected alSalirDelFoco(): void {
    this.foco.set(false);
    this.tocada.set(false);
    this.descartada.set(false);
  }
}
