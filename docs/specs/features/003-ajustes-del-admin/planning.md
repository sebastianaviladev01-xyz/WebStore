# 003. Ajustes del Admin — Plan

- Feature: `003-ajustes-del-admin`
- Especificación: [specification.md](specification.md) (aprobada el 2026-11-12; 12 REQ, 15 AC, decisiones D1 a D6)
- Estado: aprobado
- Fecha: 2026-11-12
- Hito de arquitectura: aprobado por Sebastián Avila el 2026-11-12. Respondió las [tres preguntas](#hito-de-arquitectura) con la alternativa A, sin ajustes ([respuestas](#respuestas-del-hito)). Su sesión principal pidió cerrar el hito con esas respuestas

## Enfoque

Solo cambia el Admin. El BFF, su contrato y el Storefront no cambian (REQ-10). Son tres piezas que comparten el shell:

1. **Plegado con botones de divulgación.** Cada grupo del menú lateral y cada uno de los cinco bloques con título del Resumen tiene un `<button>` nativo con `aria-expanded` y `aria-controls`, que abre y cierra una región con un id fijo. El estado vive en signals de quien muestra el elemento: `AppLayout` para los grupos y `ResumenPage` para los bloques. Así, el plegado dura mientras se navega sin recargar y se pierde al recargar o al volver a entrar (D4, REQ-12): no se guarda en el navegador. La animación y el indicador son dos clases CSS compartidas en el `styles.css` del Admin, con 200 ms y sin animación con `prefers-reduced-motion` (AC-06).
2. **Grupo de la página actual con el router.** `AppLayout` sabe qué enlace está activo con la función `isActive()` del router de Angular, con las mismas opciones que ya usa `routerLinkActive` para marcarlo. Un `linkedSignal` abre el grupo de esa página cada vez que cambia la página actual y conserva los demás grupos como estaban (D2, AC-02). En móvil, las reglas de plegado solo se aplican desde `lg:`: la tira horizontal queda igual (D3).
3. **Menú de usuario con Angular Material.** Un componente nuevo del layout, `MenuUsuarioComponent`, sustituye el nombre, el rol y el botón «Cerrar sesión» sueltos. Usa `MatMenu`, como la tuerca de temas del Admin (feature 002): el panel muestra el nombre, el correo y el rol, y debajo «Perfil» y «Cerrar sesión». Las iniciales salen de una regla pura nueva del dominio `sesion`, escrita con TDD. «Perfil» es una página nueva de la feature `sesion`, `/perfil`, de solo lectura, con los datos que ya tiene `SesionFacade` (D5).

Alternativas descartadas:

| Alternativa | Por qué se descarta |
|---|---|
| `MatExpansionPanel` de Angular Material para los plegables | Trae su propio diseño (cabecera, relleno, sombra). Para que el Admin conserve el suyo habría que sobrescribir los internals de Material, que STD-04 prohíbe, o aceptar un cambio visual no pedido (STD-12). Alternativa C de la [pregunta 1](#pregunta-1-con-qué-se-construye-el-plegado) |
| CDK Accordion (`CdkAccordionItem`) | No pone los atributos ARIA: solo guarda `expanded` y genera un id. El estado del menú depende además de la ruta, así que habría que sincronizar dos fuentes. Alternativa B de la pregunta 1 |
| Un componente plegable compartido en un `shared/ui/` nuevo del Admin | Los dos usos difieren: el menú solo se pliega desde `lg:` y es una lista de enlaces, y los encabezados del Resumen varían (subtítulo, enlace «Ver todos los pedidos»). Lo común es un botón y dos clases CSS, y un componente solo las reenviaría (STD-02) |
| Guardar el plegado en `localStorage` | Lo descartó D4: ampliaría STD-08 con un ADR |
| Estado del menú en un servicio raíz | Sobreviviría al cierre de sesión: al volver a entrar, el menú no empezaría desde cero, contra AC-07, salvo que se reinicie a mano. Alternativa C de la [pregunta 2](#pregunta-2-dónde-vive-el-estado-del-menú-lateral-y-cómo-se-sabe-el-grupo-actual) |
| Rol en mayúsculas con `toUpperCase()` en el código | Algunos lectores de pantalla deletrean un texto en mayúsculas. Con `text-transform: uppercase` (clase `uppercase` de Tailwind) se ve en mayúsculas y se lee como palabra, y la etiqueta sigue saliendo de `rol.rules.ts` |
| CDK Menu o un panel propio con CDK Overlay para el menú de usuario | No hay precedente en el Admin, y el panel propio obliga a programar foco, Escape y clic fuera. Alternativas B y C de la [pregunta 3](#pregunta-3-cómo-se-construye-el-menú-de-usuario) |

## Responsabilidades por capa

Nombres según [`frontend/architecture.md` §4](../../../../frontend/architecture.md#4-componentes-y-convenciones). El BFF no cambia: no hay filas de sus capas.

| Capa | Elemento | Responsabilidad | REQ |
|---|---|---|---|
| Admin: `features/sesion/domain/` | `usuario-admin.rules.ts` (nuevo) | `inicialesDeUsuario(nombre, correo)`: primera letra de la primera y de la última palabra del nombre, en mayúsculas y con sus tildes; con el nombre vacío, la primera letra del correo ([reglas](#tipos-intermedios-y-nombres)) | REQ-09, AC-11 |
| Admin: `features/sesion/domain/` | `rol.rules.ts` | Sin cambios. Es la fuente de `label` (mostrado en mayúsculas en el botón y tal cual en el menú y en Perfil) y de `description` (en Perfil) | REQ-05, REQ-08 |
| Admin: `features/sesion/application/` | `SesionFacade` | Sin cambios. Ya expone `user()`, `role()`, `roleLabel()` y `logout()` | REQ-07, REQ-10 |
| Admin: `features/sesion/presentation/` | `PerfilPage` (`ws-admin-perfil`, nuevo, `perfil.page.ts`) | Página de solo lectura: nombre, correo, etiqueta y descripción del rol de la sesión (`session.user()` y `definicionDeRol(session.role())`). Sin campos ni botones, y sin llamadas al BFF | REQ-08, REQ-10, AC-12 |
| Admin: raíz de composición | `app.routes.ts` | Ruta hija `perfil` del layout, con `loadComponent` de `PerfilPage` y título `WebStore Admin \| Perfil`. Sin `permisoGuard`: la abren los tres roles, y el `sesionGuard` del padre lleva a `/login` sin sesión | REQ-08, AC-12 |
| Admin: `layout/` | `AppLayout` (`app.layout.ts`) | Grupos con `id` fijo. Título de grupo como botón plegable, visible solo desde `lg:`. Estado `gruposAbiertos` con `linkedSignal` desde `paginaActual`. Cabecera con «Actualizar» y `<ws-admin-menu-usuario>`, sin el nombre, el rol ni «Cerrar sesión» sueltos | REQ-01, REQ-02, REQ-04, REQ-07, REQ-12, D6 |
| Admin: `layout/` | `MenuUsuarioComponent` (`ws-admin-menu-usuario`, nuevo, `menu-usuario.component.ts`) | Botón con el círculo de iniciales, el nombre (recortado con puntos suspensivos) y el rol en mayúsculas; `MatMenu` con el bloque de la cuenta (nombre, correo y rol) y las opciones «Perfil» (`routerLink="/perfil"`) y «Cerrar sesión» (`session.logout()` y `/login`, la lógica que hoy tiene `AppLayout.logout()`) | REQ-05, REQ-06, REQ-07, REQ-09, AC-08 a AC-10 |
| Admin: `features/tienda/presentation/` | `ResumenPage` (`resumen.page.ts`) | Encabezado de los cinco bloques con botón plegable dentro del `h2`; estado `bloquesPlegados`. La fila de tarjetas no cambia (D1) | REQ-03, REQ-04, REQ-12 |
| Admin: estilos | `projects/admin/src/styles.css` | Clases `ws-plegable` (región), `ws-plegable-lg` (variante que solo pliega desde `lg:`), `ws-plegable-contenido` e `ws-plegable-indicador`, y `ws-menu-usuario-panel` (tokens del panel de Material, como `ws-selector-tema-panel`). Solo tokens y `prefers-reduced-motion` | REQ-04, REQ-11, AC-06, AC-14 |

La regla de dependencias no cambia: `layout/` puede usar `application/` y `domain/` de las features, pero no `presentation/`. Por eso el menú de usuario va en `layout/` y la página Perfil en `features/sesion/presentation/`, enlazada por ruta y cargada desde `app.routes.ts`.

### Dependencias entre features

Ninguna. `sesion` no depende de otra feature. `layout/` ya usa `sesion` y `tienda` ([`sheriff.config.ts`](../../../../frontend/sheriff.config.ts)).

## Contrato del BFF afectado

Ninguno. La feature usa lo que ya existe en el [contrato](../../../../backend/docs/BFF-CONTRACT.md):

- `GET /admin/sessions/current` y la respuesta del inicio de sesión traen el usuario con `name`, `email` y `role`. `SesionFacade` ya lo guarda en `user()`.
- `DELETE /admin/sessions/current` sigue igual. Ahora lo llama `MenuUsuarioComponent` a través de `SesionFacade.logout()`, que borra el token local aunque el BFF falle.

## Estado del BFF

Sin cambios: no hay colecciones, campos ni migración.

## Tipos intermedios y nombres

Para que ninguna tarea tenga que repensarlos. Los términos de negocio son los del [glosario](../../../architecture/glosario.md) («Usuario administrativo», «Rol», «Resumen»).

| Tipo o nombre | Definición | Tareas que lo usan |
|---|---|---|
| `inicialesDeUsuario(nombre: string, correo: string): string` | En `features/sesion/domain/usuario-admin.rules.ts`. Normaliza a NFC, separa el nombre por espacios y toma la primera letra (punto de código, no unidad UTF-16) de la primera palabra y de la última, con `toLocaleUpperCase('es')`. Una sola palabra da una letra. Sin palabras, la primera letra del correo en mayúsculas. Sin nombre ni correo, `''` | T1, T4 |
| `NavigationGroup.id` | Campo nuevo de los grupos de `NAVIGATION`: `'general'`, `'catalogo'`, `'ventas'`, `'tienda'` y `'accesos'` | T2 |
| Ids de las regiones del menú | `menu-grupo-<id>` (por ejemplo, `menu-grupo-catalogo`), apuntado por `aria-controls` | T2 |
| `paginaActual` | `computed` de `AppLayout`: el `path` del enlace activo, o `null` fuera del menú (por ejemplo, en `/perfil`). Se calcula con `isActive(path, router, opciones)` de `@angular/router`, con `paths: 'exact'` para `/` y `'subset'` para el resto, y `queryParams`, `matrixParams` y `fragment` ignorados, igual que `routerLinkActive` | T2 |
| `gruposAbiertos` | `linkedSignal<ReadonlySet<string>>` de `AppLayout` con `source: paginaActual`. Cada vez que cambia la página actual, conserva el conjunto anterior y añade el grupo de la página, si tiene. El primer valor solo tiene el grupo de la página de entrada, o ninguno (D2) | T2 |
| `alternarGrupo(id)`, `grupoAbierto(id)` | Métodos de `AppLayout` sobre `gruposAbiertos` | T2 |
| `BloqueResumen` | `'pedidos-por-dia' \| 'distritos' \| 'alertas' \| 'ultimos-pedidos' \| 'estados'`, tipo local de `resumen.page.ts` | T3 |
| Ids de las regiones del Resumen | `bloque-<BloqueResumen>` (por ejemplo, `bloque-distritos`). El `id="ultimos-pedidos"` del `h2` no cambia | T3 |
| `bloquesPlegados` | `signal<ReadonlySet<BloqueResumen>>(new Set())` de `ResumenPage`: al entrar al Resumen, todos desplegados | T3 |
| `alternarBloque(id)`, `bloqueAbierto(id)` | Métodos de `ResumenPage` | T3 |
| `MenuUsuarioComponent` | `layout/menu-usuario.component.ts`, selector `ws-admin-menu-usuario` | T4 |
| `iniciales` | `computed` de `MenuUsuarioComponent` con `inicialesDeUsuario(user.name, user.email)` | T4 |
| `cerrarSesion()` | Método de `MenuUsuarioComponent`; sustituye a `AppLayout.logout()`, que se borra | T4 |
| `PerfilPage` | `features/sesion/presentation/perfil.page.ts`, selector `ws-admin-perfil` | T5 |
| `desplegarGrupo(page, nombre)` y `desplegarTodos(page)` | Ayudas nuevas de [`tests/e2e/apoyo/entorno.ts`](../../../../frontend/tests/e2e/apoyo/entorno.ts): activan el título de un grupo (o de todos) si tiene `aria-expanded="false"` | T2 |
| `abrirMenuUsuario(page)` y `cerrarSesionAdmin(page)` | Ayudas nuevas de `apoyo/entorno.ts`: abren el menú de usuario y eligen «Cerrar sesión» | T4 |

Comportamiento acordado de los controles (para que T2 y T3 no lo decidan):

- **Botón.** El nombre accesible es el título visible. El indicador es un chevron SVG en línea con `aria-hidden="true"` al final del botón, que gira al abrir. El foco visible usa el contorno de foco del tema (`--ws-focus-ring`). En el Resumen, el botón va dentro del `h2`, así que el encabezado conserva su nivel y su nombre (`admin-resumen.spec.ts` sigue igual).
- **Región.** `ws-plegable` usa una rejilla con `grid-template-rows` de `1fr` a `0fr` y `visibility: hidden` al terminar de plegar. Así, lo plegado sale del orden de tabulación y del árbol de accesibilidad sin `@if` y sin perder los datos (AC-04). Duración: 200 ms, dentro de los 180–260 ms de las entradas cortas del [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md). Con `prefers-reduced-motion: reduce`, `transition: none`.
- **Menú en móvil.** El botón del grupo lleva `hidden lg:flex`, y la región y su contenido usan `display: contents` por debajo de `lg:`, como el contenedor de hoy. `ws-plegable-lg` solo aplica el plegado dentro de `@media (min-width: 64rem)`.
- **Encabezados del Resumen.** Plegado, se ve la fila del título: en «Últimos pedidos», el título y «Ver todos los pedidos →»; el subtítulo del gráfico («noviembre de 2026») y el de «Pedidos por distrito» van dentro de la región. Un bloque plegado junto a uno desplegado en la misma fila de la rejilla se encoge a su encabezado (`self-start`) y el otro conserva su alto. Desplegados, la fila queda como hoy.
- **Menú de usuario.** Las iniciales llevan `aria-hidden="true"`. El nombre y el rol se ven desde `sm:`. Por debajo, solo se ven las iniciales, y el nombre y el rol pasan a `sr-only`: el nombre accesible del botón es siempre «Nombre Rol» (AC-13). El bloque de la cuenta del panel se enlaza con `aria-describedby` del `mat-menu`, para que el lector de pantalla lo lea al abrirlo.

## Dependencias y riesgos

| Riesgo o dependencia | Impacto | Mitigación |
|---|---|---|
| Los enlaces de un grupo plegado no son visibles, y Playwright no los encuentra por rol | Fallan `admin-acceso.spec.ts` (recorre los 13 módulos desde el menú) y `admin-temas.spec.ts` (abre Temas desde el menú). Peor: los `toHaveCount(0)` de enlaces ocultos pasarían siempre, también si el permiso fallara | Ayudas `desplegarGrupo` y `desplegarTodos`. Las comprobaciones de ausencia se hacen con todos los grupos desplegados ([pruebas afectadas](#pruebas-existentes-afectadas)) |
| La tira del menú en móvil cambia sin querer | Cambio visual no pedido (D3, STD-12) | Las reglas de plegado solo desde `lg:` y `display: contents` por debajo. Captura a 375 px igual a la de antes (TEST-09) |
| `paginaActual` se calcula antes de que el router termine la navegación inicial | Al entrar, no se despliega ningún grupo | `isActive()` lee el estado del router, que ya está fijado cuando se activa el layout. TEST-04 entra por `/login` y por una URL directa (`/pedidos`) |
| Un bloque plegado junto a uno desplegado se estira al alto de la fila | Tarjeta vacía en el Resumen | `self-start` solo en el bloque plegado. Captura con «Pedidos por distrito» plegado (TEST-09) |
| El encabezado de «Últimos pedidos» tiene un enlace y un relleno inferior distinto (`pb-4`) | El chevron y el relleno quedan raros al plegar | Posición del chevron y relleno del bloque plegado, a la vista en las capturas de T3 (revisión ⚠ de T6) |
| Contenido que no es una opción dentro de un `role="menu"` | Un lector de pantalla que recorre el menú con las flechas se salta el correo | `aria-describedby` del `mat-menu` hacia el bloque de la cuenta, y el nombre y el rol también están en el nombre del botón. Es el mismo patrón que el título de la tuerca de temas |
| Rol en mayúsculas con CSS | `toContainText` de Playwright compara `textContent` («Superadministrador») | Las e2e de AC-08 usan `useInnerText: true`. [`cdp-admin-qa.mjs`](../../../../frontend/tools/qa/cdp-admin-qa.mjs) busca «Superadministrador» en el `textContent` de los `span` de la cabecera y sigue valiendo |
| [`cdp-admin-qa.mjs`](../../../../frontend/tools/qa/cdp-admin-qa.mjs) cierra sesión con el botón «Cerrar sesión» de la cabecera | El script de QA deja de cerrar sesión | T4 lo cambia para abrir el menú de usuario y elegir «Cerrar sesión» |
| La tuerca flotante del modo demo y el menú de usuario | Que el menú tape la tuerca o al revés | El menú está arriba a la derecha y la tuerca abajo a la derecha. `admin-modo-demo.spec.ts` comprueba el botón del menú de usuario en lugar de «Cerrar sesión» |
| Panel de `MatMenu` con colores de Material | El tema activo no se aplicaría al panel (AC-14) | `ws-menu-usuario-panel` con las variables `--mat-menu-*` apuntando a tokens `--ws-*`, como `ws-selector-tema-panel`, sin `::ng-deep` (STD-04) |
| Dependencias de la especificación | PBI-0013 (permisos del vendedor) y PBI-0043 (modelo de datos) | No bloquean: la feature no cambia permisos ni datos. Si cambian los permisos, la descripción de Perfil cambia con `rol.rules.ts` |

## Decisiones

- **Acordadas** (de la especificación y de las reglas vigentes):
  - D1 a D6 de la [especificación](specification.md#decisiones-del-hito-de-alcance).
  - Sin cambios en el BFF ni en su contrato (REQ-10).
  - `inicialesDeUsuario` en `features/sesion/domain/`, con TDD (STD-18), porque deriva un dato del usuario administrativo, como `rol.rules.ts`.
  - `MenuUsuarioComponent` en `layout/` y `PerfilPage` en `features/sesion/presentation/`: `layout/` no puede importar `presentation/` ([§2.1](../../../../frontend/architecture.md#21-reglas-obligatorias)).
  - Perfil sin `permisoGuard` y sin permiso nuevo: los tres roles tienen sesión, y la página no muestra nada que la sesión no tenga ya.
  - Con D2, en `/perfil` (que no está en el menú) no se despliega ningún grupo, y al llegar a `/perfil` desde otra página los grupos quedan como estaban.
  - El Resumen empieza con todos los bloques desplegados cada vez que se entra a él, también al volver desde otra página: su estado es de la página (REQ-03). El del menú dura mientras se navega (AC-07).
  - Rol en mayúsculas con `text-transform`, no con `toUpperCase()` ([alternativas](#enfoque)).
- **Condicionadas** a las [preguntas del hito](#hito-de-arquitectura):
  - Pregunta 1 (mecanismo del plegado): respondida el 2026-11-12 con A; ya no bloquea T2 ni T3.
  - Pregunta 2 (estado del menú y grupo actual): respondida el 2026-11-12 con A; ya no bloquea T2.
  - Pregunta 3 (menú de usuario): respondida el 2026-11-12 con A; ya no bloquea T4.
  - Con las tres respondidas, ninguna tarea queda bloqueada.
- **ADR necesarios:** ninguno. Las tres preguntas eligen entre piezas que ya permiten STD-04 y [`frontend/architecture.md`](../../../../frontend/architecture.md), sin cambiar reglas, contratos ni datos del navegador.

## Estrategia de pruebas

TDD obligatorio según [STD-18](../../../architecture/standards.md): en esta feature, solo el `domain/` del Admin (`usuario-admin.rules.ts`). El layout, las páginas y los componentes se prueban con e2e derivadas de los AC, que pueden escribirse junto al código. No hay entorno de pruebas de componentes de Angular ([§6](../../../../frontend/architecture.md#6-pruebas)).

| ID | Nivel | Qué verifica | AC | TDD obligatorio | Comando |
|---|---|---|---|---|---|
| TEST-01 | Frontend `domain/` | `inicialesDeUsuario`: «Superadministrador Demo» → «SD», «Vendedor Demo» → «VD», «Ana María Torres» → «AT», «  carlos  » → «C», «Ángel Ruiz» → «ÁR» (también con la tilde descompuesta, `Ángel`), «ñandú pérez» → «ÑP», nombre vacío o solo espacios → primera letra del correo en mayúsculas, sin nombre ni correo → `''` | AC-08, AC-11 | Sí | `npm test --prefix frontend` |
| TEST-02 | Límites de arquitectura | Sonda nueva en [`boundaries.test.mjs`](../../../../frontend/tests/architecture/boundaries.test.mjs): el layout del Admin no puede importar `features/sesion/presentation/` (la regla que obliga a separar el menú de la página Perfil) | — | No | `npm run test:architecture --prefix frontend` |
| TEST-03 | Lint | `templateAccessibility` de angular-eslint sobre los botones y el menú nuevos, y Sheriff | AC-05 | No | `npm run lint --prefix frontend` |
| TEST-04 | E2E, `admin-menu-lateral.spec.ts` (nuevo) | A 1440 px: al entrar por `/login` solo «General» está desplegado y el resto, plegado (AC-02); plegar y desplegar «Catálogo», con `aria-expanded`, los cuatro enlaces en orden y `aria-controls` que apunta a una región que existe (AC-01); con «Ventas» plegado y otro grupo abierto, «Ver» en Últimos pedidos lleva a `/pedidos`, despliega «Ventas», marca «Pedidos» y deja el otro abierto (AC-02); entrar directo a `/pedidos` despliega solo «Ventas»; con teclado, Tab hasta el título, Intro y Espacio cambian el estado y el foco sigue en el botón (AC-05); el `vendedor` ve General, Catálogo (Productos e Inventario) y Ventas (Pedidos), todos plegables y sin grupos vacíos (AC-03); un grupo plegado sigue plegado al navegar y vuelve al estado inicial al recargar y al volver a entrar (AC-07); a 375 px no hay títulos de grupo visibles, se ven los 13 enlaces del `superadmin` y no hay desborde horizontal (AC-13) | AC-01, AC-02, AC-03, AC-05, AC-07, AC-13 | No | `npm run test:e2e` (desde `frontend/`) |
| TEST-05 | E2E, `admin-resumen.spec.ts` (ampliado) | Los cinco bloques tienen botón plegable dentro del `h2` y las tarjetas no (D1); plegar «Pedidos por distrito» oculta su contenido, deja el título con `aria-expanded="false"` y no cambia los demás; al desplegarlo, los mismos datos (AC-04); teclado en un bloque (AC-05); al recargar, todos desplegados (AC-07); el `vendedor` solo tiene botones en los bloques que ve; a 375 px, los bloques se pliegan (AC-13) | AC-04, AC-05, AC-07, AC-13 | No | `npm run test:e2e` |
| TEST-06 | E2E, `admin-menu-usuario.spec.ts` (nuevo) | El botón muestra «SD», «Superadministrador Demo» y «SUPERADMINISTRADOR» (`useInnerText`), y «ADMINISTRADOR» o «VENDEDOR» con los otros roles (AC-08); se abre con clic y con teclado; el panel tiene nombre, correo y rol, y «Perfil» y «Cerrar sesión» en ese orden; Escape lo cierra y devuelve el foco al botón (AC-09); «Cerrar sesión» lleva a `/login` y borra el token de `sessionStorage`, también si el BFF falla (`page.route` aborta el `DELETE`); fuera del menú, la cabecera no tiene «Cerrar sesión» y sí «Actualizar» (AC-10, D6); «Perfil» del `vendedor` lleva a `/perfil` con su nombre, su correo, «Vendedor» y la descripción del rol, sin campos ni botón de guardar, y sin peticiones al BFF al navegar; `admin` y `superadmin` también la abren; sin sesión, `/perfil` lleva a `/login` (AC-12); a 375 px el botón se ve, con las iniciales, y el panel cabe en la pantalla (AC-13) | AC-08, AC-09, AC-10, AC-12, AC-13 | No | `npm run test:e2e` |
| TEST-07 | E2E (en `admin-menu-lateral.spec.ts`) | Con `page.emulateMedia({ reducedMotion: 'reduce' })`, la `transition-duration` calculada de una región del menú y de una del Resumen es `0s`; sin la preferencia, está entre 180 y 260 ms | AC-06 | No | `npm run test:e2e` |
| TEST-08 | Estructura | `npm run validate:structure` (incluido en `verify`): ningún color fijo fuera de `tokens.css` en los estilos y plantillas nuevos (comprobación de la feature 002) | AC-14 | No | `npm run verify` (desde la raíz) |
| TEST-09 | Comparación de capturas | Antes y después con los temas A, B y C: solo cambian la cabecera, los títulos de grupo en escritorio y los encabezados de los cinco bloques, y aparece `/perfil` ([capturas](#capturas-antes-y-después)) | AC-13, AC-14, AC-15 | No | Panel del navegador o [`tools/qa/`](../../../../frontend/tools/qa/), con el BFF sobre una copia de los datos (`WEBSTORE_DATA_FILE`) |

Caracterización: el código que se modifica (`AppLayout` y `ResumenPage`) no está en un área con TDD obligatorio y ya lo cubren `admin-acceso.spec.ts`, `admin-resumen.spec.ts`, `admin-temas.spec.ts` y `admin-modo-demo.spec.ts`. T0 ejecuta el e2e completo en `dev` antes de tocar código y deja el resultado como línea base. Hace de prueba de caracterización.

### Pruebas existentes afectadas

| Prueba | Qué puede cambiar: aserciones o solo valores esperados | Cómo se conserva la cobertura |
|---|---|---|
| [`admin-acceso.spec.ts`](../../../../frontend/tests/e2e/admin-acceso.spec.ts), «recorre todos los módulos» | Aserciones: se añade `desplegarTodos(page)` antes de contar los 13 enlaces y de recorrerlos (el recorrido conserva los grupos abiertos), y el cierre de sesión pasa a `cerrarSesionAdmin(page)` | Mismos 13 módulos con su título y su encabezado, y el mismo cierre de sesión |
| `admin-acceso.spec.ts`, «el vendedor no ve Usuarios…» | Aserciones: se añade `desplegarTodos(page)` antes de las comprobaciones de visibles y de ausentes | Las ausencias se comprueban con todos los grupos desplegados, así que siguen detectando un permiso de más |
| [`admin-temas.spec.ts`](../../../../frontend/tests/e2e/admin-temas.spec.ts), `abrirTemas` | Aserciones: `desplegarGrupo(page, 'Tienda')` antes de pulsar «Temas» | Mismo recorrido |
| `admin-temas.spec.ts`, «no tiene Temas en el menú» | Aserciones: `desplegarTodos(page)` antes de comprobar que «Temas» no está | Igual que con el vendedor de `admin-acceso` |
| [`admin-modo-demo.spec.ts`](../../../../frontend/tests/e2e/admin-modo-demo.spec.ts), «la tuerca no tapa el menú» | Solo el localizador: el botón del menú de usuario sustituye a «Cerrar sesión» | Se comprueba lo mismo: el control de la cabecera que está más cerca de la tuerca |
| [`admin-resumen.spec.ts`](../../../../frontend/tests/e2e/admin-resumen.spec.ts) | Ninguna: los `h2` conservan nombre y orden con el botón dentro. Se amplía con TEST-05 | Se ejecuta igual |
| [`rol.rules.spec.mjs`](../../../../frontend/projects/admin/src/app/features/sesion/domain/rol.rules.spec.mjs) | Ninguna | `rol.rules.ts` no cambia |
| [`cdp-admin-qa.mjs`](../../../../frontend/tools/qa/cdp-admin-qa.mjs) (script de QA, no prueba) | El cierre de sesión abre el menú de usuario y elige «Cerrar sesión»; `visibleNavigation` despliega los grupos antes de leer los enlaces | Mismo informe |

### Capturas antes y después

Con el mismo método, las mismas rutas y los mismos anchos en las dos tomas ([comparar capturas](../../../development/agent-execution.md#comparar-capturas)), con `superadmin` y el BFF sobre una copia de los datos. Cada ruta con los temas A, B y C.

| Pantalla o ruta | Anchos | Cambio visual esperado |
|---|---|---|
| Resumen (`/`), estado inicial | 1440 y 375 px | Cabecera con el menú de usuario; en escritorio, títulos de grupo como botones con indicador, solo «General» desplegado; encabezados de los cinco bloques con indicador. En móvil, la tira del menú igual |
| Resumen con «Pedidos por distrito» y «Últimos pedidos» plegados | 1440 y 375 px | Solo los encabezados de esos bloques; los vecinos, con su alto |
| Resumen con el menú de usuario abierto | 1440 y 375 px | Panel con nombre, correo, rol, «Perfil» y «Cerrar sesión», dentro de la pantalla |
| Productos (`/productos`) | 1440 y 375 px | Solo la cabecera y el menú lateral («Catálogo» desplegado); el contenido, igual |
| Perfil (`/perfil`) | 1440 y 375 px | Página nueva (solo «después») |
| Acceso (`/login`) | 1440 y 375 px | Ninguno |

### Ejecución prevista

Orden por dependencias. Ninguna tarea arranca antes del [hito de arquitectura](#hito-de-arquitectura). Las ⚠ no se delegan ([reglas de escalado](../../../development/agent-execution.md#reglas-de-escalado)).

| Paso o tarea | Nivel y esfuerzo sugeridos | E2E | Criterios de aprobación (si es ⚠) |
|---|---|---|---|
| T0. Capturas «antes» de A, B y C en `dev` y e2e completo como línea base | ligero · medio | Sí | — |
| T1. `inicialesDeUsuario` con TDD (TEST-01) y la sonda de límites (TEST-02) | estándar · medio | No | — |
| T2. ⚠ Clases `ws-plegable*`, menú lateral plegable en `AppLayout`, ayudas `desplegarGrupo` y `desplegarTodos`, TEST-04 y TEST-07, y `admin-acceso` y `admin-temas` adaptadas | avanzado · alto | Sí | TEST-04 y TEST-07 en verde, y el e2e del Admin completo en verde. Las comprobaciones de ausencia se hacen con todos los grupos desplegados. La captura a 375 px del menú es igual a la de T0 con B. Ningún `localStorage` ni `sessionStorage` nuevo |
| T3. Bloques plegables del Resumen y TEST-05 | estándar · alto | Sí | — |
| T4. ⚠ `MenuUsuarioComponent`, cabecera sin el nombre, el rol y «Cerrar sesión» sueltos, `ws-menu-usuario-panel`, ayudas `abrirMenuUsuario` y `cerrarSesionAdmin`, TEST-06 (salvo Perfil), `admin-modo-demo` adaptada y `cdp-admin-qa.mjs` | avanzado · alto | Sí | TEST-06 en verde (salvo Perfil), con el cierre de sesión con el BFF caído. Escape devuelve el foco al botón. «Actualizar» sigue y recarga el snapshot. A 375 px el panel cabe y la página no desborda. `cdp-admin-qa.mjs` corre hasta el final |
| T5. `PerfilPage`, ruta `perfil` y la parte de Perfil de TEST-06 | estándar · medio | Sí | — |
| T6. ⚠ Capturas «después» con A, B y C y comparación (TEST-09), `npm run verify` y e2e completo | avanzado · alto | Sí | Sebastián aprueba las capturas: solo cambia lo de la [tabla](#capturas-antes-y-después). `verify` y el e2e completo en verde. Sin errores de consola |
| T7. Documentos afectados | estándar · medio | No | — |

Bloques sugeridos para `sdd-implement`:

1. Base: T0 y T1.
2. Plegables: T2 y T3.
3. Menú de usuario y Perfil: T4 y T5.
4. Cierre: T6 y T7.

## Documentos afectados

- [`frontend/architecture.md`](../../../../frontend/architecture.md): §3, `layout/ (AppLayout, MenuUsuarioComponent)` y `sesion/ (login, perfil, roles y permisos, guards)`; §6, `usuario-admin.rules.spec.mjs` en las unitarias y las e2e nuevas.
- [`frontend/docs/VISUAL-SYSTEM.md`](../../../../frontend/docs/VISUAL-SYSTEM.md): plegables del Admin (indicador, 200 ms y movimiento reducido), menú de usuario y la excepción del rol en mayúsculas, que no es una etiqueta sobre un título.
- [Glosario](../../../architecture/glosario.md): «Perfil», la página de solo lectura de la cuenta de la sesión (`PerfilPage`, `/perfil`), y `inicialesDeUsuario` en la fila «Usuario administrativo».
- [Trazabilidad](../../../planning/TRACEABILITY.md): filas de los plegables, el menú de usuario y Perfil.
- [Backlog](../../../planning/backlog.md): estado de PBI-0031 y PBI-0032 al entregar.
- El contrato del BFF, `backend/architecture.md` y los ADR no cambian.

## Hito de arquitectura

Se pide aprobar:

- las responsabilidades por capa, con el menú de usuario en `layout/` y Perfil en `features/sesion/`;
- que no cambian el BFF, el contrato, las dependencias entre features ni los datos del navegador;
- las decisiones acordadas y la estrategia de pruebas, con TDD solo en `inicialesDeUsuario`;
- y estas tres preguntas, que se presentan de una en una.

### Pregunta 1. ¿Con qué se construye el plegado?

| Alternativa | Qué significa |
|---|---|
| **A. Botón nativo de divulgación, estado en signals y dos clases CSS compartidas (recomendada)** | Un `<button>` con `aria-expanded` y `aria-controls` en cada título de grupo y cada encabezado de bloque, como el patrón de divulgación de WAI-ARIA. El estado lo guarda quien muestra el elemento. `ws-plegable` y `ws-plegable-indicador`, en el `styles.css` del Admin, animan en 200 ms y no animan con movimiento reducido. Sin dependencias nuevas, y cada sitio conserva su marcado y su diseño |
| B. CDK Accordion (`CdkAccordionItem`) | El CDK guarda `expanded` y genera el id, pero los atributos ARIA, el marcado y la animación se escriben igual que en A. En el menú, el estado depende de la ruta, así que habría que sincronizar la ruta con el estado del CDK |
| C. `MatExpansionPanel` de Angular Material | Teclado y ARIA resueltos, pero con el diseño de Material (cabecera, relleno y sombra). Conservar el del Admin exige sobrescribir internals, prohibido por STD-04, o aceptar un cambio visual no pedido (STD-12) |

Evidencia: STD-04 pide Material o CDK para diálogos, menús, selects, foco y overlays; un plegable no es ninguno de ellos. Los encabezados del Resumen tienen contenidos distintos ([`resumen.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/resumen.page.ts)), y en móvil el menú es una tira con `display: contents` ([`app.layout.ts`](../../../../frontend/projects/admin/src/app/layout/app.layout.ts)).

### Pregunta 2. ¿Dónde vive el estado del menú lateral y cómo se sabe el grupo actual?

| Alternativa | Qué significa |
|---|---|
| **A. En `AppLayout`, con `isActive()` del router y un `linkedSignal` (recomendada)** | El grupo actual sale del mismo cálculo que ya marca el enlace activo (`routerLinkActive`, con `exact` para `/`), así que no hay una regla nueva que pueda discrepar. El estado muere con el layout: al cerrar sesión se va a `/login`, y al volver a entrar empieza de cero (AC-07). Se prueba con e2e (TEST-04), sin prueba unitaria |
| B. Regla pura `grupoDeRuta(url)` y la lista `NAVIGATION` en `features/sesion/domain/`, con TDD | Prueba unitaria de la regla, pero duplica la lógica de coincidencia del router (consultas como `?pedido=`, `/` exacto) y mueve el menú del shell a la feature de sesión, que trata de acceso, roles y permisos |
| C. Un servicio raíz con el estado | Sobrevive a todo el uso de la aplicación: al cerrar sesión y volver a entrar, el menú conservaría lo plegado, contra AC-07, salvo que se reinicie a mano al cerrar sesión |

Evidencia: `isActive(url, router, matchOptions)` es pública desde Angular 21.1 y sustituye a `Router.isActive`, obsoleta. El proyecto usa Angular 22 ([`package.json`](../../../../frontend/package.json)). `AppLayout` es el componente de la ruta padre de todas las páginas con sesión ([`app.routes.ts`](../../../../frontend/projects/admin/src/app/app.routes.ts)), y `routerLinkActive` ya marca la página actual en [`app.layout.ts`](../../../../frontend/projects/admin/src/app/layout/app.layout.ts).

### Pregunta 3. ¿Cómo se construye el menú de usuario?

| Alternativa | Qué significa |
|---|---|
| **A. `MatMenu` de Angular Material en `layout/menu-usuario.component.ts` (recomendada)** | El mismo componente que la tuerca de temas del Admin: teclado, foco, Escape y overlay resueltos. El bloque de la cuenta (nombre, correo y rol) va arriba del panel como texto, enlazado con `aria-describedby`, y «Perfil» y «Cerrar sesión» son `mat-menu-item`. El panel toma los colores del tema con las variables `--mat-menu-*`, como `ws-selector-tema-panel` |
| B. CDK Menu (`cdkMenuTriggerFor`) | Sin estilos de Material: todo el panel se diseña desde cero. Sería el primer uso en el proyecto, con un patrón distinto al de la tuerca |
| C. Panel propio con CDK Overlay, sin rol de menú | Encaja mejor con un bloque de información, pero hay que programar el foco, Escape y el clic fuera, y STD-04 pide Material o CDK para los menús |

Evidencia: [`selector-tema.component.ts`](../../../../frontend/projects/admin/src/app/features/temas/presentation/selector-tema.component.ts) del Admin ya usa `MatMenu` con un título que no es una opción, y [`styles.css`](../../../../frontend/projects/admin/src/styles.css) del Admin le pone los tokens del tema. La especificación pide los menús «con Angular Material o CDK (STD-04)».

### Respuestas del hito

Las preguntas se presentaron de una en una. Sebastián Avila las respondió desde su sesión principal, que trajo cada respuesta a la sesión de esta etapa; la 2 la respondió también en esta sesión.

| Pregunta | Decisión | Alternativas descartadas | Ajustes pedidos y dónde quedan |
|---|---|---|---|
| 1. Plegado | **A. Botón nativo de divulgación, estado en signals y dos clases CSS compartidas.** Elegida por Sebastián Avila el 2026-11-12 («A. Botón nativo (Recomendado)») | B. CDK Accordion (los atributos ARIA, el marcado y la animación se escriben igual, y en el menú habría que sincronizar el estado del CDK con la ruta); C. `MatExpansionPanel` (trae el diseño de Material: cambio visual no pedido o internals sobrescritos, contra STD-04 y STD-12) | Ninguno |
| 2. Estado del menú y grupo actual | **A. En `AppLayout`, con `isActive()` del router y un `linkedSignal`.** Elegida por Sebastián Avila el 2026-11-12 en esta sesión («A: AppLayout e isActive») y confirmada en su sesión principal («A. En AppLayout (Recomendado)») | B. Regla `grupoDeRuta(url)` y `NAVIGATION` en `features/sesion/domain/` con TDD (repite la coincidencia del router y lleva el menú a la feature de sesión); C. servicio raíz (sobrevive al cierre de sesión, contra AC-07) | Ninguno |
| 3. Menú de usuario | **A. `MatMenu` de Angular Material en `layout/menu-usuario.component.ts`**, con el patrón de la tuerca de temas: bloque de la cuenta enlazado con `aria-describedby`, «Perfil» y «Cerrar sesión» como `mat-menu-item` y panel `ws-menu-usuario-panel` con tokens. Elegida por Sebastián Avila el 2026-11-12 («A. MatMenu (Recomendado)») | B. CDK Menu (panel desde cero y primer uso en el proyecto, distinto de la tuerca); C. panel propio con CDK Overlay (foco, Escape y clic fuera a mano, y STD-04 pide Material o CDK para los menús) | Ninguno |

Con las tres respuestas, el hito queda cerrado. Las capas, el BFF y el contrato sin cambios, las decisiones acordadas y la estrategia de pruebas (TDD solo en `inicialesDeUsuario`) se presentaron con las preguntas y no recibieron objeciones. No hace falta ningún ADR.
