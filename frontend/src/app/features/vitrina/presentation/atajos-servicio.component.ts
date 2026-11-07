import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ContenidoFacade } from '../../contenido/application/contenido.facade';

type ShortcutIcon = 'store' | 'star' | 'box' | 'truck' | 'user' | 'book' | 'chat';

interface Shortcut {
  readonly label: string;
  readonly path: string;
  readonly fragment?: string;
  readonly icon: ShortcutIcon;
}

/**
 * Accesos rápidos con ícono bajo el hero. Son atajos a servicios de la tienda, no categorías
 * (las categorías van sin íconos, según lo acordado). Envíos y Contacto respetan su interruptor del CMS.
 */
@Component({
  selector: 'ws-service-shortcuts',
  imports: [RouterLink],
  template: `
    <nav class="ws-shortcuts ws-container" aria-label="Accesos rápidos">
      <ul>
        @for (shortcut of shortcuts(); track shortcut.label) {
          <li>
            <a [routerLink]="shortcut.path" [fragment]="shortcut.fragment">
              <span class="ws-shortcut-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  @switch (shortcut.icon) {
                    @case ('store') {
                      <path d="M4 9h16l-1.2-4.2A1 1 0 0 0 17.8 4H6.2a1 1 0 0 0-1 .8L4 9Z" />
                      <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M9 20v-6h6v6" />
                    }
                    @case ('star') {
                      <path
                        d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"
                      />
                    }
                    @case ('box') {
                      <path d="M3 7l9-4 9 4v10l-9 4-9-4V7Z" />
                      <path d="M3 7l9 4 9-4M12 11v10" />
                    }
                    @case ('truck') {
                      <path d="M2 7h12v10H2zM14 11h4l4 3v3h-8" />
                      <circle cx="6" cy="18" r="2" />
                      <circle cx="18" cy="18" r="2" />
                    }
                    @case ('user') {
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                    }
                    @case ('book') {
                      <path d="M6 3h9l4 4v14H6z" />
                      <path d="M15 3v4h4M9 12h7M9 16h5" />
                    }
                    @default {
                      <path d="M4 5h16v11H9l-5 4V5Z" />
                      <path d="M8 9h8M8 12h5" />
                    }
                  }
                </svg>
              </span>
              <span>{{ shortcut.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtajosServicioComponent {
  private readonly content = inject(ContenidoFacade);

  protected readonly shortcuts = computed<readonly Shortcut[]>(() => {
    const settings = this.content.settings();
    return [
      { label: 'Tienda online', path: '/catalogo', icon: 'store' },
      { label: 'Destacados', path: '/', fragment: 'destacados', icon: 'star' },
      { label: 'Mis pedidos', path: '/pedidos', icon: 'box' },
      ...(settings.shippingPageEnabled
        ? [{ label: 'Envíos', path: '/info/envios', icon: 'truck' } as const]
        : []),
      { label: 'Mi cuenta', path: '/cuenta/login', icon: 'user' },
      { label: 'Libro de reclamaciones', path: '/libro-reclamaciones', icon: 'book' },
      ...(settings.contactPageEnabled
        ? [{ label: 'Contáctanos', path: '/info/contacto', icon: 'chat' } as const]
        : []),
    ];
  });
}
