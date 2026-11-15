import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';

import { VisitaGateway } from '../domain/visita.gateway';
import { idDeVisitaValido, INTERVALO_DE_LATIDO_MS, nuevoIdDeVisita } from '../domain/visita.rules';

/** Clave de la pestaña en `sessionStorage`: muere al cerrarla y no se comparte con otras pestañas ni con el BFF. */
const CLAVE_DE_LA_PESTANA = 'webstore-visita-v1';

/**
 * Latido de la tienda para «Personas en línea» del Admin (lote 07b, ADR-0017, PBI-0027; provisional, por confirmar con
 * Daniel). Al abrirse y cada minuto mientras la pestaña está visible, envía un identificador aleatorio de la pestaña.
 * No hay cookie ni datos de la persona: el identificador vive en `sessionStorage` de esa pestaña (si el navegador lo
 * bloquea, solo en memoria). Un fallo del BFF no se avisa: es una cifra del Admin, no algo que necesite el comprador.
 */
@Injectable({ providedIn: 'root' })
export class VisitasFacade {
  private readonly gateway = inject(VisitaGateway);
  private readonly documento = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private iniciado = false;
  private idEnMemoria: string | null = null;

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    const ventana = this.documento.defaultView;
    if (!ventana) return;
    const latir = () => {
      if (this.documento.visibilityState === 'visible') void this.gateway.latido(this.id()).catch(() => {});
    };
    latir();
    const intervalo = ventana.setInterval(latir, INTERVALO_DE_LATIDO_MS);
    this.documento.addEventListener('visibilitychange', latir);
    this.destroyRef.onDestroy(() => {
      ventana.clearInterval(intervalo);
      this.documento.removeEventListener('visibilitychange', latir);
    });
  }

  private id(): string {
    try {
      const guardado = sessionStorage.getItem(CLAVE_DE_LA_PESTANA);
      if (idDeVisitaValido(guardado)) return guardado;
      const nuevo = nuevoIdDeVisita();
      sessionStorage.setItem(CLAVE_DE_LA_PESTANA, nuevo);
      return nuevo;
    } catch {
      this.idEnMemoria ??= nuevoIdDeVisita();
      return this.idEnMemoria;
    }
  }
}
