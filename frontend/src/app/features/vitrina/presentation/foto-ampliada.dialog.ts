import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

/** Lo que muestra la vista ampliada: el nombre del producto, sus fotos grandes y la que se ve al abrir. */
export interface DatosDeFotoAmpliada {
  readonly nombre: string;
  /** Las fotos de la ficha, en el mismo orden; la primera es la principal, a su tamaño grande. */
  readonly fotos: readonly string[];
  readonly inicial: number;
}

/**
 * Vista ampliada de la foto de la ficha (lote 52, ADR-0037, PBI-0282; decisión de Sebastián Avila del 2026-11-27). Es un
 * `MatDialog`: foco atrapado, Esc para cerrar, `role="dialog"` con el nombre del producto como nombre accesible y el foco
 * de vuelta en la foto de la ficha al cerrar. Con más de una foto, «Foto anterior» y «Foto siguiente» recorren la
 * galería, también con las flechas del teclado, y dan la vuelta al llegar al final. Al cerrarse, la ficha lee la foto que se
 * estaba viendo (`fotoActual`) y queda en ella.
 */
@Component({
  selector: 'ws-zoomed-photo-dialog',
  imports: [MatDialogModule],
  template: `
    <div class="ws-zoom-header">
      <div class="min-w-0">
        <h2 mat-dialog-title class="ws-zoom-title">{{ data.nombre }}</h2>
        @if (variasFotos) {
          <p class="ws-zoom-counter" aria-live="polite">Foto {{ actual() + 1 }} de {{ total }}</p>
        }
      </div>
      <button type="button" class="ws-zoom-close" aria-label="Cerrar foto ampliada" (click)="cerrar()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </div>
    <div class="ws-zoom-stage">
      <img [src]="foto()" [alt]="textoAlternativo()" [class.is-photo]="actual() > 0" />
      @if (variasFotos) {
        <button type="button" class="ws-zoom-nav is-previous" aria-label="Foto anterior" (click)="anterior()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <button type="button" class="ws-zoom-nav is-next" aria-label="Foto siguiente" (click)="siguiente()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button>
      }
    </div>
  `,
  host: { class: 'ws-zoom' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FotoAmpliadaDialog {
  protected readonly data = inject<DatosDeFotoAmpliada>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<FotoAmpliadaDialog>>(MatDialogRef);

  protected readonly total = this.data.fotos.length;
  protected readonly variasFotos = this.total > 1;
  protected readonly actual = signal(Math.min(Math.max(this.data.inicial, 0), Math.max(this.total - 1, 0)));
  protected readonly foto = computed(() => this.data.fotos[this.actual()]);
  protected readonly textoAlternativo = computed(() =>
    this.variasFotos ? `${this.data.nombre}, foto ${this.actual() + 1} de ${this.total}` : this.data.nombre,
  );

  constructor() {
    // Las flechas llegan por el overlay del diálogo: el foco puede estar en el contenedor, por encima de este componente.
    this.ref
      .keydownEvents()
      .pipe(takeUntilDestroyed())
      .subscribe((evento) => {
        if (evento.key === 'ArrowLeft') this.anterior();
        else if (evento.key === 'ArrowRight') this.siguiente();
      });
  }

  protected anterior(): void {
    if (!this.variasFotos) return;
    this.actual.update((indice) => (indice - 1 + this.total) % this.total);
  }

  protected siguiente(): void {
    if (!this.variasFotos) return;
    this.actual.update((indice) => (indice + 1) % this.total);
  }

  protected cerrar(): void {
    this.ref.close();
  }

  /** La foto que se ve ahora: la ficha la lee al cerrarse el diálogo, con el botón, con Esc o con un clic fuera. */
  fotoActual(): number {
    return this.actual();
  }
}

/**
 * Abre la vista ampliada. En el escritorio, un diálogo grande de hasta 1200 × 860 px; en una ventana más pequeña (el
 * celular) ocupa toda la pantalla, sin márgenes ni esquinas redondeadas (`.ws-zoom-panel`).
 */
export function abrirFotoAmpliada(
  dialog: MatDialog,
  data: DatosDeFotoAmpliada,
): MatDialogRef<FotoAmpliadaDialog> {
  return dialog.open<FotoAmpliadaDialog, DatosDeFotoAmpliada>(FotoAmpliadaDialog, {
    data,
    width: 'min(1200px, 100vw)',
    maxWidth: '100vw',
    height: 'min(860px, 100dvh)',
    maxHeight: '100dvh',
    panelClass: 'ws-zoom-panel',
    autoFocus: 'dialog',
    restoreFocus: true,
  });
}
