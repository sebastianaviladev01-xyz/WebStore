# 007. Desborde de productos del Admin — Plan

- Feature: `007-desborde-de-productos-del-admin`
- Especificación: [specification.md](specification.md) (aprobada el 2026-11-14; 5 REQ, 6 AC, decisiones D1 a D3)
- Estado: aprobado
- Fecha: 2026-11-14
- Hito de arquitectura: aprobado por Sebastián Avila el 2026-11-14 en la sesión de esta etapa. Respondió las [tres preguntas](#hito-de-arquitectura) con la alternativa A, sin ajustes, y aprobó el resto del plan ([respuestas](#respuestas-del-hito))

## Enfoque

Solo cambia la plantilla de [`productos.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/productos.page.ts), en `presentation/` de la feature `tienda` del Admin. No cambian el BFF, su contrato, los datos, los permisos, los tokens, los estilos globales ni la lógica de la página. Son dos correcciones de maquetación, un efecto secundario que la primera provoca y dos nombres accesibles para las pruebas:

1. **Galería de fotos.** El `fieldset` lleva `min-w-0` (`min-inline-size: 0`), así que deja de imponer su contenido a la rejilla del formulario. Dentro, el campo «URL de foto» lleva `min-w-0` junto a `flex-1`, así que se estrecha (el relleno interior de Material ya tiene `min-width: 0`) y el botón «Agregar» se queda a su derecha, como hoy. Las dos clases valen en todos los anchos: desde 768 px el contenido ya cabía y las medidas no cambian ([prototipo](#prototipo-medido)).
2. **Ayuda de «Miniatura optimizada».** Al estrecharse el formulario a su ancho real (293 px a 375), la ayuda «Opcional. Si la dejas vacía se usa la imagen principal.» pasa a dos líneas y, como Material reserva una sola línea al subíndice, se monta 4 px sobre la leyenda «Galería de fotos». El campo pasa a `subscriptSizing="dynamic"`, la opción pública de Material que ya usa el campo «URL de foto»: el campo crece 16 px solo cuando la ayuda ocupa dos líneas. Desde 768 px la ayuda ocupa una línea y el campo mide lo mismo (77 px).
3. **Lista de productos por debajo de 768 px.** Cada fila pasa a dos líneas: el producto (nombre y la línea del SKU) ocupa todo el ancho, y debajo van el precio, el stock con la etiqueta «Stock» y las acciones, alineadas a la derecha. La cabecera de la lista se oculta. Se escribe con las variantes `max-md:` de Tailwind, que solo se aplican por debajo de 768 px, añadidas a las clases de hoy: las clases de escritorio no cambian, y por eso tampoco el escritorio (REQ-05). Forma y escritura aprobadas en las [preguntas 1 y 2 del hito](#respuestas-del-hito).
4. **Nombres accesibles.** La lista y el formulario reciben nombre accesible, para que las e2e los localicen por rol y nombre ([pregunta 3](#respuestas-del-hito)). Sin cambio visual.

Alternativas descartadas en la especificación: desplazar la lista dentro de su tarjeta, como `/pedidos` (D3), y corregir también `/clientes` e `/inventario` (D1, siguen en PBI-0059). Alternativas de este plan, en el [hito](#hito-de-arquitectura).

### Prototipo medido

Para no planificar a ciegas, el 2026-11-14 se probó la corrección sin tocar el código: el mismo método que las [medidas de la base](specification.md#medidas-de-la-base) (Playwright con el Chrome instalado, sesión de `superadmin`, BFF en 3000 sobre una copia nueva del seed fuera del repositorio, Admin en 4300 con `ng serve`, B activo), con el CSS equivalente a las clases propuestas inyectado en la página. Al editar se añadieron dos URL a la galería sin guardar. Los guiones y las capturas quedaron fuera del repositorio.

| Ancho | `scrollWidth` antes → prototipo | Columna «Producto» antes → prototipo | Alto de cada fila | «URL de foto»: ancho del texto | «Agregar» acaba en (formulario acaba en) |
|---|---|---|---|---|---|
| 360 | 376 → 360 | 0 → 294 px | 197–213 → 117 px | 180 → 123 px | 302 (344) |
| 375 | 376 → 375 | 0 → 309 px | 197–213 → 117 px | 180 → 138 px | 317 (359) |
| 390 | 390 → 390 | 4 → 324 px | 197–213 → 117 px | 180 → 153 px | 332 (374) |
| 768, 1024 y 1440 | sin cambio | sin cambio | 73 px, igual | igual | igual |

En el prototipo, a 360, 375 y 390 px: ningún elemento de `main` acaba a la derecha de la pantalla; el SKU y el resumen ocupan una línea y los nombres del seed no se recortan; «Editar» y «Eliminar» acaban a 17 px del borde de la tarjeta; con fotos en la galería, las miniaturas y sus botones quedan 17 px dentro del `fieldset`. Con `subscriptSizing="dynamic"` emulado, la ayuda de dos líneas acaba 12 px por encima de la leyenda (la separación de la rejilla); sin él, 4 px por debajo. Desde 768 px, todas las medidas (las de la tabla, la cabecera, el `fieldset`, el campo y el formulario) son idénticas antes y después.

## Responsabilidades por capa

| Capa | Elemento | Responsabilidad | REQ |
|---|---|---|---|
| Frontend: `domain/` | — | Sin cambios: no hay reglas nuevas | — |
| Frontend: `application/` | `TiendaFacade` | Sin cambios | — |
| Frontend: `data/` | — | Sin cambios | — |
| Frontend: `presentation/` | `ProductosPage` (`productos.page.ts`), solo la plantilla | Galería y ayuda del formulario (REQ-02); fila de la lista en dos líneas por debajo de 768 px y cabecera oculta (REQ-03); nombres accesibles de la lista y del formulario ([pregunta 3](#pregunta-3-cómo-localizan-las-e2e-la-lista-y-el-formulario)) | REQ-01 a REQ-05 |
| BFF | — | Sin cambios: ni contrato, ni estado, ni permisos | — |

### Dependencias entre features

Ninguna. No cambian [`sheriff.config.ts`](../../../../frontend/sheriff.config.ts) ni las importaciones de la página.

## Contrato del BFF afectado

Ninguno. La página sigue leyendo y guardando los productos con `TiendaFacade` como hoy ([contrato](../../../../backend/docs/BFF-CONTRACT.md)).

## Estado del BFF

Sin cambios. Sin migración.

## Tipos intermedios y nombres

No hay tipos nuevos. Los nombres que las tareas no deben repensar:

| Tipo o nombre | Definición | Tareas que lo usan |
|---|---|---|
| Punto de corte | 768 px (`md` de Tailwind 4). Las clases nuevas de la lista llevan `max-md:` (solo por debajo de 768 px); la etiqueta «Stock» lleva `md:hidden`, como el layout de la tienda (`frontend/src/app/layout/app.layout.ts`); en el Admin no hay ningún uso | T2, T1 (TEST-05 en 767 y 768 px) |
| Clases de la galería | `min-w-0` en el `fieldset` y en el `mat-form-field` «URL de foto» (junto a `flex-1`) | T2 |
| Ayuda de «Miniatura optimizada» | `subscriptSizing="dynamic"` en su `mat-form-field` | T2 |
| Etiqueta del stock en móvil | Texto «Stock» seguido de un espacio, dentro de la celda del stock, en `text-muted` y peso normal, con `md:hidden`. A 375 px la celda se lee «Stock 9»; desde 768 px, «9». El número conserva `text-danger` cuando el stock es 0 | T2, T1 |
| Nombres accesibles (pregunta 3, alternativa A) | La `section` de la lista, `aria-label="Lista de productos"`, como «Lista de pedidos» de `/pedidos`. El formulario, `aria-labelledby="titulo-formulario-producto"`, el `id` de su `h2` («Nuevo producto» o «Editar producto») | T1, T2 |
| Spec e2e nueva | `frontend/tests/e2e/admin-productos-movil.spec.ts`; reutiliza `TEMAS`, `activarTema` y `restablecerTemas` de [`apoyo/contraste.ts`](../../../../frontend/tests/e2e/apoyo/contraste.ts) y `ingresarAlAdmin` y `cuentasAdmin` de [`apoyo/entorno.ts`](../../../../frontend/tests/e2e/apoyo/entorno.ts). Prefijo de los temas que restablece: ninguno (no crea temas) | T1 |
| Capturas | `frontend/output/visual-qa/007-desborde-de-productos-del-admin/{antes,despues}/{a,b,c}/`, ignorada por git, con un `LEEME.md` del método | T0, T3 |
| Copia de datos | `backend/data-capturas.json` del worktree, creada desde el seed por el BFF y sin modificar entre las dos tomas | T0, T3 |

## Dependencias y riesgos

| Riesgo o dependencia | Impacto | Mitigación |
|---|---|---|
| La corrección del `fieldset` estrecha el formulario y la ayuda de «Miniatura optimizada» se monta sobre la leyenda de la galería (medido: 4 px a 360, 375 y 390) | Un defecto nuevo en móvil, causado por la feature | `subscriptSizing="dynamic"` en ese campo; TEST-02 comprueba que la ayuda acaba por encima de la leyenda |
| Las clases de la lista cambian el escritorio por error | Rompe REQ-05 y AC-05 | Clases nuevas solo con `max-md:` (y `md:hidden` en la etiqueta), sin tocar las de hoy; TEST-05 a 768 y 1440 px, también antes del cambio; capturas a 1440 px iguales (TEST-07) |
| Es el primer uso de `max-md:` en el proyecto | Una convención nueva sin precedente | Tailwind 4 la incluye sin configuración. Se anota en el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md) junto a la lista; elegida frente a «móvil primero» en la [pregunta 2](#pregunta-2-cómo-se-escriben-las-clases-de-la-lista-para-que-el-escritorio-no-cambie) |
| El espacio de «Stock » lo quita la compilación de la plantilla | Se leería «Stock9» | Angular solo elimina los nodos de texto que son todo espacio; TEST-03 comprueba el texto «Stock 9» de la celda |
| La tuerca «Cambiar tema» del modo demo (el BFF de las e2e arranca en modo demo) queda fija abajo a la derecha, sobre la zona de «Eliminar» y «Agregar» | Un clic de las e2e podría caer en la tuerca | Las e2e de esta feature no pulsan «Eliminar»; antes de pulsar «Agregar» o «Editar», el elemento se lleva al centro de la vista. No cambia la tuerca (fuera de alcance) |
| La rama va seis commits por detrás de `dev` y choca con él en `docs/planning/backlog.md` | Conflicto al abrir el PR | Esta feature no toca `backlog.md` hasta T4, y solo la fila de PBI-0045. Se resuelve al abrir el PR, como fija el piloto |
| Las capturas necesitan un guion de Playwright que el repositorio no versiona ([PBI-0057](../../../planning/backlog.md)) | T0 escribe el guion otra vez (en la 005, TASK-01 subió de ligero a estándar por eso) | T0 es `estándar · medio`. El guion vive en `frontend/output/` con las capturas y lo reutiliza T3. Versionarlo es PBI-0057, fuera de este piloto |
| `productos.page.ts` tiene defectos registrados en `dev` fuera de alcance (PBI-0119, PBI-0121, PBI-0122, PBI-0130 y PBI-0134) | Tentación de mezclarlos | No se tocan: solo la maquetación de la especificación |

## Decisiones

- **Acordadas** (de la especificación y de este plan):
  - Solo cambia la plantilla de `ProductosPage`; sin componentes, tokens ni estilos globales nuevos. Se confirma el supuesto de la especificación.
  - La galería se corrige con `min-w-0` en el `fieldset` y en el campo «URL de foto», en todos los anchos: es la causa medida y no cambia nada desde 768 px. Descartada la regla global `fieldset { min-inline-size: 0 }` en el `styles.css` del Admin: tocaría los formularios de otras páginas, fuera del piloto de un solo módulo, y su efecto se mediría en todas.
  - La ayuda de «Miniatura optimizada» pasa a `subscriptSizing="dynamic"`, la opción pública de Material; sin sobrescribir internals (STD-04).
  - La cabecera de la lista solo se ve desde 768 px.
  - Sin TDD obligatorio: la feature no toca ningún `domain/` ([STD-18](../../../architecture/standards.md)). Las e2e se escriben antes del cambio, como prueba de caracterización del escritorio y para ver el rojo del móvil.
  - Del hito ([respuestas](#respuestas-del-hito)): la fila en dos líneas por debajo de 768 px, sin cabecera y con «Stock» (pregunta 1); clases `max-md:` añadidas a las de hoy (pregunta 2); nombres accesibles de la lista y del formulario (pregunta 3).
- **Condicionadas:** ninguna. Las tres preguntas del hito, que bloqueaban T1 y T2, están respondidas.
- **ADR necesarios:** ninguno. Según [ADR-0001](../../../adrs/0001-registrar-decisiones-de-arquitectura.md) y STD-16, un ADR registra una decisión difícil de revertir o que afecta a más de un componente, al contrato HTTP o a las reglas de dependencia. Aquí cambia la plantilla de una sola página del Admin: se revierte con un commit, no toca el BFF, el contrato, los datos, los permisos ni las dependencias, y el patrón móvil de la lista se documenta en el sistema visual. `sdd-decide` no tiene nada que registrar; la siguiente etapa es `sdd-tasks`.

## Estrategia de pruebas

TDD obligatorio según [STD-18](../../../architecture/standards.md): ninguno en esta feature, porque no toca ningún `domain/` ni el BFF. Las e2e se derivan de los AC; se escriben antes del cambio (T1) y se ejecutan sobre la base para dejar el rojo del móvil y el verde del escritorio. No hay entorno de pruebas de componentes de Angular ([§6](../../../../frontend/architecture.md#6-pruebas)).

Todas las e2e de la tabla van en `admin-productos-movil.spec.ts`, con la sesión de `superadmin` salvo TEST-04. Cada prueba con tema activa el suyo por la API (`activarTema`) y la spec deja B activo al terminar (`restablecerTemas`). Ninguna guarda ni borra productos: los datos del BFF no cambian. Cada ancho se fija con `page.setViewportSize` y se recarga la página.

| ID | Nivel | Qué verifica | AC | TDD obligatorio | Comando |
|---|---|---|---|---|---|
| TEST-01 | E2E | Una prueba por tema (A, B y C) que recorre 360, 375 y 390 px: `scrollWidth` igual a `clientWidth`, y ningún elemento de `main` acaba a la derecha de `clientWidth` (la tira de navegación móvil está fuera de `main`) | AC-01, AC-04 | No | `npm run test:e2e -- admin-productos-movil` (desde `frontend/`) |
| TEST-02 | E2E | En las mismas pruebas de TEST-01: el formulario «Nuevo producto» tiene todos sus campos, el bloque «Galería de fotos», «URL de foto», «Agregar», «Cargar foto» y «Guardar producto» dentro de su caja; la ayuda de «Miniatura optimizada» acaba por encima de la leyenda de la galería. Al editar «OLED Vision 55” 4K» (una foto en la galería) y añadir una URL con «Agregar», las miniaturas y sus botones «Quitar foto N» quedan dentro del `fieldset`; añadir la misma URL otra vez muestra «Esa foto ya está en el producto.» dentro del `fieldset`. Sin guardar | AC-02, AC-04 | No | Igual |
| TEST-03 | E2E | En las mismas pruebas de TEST-01, para los seis productos del seed: el nombre, la línea del SKU, el precio, el stock, «Editar» y «Eliminar» se ven y caben en la caja de la lista; la lista no desplaza (`scrollWidth` de la `section` igual a su `clientWidth`); el SKU ocupa una sola línea (un solo rectángulo de su texto); el precio, el stock y las acciones no se solapan con el bloque del producto ni entre sí; la cabecera está oculta o cabe; la celda del stock dice «Stock N» y, en «Microondas EasyCook 30 L» (stock 0), el número tiene el color de `--ws-danger` (`colorDelToken`) | AC-03, AC-04 | No | Igual |
| TEST-04 | E2E | Con el `vendedor` y B, a 375 px: TEST-01 y TEST-03 sin «Eliminar» ni «Nuevo producto», y el texto «Elige un producto de la lista…» dentro del formulario | AC-01, AC-03 (caso límite del vendedor) | No | Igual |
| TEST-05 | E2E (caracterización del escritorio) | Con B, a 768 y 1440 px: la cabecera se ve con «Producto», «Precio» y «Stock»; en cada fila, el precio, el stock y las acciones están en la misma línea que el nombre (centros verticales a menos de 2 px); la celda del stock dice solo el número; la ayuda de «Miniatura optimizada» ocupa una línea. A 767 px, la cabecera está oculta y la celda dice «Stock N» (el punto de corte). En verde antes y después del cambio, salvo la comprobación de 767 px, que solo pasa después | AC-05 | No | Igual |
| TEST-06 | Lint y estructura | `templateAccessibility` de angular-eslint sobre la plantilla, y `validate:structure`: ningún color fijo fuera de `tokens.css` | AC-05, AC-06 | No | `npm run verify` (desde la raíz) |
| TEST-07 | Comparación de capturas | Antes y después con A, B y C: a 1440 px, iguales; a 375 px, solo cambian la lista y el formulario ([capturas](#capturas-antes-y-después)) | AC-05, AC-06 | No | Guion de Playwright en `frontend/output/visual-qa/007-desborde-de-productos-del-admin/`, con el BFF sobre `backend/data-capturas.json` |

Rojo esperado en la base (T1): TEST-01 falla con `scrollWidth` 376 a 360 y 375 px; TEST-02, porque el `fieldset` acaba en x = 375.6; TEST-03, porque el SKU ocupa varias líneas y la cabecera no cabe (también a 390 px); TEST-04, por la lista. TEST-05 pasa salvo la comprobación de 767 px. Un fallo por un localizador o por la configuración no cuenta como rojo.

### Pruebas existentes afectadas

| Prueba | Qué puede cambiar: aserciones o solo valores esperados | Cómo se conserva la cobertura |
|---|---|---|
| [`admin-acceso.spec.ts`](../../../../frontend/tests/e2e/admin-acceso.spec.ts) (entra a `/productos` sin sesión y recorre los módulos a 1440 px) | Ninguna | Se ejecuta igual |
| [`admin-modo-demo.spec.ts`](../../../../frontend/tests/e2e/admin-modo-demo.spec.ts) (la tuerca no tapa el menú ni el menú de usuario en `/productos`, a 1440 y 390 px) | Ninguna: el menú y la cabecera no cambian | Se ejecuta igual |
| El resto de e2e del Admin y de la tienda | Ninguna | E2E completo en T2 y T3 |

### Capturas antes y después

Con el mismo método, las mismas rutas, los mismos anchos y la misma sesión de `superadmin` en las dos tomas ([comparar capturas](../../../development/agent-execution.md#comparar-capturas)): Playwright con el Chrome instalado, `reducedMotion: 'reduce'`, página completa, BFF sobre `backend/data-capturas.json` sin modo demo y temas activados por la API en el orden A, B y C, dejando B al terminar. «Antes», sobre la punta de la rama antes de T2; «después», tras T2. Cada fila con A, B y C: 12 tomas por tema.

| Pantalla o ruta | Anchos | Cambio visual esperado |
|---|---|---|
| `/productos`, al entrar («Nuevo producto») | 1440 y 375 px | 1440: ninguno. 375: la lista en dos líneas por producto, sin cabecera y con «Stock»; el formulario dentro de su tarjeta, la galería con «Agregar» a la derecha del campo y la ayuda de «Miniatura optimizada» en dos líneas sin pisar la galería; la página ya no mide 376 px. La cabecera de la página y la tira de navegación, iguales |
| `/productos`, editando «OLED Vision 55” 4K» (una foto en la galería) | 1440 y 375 px | Igual que la fila anterior, con la miniatura dentro del `fieldset` |

Comparación: a 1440 px, píxel a píxel, iguales salvo ruido de rasterizado documentado. A 375 px, la franja de arriba hasta el inicio de la lista, píxel a píxel; el resto, revisado por Sebastián en ⚠ T3 frente a esta tabla. Cada diferencia lleva el AC que la pide.

### Ejecución prevista

En el worktree de la feature (`.worktrees/007-desborde-de-productos-del-admin`), con el checkout principal en `dev` antes de crearlo ([un worktree por feature](../../../development/agent-execution.md#un-worktree-por-feature)). Orden por dependencias. Ninguna tarea arranca antes del hito de arquitectura. Las ⚠ no se delegan ([reglas de escalado](../../../development/agent-execution.md#reglas-de-escalado)).

| Paso o tarea | Nivel y esfuerzo sugeridos | E2E | Criterios de aprobación (si es ⚠) |
|---|---|---|---|
| T0. Guion de capturas, capturas «antes» con A, B y C y e2e completo como línea base | estándar · medio | Sí | — |
| T1. `admin-productos-movil.spec.ts` (TEST-01 a TEST-05) y los dos nombres accesibles de la pregunta 3; ejecución sobre la base con el rojo y el verde esperados | estándar · alto | Sí | — |
| T2. ⚠ Corrección de la plantilla: galería, ayuda y fila de la lista en móvil | avanzado · alto | Sí | TEST-01 a TEST-05 en verde con A, B y C; e2e completo y `npm run verify` en verde. El diff solo añade clases `max-md:`, `md:hidden` y `min-w-0`, `subscriptSizing="dynamic"` y la etiqueta «Stock»: ninguna clase de hoy cambia ni se quita. Sin colores fijos ni estilos globales. Una captura a 375 px con B de cada estado, para ver la forma aprobada |
| T3. ⚠ Capturas «después» y comparación (TEST-07), e2e completo y `npm run verify` | avanzado · alto | Sí | Sebastián aprueba las capturas: a 1440 px iguales con A, B y C; a 375 px solo cambia lo de la [tabla](#capturas-antes-y-después). Sin errores de consola nuevos. `verify` y el e2e completo en verde |
| T4. Documentos afectados | estándar · bajo | No | — |

Bloques sugeridos para `sdd-implement` (cada uno termina antes de una ⚠):

1. Base: T0 y T1.
2. Corrección: ⚠ T2.
3. Cierre: ⚠ T3 y T4.

## Documentos afectados

- [`frontend/docs/VISUAL-SYSTEM.md`](../../../../frontend/docs/VISUAL-SYSTEM.md), en el apartado del Admin, junto a «Tablas con encabezado `subtle`…»: la lista de productos por debajo de 768 px (dos líneas por producto, sin cabecera, «Stock» como etiqueta) y la convención `max-md:` para cambiar solo el móvil.
- [`frontend/architecture.md`](../../../../frontend/architecture.md) §6: la spec `admin-productos-movil` en la fila de E2E.
- [Trazabilidad](../../../planning/TRACEABILITY.md): una fila de la feature 007 (REQ-01 a REQ-05; `ProductosPage`; TEST-01 a TEST-07).
- [Backlog](../../../planning/backlog.md): solo la fila de PBI-0045, al terminar la implementación.
- No cambian el contrato del BFF, `backend/architecture.md`, el glosario ni los ADR.

## Hito de arquitectura

Se pide aprobar:

- que solo cambia la plantilla de `ProductosPage`, sin cambios en el BFF, el contrato, los datos, los permisos, las dependencias entre features ni los estilos globales;
- la corrección de la galería y de la ayuda de «Miniatura optimizada», medidas en el [prototipo](#prototipo-medido);
- que no hace falta ningún ADR ni la etapa `sdd-decide`;
- la estrategia de pruebas, sin TDD obligatorio y con las e2e escritas antes del cambio;
- y estas tres preguntas, que se presentan de una en una.

### Pregunta 1. ¿Cómo se reorganiza cada producto de la lista por debajo de 768 px?

| Alternativa | Qué significa |
|---|---|
| **A. Dos líneas: el producto arriba, a todo el ancho; debajo, el precio, «Stock N» y las acciones a la derecha; sin cabecera (recomendada)** | Una sola plantilla con clases para el móvil: el bloque del producto ocupa la fila entera, y el precio, el stock y las acciones forman la segunda línea. La cabecera se oculta y el stock lleva la etiqueta «Stock», porque un número suelto no se entiende; el precio se entiende por su símbolo. Medido: fila de 117 px (hoy, 197 a 213), nombre y SKU en una línea, acciones a 17 px del borde |
| B. Como `/usuarios`: el precio y el stock pasan a la línea del SKU y las acciones quedan a la derecha del producto | Filas algo más bajas, pero el precio y el stock tienen que escribirse dos veces en la plantilla (una para el móvil y otra para el escritorio). El bloque del producto comparte la línea con «Editar» y «Eliminar» (unos 115 px a 375), así que su línea, ya larga («TV-OLED-55-VSN · 3 características · 2 fotos») y con el precio y el stock añadidos, se parte en varias líneas. Sin medir: estimado con los anchos del prototipo |
| C. Tarjeta apilada con etiquetas: «Precio», «Stock» y las acciones, cada uno en su línea | La lectura más explícita, pero cada producto pasa de dos líneas a cuatro o cinco, y la lista se alarga en proporción. Sin medir |

Evidencia: el [prototipo](#prototipo-medido) de A a 360, 375 y 390 px; [`usuarios.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/usuarios.page.ts) resuelve el móvil con `grid-cols-[minmax(0,1fr)_auto]` porque oculta el rol, algo que AC-03 no permite con el precio y el stock.

### Pregunta 2. ¿Cómo se escriben las clases de la lista para que el escritorio no cambie?

| Alternativa | Qué significa |
|---|---|
| **A. Añadir clases `max-md:` a las de hoy (recomendada)** | Las clases de escritorio se quedan como están (`grid-cols-[1fr_120px_110px_90px]` y el resto), y las del móvil se añaden con `max-md:`, que solo vale por debajo de 768 px. El diff demuestra por sí solo que el escritorio no cambia. Es el primer uso de `max-md:` en el proyecto: se documenta en el sistema visual |
| B. Móvil primero: las clases base pasan a ser las del móvil y las de escritorio llevan `md:` | La convención más habitual de Tailwind y la del resto del proyecto, pero reescribe las clases de escritorio de la cabecera y de cada celda: el escritorio solo se demuestra igual con las capturas y TEST-05 |

Evidencia: el proyecto usa Tailwind 4 ([`package.json`](../../../../frontend/package.json)), que incluye las variantes `max-*`; hoy no hay ninguna en el código. `md:hidden` solo se usa en el layout de la tienda ([`app.layout.ts`](../../../../frontend/src/app/layout/app.layout.ts)); en el Admin, ninguna de las dos.

### Pregunta 3. ¿Cómo localizan las e2e la lista y el formulario?

| Alternativa | Qué significa |
|---|---|
| **A. Dar nombre accesible a la lista y al formulario (recomendada)** | `aria-label="Lista de productos"` en la `section`, como «Lista de pedidos» de `/pedidos` y «Usuarios administrativos» de `/usuarios`, y `aria-labelledby` del formulario a su título. Las e2e los localizan por rol y nombre (`region` y `form`), como pide §6 de `frontend/architecture.md`, y un lector de pantalla los anuncia. Sin cambio visual. Es lo único de la feature que no es maquetación |
| B. Localizar por la estructura, sin tocar la plantilla | Por la etiqueta (`section`, `form`) o por su posición en la página. Frágil: una página con dos `section` o dos `form` rompe las e2e sin cambiar nada visible, y §6 pide roles y textos visibles |
| C. Atributos `data-testid` | Sin precedente en el proyecto, y solo sirven a las pruebas |

Evidencia: §6 de [`frontend/architecture.md`](../../../../frontend/architecture.md#6-pruebas) («Las aserciones usan roles y textos visibles, no clases CSS»); [`pedidos.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/pedidos.page.ts) y [`usuarios.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/usuarios.page.ts) ya nombran su lista; `productos.page.ts` no nombra ni la lista ni el formulario.

### Respuestas del hito

Las preguntas se presentaron de una en una, cada una con sus alternativas, la recomendación y la evidencia: las medidas del [prototipo](#prototipo-medido) y dos capturas a 375 px con B, la de hoy y la del prototipo de la alternativa A de la pregunta 1. Sebastián Avila las respondió el 2026-11-14 en la sesión de esta etapa.

| Pregunta | Decisión | Alternativas descartadas | Ajustes pedidos y dónde quedan |
|---|---|---|---|
| 1. Fila de la lista por debajo de 768 px | **A. Dos líneas**: el producto arriba, a todo el ancho; debajo, el precio, «Stock N» y las acciones a la derecha; sin cabecera. Elegida por Sebastián Avila el 2026-11-14 («A. Dos líneas (Recomendado)») | B. Como `/usuarios` (el precio y el stock, escritos dos veces en la plantilla, y la línea del SKU partida en varias líneas); C. tarjeta apilada con etiquetas (cada producto, de dos líneas a cuatro o cinco) | Ninguno |
| 2. Clases de la lista | **A. Añadir clases `max-md:` a las de hoy**, sin cambiar las de escritorio; la convención se documenta en el sistema visual. Elegida por Sebastián Avila el 2026-11-14 («A. Añadir max-md: (Recomendado)») | B. Móvil primero con `md:` (reescribe las clases de escritorio, y que el escritorio no cambia solo lo demuestran las capturas y TEST-05) | Ninguno |
| 3. Localizadores de las e2e | **A. Nombre accesible**: `aria-label="Lista de productos"` en la `section` y `aria-labelledby="titulo-formulario-producto"` en el formulario. Elegida por Sebastián Avila el 2026-11-14 («A. Nombre accesible (Recomendado)») | B. Por la estructura (frágil y contra §6 de `frontend/architecture.md`); C. `data-testid` (sin precedente, solo para las pruebas) | Ninguno |

Después de las tres preguntas, Sebastián Avila aprobó el resto del plan el 2026-11-14 («Aprobar el plan (Recomendado)»), presentado en una pregunta aparte con sus cuatro puntos: solo cambia la plantilla de `ProductosPage`; la corrección de la galería y `subscriptSizing="dynamic"` en «Miniatura optimizada»; ningún ADR, así que la etapa `sdd-decide` no tiene nada que registrar y la siguiente es `sdd-tasks`; y la estrategia de pruebas, sin TDD obligatorio, con las e2e escritas antes del cambio y capturas con A, B y C a 1440 y 375 px. Con eso, el hito queda cerrado.
