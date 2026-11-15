import { InjectionToken, Signal, signal } from '@angular/core';

/**
 * Si el BFF está en modo demo (ADR-0012), como señal. Lo provee la raíz de composición con la apariencia que carga
 * `TemasFacade`; sin proveedor, o mientras no se sabe, es false. El acceso muestra las credenciales de prueba solo
 * en modo demo (lote 06, PBI-0071), nunca en la instalación de un cliente.
 */
export const MODO_DEMO = new InjectionToken<Signal<boolean>>('MODO_DEMO', {
  factory: () => signal(false).asReadonly(),
});
