import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ws-empty-state',
  imports: [RouterLink],
  template: `
    <section class="ws-card grid min-h-80 place-items-center p-8 text-center">
      <div class="max-w-md">
        <div
          class="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-xl bg-primary-soft text-primary"
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" class="h-7 w-7 fill-none stroke-current" stroke-width="1.7">
            <path d="M7 11h18l-1.5 15h-15L7 11Z" />
            <path d="M11 12V9a5 5 0 0 1 10 0v3M12 17h8" />
          </svg>
        </div>
        <h2 class="text-2xl font-semibold tracking-[-0.03em]">{{ title() }}</h2>
        <p class="mt-3 leading-7 text-muted">{{ description() }}</p>
        <a [routerLink]="actionLink()" class="ws-btn-primary mt-6">{{ actionLabel() }}</a>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input('Ver productos');
  readonly actionLink = input('/catalogo');
}
