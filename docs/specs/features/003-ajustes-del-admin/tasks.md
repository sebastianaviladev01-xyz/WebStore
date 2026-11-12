# 003. Ajustes del Admin — Tareas

- Feature: `003-ajustes-del-admin`
- Especificación: [specification.md](specification.md) (aprobada el 2026-11-12, PR #17; D1 a D6)
- Plan: [planning.md](planning.md) (hito de arquitectura aprobado el 2026-11-12, PR #18; alternativa A en las tres preguntas)
- ADR: ninguno necesario ([decisiones del plan](planning.md#decisiones))
- Fecha: 2026-11-12
- Estado: aprobado por Sebastián Avila el 2026-11-12 («Sí, apruébalas»), con los [ajustes respecto al plan](#ajustes-respecto-al-plan): ⚠ también en los bloques del Resumen y en Perfil, y Perfil antes del menú de usuario

Las rutas de código son relativas a la raíz del repositorio. Los TEST son los de la [estrategia de pruebas del plan](planning.md#estrategia-de-pruebas); los nombres, tipos e ids, los de [tipos intermedios](planning.md#tipos-intermedios-y-nombres), y el comportamiento de los botones, las regiones y el menú, el [acordado en el plan](planning.md#tipos-intermedios-y-nombres) («Comportamiento acordado de los controles»). Ninguna tarea los vuelve a decidir.

## Traspaso

Permite empezar el bloque siguiente sin releer la feature. La actualiza la última tarea del bloque, en su mismo commit ([guía](../../../development/agent-execution.md#traspaso)).

| Campo | Contenido |
|---|---|
| Punta de la rama | Sin implementación. La rama `feature/003-ajustes-del-admin` se crea de nuevo desde `dev` cuando se fusione el PR de estas tareas, en el worktree `.worktrees/003-ajustes-del-admin` |
| Siguiente bloque | Bloque 1 (fase 1): TASK-01 y TASK-02. Empieza por TASK-01, las capturas «antes» y la línea base del e2e, antes de tocar código |
| Decisiones de ejecución | Ninguna todavía. Los [ajustes del desglose al plan](#ajustes-respecto-al-plan) están aprobados con estas tareas |
| Riesgos abiertos | Los de [Dependencias y riesgos](planning.md#dependencias-y-riesgos) del plan. El principal, desde ⚠ TASK-03: con los grupos plegados, Playwright no encuentra los enlaces del menú, y un `toHaveCount(0)` pasaría siempre. Las comprobaciones de ausencia se hacen con todos los grupos desplegados |
| Entorno | Worktree sin `node_modules`: `npm run setup` en TASK-01. Servidores del worktree en 3400, 4400 y 4500 ([reglas](#reglas)), nunca a la vez que la suite e2e. Copia de datos: `backend/data-capturas.json`, creada en TASK-01. Capturas «antes» en `frontend/output/visual-qa/003-ajustes-del-admin/antes` |

## Reglas

- **TDD.** En esta feature, el único código de un área de [STD-18](../../../architecture/standards.md) es `inicialesDeUsuario`, en `features/sesion/domain/` del Admin. TASK-02 escribe TEST-01 primero y lo ve en rojo con `node --test projects/admin/src/app/features/sesion/domain/usuario-admin.rules.spec.mjs` (desde `frontend/`) antes del código. El layout, las páginas y el componente nuevo se prueban con e2e derivadas de los AC, que se escriben junto al código. La caracterización de `AppLayout` y `ResumenPage` es la línea base del e2e completo de TASK-01 ([estrategia del plan](planning.md#estrategia-de-pruebas)).
- **Evidencia.** Una tarea solo se marca `hecha` con evidencia: su fila en `verification.md` (comando y resultado de cada control) en el mismo commit ([guía](../../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). La primera línea dice con qué se ejecutó: herramienta, modelo real, esfuerzo y si fue delegada. Los SHA se rellenan en un commit `docs` al cerrar cada fase. TASK-01 crea `verification.md` desde la [plantilla](../../templates/verification-template.md).
- **Capturas** ([STD-12](../../../architecture/standards.md)). Las tareas con `Sí` en Capturas comparan contra las tomas de TASK-01 con el mismo método, las mismas rutas, los mismos anchos (1440 y 375 px), la misma copia de datos y la misma sesión de `superadmin` ([capturas del plan](planning.md#capturas-antes-y-después)). `cdp-visual-qa.mjs` no admite 375 px (sus anchos fijos incluyen 390 y 360), así que TASK-01 elige el método, un guion de Playwright con el Chrome instalado o el panel del navegador, y lo usan todas las tomas. El resultado es «Iguales» o la lista de diferencias, cada una con el AC que la pide. Las tareas ⚠ intermedias capturan con B; ⚠ TASK-07 repite todo con A, B y C.
- **Datos** ([STD-09](../../../architecture/standards.md)). Nunca se escribe `backend/data.json`; su hash se comprueba antes y después de cada tarea con servidores. `WEBSTORE_DATA_FILE` lleva siempre una ruta absoluta. `backend/data-capturas.json` sale de la semilla y no se modifica entre tomas, salvo para activar A o C por la API del Admin, y vuelve a B al terminar cada toma. La feature no cambia el BFF ni su estado.
- **Servidores.** Los puertos 3000, 4200 y 4300, y las configuraciones de `.claude/launch.json` que apuntan a ellos, no se usan: pueden estar ocupados por la demo del checkout principal. Los servidores del worktree se levantan en segundo plano desde el worktree, en los puertos de las e2e: BFF en 3400 (`node backend/src/main.mjs` con `PORT`, `WEBSTORE_DATA_FILE` y `WEBSTORE_ALLOWED_ORIGINS=http://localhost:4400,http://localhost:4500`) y Admin en 4500 (`npx ng serve admin --port 4500 --proxy-config proxy.e2e.conf.json`, desde `frontend/`), como en [Puertos de las capturas](../../../development/local-environment.md#puertos-de-las-capturas). **Nunca a la vez que la suite e2e**, que usa los mismos puertos: se detienen antes de `npm run test:e2e` y al terminar la tarea.
- **Contrato.** Sin cambios en el BFF, en `BFF-CONTRACT.md` ni en el smoke test (REQ-10). Si una tarea necesitara cambiarlos, se detiene y lo pregunta.
- **Navegador.** Ningún `localStorage`, `sessionStorage` ni cookie nuevos ([STD-08](../../../architecture/standards.md), D4): las tareas del plegado lo comprueban en su diff.
- **Controles.** Cada tarea que toca `frontend/` ejecuta `npm run verify` sobre el árbol del commit (incluye TEST-02, TEST-03 y TEST-08) y Prettier sobre los archivos tocados. E2E según la columna **E2E** y completo al cerrar cada fase, en segundo plano ([controles](../../../development/agent-execution.md#controles-proporcionados)). No se pasa Prettier por los `.md` de `docs/`.
- **⚠.** Las tareas de alto impacto (en esta feature, los cambios visuales pedidos) llevan ⚠, no se delegan y tienen un hito de revisión humana antes y un paquete de revisión después ([disparadores](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional)).
- **Commits** en español, con [Conventional Commits](../../../git/conventional-commits.md). Los agentes no hacen push a `dev` ni fusionan. La implementación se publica en un único PR de la rama hacia `dev`, después de `sdd-verify`.

### Nivel y esfuerzo resueltos en el catálogo

La columna **Nivel y esfuerzo** dice el nivel, no el modelo. Resueltos en el [catálogo](../../../../.agents/execution-catalog.json) (versión 1.0.0, `harnesses`):

| Tareas | Nivel y esfuerzo | Claude Code | Codex (provisional) | Delegable |
|---|---|---|---|---|
| TASK-01 | estándar · medio | `claude-sonnet-5-5`, `medium` (alias `sonnet`) | `gpt-5.6-sol`, `medium` | Sí |
| TASK-02 | estándar · alto | `claude-sonnet-5-5`, `high` (alias `sonnet`) | `gpt-5.6-sol`, `high` | Sí |
| ⚠ TASK-03, ⚠ TASK-04, ⚠ TASK-06 y ⚠ TASK-07 | avanzado · alto | `claude-opus-5-5`, `high` | `gpt-5.6-sol`, `high` | No: agente principal |
| ⚠ TASK-05 | avanzado · medio | `claude-opus-5-5`, `medium` | `gpt-5.6-sol`, `medium` | No: agente principal |
| TASK-08 | estándar · medio | `claude-sonnet-5-5`, `medium` (alias `sonnet`) | `gpt-5.6-sol`, `medium` | Sí |

El agente principal de cada bloque trabaja en avanzado. Si delega TASK-01, TASK-02 o TASK-08, lo hace con un brief cerrado y revisa el diff y la evidencia antes del commit ([delegar](../../../development/agent-execution.md#delegar-por-nivel-y-esfuerzo)).

## Ajustes respecto al plan

La [ejecución prevista](planning.md#ejecución-prevista) del plan sugería T0 a T7, cuatro bloques y ⚠ en T2, T4 y T6. Este desglose numera las tareas de TASK-01 a TASK-08 y cambia lo siguiente. Ninguna decisión del plan cambia:

| Ajuste | Motivo |
|---|---|
| ⚠ también en los bloques del Resumen (T3, ahora ⚠ TASK-04) y en Perfil (T5, ahora ⚠ TASK-05). Pasan a avanzado y no se delegan. Hay seis bloques en lugar de cuatro | `sdd-tasks` marca con ⚠ todo cambio visual pedido, y los dos lo son ([interfaz de la especificación](specification.md#interfaz)). La feature 002 hizo el mismo ajuste |
| Perfil (⚠ TASK-05) va antes del menú de usuario (⚠ TASK-06). TASK-05 crea `admin-menu-usuario.spec.ts` con la parte de Perfil de TEST-06, por URL directa, y TASK-06 añade el resto y que «Perfil» del menú lleve a `/perfil` | Las rutas del Admin no tienen ruta comodín ([`app.routes.ts`](../../../../frontend/projects/admin/src/app/app.routes.ts)): con el orden del plan, entre T4 y T5 «Perfil» llevaría a una ruta inexistente y daría un error del router. Así cada commit de la rama queda completo |
| TEST-07 se reparte: la región del menú, en ⚠ TASK-03; la del Resumen, en ⚠ TASK-04, las dos en `admin-menu-lateral.spec.ts` | La región del Resumen no existe hasta TASK-04 |
| `visibleNavigation` de `cdp-admin-qa.mjs` despliega los grupos en ⚠ TASK-03, y el cierre de sesión del guion cambia en ⚠ TASK-06 | Desde TASK-03 el guion dejaría de leer los enlaces plegados; el plan cambiaba las dos cosas en T4 |
| `admin-acceso.spec.ts` añade `desplegarTodos` en ⚠ TASK-03 y `cerrarSesionAdmin` en ⚠ TASK-06 | Cada cambio va con la pieza que lo provoca |
| TASK-01 es estándar · medio, no ligero · medio | Los guiones de captura y de activar temas de la feature 002 vivían en `frontend/output/` (ignorado por git) y no están en el repositorio. Escribirlos y elegir el método para 375 px es trabajo con decisiones locales |

## Fases

| Fase | Objetivo |
|---|---|
| 1 | Capturas «antes» con A, B y C, línea base del e2e e iniciales con TDD (TEST-01 y TEST-02) |
| 2 | Plegado del menú lateral y de los bloques del Resumen, con sus e2e (TEST-04, TEST-05 y TEST-07) |
| 3 | Perfil y menú de usuario, con sus e2e (TEST-06) |
| 4 | Capturas «después» con A, B y C y su comparación (TEST-09), controles completos y documentos |

## Bloques de sesión

Cada bloque se ejecuta en una sesión nueva sobre el worktree ([guía](../../../development/agent-execution.md#una-sesión-por-bloque)) y termina antes de cada tarea ⚠. Un bloque que empieza con una ⚠ la prepara y se detiene con su paquete de revisión; con la aprobación (en esa sesión o al empezar la siguiente) hace su commit y sigue con el resto del bloque. Al terminar un bloque, el agente informa y espera un sí explícito antes del siguiente.

| Bloque | Tareas | Termina antes de (⚠) | Qué se revisa al cerrarlo |
|---|---|---|---|
| 1 | TASK-01 y TASK-02 (fase 1) | ⚠ TASK-03 | Capturas «antes» completas, línea base del e2e e iniciales con TDD |
| 2 | ⚠ TASK-03 | ⚠ TASK-04 | Menú lateral plegable, con la tira móvil igual y las e2e adaptadas |
| 3 | ⚠ TASK-04 (cierra la fase 2) | ⚠ TASK-05 | Bloques del Resumen plegables; e2e completo de la fase |
| 4 | ⚠ TASK-05 | ⚠ TASK-06 | Página Perfil de solo lectura |
| 5 | ⚠ TASK-06 (cierra la fase 3) | ⚠ TASK-07 | Menú de usuario y cabecera; e2e completo de la fase |
| 6 | ⚠ TASK-07 y TASK-08 (cierra la fase 4) | — (sigue `sdd-verify`) | Capturas con A, B y C frente a la base; documentos |

## Tareas

| ID | Fase | Descripción | Capa | REQ/AC | TEST primero | Depende de | Riesgo | Nivel y esfuerzo | E2E | Capturas | Evidencia esperada | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-01 | 1 | Línea base antes de tocar código. Worktree `.worktrees/003-ajustes-del-admin` y `npm run setup`. BFF en 3400 con `backend/data-capturas.json` (creada desde la semilla) y Admin en 4500. Con la cuenta `superadmin` sembrada, capturas de `/login`, `/` y `/productos` a 1440 y 375 px con B, y con A y C activados por la API del Admin (B activo al terminar). Guiones de captura y de activar tema en la carpeta de capturas. Consola de cada ruta. Servidores detenidos y e2e completo como línea base de caracterización. Crear `verification.md` desde su plantilla | QA visual y e2e (Admin) | REQ-11 / AC-13, AC-14, AC-15 | — (toma «antes» de TEST-09; el e2e es la caracterización) | — | Medio: usar los puertos de la demo o escribir en `backend/data.json`; dejar A o C activo en la copia; olvidar una ruta, un ancho o un tema | estándar · medio | Sí (completo, línea base) | Sí: `/login`, `/` y `/productos`, a 1440 y 375 px, con A, B y C | `frontend/output/visual-qa/003-ajustes-del-admin/antes/{a,b,c}` con un `LEEME.md` (SHA base, rutas, anchos, temas, método y fecha); los guiones; resultado del e2e completo (número de pruebas y fallos, si los hay, con su causa); mensajes de consola de la base; hash de `backend/data.json` igual antes y después; B activo en la copia; servidores detenidos; `verification.md` creado; Traspaso con la copia y el método | pendiente |
| TASK-02 | 1 | `projects/admin/src/app/features/sesion/domain/usuario-admin.rules.ts` con `inicialesDeUsuario(nombre, correo)` y su `usuario-admin.rules.spec.mjs`, con el patrón de `rol.rules.spec.mjs` (transpila el `.ts` con `typescript`). Casos de TEST-01 del plan. Después, la sonda de TEST-02 en `frontend/tests/architecture/boundaries.test.mjs`: `layout/` del Admin no puede importar `features/sesion/presentation/` | Admin `features/sesion/domain/` y pruebas de arquitectura | REQ-09 / AC-08, AC-11 | TEST-01; después TEST-02 | TASK-01 (crea `verification.md`) | Bajo: tildes descompuestas (NFC), letras fuera del BMP (puntos de código, no unidades UTF-16) y nombres con varios espacios | estándar · alto | No | No | Rojo de TEST-01 (sin el módulo) y verde con los casos del plan: «SD», «VD», «AT», «C», «ÁR» (también con `Ángel` descompuesto), «ÑP», correo con nombre vacío o de espacios y `''` sin nombre ni correo; TEST-02 en verde, y en rojo con la importación prohibida de la sonda; `npm run verify`; Prettier | pendiente |
| ⚠ TASK-03 | 2 | Clases `ws-plegable`, `ws-plegable-lg`, `ws-plegable-contenido` y `ws-plegable-indicador` en `projects/admin/src/styles.css` (200 ms; `transition: none` con `prefers-reduced-motion`). En `AppLayout`: `NavigationGroup.id`, título de grupo como `<button>` `hidden lg:flex` con `aria-expanded`, `aria-controls="menu-grupo-<id>"` y chevron `aria-hidden`; región con `display: contents` bajo `lg:`; `paginaActual` con `isActive()`, `gruposAbiertos` con `linkedSignal`, `alternarGrupo` y `grupoAbierto`. Ayudas `desplegarGrupo` y `desplegarTodos` en `tests/e2e/apoyo/entorno.ts`. `admin-menu-lateral.spec.ts` nuevo (TEST-04 y la parte del menú de TEST-07). `admin-acceso.spec.ts` y `admin-temas.spec.ts` adaptadas como dice el plan. `visibleNavigation` de `tools/qa/cdp-admin-qa.mjs` despliega los grupos | Admin `layout/`, estilos, e2e y QA | REQ-01, REQ-02, REQ-04, REQ-11, REQ-12 / AC-01, AC-02, AC-03, AC-05, AC-06, AC-07, AC-13 | — (no es área de STD-18; TEST-04 y TEST-07 junto al código) | TASK-01 | Alto: comprobaciones de ausencia que pasan siempre con los grupos plegados; la tira móvil cambia sin querer; `paginaActual` sin valor en la navegación inicial | avanzado · alto | Sí | Sí: `/`, `/productos` y `/login`, a 1440 y 375 px, con B | TEST-04 y TEST-07 (menú) en verde; e2e completo en verde; `admin-acceso` y `admin-temas` con las ausencias comprobadas tras `desplegarTodos`; capturas frente a TASK-01: a 375 px «Iguales», a 1440 px solo los títulos de grupo, con «General» desplegado en `/` y «Catálogo» en `/productos`; ningún `localStorage`, `sessionStorage` ni cookie nuevos en el diff; `cdp-admin-qa.mjs` corre hasta el final; `npm run verify` (TEST-03); Prettier | pendiente |
| ⚠ TASK-04 | 2 | En `ResumenPage`: tipo `BloqueResumen`, `bloquesPlegados`, `alternarBloque` y `bloqueAbierto`; botón plegable dentro del `h2` de los cinco bloques con título, regiones `bloque-<id>` (el `id="ultimos-pedidos"` del `h2` no cambia), subtítulos dentro de la región y `self-start` en el bloque plegado. La fila de tarjetas no cambia (D1). `admin-resumen.spec.ts` ampliado (TEST-05) y la parte del Resumen de TEST-07 | Admin `features/tienda/presentation/` y e2e | REQ-03, REQ-04, REQ-11, REQ-12 / AC-04, AC-05, AC-06, AC-07, AC-13 | — (TEST-05 y TEST-07 junto al código) | ⚠ TASK-03 (clases `ws-plegable*`) | Medio: un bloque plegado se estira al alto de la fila; el encabezado de «Últimos pedidos», con enlace y `pb-4`, queda descuadrado; cambiar el nombre o el orden de los `h2` | avanzado · alto | Sí (completo, cierra la fase 2) | Sí: `/` inicial, y con «Pedidos por distrito» y «Últimos pedidos» plegados, a 1440 y 375 px, con B | TEST-05 y TEST-07 (Resumen) en verde, con las aserciones previas de `admin-resumen.spec.ts` sin cambios; e2e completo en verde; capturas: en `/` inicial, frente a ⚠ TASK-03, solo cambian los encabezados de los cinco bloques; con bloques plegados, solo sus encabezados y los vecinos con su alto; `npm run verify`; Prettier | pendiente |
| ⚠ TASK-05 | 3 | `PerfilPage` (`ws-admin-perfil`) en `projects/admin/src/app/features/sesion/presentation/perfil.page.ts`: nombre, correo, etiqueta y descripción del rol con `session.user()` y `definicionDeRol(session.role())`, sin campos ni botones ni llamadas al BFF. Ruta hija `perfil` del layout en `app.routes.ts`, con `loadComponent` y título `WebStore Admin \| Perfil`, sin `permisoGuard`. `admin-menu-usuario.spec.ts` nuevo con la parte de Perfil de TEST-06 por URL directa | Admin `features/sesion/presentation/`, rutas y e2e | REQ-08, REQ-10, REQ-11 / AC-12, AC-13 | — (TEST-06, parte de Perfil, junto al código) | ⚠ TASK-04 (orden de bloques; no usa su código) | Bajo: pedir datos al BFF al entrar; olvidar que sin sesión debe llevar a `/login` | avanzado · medio | Sí | Sí: `/perfil` a 1440 y 375 px con B, para los tres roles («después» solo) | Parte de Perfil de TEST-06 en verde: los tres roles abren `/perfil` y ven su nombre, correo, rol y descripción; sin campos ni botón de guardar; ninguna petición al BFF al navegar a `/perfil` desde otra página; sin sesión, `/login`; e2e completo en verde; capturas de `/perfil` en el paquete; TEST-02 sigue en verde; `npm run verify`; Prettier | pendiente |
| ⚠ TASK-06 | 3 | `MenuUsuarioComponent` (`ws-admin-menu-usuario`) en `projects/admin/src/app/layout/menu-usuario.component.ts`: botón con el círculo de iniciales (`aria-hidden`), nombre recortado y rol con `uppercase`; nombre y rol en `sr-only` bajo `sm:`; `MatMenu` con el bloque de la cuenta enlazado por `aria-describedby`, «Perfil» (`routerLink="/perfil"`) y «Cerrar sesión» (`cerrarSesion()`). Clase `ws-menu-usuario-panel` con tokens, como `ws-selector-tema-panel`. Cabecera de `AppLayout` con «Actualizar» y el menú, sin el nombre, el rol ni «Cerrar sesión» sueltos; se borra `AppLayout.logout()`. Ayudas `abrirMenuUsuario` y `cerrarSesionAdmin`. Resto de TEST-06 en `admin-menu-usuario.spec.ts`; `admin-acceso.spec.ts` con `cerrarSesionAdmin`; localizador de `admin-modo-demo.spec.ts`; cierre de sesión de `cdp-admin-qa.mjs` | Admin `layout/`, estilos, e2e y QA | REQ-05, REQ-06, REQ-07, REQ-09, REQ-10, REQ-11 / AC-08, AC-09, AC-10, AC-12, AC-13, AC-14 | — (TEST-06 junto al código) | TASK-02 (`inicialesDeUsuario`), ⚠ TASK-05 (ruta `/perfil`) | Alto: perder el cierre de sesión con el BFF caído; el foco no vuelve al botón; el panel desborda a 375 px o tapa la tuerca del modo demo; colores de Material en el panel | avanzado · alto | Sí (completo, cierra la fase 3) | Sí: `/` con el menú cerrado y abierto, y `/productos`, a 1440 y 375 px, con B | TEST-06 completo en verde: «SD», «Superadministrador Demo» y «SUPERADMINISTRADOR» (`useInnerText`), y los otros dos roles; clic y teclado; orden del panel; Escape devuelve el foco; cierre de sesión con el `DELETE` abortado; «Actualizar» sigue y «Cerrar sesión» no está fuera del menú; «Perfil» lleva a `/perfil`; a 375 px el panel cabe y la página no desborda; `admin-modo-demo` en verde; e2e completo en verde; `cdp-admin-qa.mjs` corre hasta el final; capturas: solo cambia la cabecera; `npm run verify`; Prettier | pendiente |
| ⚠ TASK-07 | 4 | Capturas «después» de la [tabla del plan](planning.md#capturas-antes-y-después) con A, B y C, a 1440 y 375 px, con el método y la copia de TASK-01, y comparación con las «antes» (TEST-09). Paquete de revisión con los pares y las diferencias. `npm run verify` (TEST-08) y e2e completo. Consola de cada ruta | QA visual y controles (Admin) | REQ-11 / AC-13, AC-14, AC-15 | — | ⚠ TASK-06 | Medio: una diferencia no pedida (la tira móvil, el contenido de las páginas); A o C activos al terminar; ruido de rasterizado tomado por cambio | avanzado · alto | Sí (completo) | Sí: las seis filas de la tabla del plan, a 1440 y 375 px, con A, B y C | Carpeta `despues/{a,b,c}` y comparación par a par: «Iguales» o cada diferencia con su AC; `/login` y la tira móvil «Iguales»; `npm run verify` y e2e completo en verde; consola sin mensajes nuevos frente a la base; hash de `backend/data.json`; B activo en la copia; servidores detenidos | pendiente |
| TASK-08 | 4 | Documentos afectados del [plan](planning.md#documentos-afectados): `frontend/architecture.md` (§3 y §6), `frontend/docs/VISUAL-SYSTEM.md` (plegables, menú de usuario y la excepción del rol en mayúsculas), [glosario](../../../architecture/glosario.md) («Perfil» e `inicialesDeUsuario`), [trazabilidad](../../../planning/TRACEABILITY.md) y estado de PBI-0031 y PBI-0032 en el [backlog](../../../planning/backlog.md). Traspaso para `sdd-verify` | Documentación | REQ-01 a REQ-12 | — | ⚠ TASK-07 | Bajo: describir como entregado lo que solo está en la rama | estándar · medio | No | No | Diff solo de documentación, con enlaces que resuelven; términos del glosario; `npm run verify`; Traspaso actualizado | pendiente |

- **Nivel y esfuerzo:** según las [tablas de la guía](../../../development/agent-execution.md#delegar-por-nivel-y-esfuerzo), resueltos en [Nivel y esfuerzo resueltos en el catálogo](#nivel-y-esfuerzo-resueltos-en-el-catálogo).
- **E2E:** `Sí` si la tarea cambia plantillas, rutas, datos guardados o el contrato; `Spec <nombre>` si basta una spec; `No` en otro caso.
- **Capturas:** `Sí` si la tarea toca plantillas, estilos o tokens.

Estados: `pendiente`, `bloqueada`, `en curso`, `hecha`.

## Trazabilidad

Cada REQ y cada AC de la especificación tiene al menos una tarea y un TEST.

| REQ | Tareas |
|---|---|
| REQ-01 | ⚠ TASK-03 |
| REQ-02 | ⚠ TASK-03 |
| REQ-03 | ⚠ TASK-04 |
| REQ-04 | ⚠ TASK-03, ⚠ TASK-04 |
| REQ-05 | ⚠ TASK-06 |
| REQ-06 | ⚠ TASK-06 |
| REQ-07 | ⚠ TASK-06 |
| REQ-08 | ⚠ TASK-05 |
| REQ-09 | TASK-02, ⚠ TASK-06 |
| REQ-10 | ⚠ TASK-05, ⚠ TASK-06 |
| REQ-11 | TASK-01, ⚠ TASK-03 a ⚠ TASK-07 |
| REQ-12 | ⚠ TASK-03, ⚠ TASK-04 |

| AC | Tareas | TEST |
|---|---|---|
| AC-01 | ⚠ TASK-03 | TEST-03, TEST-04 |
| AC-02 | ⚠ TASK-03 | TEST-04 |
| AC-03 | ⚠ TASK-03 | TEST-04 |
| AC-04 | ⚠ TASK-04 | TEST-05 |
| AC-05 | ⚠ TASK-03, ⚠ TASK-04 | TEST-03, TEST-04, TEST-05 |
| AC-06 | ⚠ TASK-03, ⚠ TASK-04 | TEST-07 |
| AC-07 | ⚠ TASK-03, ⚠ TASK-04 | TEST-04, TEST-05 |
| AC-08 | TASK-02, ⚠ TASK-06 | TEST-01, TEST-06 |
| AC-09 | ⚠ TASK-06 | TEST-06 |
| AC-10 | ⚠ TASK-06 | TEST-06 |
| AC-11 | TASK-02 | TEST-01 |
| AC-12 | ⚠ TASK-05, ⚠ TASK-06 | TEST-06 |
| AC-13 | ⚠ TASK-03 a ⚠ TASK-07 | TEST-04, TEST-05, TEST-06, TEST-09 |
| AC-14 | ⚠ TASK-06, ⚠ TASK-07 | TEST-08, TEST-09 |
| AC-15 | TASK-01, ⚠ TASK-07 | TEST-09 |

TEST-02 (límites de arquitectura) no cubre un AC: protege la regla que separa el menú de usuario (`layout/`) de la página Perfil (`features/sesion/presentation/`). Lo escribe TASK-02.

## Definition of Ready

Comprobado contra los [criterios](../../../development/definition-of-ready.md) el 2026-11-12. Para todas: alcance aprobado (PR #17) y plan aprobado con el hito de arquitectura cerrado (PR #18), sin ADR necesarios; sin cambios de contrato, de datos ni de permisos; sin preguntas abiertas. Ningún tema abierto de [`PENDING-DECISIONS.md`](../../../planning/PENDING-DECISIONS.md) las bloquea: PBI-0013 (permisos del vendedor) y PBI-0043 (modelo de datos) no bloquean, según la especificación y el plan. Las pantallas y anchos de las capturas están fijados en el plan, y los servidores del worktree usan los puertos de las e2e.

| Tarea | Lista | Motivo si no lo está |
|---|---|---|
| TASK-01 | Sí | Preparar el worktree, `npm run setup`, la copia de datos y los guiones de captura es parte de la tarea. No puede ejecutarse a la vez que la suite e2e |
| TASK-02 | Sí | — |
| ⚠ TASK-03 | Sí, tras el hito | Empieza cuando Sebastián aprueba el bloque 1 |
| ⚠ TASK-04 | Sí, tras el hito | Empieza cuando Sebastián aprueba el bloque 2 |
| ⚠ TASK-05 | Sí, tras el hito | Empieza cuando Sebastián aprueba el bloque 3 |
| ⚠ TASK-06 | Sí, tras el hito | Empieza cuando Sebastián aprueba el bloque 4 |
| ⚠ TASK-07 | Sí, tras el hito | Empieza cuando Sebastián aprueba el bloque 5 |
| TASK-08 | Sí | Empieza cuando Sebastián aprueba el paquete de ⚠ TASK-07 |

## Hitos de revisión humana

Antes de cada ⚠, Sebastián Avila revisa el bloque anterior y da el sí para empezar. Después, revisa el paquete de la tarea con estos criterios. El disparador de las cinco es un cambio del diseño visual pedido ([disparadores](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional)).

- **Antes de ⚠ TASK-03 (fin del bloque 1):** las capturas «antes» cubren `/login`, `/` y `/productos` en los dos anchos y los tres temas (18), con B activo al terminar; la línea base del e2e está registrada; TEST-01 y TEST-02 y `npm run verify` en verde.
- **⚠ TASK-03** (menú lateral; criterios del plan para T2):
  1. TEST-04 y la parte del menú de TEST-07 en verde, y el e2e completo en verde.
  2. Las comprobaciones de ausencia de `admin-acceso` y `admin-temas` se hacen con todos los grupos desplegados.
  3. La captura a 375 px con B es igual a la de TASK-01: la tira móvil no cambia (D3).
  4. A 1440 px solo cambian los títulos de grupo, con su indicador y el foco visible del tema; al entrar solo está desplegado el grupo de la página actual (D2).
  5. Ningún `localStorage`, `sessionStorage` ni cookie nuevos (D4, STD-08).
- **Antes de ⚠ TASK-04 (fin del bloque 2):** paquete de ⚠ TASK-03 aprobado y su commit hecho.
- **⚠ TASK-04** (bloques del Resumen):
  1. TEST-05 y la parte del Resumen de TEST-07 en verde, y las aserciones que ya tenía `admin-resumen.spec.ts` sin cambios.
  2. Las tarjetas no tienen control de plegado (D1) y los cinco bloques empiezan desplegados.
  3. Con «Pedidos por distrito» y «Últimos pedidos» plegados, solo se ven sus encabezados, el vecino conserva su alto y no queda una tarjeta vacía; el chevron y el relleno de «Últimos pedidos» están alineados.
  4. A 375 px los bloques se pliegan y la página no desborda.
  5. Fase 2 cerrada con el e2e completo en verde.
- **Antes de ⚠ TASK-05 (fin del bloque 3):** paquete de ⚠ TASK-04 aprobado y su commit hecho.
- **⚠ TASK-05** (Perfil):
  1. La parte de Perfil de TEST-06 en verde con los tres roles.
  2. La página no tiene campos ni botón de guardar, y no pide datos al BFF al entrar.
  3. Sin sesión, `/perfil` lleva a `/login`.
  4. Las capturas de `/perfil` a 1440 y 375 px usan los tokens y el estilo de las demás páginas del Admin.
- **Antes de ⚠ TASK-06 (fin del bloque 4):** paquete de ⚠ TASK-05 aprobado y su commit hecho.
- **⚠ TASK-06** (menú de usuario; criterios del plan para T4):
  1. TEST-06 completo en verde, con el cierre de sesión con el BFF caído.
  2. Escape cierra el menú y devuelve el foco al botón.
  3. «Actualizar» sigue en la cabecera y recarga el snapshot (D6).
  4. A 375 px el botón muestra las iniciales, el panel cabe y la página no desborda; la tuerca del modo demo no queda tapada.
  5. El rol se ve en mayúsculas con CSS y la etiqueta sale de `rol.rules.ts`; el panel usa tokens, sin `::ng-deep`.
  6. `cdp-admin-qa.mjs` corre hasta el final.
  7. Fase 3 cerrada con el e2e completo en verde.
- **Antes de ⚠ TASK-07 (fin del bloque 5):** paquete de ⚠ TASK-06 aprobado y su commit hecho.
- **⚠ TASK-07** (comparación final; criterios del plan para T6):
  1. Sebastián aprueba las capturas con A, B y C: solo cambia lo de la [tabla del plan](planning.md#capturas-antes-y-después) (AC-15).
  2. `/login` y la tira móvil salen «Iguales».
  3. `npm run verify` y el e2e completo en verde.
  4. Sin mensajes de consola nuevos frente a la base.
