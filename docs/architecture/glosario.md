# Glosario de negocio

Vocabulario canónico de WebStore. Cada concepto usa el mismo término en las historias de usuario, las especificaciones y el código. Los nombres en código siguen [ADR-0003](../adrs/0003-usar-espanol-para-el-vocabulario-de-negocio.md): la parte de negocio va en español y los términos técnicos en inglés.

- La columna «Código» da el identificador real en el frontend (Storefront en `frontend/src/app/`, Admin en `frontend/projects/admin/src/app/`) y, si existe, la carpeta del BFF (`backend/src/<capa>/<capacidad>/`).
- La columna «Contrato y estado del BFF» da el nombre en el [contrato HTTP](../../backend/docs/BFF-CONTRACT.md) y en el archivo de estado. Esos nombres, y los métodos, propiedades y signals de las clases, siguen en inglés, pendientes de migrar (PBI-0022 del [backlog](../planning/backlog.md)). No se toman como ejemplo para código nuevo.

## Aplicaciones

| Término | Definición | Código | Contrato y estado del BFF |
|---|---|---|---|
| Tienda (Storefront) | Aplicación pública donde el comprador navega, compra y consulta sus pedidos. | Proyecto Angular `storefront`, en `frontend/src/` | — |
| Admin | Panel privado donde el equipo de la tienda opera catálogo, pedidos, contenido y usuarios. | Proyecto Angular `admin`, en `frontend/projects/admin/`; su feature de operación es `tienda` (`TiendaFacade`) | — |
| BFF de prueba | Sustituto de demostración del BFF productivo: única fuente de datos de las dos aplicaciones. Los documentos anteriores lo llaman «Mock BFF». | `backend/`; adaptadores `Bff<Concepto>Gateway` en el frontend | Base `/bff`; estado en `backend/data.json` |
| Snapshot de la tienda | Estado completo que el Admin lee y guarda de una vez, filtrado por rol. | `SnapshotTienda`, `TiendaGateway`, `CambiosTienda` | `/bff/admin/snapshot` |
| Revisión | Número del estado que impide guardar sobre datos desactualizados. | `SnapshotDesactualizadoError`; `domain/comun/revision.rules.mjs` | `revision`; `409 STALE_SNAPSHOT` |
| Panel de filtros | Recuadro de un listado del Admin, debajo del título y encima de la lista, con los campos de búsqueda, «Buscar», que trae los datos actuales y aplica los filtros, y «Limpiar filtros», que los vacía sin buscar. Los filtros aplicados y la página quedan en la dirección de la página. Hoy en Productos, Categorías y Marcas (feature 008, sin fusionar). | `PanelFiltrosComponent` (`ws-filter-panel`) y `PaginacionComponent` (`ws-pagination`); reglas en `filtro-catalogo.rules.ts` y `listado.rules.ts`; `TiendaFacade.refresh()` | Parámetros de la URL del Admin (`nombre`, `sku`, `categoria`, `marca`, `estado`, `padre`, `pagina`); datos de `/bff/admin/snapshot`, sin endpoint nuevo |
| Interfaz de registro | Página propia del Admin para crear o editar un registro, separada de su listado, con «Volver a …» y «Cancelar», que regresan al listado con sus filtros. Hoy la tienen Productos, Categorías y Marcas (feature 008, sin fusionar). | `RegistroProductoPage`, `RegistroCategoriaPage`, `RegistroMarcaPage`; rutas `/productos/nuevo` y `/productos/:id`, y sus pares de `categorias` y `marcas` | Guardado con `PUT /bff/admin/snapshot`, sin endpoint nuevo |

## Catálogo e inventario

