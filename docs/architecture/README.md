# Arquitectura del sistema — WebStore

Vista de sistema: contenedores, stack y principios. El diseño interno de cada aplicación está en [`frontend/architecture.md`](../../frontend/architecture.md) y [`backend/architecture.md`](../../backend/architecture.md). Las decisiones están en [`docs/adrs/`](../adrs/).

## Topología

```text
storefront (público)                 admin (privado)
store.example.com                    admin.store.example.com
          │                                  │
          └───────────────┬──────────────────┘
                          ↓
                    WebStore BFF
                 fuente de verdad web
                          ↓
       catálogo · inventario · clientes · pedidos
          envíos · contenido · banners · pagos
```

En la demo, el BFF de prueba de [`backend/`](../../backend/) reemplaza al BFF productivo y persiste su estado en un archivo JSON. Ambos frontends lo consumen por HTTP en `/bff`; no hay catálogos ni inventarios administrativos independientes.

## Contenedores y stack

| Contenedor | Carpeta | Stack | Puerto local |
|---|---|---|---|
| Storefront (tienda pública) | `frontend/src/` | Angular standalone, signals, Angular Material/CDK, Tailwind CSS | 4200 |
| Admin (backoffice) | `frontend/projects/admin/` | El mismo workspace Angular | 4300 |
| BFF de prueba | `backend/` | Node.js sin dependencias, estado en `backend/data.json` | 3000 |

Las versiones exactas viven solo en los manifiestos: [`frontend/package.json`](../../frontend/package.json) y [`backend/package.json`](../../backend/package.json).

## Principios

- Separación Storefront/Admin: dos aplicaciones del mismo workspace, sin código compartido entre ellas.
- Frontend organizado por features con capas internas (`domain`, `application`, `data`, `presentation`), con los límites comprobados por Sheriff ([ADR-0006](../adrs/0006-organizar-el-frontend-por-features-y-capas.md)).
- BFF en Clean Architecture simplificada (`domain`, `application`, `infrastructure`, `api`) ([ADR-0007](../adrs/0007-organizar-el-bff-en-capas.md)).
- HTTP solo en los adaptadores `Bff*Gateway` de la capa `data/`; la aplicación depende de puertos del dominio.
- Contratos del BFF orientados a la experiencia, no a tablas ([contrato](../../backend/docs/BFF-CONTRACT.md)).
- Vocabulario de negocio en español y términos técnicos en inglés ([ADR-0003](../adrs/0003-usar-espanol-para-el-vocabulario-de-negocio.md)).
- Configuración del negocio desacoplada de los componentes: la publica el CMS del Admin y, para los colores, el tema activo. El `superadmin` gestiona los temas como recurso propio del BFF y la tienda y el Admin los aplican con una hoja de estilos del BFF ([ADR-0010](../adrs/0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md), [ADR-0011](../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md) y, para la tuerca del modo demo, [ADR-0012](../adrs/0012-activar-el-modo-demo-y-recordar-la-vista-previa-en-una-cookie.md)). Con la feature 004, entregada con el [PR #26](https://github.com/sebastianaviladev01-xyz/WebStore/pull/26), la tienda pinta su lienzo con un token propio del tema, `--ws-store-bg`, que calcula el BFF, y el Admin conserva el fondo principal ([ADR-0013](../adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md)); el tema pasa a 31 tokens y 20 pares de contraste. Con la feature 005, implementada en su rama y pendiente de entregar con su PR ([ADR-0014](../adrs/0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md), aceptado), el tema gana `--ws-on-link`, el texto sobre el color de los enlaces, que calcula el BFF, y Material pinta su `on-primary` con él: el tema pasa a 32 tokens y 21 pares de contraste. En la tienda, la regla `a` pasa a la capa base y los enlaces muestran sus utilidades de color y de subrayado.
- Pruebas unitarias e integración con `node:test` y e2e con Playwright ([ADR-0009](../adrs/0009-usar-node-test-y-playwright-para-las-pruebas.md)).

## Una sola fuente de datos

El Admin modifica la misma fuente que usa el Storefront. Por ello:

- cambiar stock cambia el catálogo público;
- el checkout descuenta el inventario que administra el Admin;
- el checkout crea o actualiza clientes visibles en el Admin;
- los pedidos públicos aparecen en el Admin;
- CMS, banners y tarifas de envío se publican desde la misma fuente.

## Roles

Tres roles fijos, asignables pero no editables: `superadmin` (todo, incluidos usuarios), `admin` (toda la operación sin usuarios) y `vendedor` (fichas de productos existentes, inventario y estado de pedidos). Las rutas del Admin usan `permisoGuard(permiso)` y el menú se filtra con `session.can(permiso)`; el BFF vuelve a validar cada operación. Detalle en el [contrato del BFF](../../backend/docs/BFF-CONTRACT.md). Además, el permiso `themes.manage`, solo del `superadmin`, gestiona los temas; `admin` y `vendedor` conservan sus permisos ([ADR-0011](../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md)).

## SEO / SSR

Las sesiones acordaron primero una versión funcional y después una refactorización hacia SSR/SEO. Las features y el acceso a datos están desacoplados para que esa evolución no obligue a reescribir dominio ni aplicación.
