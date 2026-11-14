# 007. Desborde de productos del Admin — Especificación

- Feature: `007-desborde-de-productos-del-admin`
- Historia de usuario: ninguna. Sale de [PBI-0045](../../../planning/backlog.md) (desborde horizontal de `/productos` del Admin a 375 px, en los tres temas), detectado en la verificación de la feature [003](../003-ajustes-del-admin/verification.md#riesgos-remanentes-y-excepciones). Sebastián Avila lo eligió el 2026-11-14 como piloto del flujo de [un solo pull request por feature](../../../adrs/0015-entregar-cada-feature-en-un-solo-pull-request.md): un solo módulo, el de productos, como pidió Daniel Avila el 2026-11-13.
- Estado: aprobada
- Fecha: 2026-11-14
- Hito de alcance: aprobado por Sebastián Avila el 2026-11-14, con las tres [decisiones del hito](#decisiones-del-hito-de-alcance)

## Problema y actores

A 375 px de ancho, la página `/productos` del Admin no cabe en la pantalla. Hay dos defectos distintos en la misma página, y ninguno depende del tema: las medidas son idénticas con A, B y C ([medidas](#medidas-de-la-base)).

1. **La página desborda.** El documento mide 376 px a 375 px de ancho (1 px de desplazamiento horizontal) y 376 px a 360 px (16 px). Lo provoca el bloque «Galería de fotos» del formulario «Nuevo producto»:
   - Es un `fieldset`, y un `fieldset` tiene por defecto `min-inline-size: min-content`: no se estrecha por debajo de su contenido.
   - Su contenido más ancho es la fila del campo «URL de foto» y el botón «Agregar»: 212 px del campo (el `mat-form-field` reserva 180 px para el texto, más 32 de relleno), 8 de separación y 80.6 del botón, más 16 + 16 de relleno y el borde del `fieldset`. En total, 334.6 px.
   - La columna del formulario solo tiene 293 px (343 px de la tarjeta menos 24 + 24 de relleno). La rejilla del formulario (`grid gap-3`, una sola columna `1fr`) crece hasta 334.6 px, y todos sus campos con ella: el `fieldset` y los campos acaban en x = 375.6 px, fuera de la tarjeta y de la pantalla.
   - Por eso la página nunca baja de 376 px de ancho: a 390 px ya no desborda.
2. **La lista de productos no se lee.** La tarjeta de la lista (`section.admin-card overflow-hidden`) recorta lo que no cabe, así que no desplaza la página, pero su contenido es más ancho que ella:
   - Cada fila es una rejilla `grid-cols-[1fr_120px_110px_90px]` con 16 + 16 px de relleno: las tres columnas fijas ya suman 320 px, y a 375 px la fila mide 341 px.
   - La columna «Producto» se queda en **0 px** en las filas (4 px a 390 px). El nombre (`truncate`) no se ve, y el SKU y el resumen se parten letra a letra y se montan sobre el precio («TV-OLED-55-VSN» en cuatro líneas, en la captura de la base).
   - En la cabecera, la columna «Producto» no baja de 58.6 px (el ancho de la palabra), así que la cabecera mide 395 px: «PRODUCTOPRECIO» sale junto y la cabecera de la columna de acciones acaba en x = 411.6 px, recortada.
   - «Eliminar» acaba en x = 353 px, a 6 px del borde de la tarjeta.

En escritorio no hay defecto: de 768 a 1440 px la página no desborda.

Actores: el `superadmin`, el `admin` y el `vendedor`, que gestionan productos desde un teléfono. El vendedor también entra en `/productos` (`products.edit`), sin «Nuevo producto» ni «Eliminar», que piden `products.manage`. Aplicación afectada: solo el Admin. El BFF y la tienda no cambian.

## Alcance

**Incluye:**

- Que `/productos` del Admin no desborde en horizontal a 375 px (PBI-0045), con A, B y C.
- El formulario «Nuevo producto» / «Editar producto» dentro de su tarjeta, con la galería de fotos incluida.
- La lista de productos legible a 375 px.
- Capturas antes y después con A, B y C, a 1440 y 375 px como mínimo (STD-12).

**Excluye:**

- El desborde de `/clientes` del Admin (16 px a 375 px) y el recorte de la columna de estado de `/inventario`, medidos al reproducir este defecto: van a [PBI-0059](../../../planning/backlog.md). El piloto se limita a un solo módulo.
- Otros cambios de la página `/productos` (campos, textos, permisos o comportamiento del formulario).
- El menú lateral y la tira de navegación móvil del Admin, que desplazan en horizontal a propósito (`overflow-x-auto`, feature [003](../003-ajustes-del-admin/specification.md), AC-13).
- Los permisos del vendedor sobre los productos, abiertos en la feature [006](../006-permisos-de-los-roles/specification.md).

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | La página `/productos` del Admin no tiene desplazamiento horizontal a 375 px (`scrollWidth` igual a `clientWidth`), con A, B y C | PBI-0045; STD-12 («sin desborde horizontal») | Alta |
| REQ-02 | El formulario de producto, incluida la galería de fotos, cabe en su tarjeta y se puede usar a 375 px: ningún campo ni botón sale de la tarjeta | PBI-0045 (la causa del desborde) | Alta |
| REQ-03 | A 375 px, cada producto de la lista muestra su nombre, su SKU, su precio, su stock y las acciones «Editar» y «Eliminar» sin desplazar en horizontal, sin texto partido letra a letra, sin solaparse y sin quedar recortados | PBI-0045 (la lista desborda su tarjeta); [D1 y D3](#decisiones-del-hito-de-alcance) | Alta |
| REQ-04 | REQ-01 a REQ-03 se cumplen también en los otros anchos de referencia móviles (360 y 390 px) | [Validación](../../../../frontend/docs/VALIDATION.md#responsive-y-revisión-visual) (anchos de referencia); [D2](#decisiones-del-hito-de-alcance) | Media |
| REQ-05 | A 768 px o más, `/productos` se ve igual que antes de la feature, con A, B y C | STD-12 | Alta |

## Criterios de aceptación

### AC-01 — Sin desplazamiento horizontal a 375 px

- Cubre: REQ-01, REQ-02
- Origen: PBI-0045

**Dado** el Admin a 375 × 812 px, con una sesión de `superadmin` y el tema A, B o C activo
**Cuando** se abre `/productos`
**Entonces** `document.documentElement.scrollWidth` es 375 (hoy, 376), y ningún elemento de la página fuera de la tira de navegación móvil acaba a la derecha de x = 375.

### AC-02 — Formulario dentro de su tarjeta

- Cubre: REQ-02
- Origen: PBI-0045

**Dado** el Admin a 375 px, con A, B o C
**Cuando** se mira el formulario «Nuevo producto», y el de «Editar producto» de un producto con fotos en la galería
**Entonces** todos los campos, el bloque «Galería de fotos», el campo «URL de foto», el botón «Agregar», «Cargar foto» y «Guardar producto» quedan dentro de la tarjeta del formulario (hoy, el bloque y los campos acaban en x = 375.6, fuera de la tarjeta, que acaba en x = 359), y se puede escribir una URL y pulsar «Agregar».

### AC-03 — Lista legible a 375 px

- Cubre: REQ-03
- Origen: propuesto y aprobado en el hito de alcance ([D1 y D3](#decisiones-del-hito-de-alcance))

**Dado** el Admin a 375 px, con A, B o C y los seis productos del seed
**Cuando** se mira la lista de productos
**Entonces** de cada producto se leen el nombre, el SKU, el precio y el stock sin desplazar en horizontal, ni la página ni la tarjeta de la lista, y sin partirse letra a letra ni solaparse (hoy la columna «Producto» mide 0 px); los botones «Editar» y «Eliminar» se ven completos y se pueden pulsar, y las cabeceras de la lista, si se muestran, no salen recortadas.

### AC-04 — Anchos móviles de referencia

- Cubre: REQ-04
- Origen: propuesto y aprobado en el hito de alcance ([D2](#decisiones-del-hito-de-alcance))

**Dado** el Admin a 360 y a 390 px, con A, B o C
**Cuando** se abre `/productos`
**Entonces** se cumplen AC-01 (con ese ancho: hoy desborda 16 px a 360), AC-02 y AC-03.

### AC-05 — Escritorio sin cambios

- Cubre: REQ-05
- Origen: STD-12

**Dado** las capturas antes y después de `/productos` a 1440 px con A, B y C
**Cuando** se comparan
**Entonces** son iguales.

### AC-06 — Solo cambia lo pedido en móvil

- Cubre: REQ-01 a REQ-03
- Origen: STD-12

**Dado** las capturas antes y después de `/productos` a 375 px con A, B y C
**Cuando** se comparan
**Entonces** solo cambian el formulario y la lista de productos, como piden AC-01 a AC-03; la cabecera de la página, la tira de navegación y el resto quedan iguales.

## Datos y contrato

Sin cambios. La feature no toca el [contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md), el estado que guarda el BFF ni los permisos: `/productos` sigue igual para `superadmin`, `admin` y `vendedor`.

| Campo u operación | Regla | Roles | Origen |
|---|---|---|---|
| — | Sin cambios | — | — |

## Interfaz

Cambio visual pedido, solo por debajo de 768 px y solo en `/productos` del Admin: el defecto es de maquetación y no se puede corregir sin cambiar cómo se ve la página en móvil. El diseño de referencia es el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md), sin tokens ni colores nuevos. En escritorio, el diseño se conserva ([STD-12](../../../architecture/standards.md)).

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| `/productos` del Admin, formulario de producto, por debajo de 768 px | El formulario y la galería de fotos caben en su tarjeta | Sí (PBI-0045) |
| `/productos` del Admin, lista de productos, por debajo de 768 px | Cada producto se lee completo, con sus acciones visibles | Sí (PBI-0045) |
| `/productos` del Admin, a 768 px o más | Ninguno | No |
| Resto del Admin y la tienda | Ninguno | No |

## Integraciones

Ninguna.

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| Nombre largo de producto (los del seed llegan a 182 px, «Refrigeradora FreshMax 420 L») | Se lee, recortado con puntos suspensivos o en varias líneas, sin empujar el precio ni las acciones fuera de la tarjeta | REQ-03, AC-03 |
| SKU largo sin espacios (`TV-OLED-55-VSN`) | No se parte letra a letra | REQ-03, AC-03 |
| Producto sin stock | El stock se sigue viendo en rojo (`text-danger`), como hoy | REQ-03, AC-03 |
| Producto con fotos en la galería, a 375 px | La rejilla de miniaturas y sus botones «Quitar foto» quedan dentro del `fieldset` | REQ-02, AC-02 |
| Mensaje de error de una foto (`photoError`) | Se lee dentro de la tarjeta | REQ-02, AC-02 |
| Sesión del `vendedor` (sin «Nuevo producto» ni «Eliminar», que piden `products.manage`) | La lista y el formulario cumplen lo mismo; la acción que no se muestra no rompe la fila | REQ-03, AC-03 |
| Un tema propio | Igual que A, B y C: el defecto no depende de los colores | REQ-01 |

## Medidas de la base

Tomadas el 2026-11-14 sobre `e8bade0` (`dev`), en la rama `feature/007-desborde-de-productos-del-admin` antes de cualquier cambio de código:

- **Método.** Playwright con el Chrome instalado (`channel: 'chrome'`), viewport exacto, `reducedMotion: 'reduce'`, sesión de `superadmin`. BFF en 3000 sobre una copia nueva del seed (`WEBSTORE_DATA_FILE`, fuera del repositorio), sin modo demo; Admin en 4300 con `ng serve`. Los temas se activaron por la API del Admin (`PUT /bff/admin/active-theme`), en el orden A, B y C, y al terminar se dejó B. Medidas con `getBoundingClientRect` y `scrollWidth` en la página.
- **Resultado.** Idéntico con A, B y C en todos los anchos.

| Ancho | `scrollWidth` | Desborde de la página | Columna «Producto» de las filas | Cabecera de la lista (`scrollWidth` / ancho) |
|---|---|---|---|---|
| 360 | 376 | 16 px | 0 px | 395 / 326 |
| 375 | 376 | 1 px | 0 px | 395 / 341 |
| 390 | 390 | 0 | 4 px | 395 / 356 |
| 768, 1024, 1280 y 1440 | igual al ancho | 0 | sin recorte | sin recorte |

A 375 px, el formulario mide 16–359 px (343 px) y su rejilla interior, 41–334 px (293 px), pero la columna de esa rejilla vale 334.6 px y el `fieldset` «Galería de fotos» ocupa 41–375.6 px. La fila «URL de foto» + «Agregar» ocupa 58–358.6 px: campo de 212 px (texto de 180 px) y botón de 80.6 px.

Capturas de la base, fuera del repositorio: `b-productos-375-viewport.png` muestra la columna «Producto» en 0 px y el SKU partido sobre el precio. Se repetirán con el método que fije el plan, para comparar antes y después.

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio o con las medidas):

- El desborde existe desde la base `f8278e9` y no cambió con las features 003, 004 y 005 ([verificación de la 003](../003-ajustes-del-admin/verification.md#riesgos-remanentes-y-excepciones); [verificación de la 005](../005-contraste-de-controles-con-los-temas/verification.md), «Las capturas `admin-productos-375` salen iguales en la base y en la punta»).
- No depende del tema: las medidas son idénticas con A, B y C.
- La plantilla de la página está en `frontend/projects/admin/src/app/features/tienda/presentation/productos.page.ts`: la lista, en la `section.admin-card overflow-hidden` con filas `grid-cols-[1fr_120px_110px_90px]`; el formulario, en `form.admin-card p-6` con `grid gap-3`, y la galería, en un `fieldset` con la fila `flex gap-2` del campo «URL de foto» y el botón «Agregar».
- El Admin ya resuelve listas en móvil de dos formas: `/pedidos` desplaza la tabla dentro de su tarjeta (`overflow-x-auto` y `min-w-[640px]`), y `/usuarios` oculta una columna por debajo de `sm` y deja dos.
- Las e2e del Admin ya comprueban «sin desborde» con `scrollWidth > clientWidth` en el Resumen, el menú lateral y el menú de usuario, no en `/productos`.

**Supuestos** (se asumen hasta que se confirmen):

- La corrección es solo de maquetación (plantilla y clases de Tailwind de la página), sin componentes, tokens ni estilos globales nuevos. Lo confirma o lo corrige el plan.
- El seed basta como datos: seis productos con nombres de hasta 182 px y SKU con guiones.

**Decisiones pendientes:**

- Ninguna de [`PENDING-DECISIONS.md`](../../../planning/PENDING-DECISIONS.md) afecta a esta feature. Los permisos del vendedor (feature 006) no cambian lo que ve la página.

## Preguntas abiertas

Ninguna. Las tres del hito de alcance están respondidas en [decisiones del hito](#decisiones-del-hito-de-alcance). Son preguntas técnicas y de maquetación de un defecto, sin reglas de negocio, así que las responde la persona que aprueba el hito ([hitos humanos](../../../architecture/development-workflow.md#hitos-humanos)).

## Decisiones del hito de alcance

Sebastián Avila respondió el 2026-11-14 las tres preguntas, presentadas de una en una con sus alternativas, la recomendación y las medidas de la base, y aprobó el alcance. En las tres eligió la alternativa recomendada.

| ID | Pregunta | Alternativas | Decisión | Efecto en la especificación |
|---|---|---|---|---|
| D1 | ¿Qué se corrige: el desborde de la página (el formulario) o también la lista, que no desplaza la página pero no se lee? | Formulario y lista; solo el formulario (la lista, a un PBI aparte); también `/clientes` e `/inventario` (fuera del piloto de un solo módulo) | **Formulario y lista** | REQ-02 y REQ-03; `/clientes` e `/inventario` siguen en [PBI-0059](../../../planning/backlog.md) |
| D2 | ¿En qué anchos móviles se exige? | 360, 375 y 390 px (los de referencia); solo 375 px (lo literal de PBI-0045); hasta 320 px (reflow de WCAG 1.4.10, que ninguna fuente pide) | **360, 375 y 390 px** | REQ-04 y AC-04, aprobados |
| D3 | ¿La lista puede desplazarse en horizontal dentro de su tarjeta, como `/pedidos`, o cada producto se lee sin desplazar? | Leer sin desplazar (la fila se reorganiza en móvil); desplazar en la tarjeta (cambio mínimo, pero «Eliminar» queda fuera de la vista) | **Leer sin desplazar** | REQ-03 y AC-03, aprobados: ni la página ni la tarjeta de la lista se desplazan. Cómo se reorganiza la fila lo fija el plan |

## Referencias

- [PBI-0045 en el backlog](../../../planning/backlog.md)
- [Verificación de la feature 003](../003-ajustes-del-admin/verification.md#riesgos-remanentes-y-excepciones)
- [Implantación con un piloto](../../../adrs/0015-entregar-cada-feature-en-un-solo-pull-request.md)
- [Estándares](../../../architecture/standards.md) (STD-11 y STD-12)
- [Validación: anchos de referencia](../../../../frontend/docs/VALIDATION.md#responsive-y-revisión-visual)
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md)
- [Trazabilidad](../../../planning/TRACEABILITY.md)
