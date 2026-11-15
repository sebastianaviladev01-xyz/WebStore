import { Rol } from '../../sesion/domain/rol.rules';
import { UsuarioAdmin } from '../../sesion/domain/usuario-admin.model';
import { EstadoFiltro } from './filtro-catalogo.model';
import { leerEstado, ParametrosUrl, sinPorDefecto } from './filtro-catalogo.rules';
import { EstadoStock, estadoDeStock } from './inventario.rules';
import { contieneTexto } from './listado.rules';
import { filtrarTarifas } from './tarifa-envio.rules';
import { Banner, Cliente, EstadoPedido, Pedido, Producto, Reclamo, TarifaEnvio } from './tienda.model';

/*
 * Filtros de los demás listados del Admin (lote 07, ADR-0017; PBI-0139), con la disposición estándar de la feature
 * 008: un texto en cada uno y, donde existe, el estado o el rol. Viven en la URL como los del catálogo (`texto`,
 * `estado` y `rol`), sin los valores por defecto. El texto no distingue mayúsculas ni tildes.
 */

export interface FiltrosInventario {
  /** Nombre o SKU del producto. */
  readonly texto: string;
  readonly estado: 'todos' | EstadoStock;
}

export interface FiltrosClientes {
  /** Nombre, correo o documento. */
  readonly texto: string;
}

export interface FiltrosUsuarios {
  /** Nombre o correo. */
  readonly texto: string;
  /** Vacío: todos los roles. */
  readonly rol: Rol | '';
  readonly estado: EstadoFiltro;
}

export interface FiltrosBanners {
  /** Título del banner. */
  readonly texto: string;
  readonly estado: EstadoFiltro;
}

export interface FiltrosReclamos {
  /** Código, asunto, nombre o correo de quien reclama. */
  readonly texto: string;
  /** Vacío: todos los estados. */
  readonly estado: Reclamo['status'] | '';
}

/** Pedidos (lote 07b, PBI-0155): el filtro de estado que ya tenía, ahora en el panel estándar. */
export interface FiltrosPedidos {
  /** Vacío: todos los estados. */
  readonly estado: EstadoPedido | '';
}

/** Tarifas de envío (lote 07b, PBI-0155): la búsqueda y el origen que ya tenía, ahora en el panel estándar. */
export interface FiltrosTarifas {
  /** Distrito u origen. */
  readonly texto: string;
  /** Vacío: todos los orígenes. */
  readonly origen: string;
}

export const FILTROS_PEDIDOS_VACIOS: FiltrosPedidos = { estado: '' };
export const FILTROS_TARIFAS_VACIOS: FiltrosTarifas = { texto: '', origen: '' };
export const FILTROS_INVENTARIO_VACIOS: FiltrosInventario = { texto: '', estado: 'todos' };
export const FILTROS_CLIENTES_VACIOS: FiltrosClientes = { texto: '' };
export const FILTROS_USUARIOS_VACIOS: FiltrosUsuarios = { texto: '', rol: '', estado: 'todos' };
export const FILTROS_BANNERS_VACIOS: FiltrosBanners = { texto: '', estado: 'todos' };
export const FILTROS_RECLAMOS_VACIOS: FiltrosReclamos = { texto: '', estado: '' };

