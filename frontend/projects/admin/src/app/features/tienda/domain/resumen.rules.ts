// Cada import cabe en una línea: resumen.rules.spec.mjs borra las líneas que empiezan por «import» antes de transpilar.
// prettier-ignore
import type { DiaDelMes, DistribucionEstados, FechaLima, IndicadoresResumen, PedidosDistrito, TramoMes } from './resumen.model';
import type { Cliente, EstadoPedido, Pedido } from './tienda.model';

const FORMATO_FECHA_LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha civil de Lima de un instante, sin depender de la zona del navegador o del CI. */
export function fechaEnLima(instante: string | Date): FechaLima {
  const partes = FORMATO_FECHA_LIMA.formatToParts(new Date(instante));
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((p) => p.type === tipo)?.value);
  return { anio: valor('year'), mes: valor('month'), dia: valor('day') };
}

/** Último día de un mes (`mes` de 1 a 12), con el calendario gregoriano y sin depender de la zona horaria. */
function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Tramos que se comparan: del día 1 a hoy en el mes en curso y los mismos días del mes anterior,
 * recortados a su último día si es más corto (en enero, el anterior es diciembre del año anterior).
 */
export function tramosDeComparacion(hoy: FechaLima): { actual: TramoMes; anterior: TramoMes } {
  const anioAnterior = hoy.mes === 1 ? hoy.anio - 1 : hoy.anio;
  const mesAnterior = hoy.mes === 1 ? 12 : hoy.mes - 1;
  return {
    actual: { anio: hoy.anio, mes: hoy.mes, desde: 1, hasta: hoy.dia },
    anterior: {
      anio: anioAnterior,
      mes: mesAnterior,
      desde: 1,
      hasta: Math.min(hoy.dia, diasDelMes(anioAnterior, mesAnterior)),
    },
  };
}

const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();

/**
 * Fecha de Lima del primer pedido (el de menor `createdAt`) de cada cliente, por correo normalizado como
 * en el BFF. Cuenta también los pedidos cancelados (D6 no los excluye). Los clientes sin pedidos no aparecen.
 */
export function clientesNuevosPorFecha(pedidos: readonly Pedido[]): Map<string, FechaLima> {
  const primeros = new Map<string, number>();
  for (const pedido of pedidos) {
    const correo = normalizarCorreo(pedido.customerEmail);
    const instante = new Date(pedido.createdAt).getTime();
    const previo = primeros.get(correo);
    if (previo === undefined || instante < previo) primeros.set(correo, instante);
  }
  return new Map([...primeros].map(([correo, instante]) => [correo, fechaEnLima(new Date(instante))]));
}

const redondearMonto = (valor: number) => Math.round(valor * 100) / 100;

/** Ventas: suma del `total` (productos y envío) de los pedidos no cancelados, a céntimos. */
const sumarVentas = (pedidos: readonly Pedido[]) =>
  redondearMonto(pedidos.filter((p) => p.status !== 'cancelled').reduce((suma, p) => suma + p.total, 0));

const estaEnTramo = (fecha: FechaLima, tramo: TramoMes) =>
  fecha.anio === tramo.anio &&
  fecha.mes === tramo.mes &&
  fecha.dia >= tramo.desde &&
  fecha.dia <= tramo.hasta;

/** Variación en % entero de `actual` respecto de `anterior`; `null` si `anterior` es 0 (nunca Infinity ni NaN). */
export function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  const variacion = Math.round(((actual - anterior) / anterior) * 100);
  // Math.round devuelve -0 para cambios menores a medio punto.
  return variacion === 0 ? 0 : variacion;
}

/** Pedidos y ventas (sin cancelados) de un tramo, y los clientes nuevos de ese tramo. */
function cifrasDelTramo(
  pedidos: readonly { fecha: FechaLima; pedido: Pedido }[],
  nuevos: readonly FechaLima[],
  tramo: TramoMes,
) {
  const delTramo = pedidos.filter(({ fecha }) => estaEnTramo(fecha, tramo)).map(({ pedido }) => pedido);
  return {
    pedidos: delTramo.length,
    ventas: sumarVentas(delTramo),
    clientes: nuevos.filter((fecha) => estaEnTramo(fecha, tramo)).length,
  };
}

/**
 * Cifras de las tarjetas del Resumen. El total es histórico (pedidos con cancelados, ventas con el `total` de los
 * no cancelados, todos los clientes); la variación compara el mes en curso con el mismo tramo del mes anterior.
 */
