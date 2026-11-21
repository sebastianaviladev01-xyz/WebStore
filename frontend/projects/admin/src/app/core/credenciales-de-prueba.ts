import { InjectionToken, Signal, signal } from '@angular/core';

/**
 * Si el acceso muestra las credenciales de prueba, como señal (lote 06, PBI-0071). Lo provee la raíz de composición
 * con la apariencia que carga `TemasFacade`: en modo demo (ADR-0012) o si el BFF las pide sin él, como la demo
 * publicada (ADR-0020). Sin proveedor, o mientras no se sabe, es false. Nunca en la instalación de un cliente.
 */
export const CREDENCIALES_DE_PRUEBA = new InjectionToken<Signal<boolean>>('CREDENCIALES_DE_PRUEBA', {
  factory: () => signal(false).asReadonly(),
});
