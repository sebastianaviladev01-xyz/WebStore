// Cada import cabe en una línea: resumen.rules.spec.mjs borra las líneas que empiezan por «import» antes de transpilar.
// prettier-ignore
import type { AgrupacionDeSerie, DiaDelMes, DistribucionEstados, FechaLima, IndicadoresResumen, PuntoDeSerie, SerieDelPeriodo, TramoDeTiempo } from './resumen.model';
import type { EstadoPedido, EventoActividad, Pedido } from './tienda.model';
import { ETIQUETAS_ESTADO_PEDIDO } from './tienda.model';
import { normalizarCorreo } from './correo.rules';
// prettier-ignore
import { diasDelMes, estaEnTramo, fechaEnLima, medianocheEnLima, opcionDelPeriodo, PERIODO_POR_OMISION, type Periodo, tramosDelPeriodo } from './periodo.rules';

/** Instante del primer pedido (el de menor `createdAt`) de cada cliente, por correo normalizado como en el BFF. */
function primerPedidoDeCadaCliente(pedidos: readonly Pedido[]): Map<string, number> {
  const primeros = new Map<string, number>();
  for (const pedido of pedidos) {
    const correo = normalizarCorreo(pedido.customerEmail);
    const instante = new Date(pedido.createdAt).getTime();
    const previo = primeros.get(correo);
    if (previo === undefined || instante < previo) primeros.set(correo, instante);
  }
  return primeros;
}

/**
 * Fecha de Lima del primer pedido (el de menor `createdAt`) de cada cliente, por correo normalizado como
 * en el BFF. Cuenta también los pedidos cancelados (D6 no los excluye). Los clientes sin pedidos no aparecen.
 */
export function clientesNuevosPorFecha(pedidos: readonly Pedido[]): Map<string, FechaLima> {
  return new Map(
    [...primerPedidoDeCadaCliente(pedidos)].map(([correo, instante]) => [
      correo,
      fechaEnLima(new Date(instante)),
    ]),
  );
}

const redondearMonto = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Ventas: suma del valor de los productos (`subtotal`, IGV incluido) de los pedidos no cancelados, sin el costo del
 * envío, a céntimos (lote 13, ADR-0021, PBI-0186).
 */
const sumarVentas = (pedidos: readonly Pedido[]) =>
  redondearMonto(pedidos.filter((p) => p.status !== 'cancelled').reduce((suma, p) => suma + p.subtotal, 0));

/** Variación en % entero de `actual` respecto de `anterior`; `null` si `anterior` es 0 (nunca Infinity ni NaN). */
export function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  const variacion = Math.round(((actual - anterior) / anterior) * 100);
  // Math.round devuelve -0 para cambios menores a medio punto.
  return variacion === 0 ? 0 : variacion;
}

/** Pedidos y ventas (sin cancelados) de un tramo, y los clientes nuevos de ese tramo. */
function cifrasDelTramo(pedidos: readonly Pedido[], nuevos: readonly number[], tramo: TramoDeTiempo) {
  const delTramo = pedidos.filter((pedido) => estaEnTramo(pedido.createdAt, tramo));
  return {
    pedidos: delTramo.length,
    ventas: sumarVentas(delTramo),
    clientes: nuevos.filter((instante) => estaEnTramo(new Date(instante), tramo)).length,
  };
}

/**
 * Cifras de las tarjetas del Dashboard para el periodo del filtro principal (lote 45, ADR-0033, PBI-0270; «Mes actual»
 * por omisión): los pedidos creados en el tramo actual (con los cancelados), sus ventas (el `subtotal` de los no
 * cancelados) y los clientes web nuevos (su primer pedido cae en el tramo), y la variación de cada una frente al tramo
 * equivalente anterior (`tramosDelPeriodo`). Hasta el lote 45 la cifra era el total histórico (feature 001, REQ-02) y
 * la variación, siempre la del mes en curso.
 */
