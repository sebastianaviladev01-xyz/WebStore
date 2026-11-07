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
| Confirmación al agregar al carrito | `AgregarAlCarritoDialog`: Seguir comprando / Ver carrito / Finalizar compra |
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
| Color principal configurable | CMS → CSS custom property |
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
| Tarifas masivas | `frontend/projects/admin/src/app/features/tienda/domain/tarifa-envio.rules.ts`: un precio para varios distritos y ajuste porcentual por origen o global; pruebas en `tarifa-envio.rules.spec.mjs`, junto al código |
| Arquitectura limpia | features con capas `domain/application/data/presentation`: puertos `<Concepto>Gateway` en `domain/` y adaptadores `Bff<Concepto>Gateway` en `data/`; la capa de aplicación no importa `HttpClient` (verificado por Sheriff, ESLint, `test:architecture` y `validate-structure`); BFF en `domain/application/infrastructure/api` |
| Primera entrega funcional antes de SSR | SPA actual; SSR listado como fase posterior |
| Orientación a BFF | ports/adapters + Mock BFF + contrato documentado |
| Máximo de tres banners hero | `ContenidoFacade.heroBanners` filtra vigencia/ubicación y aplica `slice(0, 3)` |
| Home de e-commerce completo | Header, mega-menú, carrusel, accesos rápidos, campañas, destacados, categorías, beneficios y footer jerárquico |
| Identidad propia en lugar de clon LG | Paleta B azul cobalto (`src/styles/tokens.css`), hero en tarjeta, categorías de texto, beneficios en tarjetas claras, footer azul marino, Source Sans 3, assets y copy propios; ver `VISUAL-SYSTEM.md` |
| Contenido legal editable | CMS publica textos de Contacto, Envíos, Privacidad y Términos; rutas respetan sus toggles |
| Fotografía eficiente en listados | miniaturas de 480 px, `srcset`/carga diferida y prioridad exclusiva para el LCP |
