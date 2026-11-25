import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { TemasFacade } from '../application/temas.facade';
import { MENSAJE_TEMA_ACTIVO_EN_USO } from '../domain/tema.rules';
import { ColoresTema, Tema } from '../domain/tema.model';
import { DatosTemaDialog, ResultadoTemaDialog, TemaDialog } from './tema.dialog';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

/** Los cinco colores en el orden del contrato, con el nombre que se lee en la muestra. */
const COLORES_DE_LA_MUESTRA: readonly { readonly campo: keyof ColoresTema; readonly nombre: string }[] = [
  { campo: 'primary', nombre: 'principal' },
  { campo: 'secondary', nombre: 'secundario' },
  { campo: 'background', nombre: 'fondo principal' },
  { campo: 'surface', nombre: 'fondo secundario' },
  { campo: 'contrast', nombre: 'contraste' },
];

/**
 * Temas de la tienda (AC-03 a AC-11, AC-19), solo para el `superadmin` (`themes.manage`). Lista los
 * predefinidos, que solo se activan, y los propios, que además se editan y se borran, cada uno con la
 * muestra de sus cinco colores y la marca del activo. Activar aplica el tema al Admin sin recargar (AC-10).
 */
@Component({
  selector: 'ws-admin-temas',
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 wsAdminTitulo class="text-3xl font-semibold tracking-tight text-ink">Temas</h1>
        <p class="mt-3 max-w-2xl text-sm text-muted">
          Colores de la tienda y del Admin. El tema activo se aplica a todas las páginas; los predefinidos no
          se editan, pero puedes crear un tema propio a partir de ellos.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
        [disabled]="!temas.temasAdmin()"
        (click)="nuevo()"
      >
        <svg wsAdminIcono="agregar"></svg>
        Nuevo tema
      </button>
    </div>

    <div class="mt-5 grid gap-3 empty:hidden">
      @if (temas.aviso()) {
        <div class="rounded-xl bg-warning-soft p-4 text-sm text-warning" role="alert">
          {{ temas.aviso() }}
        </div>
      }
      @if (errorDeAccion()) {
        <div class="rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger" role="alert">
          {{ errorDeAccion() }}
        </div>
      }
      @if (mensaje()) {
        <p class="text-sm text-on-primary-soft" role="status">{{ mensaje() }}</p>
      }
    </div>

    @if (temas.temasAdmin(); as lista) {
      <div class="mt-7 grid gap-6">
        <section class="admin-card overflow-hidden" aria-labelledby="temas-predefinidos">
          <div class="border-b border-line bg-subtle px-4 py-3">
            <h2 id="temas-predefinidos" class="font-semibold text-ink">Predefinidos</h2>
            <p class="text-sm text-muted">No se editan ni se borran; puedes activarlos.</p>
          </div>
          <ul>
            @for (tema of predefinidos(); track tema.id) {
              <ng-container
                *ngTemplateOutlet="fila; context: { $implicit: tema, activo: lista.activeThemeId }"
              />
            }
          </ul>
        </section>
        <section class="admin-card overflow-hidden" aria-labelledby="temas-propios">
          <div class="border-b border-line bg-subtle px-4 py-3">
            <h2 id="temas-propios" class="font-semibold text-ink">Propios</h2>
            <p class="text-sm text-muted">Creados por la tienda: se editan, se borran y se activan.</p>
          </div>
          <ul>
            @for (tema of propios(); track tema.id) {
              <ng-container
                *ngTemplateOutlet="fila; context: { $implicit: tema, activo: lista.activeThemeId }"
              />
            } @empty {
              <li class="px-4 py-8 text-center text-sm text-muted">
                Todavía no hay temas propios. Usa «Nuevo tema» para crear uno.
              </li>
            }
          </ul>
        </section>
      </div>
    } @else if (temas.cargando()) {
      <div class="admin-card mt-7 p-8 text-center text-muted" role="status">Cargando temas…</div>
    } @else if (temas.error()) {
      <div
        class="mt-7 rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger"
        role="alert"
      >
        {{ temas.error() }}
      </div>
    }

    <ng-template #fila let-tema let-activo="activo">
      <li class="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line p-4 first:border-t-0">
        <span class="flex shrink-0 overflow-hidden rounded-lg border border-line" aria-hidden="true">
          @for (color of muestra; track color.campo) {
            <span class="h-10 w-7" [style.background-color]="tema.colors[color.campo]"></span>
          }
        </span>
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-2">
            <strong class="font-semibold text-ink">{{ tema.name }}</strong>
            @if (tema.id === activo) {
              <span
                class="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-on-primary-soft"
              >
                Activo
              </span>
            }
          </p>
          <p class="text-xs text-muted">
            {{ tema.kind === 'predefined' ? 'Predefinido' : 'Propio' }}
            <span class="sr-only">. Colores: {{ describirColores(tema) }}</span>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
          @if (tema.id !== activo) {
            <button
              type="button"
              class="inline-flex items-center gap-2 min-h-10 rounded-lg border border-line px-4 hover:bg-subtle"
              [attr.aria-label]="'Activar ' + tema.name"
              [disabled]="temas.guardando()"
              (click)="activar(tema)"
            >
              <svg wsAdminIcono="activar"></svg>
              Activar
            </button>
          }
          @if (tema.kind === 'custom') {
            <button
              type="button"
              class="inline-flex items-center gap-2 min-h-10 text-link"
              [attr.aria-label]="'Editar ' + tema.name"
              (click)="editar(tema)"
            >
              <svg wsAdminIcono="editar"></svg>
              Editar
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 min-h-10 text-danger"
              [attr.aria-label]="'Borrar ' + tema.name"
              [disabled]="temas.guardando()"
              (click)="borrar(tema, activo)"
            >
              <svg wsAdminIcono="eliminar"></svg>
              Borrar
            </button>
          }
        </div>
      </li>
    </ng-template>
  `,
  imports: [IconoDirective, TituloPaginaDirective, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemasPage {
  protected readonly temas = inject(TemasFacade);
  private readonly dialog = inject(MatDialog);

  protected readonly muestra = COLORES_DE_LA_MUESTRA;
  protected readonly predefinidos = computed(
    () => this.temas.temasAdmin()?.themes.filter((tema) => tema.kind === 'predefined') ?? [],
  );
  protected readonly propios = computed(
    () => this.temas.temasAdmin()?.themes.filter((tema) => tema.kind === 'custom') ?? [],
  );
  protected readonly mensaje = signal<string | null>(null);
  protected readonly errorDeAccion = signal<string | null>(null);

  constructor() {
    void this.temas.cargarTemas();
  }

  protected describirColores(tema: Tema): string {
    return COLORES_DE_LA_MUESTRA.map(({ campo, nombre }) => `${nombre} ${tema.colors[campo]}`).join(', ');
  }

  /** Un tema nuevo parte de los colores del tema activo. */
  protected nuevo(): void {
    const lista = this.temas.temasAdmin();
    const activo = lista?.themes.find((tema) => tema.id === lista.activeThemeId) ?? lista?.themes[0];
    if (activo) this.abrir({ tema: null, coloresIniciales: activo.colors });
  }

  protected editar(tema: Tema): void {
    this.abrir({ tema, coloresIniciales: tema.colors });
  }

  protected async activar(tema: Tema): Promise<void> {
    this.limpiarMensajes();
    if (await this.temas.activar(tema.id)) this.mensaje.set(`«${tema.name}» es ahora el tema activo.`);
    else this.mostrarFallo();
  }

  protected async borrar(tema: Tema, activo: string): Promise<void> {
    this.limpiarMensajes();
    if (tema.id === activo) {
      this.errorDeAccion.set(MENSAJE_TEMA_ACTIVO_EN_USO);
      return;
    }
    if (!confirm(`¿Borrar el tema «${tema.name}»? No se puede deshacer.`)) return;
    if (await this.temas.borrar(tema.id)) this.mensaje.set(`Tema «${tema.name}» borrado.`);
    else this.mostrarFallo();
  }

  private abrir(datos: DatosTemaDialog): void {
    this.limpiarMensajes();
    this.dialog
      .open<TemaDialog, DatosTemaDialog, ResultadoTemaDialog>(TemaDialog, {
        data: datos,
        // Lote 25 (ADR-0025, PBI-0224): más ancha (antes 960 px) para que la vista previa se vea mejor.
        width: '1200px',
        maxWidth: 'calc(100vw - 32px)',
        // Lote 27 (PBI-0235): también más alta, hasta casi toda la pantalla; el contenido se desplaza dentro.
        maxHeight: 'calc(100dvh - 32px)',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((resultado) => {
        if (resultado) this.mensaje.set(`Tema «${resultado.nombre}» ${resultado.accion}.`);
      });
  }

  /** El aviso de datos desactualizados lo muestra la facade; el resto, aquí. */
  private mostrarFallo(): void {
    if (!this.temas.aviso()) this.errorDeAccion.set(this.temas.error());
  }

  private limpiarMensajes(): void {
    this.mensaje.set(null);
    this.errorDeAccion.set(null);
  }
}
