# Historias de usuario de WebStore (MVP)

Historias de usuario del Storefront y del Admin, derivadas de los documentos de alcance del repositorio. Son la fuente de los requisitos de cada feature SDD ([relación con las especificaciones](../../specs/README.md#relación-con-las-historias-de-usuario)).

## Tabla de contenido

- [Origen y límites](#origen-y-límites)
- [Actores](#actores)
- [Matriz de trazabilidad](#matriz-de-trazabilidad)
  - [Épicas](#épicas)
  - [Historias de usuario](#historias-de-usuario)
- [Lo que no se convirtió en historia](#lo-que-no-se-convirtió-en-historia)

## Origen y límites

- Las historias se derivan de [`SCOPE.md`](../SCOPE.md), [`TRACEABILITY.md`](../TRACEABILITY.md) y [`FUNCIONALIDAD.md`](../FUNCIONALIDAD.md), que consolidan los acuerdos de las sesiones con el cliente, y del [contrato del BFF](../../../backend/docs/BFF-CONTRACT.md) cuando precisa una regla. Cada historia cita sus fuentes.
- Los criterios de aceptación solo recogen lo que esas fuentes dicen. No inventan reglas: lo que las fuentes dejan abierto aparece como pendiente, con su elemento del [backlog](../backlog.md).
- Todas describen lo que la demo ya implementa: su evidencia está en la [trazabilidad](../TRACEABILITY.md) y en la [validación](../../../frontend/docs/VALIDATION.md). No tienen capturas de prototipo.
- Daniel confirmó el 2026-11-20 el orden de prioridad de la reunión del 11/11 (PBI-0021). Los cambios que pidió se entregaron el 2026-11-23 por lotes, sin features nuevas ([ADR-0021](../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md)): cada historia afectada tiene sus escenarios nuevos, marcados «Añadido el 2026-11-23», y sus decisiones provisionales están en las [decisiones pendientes](../PENDING-DECISIONS.md).
- Lo que salió de la revisión de la demo del 2026-11-17 (PBI-0211 a PBI-0224 y PBI-0226) se entregó el 2026-11-24 por lotes, también sin features nuevas ([ADR-0025](../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md)): los escenarios nuevos o cambiados dicen «Añadido el 2026-11-24» o «Cambiado el 2026-11-24», en US01, US15, US16, US17, US18, US20, US21, US22, US24 y US26.
- Sin complejidad ni sprint asignados: las fuentes no los definen.

## Actores

Los roles del Admin son fijos ([glosario](../../architecture/glosario.md#rol-rol)). La descripción de los actores sale de [`PRODUCT.md`](../PRODUCT.md), que el equipo todavía debe revisar.

| Actor | Aplicación | Descripción |
|---|---|---|
| Comprador | Storefront | Busca productos, compra como invitado o con cuenta, y quiere ver precio con IGV, stock real y costo de envío a su distrito antes de pagar |
| Cliente | Storefront | Comprador que ya compró. Puede tener una cuenta opcional, con la que consulta sus pedidos |
| Superadministrador | Admin | Configura la tienda (temas y contenido) y gestiona a todos los usuarios. Puede hacerlo todo |
| Administrador | Admin | Opera la tienda día a día y gestiona a los vendedores, sin eliminarlos; no configura temas ni contenido |
| Vendedor | Admin | Crea productos y modifica todos sus campos (también precio, categoría y marca), sin eliminarlos; gestiona Inventario, donde se cambia el stock, y ve Pedidos sin cambiar su estado |

Daniel confirmó el 2026-11-18 los permisos de los tres roles con un cambio, construido en el lote 11: el vendedor también gestiona Inventario y ve Pedidos (PBI-0170; [decisiones pendientes](../PENDING-DECISIONS.md), «Permisos de los roles»; feature 006, entregada con el lote 07).

## Matriz de trazabilidad

### Épicas

| ID | Épica | Aplicación | Objetivo |
|---|---|---|---|
| EP01 | [Explorar el catálogo](ep-01-explorar-catalogo/ep-01-explorar-catalogo.md) | Storefront | Que el comprador encuentre el producto que busca y entienda su precio y disponibilidad |
| EP02 | [Comprar](ep-02-comprar/ep-02-comprar.md) | Storefront | Que el comprador compre sin fricción, sin estar obligado a crear una cuenta, y entienda costos y entrega |
| EP03 | [Cuenta del cliente](ep-03-cuenta-cliente/ep-03-cuenta-cliente.md) | Storefront | Ofrecer una cuenta opcional y segura al cliente que quiera tenerla |
| EP04 | [Pedidos del cliente](ep-04-pedidos-cliente/ep-04-pedidos-cliente.md) | Storefront | Que el cliente consulte sus pedidos y pueda corregirlos o cancelarlos durante 24 horas |
| EP05 | [Información y reclamos](ep-05-informacion-y-reclamos/ep-05-informacion-y-reclamos.md) | Storefront | Que el comprador entienda sus derechos y deje constancia de un reclamo |
| EP06 | [Administrar el catálogo](ep-06-administrar-catalogo/ep-06-administrar-catalogo.md) | Admin | Que el equipo mantenga productos, inventario, categorías y marcas en la misma fuente que usa la tienda |
| EP07 | [Operar la tienda](ep-07-operar-tienda/ep-07-operar-tienda.md) | Admin | Que el equipo despache pedidos, conozca a sus clientes, atienda reclamos y mantenga los costos de envío |
| EP08 | [Configurar el contenido](ep-08-configurar-contenido/ep-08-configurar-contenido.md) | Admin | Que el equipo cambie la identidad, la navegación, los textos y las campañas de la tienda sin tocar el código |
| EP09 | [Acceso administrativo](ep-09-acceso-administrativo/ep-09-acceso-administrativo.md) | Admin | Que cada persona del equipo entre al Admin y haga solo lo que su rol permite |

### Historias de usuario

| Épica | ID | Historia de usuario | Actor |
|---|---|---|---|
| EP01 – Explorar el catálogo | US01 | [Ver el inicio de la tienda](ep-01-explorar-catalogo/us-01-ver-inicio/us-01-ver-inicio.md) | Comprador |
| EP01 – Explorar el catálogo | US02 | [Buscar y filtrar el catálogo](ep-01-explorar-catalogo/us-02-buscar-y-filtrar-catalogo/us-02-buscar-y-filtrar-catalogo.md) | Comprador |
| EP01 – Explorar el catálogo | US03 | [Ver la ficha de un producto](ep-01-explorar-catalogo/us-03-ver-ficha-producto/us-03-ver-ficha-producto.md) | Comprador |
| EP02 – Comprar | US04 | [Agregar un producto al carrito](ep-02-comprar/us-04-agregar-al-carrito/us-04-agregar-al-carrito.md) | Comprador |
| EP02 – Comprar | US05 | [Gestionar el carrito](ep-02-comprar/us-05-gestionar-carrito/us-05-gestionar-carrito.md) | Comprador |
| EP02 – Comprar | US06 | [Comprar como invitado](ep-02-comprar/us-06-comprar-como-invitado/us-06-comprar-como-invitado.md) | Comprador |
| EP03 – Cuenta del cliente | US07 | [Registrar y verificar una cuenta](ep-03-cuenta-cliente/us-07-registrar-cuenta/us-07-registrar-cuenta.md) | Cliente |
| EP03 – Cuenta del cliente | US08 | [Iniciar sesión y recuperar la contraseña](ep-03-cuenta-cliente/us-08-iniciar-sesion-cliente/us-08-iniciar-sesion-cliente.md) | Cliente con cuenta |
| EP03 – Cuenta del cliente | US09 | [Editar y eliminar la cuenta](ep-03-cuenta-cliente/us-09-gestionar-cuenta/us-09-gestionar-cuenta.md) | Cliente con cuenta |
| EP04 – Pedidos del cliente | US10 | [Consultar mis pedidos](ep-04-pedidos-cliente/us-10-consultar-pedidos/us-10-consultar-pedidos.md) | Cliente |
| EP04 – Pedidos del cliente | US11 | [Modificar la entrega de un pedido](ep-04-pedidos-cliente/us-11-modificar-entrega/us-11-modificar-entrega.md) | Cliente |
| EP04 – Pedidos del cliente | US12 | [Cancelar un pedido](ep-04-pedidos-cliente/us-12-cancelar-pedido/us-12-cancelar-pedido.md) | Cliente |
| EP05 – Información y reclamos | US13 | [Consultar las páginas informativas](ep-05-informacion-y-reclamos/us-13-consultar-paginas-informativas/us-13-consultar-paginas-informativas.md) | Comprador |
| EP05 – Información y reclamos | US14 | [Registrar un reclamo en el Libro de Reclamaciones](ep-05-informacion-y-reclamos/us-14-registrar-reclamo/us-14-registrar-reclamo.md) | Comprador |
| EP06 – Administrar el catálogo | US15 | [Gestionar productos](ep-06-administrar-catalogo/us-15-gestionar-productos/us-15-gestionar-productos.md) | Administrador o vendedor |
| EP06 – Administrar el catálogo | US16 | [Gestionar el inventario](ep-06-administrar-catalogo/us-16-gestionar-inventario/us-16-gestionar-inventario.md) | Administrador |
| EP06 – Administrar el catálogo | US17 | [Gestionar categorías jerárquicas](ep-06-administrar-catalogo/us-17-gestionar-categorias/us-17-gestionar-categorias.md) | Administrador |
| EP06 – Administrar el catálogo | US18 | [Gestionar marcas](ep-06-administrar-catalogo/us-18-gestionar-marcas/us-18-gestionar-marcas.md) | Administrador |
| EP07 – Operar la tienda | US19 | [Gestionar pedidos](ep-07-operar-tienda/us-19-gestionar-pedidos/us-19-gestionar-pedidos.md) | Administrador |
| EP07 – Operar la tienda | US20 | [Consultar clientes](ep-07-operar-tienda/us-20-consultar-clientes/us-20-consultar-clientes.md) | Administrador |
| EP07 – Operar la tienda | US21 | [Atender reclamos](ep-07-operar-tienda/us-21-atender-reclamos/us-21-atender-reclamos.md) | Administrador |
| EP07 – Operar la tienda | US22 | [Gestionar las tarifas de envío](ep-07-operar-tienda/us-22-gestionar-tarifas-envio/us-22-gestionar-tarifas-envio.md) | Administrador |
| EP08 – Configurar el contenido | US23 | [Configurar el contenido de la tienda](ep-08-configurar-contenido/us-23-configurar-cms/us-23-configurar-cms.md) | Superadministrador |
| EP08 – Configurar el contenido | US24 | [Gestionar banners](ep-08-configurar-contenido/us-24-gestionar-banners/us-24-gestionar-banners.md) | Administrador |
| EP09 – Acceso administrativo | US25 | [Iniciar sesión en el Admin](ep-09-acceso-administrativo/us-25-iniciar-sesion-admin/us-25-iniciar-sesion-admin.md) | Usuario administrativo |
| EP09 – Acceso administrativo | US26 | [Gestionar usuarios y roles](ep-09-acceso-administrativo/us-26-gestionar-usuarios-y-roles/us-26-gestionar-usuarios-y-roles.md) | Superadministrador o administrador (vendedores) |

«Administrador» en la columna Actor incluye al superadministrador, que puede hacerlo todo.

Cada épica y cada historia tiene su propio archivo. Las historias viven dentro de la carpeta de su épica (`ep-NN-slug/us-NN-slug/us-NN-slug.md`). Esta matriz es la única fuente de la épica, la aplicación, el objetivo y el actor de cada elemento.

## Lo que no se convirtió en historia

| Tema | Motivo |
|---|---|
| Resumen (Dashboard) del Admin | Las fuentes lo nombran, pero no dicen qué muestra. Daniel lo definió el 06/11 (la estructura del dashboard de OpenCart) y se especificó como la feature [001](../../specs/features/001-reorganizar-resumen-del-admin/specification.md), no como historia. Desde el lote 13 se llama «Dashboard», sus ventas no suman el envío y sus cifras se pliegan (PBI-0168, PBI-0186 y PBI-0187). Desde el lote 23 dice «Clientes web nuevos» y ya no tiene «Pedidos por distrito» (PBI-0222, provisional) |
| Página 404 | Se mencionó sin detalle. El lote 05 la implementó con una decisión provisional, que Daniel confirmó el 2026-11-20 (PBI-0020, [decisiones pendientes](../PENDING-DECISIONS.md)); no es un comportamiento de negocio |
| Pasarela de pago, facturación electrónica, correo transaccional, multi-tenant y SSR/SEO | Decisiones abiertas ([`PENDING-DECISIONS.md`](../PENDING-DECISIONS.md) y [backlog](../backlog.md)) |
| Identidad visual, fotografía eficiente y rendimiento | Son requisitos de diseño y calidad, no de comportamiento: viven en el [sistema visual](../../../frontend/docs/VISUAL-SYSTEM.md) y en la [validación](../../../frontend/docs/VALIDATION.md) |
| Separación Storefront/Admin, fuente única y orientación a BFF | Son decisiones de arquitectura: viven en la [vista de sistema](../../architecture/README.md) y en los ADR |