export function calcularIndicadores(
  pedidos: readonly Pedido[],
  ahora: Date,
  periodo: Periodo = PERIODO_POR_OMISION,
): IndicadoresResumen {
  const { actual, anterior } = tramosDelPeriodo(periodo, ahora);
  const nuevos = [...primerPedidoDeCadaCliente(pedidos).values()];
  const ahoraTramo = cifrasDelTramo(pedidos, nuevos, actual);
  const antesTramo = cifrasDelTramo(pedidos, nuevos, anterior);
  return {
    pedidos: {
      total: ahoraTramo.pedidos,
      variacion: variacionPorcentual(ahoraTramo.pedidos, antesTramo.pedidos),
    },
    ventas: {
      total: ahoraTramo.ventas,
      variacion: variacionPorcentual(ahoraTramo.ventas, antesTramo.ventas),
    },
    clientes: {
      total: ahoraTramo.clientes,
      variacion: variacionPorcentual(ahoraTramo.clientes, antesTramo.clientes),
    },
  };
}

/** Los pedidos creados en el tramo actual del periodo, en el orden recibido: «Pedidos por estado» y la distribución. */
export function pedidosDelPeriodo(
  pedidos: readonly Pedido[],
  ahora: Date,
  periodo: Periodo = PERIODO_POR_OMISION,
): Pedido[] {
  const { actual } = tramosDelPeriodo(periodo, ahora);
  return pedidos.filter((pedido) => estaEnTramo(pedido.createdAt, actual));
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

/** Los meses en español de Perú, como los escribe `Intl` con `es-PE` («setiembre»). */
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const UNA_HORA = 60 * 60 * 1000;
const dosCifras = (numero: number) => String(numero).padStart(2, '0');
const nombreDelMes = (mes: number) => MESES[mes - 1] ?? '';

/** Un cubo del gráfico: el tramo que reúne (`desde` incluido y `hasta` excluido), su etiqueta y su nombre. */
interface Cubo extends TramoDeTiempo {
  readonly etiqueta: string;
  readonly nombre: string;
}

/** Los cubos del gráfico de un periodo, en hora de Lima. */
function cubosDelPeriodo(periodo: Periodo, ahora: Date): { agrupacion: AgrupacionDeSerie; cubos: Cubo[] } {
  const { actual } = tramosDelPeriodo(periodo, ahora);
  const inicio = fechaEnLima(new Date(actual.desde));
  const delDia = (desplazamiento: number): Cubo => {
    const desde = medianocheEnLima(inicio.anio, inicio.mes, inicio.dia + desplazamiento);
    const fecha = fechaEnLima(new Date(desde));
    return {
      desde,
      hasta: medianocheEnLima(fecha.anio, fecha.mes, fecha.dia + 1),
      etiqueta: String(fecha.dia),
      nombre: periodo === 'mes' ? `Día ${fecha.dia}` : `Día ${dosCifras(fecha.dia)}/${dosCifras(fecha.mes)}`,
    };
  };
  switch (periodo) {
    case 'hoy':
      // Las 24 horas del día de Lima, aunque las últimas aún no lleguen.
      return {
        agrupacion: 'hora',
        cubos: Array.from({ length: 24 }, (_, hora) => ({
          desde: actual.desde + hora * UNA_HORA,
          hasta: actual.desde + (hora + 1) * UNA_HORA,
          etiqueta: String(hora),
          nombre: `${hora}:00`,
        })),
      };
    case '7-dias':
    case '30-dias':
      return {
        agrupacion: 'dia',
        cubos: Array.from({ length: periodo === '7-dias' ? 7 : 30 }, (_, dia) => delDia(dia)),
      };
    case 'trimestre': {
      // De lunes a domingo; la primera semana empieza el primer día del trimestre y la última termina hoy.
      const cubos: Cubo[] = [];
      for (let desde = actual.desde; desde < actual.hasta;) {
        const fecha = fechaEnLima(new Date(desde));
        const diaDeLaSemana = new Date(Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia)).getUTCDay();
        const hastaElLunes = (8 - diaDeLaSemana) % 7 || 7;
        const hasta = Math.min(
          medianocheEnLima(fecha.anio, fecha.mes, fecha.dia + hastaElLunes),
          actual.hasta,
        );
        const etiqueta = `${dosCifras(fecha.dia)}/${dosCifras(fecha.mes)}`;
        cubos.push({ desde, hasta, etiqueta, nombre: `Semana del ${etiqueta}` });
        desde = hasta;
      }
      return { agrupacion: 'semana', cubos };
    }
    case 'anio':
      return {
        agrupacion: 'mes',
        cubos: MESES.map((nombre, indice) => ({
          desde: medianocheEnLima(inicio.anio, indice + 1, 1),
          hasta: medianocheEnLima(inicio.anio, indice + 2, 1),
          etiqueta: nombre.slice(0, 3),
          nombre,
        })),
      };
    case 'mes':
    default:
      // Todo el mes en curso, como antes del filtro: también los días que aún no llegan.
      return {
        agrupacion: 'dia',
        cubos: Array.from({ length: diasDelMes(inicio.anio, inicio.mes) }, (_, dia) => delDia(dia)),
      };
  }
}

