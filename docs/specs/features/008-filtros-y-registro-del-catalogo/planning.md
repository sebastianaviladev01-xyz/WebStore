# 008. Filtros y registro del catálogo del Admin — Plan

- Feature: `008-filtros-y-registro-del-catalogo`
- Especificación: [specification.md](specification.md) (aprobada el 2026-11-14; 11 REQ, 15 AC, decisiones D1 a D7, D1 a D4 provisionales)
- Estado: aprobado
- Fecha: 2026-11-14
- Hito de arquitectura: aprobado por Sebastián Avila el 2026-11-14 en la sesión de esta etapa. Respondió las [cuatro preguntas](#hito-de-arquitectura) con la alternativa A, sin ajustes, y aprobó el resto del plan ([respuestas](#respuestas-del-hito))

## Enfoque

Solo cambia el Admin, en la feature `tienda`. No cambian el BFF, su contrato, los datos, los permisos, los tokens ni los estilos globales.

1. **«Buscar» recarga el snapshot y filtra en el Admin (supuesto S1).** El Admin ya tiene en memoria todo el catálogo que le entrega `GET /admin/snapshot`. «Buscar» llama a un método nuevo, `TiendaFacade.refresh()`, que vuelve a pedir el snapshot y reemplaza el estado si el BFF responde; después, la página aplica los filtros y la paginación con reglas puras de `domain/`. Si la consulta falla, `refresh()` conserva el estado y devuelve `false`, sin tocar el aviso global de la cabecera, para que la página avise junto al panel y conserve los resultados anteriores ([caso límite](specification.md#casos-límite-y-fallos)). No hacen falta rutas nuevas del BFF ni un ADR: es la arquitectura vigente, en la que el Admin lee el snapshot completo, filtrado por rol ([contrato](../../../../backend/docs/BFF-CONTRACT.md); glosario, «Snapshot de la tienda»). Alternativas, en la [pregunta 1](#pregunta-1-cómo-trae-buscar-los-datos-actuales-s1).
2. **La edición también trae los datos actuales al abrirse.** La interfaz de registro en modo edición llama a `refresh()` antes de rellenar el formulario. Así muestra los datos vigentes (AC-07) y detecta que otra persona eliminó el registro ([caso límite](specification.md#casos-límite-y-fallos)). Si la consulta falla, usa los datos en memoria y lo avisa.
3. **Interfaces de registro con ruta propia (supuesto S2).** `/productos/nuevo` y `/productos/:id`, `/categorias/nueva` y `/categorias/:id`, `/marcas/nueva` y `/marcas/:id`: rutas hermanas de los listados en [`app.routes.ts`](../../../../frontend/projects/admin/src/app/app.routes.ts), cada una con su `permisoGuard`. El formulario de hoy se mueve, sin cambiar sus campos ni sus reglas, a una página propia por concepto ([pregunta 2](#pregunta-2-qué-rutas-tienen-las-interfaces-de-registro-s2-y-ac-11)).
4. **Filtros y página en la URL (D5 y D7).** La última búsqueda vive en los parámetros de consulta del listado (`/productos?nombre=cooler&pagina=2`). «Nuevo» y «Editar» los llevan a la interfaz de registro, y la interfaz los devuelve al volver, al guardar o al cancelar. No se guarda nada en el navegador (STD-08) ([pregunta 3](#pregunta-3-cómo-se-conservan-los-filtros-y-la-página-al-volver-del-registro-d5-y-d7)).
5. **Piezas compartidas.** Reglas genéricas nuevas (`textoBuscable`, `contieneTexto`, `paginar`) en `listado.rules.ts`, con el mismo criterio que Tarifas de envío, y dos componentes de presentación, `PanelFiltrosComponent` y `PaginacionComponent`, para que las tres páginas tengan la misma disposición (AC-10). Tarifas de envío no se toca: se pasa a estas piezas con PBI-0139 ([pregunta 4](#pregunta-4-cómo-se-reutilizan-la-paginación-y-la-búsqueda-de-tarifas-de-envío)).

Descartado en la especificación: diálogos en lugar de páginas (S2), ordenar por columna, filtros de los demás listados (PBI-0139) y quitar «Actualizar» (PBI-0140).

## Responsabilidades por capa

| Capa | Elemento | Responsabilidad | REQ |
|---|---|---|---|
| Frontend: `domain/` | `listado.rules.ts` (nuevo) | `textoBuscable()`, `contieneTexto()`, `paginar()`, `ELEMENTOS_POR_PAGINA` y el tipo `Pagina<T>`: comparación de texto de D7 y páginas de 25 | REQ-02, REQ-10 |
| Frontend: `domain/` | `filtro-catalogo.model.ts` (nuevo) | Tipos de los filtros de las tres páginas ([tipos](#tipos-intermedios-y-nombres)) | REQ-03 |
| Frontend: `domain/` | `filtro-catalogo.rules.ts` (nuevo) | `filtrarProductos()`, `filtrarCategorias()`, `filtrarMarcas()`; leer los filtros y la página de los parámetros de la URL y escribirlos (`leerFiltros*()`, `parametrosDeFiltros*()`, `leerPagina()`); `FILTROS_*_VACIOS` | REQ-02, REQ-03, REQ-11 |
| Frontend: `domain/` | `categoria.rules.ts` (sin cambios) | `aplanarArbolCategorias()` e `idsDescendientes()`, que el filtro reutiliza; hoy sin prueba: se caracterizan antes (TEST-07) | REQ-03 |
| Frontend: `application/` | `TiendaFacade` | Método nuevo `refresh(): Promise<boolean>`: vuelve a pedir el snapshot; si responde, reemplaza el estado y devuelve `true`; si falla, conserva el estado, no toca `error` ni `loading` y devuelve `false`. `load()` y las mutaciones no cambian | REQ-02, REQ-07 |
| Frontend: `data/` | `BffTiendaGateway` | Sin cambios | — |
| Frontend: `presentation/` | `PanelFiltrosComponent` (nuevo, `panel-filtros.component.ts`, `ws-filter-panel`) | Contenedor del panel: `form` con `role="search"` y nombre accesible, los campos proyectados, «Buscar» (envío del formulario, también con Intro) y «Limpiar filtros», el estado «Buscando…» y el error de la búsqueda junto al panel. Entradas `etiqueta`, `buscando`, `error`; salidas `buscar` y `limpiar` | REQ-01, REQ-06, REQ-11 |
| Frontend: `presentation/` | `PaginacionComponent` (nuevo, `paginacion.component.ts`, `ws-pagination`) | La barra de Tarifas de envío («Anterior», «Página N de M», «Siguiente»), solo si hay más de una página. Entradas `pagina` (`Pagina<unknown>`) y `etiqueta`; salida `cambiar` | REQ-10 |
| Frontend: `presentation/` | `ProductosPage` | Solo el listado: título y «Nuevo producto» (con `products.manage`), panel con los cinco filtros, la lista a todo el ancho y la paginación. «Editar» y «Nuevo producto» son enlaces a las rutas de registro que conservan los parámetros. «Eliminar» sigue igual. Sin formulario | REQ-01 a REQ-03, REQ-05, REQ-08, REQ-10, REQ-11 |
| Frontend: `presentation/` | `RegistroProductoPage` (nuevo, `registro-producto.page.ts`, `ws-product-form-page`) | El formulario de hoy, movido sin cambiar campos, validaciones, galería ni reglas del vendedor. Título «Nuevo producto» o «Editar producto», «Volver a productos» y «Cancelar». Al guardar vuelve al listado con sus parámetros; si falla, se queda con lo escrito y muestra el error junto al botón | REQ-04, REQ-07, REQ-08 |
| Frontend: `presentation/` | `CategoriasPage` | Solo el listado: título y «Nueva categoría», panel con «Nombre» y «Categoría padre», la lista en orden de árbol y la paginación | REQ-03, REQ-05, REQ-06, REQ-10, REQ-11 |
| Frontend: `presentation/` | `RegistroCategoriaPage` (nuevo, `registro-categoria.page.ts`, `ws-category-form-page`) | El formulario de hoy, con la exclusión de sí misma y de sus subcategorías y el aviso de ciclo | REQ-07, REQ-08 |
| Frontend: `presentation/` | `MarcasPage` | Solo el listado: título y «Nueva marca», panel con «Nombre» y «Estado», la lista y la paginación | REQ-03, REQ-05, REQ-06, REQ-10, REQ-11 |
| Frontend: `presentation/` | `RegistroMarcaPage` (nuevo, `registro-marca.page.ts`, `ws-brand-form-page`) | El formulario de hoy, con el título «Nueva marca» o «Editar marca» | REQ-07, REQ-08 |
| Frontend: rutas | [`app.routes.ts`](../../../../frontend/projects/admin/src/app/app.routes.ts) | Seis rutas nuevas ([tabla](#rutas-nuevas)) | REQ-04, REQ-07, REQ-08 |
| BFF | — | Sin cambios: ni contrato, ni estado, ni permisos | — |

### Rutas nuevas

Hermanas de su listado dentro de los hijos del layout, con `canMatch` y `loadComponent` como las demás. La de «nuevo» va antes que la de `:id`. Con `withComponentInputBinding()` (ya activo en [`app.config.ts`](../../../../frontend/projects/admin/src/app/app.config.ts)), el `:id` llega como `input` de la página. El enlace «Productos» del menú sigue marcado en las rutas de registro: el layout compara con `paths: 'subset'`.

| Ruta | Guard | Página | Título |
|---|---|---|---|
| `productos/nuevo` | `permisoGuard('products.manage')` | `RegistroProductoPage` | `WebStore Admin | Nuevo producto` |
| `productos/:id` | `permisoGuard('products.edit')` | `RegistroProductoPage` | `WebStore Admin | Editar producto` |
| `categorias/nueva` | `permisoGuard('categories.manage')` | `RegistroCategoriaPage` | `WebStore Admin | Nueva categoría` |
| `categorias/:id` | `permisoGuard('categories.manage')` | `RegistroCategoriaPage` | `WebStore Admin | Editar categoría` |
| `marcas/nueva` | `permisoGuard('brands.manage')` | `RegistroMarcaPage` | `WebStore Admin | Nueva marca` |
| `marcas/:id` | `permisoGuard('brands.manage')` | `RegistroMarcaPage` | `WebStore Admin | Editar marca` |

**El vendedor en `/productos/nuevo` (AC-11).** `permisoGuard` devuelve un `UrlTree` a `/` cuando falta el permiso, y un `UrlTree` en `canMatch` redirige: el router no prueba la ruta siguiente, así que `nuevo` nunca llega a `productos/:id` como identificador. El vendedor acaba en el Resumen, como en cualquier módulo sin permiso. La página además conserva la comprobación de hoy al guardar (`!this.session.can('products.manage') && !this.editingId()`), y el BFF rechaza la creación (`403 CATALOG_SCOPE_VIOLATION`).

### Flujo de cada listado

1. Al entrar, el listado lee los filtros aplicados y la página de los parámetros de la URL (`leerFiltros*()`, `leerPagina()`), y filtra y pagina el snapshot en memoria. No recarga: cómo carga sus datos cada pantalla queda en PBI-0140.
2. El panel edita un **borrador** (un `FormGroup` con los mismos campos), que se iguala a los filtros aplicados cada vez que cambian los parámetros (también con atrás y adelante del navegador).
3. «Buscar»: `buscando = true`; `await admin.refresh()`. Si responde, navega al mismo listado con `parametrosDeFiltros*(borrador)` y sin `pagina` (vuelve a la 1). Si falla, muestra el error en el panel y no cambia ni los filtros aplicados ni los resultados.
4. «Limpiar filtros» vacía el borrador de una vez y no busca (AC-14: «se pulsa Limpiar filtros y después Buscar»).
5. La paginación navega con `pagina` y `queryParamsHandling: 'merge'`. Si la página pedida ya no existe (por ejemplo, tras eliminar el último registro de la última página), `paginar()` muestra la última que existe.
6. Sin resultados: si la colección está vacía, «Todavía no hay productos» (categorías, marcas); si no, «Ningún producto cumple los filtros», con el panel disponible (AC-04).

### Flujo de cada interfaz de registro

1. «Nuevo…» y «Editar» son `routerLink` con `queryParamsHandling: 'preserve'`. «Volver a …», «Cancelar» y el guardado correcto navegan al listado con `queryParamsHandling: 'preserve'`.
2. En modo edición, mientras `refresh()` responde, la página muestra «Cargando…» en lugar del formulario. Con la respuesta, busca el registro por `id`: si no existe, muestra «Este producto ya no existe» (o categoría, marca) y «Volver a productos»; si existe, rellena el formulario. Si `refresh()` falla, rellena con los datos en memoria y avisa de que pueden no ser los últimos.
3. Al guardar, si `upsert*()` devuelve `false`, la página se queda con lo escrito y muestra `admin.error()` junto al botón. El aviso de la cabecera del layout sigue apareciendo como hoy (el layout no cambia, AC-13).
4. La interfaz de registro de producto conserva el nombre accesible del formulario (`aria-labelledby` al título, `titulo-formulario-producto`), que usan las e2e de la feature 007.

### Dependencias entre features

Ninguna. Todo queda dentro de la feature `tienda` del Admin; `RegistroProductoPage` usa `SesionFacade` como hoy `ProductosPage`. No cambia [`sheriff.config.ts`](../../../../frontend/sheriff.config.ts).

## Contrato del BFF afectado

Ninguno. «Buscar» y la edición usan `GET /admin/snapshot` y el guardado `PUT /admin/snapshot`, como hoy ([contrato](../../../../backend/docs/BFF-CONTRACT.md)). El vendedor recibe productos, categorías y marcas en el snapshot ([`admin.views.mjs`](../../../../backend/src/application/admin/admin.views.mjs)), así que sus filtros de categoría y marca tienen opciones.

## Estado del BFF

Sin cambios. Sin migración.

## Tipos intermedios y nombres

Los nombres que las tareas no deben repensar. Los identificadores nuevos van en español, salvo los métodos de la facade (`refresh`, como `load`) y los selectores `ws-*`, que siguen la convención vigente ([`frontend/architecture.md` §4](../../../../frontend/architecture.md#4-componentes-y-convenciones)).

| Tipo o nombre | Definición | Tareas que lo usan |
|---|---|---|
| `Pagina<T>` | `{ items: readonly T[]; page: number; pages: number; from: number; to: number; total: number }`, los mismos campos que `PaginaTarifas`, para que Tarifas pueda adoptarla con PBI-0139 | Dominio, `PaginacionComponent`, las tres páginas |
| `paginar<T>(items, pagina, tamano): Pagina<T>` | Mismo algoritmo que `paginarTarifas`: mínimo 1 página; la página pedida se ajusta a `1..pages` | Dominio, las tres páginas |
| `ELEMENTOS_POR_PAGINA` | `25` (D2) | Las tres páginas |
| `textoBuscable(valor)` | `valor.normalize('NFD')` sin marcas diacríticas, `toLocaleLowerCase('es-PE')`, `trim()`: el `searchable` de Tarifas | `contieneTexto` |
| `contieneTexto(valor, filtro)` | `true` si `textoBuscable(filtro)` está vacío o si `textoBuscable(valor)` lo contiene | Las tres reglas de filtro |
| `EstadoFiltro` | `'todos' \| 'activos' \| 'inactivos'` | Productos y Marcas |
| `FiltrosProductos` | `{ nombre: string; sku: string; categoriaId: string; marcaId: string; estado: EstadoFiltro }`; `''` no filtra | Productos |
| `FiltrosCategorias` | `{ nombre: string; padreId: string }`; `''` no filtra; `SIN_PADRE` = las de primer nivel | Categorías |
| `FiltrosMarcas` | `{ nombre: string; estado: EstadoFiltro }` | Marcas |
| `SIN_PADRE` | `'sin-padre'`. No choca con los ids: los del seed empiezan por `cat-` y los nuevos son UUID | Categorías |
| `FILTROS_PRODUCTOS_VACIOS`, `FILTROS_CATEGORIAS_VACIOS`, `FILTROS_MARCAS_VACIOS` | Todos los textos `''` y `estado: 'todos'` | «Limpiar filtros» |
| `filtrarProductos(productos, categorias, filtros): readonly Producto[]` | Cumple todos los filtros escritos; «Categoría» incluye la elegida y sus subcategorías (`idsDescendientes`); conserva el orden de entrada | Productos |
| `filtrarCategorias(categorias, filtros): readonly EntradaArbolCategorias[]` | Sobre `aplanarArbolCategorias()`: conserva el orden de árbol y la profundidad; «Categoría padre» = hijas directas de la elegida, o raíces con `SIN_PADRE` | Categorías |
| `filtrarMarcas(marcas, filtros): readonly Marca[]` | Nombre y estado; conserva el orden de entrada | Marcas |
| Parámetros de la URL | Productos: `nombre`, `sku`, `categoria`, `marca`, `estado` (`activos` o `inactivos`), `pagina`. Categorías: `nombre`, `padre` (id o `sin-padre`), `pagina`. Marcas: `nombre`, `estado`, `pagina`. Los valores por defecto no se escriben; un valor desconocido se lee como el valor por defecto | Las tres páginas y las rutas de registro |
| `leerFiltrosProductos(params)`, `leerFiltrosCategorias(params)`, `leerFiltrosMarcas(params)`, `leerPagina(params)` | De `Readonly<Record<string, string \| undefined>>` (los `queryParams`) a los filtros; `leerPagina` da un entero de 1 en adelante, 1 si no es válido | Las tres páginas |
| `parametrosDeFiltrosProductos(filtros)` y sus pares de Categorías y Marcas | De los filtros a `Record<string, string>`, sin los valores por defecto ni `pagina` | «Buscar» |
| `TiendaFacade.refresh(): Promise<boolean>` | Ver [responsabilidades](#responsabilidades-por-capa) | Las tres páginas y las tres interfaces de registro |
| Señales de las páginas | `borrador` (el `FormGroup` del panel), `aplicados` (`computed` de los parámetros), `buscando`, `errorBusqueda`, `resultados` (`computed` del filtro), `pagina` (`computed` de `paginar`) | Las tres páginas |
| `editingId` | En `RegistroProductoPage`, `computed` del `input` `id` (`null` en «nuevo»). Conserva el nombre de hoy para que la comprobación de `validate-structure` siga igual | `RegistroProductoPage`, TEST-09 |
| Nombres accesibles | Panel: `form` `role="search"` «Filtros de productos», «Filtros de categorías», «Filtros de marcas». Lista: «Lista de productos» (ya existe), «Lista de categorías», «Lista de marcas». Paginación: `nav` «Páginas de productos», «Páginas de categorías», «Páginas de marcas». Formularios: «Nuevo producto» / «Editar producto», y sus pares | Páginas y e2e |

## Dependencias y riesgos

| Riesgo o dependencia | Impacto | Mitigación |
|---|---|---|
| D1 a D4 son provisionales: Daniel puede cambiar los campos, la paginación o las interfaces de registro | Retrabajo en filtros, rutas o páginas | Los campos están aislados en `filtro-catalogo.rules.ts` y en la plantilla de cada panel; las rutas de registro de Categorías y Marcas son independientes de las de Productos. Si cambia antes de entregar, se corrige aquí; si no, feature nueva (especificación) |
| El snapshot completo crece con el catálogo (cientos de productos con fotos en Data URL) | «Buscar» descarga todo el estado cada vez | Es el diseño vigente de la demo ([contrato](../../../../backend/docs/BFF-CONTRACT.md), «endpoint snapshot deliberadamente compacto»). Las rutas por recurso dependen de PBI-0043 y PBI-0140; no se adelantan aquí |
| Guardar la edición de un registro que otra persona eliminó después de abrirlo lo vuelve a crear: `patch()` recarga tras `409 STALE_SNAPSHOT` y reaplica el `upsert`, que lo añade | Comportamiento heredado de hoy, fuera del alcance (la especificación solo pide avisar **al abrir**) | Se anota como PBI nuevo en el [backlog](../../../planning/backlog.md) (PBI-0142) |
| El error de guardado se ve dos veces: junto al botón y en el aviso de la cabecera | Redundancia visual en la interfaz de registro | Aceptado: el layout no cambia (AC-13) y el formulario es largo, así que el aviso de arriba queda fuera de la vista al pulsar «Guardar» |
| `tools/validate-structure.mjs` busca en `productos.page.ts` la protección de la creación | `npm run verify` falla al mover el formulario | La tarea que mueve el formulario cambia en el mismo commit el archivo que lee esa comprobación a `registro-producto.page.ts` (TEST-09) |
| Las e2e de la feature 007 abren el formulario en `/productos` | Fallan al moverlo | Se adaptan en el mismo commit ([pruebas afectadas](#pruebas-existentes-afectadas)) |
| Las e2e nuevas cambian datos del BFF compartido (las suites van en serie y otras cuentan los seis productos del seed) | Fallos en cascada de otras specs | Cada e2e que crea, cambia o borra deja el estado como estaba en un `finally`, por la API del Admin |
| Accesibilidad heredada de las listas («Editar» sin decir de qué fila, rejillas de `div`) | Fuera del alcance | Sigue en PBI-0132; solo se añade nombre accesible a lo nuevo |

## Decisiones

- **Acordadas** (de la especificación): D1 a D7. D1 a D4, provisionales y sin bloquear; Daniel respondió el 2026-11-20 en las [decisiones pendientes](../../../planning/PENDING-DECISIONS.md) («Filtros y registro de los listados del Admin») sin pedir cambios en ellas.
- **De este plan, por aprobar en el hito:** cómo trae «Buscar» los datos actuales (pregunta 1), las rutas de registro (pregunta 2), dónde viven los filtros (pregunta 3) y la reutilización de Tarifas de envío (pregunta 4).
- **Condicionadas:** ninguna. No hay preguntas de negocio nuevas: lo que el plan decide es técnico o de interfaz y lo responde el hito de arquitectura.
- **ADR necesarios:** ninguno si se aprueba la alternativa A de la pregunta 1 (sigue la arquitectura vigente). Con la alternativa C, uno, y la etapa `sdd-decide` lo registraría.

## Estrategia de pruebas

TDD obligatorio según [STD-18](../../../architecture/standards.md): en el frontend, `domain/` de cada feature. En `application/` es recomendado: la facade se prueba igual antes del código, con el patrón de [`temas.facade.spec.mjs`](../../../../frontend/projects/admin/src/app/features/temas/application/temas.facade.spec.mjs). Las pruebas de `domain/` transpilan la fuente sin sus `import`: `filtro-catalogo.rules.spec.mjs` concatena `categoria.rules.ts` y `listado.rules.ts` antes de la regla, como hace la prueba de la facade de temas.

| ID | Nivel | Qué verifica | AC | TDD obligatorio | Comando |
|---|---|---|---|---|---|
| TEST-01 | Frontend `domain/` (`listado.rules.spec.mjs`) | `textoBuscable` y `contieneTexto`: sin mayúsculas, sin tildes («jesus maria» encuentra «Jesús María»), sin espacios de los extremos; un filtro vacío o de espacios no filtra | AC-02 | Sí | `npm test --prefix frontend` |
| TEST-02 | Frontend `domain/` (`listado.rules.spec.mjs`) | `paginar`: 25 por página; 26 elementos dan 2 páginas; una página mayor que la última muestra la última; una menor que 1, la primera; sin elementos, página 1 de 1 con `from` y `to` 0 | AC-15 | Sí | `npm test --prefix frontend` |
| TEST-03 | Frontend `domain/` (`filtro-catalogo.rules.spec.mjs`) | `filtrarProductos`: cada filtro por separado (nombre, SKU, categoría con sus subcategorías a cualquier profundidad, marca, estado), su combinación (todos a la vez), los filtros vacíos y el orden conservado | AC-02, AC-03, AC-04 | Sí | `npm test --prefix frontend` |
| TEST-04 | Frontend `domain/` (`filtro-catalogo.rules.spec.mjs`) | `filtrarCategorias`: por nombre (una subcategoría sale con su `parentId`), por padre (solo hijas directas), `SIN_PADRE`, combinación, orden de árbol y profundidad conservados | AC-08 | Sí | `npm test --prefix frontend` |
| TEST-05 | Frontend `domain/` (`filtro-catalogo.rules.spec.mjs`) | `filtrarMarcas`: nombre, estado y combinación | AC-09 | Sí | `npm test --prefix frontend` |
| TEST-06 | Frontend `domain/` (`filtro-catalogo.rules.spec.mjs`) | Lectura y escritura de los parámetros: ida y vuelta, valores por defecto omitidos, `estado` y `pagina` inválidos leídos como por defecto, `pagina` nunca escrita por `parametrosDeFiltros*` | AC-06, AC-14, AC-15 | Sí | `npm test --prefix frontend` |
| TEST-07 | Frontend `domain/` (`categoria.rules.spec.mjs`), caracterización | `aplanarArbolCategorias` (orden explícito y alfabético, padre inexistente como raíz, ciclo cortado) e `idsDescendientes` (a cualquier profundidad, sin incluirse) tal como funcionan hoy, antes de que TEST-03 y TEST-04 dependan de ellas | AC-02, AC-08 | Caracterización, antes de TEST-03 | `npm test --prefix frontend` |
| TEST-08 | Frontend `application/` (`tienda.facade.spec.mjs`) | Caracterización de `load()` (con error, conserva el estado y fija `error`) y `refresh()`: con respuesta, reemplaza el estado y devuelve `true`; con fallo, conserva el estado, no toca `error` ni `loading` y devuelve `false` | AC-02, AC-03, AC-07 | Recomendado (STD-18); se escribe antes | `npm test --prefix frontend` |
| TEST-09 | Estructura (`tools/validate-structure.mjs`) | La protección de la creación del vendedor se busca en `registro-producto.page.ts`; la de la eliminación, en `productos.page.ts`; nueva comprobación: `productos/nuevo` con `permisoGuard('products.manage')` | AC-11 | No | `npm run validate:contract` |
| TEST-10 | E2E (`admin-catalogo-filtros.spec.ts`) | Disposición a 1440 px en las tres páginas: título y «Nuevo…», panel con «Buscar» y «Limpiar filtros», lista a todo el ancho, en ese orden vertical, sin formulario; mismas posiciones relativas en las tres | AC-01, AC-10 | No | `npm run test:e2e -- admin-catalogo-filtros` (desde `frontend/`) |
| TEST-11 | E2E | Otra sesión (la API del Admin) agrega «Cooler portátil» y cambia otro producto con la página abierta; «Buscar» con «cooler» solo muestra coincidencias, sin filtros muestra todo con el cambio; tildes y mayúsculas | AC-02, AC-03 | No | Ídem |
| TEST-12 | E2E | Sin resultados (mensaje distinto del catálogo vacío) y «Limpiar filtros» + «Buscar» | AC-04, AC-14 | No | Ídem |
| TEST-13 | E2E | «Nuevo producto» abre `/productos/nuevo` sin lista y con todos los campos; «Volver» conserva filtros y página; guardar vuelve al listado con los filtros y el producto, y `/bff/catalog/products` lo incluye | AC-05, AC-06 | No | Ídem |
| TEST-14 | E2E | «Editar» abre `/productos/:id` con los datos actuales y vuelve con el cambio; un `id` eliminado por otra sesión muestra «Este producto ya no existe» | AC-07 | No | Ídem |
| TEST-15 | E2E | Categorías: filtros por nombre («OLED» con su padre «TV y audio») y por padre; «Nueva categoría» y «Editar» en su interfaz; el padre excluye a sí misma y a sus subcategorías | AC-08 | No | Ídem |
| TEST-16 | E2E | Marcas: filtros por nombre y estado; «Nueva marca» y «Editar» en su interfaz | AC-09 | No | Ídem |
| TEST-17 | E2E | Vendedor: filtra, busca y edita la ficha (SKU, precio, categoría, marca y estado bloqueados); sin «Nuevo producto» ni «Eliminar»; `/productos/nuevo` lo lleva al Resumen | AC-11 | No | Ídem |
| TEST-18 | E2E | A 360, 375 y 390 px con A, B y C: las tres listas y las interfaces de registro (nuevo y edición) sin desplazamiento horizontal y con los controles dentro de la pantalla | AC-12 | No | Ídem |
| TEST-19 | E2E | Con 30 productos (añadidos y retirados por la API): 25 en la página 1, «Página 1 de 2», «Siguiente», una búsqueda nueva vuelve a la 1, sin paginación con 25 o menos | AC-15 | No | Ídem |
| TEST-20 | E2E | «Buscar» con el snapshot interceptado y fallido: aviso junto al panel, filtros y resultados anteriores conservados, reintento correcto | REQ-02 (caso límite) | No | Ídem |
| TEST-21 | E2E | Guardar con un `400` interceptado: se queda en el formulario con lo escrito y el error junto al botón | REQ-04 (caso límite) | No | Ídem |
| TEST-22 | Capturas | Antes y después ([tabla](#capturas-antes-y-después)) | AC-10, AC-13 | No | [QA visual](../../../development/local-environment.md#qa-visual-con-chrome) |

### Pruebas existentes afectadas

| Prueba | Qué puede cambiar: aserciones o solo valores esperados | Cómo se conserva la cobertura |
|---|---|---|
| [`admin-productos-movil.spec.ts`](../../../../frontend/tests/e2e/admin-productos-movil.spec.ts) (feature 007), TEST-01 y TEST-02 | Solo los pasos para llegar al formulario: ir a `/productos/nuevo` en lugar de leerlo en `/productos`, y pulsar «Editar» y esperar `/productos/:id`. Las aserciones de medida (sin desborde, piezas dentro de su caja, ayuda de la miniatura, galería) no cambian | Las mismas medidas sobre el mismo formulario, ahora en su ruta |
| `admin-productos-movil.spec.ts`, TEST-03 a TEST-05 | Ninguna aserción. La lista conserva la fila de dos líneas de la 007, la cabecera de escritorio y «Stock N». Si la región de la lista cambia de posición por el panel, solo se ajusta la espera | Igual que hoy; TEST-10 añade el panel encima |
| [`admin-acceso.spec.ts`](../../../../frontend/tests/e2e/admin-acceso.spec.ts) y [`admin-modo-demo.spec.ts`](../../../../frontend/tests/e2e/admin-modo-demo.spec.ts) | Ninguna: solo abren `/productos` | Sin cambios |
| [`tools/validate-structure.mjs`](../../../../tools/validate-structure.mjs), «Solo products.manage crea productos» | Solo el archivo que lee (`registro-producto.page.ts`); la cadena buscada es la misma | TEST-09 |
| [`tarifa-envio.rules.spec.mjs`](../../../../frontend/projects/admin/src/app/features/tienda/domain/tarifa-envio.rules.spec.mjs) | Ninguna: Tarifas no cambia | Sin cambios |

### Capturas antes y después

Con el BFF sobre una copia de los datos (`WEBSTORE_DATA_FILE`), la sesión de `superadmin` y, para Productos, también la de `vendedor`. Las «antes» se toman en `dev` (`2fe0fc1`) antes de la primera tarea de interfaz.

| Pantalla o ruta | Anchos | Cambio visual esperado |
|---|---|---|
| `/productos`, `/categorias`, `/marcas` con A, B y C | 1440 y 375 px | Panel de filtros debajo del título, lista a todo el ancho, sin formulario a la derecha; «Nueva categoría» y «Nueva marca» junto al título |
| `/productos/nuevo`, `/productos/:id`, `/categorias/nueva`, `/categorias/:id`, `/marcas/nueva`, `/marcas/:id` con A, B y C | 1440 y 375 px | Rutas nuevas (solo «después»): el formulario de hoy en su página, con título, «Volver» y «Cancelar» |
| Las demás páginas del menú, `/perfil` y `/login` con A, B y C | 1440 y 375 px | Ninguno (AC-13) |

### Ejecución prevista

Sin nombres de modelo ([tablas de nivel y esfuerzo](../../../development/agent-execution.md#delegar-por-nivel-y-esfuerzo)). Cada fila es una tarea o un grupo que `sdd-tasks` puede partir.

| Paso o tarea | Nivel y esfuerzo sugeridos | E2E | Criterios de aprobación (si es ⚠) |
|---|---|---|---|
| Fase 1. TEST-07, caracterización de `categoria.rules.ts` | estándar · medio | No | — |
| Fase 1. TEST-01 y TEST-02, y `listado.rules.ts` | estándar · medio | No | — |
| Fase 1. TEST-03 a TEST-06, `filtro-catalogo.model.ts` y `filtro-catalogo.rules.ts` | estándar · alto | No | — |
| Fase 1. TEST-08 y `TiendaFacade.refresh()` | estándar · alto | No | — |
| Fase 2. `PanelFiltrosComponent` y `PaginacionComponent` (sin uso todavía) | estándar · medio | No | — |
| Fase 2. ⚠ Rutas de producto, `RegistroProductoPage`, `ProductosPage` como listado, TEST-09 y la adaptación de `admin-productos-movil` en el mismo commit; capturas de Productos | avanzado · alto | Sí (`admin-productos-movil` y la parte de productos de `admin-catalogo-filtros`) | El formulario conserva todos sus campos, validaciones y la galería; el vendedor no ve «Nuevo producto» ni «Eliminar», `/productos/nuevo` lo lleva al Resumen y al guardar conserva SKU, precio, categoría, marca y estado; TEST-09 en verde; `admin-productos-movil` cambia solo pasos, no aserciones; capturas: solo cambia Productos |
| Fase 3. Rutas de categoría, `RegistroCategoriaPage` y `CategoriasPage`; capturas | estándar · alto | Sí | — |
| Fase 3. Rutas de marca, `RegistroMarcaPage` y `MarcasPage`; capturas | estándar · medio | Sí | — |
| Fase 4. E2E restantes de `admin-catalogo-filtros` (TEST-10 a TEST-21 que no hayan entrado con su página) | estándar · medio | Sí, completa | — |
| Fase 4. Documentos afectados y capturas de AC-13 | ligero · medio | No | — |

## Documentos afectados

- [`frontend/docs/VISUAL-SYSTEM.md`](../../../../frontend/docs/VISUAL-SYSTEM.md), apartado Admin: el panel de filtros (debajo del título, encima de la lista, «Buscar» principal y «Limpiar filtros» con borde), la paginación compartida y las interfaces de registro.
- [`frontend/architecture.md`](../../../../frontend/architecture.md): en §4, la convención de que los filtros de un listado del Admin viven en los parámetros de la URL; en §6, las pruebas nuevas de `domain/` y de la facade, y la spec `admin-catalogo-filtros`.
- [Glosario](../../../architecture/glosario.md): «Panel de filtros» e «Interfaz de registro» del Admin, con sus nombres en el código.
- [Trazabilidad](../../../planning/TRACEABILITY.md): una fila de la feature 008.
- [Backlog](../../../planning/backlog.md): PBI-0142 (guardar sobre un registro eliminado lo vuelve a crear), anotado con este plan; PBI-0137 y PBI-0138, al terminar la implementación.
- No cambian el contrato del BFF, `backend/architecture.md` ni los ADR.

## Hito de arquitectura

Se pide aprobar:

- que solo cambia la feature `tienda` del Admin, sin cambios en el BFF, el contrato, los datos, los permisos, las dependencias entre features ni los estilos globales;
- las capas, los nombres y los tipos de este plan;
- que no hace falta ningún ADR, así que la etapa `sdd-decide` no tiene nada que registrar y la siguiente es `sdd-tasks` (salvo la alternativa C de la pregunta 1);
- la estrategia de pruebas: TDD obligatorio en TEST-01 a TEST-06, caracterización en TEST-07, TEST-08 antes del código, e2e y capturas;
- y estas cuatro preguntas, que se presentan de una en una.

### Pregunta 1. ¿Cómo trae «Buscar» los datos actuales? (S1)

| Alternativa | Qué significa |
|---|---|
| **A. Método nuevo `TiendaFacade.refresh()` en «Buscar» y al abrir la edición; filtrar en el Admin (recomendada)** | Una petición al snapshot que ya existe; si falla, la página avisa junto al panel y conserva filtros y resultados, sin el aviso global. La edición muestra los datos vigentes y detecta un registro eliminado al abrirse. Sin rutas nuevas ni ADR |
| B. Igual, pero «Buscar» llama al `load()` de hoy y la edición usa lo que hay en memoria | Menos código, pero el error de «Buscar» sale en el aviso de la cabecera y no junto al panel (no cumple el caso límite), y la edición puede mostrar datos viejos y no detecta un registro eliminado hasta pulsar «Buscar» |
| C. Rutas nuevas del BFF con filtros y paginación (`GET /admin/products?nombre=…&pagina=…`, y de categorías y marcas) | Escala a catálogos grandes, pero cambia el contrato (STD-05), exige ADR, TDD en el BFF y su smoke test, y adelanta las rutas por recurso que PBI-0140 y PBI-0043 todavía no deciden. El guardado seguiría por el snapshot |

Evidencia: [`tienda.facade.ts`](../../../../frontend/projects/admin/src/app/features/tienda/application/tienda.facade.ts) (`load()` fija el aviso global, que el [layout](../../../../frontend/projects/admin/src/app/layout/app.layout.ts) muestra encima de todas las páginas); el contrato llama al snapshot «deliberadamente compacto para la demo»; la demo tiene 6 productos.

### Pregunta 2. ¿Qué rutas tienen las interfaces de registro? (S2 y AC-11)

| Alternativa | Qué significa |
|---|---|
| **A. `/productos/nuevo` y `/productos/:id` (y sus pares), con el `permisoGuard` de hoy; el vendedor que abre `/productos/nuevo` va al Resumen (recomendada)** | Rutas cortas y hermanas del listado; el menú sigue marcando la sección. El vendedor recibe el mismo trato que en cualquier módulo sin permiso, sin guard nuevo |
| B. Como A, pero el vendedor vuelve a `/productos` en lugar del Resumen | Más amable para el vendedor, pero exige una variante de `permisoGuard` con destino propio, que hoy no existe |
| C. `/productos/nuevo` y `/productos/:id/editar` | Deja libre `/productos/:id` para una futura vista de solo lectura que nadie ha pedido; rutas más largas |

Evidencia: [`permiso.guard.ts`](../../../../frontend/projects/admin/src/app/features/sesion/application/permiso.guard.ts) (devuelve un `UrlTree` a `/`); `opcionesDePaginaActual` del layout (`paths: 'subset'`).

### Pregunta 3. ¿Cómo se conservan los filtros y la página al volver del registro? (D5 y D7)

| Alternativa | Qué significa |
|---|---|
| **A. En los parámetros de la URL del listado (recomendada)** | La búsqueda sobrevive a ir y volver del registro, a recargar la página y a los botones atrás y adelante, y se puede compartir el enlace. Nada en el navegador (STD-08). Las reglas de lectura y escritura son puras y se prueban con TDD (TEST-06) |
| B. En un servicio en memoria (por ejemplo, `FiltrosCatalogoStore` en `application/`) | Sobrevive a ir y volver, pero no a recargar ni a atrás y adelante; estado oculto que el enlace no muestra |
| C. En el `state` de la navegación del router | Se pierde al recargar o al abrir el registro en otra pestaña |

### Pregunta 4. ¿Cómo se reutilizan la paginación y la búsqueda de Tarifas de envío?

| Alternativa | Qué significa |
|---|---|
| **A. Reglas genéricas nuevas (`listado.rules.ts`) y componentes compartidos (`PanelFiltrosComponent`, `PaginacionComponent`) para las tres páginas, sin tocar Tarifas (recomendada)** | El mismo algoritmo y la misma barra de páginas que Tarifas, y la misma disposición en las tres páginas (AC-10). Tarifas pasa a estas piezas con PBI-0139, cuando se estandaricen sus filtros. Duplica unas 15 líneas de `tarifa-envio.rules.ts` hasta entonces |
| B. Como A, y además Tarifas pasa ya a las piezas nuevas | Sin duplicación, pero toca una página fuera del alcance (capturas de Tarifas, su prueba y su plantilla) y mezcla PBI-0139 en esta feature |
| C. Importar `paginarTarifas` tal cual y escribir el panel en cada página | Sin piezas nuevas, pero el nombre y el tipo hablan de tarifas, y las tres plantillas pueden divergir (AC-10) |

### Respuestas del hito

Las preguntas se presentaron de una en una, cada una con sus alternativas, la recomendación y la evidencia. Sebastián Avila las respondió el 2026-11-14 en la sesión de esta etapa.

| Pregunta | Decisión | Alternativas descartadas | Ajustes pedidos y dónde quedan |
|---|---|---|---|
| 1. Cómo trae «Buscar» los datos actuales (S1) | **A. `TiendaFacade.refresh()` en «Buscar» y al abrir la edición, y filtrar en el Admin**, sin rutas nuevas del BFF ni ADR. Elegida por Sebastián Avila el 2026-11-14 («A. refresh() + filtrar (Recomendado)») | B. El `load()` de hoy (el error sale en la cabecera, no junto al panel, y la edición puede mostrar datos viejos); C. rutas nuevas del BFF con filtros y paginación (cambio de contrato, ADR y TDD del BFF, y adelanta PBI-0140 y PBI-0043) | Ninguno |
| 2. Rutas de las interfaces de registro (S2 y AC-11) | **A. `/productos/nuevo` y `/productos/:id`, `/categorias/nueva` y `/categorias/:id`, `/marcas/nueva` y `/marcas/:id`**, con el `permisoGuard` de hoy; el vendedor que abre `/productos/nuevo` va al Resumen. Elegida por Sebastián Avila el 2026-11-14 («A. /nuevo y /:id (Recomendado)») | B. El vendedor vuelve a `/productos` (exige una variante de `permisoGuard`); C. `/productos/:id/editar` (rutas más largas para una vista de solo lectura que nadie pidió) | Ninguno |
| 3. Dónde se conservan filtros y página (D5 y D7) | **A. En los parámetros de la URL del listado.** Elegida por Sebastián Avila el 2026-11-14 («A. Parámetros de la URL (Recomendado)») | B. Servicio en memoria (no sobrevive a recargar ni a atrás y adelante); C. `state` del router (se pierde al recargar o en otra pestaña) | Ninguno |
| 4. Reutilización de Tarifas de envío | **A. `listado.rules.ts`, `PanelFiltrosComponent` y `PaginacionComponent` nuevos para las tres páginas, sin tocar Tarifas**, que pasa a ellos con PBI-0139. Elegida por Sebastián Avila el 2026-11-14 («A. Piezas nuevas, Tarifas igual (Recomendado)») | B. Migrar también Tarifas (fuera del alcance, mezcla PBI-0139); C. `paginarTarifas` tal cual y el panel escrito en cada página (nombre y tipo de tarifas, y riesgo de divergir de AC-10) | Ninguno |

Después de las cuatro preguntas, Sebastián Avila aprobó el resto del plan el 2026-11-14 («Aprobar el plan (Recomendado)»), presentado en una pregunta aparte con sus puntos: solo cambia la feature `tienda` del Admin, sin cambios en el BFF, el contrato, los datos, los permisos ni los estilos globales; ningún ADR, así que la etapa `sdd-decide` no tiene nada que registrar y la siguiente es `sdd-tasks`; TDD obligatorio en TEST-01 a TEST-06, caracterización en TEST-07, TEST-08 antes del código, e2e nuevas y capturas con A, B y C a 1440 y 375 px; y anotar PBI-0142 en el backlog. Con eso, el hito queda cerrado.
