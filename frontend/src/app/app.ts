import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TemasFacade } from './features/temas/application/temas.facade';
import { SelectorTemaComponent } from './features/temas/presentation/selector-tema.component';
import { VisitasFacade } from './features/visitas/application/visitas.facade';

@Component({
  selector: 'ws-root',
  imports: [RouterOutlet, SelectorTemaComponent],
  // La tuerca y Angular Material van en un chunk aparte: sin modo demo no se descargan.
  template: `
    <router-outlet />
    @if (temas.modoDemo()) {
      @defer {
        <ws-selector-tema />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly temas = inject(TemasFacade);

  constructor() {
    void this.temas.cargar();
    // PBI-0027: latido para «Personas en línea» del Admin, sin cookie ni datos de la persona.
    inject(VisitasFacade).iniciar();
  }
}
