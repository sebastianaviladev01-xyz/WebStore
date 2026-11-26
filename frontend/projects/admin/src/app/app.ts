import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { TemasFacade } from './features/temas/application/temas.facade';
import { SelectorTemaComponent } from './layout/selector-tema.component';

@Component({
  selector: 'ws-admin-root',
  imports: [RouterOutlet, SelectorTemaComponent],
  // La tuerca y Angular Material van en un chunk aparte: sin modo demo no se descargan. Lote 35 (PBI-0249): en el
  // panel la tuerca está en la barra superior (`AppLayout`); aquí solo queda la flotante del acceso, que no tiene
  // barra ni contenido que tapar.
  template: `
    <router-outlet />
    @if (temas.modoDemo() && enAcceso()) {
      @defer {
        <ws-admin-selector-tema />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly temas = inject(TemasFacade);
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  /** La página de acceso es la única que no pasa por `AppLayout`. */
  protected readonly enAcceso = computed(() => this.url().split(/[?#]/)[0] === '/login');

  constructor() {
    void this.temas.cargar();
  }
}
