import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ws-not-found-page',
  imports: [RouterLink],
  template: `
    <main class="grid min-h-screen place-items-center bg-store-canvas p-6">
      <div class="max-w-xl text-center">
        <h1 class="text-4xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl">
          <span class="block text-7xl text-link sm:text-8xl">404</span>
          Esta página no existe.
        </h1>
        <p class="mt-5 leading-7 text-muted">
          La dirección puede haber cambiado. Regresa al inicio para seguir explorando la tienda.
        </p>
        <a routerLink="/" class="ws-btn-primary mt-8">Ir al inicio</a>
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginaNoEncontradaPage {}
