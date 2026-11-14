# Matriz de trazabilidad — WebStore

Criterio: esta matriz incluye los **acuerdos finales aplicables a WebStore** identificados en las sesiones. Las ideas explícitamente pendientes o sustituidas por decisiones posteriores están en `PENDING-DECISIONS.md`.

| Requisito consolidado | Evidencia de implementación |
|---|---|
| Storefront y Admin separados | proyectos Angular `storefront` y `admin`, puertos 4200/4300 |
| Fuente única para ambas apps | `backend/` (BFF de prueba) + adaptadores `Bff*Gateway` |
| Productos e inventario obligatorios | Admin Products/Inventory + catálogo público desde el mismo BFF |
| Gestión de productos | `ProductosPage` + `TiendaFacade` |
| Gestión de inventario | `InventarioPage`; checkout descuenta stock en BFF |
| Gestión de categorías | `CategoriasPage` |
| Subcategorías/niveles | `parentId` en categorías; lista jerárquica en Admin y jerarquía sin ciclos validada en Admin y BFF |
| Orden explícito o alfabético | Admin ordena y BFF aplica fallback por nombre |
| Gestión de marcas | `MarcasPage` |
| Categorías sin exigir iconos | Home y catálogo usan texto/descripción |
| Filtros nombre/categoría/precio | `CatalogoPage` |
| Detalle de producto (fotos, descripción, características) | `DetalleProductoPage` con galería y miniaturas; fotos adicionales gestionadas en Admin (`gallery`, URL o carga ≤400 KB) y publicadas como `images` |
| Inventario consistente entre Admin y Storefront | BFF con `revision`: guardado desactualizado del Admin → 409; el Admin envía solo lo modificado, recarga y reaplica conservando el stock vendido (smoke test) |
| Stock visible y compra bloqueada sin stock | cards/PDP + stock transaccional BFF |
| Confirmación al agregar al carrito | `AgregarAlCarritoDialog`: Seguir comprando / Ver carrito, con «Ver carrito» relleno como principal y sin «Finalizar compra» (feature 004, AC-01 y AC-02: ver las filas de la feature 004) |
| Opciones con botón de tres puntos (sin hover) | `TarjetaProductoComponent` + `mat-menu`: Ver detalle, Más de la categoría, Copiar enlace |
| Carrito agregar/ver/cambiar/eliminar | `CarritoFacade` + `CarritoPage`; persiste en `localStorage` (solo id y cantidad) y se concilia con precio/stock del catálogo |
| Valor de venta e IGV explícitos | `CarritoFacade` + carrito/checkout |
| Compra guest | `CheckoutPage` |
| Cliente ≠ usuario | checkout crea cliente; cuenta es opcional |
| Registro/login/recuperación | feature `cuenta` + endpoints BFF; contraseña con `scrypt`, códigos temporales y sesión opaca revocable |
| Verificación por código | `VerificarPage` + código de 15 minutos validado en BFF |
| Editar/eliminar cuenta | `PerfilPage` + autorización Bearer en BFF |
| Pedido creado y consultable | BFF `/checkout/orders` (montos recalculados en servidor) + `PedidosFacade` |
| Historial/detalle | `PedidosPage` / `DetallePedidoPage`; pedidos de la cuenta por sesión y de invitado por token de pedido guardado en el dispositivo |
| Pedidos protegidos | BFF exige sesión dueña o la cabecera `x-order-token` del invitado; responde 404 sin autorización (smoke test) |
| Modificar dirección y fecha ≤24 h | `PedidosFacade` + validación BFF; cambiar de distrito recalcula el envío |
| Cancelar pedido ≤24 h | `PedidosFacade.cancel` + BFF; libera el stock reservado (también al cancelar desde Admin) |
| Clientes de guest visibles en Admin | checkout actualiza `customers`; smoke test |
| Pedidos visibles en Admin | `/bff/admin/snapshot`; `PedidosPage` |
| Tabla envío origen → destino | `TarifasEnvioPage` + `BffEnvioGateway`; el checkout solo pide el distrito y el BFF asigna la tienda de origen más próxima (tarifa más baja) |
| Banners con vigencia | `BannersPage` + `activeBanners` |
| Logo gráfico configurable | CMS permite URL o carga de imagen → BFF → Storefront shell |
| Color principal configurable | Sustituido por los temas de la feature 002 (filas «Temas configurables»): Contenido ya no tiene colores; el color vive en el tema activo |
| Contacto configurable | CMS → footer |
| Header/footer configurables | CMS → Storefront shell |
| Navegación superior configurable | CMS `topNavigation` → Storefront shell |
| Navegación lateral configurable | CMS `sideNavigation` → drawer lateral de categorías en Storefront |
| Tipografía única por defecto | campo read-only en Admin |
| Contacto/Envíos/Privacidad/Términos | rutas Storefront + toggles CMS + guards que bloquean URL cuando están desactivadas |
| Libro de reclamaciones | formulario público persistente, constancia `REC-*`, plazo interno de 15 días hábiles configurables y bandeja Admin con estado/respuesta; canal de envío real pendiente |
| Roles fijos (05/11) | `frontend/projects/admin/src/app/features/sesion/domain/rol.rules.ts` + `backend/src/domain/sesion/rol.rules.mjs`; se asignan en Usuarios y roles, no se editan |
| Superadministrador | login, `sesionGuard`, todos los módulos, gestión de usuarios; el BFF impide quedarse sin superadministrador |
| Administrador | toda la operación salvo usuarios; `permisoGuard` por ruta y `403 INSUFFICIENT_ROLE` en el BFF |
| Vendedor | resumen, ficha de productos existentes, inventario y estado de pedidos; campos comerciales protegidos en UI y BFF; sin crear/eliminar |
| Pedidos con detalle en Admin | `frontend/projects/admin/src/app/features/tienda/presentation/pedidos.page.ts`: filtro por estado, cliente, contacto, dirección, distrito, origen, líneas, totales y cambio de estado |
| Resumen del Admin reorganizado (feature 001) | `frontend/projects/admin/src/app/features/tienda/presentation/resumen.page.ts`, `tarjeta-indicador.component.ts` y `grafico-pedidos.component.ts`; reglas puras en `domain/resumen.rules.ts` con `resumen.rules.spec.mjs` (TEST-01 a TEST-09); e2e `admin-resumen.spec.ts` (TEST-12) y el Resumen en `storefront-checkout.spec.ts` (TEST-11); capturas antes y después (TEST-13). Detalle en [`verification.md`](../specs/features/001-reorganizar-resumen-del-admin/verification.md) |
| Pedidos abre el pedido de `?pedido=<id>` | `pedidos.page.ts` (`input()` y `linkedSignal`); TEST-10 y TEST-11 en `storefront-checkout.spec.ts`; un id inexistente se comporta como sin parámetro |
| Tarifas masivas | `frontend/projects/admin/src/app/features/tienda/domain/tarifa-envio.rules.ts`: un precio para varios distritos y ajuste porcentual por origen o global; pruebas en `tarifa-envio.rules.spec.mjs`, junto al código |
| Arquitectura limpia | features con capas `domain/application/data/presentation`: puertos `<Concepto>Gateway` en `domain/` y adaptadores `Bff<Concepto>Gateway` en `data/`; la capa de aplicación no importa `HttpClient` (verificado por Sheriff, ESLint, `test:architecture` y `validate-structure`); BFF en `domain/application/infrastructure/api` |
| Primera entrega funcional antes de SSR | SPA actual; SSR listado como fase posterior |
| Orientación a BFF | ports/adapters + Mock BFF + contrato documentado |
| Máximo de tres banners hero | `ContenidoFacade.heroBanners` filtra vigencia/ubicación y aplica `slice(0, 3)` |
| Home de e-commerce completo | Header, mega-menú, carrusel, accesos rápidos, campañas, destacados, categorías, beneficios y footer jerárquico |
| Identidad propia en lugar de clon LG | Paleta B azul cobalto (`src/styles/tokens.css`), hero en tarjeta, categorías de texto, beneficios en tarjetas claras, footer azul marino, Source Sans 3, assets y copy propios; ver `VISUAL-SYSTEM.md` |
| Contenido legal editable | CMS publica textos de Contacto, Envíos, Privacidad y Términos; rutas respetan sus toggles |
| Fotografía eficiente en listados | miniaturas de 480 px, `srcset`/carga diferida y prioridad exclusiva para el LCP |
| Temas configurables (feature 002): tres predefinidos A, B y C, B por defecto (REQ-01, REQ-03, REQ-04; AC-01 a AC-03) | `backend/src/domain/temas/temas-predefinidos.mjs`; mapa de 30 tokens (`TOKENS_DEL_TEMA`; 31 con el lienzo de la tienda de la feature 004); `frontend/src/styles/tokens.css` (B y respaldo); TEST-02, TEST-18, TEST-23 (capturas de B iguales a `dev`; A y C solo cambian colores) |
| Tema con nombre y cinco colores; validación (REQ-02; AC-06, AC-11, AC-12) | `backend/src/domain/temas/tema-propio.rules.mjs` (`exigirTemaValido`); réplica del Admin `tema.rules.ts`; TEST-06, TEST-14, TEST-19 |
| Tema activo único, aplicado al cargar sin parpadeo (REQ-04, REQ-16; AC-10, AC-18) | `GET /bff/appearance/theme.css` (`<link>` bloqueante en los dos `index.html`, [ADR-0010](../adrs/0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md)); `TemasFacade`; TEST-12, TEST-17, TEST-22, TEST-24 |
| Lista de temas para el `superadmin` y predefinidos de solo lectura (REQ-05, REQ-06; AC-03, AC-05) | `TemasPage` (Admin, `/temas`); `PREDEFINED_THEME_READ_ONLY`; TEST-06, TEST-07, TEST-19 |
| Crear, editar, borrar y activar temas propios (REQ-07, REQ-08; AC-06 a AC-10) | `TemaDialog`, `TemasFacade` (Admin); `temas.use-cases.mjs`; `/bff/admin/themes`; TEST-07, TEST-13, TEST-19 |
| Solo el `superadmin` gestiona temas (REQ-09; AC-04) | Permiso `themes.manage` en `rol.rules.mjs` y su réplica `rol.rules.ts`; `403 INSUFFICIENT_ROLE`; TEST-09, TEST-13, TEST-19 |
| Temas y tema activo persistentes en el BFF, con revisión propia (REQ-10; AC-10, AC-19) | `appearance` del estado (`SCHEMA_VERSION = 3`, [ADR-0011](../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md)); `409 STALE_THEMES`; TEST-07, TEST-13, TEST-19 |
| Modo demo y tuerca «Cambiar tema» con vista previa local (REQ-11, REQ-12; AC-15, AC-16, AC-21) | `WEBSTORE_DEMO_MODE` (`demoMode`); cookie `ws_tema_vista_previa` ([ADR-0012](../adrs/0012-activar-el-modo-demo-y-recordar-la-vista-previa-en-una-cookie.md)); `SelectorTemaComponent` en las dos aplicaciones; TEST-08, TEST-12, TEST-15, TEST-21, TEST-25 |
| Contraste AA de los predefinidos y aviso o bloqueo en los propios (REQ-13, REQ-14, REQ-17; AC-13, AC-14, AC-20) | `contraste.rules.mjs` y `PARES_DE_CONTRASTE` (15 pares); pares medidos en [`VISUAL-SYSTEM.md`](../../frontend/docs/VISUAL-SYSTEM.md) y en la verificación de la feature; TEST-01, TEST-03, TEST-04, TEST-05, TEST-14 |
| El tema no cambia el logo ni las imágenes (REQ-15; AC-17) | Colores solo por tokens (`--ws-*`); TEST-20 (`storefront-temas.spec.ts`) y TEST-23 |
| Contenido sin colores y migración al tema «Colores de Contenido» (REQ-18; AC-22, AC-23) | Migración v3 en `normalizar-estado.mjs`; `sinColoresDeContenido`; TEST-10, TEST-11, TEST-13 |
| El tema activo de una instalación nueva es B; C se activa en la puesta en marcha de Ecom (REQ-19; AC-24) | Semilla con B activo; [`docs/development/puesta-en-marcha.md`](../development/puesta-en-marcha.md); TEST-08, TEST-10, TEST-11 |
| Menú lateral del Admin plegable por grupos en escritorio; en móvil, la tira de siempre (feature 003: REQ-01, REQ-02; AC-01 a AC-03, AC-13) | `AppLayout` (`frontend/projects/admin/src/app/layout/app.layout.ts`: título de grupo como botón, `gruposAbiertos` con `linkedSignal` e `isActive()`); clases `ws-plegable*` en `projects/admin/src/styles.css`; TEST-04 (`admin-menu-lateral.spec.ts`) y TEST-09. Detalle en [`verification.md`](../specs/features/003-ajustes-del-admin/verification.md) |
| Bloques del Resumen plegables (feature 003: REQ-03; AC-04) | `ResumenPage` (`bloquesPlegados`, `alternarBloque`), con la fila de tarjetas sin cambios; TEST-05 (`admin-resumen.spec.ts`) y TEST-09 |
| Plegables accesibles, con movimiento reducido y sin estado guardado en el navegador (feature 003: REQ-04, REQ-12; AC-05 a AC-07) | `<button>` con `aria-expanded` y `aria-controls`; `transition: none` con `prefers-reduced-motion`; estado solo en signals; TEST-03 (lint), TEST-04, TEST-05 y TEST-07 |
| Menú de usuario en la cabecera del Admin: iniciales, nombre, rol en mayúsculas, correo, «Perfil» y «Cerrar sesión» (feature 003: REQ-05 a REQ-07, REQ-09, REQ-10; AC-08 a AC-11) | `MenuUsuarioComponent` (`layout/menu-usuario.component.ts`, `MatMenu`, panel `ws-menu-usuario-panel`); `inicialesDeUsuario` en `features/sesion/domain/usuario-admin.rules.ts` con TEST-01 (`usuario-admin.rules.spec.mjs`); el layout no importa `features/sesion/presentation/` (TEST-02); TEST-06 (`admin-menu-usuario.spec.ts`) |
| Perfil de solo lectura (feature 003: REQ-08, REQ-10; AC-12) | `PerfilPage` (`features/sesion/presentation/perfil.page.ts`, ruta `/perfil` sin `permisoGuard` ni llamadas al BFF); TEST-06 |
| El Admin conserva su diseño fuera de lo pedido, con los tres temas (feature 003: REQ-11; AC-13 a AC-15) | Solo tokens en los estilos nuevos (TEST-08, `validate-structure`); capturas antes y después con A, B y C (TEST-09, ⚠ TASK-07) |
| Diálogo «Producto agregado» con dos botones, «Seguir comprando» y «Ver carrito» relleno (feature 004, PR #26: REQ-01, REQ-02; AC-01, AC-02) | `AgregarAlCarritoDialog` (`features/vitrina/presentation/agregar-al-carrito.dialog.ts`, `go()` solo con `'/carrito'`); botón relleno con `--mat-button-filled-*` en `tokens.css`; TEST-09 (`storefront-carrito.spec.ts`) |
| Textos del camino de compra: «Confirmar pedido» en el carrito y «Finalizar compra» como título y botón del checkout (feature 004, PR #26: REQ-03, REQ-04, REQ-11; AC-03, AC-04, AC-11, AC-16) | `CarritoPage`, `CheckoutPage` y la ruta `checkout` de `app.routes.ts` («WebStore \| Finalizar compra»); TEST-10, TEST-11 (compra completa, S/ 711.00) y TEST-16 |
| Lienzo de la tienda más claro que el del Admin, con A, B y C (feature 004, PR #26: REQ-05 a REQ-07, REQ-13 a REQ-15; AC-05 a AC-07, AC-12, AC-14, AC-15) | `--ws-store-bg` en `TOKENS_DEL_TEMA` (31 tokens) y cinco pares nuevos en `PARES_DE_CONTRASTE` (20 pares) del BFF y de la réplica del Admin ([ADR-0013](../adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md)); `bg-store-canvas` en el shell, la 404 y la vista previa de Temas; tono intermedio elegido por Daniel el 2026-11-13; TEST-01 a TEST-07, TEST-14, TEST-15 y TEST-18 |
| Panel del checkout y campos con contorno (feature 004, PR #26: REQ-08 a REQ-10; AC-08 a AC-10) | `ws-checkout-panel` en `CheckoutPage` y `storefront.css`, con `appearance="outline"` y los tokens `--mat-form-field-outlined-*`; `--ws-border-strong` de B en `#8894a6`; TEST-12 y TEST-13 (`storefront-checkout-panel.spec.ts`) |
| La tienda y el Admin conservan su diseño fuera de lo pedido, con los tres temas (feature 004, PR #26: REQ-12; AC-13) | Capturas antes y después con A, B y C: Admin iguales y en la tienda solo los cambios pedidos (TEST-17, ⚠ TASK-08) |
