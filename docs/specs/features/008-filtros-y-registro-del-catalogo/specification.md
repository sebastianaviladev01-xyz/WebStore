# 008. Filtros y registro del catálogo del Admin — Especificación

- Feature: `008-filtros-y-registro-del-catalogo`
- Historia de usuario: ninguna como origen. Sale de [PBI-0137 y PBI-0138](../../../planning/backlog.md), acciones asignadas a Sebastián en la reunión del equipo (Daniel, Walther y Sebastián), con las notas pegadas el 2026-11-14 y registradas en el PR #45. Modifica la forma de trabajar de US15 ([Gestionar productos](../../../planning/user-stories/ep-06-administrar-catalogo/us-15-gestionar-productos/us-15-gestionar-productos.md)), US17 ([Gestionar categorías jerárquicas](../../../planning/user-stories/ep-06-administrar-catalogo/us-17-gestionar-categorias/us-17-gestionar-categorias.md)) y US18 ([Gestionar marcas](../../../planning/user-stories/ep-06-administrar-catalogo/us-18-gestionar-marcas/us-18-gestionar-marcas.md)), sin cambiar sus escenarios.
- Estado: aprobada
- Fecha: 2026-11-14
- Hito de alcance: aprobado por Sebastián Avila el 2026-11-14, con las siete [decisiones del hito](#decisiones-del-hito-de-alcance). D1 a D4 son **provisionales**: responden preguntas de producto que la reunión no cerró, y Sebastián Avila pidió decidirlas con el mejor criterio y corregirlas si Daniel cambia algo («tomemos la iniciativa y si cambia algo luego lo corregimos, pero toma las mejores decisiones»). Daniel respondió el 2026-11-20 en las [decisiones pendientes](../../../planning/PENDING-DECISIONS.md) («Filtros y registro de los listados del Admin») sin pedir cambios en ellas; solo pidió alinear a la derecha los botones del panel (PBI-0171)

## Problema y actores

En el Admin, las páginas Productos (`/productos`), Categorías (`/categorias`) y Marcas (`/marcas`) muestran la lista y, en una columna a la derecha, el formulario de registro. Ninguna de las tres tiene filtros de búsqueda. En la reunión del 2026-11-14, Daniel comparó la página de productos con la de OpenCart, donde esa columna derecha es de filtros, y pidió corregir la estructura:

- «Los filtros van a ser así como lo dejé, debajo del título y encima de la tabla. El botón Nuevo Producto debe llevarte a una interfaz nueva, así como esa que se puede ver» (47:31). Antes: «tienen que estar en la parte superior, debajo del título y antes de la tabla. De manera estandarizada» (47:05), sin barra lateral.
- El botón «Buscar» es el que trae los datos actualizados: «ese botón buscar prácticamente se encargaba de traer justamente los datos actualizados de los resultados de búsqueda. Ahí está prácticamente tu función de actualizar» (40:53). Si alguien agrega productos con la pantalla ya cargada, «¿Qué tenías que hacer tú? Darle clic a tu botón buscar. Así, sin ningún filtro».
- La razón: «ahorita tú solamente tiene 5 productos. ¿Qué va a pasar cuando tenga 200 productos? ¿Dónde están los filtros de búsqueda? ¿Qué pasa si yo solamente quiero ver un producto que se llama cooler?» (40:53).
- De categorías y marcas: «toda esa parte del registro de productos, categorías y marcas […] Lo mismo. La cosa es estructura. Tiene que poner su panel de búsqueda propio» (50:05 a 50:23).

Elementos de acción de la reunión: «Corrige la estructura del registro de productos, coloca los filtros debajo del título y encima de la tabla, y haz que "Nuevo Producto" abra una interfaz independiente» y «Revisa y corrige las categorías y marcas del registro de productos».

Actores:

- `superadmin` y `admin`: gestionan productos (`products.manage`), categorías (`categories.manage`) y marcas (`brands.manage`).
- `vendedor`: entra en Productos (`products.edit`) y edita la ficha de productos existentes, sin «Nuevo producto» ni «Eliminar». No entra en Categorías ni en Marcas.

Aplicación afectada: el Admin. La tienda no cambia. El BFF no cambia salvo que el plan lo necesite para «Buscar» ([supuestos](#hechos-supuestos-y-decisiones-pendientes)).

## Alcance

**Incluye:**

- Productos, Categorías y Marcas del Admin: un panel de filtros debajo del título y encima de la lista, con la misma disposición en las tres páginas (PBI-0137 y PBI-0138).
- Los botones «Buscar», que consulta los datos actuales y muestra los que cumplen los filtros, y «Limpiar filtros».
- Paginación de las tres listas, de 25 en 25 (D2).
- El registro y la edición de productos, categorías y marcas en una interfaz propia de cada uno, separada del listado (D3 y D4).
- Capturas antes y después con A, B y C, en escritorio y en móvil (STD-12).

**Excluye:**

- Los filtros de los demás listados del Admin (Inventario, Clientes, Usuarios, Banners, Reclamaciones, Pedidos y Tarifas de envío): [PBI-0139](../../../planning/backlog.md).
- Quitar «Actualizar» de la cabecera o cambiar cómo carga sus datos cada pantalla: [PBI-0140](../../../planning/backlog.md), con la decisión pendiente «Botón «Actualizar» del Admin».
- Los campos, las validaciones y las reglas de un producto, una categoría o una marca: no cambian. Tampoco los permisos del vendedor, abiertos en la feature [006](../006-permisos-de-los-roles/specification.md).
- Ordenar las listas por columna: la lista conserva el orden de hoy.
- El catálogo de la tienda y sus filtros.

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | En Productos, los filtros de búsqueda están debajo del título de la página y encima de la lista, no en una columna lateral | PBI-0137; Daniel, 47:05 y 47:31 | Alta |
| REQ-02 | Al pulsar «Buscar», la lista muestra los registros que cumplen los filtros, con los datos actuales del BFF: también los que otra persona agregó o cambió después de abrir la página. Sin filtros, muestra todos | PBI-0137; Daniel, 40:53 | Alta |
| REQ-03 | Productos filtra por nombre, SKU, categoría, marca y estado; Categorías, por nombre y categoría padre; Marcas, por nombre y estado | [D1](#decisiones-del-hito-de-alcance) | Alta |
| REQ-04 | «Nuevo producto» abre una interfaz propia para el registro, en la que no está la lista; desde ella se vuelve al listado | PBI-0137; Daniel, 47:31 | Alta |
| REQ-05 | La lista ocupa el ancho de la página: el formulario deja de ocupar la columna derecha en las tres páginas | PBI-0137 y PBI-0138 (consecuencia de REQ-01, REQ-04 y REQ-07) | Alta |
| REQ-06 | Categorías y Marcas tienen su propio panel de filtros, con la misma disposición que Productos, y sus botones «Buscar» y «Limpiar filtros» | PBI-0138; Daniel, 50:05 a 50:23 | Alta |
| REQ-07 | «Editar» abre la misma interfaz de registro que «Nuevo», con los datos del registro; y Categorías y Marcas registran y editan en su propia interfaz, como Productos | [D3 y D4](#decisiones-del-hito-de-alcance) | Alta |
| REQ-08 | Lo que hoy se puede hacer en las tres páginas se sigue pudiendo hacer, con los mismos permisos: crear, editar y eliminar productos, categorías y marcas, la galería de fotos, la jerarquía y el orden de las categorías, y la edición de la ficha por el vendedor | US15, US17 y US18 | Alta |
| REQ-09 | Las tres páginas y las interfaces de registro se usan a 360, 375 y 390 px sin desplazamiento horizontal | STD-12 («sin desborde horizontal»); feature [007](../007-desborde-de-productos-del-admin/specification.md) | Alta |
| REQ-10 | Las tres listas se paginan de 25 en 25 cuando tienen más de 25 resultados | [D2](#decisiones-del-hito-de-alcance) | Media |
| REQ-11 | El panel de filtros de las tres páginas tiene «Limpiar filtros», que vacía todos los filtros de una vez | [D6](#decisiones-del-hito-de-alcance) | Media |

## Criterios de aceptación

### AC-01 — Filtros encima de la lista de productos

- Cubre: REQ-01, REQ-05
- Origen: PBI-0137

**Dado** el Admin a 1440 px, con una sesión de `superadmin`
**Cuando** se abre `/productos`
**Entonces** debajo del título «Productos» está el panel de filtros con «Buscar» y «Limpiar filtros», y debajo la lista de productos a todo el ancho de la página; no hay formulario de registro ni columna lateral.

### AC-02 — «Buscar» filtra con los datos actuales

- Cubre: REQ-02, REQ-03
- Origen: PBI-0137; Daniel, 40:53 («¿Qué pasa si yo solamente quiero ver un producto que se llama cooler?»)

**Dado** `/productos` abierto y, después, otra sesión que agrega un producto llamado «Cooler portátil»
**Cuando** se escribe «cooler» en el filtro «Nombre» y se pulsa «Buscar»
**Entonces** la lista muestra «Cooler portátil» y solo los productos cuyo nombre contiene «cooler».

### AC-03 — «Buscar» sin filtros muestra todo

- Cubre: REQ-02
- Origen: PBI-0137; Daniel, 40:53 («Así, sin ningún filtro»)

**Dado** `/productos` abierto y, después, otra sesión que agrega o cambia un producto
**Cuando** se pulsa «Buscar» sin ningún filtro
**Entonces** la lista muestra todos los productos, con el agregado y con los datos cambiados.

### AC-04 — Sin resultados

- Cubre: REQ-02
- Origen: [D7](#decisiones-del-hito-de-alcance)

**Dado** `/productos`
**Cuando** se busca con un filtro que ningún producto cumple
**Entonces** la lista dice que no hay productos que cumplan los filtros, distinto de un catálogo vacío, y los filtros se pueden cambiar o limpiar.

### AC-05 — «Nuevo producto» abre el registro

- Cubre: REQ-04
- Origen: PBI-0137

**Dado** `/productos`, con una sesión de `superadmin` o `admin`
**Cuando** se pulsa «Nuevo producto»
**Entonces** se abre la interfaz de registro del producto, con los mismos campos que hoy (nombre, SKU, descripción, imagen principal, miniatura, galería de fotos, características, precio, stock, categoría, marca y estado), sin la lista; se puede volver al listado sin guardar.

### AC-06 — Guardar un producto nuevo

- Cubre: REQ-04, REQ-08
- Origen: US15, Escenario 01; la vuelta al listado, [D5](#decisiones-del-hito-de-alcance)

**Dado** la interfaz de registro de un producto nuevo, con los campos obligatorios completos
**Cuando** se pulsa «Guardar producto» y el BFF lo guarda
**Entonces** el Admin vuelve al listado, con los filtros que tenía, la lista muestra el producto nuevo si cumple esos filtros, y la tienda lo muestra en su catálogo.

### AC-07 — Editar un producto

- Cubre: REQ-07, REQ-08
- Origen: US15; [D3](#decisiones-del-hito-de-alcance)

**Dado** `/productos`, con una sesión de `superadmin`, `admin` o `vendedor`
**Cuando** se pulsa «Editar» en un producto
**Entonces** se abre la misma interfaz de registro con los datos actuales del producto, y al guardar se vuelve al listado con el cambio. El vendedor sigue sin poder cambiar SKU, precio, categoría, marca ni estado.

### AC-08 — Filtros y registro de categorías

- Cubre: REQ-03, REQ-06, REQ-07, REQ-08
- Origen: PBI-0138; [D1 y D4](#decisiones-del-hito-de-alcance)

**Dado** `/categorias`, con una sesión de `superadmin` o `admin`
**Cuando** se filtra por nombre o por categoría padre y se pulsa «Buscar», y después se pulsa «Nueva categoría» o «Editar»
**Entonces** el panel de filtros está debajo del título y encima de la lista, la lista muestra las categorías que cumplen los filtros con los datos actuales, y el registro se abre en su propia interfaz, sin la lista. Siguen valiendo la jerarquía sin ciclos y el orden explícito o alfabético (US17).

### AC-09 — Filtros y registro de marcas

- Cubre: REQ-03, REQ-06, REQ-07, REQ-08
- Origen: PBI-0138; [D1 y D4](#decisiones-del-hito-de-alcance)

**Dado** `/marcas`, con una sesión de `superadmin` o `admin`
**Cuando** se filtra por nombre o por estado y se pulsa «Buscar», y después se pulsa «Nueva marca» o «Editar»
**Entonces** el panel de filtros está debajo del título y encima de la lista, la lista muestra las marcas que cumplen los filtros con los datos actuales, y el registro se abre en su propia interfaz, sin la lista (US18).

### AC-10 — Misma disposición en las tres páginas

- Cubre: REQ-01, REQ-06
- Origen: Daniel, 47:05 («De manera estandarizada»)

**Dado** Productos, Categorías y Marcas a 1440 px
**Cuando** se comparan sus capturas
**Entonces** el título con su botón «Nuevo…», el panel de filtros con «Buscar» y «Limpiar filtros», la lista y la paginación están en el mismo orden y con la misma disposición en las tres.

### AC-11 — Permisos sin cambios

- Cubre: REQ-08
- Origen: US15, Escenario 03; [contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md) (roles fijos)

**Dado** una sesión de `vendedor`
**Cuando** abre `/productos`
**Entonces** puede filtrar, buscar y editar la ficha de un producto existente, no ve «Nuevo producto» ni «Eliminar», y si abre la dirección de la interfaz de registro de un producto nuevo, el Admin no le deja crearlo.

### AC-12 — Móvil sin desborde

- Cubre: REQ-09
- Origen: STD-12; feature 007

**Dado** el Admin a 360, 375 y 390 px, con A, B o C
**Cuando** se abren Productos, Categorías, Marcas y sus interfaces de registro
**Entonces** `document.documentElement.scrollWidth` es igual al ancho de la ventana, y los filtros, los botones, la lista, la paginación y el formulario se leen y se pueden usar.

### AC-13 — Solo cambia lo pedido

- Cubre: REQ-01 a REQ-07, REQ-10 y REQ-11
- Origen: STD-12

**Dado** las capturas antes y después de las tres páginas y del resto del Admin, a 1440 y 375 px con A, B y C
**Cuando** se comparan
**Entonces** solo cambian Productos, Categorías y Marcas como piden AC-01 a AC-10, AC-14 y AC-15; el menú lateral, la cabecera y las demás páginas quedan iguales.

### AC-14 — «Limpiar filtros»

- Cubre: REQ-11
- Origen: [D6](#decisiones-del-hito-de-alcance)

**Dado** Productos, Categorías o Marcas, con uno o varios filtros escritos
**Cuando** se pulsa «Limpiar filtros» y después «Buscar»
**Entonces** todos los filtros quedan vacíos de una vez y la lista muestra todos los registros con los datos actuales.

### AC-15 — Paginación

- Cubre: REQ-10
- Origen: [D2](#decisiones-del-hito-de-alcance)

**Dado** Productos, Categorías o Marcas con más de 25 resultados para los filtros aplicados
**Cuando** se mira la lista
**Entonces** muestra los 25 primeros, con «Página 1 de N» y botones para ir a la anterior y a la siguiente; una búsqueda nueva vuelve a la página 1. Con 25 resultados o menos, no hay paginación.

## Datos y contrato

Sin cambios en los datos de productos, categorías y marcas ni en sus reglas. El [contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md) no cambia salvo lo que decida el plan para «Buscar» (supuesto S1).

| Campo u operación | Regla | Roles | Origen |
|---|---|---|---|
| Filtros de Productos | «Nombre» y «SKU»: texto que el campo contiene. «Categoría»: la elegida y sus subcategorías. «Marca»: una de la lista. «Estado»: todos, activos o inactivos (por defecto, todos) | `superadmin`, `admin` y `vendedor` | REQ-03; D1 |
| Filtros de Categorías | «Nombre»: texto que el nombre contiene. «Categoría padre»: las categorías que cuelgan directamente de la elegida, o «Sin padre» para las de primer nivel | `superadmin` y `admin` | REQ-03; D1 |
| Filtros de Marcas | «Nombre»: texto que el nombre contiene. «Estado»: todas, activas o inactivas (por defecto, todas) | `superadmin` y `admin` | REQ-03; D1 |
| Comparación de texto | Sin distinguir mayúsculas ni tildes, sin los espacios del principio y del final, como el buscador de Tarifas de envío | Los de cada página | D7 |
| Combinación de filtros | Un registro sale si cumple todos los filtros escritos; un filtro vacío no filtra | Los de cada página | D1 |
| «Buscar» | Consulta los datos actuales del BFF, aplica los filtros y vuelve a la página 1 | Los de cada página | REQ-02 |
| Paginación | 25 por página | Los de cada página | REQ-10; D2 |
| Crear, editar y eliminar | Sin cambios: `products.manage`, `products.edit` (solo la ficha), `categories.manage` y `brands.manage` | Los de hoy | REQ-08 |

## Interfaz

Cambio visual pedido en Productos, Categorías y Marcas del Admin, en escritorio y en móvil. Lo demás del Admin y la tienda se conservan ([STD-12](../../../architecture/standards.md)). El diseño de referencia es el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md#admin), sin tokens ni colores nuevos.

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| `/productos`, `/categorias` y `/marcas` | Panel de filtros con «Buscar» y «Limpiar filtros» debajo del título; la lista a todo el ancho, con paginación; sin formulario a la derecha | Sí (PBI-0137 y PBI-0138) |
| Interfaces de registro de productos, categorías y marcas (rutas nuevas, las elige el plan) | El formulario de hoy, en su propia página, para crear y editar, con la vuelta al listado | Sí (PBI-0137 y PBI-0138; D3 y D4) |
| Resto del Admin y la tienda | Ninguno | No |

## Integraciones

Ninguna.

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| «Buscar» falla (BFF caído o sesión vencida) | Se avisa del error junto al panel, se conservan los filtros y los resultados anteriores, y se puede reintentar | REQ-02 |
| Filtro de texto con mayúsculas, tildes o espacios de más | No distingue mayúsculas ni tildes y no tiene en cuenta los espacios del principio y del final (D7) | REQ-02, AC-02 |
| Volver de la interfaz de registro al listado | Al guardar y al volver sin guardar, se conservan los filtros y la página de la última búsqueda (D5 y D7) | REQ-04, AC-06 |
| Guardar un registro rechazado por el BFF (`409 STALE_SNAPSHOT`, `400`, `403` o `413`) | El formulario conserva lo escrito y muestra el error junto al botón; no se vuelve al listado | REQ-04, AC-06 |
| Abrir la edición de un registro que otra persona eliminó | El Admin avisa de que ya no existe y ofrece volver al listado | AC-07 |
| Filtrar categorías por nombre y que coincida una subcategoría | Se muestra con el nombre de su categoría padre, para que se entienda dónde está en la jerarquía (D7) | AC-08 |
| Filtrar productos por una categoría con subcategorías | Salen los productos de la categoría y de todas sus subcategorías (D1) | AC-02 |
| Eliminar desde el listado filtrado | Se elimina con la confirmación de hoy, y el listado sigue filtrado | REQ-08 |
| Eliminar el último registro de una página que no es la primera | La lista pasa a la página anterior | REQ-10, AC-15 |
| Sesión de `vendedor` en la dirección de un producto nuevo | El Admin no le deja crear el producto; el BFF ya lo rechaza (`403 CATALOG_SCOPE_VIOLATION`) | AC-11 |
| Catálogo de cientos de productos | Los filtros permiten encontrar uno sin recorrer la lista, y la lista se pagina de 25 en 25 | REQ-02, REQ-10 |

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio, sobre `5393ed2`):

- `productos.page.ts`, `categorias.page.ts` y `marcas.page.ts` usan una rejilla de dos columnas desde `xl:` (lista a la izquierda, formulario a la derecha de 440, 380 y 360 px) y no tienen ningún filtro.
- «Nuevo producto» está junto al título y solo vacía el formulario de la derecha (`newItem()`); solo lo ve quien tiene `products.manage`. «Editar» carga el registro en ese mismo formulario. Categorías y Marcas no tienen botón «Nueva…»: el formulario está siempre a la derecha.
- Eliminar pide confirmación en las tres páginas (`confirm('¿Eliminar producto?')`, `¿Eliminar categoría?` y `¿Eliminar marca?`).
- El vendedor entra en `/productos` (`products.edit`); el Admin le deshabilita categoría, marca y estado, y el BFF conserva SKU, precio, categoría, marca y estado y rechaza crear y eliminar.
- Las rutas están en `app.routes.ts`, protegidas con `permisoGuard`: `/productos` (`products.edit`), `/categorias` (`categories.manage`) y `/marcas` (`brands.manage`).
- El Admin carga todos sus datos con `GET /admin/snapshot` (`TiendaFacade.load()`), al entrar y con «Actualizar» de la cabecera, y guarda con `PUT /admin/snapshot`.
- La demo tiene 6 productos, 5 categorías (una subcategoría, «OLED») y 2 marcas.
- Tarifas de envío es el único listado del Admin con buscador: filtra al escribir, sin botón «Buscar», sin distinguir mayúsculas ni tildes, con páginas de 25 (`paginarTarifas`).
- La feature 007 dejó la lista de productos en dos líneas por debajo de 768 px; esa disposición se conserva en lo que no cambie esta feature.

**Supuestos** (se asumen hasta que se confirmen):

- S1. «Buscar» puede traer los datos actuales recargando el snapshot y filtrando en el Admin, sin rutas nuevas del BFF. Lo decide el plan; si hiciera falta una ruta, se registra en el contrato y, si es una decisión de arquitectura, en un ADR.
- S2. Las interfaces de registro son páginas del Admin con su propia ruta, no diálogos: «una interfaz nueva, así como esa que se puede ver», la de OpenCart.
- S3. Lo que hoy hace la feature 007 en móvil sigue valiendo para la lista de productos.

**Decisiones pendientes** (no bloquean: la feature sigue con las decisiones provisionales):

- D1 a D4: Daniel respondió el 2026-11-20 en [`PENDING-DECISIONS.md`](../../../planning/PENDING-DECISIONS.md) («Filtros y registro de los listados del Admin») sin pedir cambios en ellas; solo pidió alinear a la derecha los botones del panel (PBI-0171), que va como feature nueva. Si Daniel cambia alguna, se corrige en esta feature si todavía no se ha entregado, o en una feature nueva si ya se entregó.

## Preguntas abiertas

Ninguna. Las preguntas 1 a 4, de producto, tienen respuesta provisional (D1 a D4), que Daniel no pidió cambiar el 2026-11-20. Las 5 y 6, de interfaz, las respondió Sebastián Avila (D5 y D6).

## Decisiones del hito de alcance

Sebastián Avila, 2026-11-14. D1 a D4 y D7 se tomaron con el mejor criterio, a petición suya, a partir de lo que dijo Daniel, de OpenCart (la referencia que usó Daniel en la reunión) y de los patrones que ya tiene el Admin. D1 a D4 son provisionales hasta que Daniel las confirme. Daniel respondió el 2026-11-20 sin pedir cambios en ellas (PBI-0171 es solo la alineación de los botones).

- **D1 (provisional). Campos de los filtros.** Productos: «Nombre», «SKU», «Categoría», «Marca» y «Estado». Categorías: «Nombre» y «Categoría padre». Marcas: «Nombre» y «Estado». Un registro sale si cumple todos los filtros escritos, y la categoría de un producto incluye sus subcategorías. Motivo: Daniel citó como ejemplo nombre, tipo, estado y categoría, y OpenCart filtra los productos por nombre, modelo (el SKU), precio, cantidad y estado. Se dejan fuera precio y cantidad, porque OpenCart los busca por valor exacto y para el stock ya está Inventario, y se añaden categoría y marca, que es como se organiza el catálogo.
- **D2 (provisional). Paginación.** Las tres listas se paginan de 25 en 25, con «Página N de M», anterior y siguiente, como Tarifas de envío. Motivo: Daniel preguntó «¿Qué va a pasar cuando tenga 200 productos?» y notó la paginación de OpenCart; 25 es el tamaño que ya usa el Admin.
- **D3 (provisional). «Editar» abre la misma interfaz que «Nuevo».** Motivo: así lo hace OpenCart, y separar el registro del listado no tendría sentido si la edición siguiera en la lista.
- **D4 (provisional). Categorías y Marcas registran y editan en su propia interfaz,** con su botón «Nueva categoría» o «Nueva marca» junto al título, como Productos. Motivo: Daniel dijo «Lo mismo. La cosa es estructura» y pidió la disposición «de manera estandarizada».
- **D5. Al guardar se vuelve al listado.** Si el BFF lo guarda, el Admin vuelve al listado con los filtros que tenía (AC-06). Si el guardado falla, se queda en el formulario con lo escrito.
- **D6. «Limpiar filtros».** El panel de las tres páginas lleva «Limpiar filtros» junto a «Buscar»: vacía todos los filtros, y después «Buscar» muestra todo con los datos actuales (REQ-11, AC-14).
- **D7. Detalles de la búsqueda.** El texto se compara sin distinguir mayúsculas ni tildes y sin los espacios de los extremos, como en Tarifas de envío; sin resultados, la lista lo dice (AC-04); al volver de la interfaz de registro sin guardar, se conservan los filtros y la página; y una subcategoría que coincide se muestra con el nombre de su categoría padre.

## Referencias

- [Backlog](../../../planning/backlog.md): PBI-0137, PBI-0138, PBI-0139 y PBI-0140
- [Decisiones pendientes](../../../planning/PENDING-DECISIONS.md)
- [Historias de usuario](../../../planning/user-stories/user-stories.md): US15, US17 y US18
- [Contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md)
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md)
- [Estándares](../../../architecture/standards.md)
- [Trazabilidad](../../../planning/TRACEABILITY.md)
