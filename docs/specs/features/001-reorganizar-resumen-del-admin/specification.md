# 001. Reorganizar el Resumen del Admin — Especificación

- Feature: `001-reorganizar-resumen-del-admin`
- Historia de usuario: ninguna. El [índice de historias](../../../planning/user-stories/user-stories.md#lo-que-no-se-convirtió-en-historia) registra «Resumen (Dashboard) del Admin: las fuentes lo nombran, pero no dicen qué muestra». Esta feature lo concreta a partir del pedido de Daniel (líder del proyecto) del 2026-11-06: «¿Puedes hacer que el dashboard tenga esta estructura?» y «Si, solo el dashboard», con la demo de OpenCart como referencia
- Estado: aprobada
- Fecha: 2026-11-07
- Hito de alcance: aprobado por Sebastián Avila el 2026-11-07, con las diez [decisiones del hito](#decisiones-del-hito-de-alcance)

## Problema y actores

El Resumen es la pantalla inicial del Admin ([glosario](../../../architecture/glosario.md#clientes-cuentas-y-acceso)). Hoy muestra cuatro tarjetas (pedidos por atender, productos activos, stock bajo y clientes), alertas de inventario y pedidos recientes. Daniel pidió que tenga la estructura del dashboard de administración de OpenCart: indicadores con su variación, un gráfico por día, los últimos pedidos y la distribución de los pedidos por estado. Así, quien entra al Admin ve de un vistazo cómo van las ventas y qué pedidos llegaron.

Actores: `superadmin`, `admin` y `vendedor`, los tres con el permiso `dashboard.view`. El comprador no interviene.

Aplicaciones afectadas: **Admin** (Resumen y, en lo mínimo, Pedidos). El BFF y el Storefront no cambian.

### Estructura de referencia

Lo que se ve en las capturas del dashboard de OpenCart que compartió la persona, lo que muestra su código público (`upload/extension/opencart/admin/controller/dashboard/` en el repositorio `opencart/opencart`, rama `master`, consultado el 2026-11-07) y cómo queda en WebStore. No se inició sesión en la demo.

| Bloque de OpenCart | Qué muestra | En WebStore |
|---|---|---|
| Tarjeta «Total Orders» | Total histórico de pedidos, abreviado (3.3K), con variación en % y «View more» | Tarjeta «Total de pedidos» |
| Tarjeta «Total Sales» | Total histórico de ventas, abreviado (6.6M), con variación en % y «View more» | Tarjeta «Total de ventas» |
| Tarjeta «Total Customers» | Total histórico de clientes, con variación en % y «View more» | Tarjeta «Total de clientes» |
| Tarjeta «People Online» | Personas conectadas a la tienda | Tarjeta «Stock bajo»: el BFF no guarda conexiones (D2) |
| «World Map» | Mapa mundial de pedidos por país | «Pedidos por distrito»: la tienda vende solo en Lima (D4) |
| «Sales Analytics» | Barras de pedidos y clientes por día del mes, con selector de período | Gráfico de pedidos y clientes nuevos por día del mes en curso, sin selector |
| «Recent Activity» | Registro de acciones de clientes | «Alertas de inventario»: el BFF no tiene registro de actividad (D3) |
| «Latest Orders» | Los 5 últimos pedidos: ID, cliente, estado, fecha, total y botón para ver | «Últimos pedidos», con la acción «Ver» |
| Barras de estado (barra lateral) | % de pedidos completados, en proceso y otros | «Pedidos por estado», en el cuerpo del Resumen |

En el código de OpenCart, la variación de cada tarjeta compara el día de ayer con el de anteayer y divide la diferencia por el valor de ayer; si ayer fue 0, muestra 0 %. WebStore usa otro período (D5).

## Alcance

**Incluye:**

- Reorganizar la página Resumen del Admin (ruta `/`, [`resumen.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/resumen.page.ts)) con la estructura de la tabla anterior.
- Cuatro tarjetas de indicadores: pedidos, ventas y clientes, con su variación en %, y stock bajo; cada una con su enlace «Ver más».
- Un gráfico de barras con los pedidos y los clientes nuevos por día del mes en curso.
- Los pedidos por distrito, en lugar del mapa mundial.
- Las alertas de inventario, en lugar de la actividad reciente.
- Una tabla con los últimos pedidos y la acción «Ver».
- La distribución de los pedidos por estado, en %.
- La visibilidad de cada bloque según el rol.
- Que la página de Pedidos abra el pedido que indica la URL, sin cambiar su aspecto (D10).
- La identidad visual de WebStore: paleta B, Source Sans 3 y tokens del [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md).

**Excluye:**

- La apariencia y la marca de OpenCart: su logo, sus colores, sus íconos y sus textos. Se toma la estructura, no el aspecto.
- La barra lateral y la cabecera del Admin, que comparten todas las páginas: «solo el dashboard».
- El resto de páginas del Admin, salvo el cambio mínimo de Pedidos.
- Personas en línea y registro de actividad: no hay datos en el BFF. Quedan como propuestas en el [backlog](../../../planning/backlog.md) (PBI-0027 y PBI-0028).
- Un mapa de pedidos (mundial o de Lima).
- El selector de período del gráfico de OpenCart (día, semana, mes, año).
- La configuración del dashboard desde el Admin (OpenCart permite activar, ordenar y dimensionar cada bloque).
- Los temas configurables del Admin, que irán más adelante al backlog.
- Cambios en el BFF y en su contrato.

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | El Resumen muestra cuatro tarjetas: total de pedidos, total de ventas, total de clientes y stock bajo | Pedido de Daniel, 2026-11-06; D1, D2 | Alta |
| REQ-02 | Las tarjetas de pedidos, ventas y clientes muestran como cifra principal el total histórico y, aparte, la variación en % del mes en curso respecto del mismo tramo del mes anterior | Pedido de Daniel; D5, D6, D7 | Media |
| REQ-03 | Cada tarjeta tiene un enlace «Ver más» a la página que gestiona ese dato | Pedido de Daniel | Media |
| REQ-04 | El Resumen muestra un gráfico de barras con los pedidos y los clientes nuevos por día del mes en curso | Pedido de Daniel; D6 | Alta |
| REQ-05 | El Resumen muestra los distritos con más pedidos | D4 | Media |
| REQ-06 | El Resumen muestra las alertas de inventario (productos con stock bajo) | D1, D3 | Media |
| REQ-07 | El Resumen muestra una tabla con los cinco últimos pedidos (ID, cliente, estado, fecha y total) y una acción «Ver» que abre ese pedido en la página de Pedidos | Pedido de Daniel; D10 | Alta |
| REQ-08 | El Resumen muestra el porcentaje de pedidos completados, en proceso y en otros estados | Pedido de Daniel; D8 | Media |
| REQ-09 | Cada rol ve solo los bloques cuyos datos recibe del BFF; los demás se ocultan | D9 | Alta |
| REQ-10 | El Resumen conserva la identidad visual de WebStore y no reproduce la apariencia ni la marca de OpenCart | Pedido de la persona, 2026-11-07; [STD-12](../../../architecture/standards.md) | Alta |
| REQ-11 | Cada bloque tiene un estado vacío legible cuando no hay datos | **Propuesto**: el seed del BFF empieza sin pedidos | Media |

## Criterios de aceptación

Ningún AC sale de una historia de usuario. Su origen es el pedido de Daniel o una decisión del hito de alcance (`D1` a `D10`, en [Decisiones del hito de alcance](#decisiones-del-hito-de-alcance)). Los que fijan una regla que ni el pedido ni las decisiones dicen están marcados como **propuesto**.

### AC-01 — Tarjetas de indicadores

- Cubre: REQ-01, REQ-03
- Origen: pedido de Daniel; D1, D2

**Dado** un usuario `admin`
**Cuando** abre el Resumen
**Entonces** ve, en este orden, las tarjetas «Total de pedidos», «Total de ventas», «Total de clientes» y «Stock bajo», cada una con su cifra y el enlace «Ver más».

### AC-02 — Cifras de las tarjetas

- Cubre: REQ-01, REQ-02
- Origen: D2, D6, D7

**Dado** un snapshot con pedidos en todos los estados, clientes y productos
**Cuando** el Resumen calcula las tarjetas
**Entonces**:
- «Total de pedidos» cuenta todos los pedidos, incluidos los cancelados.
- «Total de ventas» suma el `total` (productos + envío) de los pedidos no cancelados, en soles con el formato del Admin (`S/ 1,234.56`).
- «Total de clientes» es el número de clientes del snapshot.
- «Stock bajo» es el número de productos con 5 unidades o menos, como hoy.

### AC-03 — Variación en %

- Cubre: REQ-02
- Origen: D5; **propuesto** el tramo cuando el mes anterior es más corto

**Dado** el día D del mes en curso
**Cuando** el Resumen calcula la variación de pedidos, ventas o clientes
**Entonces** compara el valor del día 1 al D del mes en curso con el del día 1 al D del mes anterior (o hasta su último día, si es más corto), con los mismos criterios de AC-02, y muestra `(actual − anterior) / anterior × 100`, redondeado a entero, con una marca de subida o bajada.
**Y cuando** el tramo anterior vale 0, muestra «—», no un porcentaje infinito.
**Y** la tarjeta «Stock bajo» no lleva variación, porque el stock no guarda historial.

### AC-04 — Clientes nuevos

- Cubre: REQ-02, REQ-04
- Origen: D6

**Dado** un cliente cuyo primer pedido (buscado por `customerEmail`, sin distinguir mayúsculas) se creó el día D
**Cuando** el Resumen cuenta los clientes nuevos
**Entonces** ese cliente es nuevo el día D, en hora de Lima, y no vuelve a contar en sus pedidos siguientes.

### AC-05 — Enlace «Ver más»

- Cubre: REQ-03
- Origen: **propuesto** el destino de cada enlace

**Dado** el Resumen abierto
**Cuando** el usuario sigue «Ver más» de una tarjeta
**Entonces** llega a `/pedidos` desde pedidos y ventas, a `/clientes` desde clientes y a `/inventario` desde stock bajo. WebStore no tiene una página de ventas ni de reportes, por eso las ventas llevan a `/pedidos`.

### AC-06 — Gráfico por día del mes

- Cubre: REQ-04
- Origen: pedido de Daniel; D6; **propuesto** la hora de Lima

**Dado** pedidos creados en distintos días del mes en curso
**Cuando** el usuario abre el Resumen
**Entonces** ve un gráfico de barras con un eje por cada día del mes (28 a 31), dos series con leyenda («Pedidos» y «Clientes nuevos») y, en cada día, los pedidos creados y los clientes nuevos según la fecha en hora de Lima.

### AC-07 — Pedidos por distrito

- Cubre: REQ-05
- Origen: D4; **propuesto** el número de distritos, el criterio y el período

**Dado** pedidos de varios distritos
**Cuando** el usuario abre el Resumen
**Entonces** ve, en el lugar del mapa de OpenCart, los cinco distritos con más pedidos, de mayor a menor, con el número de pedidos de cada uno, contando todos los pedidos registrados.

### AC-08 — Alertas de inventario

- Cubre: REQ-06
- Origen: D1, D3

**Dado** productos con 5 unidades o menos
**Cuando** el usuario abre el Resumen
**Entonces** ve, en el lugar de la actividad reciente de OpenCart, la lista «Alertas de inventario» con el nombre y las unidades de cada producto, y el enlace «Gestionar inventario», como hoy.

### AC-09 — Últimos pedidos

- Cubre: REQ-07
- Origen: pedido de Daniel

**Dado** más de cinco pedidos
**Cuando** el usuario abre el Resumen
**Entonces** ve una tabla con los cinco pedidos más recientes, del más nuevo al más antiguo, con las columnas ID, Cliente, Estado (con la etiqueta en español de [Estado del pedido](../../../architecture/glosario.md#estado-del-pedido-estadopedido)), Fecha, Total y una acción «Ver».

### AC-10 — Ver un pedido

- Cubre: REQ-07
- Origen: D10; **propuesto** el nombre del parámetro

**Dado** la tabla de últimos pedidos
**Cuando** el usuario elige «Ver» en una fila
**Entonces** llega a `/pedidos?pedido=<id>` y la página de Pedidos muestra ese pedido seleccionado.
**Y cuando** el `id` de la URL no existe o no está en el filtro actual, la página de Pedidos se comporta como hoy (selecciona el primero del listado).

### AC-11 — Pedidos por estado

- Cubre: REQ-08
- Origen: pedido de Daniel; D8

**Dado** pedidos en los cinco estados
**Cuando** el usuario abre el Resumen
**Entonces** ve tres barras con su porcentaje sobre todos los pedidos: «Completados» (Entregado), «En proceso» (Confirmado, En preparación y Enviado) y «Otros» (Cancelado), que suman 100 %.
**Y** las barras van en el cuerpo del Resumen, no en la barra lateral.

### AC-12 — Visibilidad por rol

- Cubre: REQ-09
- Origen: D9

**Dado** un usuario `vendedor`
**Cuando** abre el Resumen
**Entonces** ve las tarjetas de pedidos, ventas y stock bajo; el gráfico solo con la serie «Pedidos»; los pedidos por distrito; las alertas de inventario; los últimos pedidos y los pedidos por estado. No ve la tarjeta de clientes ni la serie de clientes nuevos, y ningún bloque aparece vacío o en 0 por falta de permiso.
**Y dado** un usuario `superadmin` o `admin`, **entonces** ve todos los bloques.

### AC-13 — Tienda sin pedidos

- Cubre: REQ-11
- Origen: **propuesto**

**Dado** un BFF recién creado desde el seed, sin pedidos
**Cuando** un usuario abre el Resumen
**Entonces** las tarjetas de pedidos y ventas muestran 0 con variación «—», el gráfico muestra el mes sin barras, los pedidos por distrito y los últimos pedidos dicen que todavía no hay pedidos, y las barras de estado están en 0 %, sin errores en la consola.

### AC-14 — Identidad visual de WebStore

- Cubre: REQ-10
- Origen: pedido de la persona, 2026-11-07

**Dado** el Resumen reorganizado
**Cuando** se compara con capturas, en escritorio y a 375 px
**Entonces** usa los tokens de la paleta B, Source Sans 3 y las tarjetas del Admin (`admin-card`); no usa el logo, los colores, los íconos ni los textos en inglés de OpenCart; no tiene desbordes horizontales; y la barra lateral, la cabecera y el aspecto de la página de Pedidos no cambian.

## Datos y contrato

Todo sale del snapshot del Admin (`GET /admin/snapshot`, [contrato](../../../../backend/docs/BFF-CONTRACT.md#administración)), que ya carga `TiendaFacade`. Los cálculos se hacen en el Admin. **El contrato del BFF no cambia.** Los términos son los del [glosario](../../../architecture/glosario.md).

| Campo u operación | Regla | Roles | Origen |
|---|---|---|---|
| Pedidos: `id`, `createdAt`, `status`, `customer`, `customerEmail`, `district`, `total` | Ya viajan en el snapshot. Alimentan las tarjetas de pedidos, ventas y clientes nuevos, el gráfico, los pedidos por distrito, la tabla y las barras de estado | Roles con `orders.manage`: `superadmin`, `admin`, `vendedor` | REQ-01 a REQ-08 |
| Clientes: `id`, `name`, `email`, `document`, `orders` | Ya viajan en el snapshot. Dan el total de clientes. No tienen fecha de alta: se toma la de su primer pedido (D6) | Roles con `customers.manage`: `superadmin`, `admin`. El vendedor recibe la lista vacía | REQ-01, REQ-02, REQ-04 |
| Productos: `stock` | Ya viajan a los tres roles. Dan la tarjeta y las alertas de stock bajo (5 o menos, `lowStock` de `TiendaFacade`) | `superadmin`, `admin`, `vendedor` | REQ-01, REQ-06 |
| Pedido cancelado | Cuenta en el total de pedidos, en los pedidos por distrito y en «Otros»; no cuenta en ventas | — | D7, D8 |
| Venta | `total` del pedido (productos + envío) | — | D7 |
| Día de un pedido | Fecha de `createdAt` en hora de Lima (`America/Lima`) | — | REQ-04 |
| Parámetro `pedido` de `/pedidos` | Id del pedido que la página de Pedidos selecciona al entrar | Roles con `orders.manage` | REQ-07 |

## Interfaz

**La feature cambia la interfaz del Admin, y el cambio visual está pedido** (Daniel, 2026-11-06). Se aplica el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md) de WebStore, con la paleta B, que se mantiene por mayoría. Las capturas de antes y después siguen [STD-12](../../../architecture/standards.md).

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| Admin, Resumen (`/`) | Se reorganiza con la estructura de esta especificación | Sí |
| Admin, Pedidos (`/pedidos`) | Acepta `?pedido=<id>` y selecciona ese pedido al entrar. Sin cambio de aspecto | No |
| Admin, barra lateral y cabecera | Sin cambios | No |
| Storefront | Sin cambios | No |

## Integraciones

Ninguna externa. El BFF de prueba es la única fuente de datos y no cambia.

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| No hay pedidos (seed) | Tarjetas de pedidos y ventas en 0 con variación «—», gráfico sin barras, mensajes de vacío y barras de estado en 0 % | REQ-11 / AC-13 |
| El tramo del mes anterior vale 0 | Variación «—», no «Infinity» ni «NaN» | REQ-02 / AC-03 |
| Hoy es 31 y el mes anterior tuvo 30 días (o febrero) | El tramo anterior llega hasta el último día de ese mes | REQ-02 / AC-03 |
| Un cliente compra varias veces | Cuenta como nuevo solo el día de su primer pedido | REQ-02, REQ-04 / AC-04 |
| El mismo correo con distinta capitalización | Es el mismo cliente, como en el BFF (`normalizeEmail`) | REQ-04 / AC-04 |
| El seed trae un cliente (`c-1`) con `orders: 1` y ningún pedido | Cuenta en el total de clientes, pero no aparece como nuevo en ningún día | REQ-01, REQ-04 / AC-02, AC-04 |
| Pedido cancelado | Cuenta en pedidos, en distritos y en «Otros»; no cuenta en ventas | REQ-01, REQ-08 / AC-02, AC-11 |
| Menos de cinco distritos con pedidos | Se muestran los que hay | REQ-05 / AC-07 |
| Empate entre distritos | Se ordenan por nombre | REQ-05 / AC-07 (**propuesto**) |
| Mes de 28, 29, 30 o 31 días | El gráfico tiene un eje por día del mes en curso | REQ-04 / AC-06 |
| Pedido creado cerca de la medianoche | Cuenta en el día de Lima, no en el UTC | REQ-04 / AC-06 |
| `?pedido=` con un id inexistente | La página de Pedidos se comporta como hoy | REQ-07 / AC-10 |
| Nombre de cliente largo en la tabla | Se recorta sin desbordar; a 375 px la tabla se desplaza dentro de su contenedor | REQ-07 / AC-09, AC-14 |
| Usuario `vendedor` (sin clientes en el snapshot) | No ve bloques de clientes vacíos ni en 0 | REQ-09 / AC-12 |
| El snapshot no carga (BFF caído o sesión vencida) | El Admin muestra el aviso de error que ya usa; el Resumen no muestra cifras a medias | REQ-11 |
| Llegan pedidos nuevos mientras el Resumen está abierto | Se ven al recargar el snapshot, como en el resto del Admin; no hay actualización en tiempo real | REQ-01 |

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio):

- El Resumen actual tiene cuatro tarjetas (pedidos por atender, productos activos, stock bajo de 5 o menos y clientes), alertas de inventario y los 5 pedidos más recientes. Oculta pedidos y clientes a quien no tiene `orders.manage` o `customers.manage` ([`resumen.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/resumen.page.ts)).
- Los tres roles tienen `dashboard.view`. El vendedor tiene además `products.edit`, `inventory.manage` y `orders.manage` (`backend/src/domain/sesion/rol.rules.mjs`).
- El snapshot envía cada colección solo al rol que puede gestionarla; para los demás llega vacía. El vendedor recibe los pedidos, pero no los clientes (`backend/src/application/admin/admin.views.mjs`).
- Los pedidos del snapshot tienen `createdAt`, `status`, `customer`, `customerEmail`, `district`, `subtotal`, `shippingCost` y `total`.
- Los clientes no tienen fecha de alta. El BFF solo los crea al registrar un pedido (`registerCustomer`, en `backend/src/application/checkout/checkout.use-cases.mjs`), así que su fecha de alta es la de su primer pedido.
- El BFF no guarda personas en línea ni un registro de actividad. Las sesiones de cuenta tienen `createdAt` y `expiresAt`, pero no viajan al Admin.
- El seed del BFF empieza sin pedidos y con un cliente de demostración (`backend/src/infrastructure/persistencia/seed.mjs`).
- La tienda vende en Lima: el envío es por distrito, con la tabla de tarifas origen → destino.
- El Admin usa la configuración regional `es-PE` (`app.config.ts`) y no tiene una librería de gráficos (`frontend/package.json`).
- La página de Pedidos selecciona un pedido con una señal interna (`selectedId`) y no lo recibe por la URL (`pedidos.page.ts`).
- En OpenCart, la variación compara ayer con anteayer, la cifra grande es el total histórico abreviado y la tabla muestra 5 pedidos (código público de OpenCart, ver [Estructura de referencia](#estructura-de-referencia)).

**Supuestos** (se asumen hasta que se confirmen):

- El título de la página sigue siendo «Resumen», con el saludo actual.
- Las cifras se muestran completas (por ejemplo, `S/ 12,345.60`), no abreviadas como en OpenCart (6.6M), porque los volúmenes de la tienda son pequeños.
- Los días se cuentan en hora de Lima.
- Los pedidos por distrito son los cinco primeros por número de pedidos, sobre todo el histórico.
- Si hace falta una librería de gráficos o un gráfico propio, se decide en `sdd-plan` y, si es una dependencia nueva, en `sdd-decide`.

**Decisiones pendientes:**

- Los permisos exactos del rol Vendedor siguen sin confirmar ([PENDING-DECISIONS.md](../../../planning/PENDING-DECISIONS.md), «Permisos exactos del rol Vendedor»; PBI-0013 del [backlog](../../../planning/backlog.md)). D9 solo decide qué ve en el Resumen con los permisos actuales; no los cambia.
- La paleta B se mantiene por mayoría ([PENDING-DECISIONS.md](../../../planning/PENDING-DECISIONS.md), «Confirmación de la paleta»; PBI-0014). La feature usa los tokens, así que un cambio posterior de paleta no la obliga a cambiar.

## Decisiones del hito de alcance

Las diez preguntas se presentaron de una en una el 2026-11-07, con sus alternativas, la recomendación y la evidencia, y la persona eligió en cada una la alternativa recomendada.

| ID | Pregunta | Decisión | Alternativas descartadas |
|---|---|---|---|
| D1 | ¿Se mantienen las alertas de stock bajo? | Sí: la tarjeta «Stock bajo» y la lista «Alertas de inventario» | Solo la lista; quitarlas |
| D2 | ¿Qué va en lugar de «Personas en línea»? | La tarjeta «Stock bajo» (consecuencia de D1). Personas en línea va al backlog (PBI-0027) | Contar sesiones de cuenta activas (cambia el contrato y no incluye a los invitados) |
| D3 | ¿Qué va en lugar de «Actividad reciente»? | La lista «Alertas de inventario» (consecuencia de D1). El registro de actividad va al backlog (PBI-0028) | Omitirla; armarla con pedidos y reclamos; crear un registro de actividad en el BFF |
| D4 | ¿Qué va en lugar del mapa mundial? | Pedidos por distrito | Omitirlo; mapa de Lima por distrito (datos geográficos y dependencia nueva) |
| D5 | ¿Contra qué período se calcula la variación en %? | Mes en curso contra el mismo tramo del mes anterior. La cifra principal sigue siendo el total histórico | Ayer contra anteayer (OpenCart); hoy contra ayer |
| D6 | ¿Cómo se sabe cuándo apareció un cliente? | Por la fecha de su primer pedido | Añadir la fecha de alta en el BFF; no mostrar clientes por fecha |
| D7 | ¿Qué cuenta como pedido y como venta? | Pedidos: todos, incluidos los cancelados. Ventas: `total` (con envío) de los no cancelados | Todo incluido; solo `subtotal` sin cancelados |
| D8 | ¿Cómo se agrupan los cinco estados? | Completados = Entregado; En proceso = Confirmado + En preparación + Enviado; Otros = Cancelado | Una barra por estado; Enviado como completado |
| D9 | ¿Qué ve cada rol? | `superadmin` y `admin`, todo. `vendedor`, lo que ya recibe del BFF, sin la tarjeta ni la serie de clientes | Solo lo operativo (sin ventas); todo (cambia el contrato) |
| D10 | ¿Qué hace la acción «Ver» de un pedido? | Abre `/pedidos` con ese pedido seleccionado | Abrir `/pedidos` sin seleccionarlo; ver el detalle en el Resumen |

## Referencias

- [Historias de usuario](../../../planning/user-stories/user-stories.md)
- [Contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md)
- [Glosario](../../../architecture/glosario.md)
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md)
- [Estándares](../../../architecture/standards.md)
- [Trazabilidad](../../../planning/TRACEABILITY.md)
- [Decisiones pendientes](../../../planning/PENDING-DECISIONS.md)
- [Backlog](../../../planning/backlog.md)

> Nota (2026-11-26): el lote 45 ([ADR-0033](../../../adrs/0033-construir-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-24.md), PBI-0270) cambia REQ-02 y D5: todas las cifras del Dashboard son del periodo elegido (por omisión, el mes en curso desde el día 1), ya no el total histórico, y la variación compara con el tramo equivalente anterior. Decidido por Sebastián Avila el 2026-11-26.
