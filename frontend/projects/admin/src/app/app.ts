import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TemasFacade } from './features/temas/application/temas.facade';

@Component({
  selector: 'ws-admin-root',
  imports: [RouterOutlet],
  template: '<router-outlet/>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly temas = inject(TemasFacade);

  constructor() {
    void this.temas.cargar();
  }
}