/** El tramo actual del periodo en palabras: «26 de noviembre de 2026», «Del 20 al 26 de noviembre de 2026»… */
function descripcionDelTramo(periodo: Periodo, ahora: Date): string {
  const { actual } = tramosDelPeriodo(periodo, ahora);
  const desde = fechaEnLima(new Date(actual.desde));
  const hasta = fechaEnLima(ahora);
  if (periodo === 'mes') return `${nombreDelMes(hasta.mes)} de ${hasta.anio}`;
  const completa = (fecha: FechaLima) => `${fecha.dia} de ${nombreDelMes(fecha.mes)} de ${fecha.anio}`;
  if (periodo === 'hoy') return completa(hasta);
  if (desde.anio !== hasta.anio) return `Del ${completa(desde)} al ${completa(hasta)}`;
  if (desde.mes !== hasta.mes) return `Del ${desde.dia} de ${nombreDelMes(desde.mes)} al ${completa(hasta)}`;
  return `Del ${desde.dia} al ${completa(hasta)}`;
}

/**
 * Gráfico de pedidos y clientes web nuevos del periodo del filtro principal (auditoría del lote 45, PBI-0270): por hora
 * con «Hoy»; por día con «Últimos 7 días», «Últimos 30 días» y «Mes actual» (todo el mes, igual que `serieDelMes`); por
 * semana de lunes a domingo con «Trimestre actual», desde su primer día hasta hoy; y por mes con «Año actual», de enero
 * a diciembre. Un cliente es nuevo en el punto de su primer pedido (`primerPedidoDeCadaCliente`); lo que cae fuera de
 * los puntos no cuenta.
 */
export function serieDelPeriodo(
  pedidos: readonly Pedido[],
  ahora: Date,
  periodo: Periodo = PERIODO_POR_OMISION,
): SerieDelPeriodo {
  const { agrupacion, cubos } = cubosDelPeriodo(periodo, ahora);
  const contar = (instantes: readonly number[]) =>
    cubos.map(
      (cubo) => instantes.filter((instante) => instante >= cubo.desde && instante < cubo.hasta).length,
    );
  const pedidosPorCubo = contar(pedidos.map((pedido) => new Date(pedido.createdAt).getTime()));
  const clientesPorCubo = contar([...primerPedidoDeCadaCliente(pedidos).values()]);
  const puntos: PuntoDeSerie[] = cubos.map(({ etiqueta, nombre }, indice) => ({
    etiqueta,
    nombre,
    pedidos: pedidosPorCubo[indice] ?? 0,
    clientesNuevos: clientesPorCubo[indice] ?? 0,
  }));
  return { agrupacion, descripcion: descripcionDelTramo(periodo, ahora), puntos };
}

/** Los pedidos más recientes por `createdAt`, del más nuevo al más antiguo, sin depender del orden recibido. */
export function ultimosPedidos(pedidos: readonly Pedido[], limite = 5): Pedido[] {
  return [...pedidos]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limite);
}

/** Grupos de estado del Dashboard (D8), en el orden de las barras. */
export type GrupoDeEstado = keyof DistribucionEstados;

const GRUPOS_DE_ESTADO: readonly {
  clave: GrupoDeEstado;
  nombre: string;
  estados: readonly EstadoPedido[];
}[] = [
  { clave: 'completados', nombre: 'Completados', estados: ['delivered'] },
  { clave: 'enProceso', nombre: 'En proceso', estados: ['confirmed', 'processing', 'shipped'] },
  { clave: 'otros', nombre: 'Otros', estados: ['cancelled'] },
];