| Término | Definición | Código | Contrato y estado del BFF |
|---|---|---|---|
| Producto | Artículo que se vende, con precio con IGV, stock, fotos, descripción y características. | `Producto` (en `catalogo` y en `tienda` del Admin); `domain/catalogo/` | `products`; `/bff/catalog/products` |
| Ficha de producto | Página de detalle de un producto. | `DetalleProductoPage` (feature `vitrina`), ruta `/catalogo/:slug` | `/bff/catalog/products/:slug` |
| Galería | Fotos adicionales de un producto. En la tienda se publican después de la imagen principal. | — | `gallery` (Admin), `images` (catálogo público) |
| Insignia | Etiqueta comercial de un producto: Nuevo, Oferta o Top ventas. | `InsigniaProducto` | — |
| Categoría | Agrupación jerárquica de productos, sin ciclos, con orden explícito o alfabético. No exige íconos. | `Categoria`, `descendientesDeCategoria()`, `aplanarArbolCategorias()`; `CategoriasPage` | `categories`, `parentId` |
| Marca | Fabricante de un producto. | `Marca`; `MarcasPage` | `brands` |
| Inventario (stock) | Unidades disponibles de cada producto. Es uno solo para Admin y tienda; el checkout lo descuenta y la cancelación lo libera. | `InventarioPage`; `domain/catalogo/inventario.rules.mjs` | `stock` |
| Vitrina | Presentación que combina catálogo, carrito y contenido: inicio, listado, ficha, tarjeta de producto y diálogo de agregar al carrito. Es una feature técnica, no un concepto que vea el comprador. | Feature `vitrina`: `InicioPage`, `CatalogoPage`, `TarjetaProductoComponent`, `AgregarAlCarritoDialog` | — |

## Compra y pedidos

