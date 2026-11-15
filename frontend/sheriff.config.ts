import { sameTag, SheriffConfig } from '@softarc/sheriff-core';

// Límites entre aplicaciones, capas y features (frontend/architecture.md §2.1). Mismo esquema que IdShield.
const app = (root: string, name: string) => ({
  [`${root}/core`]: [`app:${name}`, 'layer:core'],
  [`${root}/layout`]: [`app:${name}`, 'layer:layout'],
  [`${root}/shared/ui`]: [`app:${name}`, 'layer:shared-ui'],
  [`${root}/features/<feature>`]: [`app:${name}`, 'feature:<feature>', 'layer:routes'],
  [`${root}/features/<feature>/<layer>`]: [`app:${name}`, 'feature:<feature>', 'layer:<layer>'],
});

export const config: SheriffConfig = {
  enableBarrelLess: true,
  entryPoints: {
    storefront: 'src/main.ts',
    admin: 'projects/admin/src/main.ts',
  },
  modules: {
    ...app('src/app', 'storefront'),
    ...app('projects/admin/src/app', 'admin'),
  },
  depRules: {
    root: ['layer:*'],
    'app:*': [sameTag],
    'feature:*': [sameTag, 'layer:core', 'layer:shared-ui'],
    // Dependencias entre features del storefront, en una sola dirección (sin ciclos).
    'feature:vitrina': ['feature:catalogo', 'feature:carrito', 'feature:contenido'],
    'feature:carrito': ['feature:catalogo'],
    'feature:checkout': [
      'feature:carrito',
      'feature:catalogo',
      'feature:cuenta',
      'feature:envios',
      'feature:pedidos',
    ],
    'feature:pedidos': ['feature:carrito', 'feature:catalogo', 'feature:cuenta', 'feature:envios'],
    'feature:envios': ['feature:contenido'],
    // Admin.
    'feature:tienda': ['feature:sesion'],
    'feature:temas': ['feature:sesion'],
    'feature:notificaciones': ['feature:sesion'],
    'layer:routes': ['layer:presentation', 'layer:application'],
    'layer:domain': ['layer:domain'],
    'layer:application': ['layer:application', 'layer:domain', 'layer:core'],
    'layer:data': ['layer:domain', 'layer:core'],
    'layer:presentation': ['layer:application', 'layer:domain', 'layer:core', 'layer:shared-ui'],
    'layer:layout': ['layer:application', 'layer:domain', 'layer:core', 'layer:shared-ui'],
    'layer:shared-ui': ['layer:core'],
    'layer:core': [],
  },
};
