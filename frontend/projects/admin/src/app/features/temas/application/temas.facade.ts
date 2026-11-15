import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { SesionVencidaError } from '../../sesion/domain/sesion.gateway';
import { temaVisible as resolverTemaVisible, TemaVisible } from '../domain/tema-visible.rules';
import { Apariencia, Tema, TemasAdmin } from '../domain/tema.model';
import {
  EntradaTema,
  ReglaTemaError,
  TemasDesactualizadosError,
  TemasGateway,
} from '../domain/temas.gateway';
import { borrarVistaPrevia, escribirVistaPrevia, leerVistaPrevia } from './cookie-vista-previa';

/** Aviso de AC-19: otro `superadmin` cambió los temas; la lista ya se recargó y no se reintenta. */
export const AVISO_TEMAS_DESACTUALIZADOS =
  'Otra persona cambió los temas mientras tanto. La lista ya está actualizada: revísala y vuelve a intentarlo.';

/**
 * Carga la apariencia del BFF y pinta el tema visible, como en la tienda: escribe sus tokens en `:root` y el
 * color de la barra del navegador. En modo demo recuerda la vista previa en la cookie `ws_tema_vista_previa`
 * (`cookie-vista-previa.ts`, sin `Domain`), que la tienda y el Admin comparten solo en el mismo host.
 *
 * Además gestiona los temas del `superadmin` (`themes.manage`): carga la lista y crea, edita, borra y activa
 * sobre la revisión de temas vigente. Tras activar aplica el tema nuevo sin recargar (AC-10). Si el BFF
 * responde `STALE_THEMES`, **no reintenta**: avisa y recarga la lista (AC-19), a diferencia de `TiendaFacade`.
 */
@Injectable({ providedIn: 'root' })
export class TemasFacade {
  private readonly gateway = inject(TemasGateway);
  private readonly sesion = inject(SesionFacade);
  private readonly document = inject(DOCUMENT);
  private readonly aparienciaState = signal<Apariencia | null>(null);
  private readonly vistaPreviaState = signal<string | null>(leerVistaPrevia(this.document));
  private readonly temasAdminState = signal<TemasAdmin | null>(null);
  private loadPromise: Promise<void> | null = null;

  readonly modoDemo = computed(() => this.aparienciaState()?.demoMode ?? false);
  readonly temas = computed<readonly Tema[]>(() => this.aparienciaState()?.themes ?? []);
  readonly temaActivo = computed<Tema | null>(() => {
    const apariencia = this.aparienciaState();
    return apariencia ? resolverTemaVisible(apariencia, null).tema : null;
  });
  readonly temaVisible = computed<TemaVisible | null>(() => {
    const apariencia = this.aparienciaState();
    return apariencia ? resolverTemaVisible(apariencia, this.vistaPreviaState()) : null;
  });

  /** Lista completa del Admin (`GET /bff/admin/themes`), con su revisión; null hasta `cargarTemas()`. */
  readonly temasAdmin = this.temasAdminState.asReadonly();
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  /** Motivo del último fallo, para mostrarlo. */
  readonly error = signal<string | null>(null);
  /** Error de regla del último guardado, con `code` y `details` para marcar el campo del formulario. */
  readonly errorDeRegla = signal<ReglaTemaError | null>(null);
  /** Aviso de datos desactualizados (AC-19). */
  readonly aviso = signal<string | null>(null);

  cargar(): Promise<void> {
    this.loadPromise ??= this.cargarApariencia();
    return this.loadPromise;
  }

  verTema(id: string): void {
    if (!this.modoDemo() || !this.temas().some((tema) => tema.id === id)) return;
    escribirVistaPrevia(this.document, id);
    this.vistaPreviaState.set(id);
    this.aplicar();
  }

  volverAlActivo(): void {
    borrarVistaPrevia(this.document);
    this.vistaPreviaState.set(null);
    this.aplicar();
  }

  async cargarTemas(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.temasAdminState.set(await this.gateway.temasAdmin(this.sesion.requireToken()));
    } catch (error) {
      if (error instanceof SesionVencidaError) this.sesion.expirar();
      this.error.set('No pudimos cargar los temas. Actualiza la página o vuelve a iniciar sesión.');
    } finally {
      this.cargando.set(false);
    }
  }

  crear(entrada: EntradaTema): Promise<boolean> {
    return this.guardar((revision, token) => this.gateway.crear(revision, entrada, token));
  }

  editar(id: string, entrada: EntradaTema): Promise<boolean> {
    return this.guardar((revision, token) => this.gateway.editar(id, revision, entrada, token));
  }

  borrar(id: string): Promise<boolean> {
    return this.guardar((revision, token) => this.gateway.borrar(id, revision, token));
  }

  activar(themeId: string): Promise<boolean> {
    return this.guardar((revision, token) => this.gateway.activar(themeId, revision, token));
  }

  /**
   * Envía un cambio sobre la revisión cargada. Devuelve false si no se guardó y deja el motivo en `error`,
   * `errorDeRegla` o `aviso`. Ante `TemasDesactualizadosError` recarga la lista y no vuelve a enviar el cambio.
   */
  private async guardar(enviar: (revision: number, token: string) => Promise<TemasAdmin>): Promise<boolean> {
    const actual = this.temasAdminState();
    if (!actual || this.guardando()) return false;
    this.guardando.set(true);
    this.error.set(null);
    this.errorDeRegla.set(null);
    this.aviso.set(null);
    try {
      const respuesta = await enviar(actual.revision, this.sesion.requireToken());
      this.temasAdminState.set(respuesta);
      this.sincronizarApariencia(respuesta);
      return true;
    } catch (error) {
      if (error instanceof SesionVencidaError) {
        this.sesion.expirar();
      } else if (error instanceof TemasDesactualizadosError) {
        this.aviso.set(AVISO_TEMAS_DESACTUALIZADOS);
        await this.cargarTemas();
      } else if (error instanceof ReglaTemaError) {
        this.errorDeRegla.set(error);
        this.error.set(error.message);
      } else {
        this.error.set('No pudimos guardar los cambios de los temas. Inténtalo nuevamente.');
      }
      return false;
    } finally {
      this.guardando.set(false);
    }
  }

  /** Lleva a la apariencia el resultado de un guardado: el tema activo nuevo se pinta sin recargar (AC-10). */
  private sincronizarApariencia(temasAdmin: TemasAdmin): void {
    const modoDemo = this.modoDemo();
    const activo = temasAdmin.themes.find((tema) => tema.id === temasAdmin.activeThemeId);
    this.aparienciaState.set({
      demoMode: modoDemo,
      activeThemeId: temasAdmin.activeThemeId,
      themes: modoDemo || !activo ? temasAdmin.themes : [activo],
    });
    this.descartarVistaPreviaInvalida();
    this.aplicar();
  }

  private async cargarApariencia(): Promise<void> {
    try {
      this.aparienciaState.set(await this.gateway.apariencia());
    } catch {
      this.aparienciaState.set(null);
      return;
    }
    this.descartarVistaPreviaInvalida();
    this.aplicar();
  }

  private descartarVistaPreviaInvalida(): void {
    if (this.temaVisible()?.borrarVistaPrevia) {
      borrarVistaPrevia(this.document);
      this.vistaPreviaState.set(null);
    }
  }

  private aplicar(): void {
    const visible = this.temaVisible();
    if (!visible) return;
    const { tema } = visible;
    const raiz = this.document.documentElement;
    for (const [nombre, valor] of Object.entries(tema.tokens)) {
      raiz.style.setProperty(nombre, valor);
    }
    const meta = this.document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema.colors.primary);
  }
}
