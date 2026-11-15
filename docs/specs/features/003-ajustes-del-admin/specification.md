# 003. Ajustes del Admin — Especificación

- Feature: `003-ajustes-del-admin`
- Historia de usuario: ninguna. Sale de [PBI-0031](../../../planning/backlog.md) (bloques del Resumen y grupos del menú lateral plegables, como en OpenCart) y [PBI-0032](../../../planning/backlog.md) (menú de usuario en la cabecera), priorizados en las reuniones del equipo (Daniel, Walther y Sebastián; notas pegadas el 2026-11-11 y de nuevo el 2026-11-12). Sebastián Avila la eligió como siguiente feature el 2026-11-12
- Estado: aprobada
- Fecha: 2026-11-12
- Hito de alcance: aprobado por Sebastián Avila el 2026-11-12, con las seis [decisiones del hito](#decisiones-del-hito-de-alcance)

## Problema y actores

En la revisión del Admin publicado, Daniel pidió dos ajustes que comparten todas las páginas o el Resumen:

1. **Componentes plegables, como en OpenCart.** «Aquí te pedí que estos sean componentes colapsibles» (sobre el Resumen) y «los menús deben ser colapsibles según cómo lo tenemos en OpenCart» (sobre el menú lateral). Hoy el menú lateral muestra siempre todos sus grupos abiertos y los bloques del Resumen no se pliegan.
2. **Un menú de usuario más limpio.** Hoy la cabecera muestra el nombre y el rol como texto, y dos botones sueltos, «Actualizar» y «Cerrar sesión». Daniel pidió seguir la estructura de un menú de usuario: un ícono con las iniciales, el nombre, el rol en mayúsculas al costado («SUPERADMINISTRADOR, todo en mayúsculas»), y dentro del menú el correo, «Perfil» y la salida.

Así el Admin se ve más ordenado y quien entra reconoce con qué cuenta y qué rol está trabajando.

Actores: `superadmin`, `admin` y `vendedor`. Los tres ven la cabecera, el menú lateral (filtrado por permiso, como hoy) y el Resumen (`dashboard.view`). El comprador no interviene.

Aplicaciones afectadas: **Admin** (el shell compartido, [`app.layout.ts`](../../../../frontend/projects/admin/src/app/layout/app.layout.ts), y el Resumen, [`resumen.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/resumen.page.ts)). El BFF y el Storefront no cambian.

### Estructura de referencia

Lo que la persona describe de OpenCart en la reunión y lo que se ve en su administración (demo pública, sin iniciar sesión en ella). Se toma la estructura, no el aspecto ni la marca, como en la feature [001](../001-reorganizar-resumen-del-admin/specification.md).

| Elemento de OpenCart | Qué hace | En WebStore |
|---|---|---|
| Menú lateral con grupos que se despliegan | Cada entrada con hijos (Catálogo, Ventas…) abre y cierra su lista | Cada grupo del menú lateral (General, Catálogo, Ventas, Tienda y Accesos) se pliega y se despliega desde su título |
| Botón de hamburguesa | Reduce el menú lateral a íconos | Fuera de alcance: el menú de WebStore no tiene íconos (D3, PBI-0044) |
| Menú de usuario en la cabecera | Imagen, nombre y, dentro, «Your Profile» y enlaces | Iniciales, nombre y rol en mayúsculas; dentro, correo, «Perfil» y «Cerrar sesión» |
| Campana de notificaciones | Lista de avisos (pedidos, reclamos…) | Fuera de alcance: [PBI-0033](../../../planning/backlog.md) |
| Selector de idioma | Cambia el idioma del Admin | No: «mi idioma no lo tendríamos» (Daniel) |

## Alcance

**Incluye:**

- Grupos del menú lateral plegables desde su título, en escritorio, con un indicador de abierto o cerrado. Al entrar, solo está desplegado el grupo de la página actual (D2).
- Los cinco bloques con título del Resumen, plegables desde su encabezado; la fila de tarjetas queda fija (D1).
- Un menú de usuario en la cabecera: un botón con las iniciales, el nombre y el rol en mayúsculas, que abre un menú con el nombre, el correo, el rol, «Perfil» y «Cerrar sesión».
- Quitar el botón suelto «Cerrar sesión» de la cabecera: la salida pasa al menú. «Actualizar» se queda en la cabecera (D6).
- Una página «Perfil» de solo lectura (`/perfil`) con los datos de la cuenta de la sesión (D5).
- Accesibilidad de los controles nuevos (STD-11) y menús con Angular Material o CDK (STD-04).
- Colores con los tokens del tema activo, para que A, B y C funcionen (feature [002](../002-temas-configurables/specification.md)).

**Excluye:**

- El menú de notificaciones ([PBI-0033](../../../planning/backlog.md)).
- La edición del perfil propio (nombre, correo o contraseña), que necesita rutas nuevas del BFF ([PBI-0034](../../../planning/backlog.md)) (D5).
- Ocultar o reducir a íconos el menú lateral (botón de hamburguesa de OpenCart) y el menú en panel para móvil ([PBI-0044](../../../planning/backlog.md)); en móvil, la tira horizontal queda como hoy (D3).
- Plegar la fila de tarjetas del Resumen (D1).
- Recordar el plegado al recargar o al volver a entrar (D4).
- Un selector de idioma.
- Los permisos del rol `vendedor` que propuso Daniel ([PBI-0013](../../../planning/backlog.md), decisión pendiente «Permisos exactos del rol Vendedor»): los grupos y bloques siguen filtrándose como hoy.
- El contenido, el orden y los cálculos de los bloques del Resumen (feature 001).
- El resto de páginas del Admin y el Storefront.
- Cambios en el BFF y en su contrato.
- El logo y la marca del Admin («W» y «WebStore Admin»): el nombre del producto sigue sin decidir ([decisiones pendientes](../../../planning/PENDING-DECISIONS.md), «Nombre del proyecto y logo»).

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | En escritorio, cada grupo del menú lateral se pliega y se despliega desde su título, que indica si está abierto o cerrado; en móvil, el menú queda como hoy | PBI-0031; Daniel, reunión; D3 | Alta |
| REQ-02 | Al entrar al Admin solo está desplegado el grupo de la página actual, y al navegar a una página se despliega su grupo; se pueden tener varios grupos abiertos | D2 | Media |
| REQ-03 | Los cinco bloques con título del Resumen se pliegan y se despliegan desde su encabezado; plegado, solo se ve el encabezado. Al entrar, todos están desplegados | PBI-0031; Daniel, reunión; D1, D2 | Alta |
| REQ-04 | Los controles de plegado son botones accesibles: se usan con teclado, anuncian si están abiertos (`aria-expanded`) y respetan `prefers-reduced-motion` | [STD-11](../../../architecture/standards.md) | Alta |
| REQ-05 | La cabecera muestra un botón de menú de usuario con las iniciales del usuario, su nombre y su rol en mayúsculas (SUPERADMINISTRADOR, ADMINISTRADOR o VENDEDOR) | PBI-0032; Daniel, reunión | Alta |
| REQ-06 | El menú de usuario muestra el nombre, el correo y el rol, y las opciones «Perfil» y «Cerrar sesión» | PBI-0032; Daniel, reunión | Alta |
| REQ-07 | «Cerrar sesión» del menú cierra la sesión como hoy (`DELETE /admin/sessions/current`) y lleva a `/login`; la cabecera ya no tiene el botón suelto | PBI-0032 | Alta |
| REQ-08 | «Perfil» lleva a una página de solo lectura con el nombre, el correo y el rol de la cuenta, y la descripción de lo que puede hacer ese rol | PBI-0032; Daniel, reunión; D5 | Media |
| REQ-09 | Las iniciales salen del nombre del usuario | **Propuesto**: la regla exacta | Media |
| REQ-10 | Los datos del menú salen de la sesión actual del Admin, sin rutas nuevas del BFF | **Propuesto**: la sesión ya trae nombre, correo y rol | Alta |
| REQ-11 | Fuera de lo pedido, el Admin conserva su diseño, con los tres temas | [STD-12](../../../architecture/standards.md); feature 002 | Alta |
| REQ-12 | El estado de plegado no se guarda en el navegador: al recargar o volver a entrar, el menú y el Resumen vuelven a su estado inicial | D4; [STD-08](../../../architecture/standards.md) | Media |

## Criterios de aceptación

Ningún AC sale de una historia de usuario. Su origen es PBI-0031, PBI-0032 o lo que Daniel dijo en la reunión. Los que fijan una regla que no dijo nadie están marcados como **propuesto**.

### AC-01 — Plegar un grupo del menú lateral

- Cubre: REQ-01, REQ-04
- Origen: PBI-0031

**Dado** un usuario `admin` en escritorio (1440 px) con el grupo «Catálogo» desplegado
**Cuando** activa el título «Catálogo»
**Entonces** se ocultan Productos, Inventario, Categorías y Marcas, el título sigue visible con el indicador de cerrado y anuncia `aria-expanded="false"`.
**Y cuando** lo vuelve a activar, los cuatro enlaces reaparecen en el mismo orden.

### AC-02 — Grupo de la página actual

- Cubre: REQ-02
- Origen: D2

**Dado** un usuario `admin` que inicia sesión y llega al Resumen (`/`)
**Cuando** se muestra el Admin
**Entonces** el grupo «General» está desplegado y «Catálogo», «Ventas», «Tienda» y «Accesos» están plegados.
**Y dado** el grupo «Ventas» plegado, **cuando** el usuario llega a `/pedidos` por cualquier camino (por ejemplo, desde «Ver» en el Resumen), **entonces** el grupo «Ventas» se despliega, «Pedidos» aparece marcado como página actual y los grupos que el usuario había desplegado siguen desplegados.

### AC-03 — Grupos según el rol

- Cubre: REQ-01, REQ-11
- Origen: **propuesto**; conserva el filtro por permiso de hoy

**Dado** un usuario `vendedor`
**Cuando** abre el Admin
**Entonces** ve solo los grupos y enlaces que ve hoy (General: Resumen; Catálogo: Productos e Inventario; Ventas: Pedidos), cada grupo plegable, y ningún grupo vacío.

### AC-04 — Plegar un bloque del Resumen

- Cubre: REQ-03, REQ-04
- Origen: PBI-0031; D1

**Dado** un usuario `admin` que abre el Resumen, con sus cinco bloques desplegados y la fila de tarjetas sin control de plegado
**Cuando** activa el encabezado de «Pedidos por distrito»
**Entonces** el contenido del bloque se oculta, su título sigue visible con el indicador de cerrado y `aria-expanded="false"`, y el resto de bloques sigue igual.
**Y cuando** lo vuelve a activar, el bloque muestra los mismos datos que antes.

### AC-05 — Teclado y lector de pantalla

- Cubre: REQ-04
- Origen: STD-11

**Dado** cualquier control de plegado (grupo del menú o bloque del Resumen)
**Cuando** el usuario llega con Tab y pulsa Intro o Espacio
**Entonces** el control cambia de estado, el foco queda en él y es visible, y el control indica con `aria-controls` la región que abre o cierra.

### AC-06 — Movimiento reducido

- Cubre: REQ-04
- Origen: STD-11

**Dado** el navegador con `prefers-reduced-motion: reduce`
**Cuando** el usuario pliega o despliega un grupo o un bloque
**Entonces** el cambio es inmediato, sin animación.
**Y dado** el navegador sin esa preferencia, **entonces** la animación es corta y no hace esperar, en el rango de las entradas cortas del [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md) (180–260 ms), y no anima el resto de la página (**propuesto** el rango; el criterio es el del equipo: «la rapidez va antes que el efecto»).

### AC-07 — Estado al recargar

- Cubre: REQ-12
- Origen: D4

**Dado** un grupo del menú y un bloque del Resumen plegados
**Cuando** el usuario recarga la página o vuelve a iniciar sesión
**Entonces** el menú vuelve a mostrar desplegado solo el grupo de la página actual y el Resumen, todos sus bloques desplegados, porque el navegador no guarda el estado de plegado ([STD-08](../../../architecture/standards.md)).
**Y** navegar entre páginas sin recargar conserva lo plegado en el menú lateral.

### AC-08 — Botón del menú de usuario

- Cubre: REQ-05, REQ-09
- Origen: PBI-0032; Daniel, reunión

**Dado** el usuario `superadmin` de la semilla, «Superadministrador Demo»
**Cuando** abre cualquier página del Admin en escritorio
**Entonces** la cabecera muestra un botón con un círculo con las iniciales «SD», el nombre «Superadministrador Demo» y, al costado, «SUPERADMINISTRADOR».
**Y dado** un `admin` o un `vendedor`, **entonces** muestra «ADMINISTRADOR» o «VENDEDOR».

### AC-09 — Contenido del menú de usuario

- Cubre: REQ-06, REQ-10
- Origen: PBI-0032; Daniel, reunión

**Dado** el botón del menú de usuario
**Cuando** el usuario lo activa con el ratón o con el teclado
**Entonces** se abre un menú con el nombre, el correo y el rol de la cuenta, y las opciones «Perfil» y «Cerrar sesión», en ese orden.
**Y cuando** pulsa Escape, el menú se cierra y el foco vuelve al botón.

### AC-10 — Cerrar sesión desde el menú

- Cubre: REQ-07
- Origen: PBI-0032

**Dado** el menú de usuario abierto
**Cuando** el usuario elige «Cerrar sesión»
**Entonces** el Admin cierra la sesión en el BFF, borra el token de `sessionStorage` y muestra `/login`, como hoy.
**Y** la cabecera ya no tiene un botón «Cerrar sesión» fuera del menú.

### AC-11 — Iniciales

- Cubre: REQ-09
- Origen: **propuesto**

**Dado** el nombre de un usuario
**Cuando** el Admin calcula sus iniciales
**Entonces** toma la primera letra de la primera palabra y la de la última, en mayúsculas («Vendedor Demo» → «VD», «Ana María Torres» → «AT», «  carlos  » → «C»), conservando las tildes («Ángel Ruiz» → «ÁR»).
**Y cuando** el nombre está vacío, toma la primera letra del correo.

### AC-12 — Perfil

- Cubre: REQ-08, REQ-10
- Origen: PBI-0032; D5

**Dado** un usuario `vendedor` con el menú de usuario abierto
**Cuando** elige «Perfil»
**Entonces** llega a `/perfil`, que muestra su nombre, su correo, su rol («Vendedor») y la descripción del rol, sin campos editables ni botón de guardar.
**Y** la página la abren los tres roles, solo muestra la cuenta de la sesión y no pide datos nuevos al BFF.
**Y dado** un visitante sin sesión, **cuando** abre `/perfil`, **entonces** el Admin lo lleva a `/login`, como con las demás páginas.

### AC-13 — Móvil

- Cubre: REQ-01, REQ-05, REQ-11
- Origen: STD-12; D3

**Dado** el Admin a 375 px de ancho
**Cuando** el usuario abre el Resumen y el menú de usuario
**Entonces** el menú lateral es la tira horizontal de hoy, con todos los enlaces y sin títulos de grupo; no hay desborde horizontal de la página; el botón del menú de usuario sigue al alcance (puede mostrar solo las iniciales) y el menú abierto cabe en la pantalla.
**Y** los bloques del Resumen también se pliegan en móvil.

### AC-14 — Temas

- Cubre: REQ-11
- Origen: feature 002

**Dado** el tema activo A, B o C
**Cuando** el usuario abre el Admin
**Entonces** el círculo de las iniciales, los indicadores de plegado y el menú de usuario usan los colores del tema, con el contraste AA de sus tokens.

### AC-15 — Sin cambios fuera de lo pedido

- Cubre: REQ-11
- Origen: STD-12

**Dado** las capturas del Admin antes de la feature, con los tres temas, en escritorio y móvil
**Cuando** se comparan con las de después
**Entonces** solo cambian la cabecera (menú de usuario en lugar del nombre, el rol y «Cerrar sesión» sueltos; «Actualizar» sigue), los títulos de los grupos del menú lateral en escritorio y los encabezados de los cinco bloques del Resumen, y aparece la página `/perfil`. El contenido de las páginas, los textos, la tira del menú en móvil y el resto del diseño no cambian.

## Datos y contrato

Sin cambios en el [contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md). La feature usa lo que ya devuelve la sesión del Admin.

| Campo u operación | Regla | Roles | Origen |
|---|---|---|---|
| `GET /admin/sessions/current` → usuario (`name`, `email`, `role`) | Fuente del nombre, el correo, el rol y las iniciales del menú | Los tres | REQ-06, REQ-10 |
| Etiqueta del rol | La de [`rol.rules.ts`](../../../../frontend/projects/admin/src/app/features/sesion/domain/rol.rules.ts) («Superadministrador», «Administrador», «Vendedor»), mostrada en mayúsculas en el botón | Los tres | REQ-05 |
| `DELETE /admin/sessions/current` | Sin cambios; ahora se llama desde el menú | Los tres | REQ-07 |
| Estado de plegado | Solo en memoria de la aplicación; no se guarda en el navegador (STD-08, D4) | Los tres | REQ-12 |
| Descripción del rol en `/perfil` | La `description` de [`rol.rules.ts`](../../../../frontend/projects/admin/src/app/features/sesion/domain/rol.rules.ts) | Los tres | REQ-08 |

Términos: «Resumen» y los roles, en el [glosario](../../../architecture/glosario.md).

## Interfaz

Cambio visual **pedido** por Daniel en la reunión, solo en los elementos de la tabla. Se contrasta con el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md) y se toman capturas antes y después ([STD-12](../../../architecture/standards.md)).

El sistema visual quitó del Admin las etiquetas en mayúsculas sobre los títulos («eyebrows»). El rol en mayúsculas del menú de usuario no es una de ellas: es una excepción pedida por Daniel («Superadministrador, todo en mayúsculas») y no se extiende a otros textos.

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| Cabecera de todas las páginas | Menú de usuario en lugar del nombre, el rol y el botón «Cerrar sesión» sueltos. «Actualizar» se queda junto al menú (D6) | Sí |
| Menú lateral de todas las páginas, en escritorio | Títulos de grupo como botones plegables, con indicador; solo el grupo actual desplegado al entrar (D2) | Sí |
| Menú lateral en móvil | Sin cambios: tira horizontal sin títulos (D3) | No |
| Resumen (`/`) | Encabezados de los cinco bloques plegables, con indicador; tarjetas sin cambios (D1) | Sí |
| Perfil (`/perfil`, ruta nueva) | Página de solo lectura con nombre, correo, rol y descripción del rol (D5) | Sí |
| Resto de páginas | Sin cambios | No |

## Integraciones

Ninguna.

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| Nombre muy largo | El nombre se recorta con puntos suspensivos en el botón; completo en el menú | REQ-05, AC-08 |
| Nombre vacío o solo espacios | Iniciales desde el correo | REQ-09, AC-11 |
| Grupo con un solo enlace (General, Accesos) | También se pliega, igual que los demás | REQ-01 |
| Todos los bloques del Resumen plegados | Se ven solo los encabezados; la página no queda en blanco | REQ-03 |
| Bloque que el rol no ve (por ejemplo, clientes para `vendedor`) | No aparece, como hoy; no hay encabezado plegable vacío | REQ-03, AC-03 |
| Snapshot sin datos (tienda nueva) | Los bloques muestran su estado vacío de la feature 001 y siguen plegables | REQ-03 |
| La sesión vence con el menú abierto | Al elegir una opción, el Admin vuelve a `/login`, como hoy con cualquier operación. Nota posterior (lote 09 de [ADR-0017](../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md), PBI-0082): «Perfil» no consultaba al BFF (REQ-10) y mostraba los datos en memoria; desde el lote 06 (PBI-0124) cualquier consulta con la sesión vencida lleva a `/login`, y desde el 07b (PBI-0034) el perfil es editable y su guardado sí consulta al BFF | REQ-07 |
| Fallo del BFF al cerrar sesión | Se borra el token local y se va a `/login` igual, como hoy | REQ-07, AC-10 |
| Modo demo con la tuerca de temas | La tuerca flotante no se tapa con el menú de usuario ni con el lateral | REQ-11 |

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio):

- El menú lateral tiene cinco grupos fijos (General, Catálogo, Ventas, Tienda y Accesos), filtrados por permiso; en escritorio muestra los títulos y en móvil es una tira horizontal sin títulos ([`app.layout.ts`](../../../../frontend/projects/admin/src/app/layout/app.layout.ts)).
- La cabecera muestra «Backoffice de la tienda», el nombre, la etiqueta del rol y los botones «Actualizar» (recarga el snapshot) y «Cerrar sesión».
- El Resumen tiene la fila de cuatro tarjetas y cinco bloques con título: el gráfico por día, «Pedidos por distrito», «Alertas de inventario», «Últimos pedidos» y «Pedidos por estado» (feature 001).
- El usuario de la sesión trae `name`, `email` y `role` ([`usuario-admin.model.ts`](../../../../frontend/projects/admin/src/app/features/sesion/domain/usuario-admin.model.ts)).
- STD-08 solo permite en el navegador el token de sesión (`sessionStorage`), el carrito (`localStorage`) y, en modo demo, la cookie del tema en vista previa.
- No existe una página de perfil ni rutas del BFF para editar la cuenta propia.

**Supuestos** (se asumen hasta que se confirmen):

- «Componentes colapsibles» del Resumen se refiere a sus bloques con título, y «los menús» a los grupos del menú lateral, como recoge PBI-0031.
- El rol en mayúsculas sale de la etiqueta en español del rol, no del id técnico (`superadmin`).
- El ícono del menú de usuario lleva las iniciales, como registra PBI-0032 (PR #10). La transcripción de la reunión es ambigua en ese punto («un icono, que en nuestro caso sería el nombre, no los iniciales. Un icono por defecto. Las iniciales y…»): si Daniel quería un ícono genérico de persona en lugar de las iniciales, cambian REQ-05, AC-08 y AC-11, pero no el resto.
- La descripción del rol que muestra «Perfil» es la de los permisos vigentes; si se aplican los permisos que propuso Daniel ([PBI-0013](../../../planning/backlog.md)), la descripción cambia con ellos.
- La frase de Daniel «en vez de modo de demostración, le pones el rol» se cumple con el rol al costado del nombre; el texto «Backoffice de la tienda» de la cabecera se conserva.

**Decisiones pendientes** (bloquean el trabajo que dependa de ellas):

- Ninguna propia: P1 a P6 se resolvieron en el hito de alcance (D1 a D6).
- [PBI-0013](../../../planning/backlog.md) (permisos del vendedor) y [PBI-0043](../../../planning/backlog.md) (modelo de datos de Daniel): no bloquean esta feature, que no cambia permisos ni datos.

## Preguntas abiertas

Ninguna. Las seis preguntas del hito están resueltas en [Decisiones del hito de alcance](#decisiones-del-hito-de-alcance) (D1 a D6).

## Decisiones del hito de alcance

Las preguntas se presentaron de una en una el 2026-11-12, con sus alternativas y la recomendación. Sebastián Avila eligió la recomendada en las seis.

| ID | Pregunta | Decisión | Alternativas descartadas |
|---|---|---|---|
| D1 | ¿Qué partes del Resumen se pliegan? | Los cinco bloques con título (gráfico por día, «Pedidos por distrito», «Alertas de inventario», «Últimos pedidos» y «Pedidos por estado»); la fila de tarjetas queda fija, porque son cifras de un vistazo sin título de sección | Plegar también las tarjetas como bloque «Indicadores» (añade un encabezado que no existe); no plegar nada del Resumen (contradice PBI-0031) |
| D2 | ¿Cómo empieza el menú lateral? | Como en OpenCart: al entrar solo está desplegado el grupo de la página actual; se pueden abrir varios a la vez. Los bloques del Resumen empiezan desplegados | Todos los grupos abiertos, como hoy; acordeón con un solo grupo abierto |
| D3 | ¿Hamburguesa y móvil? | Sin hamburguesa: los grupos se pliegan solo en escritorio y en móvil la tira horizontal queda como hoy. La hamburguesa pasa al backlog (PBI-0044) | Hamburguesa solo en móvil, con el menú en panel; hamburguesa también en escritorio (necesita íconos) |
| D4 | ¿Se recuerda el plegado al recargar? | No: dura mientras se navega sin recargar; al recargar o volver a entrar, vuelve al estado inicial. Cumple STD-08 sin ADR | Guardarlo en `localStorage` (amplía STD-08 con un ADR) |
| D5 | ¿Qué hace «Perfil»? | Página `/perfil` de solo lectura con nombre, correo, rol y descripción del rol, con los datos de la sesión y sin cambios en el BFF. La edición queda en PBI-0034 | Omitir «Perfil» hasta PBI-0034 (se aparta de lo que pidió Daniel); perfil editable con rutas nuevas del BFF |
| D6 | ¿Qué pasa con «Actualizar»? | Se queda en la cabecera, junto al menú de usuario, sin cambio de comportamiento: es una acción sobre los datos, no sobre la cuenta | Pasarlo al menú de usuario (menos visible); quitarlo (pierde una acción que existe hoy) |

## Referencias

- [Backlog: PBI-0031 a PBI-0034](../../../planning/backlog.md)
- [Feature 001: Reorganizar el Resumen del Admin](../001-reorganizar-resumen-del-admin/specification.md)
- [Feature 002: Temas configurables](../002-temas-configurables/specification.md)
- [Decisiones pendientes](../../../planning/PENDING-DECISIONS.md)
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md)
- [Estándares](../../../architecture/standards.md)
- [Glosario](../../../architecture/glosario.md)