| Término | Definición | Código | Contrato y estado del BFF |
|---|---|---|---|
| Carrito | Productos y cantidades elegidos antes de comprar. Guarda solo id y cantidad; precio y stock salen del catálogo vigente. | `CarritoFacade`, `LineaCarrito`, `CarritoPage` | `localStorage` del navegador |
| Valor de venta e IGV | Desglose del precio: valor sin impuesto e IGV, mostrados en carrito y checkout. | `CarritoFacade` (`taxableBase`, `igv`) | `subtotal`, `igv` |
| Checkout | Paso donde el comprador da sus datos, la dirección, la fecha de entrega y el método de pago, y crea el pedido. En la interfaz se titula «Finalizar compra» desde la feature 004 (PR #26). | `CheckoutFacade`, `CheckoutCommand`, `CheckoutPage` | `/bff/checkout/orders`; `application/checkout/` |
| Compra como invitado | Compra sin cuenta. El invitado consulta su pedido con un token de acceso guardado en el dispositivo. | `CredencialesPedido` | `accessToken`, cabecera `x-order-token` |
| Pedido | Compra registrada, con líneas, montos recalculados en el servidor, dirección y fecha de entrega. | `Pedido`, `PedidoRegistrado`, `ComprobantePedido`, `LineaPedido` (Admin); `PedidosFacade` | `orders`; `/bff/orders` |
| Estado del pedido | Etapa del pedido. Valores en [Estado del pedido](#estado-del-pedido-estadopedido). | `EstadoPedido`, `ETIQUETAS_ESTADO_PEDIDO` | `status` |
| Ventana de 24 h | Plazo, desde la creación del pedido, en que el cliente puede cambiar la dirección o la fecha de entrega, o cancelarlo. | — | `ORDER_MODIFICATION_WINDOW_MS`, `canModify()` en `domain/pedidos/pedido.rules.mjs` |
| Método de pago | Medio elegido en el checkout. Los de la demo son demostrativos: la pasarela definitiva está pendiente. | `MetodoPago`: `card`, `yape-plin`, `transfer` | `paymentMethod` |
| Dirección de envío | Dirección, distrito, provincia, departamento y referencia. El MVP usa una por pedido. | `DireccionEnvio` | `shipping` |

## Envíos

| Término | Definición | Código | Contrato y estado del BFF |
|---|---|---|---|
| Tarifa de envío | Precio de envío de una tienda de origen a un distrito de destino. Se mantiene en el Admin como tabla origen → destino. | `TarifaEnvio`, `TarifasEnvioPage`, `tarifa-envio.rules.ts` (Admin) | `rates`; `/bff/shipping/rates` |
| Tienda de origen | Local desde donde se despacha. Sin origen indicado, el BFF elige la tarifa más baja para el destino, que corresponde a la tienda más próxima. | — | `origin`, `shippingOrigin` |
| Distrito (destino) | Lugar de entrega que elige el comprador; determina el costo de envío. | `DireccionEnvio.district` | `destination` |
| Cotización de envío | Costo y origen del envío a un distrito. | `CotizacionEnvio`, `EnvioGateway` | `/bff/shipping/quote` |

## Clientes, cuentas y acceso

| Término | Definición | Código | Contrato y estado del BFF |
|---|---|---|---|
| Cliente | Persona que compró, con o sin cuenta. El checkout lo crea o lo actualiza, y es visible en el Admin. **Cliente no es lo mismo que cuenta.** | `Cliente` (Admin), `ClienteCheckout`; `ClientesPage` | `customers` |
| Cuenta | Acceso opcional de un cliente a la tienda, con correo verificado y contraseña. Permite ver su historial de pedidos. | `CuentaCliente`, `CuentaFacade`, `CuentaGateway` | `accounts`; `/bff/accounts`; `application/cuentas/` |
| Código de verificación | Código temporal (15 minutos) para activar una cuenta o recuperar la contraseña. | `EntregaCodigo`, `VerificarPage`, `RecuperarPage` | `CODE_TTL_MS`; `/bff/account-verifications`, `/bff/password-resets` |
| Sesión de cuenta | Acceso autenticado de un cliente, con token opaco que vence y se puede revocar. | `SesionCuenta` | `accountSessions`; `/bff/account-sessions` |
| Usuario administrativo | Persona del equipo de la tienda que entra al Admin. Sus iniciales (primera letra de la primera y de la última palabra del nombre o, sin nombre, la del correo) identifican su menú de usuario en la cabecera. | `UsuarioAdmin`; `UsuariosPage`; `inicialesDeUsuario()` en `usuario-admin.rules.ts` | `users`; `domain/admin/usuario-admin.rules.mjs` |
| Sesión administrativa | Acceso autenticado al Admin, con token opaco enviado como `Bearer`. | `SesionFacade`, `SesionGateway`, `SesionConcedida`, `sesionGuard` | `adminSessions`; `/bff/admin/sessions` |
| Perfil | Página de solo lectura del Admin con el nombre, el correo y el rol (con su descripción) del usuario de la sesión. Se abre desde el menú de usuario de la cabecera y la ven los tres roles. No edita nada. | `PerfilPage` (`/perfil`), `MenuUsuarioComponent` | Sin endpoint: usa los datos de la sesión ya concedida |
| Rol | Conjunto fijo de permisos de un usuario administrativo. Se asigna, no se crea ni se edita. Valores en [Rol](#rol-rol). | `Rol`, `DefinicionRol`, `ROLES`, `rolPuede()` | `role`; `ADMIN_ROLES`, `can()` en `domain/sesion/rol.rules.mjs` |
| Permiso | Operación que un rol puede hacer en el Admin, por ejemplo `products.edit` o `orders.manage`. | `Permiso`, `permisoGuard(permiso)` | `ADMIN_PERMISSIONS`; `403 INSUFFICIENT_ROLE` |
| Resumen | Pantalla inicial del Admin, visible para los tres roles: cuatro tarjetas con «Ver más», gráfico por día del mes, pedidos por distrito, alertas de inventario, últimos pedidos y pedidos por estado. Las fuentes la llaman también «Dashboard». Sus bloques de pedidos y de clientes dependen de `orders.manage` y `customers.manage`. | `ResumenPage`, `TarjetaIndicadorComponent`, `GraficoPedidosComponent`; reglas en `resumen.rules.ts` | Permiso `dashboard.view`; datos del snapshot `/bff/admin/snapshot`, sin endpoint nuevo |
| Total de ventas | Suma del `total` (productos y envío) de los pedidos que no están cancelados, redondeada a céntimos. | `calcularIndicadores` (`Indicador`) | `orders[].total` |
| Cliente nuevo | Cliente cuyo primer pedido, incluidos los cancelados, cae en la fecha de Lima considerada. El cliente no tiene fecha de alta: se toma la de su primer pedido, buscado por correo sin espacios ni mayúsculas. | `clientesNuevosPorFecha`, `DiaDelMes.clientesNuevos` | `orders[].customerEmail`, `orders[].createdAt` |
| Variación | Porcentaje entero del mes en curso frente al mismo tramo del mes anterior; `null` («—») si el tramo anterior vale 0. | `variacionPorcentual`, `tramosDeComparacion`, `Indicador.variacion` | — |

## Contenido y reclamos

| Término | Definición | Código | Contrato y estado del BFF |
|---|---|---|---|
| Contenido (CMS) | Configuración de la tienda que publica el Admin: logo, contacto, mensaje superior, navegación superior y lateral, pie de página, tipografía y textos de las páginas informativas. | `ConfiguracionTienda`, `ContenidoFacade`, `ContenidoPage` (Admin) | `config`; `/bff/content/settings` |
| Página informativa | Contacto, Envíos, Privacidad o Términos. Su texto se edita en el CMS y se puede desactivar; desactivada, tampoco se abre por URL. | `ContactoPage`, `InformacionEnviosPage`, `PrivacidadPage`, `TerminosPage`; guards `contactoHabilitadoGuard`, `enviosHabilitadoGuard`, `privacidadHabilitadaGuard` y `terminosHabilitadosGuard` | Rutas `/info/*`; `contactPageEnabled`, `shippingPageEnabled`, `privacyPageEnabled` y `termsPageEnabled` en `config` |
| Banner | Pieza promocional con imagen, texto, enlace y vigencia (inicio y fin). El hero muestra hasta tres. | `Banner`, `UbicacionBanner`, `CarruselBannersComponent`, `BannersPage` | `banners`; `/bff/content/banners` |
| Inicio | Portada de la tienda. Hay una versión anterior publicada aparte para comparar. | `InicioPage`, `VarianteInicio` (`actual`, `anterior`) | Rutas `/` y `/inicio-anterior` |
| Libro de reclamaciones | Formulario público donde el consumidor deja un reclamo o una queja y recibe una constancia. | Feature `reclamos`: `LibroReclamacionesPage`, `ReclamosFacade` | `/bff/complaints`; `application/reclamos/` |
| Reclamo | Registro del libro de reclamaciones, con tipo, estado, plazo y respuesta del proveedor. | `Reclamo` (Admin), `RegistrarReclamoCommand`, `TipoReclamo`; `ReclamacionesPage` | `complaints` |
| Constancia del reclamo | Comprobante con el código `REC-AAAA-xxxxx` y la fecha límite de respuesta. | `ConstanciaReclamo` | `id`, `dueAt` |
| Plazo de respuesta | 15 días hábiles desde el registro, contando de lunes a viernes y los feriados configurados. | — | `COMPLAINT_DUE_BUSINESS_DAYS`, `WEBSTORE_NON_WORKING_DATES` |
| Respuesta del proveedor | Respuesta de la tienda al reclamo, registrada en el Admin. Su envío por correo está pendiente. | — | `providerResponse` |

## Apariencia y temas

| Término | Definición | Código | Contrato y estado del BFF |
|---|---|---|---|
| Tema | Conjunto de cinco colores con nombre (principal, secundario, fondo principal, fondo secundario y contraste) del que el BFF calcula el mapa de tokens `--ws-*` que aplican la tienda y el Admin. Es predefinido o propio. | `Tema`, `ColoresTema`, `TokensTema`; features `temas` de la tienda y del Admin; `domain/temas/` (BFF) | `appearance`; `/bff/appearance` y `/bff/admin/themes` |
| Tema predefinido | Tema que viene con el sistema y no se edita ni se borra: A «Violeta tienda», B «Azul cobalto» (el de la instalación) y C «Grafito y ámbar». | `TEMAS_PREDEFINIDOS` (`temas-predefinidos.mjs`) | `kind: 'predefined'`; `PREDEFINED_THEME_READ_ONLY` |
| Tema propio | Tema que el `superadmin` crea, edita y borra desde el Admin. Los tokens que no son uno de sus cinco colores se derivan de ellos. Su nombre es único; un contraste insuficiente bloquea o avisa al guardar. | `TemasPage`, `TemaDialog` (Admin); `tema-propio.rules.mjs` (BFF) | `appearance.customThemes`; `kind: 'custom'` |
| Tema activo | Único tema que ven todas las personas. Siempre existe; si el guardado no existe, pasa a B. Lo elige el `superadmin` (permiso `themes.manage`). | `TemasFacade`; `temaVisible()` | `appearance.activeThemeId`; `/bff/appearance/theme.css` |
| Modo demo | Instalación con la tuerca «Cambiar tema», que permite ver otro tema sin cambiar el activo. Se enciende con `WEBSTORE_DEMO_MODE=true`; apagado por defecto, también en producción. | `SelectorTemaComponent` (tienda y Admin) | `WEBSTORE_DEMO_MODE`; `demoMode` |
| Vista previa del tema | Tema que una persona elige con la tuerca en el modo demo. Solo vale en su navegador y no cambia el tema activo. | `COOKIE_VISTA_PREVIA`, `TemasFacade.verTema` | Cookie `ws_tema_vista_previa` |
| Lienzo de la tienda | Fondo de las páginas de la tienda, más claro que el fondo principal del tema, que sigue siendo el lienzo del Admin. En A, B y C es el tono intermedio entre su fondo principal y el blanco; en un tema propio, su fondo principal. Entregado con la feature 004 (PR #26, [ADR-0013](../adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md)). | Token `--ws-store-bg`; clase `bg-store-canvas` (`--color-store-canvas` en `tokens.css`) | `Tema.tokens['--ws-store-bg']`; `/bff/appearance/theme.css` |
| Revisión de temas | Número propio de los temas que impide guardar sobre una lista desactualizada. Es independiente de la revisión del snapshot. | `TemasDesactualizadosError` (Admin) | `appearance.revision`; `409 STALE_THEMES` |

## Valores

Las etiquetas visibles son las del código; los valores almacenados siguen en inglés.

### Estado del pedido (`EstadoPedido`)

| Valor | Etiqueta |
|---|---|
| `confirmed` | Confirmado |
| `processing` | En preparación |
| `shipped` | Enviado |
| `delivered` | Entregado |
| `cancelled` | Cancelado. Libera el stock reservado |

### Rol (`Rol`)

| Valor | Etiqueta | Puede |
|---|---|---|
| `superadmin` | Superadministrador | Todo, incluida la gestión de usuarios y el reinicio de la demo |
| `admin` | Administrador | Toda la operación de la tienda, sin gestionar usuarios |
| `vendedor` | Vendedor | Resumen, ficha de productos existentes, inventario y estado de pedidos |

Los permisos exactos de cada rol están en el [contrato](../../backend/docs/BFF-CONTRACT.md#roles-fijos-acordados-el-0511). Los del vendedor están pendientes de confirmar ([decisiones pendientes](../planning/PENDING-DECISIONS.md)).

### Tipo de reclamo (`TipoReclamo`)

- `reclamo`
- `queja`

### Estado del reclamo

| Valor | Etiqueta |
|---|---|
| `received` | Recibido |
| `in-review` | En revisión |
| `resolved` | Resuelto |

### Ubicación del banner (`UbicacionBanner`)

| Valor | Etiqueta |
|---|---|
| `hero` | Hero principal |
| `promotion` | Promoción |
| `secondary` | Banner secundario |

## Términos pendientes

| Término | Situación |
|---|---|
| Nombres en inglés del contrato y de las clases | Pendientes de migrar al español (PBI-0022 del [backlog](../planning/backlog.md)). Cambiar el contrato exige cambiar a la vez el BFF y sus pruebas ([ADR-0003](../adrs/0003-usar-espanol-para-el-vocabulario-de-negocio.md)). |
| Diferencia legal entre reclamo y queja | El código solo distingue el tipo. La revisión legal está pendiente ([decisiones pendientes](../planning/PENDING-DECISIONS.md)). |
