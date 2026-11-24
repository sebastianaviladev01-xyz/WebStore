import type { ConfiguracionTienda, LugarDeSugeridos } from './contenido.model';

/** Lo de siempre y lo que Daniel dijo que basta: el diálogo «Producto agregado» (PBI-0179). */
export const LUGAR_DE_SUGERIDOS_POR_DEFECTO: LugarDeSugeridos = 'dialog';

/**
 * Dónde muestra la tienda «Producto agregado» con los sugeridos (lote 16, ADR-0021, PBI-0179; provisional): el panel
 * lateral solo si la configuración lo elige; cualquier otro valor, o ninguno, es el diálogo.
 */
export function lugarDeLosSugeridos(
  configuracion: Partial<Pick<ConfiguracionTienda, 'addToCartDisplay'>>,
): LugarDeSugeridos {
  return configuracion.addToCartDisplay === 'side-panel' ? 'side-panel' : LUGAR_DE_SUGERIDOS_POR_DEFECTO;
}
