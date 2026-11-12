import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TemasFacade } from './features/temas/application/temas.facade';
import { SelectorTemaComponent } from './features/temas/presentation/selector-tema.component';

@Component({
  selector: 'ws-admin-root',
  imports: [RouterOutlet, SelectorTemaComponent],
  // La tuerca y Angular Material van en un chunk aparte: sin modo demo no se descargan.
  template: `
    <router-outlet />
    @if (temas.modoDemo()) {
      @defer {
        <ws-admin-selector-tema />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly temas = inject(TemasFacade);

  constructor() {
    void this.temas.cargar();
  }
}
