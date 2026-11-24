import { Routes } from '@angular/router';

import {
  contactoHabilitadoGuard,
  privacidadHabilitadaGuard,
  enviosHabilitadoGuard,
  terminosHabilitadosGuard,
} from './features/contenido/application/pagina-informativa.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/app.layout').then((m) => m.AppLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/vitrina/presentation/inicio.page').then((m) => m.InicioPage),
        title: 'WebStore | Inicio',
      },
      {
        path: 'catalogo',
        loadChildren: () => import('./features/vitrina/vitrina.routes').then((m) => m.vitrinaRoutes),
      },
      {
        // Lote 19 (ADR-0021, PBI-0001; provisional): el comparador, con la lista en `?ids=` para compartirla.
        path: 'comparar',
        loadComponent: () =>
          import('./features/vitrina/presentation/comparador.page').then((m) => m.ComparadorPage),
        title: 'WebStore | Comparar productos',
      },
      {
        path: 'carrito',
        loadComponent: () =>
          import('./features/carrito/presentation/carrito.page').then((m) => m.CarritoPage),
        title: 'WebStore | Carrito',
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/checkout/presentation/checkout.page').then((m) => m.CheckoutPage),
        title: 'WebStore | Datos de tu compra',
      },
      {
        path: 'pedido/:orderId',
        loadComponent: () =>
          import('./features/pedidos/presentation/pedido-confirmado.page').then(
            (m) => m.PedidoConfirmadoPage,
          ),
        title: 'WebStore | Pedido confirmado',
      },
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./features/pedidos/presentation/pedidos.page').then((m) => m.PedidosPage),
        title: 'WebStore | Mis pedidos',
      },
      {
        path: 'pedidos/:orderId',
        loadComponent: () =>
          import('./features/pedidos/presentation/detalle-pedido.page').then((m) => m.DetallePedidoPage),
        title: 'WebStore | Detalle de pedido',
      },
      {
        path: 'cuenta',
        loadChildren: () => import('./features/cuenta/cuenta.routes').then((m) => m.cuentaRoutes),
      },
      {
        path: 'info/contacto',
        canActivate: [contactoHabilitadoGuard],
        loadComponent: () =>
          import('./features/contenido/presentation/contacto.page').then((m) => m.ContactoPage),
        title: 'WebStore | Contacto',
      },
      {
        path: 'info/envios',
        canActivate: [enviosHabilitadoGuard],
        loadComponent: () =>
          import('./features/envios/presentation/informacion-envios.page').then(
            (m) => m.InformacionEnviosPage,
          ),
        title: 'WebStore | Envíos',
      },
      {
        path: 'info/privacidad',
        canActivate: [privacidadHabilitadaGuard],
        loadComponent: () =>
          import('./features/contenido/presentation/privacidad.page').then((m) => m.PrivacidadPage),
        title: 'WebStore | Privacidad',
      },
      {
        path: 'info/terminos',
        canActivate: [terminosHabilitadosGuard],
        loadComponent: () =>
          import('./features/contenido/presentation/terminos.page').then((m) => m.TerminosPage),
        title: 'WebStore | Términos',
      },
      {
        path: 'libro-reclamaciones',
        loadComponent: () =>
          import('./features/reclamos/presentation/libro-reclamaciones.page').then(
            (m) => m.LibroReclamacionesPage,
          ),
        title: 'WebStore | Libro de reclamaciones',
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./layout/pagina-no-encontrada.page').then((m) => m.PaginaNoEncontradaPage),
    title: 'WebStore | Página no encontrada',
  },
];
