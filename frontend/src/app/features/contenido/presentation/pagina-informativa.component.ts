import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({
  selector: 'ws-info-page',
  template: `
    <section class="ws-container py-12">
      <p class="ws-eyebrow">Información</p>
      <h1 class="mt-2 text-4xl font-semibold sm:text-6xl">{{ title() }}</h1>
      <div class="ws-card prose prose-gray mt-8 max-w-none p-7"><ng-content /></div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginaInformativaComponent {
  readonly title = input.required<string>();
}
