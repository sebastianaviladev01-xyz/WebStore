# 006. Permisos de los roles — Especificación

- Feature: `006-permisos-de-los-roles`
- Historia de usuario: modifica US26 (Gestionar usuarios y roles), US15 (Gestionar productos), US16 (Gestionar inventario) y US19 (Gestionar pedidos), en el [índice de historias](../../../planning/user-stories/user-stories.md). Sale de [PBI-0013](../../../planning/backlog.md) y de la decisión pendiente «Permisos exactos del rol Vendedor» ([`PENDING-DECISIONS.md`](../../../planning/PENDING-DECISIONS.md)). Sebastián Avila la eligió como siguiente trabajo el 2026-11-14.
- Estado: borrador
- Fecha: 2026-11-14
- Hito de alcance: pendiente y bloqueado. Las seis [preguntas](#preguntas-abiertas) dependen de lo que quiera Daniel y las fuentes no las responden de forma explícita: Sebastián Avila decidió el 2026-11-14 no responderlas él y llevarlas a Daniel ([decisiones pendientes](../../../planning/PENDING-DECISIONS.md), «Permisos exactos del rol Vendedor»)

## Problema y actores

Los tres roles fijos del Admin (`superadmin`, `admin` y `vendedor`) se acordaron el 05/11, cuando Daniel quedó en definir sus permisos («Definir roles», acción de Daniel). Los permisos que tiene hoy el código son una propuesta de la demo y no los que Daniel describió el 11/11.

Lo que dijo Daniel en la reunión del 11/11 (fuente: notas pegadas el 2026-11-11, 52:15 a 53:30):

- **Superadministrador:** «El Super Admin tiene acceso básicamente a la configuración total de la tienda». Como ejemplos dio los colores (los temas), las «integraciones con servicios externos» y «la clave del API Key» de la pasarela de pagos, y añadió que puede hacer también lo de los otros roles.
- **Administrador:** «El admin está más limitado». «El admin puede eliminar los productos» y puede gestionar a los usuarios «a nivel vendedor».
- **Vendedor:** «solo puede gestionar sus propios datos de vendedor y gestionar los productos, crear un nuevo producto, modificarle estos productos. Solamente puede hacer eso».

El 05/11, Daniel también dijo que el superadministrador «seríamos nosotros», es decir, el equipo de Simplesoft, y que el registro de usuarios lo hace un superadministrador.

Hoy ([`rol.rules.mjs`](../../../../backend/src/domain/sesion/rol.rules.mjs) y el [contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md), «Roles fijos»):

| Rol | Puede hoy | Diferencia con lo que dijo Daniel |
|---|---|---|
| `superadmin` | Todo, incluidos los usuarios, el reinicio de la demo y los temas | Coincide. Las integraciones y las claves de API no existen todavía |
| `admin` | Toda la operación: catálogo (crear, editar y eliminar productos), inventario, categorías, marcas, clientes, pedidos, banners, contenido, tarifas y reclamaciones. No gestiona usuarios | **No gestiona a los vendedores**. Si el contenido, los banners y las tarifas son «configuración de la tienda», hoy los tiene y según Daniel serían del superadministrador ([pregunta 4](#preguntas-abiertas)) |
| `vendedor` | Resumen, ficha de productos existentes (nombre, descripción, imágenes, características y stock), inventario y estado de los pedidos. No crea ni elimina, y no cambia precio, categoría ni marca | **No crea productos** y solo edita parte de la ficha. Además tiene inventario y pedidos, que Daniel no mencionó («Solamente puede hacer eso») |

Actores: `superadmin`, `admin` y `vendedor` del Admin. El BFF es la autoridad de los permisos; el Admin solo muestra u oculta opciones. Aplicaciones afectadas: Admin y BFF. La tienda no cambia.

## Alcance

**Incluye:**

- Que el vendedor pueda crear productos y modificarlos, sin eliminarlos ([preguntas 1 y 2](#preguntas-abiertas)).
- Que el administrador gestione a los usuarios con rol vendedor (crearlos, editarlos, desactivarlos y eliminarlos), sin tocar a los administradores ni a los superadministradores, ni asignar otros roles ([pregunta 5](#preguntas-abiertas)).
- Ajustar al vendedor los módulos que Daniel no mencionó (inventario y pedidos), según la [pregunta 3](#preguntas-abiertas).
- Ajustar al administrador los módulos de configuración de la tienda, según la [pregunta 4](#preguntas-abiertas).
- Las reglas en el BFF (autoridad) y su réplica en el Admin (menú, rutas y botones), el contrato del BFF, las historias afectadas y la cuenta de demostración de cada rol.

**Excluye:**

- Las integraciones con servicios externos y las claves de API de la pasarela: no existen todavía. Cuando se hagan, serán del superadministrador ([PBI-0058](../../../planning/backlog.md), que depende de la pasarela, PBI-0002).
- La edición de los datos propios del usuario (perfil), según la [pregunta 6](#preguntas-abiertas). Hoy `/perfil` es de solo lectura ([PBI-0034](../../../planning/backlog.md)).
- Productos propios de cada vendedor (que un vendedor solo vea o edite los que creó), según la [pregunta 2](#preguntas-abiertas). Depende del modelo de datos que prepara Daniel ([PBI-0043](../../../planning/backlog.md)).
- Crear o editar roles: siguen siendo fijos (05/11).
- La tienda y sus usuarios (clientes): no cambian.

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | El vendedor puede crear un producto nuevo desde Productos | Daniel, 11/11: «crear un nuevo producto» | Alta |
| REQ-02 | El vendedor puede modificar los productos, con los campos que decida la [pregunta 1](#preguntas-abiertas) | Daniel, 11/11: «modificarle estos productos» | Alta |
| REQ-03 | El vendedor no puede eliminar productos. El administrador y el superadministrador sí | Daniel, 11/11: «El admin puede eliminar los productos» | Alta |
| REQ-04 | El administrador puede crear, editar, desactivar y eliminar usuarios con rol vendedor, y solo puede asignarles ese rol | Daniel, 11/11: «gestionar los usos varios […] a nivel vendedor» | Alta |
| REQ-05 | El administrador no puede ver ni modificar a los usuarios administradores ni superadministradores | Daniel, 11/11 (el admin «está más limitado»); **propuesto** el detalle | Alta |
| REQ-06 | El superadministrador conserva todos los permisos, incluida la gestión de cualquier usuario, los temas y el reinicio de la demo | Daniel, 11/11; US26 | Alta |
| REQ-07 | El vendedor conserva o pierde inventario y pedidos según la [pregunta 3](#preguntas-abiertas) | Daniel, 11/11: «Solamente puede hacer eso» | Media |
| REQ-08 | El administrador conserva o pierde contenido, banners y tarifas según la [pregunta 4](#preguntas-abiertas) | Daniel, 11/11: «configuración total de la tienda» | Media |
| REQ-09 | El BFF aplica cada permiso en el servidor: una petición fuera del rol responde `403` sin cambiar el estado, aunque el Admin no muestre la opción | STD de autorización; contrato del BFF | Alta |
| REQ-10 | El menú, las rutas y los botones del Admin muestran a cada rol solo lo que puede hacer | US25 y US26; feature 003 (menú) | Alta |
| REQ-11 | Se conservan las reglas de US26: al menos un superadministrador activo, nadie se elimina ni se cambia el rol a sí mismo, y un usuario desactivado o eliminado pierde sus sesiones | US26, escenarios 02 a 04 | Alta |

## Criterios de aceptación

### AC-01 — El vendedor crea un producto

- Cubre: REQ-01, REQ-09
- Origen: Daniel, 11/11

**Dado** un vendedor en Productos
**Cuando** crea un producto con los campos obligatorios y guarda
**Entonces** el producto queda guardado y aparece en el catálogo del Admin y de la tienda.

### AC-02 — El vendedor modifica un producto

- Cubre: REQ-02, REQ-09
- Origen: Daniel, 11/11; los campos, de la [pregunta 1](#preguntas-abiertas)

**Dado** un vendedor que edita un producto existente
**Cuando** cambia los campos que su rol puede modificar y guarda
**Entonces** los cambios quedan guardados, y el BFF rechaza con `403` cualquier campo que su rol no pueda modificar.

### AC-03 — El vendedor no elimina

- Cubre: REQ-03, REQ-09, REQ-10
- Origen: Daniel, 11/11

**Dado** un vendedor en Productos
**Cuando** mira un producto
**Entonces** no ve la opción de eliminarlo, y si envía al BFF una lista de productos sin uno de ellos, el BFF responde `403 CATALOG_SCOPE_VIOLATION` y no borra nada.

### AC-04 — El administrador gestiona vendedores

- Cubre: REQ-04, REQ-10, REQ-11
- Origen: Daniel, 11/11

**Dado** un administrador en Usuarios
**Cuando** crea un usuario, o edita, desactiva o elimina uno existente con rol vendedor
**Entonces** el cambio queda guardado. Un usuario creado por el administrador solo puede tener el rol vendedor, y un vendedor desactivado o eliminado pierde sus sesiones abiertas.

### AC-05 — El administrador no toca a los demás roles

- Cubre: REQ-05, REQ-09
- Origen: **propuesto**

**Dado** un administrador en Usuarios
**Cuando** abre la lista
**Entonces** solo ve a los vendedores. Si envía al BFF un cambio sobre un administrador o un superadministrador, o asigna a alguien un rol que no sea vendedor, el BFF responde `403` y no cambia nada.

### AC-06 — El superadministrador sigue pudiendo todo

- Cubre: REQ-06, REQ-11
- Origen: Daniel, 11/11; US26

**Dado** un superadministrador
**Cuando** recorre cada módulo del Admin
**Entonces** puede hacer todo lo que puede hoy, incluidos los usuarios de cualquier rol, los temas y el reinicio de la demo, y siguen vigentes el último superadministrador activo y el bloqueo sobre sí mismo.

### AC-07 — Módulos del vendedor

- Cubre: REQ-07, REQ-10
- Origen: Daniel, 11/11; la lista, de la [pregunta 3](#preguntas-abiertas)

**Dado** un vendedor
**Cuando** abre el Admin
**Entonces** el menú, el Resumen y las rutas muestran solo los módulos de su rol, y el BFF rechaza con `403` los cambios en los demás.

### AC-08 — Módulos del administrador

- Cubre: REQ-08, REQ-10
- Origen: Daniel, 11/11; la lista, de la [pregunta 4](#preguntas-abiertas)

**Dado** un administrador
**Cuando** abre el Admin
**Entonces** el menú y las rutas muestran solo los módulos de su rol, y el BFF rechaza con `403` los cambios en los demás.

### AC-09 — Sin cambios para lo que no cambia

- Cubre: REQ-06, REQ-10
- Origen: STD-12

**Dado** el Admin con cada uno de los tres roles y la tienda
**Cuando** se comparan capturas antes y después
**Entonces** solo cambian las opciones que ganan o pierden los roles según este alcance. El diseño visual no cambia.

## Datos y contrato

- **Permisos.** La tabla de roles de [`rol.rules.mjs`](../../../../backend/src/domain/sesion/rol.rules.mjs) y su réplica del Admin cambian según las decisiones del hito. Que el administrador gestione solo a los vendedores no cabe en un permiso de todo o nada (`users.manage`): necesita una regla con alcance por rol, que decide el plan.
- **Productos.** Hoy el BFF decide por permiso: `products.manage` reemplaza la lista entera, y `products.edit` solo deja cambiar los campos de contenido de los productos existentes (`applyProductContentEdits`). Que el vendedor cree sin eliminar es una regla nueva entre las dos.
- **Contrato.** El [contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md) cambia en su tabla «Roles fijos» y en las respuestas `403` (`INSUFFICIENT_ROLE`, `CATALOG_SCOPE_VIOLATION` y la que corresponda a los usuarios). Las rutas no cambian. Si hay códigos de error nuevos, los fija el plan.
- **Estado.** No cambia la forma de los datos guardados. Las cuentas de demostración de los tres roles ya existen.

| Operación | Regla | Roles | Origen |
|---|---|---|---|
| Crear producto | Permitido | `superadmin`, `admin`, `vendedor` | REQ-01 |
| Modificar producto | Todos los campos para `superadmin` y `admin`; para `vendedor`, los que decida la pregunta 1 | Los tres | REQ-02 |
| Eliminar producto | Permitido solo a `superadmin` y `admin` | `superadmin`, `admin` | REQ-03 |
| Gestionar usuarios | `superadmin`: todos. `admin`: solo los de rol `vendedor`, sin asignar otro rol | `superadmin`, `admin` | REQ-04, REQ-05 |
| Inventario y pedidos | Según la pregunta 3 | — | REQ-07 |
| Contenido, banners y tarifas | Según la pregunta 4 | — | REQ-08 |
| Temas y reinicio de la demo | Sin cambios: solo `superadmin` | `superadmin` | REQ-06 |

## Interfaz

No se pide cambio de diseño: cambian las opciones visibles para cada rol ([STD-12](../../../architecture/standards.md)).

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| Productos (vendedor) | Aparece «Nuevo producto» y, según la pregunta 1, más campos editables. No aparece «Eliminar» | Sí (opciones por rol) |
| Usuarios (administrador) | El módulo aparece en el menú, con solo los vendedores y el rol fijado en vendedor | Sí (opciones por rol) |
| Menú lateral y Resumen (vendedor y administrador) | Según las preguntas 3 y 4 | Sí (opciones por rol) |
| Superadministrador y tienda | Ninguno | No |

## Integraciones

Ninguna.

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| El vendedor envía la lista de productos sin uno | `403 CATALOG_SCOPE_VIOLATION`, sin cambios | REQ-03, AC-03 |
| El vendedor cambia un campo que su rol no puede modificar | `403`, sin cambios | REQ-02, AC-02 |
| El administrador cambia el rol de un vendedor a administrador | `403`, sin cambios | REQ-04, AC-05 |
| El administrador edita o desactiva a un superadministrador o a otro administrador | `403`, sin cambios | REQ-05, AC-05 |
| El administrador desactiva su propia cuenta o se cambia el rol | `409 SELF_LOCKOUT`, como hoy | REQ-11 |
| El administrador elimina a todos los vendedores | Permitido: no hay mínimo de vendedores | REQ-04 |
| Un vendedor tiene sesión abierta mientras el administrador lo desactiva | Su sesión deja de ser válida | REQ-11, AC-04 |
| Un usuario abre por URL una ruta que su rol ya no tiene | El `permisoGuard` lo lleva al Resumen, y el BFF rechaza cualquier cambio | REQ-09, REQ-10 |
| Dos personas guardan a la vez | Control de revisión de hoy (`STALE_SNAPSHOT`) | REQ-09 |

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio o en las fuentes):

- Los permisos de hoy son los de `rol.rules.mjs`. Los aplica el BFF por colección del snapshot del Admin (`WRITE_PERMISSIONS` en `snapshot.rules.mjs`) y, para los productos, con `applyProductContentEdits` en `producto.rules.mjs`.
- `requireValidAdminUsers` (`usuario-admin.rules.mjs`) exige al menos un superadministrador activo y bloquea los cambios sobre la propia cuenta. No distingue quién gestiona a quién: hoy solo el superadministrador tiene `users.manage`.
- El Admin oculta las opciones con `session.can(...)` (menú, rutas con `permisoGuard` y los botones de Productos).
- Los productos no tienen dueño: no hay campo de vendedor ni de autor.
- Las e2e `admin-acceso`, `admin-menu-lateral`, `admin-resumen` y `admin-menu-usuario` comprueban hoy lo que ve el vendedor, y cambiarán con esta feature.
- La trazabilidad dice que el vendedor tiene «resumen, ficha de productos existentes, inventario y estado de pedidos». Es la propuesta de la demo, y PBI-0013 la deja pendiente de confirmar.

**Supuestos** (se asumen hasta que se confirmen):

- La tienda de Ecom tiene un solo negocio. Los vendedores son su personal, no tiendas distintas, así que gestionan todos los productos de la tienda. Se confirma con la [pregunta 2](#preguntas-abiertas).
- «Gestionar los usos varios» de la transcripción es «gestionar los usuarios»: es la única lectura coherente con «a nivel vendedor», y así se registró en PBI-0013 («gestionar vendedores»). El resumen automático de la reunión solo dice que se definieron «permisos distintos para la configuración de la tienda y la gestión de productos».

**Decisiones pendientes:**

- «Permisos exactos del rol Vendedor» ([`PENDING-DECISIONS.md`](../../../planning/PENDING-DECISIONS.md)), que ahora cubre los tres roles. Recoge las seis preguntas para Daniel. Esta feature la cierra con sus respuestas.
- «Arquitectura y modelo de datos base» (PBI-0043, Daniel). Afecta a la pregunta 2 si algún día los productos tienen dueño.

## Preguntas abiertas

Las responde Daniel: las fuentes no lo dicen de forma explícita (Sebastián Avila, 2026-11-14). Cada una lleva una recomendación, que no es una decisión. Con sus respuestas se cierra el hito de alcance.

1. **¿Qué campos de un producto puede modificar el vendedor?**
   - **A (recomendada).** Todos: nombre, descripción, imágenes, características, stock, SKU, precio, categoría y marca. Es lo que dijo Daniel («crear un nuevo producto, modificarle estos productos»), y un vendedor que crea un producto necesita ponerle precio y categoría.
   - **B.** Todos menos el precio. El precio sigue en manos del administrador, como hoy.
   - **C.** Solo los de contenido, como hoy. No encaja con que pueda crear productos: tendría que crearlos sin precio ni categoría.
2. **¿El vendedor gestiona todos los productos de la tienda o solo los que crea?**
   - **A (recomendada).** Todos los de la tienda. Ecom es un solo negocio y sus vendedores son su personal. No necesita cambiar el modelo de datos.
   - **B.** Solo los suyos, como en un marketplace. Necesita un dueño en cada producto y depende del modelo de datos de Daniel (PBI-0043), así que quedaría para otra feature.
3. **¿El vendedor conserva inventario y pedidos?** Daniel dijo «Solamente puede hacer eso», y no mencionó ninguno de los dos.
   - **A (recomendada).** Conserva inventario y pierde pedidos. El stock es parte del producto, que sí gestiona. Los pedidos no los mencionó, y además ahora tienen prioridad baja.
   - **B.** Conserva los dos, como hoy.
   - **C.** Pierde los dos. Es la lectura literal, pero el stock se edita también desde la ficha del producto.
4. **¿El administrador conserva Contenido, Banners y Tarifas de envío?** Daniel dijo que el superadministrador tiene «la configuración total de la tienda».
   - **A (recomendada).** Los conserva. Daniel puso como ejemplos los colores, las integraciones y las claves de API, y los colores ya son solo del superadministrador. Contenido, banners y tarifas son operación diaria de la tienda. Si Daniel quiere moverlos, se hace en otra feature.
   - **B.** Pasan a ser solo del superadministrador. Si el superadministrador es Simplesoft (05/11), el cliente no podría cambiar su logo, sus páginas, sus banners ni sus tarifas sin pedírnoslo.
5. **¿Cómo gestiona el administrador a los vendedores?**
   - **A (recomendada).** En el mismo módulo Usuarios. Solo ve a los vendedores y solo puede asignar el rol vendedor. El superadministrador lo sigue viendo todo.
   - **B.** En un módulo aparte, «Vendedores», con la misma regla. Duplica una pantalla que ya existe.
6. **¿Entra la edición de los datos propios («sus propios datos de vendedor»)?**
   - **A (recomendada).** No. Se hace en PBI-0034 (edición del perfil, con rutas nuevas del BFF) para todos los roles. Esta feature se queda en los permisos.
   - **B.** Sí, solo para el vendedor. Mezcla dos cambios con riesgos distintos.

## Referencias

- [Historias de usuario](../../../planning/user-stories/user-stories.md): US15, US16, US19, US25 y US26
- [Contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md), «Roles fijos»
- [Backlog](../../../planning/backlog.md): PBI-0013, PBI-0034, PBI-0043 y PBI-0002
- [Estándares](../../../architecture/standards.md)
- [Trazabilidad](../../../planning/TRACEABILITY.md)
