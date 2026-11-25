import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';

import { SesionFacade } from '../features/sesion/application/sesion.facade';
import { FlechaPlegableDirective } from '../shared/ui/plegable.directive';
import { inicialesDeUsuario } from '../features/sesion/domain/usuario-admin.rules';
import { IconoDirective } from '../shared/ui/icono.directive';

/**
 * Menú de usuario de la cabecera del Admin (feature 003, REQ-05 a REQ-07, AC-08 a AC-10). El botón muestra el
 * círculo de iniciales, el nombre y el rol; el panel, los datos de la cuenta, «Perfil» y «Cerrar sesión».
 * Usa `MatMenu`, como la tuerca de temas: foco, flechas, Escape y clic fuera los resuelve Material. El rol se
 * ve en mayúsculas con CSS (`uppercase`) y su etiqueta sale de `rol.rules.ts`. Estilos del panel en
 * `styles.css` del Admin (`ws-menu-usuario-*`), solo con tokens.
 */
@Component({
  selector: 'ws-admin-menu-usuario',
  imports: [IconoDirective, FlechaPlegableDirective, MatMenuModule, RouterLink],
  template: `
    <!-- Bajo sm: solo las iniciales; el nombre y el rol siguen en el nombre accesible del botón (AC-13). Las
         iniciales también lo integran, porque son lo que se ve: quien usa control por voz las nombra (PBI-0070). -->
    <button
      type="button"
      class="flex min-h-10 max-w-full cursor-pointer items-center gap-2.5 rounded-lg pr-2 pl-1 text-left hover:bg-subtle"
      [matMenuTriggerFor]="menuUsuario"
    >
      <span
        class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-on-primary"
      >
        {{ iniciales() }}
      </span>
      <span class="sr-only leading-tight sm:not-sr-only sm:block sm:min-w-0">
        <strong class="block max-w-48 truncate text-sm font-semibold text-ink">{{ nombre() }}</strong>
        <span class="block text-xs font-medium tracking-wide text-muted uppercase">
          {{ session.roleLabel() }}
        </span>
      </span>
      <svg wsAdminFlecha class="h-3.5 w-3.5 shrink-0 text-muted"></svg>
    </button>
    <mat-menu
      #menuUsuario="matMenu"
      class="ws-menu-usuario-panel"
      aria-label="Cuenta"
      aria-describedby="menu-usuario-cuenta"
      xPosition="before"
    >
      <div id="menu-usuario-cuenta" class="ws-menu-usuario-cuenta">
        <strong>{{ nombre() }}</strong>
        <span>{{ correo() }}</span>
        <span>{{ session.roleLabel() }}</span>
      </div>
      <div class="ws-menu-usuario-separador" role="separator"></div>
      <a mat-menu-item routerLink="/perfil">
        <span class="inline-flex items-center gap-2">
          <svg wsAdminIcono="perfil"></svg>
          Perfil
        </span>
      </a>
      <button mat-menu-item type="button" (click)="cerrarSesion()">
        <span class="inline-flex items-center gap-2">
          <svg wsAdminIcono="salir"></svg>
          Cerrar sesión
        </span>
      </button>
    </mat-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuUsuarioComponent {
  protected readonly session = inject(SesionFacade);
  private readonly router = inject(Router);

  protected readonly nombre = computed(() => this.session.user()?.name ?? '');
  protected readonly correo = computed(() => this.session.user()?.email ?? '');
  protected readonly iniciales = computed(() => inicialesDeUsuario(this.nombre(), this.correo()));

  /** Cierra la sesión del navegador aunque el BFF falle (`SesionFacade.logout`) y vuelve al acceso. */
  protected async cerrarSesion(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/login']);
  }
}
