import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { SesionFacade } from '../application/sesion.facade';
import { definicionDeRol } from '../domain/rol.rules';

/**
 * Perfil de la cuenta de la sesión (feature 003, AC-12, D5): nombre, correo, rol y lo que ese rol puede
 * hacer. Es de solo lectura y usa los datos que ya tiene `SesionFacade`, sin pedir nada al BFF (REQ-10).
 * La abren los tres roles; la edición queda para PBI-0034.
 */
@Component({
  selector: 'ws-admin-perfil',
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Perfil</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Datos de la cuenta con la que iniciaste sesión.</p>

    @if (session.user(); as usuario) {
      <section class="admin-card mt-6 max-w-2xl p-6" aria-label="Datos de la cuenta">
        <dl class="grid gap-5">
          <div class="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
            <dt class="text-sm font-semibold text-muted">Nombre</dt>
            <dd class="break-words text-ink">{{ usuario.name }}</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
            <dt class="text-sm font-semibold text-muted">Correo</dt>
            <dd class="break-words text-ink">{{ usuario.email }}</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
            <dt class="text-sm font-semibold text-muted">Rol</dt>
            <dd class="text-ink">
              <span class="font-semibold">{{ rol()?.label }}</span>
              <span class="mt-1 block text-sm text-muted">{{ rol()?.description }}</span>
            </dd>
          </div>
        </dl>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilPage {
  protected readonly session = inject(SesionFacade);
  protected readonly rol = computed(() => definicionDeRol(this.session.role()));
}
