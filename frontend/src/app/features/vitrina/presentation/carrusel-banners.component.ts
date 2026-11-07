import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink, UrlTree } from '@angular/router';

import { VarianteInicio, Banner } from '../../contenido/domain/contenido.model';

@Component({
  selector: 'ws-hero-carousel',
  imports: [RouterLink],
  template: `
    @if (banners().length) {
      <section
        class="ws-hero"
        [class.is-wide]="variant() === 'actual'"
        [class.is-paused]="paused() || hovered() || focusWithin()"
        [class.is-dark-tone]="activeBanner()?.imageTone === 'dark'"
        aria-roledescription="carrusel"
        aria-label="Promociones principales"
        (mouseenter)="hovered.set(true)"
        (mouseleave)="hovered.set(false)"
        (focusin)="focusWithin.set(true)"
        (focusout)="handleFocusOut($event)"
      >
        <div class="ws-hero-stage">
          @for (banner of banners(); track banner.id; let index = $index) {
            <article
              class="ws-hero-slide"
              [class.is-active]="activeIndex() === index"
              [attr.aria-hidden]="activeIndex() !== index"
              [attr.inert]="activeIndex() === index ? null : ''"
              [attr.aria-label]="'Promoción ' + (index + 1) + ' de ' + banners().length"
            >
              <div class="ws-hero-layout">
                <div class="ws-hero-copy">
                  @if (variant() === 'actual' && banner.eyebrow) {
                    <p class="ws-hero-eyebrow">{{ banner.eyebrow }}</p>
                  }
                  <h1>{{ banner.title }}</h1>
                  <p class="ws-hero-description">{{ banner.description }}</p>
                  <div class="ws-hero-action-row">
                    <a [routerLink]="linkFor(banner.ctaUrl)" class="ws-btn-primary">{{ banner.ctaLabel }}</a>
                    @if (variant() === 'anterior') {
                      <span>{{ banner.eyebrow }}</span>
                    } @else {
                      <a routerLink="/catalogo" class="ws-btn-on-soft">Ver todos los productos</a>
                    }
                  </div>
                  @if (variant() === 'actual' && highlights().length) {
                    <ul class="ws-hero-highlights">
                      @for (highlight of highlights(); track highlight; let position = $index) {
                        <li>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            @if (position === 0) {
                              <circle cx="12" cy="8" r="4" />
                              <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                            } @else {
                              <path d="M2 7h12v10H2zM14 11h4l4 3v3h-8" />
                              <circle cx="6" cy="18" r="2" />
                              <circle cx="18" cy="18" r="2" />
                            }
                          </svg>
                          {{ highlight }}
                        </li>
                      }
                    </ul>
                  }
                </div>
                <div
                  class="ws-hero-media"
                  [class.ws-hero-photo]="banner.imageFit === 'cover'"
                  [style.--ws-hero-focus-y]="banner.imageFocusY != null ? banner.imageFocusY + '%' : null"
                >
                  <picture>
                    @if (banner.mobileImageUrl) {
                      <source media="(max-width: 640px)" [srcset]="banner.mobileImageUrl" />
                    }
                    <img
                      [src]="banner.imageUrl"
                      [alt]="banner.title"
                      width="1536"
                      height="1024"
                      [attr.fetchpriority]="index === 0 ? 'high' : 'auto'"
                      [attr.loading]="index === 0 ? 'eager' : 'lazy'"
                    />
                  </picture>
                </div>
              </div>
            </article>
          }
        </div>

        @if (banners().length > 1) {
          <div class="ws-hero-controls">
            @if (variant() === 'anterior') {
              <span class="ws-hero-counter" aria-live="polite">
                {{ activeIndex() + 1 }} / {{ banners().length }}
              </span>
              <div class="ws-hero-pagination" aria-label="Seleccionar promoción">
                @for (item of banners(); track item.id; let index = $index) {
                  <button
                    type="button"
                    class="ws-hero-page"
                    [class.is-active]="activeIndex() === index"
                    [attr.aria-pressed]="activeIndex() === index"
                    [attr.aria-label]="'Mostrar promoción ' + (index + 1)"
                    (click)="goTo(index)"
                  ></button>
                }
              </div>
            } @else {
              <!-- Contador y una sola barra de progreso: sirven igual con 2 que con 10 banners. -->
              <p class="sr-only" aria-live="polite">
                Promoción {{ activeIndex() + 1 }} de {{ banners().length }}
              </p>
              <span class="ws-hero-count" aria-hidden="true">
                <strong>{{ activeIndex() + 1 }}</strong>
                / {{ banners().length }}
              </span>
              <span class="ws-hero-progress" aria-hidden="true">
                <!-- Se vuelve a crear en cada cambio para que la barra arranque de cero. -->
                @for (slide of [activeIndex()]; track slide) {
                  <span></span>
                }
              </span>
            }
            <button
              type="button"
              class="ws-carousel-control"
              aria-label="Promoción anterior"
              (click)="previous()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5" /></svg>
            </button>
            <button
              type="button"
              class="ws-carousel-control"
              [attr.aria-label]="paused() ? 'Reanudar carrusel' : 'Pausar carrusel'"
              (click)="togglePause()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                @if (paused()) {
                  <path d="m9 6 8 6-8 6z" />
                } @else {
                  <path d="M9 6v12M15 6v12" />
                }
              </svg>
            </button>
            <button
              type="button"
              class="ws-carousel-control"
              aria-label="Promoción siguiente"
              (click)="next()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 7 5 5-5 5" /></svg>
            </button>
          </div>
        }
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarruselBannersComponent {
  readonly banners = input.required<readonly Banner[]>();
  /** 'anterior' muestra el hero previo a la alineación con la propuesta B (solo para /inicio-anterior). */
  readonly variant = input<VarianteInicio>('actual');
  /** Beneficios cortos del CMS que acompañan al banner (solo en la versión actual). */
  readonly highlights = input<readonly string[]>([]);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  protected readonly currentIndex = signal(0);
  protected readonly paused = signal(false);
  protected readonly hovered = signal(false);
  protected readonly focusWithin = signal(false);
  protected readonly activeIndex = computed(() => {
    const banners = this.banners();
    return banners.length ? this.currentIndex() % banners.length : 0;
  });
  protected readonly activeBanner = computed<Banner | undefined>(() => this.banners()[this.activeIndex()]);

  constructor() {
    if (typeof window !== 'undefined') {
      this.paused.set(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const timer = window.setInterval(() => {
        if (
          !this.paused() &&
          !this.hovered() &&
          !this.focusWithin() &&
          !document.hidden &&
          this.banners().length > 1
        )
          this.next();
      }, 8000);
      this.destroyRef.onDestroy(() => window.clearInterval(timer));
    }
  }

  protected goTo(index: number): void {
    this.currentIndex.set(index);
  }

  protected handleFocusOut(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      this.focusWithin.set(false);
    }
  }

  protected linkFor(url: string): UrlTree {
    return this.router.parseUrl(url);
  }

  protected togglePause(): void {
    this.paused.update((value) => !value);
  }

  protected previous(): void {
    const length = this.banners().length;
    if (length) this.currentIndex.update((index) => (index - 1 + length) % length);
  }

  protected next(): void {
    const length = this.banners().length;
    if (length) this.currentIndex.update((index) => (index + 1) % length);
  }
}
