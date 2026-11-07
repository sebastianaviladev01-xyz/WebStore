import { Routes } from '@angular/router';
export const cuentaRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./presentation/login.page').then((m) => m.LoginPage),
    title: 'WebStore | Iniciar sesión',
  },
  {
    path: 'registro',
    loadComponent: () => import('./presentation/registro.page').then((m) => m.RegistroPage),
    title: 'WebStore | Registro',
  },
  {
    path: 'verificar',
    loadComponent: () => import('./presentation/verificar.page').then((m) => m.VerificarPage),
    title: 'WebStore | Verificar cuenta',
  },
  {
    path: 'recuperar',
    loadComponent: () => import('./presentation/recuperar.page').then((m) => m.RecuperarPage),
    title: 'WebStore | Recuperar contraseña',
  },
  {
    path: 'perfil',
    loadComponent: () => import('./presentation/perfil.page').then((m) => m.PerfilPage),
    title: 'WebStore | Mi cuenta',
  },
];
