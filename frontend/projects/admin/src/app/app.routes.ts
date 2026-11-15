import { Routes } from '@angular/router';

import { sesionGuard } from './features/sesion/application/sesion.guard';
import { permisoGuard } from './features/sesion/application/permiso.guard';
import { datosDelPanelResolver } from './features/tienda/application/datos-del-panel.resolver';

/** PBI-0140: la página consulta los datos al entrar. */
const conDatos = { datos: datosDelPanelResolver };

export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/sesion/presentation/login.page').then((m) => m.LoginPage),
    title: 'WebStore Admin | Acceso',
  },
  {
    path: '',
    canMatch: [sesionGuard],
    loadComponent: () => import('./layout/app.layout').then((m) => m.AppLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        resolve: conDatos,
        loadComponent: () => import('./features/tienda/presentation/resumen.page').then((m) => m.ResumenPage),
        title: 'WebStore Admin | Resumen',
      },
      {
        path: 'productos',
        resolve: conDatos,
        canMatch: [permisoGuard('products.edit')],
        loadComponent: () =>
          import('./features/tienda/presentation/productos.page').then((m) => m.ProductosPage),
        title: 'WebStore Admin | Productos',
      },
      {
        // Antes que `productos/:id`: sin `products.manage`, `permisoGuard` redirige al Resumen y el router no
        // prueba la ruta siguiente, así que «nuevo» nunca llega como identificador (AC-11).
        path: 'productos/nuevo',
        resolve: conDatos,
        canMatch: [permisoGuard('products.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/registro-producto.page').then((m) => m.RegistroProductoPage),
        title: 'WebStore Admin | Nuevo producto',
      },
      {
        path: 'productos/:id',
        canMatch: [permisoGuard('products.edit')],
        loadComponent: () =>
          import('./features/tienda/presentation/registro-producto.page').then((m) => m.RegistroProductoPage),
        title: 'WebStore Admin | Editar producto',
      },
      {
        path: 'inventario',
        resolve: conDatos,
        canMatch: [permisoGuard('inventory.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/inventario.page').then((m) => m.InventarioPage),
        title: 'WebStore Admin | Inventario',
      },
      {
        path: 'categorias',
        resolve: conDatos,
        canMatch: [permisoGuard('categories.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/categorias.page').then((m) => m.CategoriasPage),
        title: 'WebStore Admin | Categorías',
      },
      {
        // Antes que `categorias/:id`, para que «nueva» no llegue como identificador.
        path: 'categorias/nueva',
        resolve: conDatos,
        canMatch: [permisoGuard('categories.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/registro-categoria.page').then(
            (m) => m.RegistroCategoriaPage,
          ),
        title: 'WebStore Admin | Nueva categoría',
      },
      {
        path: 'categorias/:id',
        canMatch: [permisoGuard('categories.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/registro-categoria.page').then(
            (m) => m.RegistroCategoriaPage,
          ),
        title: 'WebStore Admin | Editar categoría',
      },
      {
        path: 'marcas',
        resolve: conDatos,
        canMatch: [permisoGuard('brands.manage')],
        loadComponent: () => import('./features/tienda/presentation/marcas.page').then((m) => m.MarcasPage),
        title: 'WebStore Admin | Marcas',
      },
      {
        // Antes que `marcas/:id`, para que «nueva» no llegue como identificador.
        path: 'marcas/nueva',
        resolve: conDatos,
        canMatch: [permisoGuard('brands.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/registro-marca.page').then((m) => m.RegistroMarcaPage),
        title: 'WebStore Admin | Nueva marca',
      },
      {
        path: 'marcas/:id',
        canMatch: [permisoGuard('brands.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/registro-marca.page').then((m) => m.RegistroMarcaPage),
        title: 'WebStore Admin | Editar marca',
      },
      {
        path: 'clientes',
        resolve: conDatos,
        canMatch: [permisoGuard('customers.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/clientes.page').then((m) => m.ClientesPage),
        title: 'WebStore Admin | Clientes',
      },
      {
        path: 'usuarios',
        resolve: conDatos,
        canMatch: [permisoGuard('users.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/usuarios.page').then((m) => m.UsuariosPage),
        title: 'WebStore Admin | Usuarios',
      },
      {
        path: 'pedidos',
        resolve: conDatos,
        canMatch: [permisoGuard('orders.manage')],
        loadComponent: () => import('./features/tienda/presentation/pedidos.page').then((m) => m.PedidosPage),
        title: 'WebStore Admin | Pedidos',
      },
      {
        path: 'banners',
        resolve: conDatos,
        canMatch: [permisoGuard('banners.manage')],
        loadComponent: () => import('./features/tienda/presentation/banners.page').then((m) => m.BannersPage),
        title: 'WebStore Admin | Banners',
      },
      {
        path: 'contenido',
        resolve: conDatos,
        canMatch: [permisoGuard('content.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/contenido.page').then((m) => m.ContenidoPage),
        title: 'WebStore Admin | Contenido',
      },
      {
        path: 'temas',
        canMatch: [permisoGuard('themes.manage')],
        loadComponent: () => import('./features/temas/presentation/temas.page').then((m) => m.TemasPage),
        title: 'WebStore Admin | Temas',
      },
      {
        path: 'envios',
        resolve: conDatos,
        canMatch: [permisoGuard('shipping.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/tarifas-envio.page').then((m) => m.TarifasEnvioPage),
        title: 'WebStore Admin | Envíos',
      },
      {
        path: 'reclamaciones',
        resolve: conDatos,
        canMatch: [permisoGuard('complaints.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/reclamaciones.page').then((m) => m.ReclamacionesPage),
        title: 'WebStore Admin | Reclamaciones',
      },
      {
        // Sin `permisoGuard`: la abren los tres roles; sin sesión, el `sesionGuard` del padre lleva a /login.
        path: 'perfil',
        loadComponent: () => import('./features/sesion/presentation/perfil.page').then((m) => m.PerfilPage),
        title: 'WebStore Admin | Perfil',
      },
    ],
  },
];
