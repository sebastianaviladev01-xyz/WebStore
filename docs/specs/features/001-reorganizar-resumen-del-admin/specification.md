# 001. Reorganizar el Resumen del Admin — Especificación

- Feature: `001-reorganizar-resumen-del-admin`
- Historia de usuario: ninguna. El [índice de historias](../../../planning/user-stories/user-stories.md#lo-que-no-se-convirtió-en-historia) registra «Resumen (Dashboard) del Admin: las fuentes lo nombran, pero no dicen qué muestra». Esta feature lo concreta a partir del pedido de Daniel (líder del proyecto) del 2026-11-06: «¿Puedes hacer que el dashboard tenga esta estructura?» y «Si, solo el dashboard», con la demo de OpenCart como referencia
- Estado: borrador
- Fecha: 2026-11-07
- Hito de alcance: pendiente

## Problema y actores

El Resumen es la pantalla inicial del Admin ([glosario](../../../architecture/glosario.md#clientes-cuentas-y-acceso)). Hoy muestra cuatro tarjetas (pedidos por atender, productos activos, stock bajo y clientes), alertas de inventario y pedidos recientes. Daniel pidió que tenga la estructura del dashboard de administración de OpenCart: indicadores con su variación, un gráfico por día, los últimos pedidos y la distribución de los pedidos por estado. Así, quien entra al Admin ve de un vistazo cómo van las ventas y qué pedidos llegaron.

Actores: `superadmin`, `admin` y `vendedor`, los tres con el permiso `dashboard.view`. El comprador no interviene.

Aplicaciones afectadas: **Admin**. El BFF solo si se elige una alternativa que lo requiera en las [preguntas abiertas](#preguntas-abiertas). El Storefront no cambia.

### Estructura de referencia

Lo que se ve en las capturas del dashboard de OpenCart que compartió la persona, y lo que muestra su código público (`upload/extension/opencart/admin/controller/dashboard/` en el repositorio `opencart/opencart`, rama `master`, consultado el 2026-11-07). No se inició sesión en la demo.

| Bloque de OpenCart | Qué muestra | Datos en WebStore |
|---|---|---|
| Tarjeta «Total Orders» | Total histórico de pedidos, abreviado (3.3K), con variación en % y «View more» | Sí: `orders` del snapshot |
| Tarjeta «Total Sales» | Total histórico de ventas, abreviado (6.6M), con variación en % y «View more» | Sí: `total` de cada pedido |
| Tarjeta «Total Customers» | Total histórico de clientes, con variación en % y «View more» | Total sí (`customers`); la variación no: el cliente no guarda fecha de alta (pregunta 6) |
| Tarjeta «People Online» | Personas conectadas a la tienda | No (pregunta 2) |
| «World Map» | Mapa mundial de pedidos por país | No encaja: la tienda vende solo en Lima (pregunta 4) |
| «Sales Analytics» | Barras de pedidos y clientes por día del mes, con selector de período | Pedidos sí; clientes no (pregunta 6) |
| «Recent Activity» | Registro de acciones de clientes | No (pregunta 3) |
| «Latest Orders» | Los 5 últimos pedidos: ID, cliente, estado, fecha, total y botón para ver | Sí |
| Barras de estado (barra lateral) | % de pedidos completados, en proceso y otros | Sí: `status` de cada pedido (pregunta 8) |

En el código de OpenCart, la variación de cada tarjeta compara el día de ayer con el de anteayer y divide la diferencia por el valor de ayer; si ayer fue 0, muestra 0 %.

## Alcance

**Incluye:**

- Reorganizar la página Resumen del Admin (ruta `/`, [`resumen.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/resumen.page.ts)) con la estructura de la tabla anterior, ajustada según las respuestas a las preguntas abiertas.
- Tarjetas de indicadores con su variación en % y su enlace «Ver más».
- Un gráfico de barras por día del mes.
- Una tabla con los últimos pedidos y una acción para verlos.
- La distribución de los pedidos por estado, en %.
- La visibilidad de cada bloque según el rol.
- La identidad visual de WebStore: paleta B, Source Sans 3 y tokens del [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md).

**Excluye:**

- La apariencia y la marca de OpenCart: su logo, sus colores, sus íconos y sus textos. Se toma la estructura, no el aspecto.
- La barra lateral y la cabecera del Admin, que comparten todas las páginas: «solo el dashboard».
- El resto de páginas del Admin, salvo lo que exija la acción «ver» de un pedido (pregunta 10).
- El selector de período del gráfico de OpenCart (día, semana, mes, año): se muestra el mes en curso.
- La configuración del dashboard desde el Admin (OpenCart permite activar, ordenar y dimensionar cada bloque).
- Los temas configurables del Admin, que irán más adelante al [backlog](../../../planning/backlog.md).
- Endpoints nuevos del BFF, salvo que una pregunta abierta se resuelva con uno. En ese caso, su diseño pasa a `sdd-plan` y, si cambia el contrato, a `sdd-decide`.

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | El Resumen muestra tarjetas con el total de pedidos, el total de ventas y el total de clientes, y una cuarta tarjeta que depende de la pregunta 2 | Pedido de Daniel, 2026-11-06 | Alta |
| REQ-02 | Cada tarjeta muestra la variación en % respecto de un período anterior y un enlace «Ver más» a la página que gestiona ese dato | Pedido de Daniel; período según la pregunta 5 | Media |
| REQ-03 | El Resumen muestra un gráfico de barras con los pedidos por día del mes en curso y, según la pregunta 6, los clientes por día | Pedido de Daniel | Alta |
| REQ-04 | El Resumen muestra una tabla con los últimos pedidos (ID, cliente, estado, fecha y total) y una acción para ver cada uno | Pedido de Daniel | Alta |
| REQ-05 | El Resumen muestra el porcentaje de pedidos completados, en proceso y en otros estados | Pedido de Daniel; agrupación según la pregunta 8 | Media |
| REQ-06 | Los bloques de OpenCart sin datos en WebStore (personas en línea, mapa mundial y actividad reciente) se omiten o se sustituyen según las preguntas 2, 3 y 4 | Contraste con el BFF | Alta |
| REQ-07 | Cada rol ve solo los bloques cuyos datos puede consultar | Rol `vendedor` del [contrato](../../../../backend/docs/BFF-CONTRACT.md#roles-fijos-acordados-el-0511); detalle según la pregunta 9 | Alta |
| REQ-08 | El Resumen conserva la identidad visual de WebStore y no reproduce la apariencia ni la marca de OpenCart | Pedido de la persona, 2026-11-07; [STD-12](../../../architecture/standards.md) | Alta |
| REQ-09 | Cada bloque tiene un estado vacío legible cuando no hay datos | Propuesto: el seed del BFF empieza sin pedidos | Media |

## Criterios de aceptación

Ningún AC sale de una historia de usuario. Los que solo concretan la estructura pedida por Daniel tienen ese origen. Los que fijan una regla que el pedido no dice están marcados como **propuesto** hasta el hito de alcance.

### AC-01 — Tarjetas de indicadores

- Cubre: REQ-01, REQ-02
- Origen: pedido de Daniel, 2026-11-06

**Dado** un usuario `admin` con pedidos y clientes registrados
**Cuando** abre el Resumen
**Entonces** ve las tarjetas «Total de pedidos», «Total de ventas» y «Total de clientes», más la cuarta tarjeta que se decida en la pregunta 2, cada una con su valor, su variación en % y el enlace «Ver más».

### AC-02 — Valores de las tarjetas

- Cubre: REQ-01
- Origen: **propuesto** (preguntas 6 y 7)

**Dado** un snapshot con pedidos en distintos estados y clientes
**Cuando** el Resumen calcula las tarjetas
**Entonces** «Total de pedidos» cuenta los pedidos que fije la pregunta 7, «Total de ventas» suma su `total` en soles con el formato del Admin (`S/ 1,234.56`) y «Total de clientes» es el número de clientes del snapshot.

### AC-03 — Variación en %

- Cubre: REQ-02
- Origen: **propuesto** (pregunta 5)

**Dado** un valor del período actual y otro del período anterior, según la pregunta 5
**Cuando** el período anterior tiene un valor mayor que 0
**Entonces** la tarjeta muestra `(actual − anterior) / anterior × 100`, redondeado a entero, con una marca de subida o bajada.
**Y cuando** el período anterior vale 0, la tarjeta no muestra un porcentaje infinito ni engañoso, sino «—».

### AC-04 — Enlace «Ver más»

- Cubre: REQ-02
- Origen: **propuesto**

**Dado** el Resumen abierto
**Cuando** el usuario sigue «Ver más» de una tarjeta
**Entonces** llega a la página que gestiona ese dato: pedidos y ventas a `/pedidos`, clientes a `/clientes` y la cuarta tarjeta a la suya. WebStore no tiene una página de ventas ni de reportes, por eso las ventas llevan a `/pedidos`.

### AC-05 — Gráfico por día del mes

- Cubre: REQ-03
- Origen: pedido de Daniel; **propuesto** el mes en curso, la hora de Lima y la serie de clientes (pregunta 6)

**Dado** pedidos creados en distintos días del mes en curso
**Cuando** el usuario abre el Resumen
**Entonces** ve un gráfico de barras con un eje por cada día del mes (28 a 31), el número de pedidos de cada día según la fecha de creación en hora de Lima y, si se aprueba en la pregunta 6, una segunda serie con los clientes nuevos de cada día, con una leyenda que distingue las series.

### AC-06 — Últimos pedidos

- Cubre: REQ-04
- Origen: pedido de Daniel; **propuesto** el número de filas (5, como OpenCart y como el Resumen actual)

**Dado** más de cinco pedidos
**Cuando** el usuario abre el Resumen
**Entonces** ve una tabla con los cinco pedidos más recientes, ordenados del más nuevo al más antiguo, con las columnas ID, Cliente, Estado (con la etiqueta en español de [Estado del pedido](../../../architecture/glosario.md#estado-del-pedido-estadopedido)), Fecha, Total y una acción «Ver».

### AC-07 — Ver un pedido

- Cubre: REQ-04
- Origen: **propuesto** (pregunta 10)

**Dado** la tabla de últimos pedidos
**Cuando** el usuario elige «Ver» en una fila
**Entonces** se abre ese pedido según la alternativa elegida en la pregunta 10.

### AC-08 — Pedidos por estado

- Cubre: REQ-05
- Origen: pedido de Daniel; **propuesto** la agrupación (pregunta 8)

**Dado** pedidos en distintos estados
**Cuando** el usuario abre el Resumen
**Entonces** ve tres barras con el porcentaje de pedidos completados, en proceso y en otros estados sobre el total, agrupados según la pregunta 8, y los tres porcentajes suman 100 % (o los tres son 0 % si no hay pedidos).

### AC-09 — Bloques sin datos en WebStore

- Cubre: REQ-06
- Origen: contraste con el BFF; contenido según las preguntas 2, 3 y 4

**Dado** que el BFF no guarda personas en línea, ni registro de actividad, ni pedidos fuera de Lima
**Cuando** el usuario abre el Resumen
**Entonces** no ve cifras inventadas ni bloques vacíos permanentes en esos lugares: ve lo que se decida en las preguntas 2, 3 y 4.

### AC-10 — Visibilidad por rol

- Cubre: REQ-07
- Origen: **propuesto** (pregunta 9)

**Dado** un usuario `vendedor`
**Cuando** abre el Resumen
**Entonces** ve solo los bloques que fije la pregunta 9, sin bloques vacíos por falta de permiso.
**Y dado** un usuario `superadmin` o `admin`, **entonces** ve todos los bloques.

### AC-11 — Tienda sin pedidos

- Cubre: REQ-09
- Origen: **propuesto**

**Dado** un BFF recién creado desde el seed, sin pedidos
**Cuando** un usuario abre el Resumen
**Entonces** las tarjetas muestran 0 y «—» como variación, el gráfico muestra el mes sin barras, la tabla dice que todavía no hay pedidos y las barras de estado están en 0 %, sin errores en la consola.

### AC-12 — Identidad visual de WebStore

- Cubre: REQ-08
- Origen: pedido de la persona, 2026-11-07

**Dado** el Resumen reorganizado
**Cuando** se compara con capturas, en escritorio y a 375 px
**Entonces** usa los tokens de la paleta B, Source Sans 3 y las tarjetas del Admin (`admin-card`); no usa el logo, los colores, los íconos ni los textos en inglés de OpenCart; no tiene desbordes horizontales; y la barra lateral y la cabecera no cambian.

## Datos y contrato

Todo sale del snapshot del Admin (`GET /admin/snapshot`, [contrato](../../../../backend/docs/BFF-CONTRACT.md#administración)), que ya carga `TiendaFacade`. Los cálculos se hacen en el Admin, salvo que una pregunta se resuelva con un cambio del BFF. Los términos son los del [glosario](../../../architecture/glosario.md).

| Campo u operación | Regla | Roles | Origen |
|---|---|---|---|
| Pedidos: `id`, `createdAt`, `status`, `customer`, `customerEmail`, `total`, `district` | Ya viajan en el snapshot. Alimentan las tarjetas de pedidos y ventas, el gráfico, la tabla y las barras de estado | Solo roles con `orders.manage` (`superadmin`, `admin`, `vendedor`) | REQ-01 a REQ-05 |
| Clientes: `id`, `name`, `email`, `document`, `orders` | Ya viajan en el snapshot. No tienen fecha de alta (pregunta 6) | Solo roles con `customers.manage` (`superadmin`, `admin`); el vendedor recibe la lista vacía | REQ-01, REQ-03 |
| Productos: `stock`, `active` | Ya viajan a los tres roles. Alimentan las alertas de stock bajo si se mantienen (pregunta 1) | `superadmin`, `admin`, `vendedor` | REQ-06 |
| Sesiones de cuenta (`accountSessions`) | Existen en el estado del BFF, con `createdAt` y `expiresAt` (8 h), pero **no** viajan en el snapshot | — | Pregunta 2 |
| Registro de actividad | **No existe** en el BFF | — | Pregunta 3 |
| Variación en % | Período según la pregunta 5; anterior = 0 → «—» | Según la tarjeta | REQ-02 |
| Día de un pedido | Fecha de `createdAt` en hora de Lima (`America/Lima`) | — | REQ-03 |

Si se elige una alternativa que añade datos al snapshot o un endpoint nuevo, el contrato cambia y la feature pasa por `sdd-decide`.

## Interfaz

**La feature cambia la interfaz del Admin, y el cambio visual está pedido** (Daniel, 2026-11-06). Se aplica el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md) de WebStore, con la paleta B, que se mantiene por mayoría. Las capturas de antes y después siguen [STD-12](../../../architecture/standards.md).

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| Admin, Resumen (`/`) | Se reorganiza con la estructura descrita en esta especificación | Sí |
| Admin, Pedidos (`/pedidos`) | Solo si la pregunta 10 elige abrir el pedido seleccionado: la página acepta qué pedido seleccionar al entrar. Sin cambio de aspecto | No |
| Admin, barra lateral y cabecera | Sin cambios | No |
| Storefront | Sin cambios | No |

## Integraciones

Ninguna externa. El BFF de prueba es la única fuente de datos. Si una pregunta se resuelve con datos nuevos del BFF, se registra en el plan.

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| No hay pedidos (seed) | Tarjetas en 0, variación «—», gráfico sin barras, tabla vacía con mensaje y barras de estado en 0 % | REQ-09 / AC-11 |
| El período anterior tiene 0 | Variación «—», no «Infinity» ni «NaN» | REQ-02 / AC-03 |
| El seed trae un cliente (`c-1`) con `orders: 1` y ningún pedido | El total de clientes lo cuenta; si la serie de clientes del gráfico se deriva de los pedidos, no aparece en ningún día | REQ-01, REQ-03 / AC-02, AC-05 |
| Pedido cancelado | Cuenta o no en pedidos y ventas según la pregunta 7; en las barras de estado cuenta en «otros» según la pregunta 8 | REQ-01, REQ-05 / AC-02, AC-08 |
| Mes de 28, 29, 30 o 31 días | El gráfico tiene un eje por día del mes en curso | REQ-03 / AC-05 |
| Pedido creado cerca de la medianoche | Cuenta en el día de Lima, no en el UTC | REQ-03 / AC-05 |
| Nombre de cliente largo en la tabla | Se recorta sin desbordar la tabla; a 375 px la tabla se desplaza dentro de su contenedor | REQ-04 / AC-06, AC-12 |
| Usuario `vendedor` (sin clientes en el snapshot) | No ve bloques de clientes vacíos ni en 0 por falta de permiso | REQ-07 / AC-10 |
| El snapshot no carga (BFF caído o sesión vencida) | El Admin muestra el aviso de error que ya usa; el Resumen no muestra cifras a medias | REQ-09 |
| Llegan pedidos nuevos mientras el Resumen está abierto | Se ven al recargar el snapshot, como en el resto del Admin; no se pide actualización en tiempo real | REQ-01 |

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio):

- El Resumen actual tiene cuatro tarjetas (pedidos por atender, productos activos, stock bajo de 5 o menos y clientes), alertas de inventario y los 5 pedidos más recientes. Oculta pedidos y clientes a quien no tiene `orders.manage` o `customers.manage` ([`resumen.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/resumen.page.ts)).
- Los tres roles tienen `dashboard.view`. El vendedor tiene además `products.edit`, `inventory.manage` y `orders.manage` (`backend/src/domain/sesion/rol.rules.mjs`).
- El snapshot envía cada colección solo al rol que puede gestionarla; para los demás llega vacía. El vendedor recibe los pedidos, pero no los clientes (`backend/src/application/admin/admin.views.mjs`).
- Los pedidos del snapshot tienen `createdAt`, `status`, `customer`, `customerEmail`, `district` y `total`.
- Los clientes no tienen fecha de alta. El BFF solo los crea o actualiza al registrar un pedido (`registerCustomer`, en `backend/src/application/checkout/checkout.use-cases.mjs`).
- El BFF no guarda personas en línea ni un registro de actividad. Las sesiones de cuenta tienen `createdAt` y `expiresAt`, pero no viajan al Admin.
- El seed del BFF empieza sin pedidos y con un cliente de demostración (`backend/src/infrastructure/persistencia/seed.mjs`).
- La tienda vende en Lima: el envío es por distrito, con la tabla de tarifas origen → destino.
- El Admin no tiene hoy una librería de gráficos (`frontend/package.json`).
- La página de Pedidos selecciona un pedido con un estado interno; no lo recibe por la URL (`pedidos.page.ts`).
- En OpenCart, la variación compara ayer con anteayer, la cifra grande es el total histórico abreviado y la tabla muestra 5 pedidos (código público de OpenCart, ver [Estructura de referencia](#estructura-de-referencia)).

**Supuestos** (se asumen hasta que se confirmen):

- El título de la página sigue siendo «Resumen», con el saludo actual.
- Las cifras se muestran completas (por ejemplo, `S/ 12,345.60`), no abreviadas como en OpenCart (6.6M), porque los volúmenes de la tienda son pequeños.
- Los días se cuentan en hora de Lima.
- El gráfico muestra el mes en curso, sin selector de período.
- La distribución por estado va en el cuerpo del Resumen, no en la barra lateral, porque la barra lateral la comparten todas las páginas y el pedido es «solo el dashboard».
- Si hace falta una librería de gráficos o un gráfico propio, se decide en `sdd-plan` y, si es una dependencia nueva, en `sdd-decide`.

**Decisiones pendientes:**

- Las [preguntas abiertas](#preguntas-abiertas) de esta especificación, que se resuelven en el hito de alcance.
- Los permisos exactos del rol Vendedor siguen sin confirmar ([PENDING-DECISIONS.md](../../../planning/PENDING-DECISIONS.md), «Permisos exactos del rol Vendedor»; PBI-0013 del [backlog](../../../planning/backlog.md)). La pregunta 9 solo decide qué ve en el Resumen con los permisos actuales; no los cambia.
- La paleta B se mantiene por mayoría ([PENDING-DECISIONS.md](../../../planning/PENDING-DECISIONS.md), «Confirmación de la paleta»; PBI-0014). La feature usa los tokens, así que un cambio posterior de paleta no la obliga a cambiar.

## Preguntas abiertas

Se presentan de una en una en el hito de alcance, con sus alternativas, la recomendación y la evidencia.

1. **Alertas de stock bajo.** El Resumen actual muestra la tarjeta «Stock bajo (5 o menos)» y la lista «Alertas de inventario»; OpenCart no tiene ninguna de las dos. ¿Se mantienen, y dónde?
2. **Personas en línea.** El BFF no guarda visitantes ni conexiones. ¿Qué va en la cuarta tarjeta: se sustituye por un dato que ya existe (por ejemplo, stock bajo o pedidos por atender), se cuentan las sesiones de cuenta activas (cambio del contrato; no incluye a los invitados) o se deja para el backlog?
3. **Actividad reciente.** El BFF no tiene registro de actividad. ¿Se omite el bloque, se ocupa su lugar con otro que ya existe (por ejemplo, las alertas de inventario), se arma con eventos que ya tienen fecha (pedidos nuevos y reclamos recibidos) o se crea un registro de actividad en el BFF (feature propia)?
4. **Mapa mundial.** La tienda vende solo en Lima. ¿Se omite, se sustituye por pedidos por distrito (el pedido ya tiene `district`) o se pide un mapa de Lima por distrito (requiere datos geográficos)?
5. **Período de la variación en %.** ¿Contra qué se compara: ayer contra anteayer (como OpenCart), hoy contra ayer, o el mes en curso contra el mismo tramo del mes anterior (coincide con el gráfico)?
6. **Clientes sin fecha de alta.** La tarjeta de clientes y la serie de clientes del gráfico necesitan saber cuándo apareció cada cliente. ¿Se deriva de la fecha de su primer pedido (el BFF solo crea clientes al registrar un pedido), se añade la fecha de alta al cliente en el BFF (cambio del contrato; los clientes actuales no la tienen) o el gráfico muestra solo pedidos y la tarjeta de clientes no lleva variación?
7. **Qué cuenta como pedido y como venta.** ¿Los pedidos cancelados entran en «Total de pedidos» y en «Total de ventas»? ¿La venta incluye el costo de envío (`total`) o solo los productos (`subtotal`)?
8. **Agrupación por estado.** WebStore tiene cinco estados y OpenCart muestra tres barras. ¿Completados = Entregado, En proceso = Confirmado + En preparación + Enviado y Otros = Cancelado, u otra agrupación (por ejemplo, una barra por cada estado)?
9. **Qué ve cada rol.** `superadmin` y `admin` ven todo. ¿El `vendedor` ve los bloques cuyos datos ya recibe (pedidos, ventas, gráfico de pedidos, últimos pedidos y estados, sin clientes), solo los operativos (sin ventas ni clientes) o todo (cambio del contrato para enviarle clientes o cifras agregadas)?
10. **Acción «Ver» de un pedido.** ¿Lleva a `/pedidos` con ese pedido seleccionado (pequeño cambio en la página de Pedidos, fuera de «solo el dashboard»), lleva a `/pedidos` sin seleccionarlo, o abre el detalle en el propio Resumen?

## Referencias

- [Historias de usuario](../../../planning/user-stories/user-stories.md)
- [Contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md)
- [Glosario](../../../architecture/glosario.md)
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md)
- [Estándares](../../../architecture/standards.md)
- [Trazabilidad](../../../planning/TRACEABILITY.md)
- [Decisiones pendientes](../../../planning/PENDING-DECISIONS.md)
