import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'ws-admin-root',
  imports: [RouterOutlet],
  template: '<router-outlet/>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