const ESTADOS_STOCK: readonly EstadoStock[] = ['sin-stock', 'stock-bajo', 'disponible'];
const ROLES_FILTRO: readonly Rol[] = ['superadmin', 'admin', 'vendedor'];
const ESTADOS_RECLAMO: readonly Reclamo['status'][] = ['received', 'in-review', 'resolved'];
const ESTADOS_PEDIDO: readonly EstadoPedido[] = [
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const cumpleEstadoActivo = (activo: boolean, estado: EstadoFiltro) =>
  estado === 'todos' || (estado === 'activos') === activo;
const algunoContiene = (valores: readonly string[], texto: string) =>
  valores.some((valor) => contieneTexto(valor, texto));
const deLista = <T extends string>(valores: readonly T[], valor: string | undefined): T | '' =>
  valores.find((candidato) => candidato === valor) ?? '';

export function filtrarInventario<T extends Pick<Producto, 'name' | 'sku' | 'stock'>>(
  productos: readonly T[],
  filtros: FiltrosInventario,
): readonly T[] {
  return productos.filter(
    (producto) =>
      algunoContiene([producto.name, producto.sku], filtros.texto) &&
      (filtros.estado === 'todos' || estadoDeStock(producto.stock) === filtros.estado),
  );
}

export function filtrarClientes<T extends Pick<Cliente, 'name' | 'email' | 'document'>>(
  clientes: readonly T[],
  filtros: FiltrosClientes,
): readonly T[] {
  return clientes.filter((cliente) =>
    algunoContiene([cliente.name, cliente.email, cliente.document], filtros.texto),
  );
}

export function filtrarUsuarios<T extends Pick<UsuarioAdmin, 'name' | 'email' | 'role' | 'active'>>(
  usuarios: readonly T[],
  filtros: FiltrosUsuarios,
): readonly T[] {
  return usuarios.filter(
    (usuario) =>
      algunoContiene([usuario.name, usuario.email], filtros.texto) &&
      (!filtros.rol || usuario.role === filtros.rol) &&
      cumpleEstadoActivo(usuario.active, filtros.estado),
  );
}

export function filtrarBanners<T extends Pick<Banner, 'title' | 'active'>>(
  banners: readonly T[],
  filtros: FiltrosBanners,
): readonly T[] {
  return banners.filter(
    (banner) =>
      contieneTexto(banner.title, filtros.texto) && cumpleEstadoActivo(banner.active, filtros.estado),
  );
}

export function filtrarReclamos<T extends Pick<Reclamo, 'id' | 'subject' | 'name' | 'email' | 'status'>>(
  reclamos: readonly T[],
  filtros: FiltrosReclamos,
): readonly T[] {
  return reclamos.filter(
    (reclamo) =>
      algunoContiene([reclamo.id, reclamo.subject, reclamo.name, reclamo.email], filtros.texto) &&
      (!filtros.estado || reclamo.status === filtros.estado),
  );
}

export function leerFiltrosInventario(parametros: ParametrosUrl): FiltrosInventario {
  return {
    texto: parametros['texto'] ?? '',
    estado: deLista(ESTADOS_STOCK, parametros['estado']) || 'todos',
  };
}

export function leerFiltrosClientes(parametros: ParametrosUrl): FiltrosClientes {
  return { texto: parametros['texto'] ?? '' };
}

export function leerFiltrosUsuarios(parametros: ParametrosUrl): FiltrosUsuarios {
  return {
    texto: parametros['texto'] ?? '',
    rol: deLista(ROLES_FILTRO, parametros['rol']),
    estado: leerEstado(parametros['estado']),
  };
}

export function leerFiltrosBanners(parametros: ParametrosUrl): FiltrosBanners {
  return { texto: parametros['texto'] ?? '', estado: leerEstado(parametros['estado']) };
}

export function leerFiltrosReclamos(parametros: ParametrosUrl): FiltrosReclamos {
  return { texto: parametros['texto'] ?? '', estado: deLista(ESTADOS_RECLAMO, parametros['estado']) };
}

export function parametrosDeFiltrosInventario(filtros: FiltrosInventario): Record<string, string> {
  return sinPorDefecto({ texto: filtros.texto, estado: filtros.estado });
}

export function parametrosDeFiltrosClientes(filtros: FiltrosClientes): Record<string, string> {
  return sinPorDefecto({ texto: filtros.texto });
}

export function parametrosDeFiltrosUsuarios(filtros: FiltrosUsuarios): Record<string, string> {
  return sinPorDefecto({ texto: filtros.texto, rol: filtros.rol, estado: filtros.estado });
}

export function parametrosDeFiltrosBanners(filtros: FiltrosBanners): Record<string, string> {
  return sinPorDefecto({ texto: filtros.texto, estado: filtros.estado });
}

export function parametrosDeFiltrosReclamos(filtros: FiltrosReclamos): Record<string, string> {
  return sinPorDefecto({ texto: filtros.texto, estado: filtros.estado });
}

export function filtrarPedidos<T extends Pick<Pedido, 'status'>>(
  pedidos: readonly T[],
  filtros: FiltrosPedidos,
): readonly T[] {
  return pedidos.filter((pedido) => !filtros.estado || pedido.status === filtros.estado);
}

/** Las de un origen (o de todos) con el texto en el distrito o el origen, ordenadas como antes (`filtrarTarifas`). */
export function filtrarTarifasDeEnvio(
  tarifas: readonly TarifaEnvio[],
  filtros: FiltrosTarifas,
): readonly TarifaEnvio[] {
  return filtrarTarifas(tarifas, filtros.origen, filtros.texto);
}

export function leerFiltrosPedidos(parametros: ParametrosUrl): FiltrosPedidos {
  return { estado: deLista(ESTADOS_PEDIDO, parametros['estado']) };
}

export function leerFiltrosTarifas(parametros: ParametrosUrl): FiltrosTarifas {
  return { texto: parametros['texto'] ?? '', origen: parametros['origen'] ?? '' };
}

export function parametrosDeFiltrosPedidos(filtros: FiltrosPedidos): Record<string, string> {
  return sinPorDefecto({ estado: filtros.estado });
}

export function parametrosDeFiltrosTarifas(filtros: FiltrosTarifas): Record<string, string> {
  return sinPorDefecto({ texto: filtros.texto, origen: filtros.origen });
}
