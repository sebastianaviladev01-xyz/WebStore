import { Routes } from '@angular/router';

export const vitrinaRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./presentation/catalogo.page').then((m) => m.CatalogoPage),
    title: 'WebStore | Productos',
  },
  {
    path: ':slug',
    loadComponent: () => import('./presentation/detalle-producto.page').then((m) => m.DetalleProductoPage),
    title: 'WebStore | Detalle de producto',
  },
];
