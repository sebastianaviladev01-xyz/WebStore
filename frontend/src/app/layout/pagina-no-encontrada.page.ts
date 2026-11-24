import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Página 404 (PBI-0020; confirmada por Daniel el 2026-11-20): título, una frase y enlaces al inicio y al catálogo. */
@Component({
  selector: 'ws-not-found-page',
  imports: [RouterLink],
  template: `
    <main class="grid min-h-screen place-items-center bg-store-canvas p-6">
      <div class="max-w-xl text-center">
        <p class="text-7xl font-semibold tracking-[-0.03em] text-link sm:text-8xl" aria-hidden="true">404</p>
        <h1 class="mt-2 text-4xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl">
          Página no encontrada
        </h1>
        <p class="mt-5 leading-7 text-muted">La dirección puede haber cambiado o ya no existe.</p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a routerLink="/" class="ws-btn-primary">Ir al inicio</a>
          <a routerLink="/catalogo" class="ws-btn-secondary">Ver productos</a>
        </div>
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginaNoEncontradaPage {}
