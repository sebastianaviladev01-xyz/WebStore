import { existsSync, readdirSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const path = (p) => new URL(p, root);
const read = (p) => readFileSync(path(p), 'utf8');
// Un archivo que falta ya sale como ✗ en `checks`; sus comprobaciones de contenido fallan sin detener el resto.
const readIfExists = (p) => (existsSync(path(p)) ? read(p) : '');
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
  [
    'Registro de producto',
    'frontend/projects/admin/src/app/features/tienda/presentation/registro-producto.page.ts',
  ],
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
// Feature 008 (TEST-09): el formulario de producto vive en su interfaz de registro, con ruta propia.
const productForm = readIfExists(
  'frontend/projects/admin/src/app/features/tienda/presentation/registro-producto.page.ts',
);
// El pie salió de AppLayout a su propio componente (lote 05, PBI-0118): la cabecera y el pie se revisan juntos.
const shell = [
  read('frontend/src/app/layout/app.layout.ts'),
  read('frontend/src/app/layout/pie-tienda.component.ts'),
].join('\n');
const routes = read('frontend/src/app/app.routes.ts');
// Lote 15 (PBI-0175 y PBI-0185): el enlace fijo a Envíos y las columnas del pie se deciden en domain/.
const reglasDeNavegacion = [
  read('frontend/src/app/features/contenido/domain/navegacion.rules.ts'),
  read('frontend/src/app/features/contenido/domain/pie.rules.ts'),
].join('\n');
const contentService = read('frontend/src/app/features/contenido/application/contenido.facade.ts');
// La vigencia y el máximo de banners pasaron a domain/ (lote 05, PBI-0117).
const bannerRules = read('frontend/src/app/features/contenido/domain/banner.rules.ts');
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
// `productos/nuevo` va antes que `productos/:id`: si no, «nuevo» llegaría como identificador con products.edit.
const productNewRoute = adminRoutes.indexOf("path: 'productos/nuevo'");
const productEditRoute = adminRoutes.indexOf("path: 'productos/:id'");
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
    // PBI-0158: sin la rama de «solo la ficha», crear y editar piden products.manage en la ruta.
    'Edición de producto protegida por products.manage (PBI-0158)',
    /path: 'productos\/:id',\s*canMatch: \[permisoGuard\('products\.manage'\)\]/.test(adminRoutes) &&
      !productForm.includes("can('products.manage')"),
  ],
  [
    'Registro de producto nuevo protegido por products.manage, antes que productos/:id',
    // Lote 07 (PBI-0140): la ruta puede llevar antes su `resolve`, que consulta los datos al entrar.
    /path: 'productos\/nuevo',\s*(?:resolve: \w+,\s*)?canMatch: \[permisoGuard\('products\.manage'\)\]/.test(
      adminRoutes,
    ) &&
      productNewRoute >= 0 &&
      productNewRoute < productEditRoute,
  ],
  [
    'Eliminación de producto protegida por products.delete (PBI-0013)',
    products.includes("this.session.can('products.delete') && confirm"),
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
    reglasDeNavegacion.includes("paginas.shippingPageEnabled ? [{ label: 'Envíos', route: '/info/envios'") &&
      reglasDeNavegacion.includes("'/info/envios': 'shippingPageEnabled'") &&
      shell.includes('enlacesDeLaCabecera(this.content.settings())') &&
      shell.includes('gruposDelPie(this.content.settings().quickLinks, this.content.settings())'),
  ],
  [
    'Mega-menú dinámico conectado al catálogo',
    shell.includes('ws-category-mega-menu') && shell.includes('[categories]="catalog.categories()"'),
  ],
  [
    'Hero limita banners principales',
    contentService.includes("bannersDeZona(this.activeBanners(), ['hero'])") &&
      bannerRules.includes('MAXIMO_BANNERS_POR_ZONA = 3;') &&
      bannerRules.includes('.slice(0, MAXIMO_BANNERS_POR_ZONA)'),
  ],
  [
    'CMS se refresca al volver al Storefront',
    contentService.includes("window.addEventListener('focus'") && contentService.includes('this.load(true)'),
  ],
]) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  failed ||= !ok;
}

// TEST-18 (feature 002, ADR-0010): el color de las dos aplicaciones sale solo de los tokens del tema.
const informar = (label, problemas) => {
  console.log(`${problemas.length === 0 ? '✓' : '✗'} ${label}`);
  for (const problema of problemas) console.log(`    ${problema}`);
  failed ||= problemas.length > 0;
};

