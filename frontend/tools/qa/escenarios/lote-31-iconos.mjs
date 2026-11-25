// Escenarios del lote 31 (ADR-0027): PBI-0243, el ícono a la izquierda del texto en los botones del backoffice y el
// ícono del módulo junto al título de cada página. Las páginas principales del backoffice, el diálogo de Temas, el de
// Marcas y el menú de usuario, con B y C (cookie de la vista previa del modo demo), a 1440 y 375 px.
//
// Datos: una copia creada desde la semilla, en modo demo, con `preparar-datos.mjs` (un pedido y un reclamo). Ningún
// escenario guarda.
import { sinGuardar } from '../lib/qa.mjs';

/** Pulsa un botón por su nombre exacto (el primero). */
const pulsarExacto = (nombre) => (page) =>
  page.getByRole('button', { name: nombre, exact: true }).first().click({ timeout: 3000 });

/** Abre el menú de usuario de la cabecera. */
const abrirMenuUsuario = (page) =>
  page.locator('ws-admin-menu-usuario').getByRole('button').click({ timeout: 3000 });

const admin = (ruta, tema, accion) => ({ ruta, rol: 'superadmin', tema, antes: sinGuardar, accion });

const paginas = {
  dashboard: '/',
  productos: '/productos',
  'producto-nuevo': '/productos/nuevo',
  'producto-editar': '/productos/p-004',
  inventario: '/inventario',
  categorias: '/categorias',
  'categoria-nueva': '/categorias/nueva',
  marcas: '/marcas',
  pedidos: '/pedidos',
  clientes: '/clientes',
  reclamaciones: '/reclamaciones',
  usuarios: '/usuarios',
  'usuario-nuevo': '/usuarios/nuevo',
  banners: '/banners',
  'banner-nuevo': '/banners/nuevo',
  contenido: '/contenido',
  entregas: '/entregas',
  temas: '/temas',
  envios: '/envios',
  perfil: '/perfil',
};

export const escenarios = {};
for (const tema of ['b', 'c']) {
  for (const [nombre, ruta] of Object.entries(paginas)) escenarios[`${nombre}-${tema}`] = admin(ruta, tema);
  escenarios[`tema-nuevo-${tema}`] = admin('/temas', tema, pulsarExacto('Nuevo tema'));
  escenarios[`marca-nueva-${tema}`] = admin('/marcas', tema, pulsarExacto('Agregar marca'));
  escenarios[`menu-usuario-${tema}`] = admin('/', tema, abrirMenuUsuario);
  escenarios[`ingreso-${tema}`] = { ruta: '/login', tema };
}
