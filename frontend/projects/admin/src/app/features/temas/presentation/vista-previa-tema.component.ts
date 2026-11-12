import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TokensTema } from '../domain/tema.model';

/**
 * Vista previa de un tema dentro del formulario (AC-07): cabecera, botón principal, botón secundario,
 * tarjeta, texto sobre los dos fondos y pie. Escribe los tokens del tema como variables CSS de su propio
 * elemento, no de `<html>`, así que el resto del Admin y la tienda no cambian. Las utilidades de Tailwind
 * (`bg-primary`, `text-muted`…) leen esas variables, por eso se usan las mismas clases que en la interfaz.
 * Es una imagen de muestra: nada de su interior es interactivo.
 */
@Component({
  selector: 'ws-admin-vista-previa-tema',
  template: `
    <figure class="m-0 overflow-hidden rounded-xl border border-line bg-canvas text-body">
      <div aria-hidden="true">
        <div class="bg-primary-strong px-4 py-1.5 text-xs font-medium text-on-primary">
          Franja de avisos de la tienda
        </div>
        <div class="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
          <span class="flex items-center gap-2 font-semibold text-ink">
            <span
              class="grid h-7 w-7 place-items-center rounded-lg bg-primary text-sm font-semibold text-on-primary"
            >
              W
            </span>
            Mi tienda
          </span>
          <span class="text-sm font-semibold text-link underline underline-offset-2">Catálogo</span>
        </div>
        <div class="grid gap-3 p-4">
          <div>
            <p class="font-semibold text-ink">Texto sobre el fondo principal</p>
            <p class="text-sm text-muted">Texto secundario sobre el fondo principal.</p>
          </div>
          <div class="rounded-xl border border-line bg-surface p-4">
            <span
              class="inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-on-accent"
            >
              Oferta
            </span>
            <p class="mt-2 font-semibold text-ink">Tarjeta sobre el fondo secundario</p>
            <p class="text-sm text-muted">Texto secundario sobre la tarjeta.</p>
            <p class="text-sm font-semibold text-link underline underline-offset-2">Enlace en la tarjeta</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary">
                Botón principal
              </span>
              <span class="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent">
                Botón secundario
              </span>
            </div>
            <div class="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted ws-foco">
              Campo con el foco
            </div>
          </div>
          <p class="rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-on-primary-soft">
            Mensaje de confirmación
          </p>
        </div>
        <div class="bg-footer px-4 py-2.5 text-xs text-footer-text">
          <span class="font-semibold text-footer-heading">Pie de página</span>
          · Texto del pie
        </div>
      </div>
      <figcaption class="sr-only">Vista previa del tema con sus colores</figcaption>
    </figure>
  `,
  styles: `
    :host {
      display: block;
    }

    .ws-foco {
      outline: 2px solid var(--ws-focus-ring);
      outline-offset: 2px;
    }
  `,
  host: { '[style]': 'variables()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VistaPreviaTemaComponent {
  readonly tokens = input.required<TokensTema>();

  /** Los tokens del tema como variables CSS del propio elemento. */
  protected readonly variables = computed<Record<string, string>>(() => ({ ...this.tokens() }));
}
