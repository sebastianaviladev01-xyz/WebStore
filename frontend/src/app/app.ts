import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TemasFacade } from './features/temas/application/temas.facade';

// La tienda no tiene tuerca de temas, tampoco en modo demo: el tema se configura en el Admin (PBI-0188, ADR-0022).
@Component({
  selector: 'ws-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly temas = inject(TemasFacade);

  constructor() {
    void this.temas.cargar();
  }
}
