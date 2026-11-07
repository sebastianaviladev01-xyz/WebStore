import { existsSync, readdirSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const path = (p) => new URL(p, root);
const read = (p) => readFileSync(path(p), 'utf8');
const checks = [
  ['Storefront separado', 'frontend/src/app/app.routes.ts'],
  ['Admin separado', 'frontend/projects/admin/src/app/app.routes.ts'],
  ['Mock BFF', 'backend/src/main.mjs'],
  ['HTTP catálogo', 'frontend/src/app/features/catalogo/data/bff-catalogo.gateway.ts'],
  ['HTTP checkout', 'frontend/src/app/features/checkout/data/bff-checkout.gateway.ts'],
  ['HTTP envíos', 'frontend/src/app/features/envios/data/bff-envio.gateway.ts'],
  ['HTTP Admin', 'frontend/projects/admin/src/app/features/tienda/data/bff-tienda.gateway.ts'],
  ['Cuenta', 'frontend/src/app/features/cuenta/application/cuenta.facade.ts'],
  ['Pedidos', 'frontend/src/app/features/pedidos/application/pedidos.facade.ts'],
  ['CMS', 'frontend/projects/admin/src/app/features/tienda/presentation/contenido.page.ts'],
  ['Inventario', 'frontend/projects/admin/src/app/features/tienda/presentation/inventario.page.ts'],
  ['Banners', 'frontend/projects/admin/src/app/features/tienda/presentation/banners.page.ts'],
  ['Reclamos', 'frontend/src/app/features/reclamos/presentation/libro-reclamaciones.page.ts'],
  ['Guards páginas CMS', 'frontend/src/app/features/contenido/application/pagina-informativa.guard.ts'],
];

let failed = false;
for (const [label, file] of checks) {
  const ok = existsSync(path(file));
  console.log(`${ok ? '✓' : '✗'} ${label}: ${file}`);
  failed ||= !ok;
}

const appConfig = read('frontend/src/app/app.config.ts');
const adminConfig = read('frontend/projects/admin/src/app/app.config.ts');
const products = read('frontend/projects/admin/src/app/features/tienda/presentation/productos.page.ts');
const shell = read('frontend/src/app/layout/app.layout.ts');
const routes = read('frontend/src/app/app.routes.ts');
const contentService = read('frontend/src/app/features/contenido/application/contenido.facade.ts');
const contentPage = read('frontend/projects/admin/src/app/features/tienda/presentation/contenido.page.ts');
const adminModels = read('frontend/projects/admin/src/app/features/tienda/domain/tienda.model.ts');
const publicModels = read('frontend/src/app/features/contenido/domain/contenido.model.ts');
// El BFF está repartido en capas: se revisa su código completo.
const bff = readdirSync(path('backend/src/'), { recursive: true })
  .filter((file) => file.endsWith('.mjs'))
  .map((file) => read(`backend/src/${file.replaceAll('\\', '/')}`))
  .join('\n');
const adminRoles = read('frontend/projects/admin/src/app/features/sesion/domain/rol.rules.ts');
const bffRoles = read('backend/src/domain/sesion/rol.rules.mjs');
const adminRoutes = read('frontend/projects/admin/src/app/app.routes.ts');
const applicationSources = [
  'frontend/src/app/features/cuenta/application/cuenta.facade.ts',
  'frontend/src/app/features/pedidos/application/pedidos.facade.ts',
  'frontend/src/app/features/contenido/application/contenido.facade.ts',
  'frontend/src/app/features/reclamos/application/reclamos.facade.ts',
  'frontend/src/app/features/checkout/application/checkout.facade.ts',
  'frontend/projects/admin/src/app/features/sesion/application/sesion.facade.ts',
].map(read);

for (const [label, ok] of [
  ['Storefront usa BffCatalogoGateway', appConfig.includes('BffCatalogoGateway')],
  ['Storefront usa BffCheckoutGateway', appConfig.includes('BffCheckoutGateway')],
  ['Storefront usa BffEnvioGateway', appConfig.includes('BffEnvioGateway')],
  ['Admin usa BffTiendaGateway', adminConfig.includes('BffTiendaGateway')],
  [
    'Solo products.manage crea productos',
    products.includes("!this.session.can('products.manage') && !this.editingId()"),
  ],
  [
    'Eliminación de producto protegida por products.manage',
    products.includes("this.session.can('products.manage') && confirm"),
  ],
  [
    'Roles fijos superadmin/admin/vendedor',
    ["'superadmin'", "'admin'", "'vendedor'"].every((role) => adminRoles.includes(role)) &&
      bffRoles.includes('LEGACY_ROLES'),
  ],
  [
    'Rutas del Admin protegidas por permiso',
    adminRoutes.includes('permisoGuard(') && !adminRoutes.includes('ownerGuard'),
  ],
  [
    'Capa de aplicación sin HttpClient (puertos y adaptadores)',
    applicationSources.every((source) => !source.includes('@angular/common/http')),
  ],
  [
    'CMS expone navegación lateral',
    publicModels.includes('sideNavigation') && adminModels.includes('sideNavigation'),
  ],
  [
    'Storefront consume navegación lateral',
    shell.includes('content.sideNavigation()') &&
      shell.includes('topCategories()') &&
      shell.includes('descendantsFor(category.id)') &&
      shell.includes('aria-label="Menú de navegación"'),
  ],
  [
    'Logo gráfico configurable en modelo',
    publicModels.includes('logoUrl') && adminModels.includes('logoUrl'),
  ],
  [
    'Admin permite cargar logo gráfico',
    contentPage.includes('type="file"') && contentPage.includes('readAsDataURL'),
  ],
  [
    'Storefront renderiza logo gráfico',
    shell.includes('content.settings().logoUrl') && shell.includes('<img'),
  ],
  ['BFF persiste logo y CMS compartido', /logoUrl:\s*''/.test(bff) && bff.includes('/bff/content/settings')],
  [
    'Contacto protegido por toggle CMS',
    routes.includes('contactoHabilitadoGuard') && routes.includes("path: 'info/contacto'"),
  ],
  [
    'Envíos protegido por toggle CMS',
    routes.includes('enviosHabilitadoGuard') && routes.includes("path: 'info/envios'"),
  ],
  [
    'Privacidad protegida por toggle CMS',
    routes.includes('privacidadHabilitadaGuard') && routes.includes("path: 'info/privacidad'"),
  ],
  [
    'Términos protegido por toggle CMS',
    routes.includes('terminosHabilitadosGuard') && routes.includes("path: 'info/terminos'"),
  ],
  [
    'Navegación oculta página Envíos desactivada',
    shell.includes('content.settings().shippingPageEnabled') && shell.includes('routerLink="/info/envios"'),
  ],
  [
    'Mega-menú dinámico conectado al catálogo',
    shell.includes('ws-category-mega-menu') && shell.includes('[categories]="catalog.categories()"'),
  ],
  [
    'Hero limita banners principales',
    contentService.includes("banner.placement === 'hero'") && contentService.includes('.slice(0, 3)'),
  ],
  [
    'CMS se refresca al volver al Storefront',
    contentService.includes("window.addEventListener('focus'") && contentService.includes('this.load(true)'),
  ],
]) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  failed ||= !ok;
}

if (failed) process.exit(1);
console.log('\nEstructura contractual WebStore: OK');