export function calcularIndicadores(
  pedidos: readonly Pedido[],
  clientes: readonly Cliente[],
  ahora: Date,
): IndicadoresResumen {
  const { actual, anterior } = tramosDeComparacion(fechaEnLima(ahora));
  const conFecha = pedidos.map((pedido) => ({ fecha: fechaEnLima(pedido.createdAt), pedido }));
  const nuevos = [...clientesNuevosPorFecha(pedidos).values()];
  const ahoraTramo = cifrasDelTramo(conFecha, nuevos, actual);
  const antesTramo = cifrasDelTramo(conFecha, nuevos, anterior);
  return {
    pedidos: {
      total: pedidos.length,
      variacion: variacionPorcentual(ahoraTramo.pedidos, antesTramo.pedidos),
    },
    ventas: {
      total: sumarVentas(pedidos),
      variacion: variacionPorcentual(ahoraTramo.ventas, antesTramo.ventas),
    },
    clientes: {
      total: clientes.length,
      variacion: variacionPorcentual(ahoraTramo.clientes, antesTramo.clientes),
    },
  };
}

/** Un punto por día del mes en curso de Lima, con los pedidos creados y los clientes nuevos de ese día. */
export function serieDelMes(pedidos: readonly Pedido[], ahora: Date): DiaDelMes[] {
  const { anio, mes } = fechaEnLima(ahora);
  const dias = diasDelMes(anio, mes);
  const pedidosPorDia = new Array<number>(dias).fill(0);
  const clientesPorDia = new Array<number>(dias).fill(0);
  const delMes = (fecha: FechaLima) => fecha.anio === anio && fecha.mes === mes;
  for (const pedido of pedidos) {
    const fecha = fechaEnLima(pedido.createdAt);
    if (delMes(fecha)) pedidosPorDia[fecha.dia - 1]++;
  }
  for (const fecha of clientesNuevosPorFecha(pedidos).values()) {
    if (delMes(fecha)) clientesPorDia[fecha.dia - 1]++;
  }
  return pedidosPorDia.map((total, i) => ({ dia: i + 1, pedidos: total, clientesNuevos: clientesPorDia[i] }));
}

const claveDistrito = (distrito: string) => distrito.trim().toLocaleLowerCase('es-PE');

/**
 * Los distritos con más pedidos, de mayor a menor, contando todos los pedidos (también los cancelados).
 * Agrupa sin distinguir mayúsculas ni espacios y muestra la primera forma escrita; en empate, por nombre.
 */
export function distritosConMasPedidos(pedidos: readonly Pedido[], limite = 5): PedidosDistrito[] {
  const grupos = new Map<string, PedidosDistrito>();
  for (const { district } of pedidos) {
    const clave = claveDistrito(district);
    const grupo = grupos.get(clave);
    if (grupo) grupos.set(clave, { ...grupo, pedidos: grupo.pedidos + 1 });
    else grupos.set(clave, { distrito: district.trim(), pedidos: 1 });
  }
  return [...grupos.values()]
    .sort((a, b) => b.pedidos - a.pedidos || a.distrito.localeCompare(b.distrito, 'es-PE'))
    .slice(0, limite);
}

/** Los pedidos más recientes por `createdAt`, del más nuevo al más antiguo, sin depender del orden recibido. */
export function ultimosPedidos(pedidos: readonly Pedido[], limite = 5): Pedido[] {
  return [...pedidos]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limite);
}

/** Posición del grupo de un estado en `DistribucionEstados`: completados, en proceso y otros (D8). */
const grupoDelEstado = (estado: EstadoPedido): 0 | 1 | 2 =>
  estado === 'delivered' ? 0 : estado === 'cancelled' ? 2 : 1;

/**
 * Porcentaje entero de pedidos por grupo de estado (D8): completados = Entregado; en proceso = Confirmado,
 * En preparación y Enviado; otros = Cancelado. Suma exactamente 100 con el método del mayor resto (en empate de
 * restos, en el orden completados, en proceso y otros); sin pedidos, 0, 0 y 0.
 */
export function distribucionPorEstado(pedidos: readonly Pedido[]): DistribucionEstados {
  const cuentas = [0, 0, 0];
  for (const { status } of pedidos) cuentas[grupoDelEstado(status)]++;
  const total = pedidos.length;
  if (total === 0) return { completados: 0, enProceso: 0, otros: 0 };
  // Aritmética entera: cuenta × 100 = parte entera × total + resto.
  const porcentajes = cuentas.map((cuenta) => Math.floor((cuenta * 100) / total));
  const restos = cuentas.map((cuenta) => (cuenta * 100) % total);
  const orden = [0, 1, 2].sort((a, b) => restos[b] - restos[a] || a - b);
  const faltan = 100 - porcentajes.reduce((suma, valor) => suma + valor, 0);
  for (const indice of orden.slice(0, faltan)) porcentajes[indice]++;
  return { completados: porcentajes[0], enProceso: porcentajes[1], otros: porcentajes[2] };
}