// (a) El mapa de B del BFF es igual, declaración por declaración, a los tokens del tema de tokens.css.
const { TEMAS_PREDEFINIDOS } = await import(path('backend/src/domain/temas/temas-predefinidos.mjs'));
const { TOKENS_DEL_TEMA } = await import(path('backend/src/domain/temas/tema.rules.mjs'));
const tokensCss = read('frontend/src/styles/tokens.css');
const bloqueRaiz = tokensCss.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
const declaraciones = new Map(
  [...bloqueRaiz.matchAll(/^\s*(--ws-[\w-]+)\s*:\s*([^;]+?)\s*;/gm)].map(([, nombre, valor]) => [
    nombre,
    valor,
  ]),
);
const mapaB = TEMAS_PREDEFINIDOS.find((tema) => tema.id === 'b')?.tokens ?? {};
informar(
  'TEST-18 (a): el tema B del BFF es igual a tokens.css',
  TOKENS_DEL_TEMA.filter((nombre) => declaraciones.get(nombre) !== mapaB[nombre]).map(
    (nombre) =>
      `${nombre}: tokens.css «${declaraciones.get(nombre) ?? '(falta)'}», BFF «${mapaB[nombre] ?? '(falta)'}»`,
  ),
);

// (b) Ningún color fijo fuera de tokens.css en estilos y plantillas. Quedan fuera index.html (meta theme-color),
// las pruebas (*.spec.*) y features/temas/domain/, que calculan colores como datos y no pintan nada.
const COLORES_FIJOS = [
  /(?<![\w&])#[0-9a-f]{3,8}(?![\w-])/gi,
  /(?<![a-z-])(?:rgba?|hsla?)\(/gi,
  /(?<![\w-])(?:white|black)(?![\w-])/gi,
  /-(?:white|black)(?![\w-])/gi,
];
const fuentesDeEstilo = ['frontend/src', 'frontend/projects']
  .flatMap((carpeta) =>
    readdirSync(path(`${carpeta}/`), { recursive: true }).map(
      (archivo) => `${carpeta}/${archivo.replaceAll('\\', '/')}`,
    ),
  )
  .filter((archivo) => /\.(css|scss|html|ts)$/.test(archivo))
  .filter(
    (archivo) =>
      archivo !== 'frontend/src/styles/tokens.css' &&
      !archivo.endsWith('/index.html') &&
      !/\.spec\.[cm]?[jt]s$/.test(archivo) &&
      !archivo.includes('/features/temas/domain/'),
  );
informar(
  'TEST-18 (b): ningún color fijo fuera de tokens.css',
  fuentesDeEstilo.flatMap((archivo) =>
    read(archivo)
      .split('\n')
      .flatMap((linea, i) =>
        COLORES_FIJOS.flatMap((patron) =>
          [...linea.matchAll(patron)].map(([texto]) => `${archivo}:${i + 1} «${texto}»`),
        ),
      ),
  ),
);

// Lote 03 (PBI-0080): los roles del Admin, que Perfil y Usuarios muestran, tienen el mismo id, nombre y descripción
// que los del BFF, en el mismo orden. El Admin no importa código del BFF: se leen del texto de su `rol.rules.ts`.
const { ADMIN_ROLES } = await import(path('backend/src/domain/sesion/rol.rules.mjs'));
const rolesDelAdmin = [
  ...adminRoles.matchAll(/id: '([\w-]+)',\s*label: '([^']+)',\s*description: '([^']+)'/g),
].map(([, id, label, description]) => ({ id, label, description }));
informar(
  'Roles del Admin con el mismo id, nombre y descripción que los del BFF',
  rolesDelAdmin.length === ADMIN_ROLES.length
    ? ADMIN_ROLES.flatMap(({ id, label, description }, i) =>
        ['id', 'label', 'description']
          .filter((campo) => rolesDelAdmin[i][campo] !== { id, label, description }[campo])
          .map(
            (campo) =>
              `${id}.${campo}: Admin «${rolesDelAdmin[i][campo]}», BFF «${{ id, label, description }[campo]}»`,
          ),
      )
    : [`El Admin define ${rolesDelAdmin.length} roles y el BFF ${ADMIN_ROLES.length}`],
);

// (c) Los dos index.html cargan theme.css antes de que arranque Angular, con un <link> que bloquea el pintado:
// sin media ni async, y fuera de la optimización de CSS crítico (data-beasties-skip, frontend/architecture.md §5).
const LINK_DEL_TEMA = /<link rel="stylesheet" href="\/bff\/appearance\/theme\.css" data-beasties-skip \/>/;
informar(
  'TEST-18 (c): los dos index.html cargan /bff/appearance/theme.css',
  ['frontend/src/index.html', 'frontend/projects/admin/src/index.html']
    .filter((archivo) => !LINK_DEL_TEMA.test(read(archivo)))
    .map(
      (archivo) =>
        `${archivo}: falta <link rel="stylesheet" href="/bff/appearance/theme.css" data-beasties-skip />`,
    ),
);

if (failed) process.exit(1);
console.log('\nEstructura contractual WebStore: OK');
