import type { TarifaEnvio } from '../../envios/domain/envio.model';
import type { DireccionEnvio } from './pedido.model';

/**
 * Una dirección por pedido o una por producto (lote 19, ADR-0021, PBI-0006; provisional, por confirmar con Daniel).
 * Daniel: «la configuración de la tienda decidirá si un pedido lleva una sola dirección de entrega o una por producto».
 * La tienda repite la regla del BFF (`backend/src/domain/pedidos/direcciones-por-producto.rules.mjs`) para mostrar el
 * envío antes de enviar el pedido; el BFF lo vuelve a calcular y decide.
 */
export type ModoDeDireccion = 'per-order' | 'per-product';

/** Una dirección por producto solo si la configuración lo elige; cualquier otro valor, o ninguno, una por pedido. */
export function modoDeDireccion(configuracion: { readonly deliveryAddressMode?: string }): ModoDeDireccion {
  return configuracion.deliveryAddressMode === 'per-product' ? 'per-product' : 'per-order';
}

const comparable = (valor: string | undefined): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const CAMPOS_DEL_DESTINO = ['addressLine', 'district', 'province', 'department'] as const;

/** El mismo destino: dirección, distrito, provincia y departamento sin tildes, mayúsculas ni espacios de más. */
export const mismaDireccion = (a: DireccionEnvio, b: DireccionEnvio): boolean =>
  CAMPOS_DEL_DESTINO.every((campo) => comparable(a[campo]) === comparable(b[campo]));

/** Las direcciones distintas que usan las líneas (la propia o la principal), en el orden de las líneas. */
export function destinosDelPedido(
  principal: DireccionEnvio,
  lineas: readonly { readonly shipping?: DireccionEnvio | null }[],
): DireccionEnvio[] {
  const destinos: DireccionEnvio[] = [];
  for (const linea of lineas) {
    const direccion = linea.shipping ?? principal;
    if (!destinos.some((destino) => mismaDireccion(destino, direccion))) destinos.push(direccion);
  }
  return destinos;
}

export interface EnvioPorDestinos {
  readonly total: number;
  readonly desglose: readonly { readonly direccion: DireccionEnvio; readonly precio: number }[];
}

/** La tarifa más baja del distrito, la de la tienda más próxima (la misma regla del BFF), o null si no llega. */
function tarifaMasBaja(tarifas: readonly TarifaEnvio[], distrito: string): number | null {
  const precios = tarifas.filter((tarifa) => tarifa.destination === distrito).map((tarifa) => tarifa.price);
  return precios.length ? Math.min(...precios) : null;
}

/** Una tarifa por destino distinto, no por línea, con su desglose; null si algún destino no tiene tarifa. */
export function envioPorDestinos(
  tarifas: readonly TarifaEnvio[],
  destinos: readonly DireccionEnvio[],
): EnvioPorDestinos | null {
  const desglose: { direccion: DireccionEnvio; precio: number }[] = [];
  for (const direccion of destinos) {
    const precio = tarifaMasBaja(tarifas, direccion.district);
    if (precio === null) return null;
    desglose.push({ direccion, precio });
  }
  if (!desglose.length) return null;
  const total = Math.round(desglose.reduce((suma, destino) => suma + destino.precio, 0) * 100) / 100;
  return { total, desglose };
}

/** La dirección en una línea de texto, con la referencia entre paréntesis si la trae. */
export function direccionVisible(direccion: DireccionEnvio): string {
  const texto = [direccion.addressLine, direccion.district, direccion.province, direccion.department].join(
    ', ',
  );
  const referencia = direccion.reference?.trim();
  return referencia ? `${texto} (${referencia})` : texto;
}