/** Posición del grupo de un estado en `GRUPOS_DE_ESTADO` y en `DistribucionEstados` (D8). */
const grupoDelEstado = (estado: EstadoPedido): number =>
  GRUPOS_DE_ESTADO.findIndex((grupo) => grupo.estados.includes(estado));

/** Etiquetas de los estados de un grupo: «Confirmado, en preparación y enviado» (la primera con mayúscula). */
function detalleDelGrupo(estados: readonly EstadoPedido[]): string {
  const etiquetas = estados.map((estado, indice) =>
    indice === 0 ? ETIQUETAS_ESTADO_PEDIDO[estado] : ETIQUETAS_ESTADO_PEDIDO[estado].toLowerCase(),
  );
  return etiquetas.length < 2
    ? etiquetas.join('')
    : `${etiquetas.slice(0, -1).join(', ')} y ${etiquetas.at(-1)}`;
}

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

/**
 * Actividad reciente del Dashboard (lote 07b, ADR-0017, PBI-0028): los `limite` eventos más recientes, del último al
 * primero. El BFF guarda los últimos 50.
 */
export function actividadReciente(eventos: readonly EventoActividad[], limite = 10): EventoActividad[] {
  return [...eventos].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limite);
}

/** Una barra de «Pedidos por estado»: su grupo, su nombre, los estados que reúne y su porcentaje (PBI-0079). */
export interface BarraDeEstado {
  readonly clave: GrupoDeEstado;
  readonly nombre: string;
  readonly detalle: string;
  readonly porcentaje: number;
}

/** Las tres barras de «Pedidos por estado», con la agrupación de D8 definida solo aquí. */
export function gruposDeEstado(pedidos: readonly Pedido[]): BarraDeEstado[] {
  const distribucion = distribucionPorEstado(pedidos);
  return GRUPOS_DE_ESTADO.map(({ clave, nombre, estados }) => ({
    clave,
    nombre,
    detalle: detalleDelGrupo(estados),
    porcentaje: distribucion[clave],
  }));
}

/** Cómo cambió una cifra frente al tramo anterior del periodo; sin dato si el tramo anterior valía 0. */
export type Tendencia = 'sube' | 'baja' | 'igual' | 'sin-dato';

/** `variacion` sin valor (`undefined`) es una tarjeta sin variación; `null`, un tramo anterior sin datos. */
export function tendenciaDeVariacion(variacion: number | null | undefined): Tendencia | null {
  if (variacion === undefined) return null;
  if (variacion === null) return 'sin-dato';
  if (variacion > 0) return 'sube';
  return variacion < 0 ? 'baja' : 'igual';
}

/** Texto de la variación con su signo (menos tipográfico U+2212); «—» sin dato. */
export function textoDeVariacion(variacion: number | null | undefined): string {
  if (variacion === undefined || variacion === null) return '—';
  if (variacion > 0) return `+${variacion} %`;
  return variacion < 0 ? `−${Math.abs(variacion)} %` : '0 %';
}

/**
 * Lo que lee un lector de pantalla en lugar de la flecha de la tendencia. Sin dato, nombra el tramo anterior del
 * periodo (lote 45, PBI-0270): «Sin datos de ayer», «Sin datos del mes anterior»…
 */
export function lecturaDeTendencia(tendencia: Tendencia, periodo: Periodo = PERIODO_POR_OMISION): string {
  if (tendencia === 'sin-dato') return opcionDelPeriodo(periodo).sinDatos;
  return { sube: 'Sube', baja: 'Baja', igual: 'Sin cambio' }[tendencia];
}

/** Insignia de cada tipo de evento de «Actividad reciente» (lote 45, PBI-0270), como «Últimos movimientos» del SGC. */
const TIPOS_DE_EVENTO: Readonly<Record<EventoActividad['type'], string>> = {
  'order-created': 'Pedido',
  'order-status-changed': 'Estado',
  'account-registered': 'Cuenta',
  'complaint-registered': 'Reclamo',
};

/** El nombre de la insignia de un evento; «Evento» para un tipo que el panel aún no conoce. */
export function tipoDeEvento(tipo: string): string {
  return Object.hasOwn(TIPOS_DE_EVENTO, tipo) ? TIPOS_DE_EVENTO[tipo as EventoActividad['type']] : 'Evento';
}
