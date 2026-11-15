import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Categoria } from '../features/catalogo/domain/categoria.model';
import { hijosDeCategoria, descendientesDeCategoria } from '../features/catalogo/domain/categoria.rules';
import { EnlaceNavegacion } from '../features/contenido/domain/navegacion.rules';

@Component({
  selector: 'ws-category-mega-menu',
  imports: [RouterLink],
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- Escape y focusout llegan desde los enlaces del menú. -->
    <nav
      class="ws-desktop-navigation"
      aria-label="Categorías principales"
      (mouseleave)="activeCategory.set(null)"
      (keydown.escape)="cerrarConEscape()"
      (focusout)="closeWhenLeaving($event)"
    >
      <div class="ws-container ws-navigation-row">
        <a routerLink="/catalogo" class="ws-navigation-all" (click)="activeCategory.set(null)">
          {{ allLabel() }}
        </a>
        @for (category of topCategories(); track category.id) {
          @if (childrenFor(category.id).length) {
            <button
              type="button"
              class="ws-navigation-trigger"
              [class.is-active]="activeCategory() === category.id"
              [attr.aria-expanded]="activeCategory() === category.id"
              [attr.aria-controls]="'mega-' + category.id"
              (mouseenter)="activeCategory.set(category.id)"
              (click)="toggle(category.id)"
            >
              @if (category.imageUrl) {
                <img class="ws-navigation-category-image" [src]="category.imageUrl" alt="" />
              }
              {{ category.name }}
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
            </button>
            @if (activeCategory() === category.id) {
              <div class="ws-mega-panel" [id]="'mega-' + category.id">
                <div class="ws-container ws-mega-layout">
                  <div class="ws-mega-intro">
                    <h2>{{ category.name }}</h2>
                    <p>{{ category.description }}</p>
                    <a
                      routerLink="/catalogo"
                      [queryParams]="{ categoria: category.id }"
                      (click)="activeCategory.set(null)"
                    >
                      Ver todos los productos
                    </a>
                  </div>
                  <div class="ws-mega-columns">
                    @for (child of childrenFor(category.id); track child.id) {
                      <div>
                        <a
                          class="ws-mega-heading"
                          routerLink="/catalogo"
                          [queryParams]="{ categoria: child.id }"
                          (click)="activeCategory.set(null)"
                        >
                          {{ child.name }}
                        </a>
                        @for (entry of descendantsFor(child.id); track entry.category.id) {
                          <a
                            class="ws-mega-leaf"
                            routerLink="/catalogo"
                            [style.padding-left.px]="entry.depth * 12"
                            [queryParams]="{ categoria: entry.category.id }"
                            (click)="activeCategory.set(null)"
                          >
                            {{ entry.category.name }}
                          </a>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          } @else {
            <a
              routerLink="/catalogo"
              class="ws-navigation-trigger"
              [queryParams]="{ categoria: category.id }"
              (mouseenter)="activeCategory.set(null)"
            >
              @if (category.imageUrl) {
                <img class="ws-navigation-category-image" [src]="category.imageUrl" alt="" />
              }
              {{ category.name }}
            </a>
          }
        }
        <div class="ws-navigation-secondary">
          @for (link of supplementalLinks(); track link.label) {
            <a
              [routerLink]="link.route"
              class="ws-navigation-trigger"
              (mouseenter)="activeCategory.set(null)"
            >
              @if (link.icon === 'truck') {
                <svg class="ws-navigation-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 7h12v10H2zM14 11h4l4 3v3h-8" />
                  <circle cx="6" cy="18" r="2" />
                  <circle cx="18" cy="18" r="2" />
                </svg>
              }
              {{ link.label }}
            </a>
          }
        </div>
      </div>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuCategoriasComponent {
  readonly categories = input.required<readonly Categoria[]>();
  readonly supplementalLinks = input<readonly EnlaceNavegacion[]>([]);
  readonly allLabel = input('Todas las categorías');
  protected readonly activeCategory = signal<string | null>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly topCategories = computed(() => hijosDeCategoria(this.categories()));

  protected childrenFor(parentId: string) {
    return hijosDeCategoria(this.categories(), parentId);
  }

  protected descendantsFor(parentId: string) {
    return descendientesDeCategoria(this.categories(), parentId);
  }

  protected toggle(id: string): void {
    this.activeCategory.update((active) => (active === id ? null : id));
  }

  /**
   * Escape cierra el panel y devuelve el foco al botón de su categoría: si el foco estaba dentro del panel, que
   * desaparece, caería en el `body` (PBI-0116).
   */
  protected cerrarConEscape(): void {
    const abierta = this.activeCategory();
    if (abierta === null) return;
    const panel = this.host.nativeElement.querySelector(`#mega-${abierta}`);
    const focoDentro = panel?.contains(this.host.nativeElement.ownerDocument.activeElement) ?? false;
    this.activeCategory.set(null);
    if (focoDentro)
      this.host.nativeElement.querySelector<HTMLElement>(`[aria-controls="mega-${abierta}"]`)?.focus();
  }

  protected closeWhenLeaving(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      this.activeCategory.set(null);
    }
  }
}
