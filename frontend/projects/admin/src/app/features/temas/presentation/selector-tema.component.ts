import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';

import { TemasFacade } from '../application/temas.facade';

/**
 * Tuerca del modo demo: un botón flotante que abre un menú con los temas predefinidos (A, B y C) y «Volver al tema
 * activo». Elegir un tema solo cambia este navegador (cookie de la vista previa, ADR-0012), y la tienda, que ya no
 * tiene tuerca, lo lee en el mismo host (PBI-0188, ADR-0022). `App` la monta únicamente si el BFF publica `demoMode`
 * (AC-15, AC-16). Estilos en `styles.css` del Admin, solo con tokens.
 */
@Component({
  selector: 'ws-admin-selector-tema',
  imports: [MatMenuModule],
  template: `
    <div class="ws-selector-tema">
      <button
        type="button"
        class="ws-selector-tema-boton"
        aria-label="Cambiar tema"
        title="Cambiar tema"
        [matMenuTriggerFor]="menuTemas"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          class="h-5 w-5 fill-none stroke-current"
          stroke-width="1.7"
        >
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
    <mat-menu
      #menuTemas="matMenu"
      class="ws-selector-tema-panel"
      aria-label="Temas"
      xPosition="before"
      yPosition="above"
    >
      <p class="ws-selector-tema-titulo">
        Probar un tema
        <span>Solo cambia en este navegador, también en la tienda.</span>
      </p>
      @for (tema of temas.temasDeLaTuerca(); track tema.id) {
        <button
          mat-menu-item
          type="button"
          role="menuitemradio"
          [attr.aria-checked]="tema.id === idVisible()"
          (click)="temas.verTema(tema.id)"
        >
          <span class="ws-selector-tema-opcion">
            <span class="ws-selector-tema-muestra" aria-hidden="true">
              <span [style.background-color]="tema.colors.primary"></span>
              <span [style.background-color]="tema.colors.secondary"></span>
            </span>
            <span class="ws-selector-tema-nombre">{{ tema.name }}</span>
            @if (tema.id === idActivo()) {
              <span class="ws-selector-tema-activo">
                <span class="sr-only">,</span>
                Activo
              </span>
            }
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="ws-selector-tema-marca h-4 w-4 fill-none stroke-current"
              [class.invisible]="tema.id !== idVisible()"
              stroke-width="2"
            >
              <path d="m5 12 4.5 4.5L19 7" />
            </svg>
          </span>
        </button>
      }
      <div class="ws-selector-tema-separador" role="separator"></div>
      <button mat-menu-item type="button" [disabled]="!esVistaPrevia()" (click)="temas.volverAlActivo()">
        Volver al tema activo
      </button>
    </mat-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorTemaComponent {
  protected readonly temas = inject(TemasFacade);
  protected readonly idVisible = computed(() => this.temas.temaVisible()?.tema.id ?? null);
  protected readonly idActivo = computed(() => this.temas.temaActivo()?.id ?? null);
  protected readonly esVistaPrevia = computed(() => this.temas.temaVisible()?.esVistaPrevia ?? false);
}
