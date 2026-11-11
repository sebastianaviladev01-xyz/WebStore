# 002. Temas configurables — Especificación

- Feature: `002-temas-configurables`
- Historia de usuario: ninguna. Sale de [PBI-0030](../../../planning/backlog.md) (`priorizada`), con lo decidido en las reuniones del equipo (Daniel, Walther y Sebastián), notas pegadas el 2026-11-11 y registradas en `dev` con el PR #10 (`8238209`), y en [decisiones pendientes](../../../planning/PENDING-DECISIONS.md): «Confirmación de la paleta»
- Estado: borrador
- Fecha: 2026-11-11
- Hito de alcance: pendiente

## Problema y actores

WebStore se venderá a varios clientes, como Shopify, y cada tienda necesita su propia identidad de color. Hoy hay un solo tema, la paleta B «Azul cobalto», en un único archivo de tokens que comparten la tienda y el Admin ([sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md#paleta-y-tokens)). Desde Contenido solo se cambian dos colores, y solo en la tienda. El primer cliente, Ecom, usará el tema C, negro con amarillo, y conservará su logo rojo, que es marca registrada.

El equipo decidió que los temas se hagan **desde el inicio**, antes de la gestión de banners, para que todo componente actual y futuro nazca tomando sus colores del tema activo y no haya que refactorizarlo después.

Actores:

- `superadmin`: gestiona los temas y elige el activo. Es el único rol que configura la tienda (Daniel, reunión del 11/11).
- `admin` y `vendedor`: trabajan en el Admin con el tema activo; no gestionan temas.
- Comprador (invitado o con cuenta): ve la tienda con el tema activo.
- Quien prueba la demo (equipo o cliente potencial): cambia de tema en vivo con el botón flotante del modo demo.

Aplicaciones afectadas: **Storefront**, **Admin** y **BFF**.

## Alcance

**Incluye:**

- Tres temas predefinidos: A «Violeta tienda», B «Azul cobalto» (el actual) y C «Grafito y ámbar».
- Cinco colores por tema: principal, secundario, fondo principal, fondo secundario y contraste.
- Que todo componente de la tienda y del Admin tome sus colores del tema activo, sin colores fijos fuera de los tokens.
- Un tema activo, que la tienda y el Admin aplican.
- Una página de temas en la configuración del Admin, solo para el `superadmin`: lista de temas, crear, editar y borrar temas propios, y marcar uno como activo.
- Que los tres predefinidos no se puedan editar ni borrar.
- La revisión del contraste (WCAG) de los predefinidos y el aviso cuando un tema propio no tiene contraste suficiente.
- La persistencia de los temas propios y del tema activo en el BFF, y que el BFF haga cumplir el permiso.
- El modo demo: un botón flotante (una tuerca) en la tienda y en el Admin para cambiar de tema en vivo. En la instalación de un cliente no existe.

**Excluye:**

- La gestión de banners, que va después de esta feature.
- El logo y las imágenes: el tema no los cambia. El logo rojo de Ecom no se toca.
- La tipografía, los radios, las sombras y el espaciado por tema: un tema solo cambia colores.
- Un modo oscuro automático (`prefers-color-scheme`) y un tema por usuario o por navegador fuera del modo demo.
- Importar o exportar temas entre tiendas.
- Elegir entre multi-tenant e instalación por cliente ([PBI-0004](../../../planning/backlog.md)): la feature trabaja sobre la tienda que sirve el BFF.
- Aclarar el fondo de la tienda ([PBI-0037](../../../planning/backlog.md)) y el panel del checkout (PBI-0038): son tareas aparte que, cuando se decidan, cambiarán los valores de los temas, no esta especificación.
- Publicar la demo en un dominio propio con el selector de temas ([PBI-0042](../../../planning/backlog.md)).
- Alinear los permisos del vendedor ([PBI-0013](../../../planning/backlog.md)), salvo que la gestión de temas sea solo del `superadmin`.

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | Existen tres temas predefinidos, A «Violeta tienda», B «Azul cobalto» y C «Grafito y ámbar», cada uno con sus cinco colores. B conserva los valores de la paleta actual | PBI-0030; reunión del 11/11 | Alta |
| REQ-02 | Un tema tiene un nombre y cinco colores: principal, secundario (el acento), fondo principal, fondo secundario (la superficie) y contraste (el texto) | PBI-0030; reunión del 11/11; D2 | Alta |
| REQ-03 | Todo componente de la tienda y del Admin toma sus colores del tema activo. Los predefinidos aplican además los valores presentados que no son uno de los cinco; en un tema propio, esos valores se derivan de los cinco (D2) | Reunión del 11/11: «componentes temables desde el inicio»; D2 | Alta |
| REQ-17 | En el texto sobre un color, en los enlaces y en el foco, la interfaz usa un color que alcanza el contraste necesario: el texto sobre el principal y sobre el secundario es blanco o el de contraste, y los enlaces y el foco usan el principal solo si contrasta lo suficiente con los fondos; si no, el de contraste | D2; contraste medido de C en [Paletas presentadas](#paletas-presentadas) | Alta |
| REQ-04 | Hay un único tema activo para la tienda. La tienda y el Admin lo aplican al cargar | PBI-0030: «elegir el activo» | Alta |
| REQ-05 | El `superadmin` ve en la configuración del Admin la lista de temas, con los predefinidos y los propios, y cuál está activo | PBI-0030; reunión del 11/11 | Alta |
| REQ-06 | Los temas predefinidos no se editan ni se borran | PBI-0030; reunión del 11/11 | Alta |
| REQ-07 | El `superadmin` crea, edita y borra temas propios, eligiendo cada color con un selector de color | PBI-0030; reunión del 11/11 | Alta |
| REQ-08 | El `superadmin` marca un tema, predefinido o propio, como activo | PBI-0030; reunión del 11/11 | Alta |
| REQ-09 | Solo el `superadmin` gestiona temas. El BFF lo hace cumplir aunque la petición no venga de la interfaz | Reunión del 11/11; regla de roles del [contrato](../../../../backend/docs/BFF-CONTRACT.md#roles-fijos-acordados-el-0511): el BFF es la autoridad | Alta |
| REQ-10 | Los temas propios y el tema activo se guardan en el BFF y sobreviven a un reinicio | PBI-0030 (la tienda los gestiona «sin depender del equipo») | Alta |
| REQ-11 | En modo demo, la tienda y el Admin muestran un botón flotante con una tuerca que permite cambiar de tema en vivo, sin recargar la página | Reunión del 11/11 | Alta |
| REQ-12 | Fuera del modo demo, el botón flotante no existe | Reunión del 11/11 | Alta |
| REQ-13 | Cada tema predefinido cumple WCAG 2.1 AA en sus pares de texto y fondo | Sistema visual (todos los pares de B cumplen AA); propuesto para A y C | Alta |
| REQ-14 | Al crear o editar un tema propio, el Admin muestra el contraste de sus pares de texto y fondo y avisa cuando uno no alcanza AA | Encargo de la etapa; política exacta en la pregunta 7 | Media |
| REQ-15 | El tema no cambia el logo ni las imágenes de la tienda | Contexto del producto: el logo rojo de Ecom es marca registrada | Alta |
| REQ-16 | Cambiar de tema no hace esperar al comprador: el cambio es inmediato y no añade animaciones ni cargas en el camino de compra | Sistema visual, «Movimiento»: rapidez antes que efecto | Media |

## Criterios de aceptación

Ningún AC sale de una historia de usuario. Los que salen de PBI-0030 o de las decisiones de la reunión del 11/11 citan ese origen; los demás están marcados como **propuesto** hasta el hito de alcance.

### AC-01 — Con el tema B, nada cambia

- Cubre: REQ-01, REQ-03, REQ-04
- Origen: PBI-0030 («B, el actual»)

**Dado** que el tema activo es B
**Cuando** se abren las rutas de la tienda y del Admin de la [lista de capturas](#capturas)
**Entonces** las capturas son iguales a las tomadas en `dev` antes de la feature, en escritorio y en móvil.

### AC-02 — La tienda y el Admin aplican el tema activo

- Cubre: REQ-03, REQ-04
- Origen: reunión del 11/11

**Dado** que el `superadmin` marcó C como activo
**Cuando** un comprador abre la tienda y un usuario del Admin abre cualquier página
**Entonces** cabecera, botones, enlaces, foco, tarjetas, formularios, fondos, pie de página, insignias, gráficos y diálogos usan los colores de C, y no queda ningún color de B.

### AC-03 — Lista de temas

- Cubre: REQ-05
- Origen: PBI-0030; reunión del 11/11

**Dado** un `superadmin` con sesión en el Admin
**Cuando** abre la página de temas
**Entonces** ve los tres predefinidos y los temas propios, cada uno con su nombre y una muestra de sus cinco colores, distingue los predefinidos de los propios y ve cuál está activo.

### AC-04 — Solo el superadministrador gestiona temas

- Cubre: REQ-09
- Origen: reunión del 11/11

**Dado** un usuario `admin` o `vendedor` con sesión en el Admin
**Cuando** busca la página de temas en el menú o la abre por URL
**Entonces** no la ve en el menú, la ruta no se abre, y el BFF rechaza con `403` cualquier petición suya que cree, edite, borre o active un tema.

### AC-05 — Los predefinidos no se editan ni se borran

- Cubre: REQ-06
- Origen: PBI-0030; reunión del 11/11

**Dado** el `superadmin` en la página de temas
**Cuando** mira un tema predefinido
**Entonces** no tiene las acciones de editar ni de borrar, solo la de activarlo, y el BFF rechaza una petición que intente modificarlo o borrarlo, sin cambiar nada.

### AC-06 — Crear un tema propio

- Cubre: REQ-02, REQ-07
- Origen: PBI-0030; reunión del 11/11

**Dado** el `superadmin` en la página de temas
**Cuando** crea un tema con un nombre y los cinco colores elegidos con el selector de color, y lo guarda
**Entonces** el tema aparece en la lista como propio, sin activarse, y sigue ahí tras recargar el Admin y tras reiniciar el BFF.

### AC-07 — Vista previa al editar

- Cubre: REQ-07
- Origen: **propuesto**

**Dado** el `superadmin` creando o editando un tema propio
**Cuando** cambia un color
**Entonces** una vista previa dentro del formulario (cabecera, botón principal, botón secundario, tarjeta y texto sobre los dos fondos) muestra el resultado al momento, sin cambiar el tema del resto del Admin ni el de la tienda.

### AC-08 — Editar un tema propio

- Cubre: REQ-07
- Origen: PBI-0030; reunión del 11/11

**Dado** un tema propio
**Cuando** el `superadmin` cambia su nombre o sus colores y guarda
**Entonces** la lista muestra los cambios y, si el tema es el activo, la tienda y el Admin los aplican en su siguiente carga.

### AC-09 — Borrar un tema propio

- Cubre: REQ-07
- Origen: PBI-0030; la confirmación y la regla del tema activo son **propuesto**

**Dado** un tema propio que no es el activo
**Cuando** el `superadmin` lo borra y confirma
**Entonces** desaparece de la lista y no vuelve tras recargar.

**Dado** el tema propio que está activo
**Cuando** el `superadmin` intenta borrarlo
**Entonces** el Admin no lo permite y le indica que primero active otro tema; el BFF también lo rechaza.

### AC-10 — Activar un tema

- Cubre: REQ-04, REQ-08, REQ-10
- Origen: PBI-0030; reunión del 11/11

**Dado** el `superadmin` en la página de temas
**Cuando** marca otro tema como activo
**Entonces** la lista lo muestra como activo, el Admin lo aplica sin recargar, la tienda lo aplica en su siguiente carga y sigue activo tras reiniciar el BFF.

### AC-11 — Nombre de un tema propio

- Cubre: REQ-02
- Origen: **propuesto**

**Dado** el formulario de un tema propio
**Cuando** el nombre está vacío o coincide, sin distinguir mayúsculas ni espacios, con el de otro tema
**Entonces** no se guarda y el campo explica el motivo. El BFF aplica la misma validación.

### AC-12 — Colores válidos

- Cubre: REQ-02
- Origen: **propuesto**

**Dado** una petición que crea o edita un tema
**Cuando** falta uno de los cinco colores o uno no es un color hexadecimal `#RRGGBB`
**Entonces** el BFF la rechaza con `400` y no guarda nada.

### AC-13 — Contraste de los predefinidos

- Cubre: REQ-13, REQ-17
- Origen: sistema visual para B; **propuesto** para A y C

**Dado** cada tema predefinido
**Cuando** se mide el contraste de sus pares de texto y fondo (texto sobre los dos fondos, texto sobre el principal y sobre el secundario, texto secundario y enlaces)
**Entonces** cada par alcanza 4.5:1 en texto normal y 3:1 en texto grande y en los contornos de foco, y la medida queda registrada en el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md).

### AC-14 — Aviso de contraste en un tema propio

- Cubre: REQ-14
- Origen: encargo de la etapa; si avisa o bloquea depende de la pregunta 7

**Dado** el `superadmin` editando un tema propio
**Cuando** un par de texto y fondo queda por debajo de AA
**Entonces** el formulario indica qué par falla y su relación de contraste (por ejemplo, «Texto sobre el color principal: 2.1:1, mínimo 4.5:1»), antes de guardar.

### AC-20 — Un principal claro sigue siendo legible

- Cubre: REQ-03, REQ-17
- Origen: D2

**Dado** un tema, predefinido o propio, cuyo color principal no alcanza 4.5:1 con el blanco ni con los fondos (por ejemplo, el amarillo `#F2B705` de C)
**Cuando** se muestran un botón principal, un enlace y un campo con el foco
**Entonces** el texto del botón usa el color de contraste, y el enlace y el contorno de foco usan el color de contraste en lugar del principal.

### AC-15 — Botón de temas en modo demo

- Cubre: REQ-11, REQ-16
- Origen: reunión del 11/11; la posición y el detalle del panel son **propuesto**

**Dado** que la instalación está en modo demo
**Cuando** alguien abre cualquier página de la tienda o del Admin
**Entonces** ve un botón flotante con una tuerca, con nombre accesible («Cambiar tema»), que abre un panel con los temas disponibles; al elegir uno, la página lo aplica al momento, sin recargar. El botón no tapa el carrito, el botón de pago ni los controles del Admin, y se maneja con teclado.

### AC-16 — Sin botón fuera del modo demo

- Cubre: REQ-12
- Origen: reunión del 11/11

**Dado** que la instalación no está en modo demo
**Cuando** alguien abre cualquier página de la tienda o del Admin
**Entonces** el botón flotante no aparece ni existe en la página.

### AC-17 — El tema no toca el logo ni las imágenes

- Cubre: REQ-15
- Origen: contexto del producto (logo de Ecom); **propuesto** como criterio

**Dado** una tienda con un logo configurado en Contenido
**Cuando** se cambia el tema activo o se cambia de tema con el botón del modo demo
**Entonces** el logo, las fotos de producto y las imágenes de los banners se ven igual que antes.

### AC-18 — La tienda carga sin parpadeo de otro tema

- Cubre: REQ-04, REQ-16
- Origen: **propuesto**

**Dado** que el tema activo no es B
**Cuando** un comprador abre la tienda
**Entonces** la página no se pinta primero con los colores de B y después con los del tema activo, y el tiempo de carga no empeora de forma apreciable frente a `dev`.

### AC-19 — Guardar con datos desactualizados

- Cubre: REQ-10
- Origen: **propuesto**, por la regla de [revisión](../../../architecture/glosario.md#aplicaciones) del BFF

**Dado** dos sesiones de `superadmin` abiertas a la vez
**Cuando** una guarda un cambio de temas y la otra guarda después sin recargar
**Entonces** la segunda recibe el aviso de datos desactualizados y no sobrescribe el cambio de la primera.

## Datos y contrato

El modelo de datos y el contrato HTTP se deciden en `sdd-plan` y `sdd-decide`. Aquí solo va lo que la feature necesita guardar y quién puede hacer cada operación.

| Campo u operación | Regla | Roles | Origen |
|---|---|---|---|
| Tema: identificador | Único. Los predefinidos tienen identificadores fijos (por ejemplo, A, B y C) | — | REQ-01 |
| Tema: nombre | Obligatorio, único sin distinguir mayúsculas ni espacios de los extremos; los predefinidos tienen el nombre fijo | — | REQ-02, AC-11 |
| Tema: tipo | Predefinido o propio | — | REQ-06 |
| Tema: cinco colores | Principal, secundario, fondo principal, fondo secundario y contraste. Hexadecimal `#RRGGBB` | — | REQ-02, AC-12 |
| Tema predefinido: valores presentados | Además de los cinco: primario oscuro, tinte o secundario de la presentación con su texto, texto sobre el primario y el acento, texto secundario y pie con su texto. Fijos, no editables | — | REQ-03, D2 |
| Tema activo | Un único tema; siempre existe | — | REQ-04 |
| Leer el tema activo y sus colores | Público: la tienda lo necesita sin sesión | Todos | REQ-04 |
| Listar temas | Con sesión del Admin | `superadmin`; los otros roles solo necesitan el activo | REQ-05 |
| Crear, editar y borrar temas propios | Rechaza los predefinidos y el borrado del activo | `superadmin` | REQ-06, REQ-07, AC-09 |
| Marcar el tema activo | Cualquier tema existente | `superadmin` | REQ-08 |
| Saber si la instalación está en modo demo | Lo leen la tienda y el Admin sin sesión | Todos | REQ-11, REQ-12; mecanismo en la pregunta 4 |

Lo que cambia respecto a hoy, para que el plan lo resuelva:

- El estado del BFF no guarda temas: `config` tiene `primaryColor` y `secondaryColor` ([`seed.mjs`](../../../../backend/src/infrastructure/persistencia/seed.mjs)), que la tienda aplica a `--ws-primary` y `--ws-accent` ([`contenido.facade.ts`](../../../../frontend/src/app/features/contenido/application/contenido.facade.ts)). Qué pasa con esos dos campos es la pregunta 3.
- No existe un permiso para temas. `content.manage` lo tienen `superadmin` y `admin` ([`rol.rules.mjs`](../../../../backend/src/domain/sesion/rol.rules.mjs)); los temas son solo del `superadmin`, así que hace falta un permiso propio o una regla equivalente.
- El snapshot del Admin (`/bff/admin/snapshot`) y los ajustes públicos (`/bff/content/settings`) son los candidatos para leer y guardar temas. Persistir temas y el tema activo cambia el [contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md) y su estado, con su migración: se decide en `sdd-plan` y `sdd-decide`.
- Los nombres del contrato siguen la convención vigente del BFF y el vocabulario del [glosario](../../../architecture/glosario.md). «Tema», «Tema predefinido», «Tema propio», «Tema activo» y «Modo demo» son términos nuevos: se añaden al glosario al implementarlos.

## Paletas presentadas

Valores de las tres paletas que se presentaron el 05/11 («WebStore — 3 paletas de inicio», PDF de seis páginas). Sebastián Avila los transcribió el 2026-11-11 (D1). El PDF es de imágenes y no está en el repositorio.

| Papel en la presentación | A · Violeta tienda | B · Azul cobalto | C · Grafito y ámbar |
|---|---|---|---|
| Primario | `#4C2A92` | `#1D4ED8` | `#F2B705`, con texto `#1F2328` |
| Primario oscuro | `#2E1A5C` | `#1E3A8A` | — |
| Secundario | `#EFE9FB`, con texto `#3A1F72` | `#E8EEFC`, con texto `#1E3A8A` | Grafito `#1F2328`, con texto blanco |
| Tinte | — | — | Ámbar `#FFF6D6`, con texto `#8A5A00` |
| Acento | `#F5A524`, con texto `#2B1700` | `#C2410C`, con texto blanco | `#1F2328`, con texto `#F2B705` |
| Fondo | `#F4F4F6` | `#F3F5F8` | `#F2F3F5` |
| Superficie | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| Texto | `#17151C` | `#0F172A` | `#1F2328`, también para los enlaces |
| Texto secundario | `#5B5866` | `#526075` | `#555B65` |
| Pie de página | `#1E1530`, con texto `#CFC8E0` | `#0F1B33`, con texto `#C5CEDD` | `#16181C`, con texto `#C9CDD3` |

Contraste medido con la fórmula de WCAG 2.1 el 2026-11-11 (relación con el color de texto que indica la presentación):

| Par | A | B | C |
|---|---:|---:|---:|
| Texto sobre fondo / sobre superficie | 16.5 / 18.1 | 16.4 / 17.9 | 14.2 / 15.8 |
| Texto secundario sobre fondo / sobre superficie | 6.3 / 6.9 | 5.9 / 6.4 | 6.2 / 6.8 |
| Texto sobre el primario | 10.2 (blanco) | 6.7 (blanco) | 8.7 (`#1F2328`) |
| Texto sobre el primario oscuro | 14.8 | 10.4 | — |
| Texto sobre el secundario | 11.0 | 8.9 | 15.8 |
| Texto sobre el tinte | — | — | 5.5 |
| Texto sobre el acento | 8.4 | 5.2 | 8.7 |
| Texto del pie sobre el pie | 10.8 | 10.8 | 11.1 |
| Primario como enlace o foco sobre superficie / sobre fondo | 10.2 / 9.3 | 6.7 / 6.1 | **1.8 / 1.6** |

Todos los pares que define la presentación cumplen AA. El amarillo de C no sirve como color de texto, de enlace ni de contorno de foco sobre fondos claros (1.8:1, por debajo incluso del 3:1 de los elementos de interfaz), y tampoco admite texto blanco encima (1.8:1). Por eso C usa el texto `#1F2328` para los enlaces. Hoy la interfaz usa `--ws-primary` para enlaces, foco y navegación activa ([sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md#paleta-y-tokens)): con C eso debe cambiar.

La B implementada difiere un poco de la presentada. El primario oscuro se deriva con `color-mix()` (≈ `#183996`, no `#1E3A8A`) y el tinte, ≈ `#E8EDFB`, no `#E8EEFC`. AC-01 pide que B no cambie, así que el tema B conserva los valores implementados.

## Interfaz

**La feature cambia la interfaz.** Es un cambio visual pedido (PBI-0030, reunión del 11/11), que se contrasta con el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md). Con el tema B la interfaz no cambia (AC-01); con A y C cambian los colores, no la estructura, la tipografía ni el espaciado.

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| Todas las pantallas de la tienda | Colores del tema activo. Con B, iguales a hoy | Sí, con A, C y temas propios |
| Todas las pantallas del Admin, incluido el acceso | Colores del tema activo. Hoy el Admin no aplica ni los colores de Contenido | Sí, con A, C y temas propios |
| Admin: página nueva de temas (grupo «Tienda» del menú, solo `superadmin`; **propuesto**) | Lista, formulario con selectores de color, vista previa y aviso de contraste | Sí, página nueva |
| Admin: Contenido | Depende de la pregunta 3 | Por decidir |
| Tienda y Admin en modo demo | Botón flotante con una tuerca y su panel | Sí, solo en modo demo |
| `meta theme-color` de la tienda y del Admin | Hoy fija en `#1d4ed8`; sigue al color principal del tema activo (**propuesto**) | Sí |

Hoy los colores salen casi todos de [`tokens.css`](../../../../frontend/src/styles/tokens.css): unos 25 tokens `--ws-*` con nombres semánticos de Tailwind. Quedan fuera algunos valores fijos que el plan debe llevar a tokens: el blanco del texto sobre el principal en `storefront.css`, `styles.css` y `home.css`, las sombras con `rgba(15, 23, 42, …)`, el `theme-color` de los dos `index.html` y unos 22 usos de `bg-white`, `text-white` o `border-white` en las plantillas.

### Capturas

Las rutas y los anchos se fijan en `sdd-tasks`. Como mínimo, en escritorio y en móvil:

- Tienda: inicio, catálogo, ficha de producto, carrito y checkout.
- Admin: acceso, Resumen, Productos, Pedidos y la página de temas.
- Cada ruta con los tres temas predefinidos: B frente a `dev` (iguales, AC-01) y A y C frente a B (solo cambian los colores, AC-02).
- La tienda y el Admin con el modo demo activo (botón y panel abiertos) y sin él (AC-15, AC-16).

## Integraciones

Ninguna externa. El BFF de prueba guarda los temas y el tema activo y publica si la instalación está en modo demo.

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| El tema activo guardado no existe (datos corruptos o migración incompleta) | La tienda y el Admin usan B y el BFF lo corrige al normalizar el estado (**propuesto**) | REQ-04 |
| El BFF no responde al cargar la tienda | Se ve con B, como hoy con los colores por defecto de Contenido | REQ-04, AC-18 |
| Un `admin` intenta crear, editar, borrar o activar un tema con una petición directa | `403`, sin cambios | AC-04 |
| Se intenta editar o borrar un predefinido con una petición directa | Error, sin cambios | AC-05 |
| Se borra el tema activo | No se permite | AC-09 |
| Nombre repetido o vacío | No se guarda | AC-11 |
| Color con formato inválido | `400`, sin cambios | AC-12 |
| Tema propio con contraste insuficiente | Aviso con el par y la relación; si se puede guardar, en la pregunta 7 | AC-14 |
| Color principal claro (por ejemplo, el amarillo de C) con texto blanco encima | El texto sobre el principal debe seguir siendo legible: no puede ser siempre blanco | REQ-13, AC-13; pregunta 2 |
| Dos `superadmin` guardan a la vez | El segundo recibe el aviso de datos desactualizados | AC-19 |
| Varias personas usan a la vez la demo pública y una cambia de tema con la tuerca | Depende de la pregunta 5 | REQ-11 |
| Movimiento reducido (`prefers-reduced-motion`) | El cambio de tema y el panel no se animan | REQ-16 |

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio):

- Hay una sola paleta, B, en [`frontend/src/styles/tokens.css`](../../../../frontend/src/styles/tokens.css), importada por la tienda y el Admin. Las variantes fuerte y suave del principal y del acento se derivan con `color-mix()`.
- Los valores de B son: principal `#1D4ED8`, acento (secundario) `#C2410C`, lienzo `#F3F5F8`, superficie `#FFFFFF`, tinta `#0F172A` y texto `#1E293B`. Todos sus pares de texto cumplen AA ([sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md#paleta-y-tokens)).
- El pie de página usa un azul marino fijo (`--ws-footer: #0F1B33`), y error y alerta usan rojo y ámbar fijos (`--ws-danger`, `--ws-warning`). Ninguno es uno de los cinco colores.
- Desde Admin → Contenido se cambian `primaryColor` y `secondaryColor` ([`contenido.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/contenido.page.ts)). Solo la tienda los aplica; el Admin siempre se ve con B.
- Contenido lo editan `superadmin` y `admin` (`content.manage`).
- Hasta esta especificación, el repositorio no tenía los valores de las paletas A y C. El [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md#dirección), [`PRODUCT.md`](../../../planning/PRODUCT.md) y las decisiones pendientes solo las nombran. Los valores están ahora en [Paletas presentadas](#paletas-presentadas) (D1).
- Las paletas presentadas tienen entre 10 y 13 valores cada una, no cinco, y el papel «secundario» no significa lo mismo en todas: en A y B es un tinte claro del primario, y en C, el grafito. En Contenido, `secondaryColor` es el acento (`--ws-accent`).
- El 06/11 Daniel prefería la tercera paleta y luego la primera; quedó B por mayoría (2–1) con un solo tema. El 11/11 se decidió implementar los tres.
- El BFF ya tiene un interruptor por variable de entorno con un valor por defecto según `NODE_ENV`: `WEBSTORE_EXPOSE_TEST_CODES` ([`config.mjs`](../../../../backend/src/infrastructure/config.mjs)).
- Hoy hay una demo pública del equipo servida desde un checkout local con túneles, que comparten varias personas a la vez.

**Supuestos** (se asumen hasta que se confirmen):

- La feature trabaja sobre una sola tienda por BFF. Si se elige multi-tenant (PBI-0004), cada tienda tendrá sus temas.
- La tienda y el Admin usan el mismo tema activo.
- Los colores de estado (error y alerta) se mantienen fijos en todos los temas, salvo que fallen el contraste con un fondo. Los bordes y las superficies suaves, que la presentación no define, se derivan de los fondos y del color de contraste.
- Si PBI-0037 aclara el fondo de la tienda, cambiará el fondo principal de los predefinidos; no cambia esta especificación.

**Decisiones pendientes:**

- Persistencia de los temas y del tema activo, permiso nuevo y cambios del contrato y del estado del BFF: `sdd-plan` y `sdd-decide`.
- Dependencia de [PBI-0043](../../../planning/backlog.md): Daniel define la arquitectura y el modelo de datos base ([decisiones pendientes](../../../planning/PENDING-DECISIONS.md): «Arquitectura y modelo de datos base»). Los temas son configuración de la tienda y no forman parte del «cascarón» anunciado (usuarios, pedidos, ventas y direcciones), así que no bloquean el alcance; el plan debe dejar el almacenamiento de temas fácil de alinear con ese modelo cuando llegue.
- Multi-tenant o instalación por cliente ([PBI-0004](../../../planning/backlog.md)): no bloquea esta feature.

## Preguntas abiertas

Se presentan de una en una en el hito de alcance. Ninguna reabre lo decidido en las reuniones.

1. ~~¿Cuáles son los valores exactos de las paletas A y C?~~ Resuelta: D1.
2. ~~¿Cómo se reparten las paletas presentadas en los cinco colores, y qué es «contraste»?~~ Resuelta: D2.
3. **¿Qué pasa con el color principal y el secundario de Contenido**, que hoy edita también el `admin` y que solo aplica la tienda?
4. **¿Cómo se activa el modo demo?** Variable de entorno, ajuste del Admin o build distinto.
5. **¿A quién afecta el cambio de tema con la tuerca?** Solo al navegador de quien la usa, o a todos los que ven la demo.
6. **¿Qué tema está activo al instalar?** En la demo y en una instalación nueva; Ecom usará C.
7. **¿Un tema propio sin contraste suficiente se puede guardar?** Solo aviso, o bloqueo.

## Decisiones del hito de alcance

Las preguntas se presentan de una en una, desde el 2026-11-11, con sus alternativas, la recomendación y la evidencia.

| ID | Pregunta | Decisión | Alternativas descartadas |
|---|---|---|---|
| D1 | ¿De dónde salen los valores de las paletas A y C? | De la presentación del 05/11: Sebastián Avila transcribió el 2026-11-11 los valores del PDF «WebStore — 3 paletas de inicio» ([Paletas presentadas](#paletas-presentadas)) | Proponer valores nuevos; seguir solo con B |
| D2 | ¿Cómo se reparten las paletas presentadas en los cinco colores, y qué es «contraste»? | Principal = primario; secundario = acento (el `secondaryColor` de Contenido); fondo principal = fondo; fondo secundario = superficie; contraste = texto. Los predefinidos guardan además el resto de sus valores presentados. En los temas propios, el resto se deriva: el texto sobre un color es blanco o el de contraste, el que contraste más, y los enlaces y el foco usan el principal solo si alcanza el contraste necesario; si no, el de contraste | Todos los temas solo con cinco colores derivando el resto (A y C no quedarían como se presentaron y B podría cambiar); ampliar a más de cinco colores (reabre lo decidido) |

## Referencias

- [Backlog: PBI-0030](../../../planning/backlog.md)
- [Decisiones pendientes](../../../planning/PENDING-DECISIONS.md)
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md)
- [Contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md)
- [Glosario](../../../architecture/glosario.md)
- [Estándares](../../../architecture/standards.md) (STD-12, STD-18)
- [Trazabilidad](../../../planning/TRACEABILITY.md)
