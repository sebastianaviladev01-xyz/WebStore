import { Routes } from '@angular/router';

import { sesionGuard } from './features/sesion/application/sesion.guard';
import { permisoGuard } from './features/sesion/application/permiso.guard';

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
        loadComponent: () => import('./features/tienda/presentation/resumen.page').then((m) => m.ResumenPage),
        title: 'WebStore Admin | Resumen',
      },
      {
        path: 'productos',
        canMatch: [permisoGuard('products.edit')],
        loadComponent: () =>
          import('./features/tienda/presentation/productos.page').then((m) => m.ProductosPage),
        title: 'WebStore Admin | Productos',
      },
      {
        path: 'inventario',
        canMatch: [permisoGuard('inventory.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/inventario.page').then((m) => m.InventarioPage),
        title: 'WebStore Admin | Inventario',
      },
      {
        path: 'categorias',
        canMatch: [permisoGuard('categories.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/categorias.page').then((m) => m.CategoriasPage),
        title: 'WebStore Admin | Categorías',
      },
      {
        path: 'marcas',
        canMatch: [permisoGuard('brands.manage')],
        loadComponent: () => import('./features/tienda/presentation/marcas.page').then((m) => m.MarcasPage),
        title: 'WebStore Admin | Marcas',
      },
      {
        path: 'clientes',
        canMatch: [permisoGuard('customers.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/clientes.page').then((m) => m.ClientesPage),
        title: 'WebStore Admin | Clientes',
      },
      {
        path: 'usuarios',
        canMatch: [permisoGuard('users.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/usuarios.page').then((m) => m.UsuariosPage),
        title: 'WebStore Admin | Usuarios',
      },
      {
        path: 'pedidos',
        canMatch: [permisoGuard('orders.manage')],
        loadComponent: () => import('./features/tienda/presentation/pedidos.page').then((m) => m.PedidosPage),
        title: 'WebStore Admin | Pedidos',
      },
      {
        path: 'banners',
        canMatch: [permisoGuard('banners.manage')],
        loadComponent: () => import('./features/tienda/presentation/banners.page').then((m) => m.BannersPage),
        title: 'WebStore Admin | Banners',
      },
      {
        path: 'contenido',
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
        canMatch: [permisoGuard('shipping.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/tarifas-envio.page').then((m) => m.TarifasEnvioPage),
        title: 'WebStore Admin | Envíos',
      },
      {
        path: 'reclamaciones',
        canMatch: [permisoGuard('complaints.manage')],
        loadComponent: () =>
          import('./features/tienda/presentation/reclamaciones.page').then((m) => m.ReclamacionesPage),
        title: 'WebStore Admin | Reclamaciones',
      },
    ],
  },
];
