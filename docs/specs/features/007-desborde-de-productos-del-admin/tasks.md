# 007. Desborde de productos del Admin — Tareas

- Feature: `007-desborde-de-productos-del-admin`
- Especificación: [specification.md](specification.md) (alcance aprobado el 2026-11-14; D1 a D3)
- Plan: [planning.md](planning.md) (hito de arquitectura aprobado el 2026-11-14; alternativa A en las tres preguntas; sin ADR)
- Fecha: 2026-11-14
- Aprobación de las tareas: aprobadas por Sebastián Avila el 2026-11-14 en la sesión de esta etapa («Aprobar las tareas (Recomendado)»), después de responder la [pregunta del desglose](#respuesta-del-desglose)
- Aprobación del bloque 1 (TASK-01 y TASK-02, fase 1): aprobado por Sebastián Avila el 2026-11-14 («Sí, lo apruebo», en respuesta a «¿Apruebas el bloque 1 del piloto, con la medida adaptada de TEST-05?»), incluida la medida adaptada de TEST-05 ([decisiones de ejecución](#traspaso))
- Aprobación del paquete de ⚠ TASK-03 (bloque 2, fase 2): aprobado por Sebastián Avila el 2026-11-14 en la sesión principal («Sí, lo apruebo», en respuesta a «¿Apruebas el paquete de TASK-03, la corrección de /productos en móvil?»), que lo transmitió con sus palabras a la sesión del bloque ([evidencia](verification.md#ejecución-por-tarea))
- Aprobación del bloque 2 (⚠ TASK-03, fase 2): aprobado por Sebastián Avila el 2026-11-14 («Sí, abre el bloque 3», en respuesta a «¿Das por bueno el bloque 2 y abro el bloque 3 del piloto?»), transmitido con sus palabras por la sesión principal a la sesión del bloque 3
- Aprobación del paquete de ⚠ TASK-04 (bloque 3, fase 3): aprobado por Sebastián Avila el 2026-11-14 en la sesión principal («Sí, lo apruebo», en respuesta a «¿Apruebas el paquete de TASK-04, la comparación de capturas antes y después?»), que lo transmitió con sus palabras a la sesión del bloque ([evidencia](verification.md#ejecución-por-tarea))

Las rutas de código son relativas a la raíz del repositorio. Los TEST son los de la [estrategia de pruebas del plan](planning.md#estrategia-de-pruebas); las clases, los nombres accesibles, la etiqueta «Stock», la spec, la carpeta de capturas y la copia de datos, los de [tipos intermedios y nombres](planning.md#tipos-intermedios-y-nombres). Ninguna tarea los vuelve a decidir.

## Traspaso

Permite empezar el bloque siguiente sin releer la feature. La actualiza la última tarea del bloque, en su mismo commit ([guía](../../../development/agent-execution.md#traspaso)).

| Campo | Contenido |
|---|---|
| Punta de la rama | `feature/007-desborde-de-productos-del-admin`, local y sin push, en el worktree: el commit de TASK-05 («docs: documentar el desborde de productos del Admin»), que cierra el bloque 3, seguido del commit `docs` que rellena los SHA de la fase 3. Este campo no puede dar el SHA del commit que lo escribe. La implementación está completa: fases 1 a 3, con sus cinco tareas `hecha` |
| Siguiente bloque | Ninguno: sigue `sdd-verify` (etapa 6), en una sesión nueva sobre el worktree, que completa [verification.md](verification.md) a partir de las filas de cada tarea y prepara el hito de entrega. Empieza cuando Sebastián Avila dé el sí al bloque 3; el paquete de ⚠ TASK-04 ya está aprobado y su commit hecho. El PR único se abre después, con el hito de entrega aprobado ([un pull request por feature](../../../architecture/development-workflow.md#un-pull-request-por-feature)) |
| Decisiones de ejecución | (0) **⚠ TASK-03, «Stock» seguido de `&nbsp;`:** el plan dice «seguido de un espacio»; Prettier quitaba el espacio final y la compilación de la plantilla habría dejado «Stock9», así que la etiqueta lleva un espacio de no separación. La spec lo comprueba (normaliza `\s`) ([evidencia](verification.md#ejecución-por-tarea)). El precio lleva `max-md:col-start-2` para que el precio, el stock y las acciones queden a la derecha en la segunda línea. (1) **TEST-05, aprobada por Sebastián Avila el 2026-11-14 con el bloque 1:** la medida del plan («centros verticales a menos de 2 px», [planning.md](planning.md#estrategia-de-pruebas), línea 107) falla en la base porque el bloque del producto tiene dos líneas; la spec comprueba el centro del precio, el stock y las acciones frente al del bloque (menos de 2 px) y dentro de la franja vertical del nombre ([evidencia](verification.md#ejecución-por-tarea)). (2) La celda del stock se compara con su forma (`Stock N` o `N`), no con el número del seed: las specs de la tienda bajan el stock antes en la suite completa; solo se fija el 0 de «Microondas EasyCook 30 L». (3) TEST-01 a TEST-03 son una prueba por tema que recorre los tres anchos, con `expect.soft`, y TEST-05 se parte en dos pruebas (escritorio y 767 px) para aislar el rojo del punto de corte |
| Riesgos abiertos | Los de [Dependencias y riesgos](planning.md#dependencias-y-riesgos) del plan. Para la comparación final de `sdd-verify`: a 375 px las capturas «antes» y «después» miden otro tamaño (376 × 3068 y 376 × 3175 frente a 375 × 2540 y 375 × 2633) y `comparar.mjs` solo dice «tamaño distinto»; `franja.mjs` compara la franja de arriba recortada a x 0–374 hasta el inicio de la lista (y = 426), y el resto se revisa frente a la tabla del plan. La rama va por detrás de `dev` y choca con él en `docs/planning/backlog.md` (en la rama cambian la fila de PBI-0045 y la de PBI-0059, nueva desde la especificación): no se fusiona `dev` en la rama ni se rebasa; se resuelve al abrir el PR. Los documentos de TASK-05 describen lo que está en la rama, no lo entregado: PBI-0045 sigue `en curso` y la fila 007 del índice, `en implementación` |
| Entorno | Worktree `.worktrees/007-desborde-de-productos-del-admin`, creado por TASK-01 con `npm run setup`; el checkout principal quedó en `dev`. Servidores del worktree en los [puertos de las capturas](../../../development/local-environment.md#puertos-de-las-capturas) (BFF 3400 sin modo demo y Admin 4500), nunca a la vez que la suite e2e, que usa los mismos. Copia de datos: `backend/data-capturas.json` del worktree, con ruta absoluta en `WEBSTORE_DATA_FILE`, con B activo (revisión de `appearance` 22 al cerrar la fase 3). En `frontend/output/visual-qa/007-desborde-de-productos-del-admin/` (`LEEME.md`): capturas `antes`, `control-ruido` (la miniatura de la galería, hasta 5 niveles por canal), `tarea-02`, `tarea-03/b` y `despues`, cada una con su consola; el guion (`capturas.mjs`), el comparador (`comparar.mjs`) y la comparación de la franja de arriba a 375 px (`franja.mjs`), con sus resultados en `comparacion-*.json` y `franja-antes-despues.json`. Al cerrar la fase 3, `npm run verify` pasa y el e2e completo también (127 de 127). Matar los servidores por puerto deja los `ng serve` hijos vivos si no se usa `taskkill /T` |

## Reglas

- **TDD** ([STD-18](../../../architecture/standards.md)). Ninguna tarea toca un `domain/` ni el BFF: no hay TDD obligatorio. Aun así, las e2e (TEST-01 a TEST-05) se escriben en TASK-02, antes de la corrección de ⚠ TASK-03, y se ejecutan sobre la base para dejar el rojo del móvil y el verde del escritorio. Un fallo por un localizador o por la configuración no cuenta como rojo.
- **Evidencia.** Una tarea solo se marca `hecha` con evidencia: su fila en `verification.md` (comando y resultado de cada control) en el mismo commit ([guía](../../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). La primera línea dice con qué se ejecutó: herramienta, modelo real, esfuerzo y si fue delegada. Los SHA se rellenan en un commit `docs` al cerrar cada fase. TASK-01 crea `verification.md` desde la [plantilla](../../templates/verification-template.md).
- **Capturas** ([STD-12](../../../architecture/standards.md)). Las tareas con `Sí` en Capturas comparan con las tomas de TASK-01: el mismo guion de Playwright con el Chrome instalado, `reducedMotion: 'reduce'`, página completa, la misma copia de datos, la sesión de `superadmin` y los temas activados por la API en el orden A, B y C, con B al terminar ([capturas del plan](planning.md#capturas-antes-y-después)). Dos estados (`/productos` al entrar y editando «OLED Vision 55” 4K») a 1440 y 375 px: 4 tomas por tema, 12 en total. El resultado es «Iguales» o la lista de diferencias, cada una con el AC que la pide.
- **Datos** ([STD-09](../../../architecture/standards.md)). Nunca se escribe `backend/data.json`; su hash se comprueba antes y después de cada tarea con servidores. La copia `backend/data-capturas.json` sale del seed y no se modifica entre tomas, salvo para activar A o C. Ninguna prueba guarda ni borra productos: al editar «OLED Vision 55” 4K» no se pulsa «Guardar producto».
- **Servidores.** Los puertos 3000, 4200 y 4300 y las configuraciones de `.claude/launch.json` no se usan: la configuración `bff` usa `backend/data.json`. Los del worktree se levantan en segundo plano: BFF en 3400 (`node backend/src/main.mjs` con `PORT`, `WEBSTORE_DATA_FILE` absoluto y `WEBSTORE_ALLOWED_ORIGINS=http://localhost:4500`, sin `WEBSTORE_DEMO_MODE`, para que la tuerca no salga en las capturas) y Admin en 4500 (`npx ng serve admin --port 4500 --proxy-config proxy.e2e.conf.json`, desde `frontend/`). Se detienen antes de `npm run test:e2e` y al terminar la tarea.
- **Alcance.** Solo cambia la plantilla de `ProductosPage` ([`productos.page.ts`](../../../../frontend/projects/admin/src/app/features/tienda/presentation/productos.page.ts)) y se crea la spec e2e. Ni BFF, ni contrato, ni estilos globales, ni tokens, ni Material por dentro (STD-04). Los defectos de esa página registrados en `dev` (PBI-0119, PBI-0121, PBI-0122, PBI-0130 y PBI-0134) no se tocan.
- **Controles.** Cada tarea que toca `frontend/` ejecuta `npm run verify` sobre el árbol del commit (incluye TEST-06) y Prettier sobre los archivos tocados. E2E según la columna **E2E** y completo al cerrar cada fase, en segundo plano ([controles](../../../development/agent-execution.md#controles-proporcionados)). No se pasa Prettier por los `.md` de `docs/`.
- **⚠.** Las tareas de alto impacto (aquí, los cambios visuales pedidos) llevan ⚠, no se delegan y tienen un hito de revisión humana antes y un paquete de revisión después ([disparadores](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional)).
- **Commits** en español, con [Conventional Commits](../../../git/conventional-commits.md), `Refs: 007-desborde-de-productos-del-admin/TASK-NN` y sin `Co-Authored-By` ni firmas de herramientas. Sin push, sin PR y sin fusionar `dev` en la rama: la feature se entrega en [un solo PR](../../../architecture/development-workflow.md#un-pull-request-por-feature), después de `sdd-verify`.

### Nivel y esfuerzo resueltos en el catálogo

La columna **Nivel y esfuerzo** dice el nivel, no el modelo. Resueltos en el [catálogo](../../../../.agents/execution-catalog.json) (versión 1.1.0, `harnesses`). Ningún esfuerzo pasa de `alto` ([reglas de escalado](../../../development/agent-execution.md#reglas-de-escalado)):

| Tareas | Nivel y esfuerzo | Claude Code | Codex (provisional) | Delegable |
|---|---|---|---|---|
| TASK-01 | estándar · medio | `claude-sonnet-5-5`, `medium` (alias `sonnet`) | `gpt-5.6-sol`, `medium` | Sí |
| TASK-02 | estándar · alto | `claude-sonnet-5-5`, `high` (alias `sonnet`) | `gpt-5.6-sol`, `high` | Sí |
| ⚠ TASK-03 y ⚠ TASK-04 | avanzado · alto | `claude-opus-5-5`, `high` | `gpt-5.6-sol`, `high` | No: agente principal |
| TASK-05 | estándar · bajo | `claude-sonnet-5-5`, `low` (alias `sonnet`) | `gpt-5.6-sol`, `low` | Sí |

El agente principal de cada bloque trabaja en avanzado. Si delega TASK-01, TASK-02 o TASK-05, lo hace con un brief cerrado y revisa el diff y la evidencia antes del commit ([delegar](../../../development/agent-execution.md#delegar-por-nivel-y-esfuerzo)).

## Ajustes respecto al plan

La [ejecución prevista](planning.md#ejecución-prevista) del plan sugería T0 a T4 en tres bloques, con ⚠ en T2 y T3. Este desglose mantiene los pasos, sus niveles y esfuerzos, sus criterios y los bloques. Ninguna decisión del plan cambia:

| Ajuste | Motivo |
|---|---|
| T0 a T4 pasan a TASK-01 a TASK-05, en el mismo orden (T0 = TASK-01, T1 = TASK-02, T2 = ⚠ TASK-03, T3 = ⚠ TASK-04, T4 = TASK-05) | Numeración de la [plantilla](../../templates/tasks-template.md) |
| Tres fases, una por bloque | El plan no las define, y el e2e completo se ejecuta al cerrar cada fase |
| TASK-01 crea el worktree, `verification.md` y el guion, y guarda la consola de cada toma | La ejecución prevista del plan lo da por hecho sin asignarlo; los criterios de ⚠ TASK-04 piden «sin errores de consola nuevos», que necesita la consola de la base |
| TASK-02 marca Capturas `Sí`, con B, los dos estados, a 1440 y 375 px, y espera «Iguales» frente a TASK-01 | Añade tres atributos a la plantilla (los nombres accesibles y el `id` del título), y `sdd-tasks` pide comparar capturas en cada tarea que toca plantillas. El plan solo captura en T0 y T3 |

## Respuesta del desglose

La única pregunta del desglose se presentó con sus alternativas, la recomendación y la evidencia (los tres atributos que TASK-02 añade a la plantilla, el paso 7 de `sdd-tasks` y STD-12). Sebastián Avila la respondió el 2026-11-14 en la sesión de esta etapa y después aprobó las tareas.

| Pregunta | Decisión | Alternativas descartadas |
|---|---|---|
| ¿Qué captura TASK-02, que solo añade atributos sin efecto visual? | **Solo B**: los dos estados a 1440 y 375 px, con el guion de TASK-01, esperando «Iguales» («Solo B (Recomendado)») | A, B y C (triplica el tiempo sin aportar: los atributos no dependen del tema); ninguna (contradice `sdd-tasks` y no separaría un cambio de TASK-02 de uno de ⚠ TASK-03) |

## Fases

| Fase | Objetivo |
|---|---|
| 1 | Línea base (capturas «antes» con A, B y C, `verify` y e2e) y e2e nuevas (TEST-01 a TEST-05) con su rojo en la base, con los nombres accesibles de la lista y del formulario |
| 2 | Corrección de la plantilla: galería, ayuda de «Miniatura optimizada» y fila de la lista en dos líneas por debajo de 768 px |
| 3 | Capturas «después» y comparación (TEST-07), controles completos y documentos |

## Bloques de sesión

Cada bloque se ejecuta en una sesión nueva sobre el worktree ([guía](../../../development/agent-execution.md#una-sesión-por-bloque)) y termina antes de cada tarea ⚠. Un bloque que empieza con una ⚠ la prepara y se detiene con su paquete de revisión; con la aprobación (en esa sesión o al empezar la siguiente) hace su commit y sigue con el resto del bloque. Al terminar un bloque, el agente informa y espera un sí explícito antes del siguiente.

| Bloque | Tareas | Termina antes de (⚠) | Qué se revisa al cerrarlo |
|---|---|---|---|
| 1 | TASK-01 y TASK-02 (cierra la fase 1) | ⚠ TASK-03 | Capturas «antes» con A, B y C; línea base de `verify` y del e2e; spec nueva con el rojo esperado en la base y sin fallos de localizador; capturas de TASK-02 «Iguales» |
| 2 | ⚠ TASK-03 (cierra la fase 2) | ⚠ TASK-04 | Paquete de ⚠ TASK-03 con sus criterios |
| 3 | ⚠ TASK-04 y TASK-05 (cierra la fase 3) | — (sigue `sdd-verify`) | Paquete de ⚠ TASK-04 con sus criterios; documentos |

## Tareas

| ID | Fase | Descripción | Capa | REQ/AC | TEST primero | Depende de | Riesgo | Nivel y esfuerzo | E2E | Capturas | Evidencia esperada | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-01 | 1 | Línea base antes de tocar código. Con el árbol limpio, el checkout principal pasa a `dev` y se crea el worktree con `git worktree add .worktrees/007-desborde-de-productos-del-admin feature/007-desborde-de-productos-del-admin`; `npm run setup` en él. BFF en 3400 sin modo demo sobre `backend/data-capturas.json` (creada desde el seed) y Admin en 4500. Guion de Playwright con el Chrome instalado en `frontend/output/visual-qa/007-desborde-de-productos-del-admin/` (activar el tema por la API, iniciar sesión de `superadmin`, capturar), con un `LEEME.md` del método. Capturas «antes» de las dos filas de la [tabla del plan](planning.md#capturas-antes-y-después) (al entrar y editando «OLED Vision 55” 4K», sin guardar) con A, B y C a 1440 y 375 px, y la consola de cada toma; B activo al terminar. Servidores detenidos; `npm run verify` y e2e completo como línea base. Crear `verification.md` desde su plantilla | QA visual y e2e (Admin) | REQ-01 a REQ-05 / AC-05, AC-06 | — (toma «antes» de TEST-07; el e2e de la base es la caracterización) | — | Medio: dejar el checkout principal con cambios al pasarlo a `dev`; usar los puertos de la demo o escribir en `backend/data.json`; levantar el BFF en modo demo (la tuerca sale en las capturas); dejar A o C activo en la copia; olvidar un estado, un ancho o un tema; capturar antes de que carguen las fotos | estándar · medio | Sí (completo, línea base) | Sí: «antes», los dos estados, con A, B y C, a 1440 y 375 px | `antes/{a,b,c}` con 4 PNG cada una y `LEEME.md` (SHA base, rutas, estados, anchos, temas, método, datos y fecha); el guion; la consola de cada toma; resultado de `verify` y del e2e completo (número de pruebas y fallos, si los hay, con su causa); hash de `backend/data.json` igual antes y después; B activo en la copia; servidores detenidos; `verification.md` creado; Traspaso con el worktree, la copia y el método | hecha |
| TASK-02 | 1 | E2E antes del cambio y nombres accesibles. En la plantilla, solo tres atributos: `aria-label="Lista de productos"` en la `section` de la lista, `id="titulo-formulario-producto"` en el `h2` del formulario y `aria-labelledby="titulo-formulario-producto"` en el `form`. Spec nueva `frontend/tests/e2e/admin-productos-movil.spec.ts` con TEST-01 a TEST-05 como los fija la [estrategia de pruebas](planning.md#estrategia-de-pruebas): reutiliza `TEMAS`, `activarTema`, `restablecerTemas` y `colorDelToken` de `apoyo/contraste.ts`, e `ingresarAlAdmin` y `cuentasAdmin` de `apoyo/entorno.ts`; localiza la lista y el formulario por rol y nombre; fija cada ancho con `page.setViewportSize` y recarga; no guarda ni borra; deja B activo. Ejecutarla sobre la base (con solo los tres atributos) y registrar el rojo esperado de cada TEST. Capturas con B frente a TASK-01 | e2e (Admin) y plantilla de `ProductosPage` (`presentation/`) | REQ-01 a REQ-05 / AC-01 a AC-05 | TEST-01, TEST-02, TEST-03, TEST-04 y TEST-05 (antes de la corrección; no es área de STD-18) | TASK-01 | Medio: un fallo por un localizador o por la configuración tomado por rojo; `toHaveText` lee `textContent`, que incluye la etiqueta «Stock» oculta con `md:hidden`: TEST-05 debe comparar el texto visible (`innerText`) o no pasará después del cambio; un clic de la e2e en la tuerca del modo demo (llevar «Agregar» y «Editar» al centro de la vista antes de pulsar); dejar A o C activo; TEST-03 da por hecho los seis productos del seed (ninguna otra spec crea productos hoy) | estándar · alto | Sí (spec nueva y completo, cierra la fase 1) | Sí: con B, los dos estados, a 1440 y 375 px; se espera «Iguales» frente a TASK-01 | Rojo de cada TEST registrado con su causa, como prevé el plan: TEST-01, `scrollWidth` 376 a 360 y 375 px; TEST-02, el `fieldset` hasta x = 375.6; TEST-03, el SKU en varias líneas y la cabecera que no cabe, también a 390 px; TEST-04, la lista; TEST-05 en verde salvo la comprobación de 767 px. Ningún fallo de localizador ni de configuración. Diff de la plantilla solo con los tres atributos; capturas con B «Iguales»; `npm run verify`; e2e completo en verde salvo los fallos esperados de la spec nueva; Prettier; Traspaso actualizado para el bloque 2 | hecha |
| ⚠ TASK-03 | 2 | Corrección de la plantilla de `ProductosPage`, solo añadiendo: `min-w-0` en el `fieldset` «Galería de fotos» y en el `mat-form-field` «URL de foto» (junto a `flex-1`); `subscriptSizing="dynamic"` en el `mat-form-field` «Miniatura optimizada»; en la lista, clases `max-md:` en la cabecera (oculta por debajo de 768 px) y en cada fila (dos líneas: el producto a todo el ancho; debajo, el precio, el stock y las acciones, a la derecha); en la celda del stock, la etiqueta «Stock» seguida de un espacio, en `text-muted` y peso normal, con `md:hidden`, y el número con `text-danger` cuando el stock es 0. Ninguna clase de hoy cambia ni se quita. Paquete de revisión con una captura a 375 px con B de cada estado | Plantilla de `ProductosPage` (`presentation/`) | REQ-01 a REQ-05 / AC-01 a AC-05 | TEST-01 a TEST-05 (de TASK-02, ya en rojo) | TASK-02 | Alto: una clase sin `max-md:` cambia el escritorio (REQ-05); la etiqueta pierde su espacio («Stock9»); el número pierde `text-danger` al envolverlo; la fila del `vendedor`, sin «Eliminar», se descuadra; estilos globales, internals de Material o colores fijos; mezclar los defectos de la página registrados en `dev` | avanzado · alto | Sí (spec nueva y completo, cierra la fase 2) | Sí: con B, a 375 px, los dos estados, para el paquete; la comparación completa es la de ⚠ TASK-04 | TEST-01 a TEST-05 en verde con A, B y C, también la comprobación de 767 px; diff de la plantilla que solo añade `max-md:`, `md:hidden`, `min-w-0`, `subscriptSizing="dynamic"` y la etiqueta «Stock»; sin colores fijos ni estilos globales; `npm run verify` (TEST-06) y e2e completo en verde; capturas del paquete; Prettier | hecha |
| ⚠ TASK-04 | 3 | Capturas «después» de las dos filas de la [tabla del plan](planning.md#capturas-antes-y-después) con A, B y C a 1440 y 375 px, con el guion, la copia y la sesión de TASK-01, y comparación con las «antes» (TEST-07): a 1440 px, píxel a píxel; a 375 px, la franja de arriba hasta el inicio de la lista píxel a píxel y el resto frente a la tabla. Consola de cada toma. `npm run verify` y e2e completo. Paquete de revisión con los pares y las diferencias | QA visual y controles (Admin) | REQ-01 a REQ-05 / AC-05, AC-06 | — (TEST-07 compara con la toma «antes» de TASK-01) | ⚠ TASK-03 | Medio: una diferencia no pedida; ruido de rasterizado de las fotos tomado por cambio; la copia modificada entre tomas; A o C activos al terminar | avanzado · alto | Sí (completo) | Sí: «después», las de TASK-01 | `despues/{a,b,c}` y la comparación par a par: a 1440 px «Iguales» con A, B y C (o ruido de rasterizado documentado); a 375 px solo cambian la lista y el formulario, cada diferencia con su AC; consola sin mensajes nuevos frente a la base; `npm run verify` y e2e completo en verde; hash de `backend/data.json`; B activo en la copia; servidores detenidos | hecha |
| TASK-05 | 3 | [Documentos afectados](planning.md#documentos-afectados) del plan. [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md), en el apartado del Admin, junto a «Tablas con encabezado `subtle`…»: la lista de productos por debajo de 768 px (dos líneas por producto, sin cabecera, «Stock» como etiqueta) y la convención `max-md:` para cambiar solo el móvil. [`frontend/architecture.md`](../../../../frontend/architecture.md) §6: la spec `admin-productos-movil` en la fila de E2E. [Trazabilidad](../../../planning/TRACEABILITY.md): una fila de la feature 007 (REQ-01 a REQ-05, `ProductosPage`, TEST-01 a TEST-07). [Backlog](../../../planning/backlog.md): solo la fila de PBI-0045, que sigue `en curso` (pasa a `hecha` con el registro de la entrega). Fila 007 del [índice](../README.md). Traspaso para `sdd-verify` | Documentación | REQ-01 a REQ-05 / AC-01 a AC-06 | — | ⚠ TASK-04 | Bajo: describir como entregado lo que solo está en la rama; tocar otra fila de `backlog.md` (agranda el conflicto con `dev`); cifras distintas de las medidas; reescribir los hitos o `docs/changelog/` | estándar · bajo | No | No | Diff solo de documentación, con enlaces que resuelven y términos del glosario; `npm run verify`; Traspaso para `sdd-verify` | hecha |

- **Nivel y esfuerzo:** según las [tablas de la guía](../../../development/agent-execution.md#delegar-por-nivel-y-esfuerzo), resueltos en [Nivel y esfuerzo resueltos en el catálogo](#nivel-y-esfuerzo-resueltos-en-el-catálogo).
- **E2E:** `Sí` si la tarea cambia plantillas, rutas, datos guardados o el contrato; `Spec <nombre>` si basta una spec; `No` en otro caso.
- **Capturas:** `Sí` si la tarea toca plantillas, estilos o tokens.

Estados: `pendiente`, `bloqueada`, `en curso`, `hecha`.

## Trazabilidad

Cada REQ y cada AC de la especificación tiene al menos una tarea y un TEST.

| REQ | Tareas |
|---|---|
| REQ-01 | TASK-01, TASK-02, ⚠ TASK-03, ⚠ TASK-04 |
| REQ-02 | TASK-01, TASK-02, ⚠ TASK-03, ⚠ TASK-04 |
| REQ-03 | TASK-01, TASK-02, ⚠ TASK-03, ⚠ TASK-04 |
| REQ-04 | TASK-02, ⚠ TASK-03 |
| REQ-05 | TASK-01, TASK-02, ⚠ TASK-03, ⚠ TASK-04 |

| AC | Tareas | TEST |
|---|---|---|
| AC-01 | TASK-02, ⚠ TASK-03 | TEST-01, TEST-04 |
| AC-02 | TASK-02, ⚠ TASK-03 | TEST-02 |
| AC-03 | TASK-02, ⚠ TASK-03 | TEST-03, TEST-04 |
| AC-04 | TASK-02, ⚠ TASK-03 | TEST-01, TEST-02, TEST-03 |
| AC-05 | TASK-01, TASK-02, ⚠ TASK-03, ⚠ TASK-04 | TEST-05, TEST-06, TEST-07 |
| AC-06 | TASK-01, ⚠ TASK-04 | TEST-06, TEST-07 |

TASK-05 documenta todos. TEST-06 (`templateAccessibility` y `validate:structure`) lo ejecuta `npm run verify` en cada tarea que toca `frontend/`.

## Definition of Ready

Comprobado contra los [criterios](../../../development/definition-of-ready.md) el 2026-11-14. Para todas: alcance aprobado el 2026-11-14 (D1 a D3) y plan aprobado el 2026-11-14 con el hito de arquitectura cerrado (alternativa A en las tres preguntas); sin ADR necesarios; sin preguntas abiertas ni decisiones de [`PENDING-DECISIONS.md`](../../../planning/PENDING-DECISIONS.md) que afecten a la feature; sin cambios de contrato, datos guardados ni permisos (el `vendedor` ve lo mismo). Las pantallas, los estados, los anchos y los temas de las capturas están fijados en el plan; los datos son los del seed, en una copia que prepara TASK-01. Cada tarea tiene su resultado revisable, sus dependencias y su forma de comprobarlo en la tabla.

| Tarea | Lista | Motivo si no lo está |
|---|---|---|
| TASK-01 | Sí | Tareas aprobadas el 2026-11-14. Preparar el worktree (con el checkout principal en `dev`), `npm run setup`, la copia y el guion es parte de la tarea. No puede ejecutarse a la vez que la suite e2e |
| TASK-02 | Sí | Depende de TASK-01 (capturas «antes» tomadas antes de tocar la plantilla) |
| ⚠ TASK-03 | Sí, tras el hito | Empieza cuando Sebastián aprueba el bloque 1 |
| ⚠ TASK-04 | Sí, tras el hito | Empieza cuando Sebastián aprueba el paquete de ⚠ TASK-03 y el bloque 2 |
| TASK-05 | Sí, tras el hito | Empieza cuando Sebastián aprueba el paquete de ⚠ TASK-04 |

## Hitos de revisión humana

Antes de cada ⚠, Sebastián Avila revisa el bloque anterior y da el sí para empezar. Después, revisa el paquete de la tarea con estos criterios. Disparador de las dos: un cambio visual pedido ([disparadores](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional)).

- **Antes de ⚠ TASK-03 (fin del bloque 1):** las capturas «antes» cubren los dos estados, los dos anchos y los tres temas, con B activo al terminar; la línea base de `verify` y del e2e está registrada, con sus fallos, si los hay, y su causa; la spec nueva falla en la base por los motivos que prevé el plan, sin fallos de localizador, y TEST-05 pasa salvo la comprobación de 767 px; las capturas de TASK-02 salen «Iguales». Aprobado por Sebastián Avila el 2026-11-14 («Sí, lo apruebo»), con la medida adaptada de TEST-05.
- **⚠ TASK-03** (corrección; criterios del plan para T2). Paquete aprobado por Sebastián Avila el 2026-11-14 («Sí, lo apruebo»), después de que la sesión principal comprobara los cinco criterios:
  1. TEST-01 a TEST-05 en verde con A, B y C, también la comprobación de 767 px.
  2. El e2e completo y `npm run verify` en verde.
  3. El diff solo añade clases `max-md:`, `md:hidden` y `min-w-0`, `subscriptSizing="dynamic"` y la etiqueta «Stock»: ninguna clase de hoy cambia ni se quita.
  4. Sin colores fijos ni estilos globales.
  5. Una captura a 375 px con B de cada estado muestra la forma aprobada en la [pregunta 1](planning.md#respuestas-del-hito): el producto arriba a todo el ancho y, debajo, el precio, «Stock N» y las acciones a la derecha, sin cabecera; el formulario y la galería dentro de su tarjeta, con la ayuda de «Miniatura optimizada» sin pisar la galería.
- **Antes de ⚠ TASK-04 (fin del bloque 2):** paquete de ⚠ TASK-03 aprobado y su commit hecho. Bloque 2 aprobado por Sebastián Avila el 2026-11-14 («Sí, abre el bloque 3»).
- **⚠ TASK-04** (comparación final; criterios del plan para T3). Paquete aprobado por Sebastián Avila el 2026-11-14 («Sí, lo apruebo»), después de que la sesión principal revisara los cuatro criterios:
  1. Sebastián aprueba las capturas: a 1440 px, iguales con A, B y C.
  2. A 375 px solo cambia lo de la [tabla del plan](planning.md#capturas-antes-y-después): la lista y el formulario; la cabecera de la página y la tira de navegación, iguales.
  3. Sin errores de consola nuevos frente a la base.
  4. `npm run verify` y el e2e completo en verde.

## Contradicciones encontradas

Encontradas al desglosar, contra la especificación, el plan y el código de la rama (`4c3465f`). Ninguna cambia una decisión ni el plan aprobado, que no se reescribe:

- **Número de tomas.** [planning.md](planning.md#capturas-antes-y-después) dice «12 tomas por tema», pero la tabla tiene dos estados a dos anchos: 4 tomas por tema y 12 en total. Las tareas usan 4 por tema.
- **Momento de las capturas «antes».** La misma sección dice «“Antes”, sobre la punta de la rama antes de T2», pero T1 ya toca la plantilla y la tabla de [tipos y nombres](planning.md#tipos-intermedios-y-nombres) asigna la toma a T0. Se toma en TASK-01 (T0), antes de cualquier cambio, y TASK-02 demuestra con B que sus atributos no cambian nada a la vista ([ajustes](#ajustes-respecto-al-plan)).
- **`backlog.md` antes de T4.** [Dependencias y riesgos](planning.md#dependencias-y-riesgos) dice que la feature «no toca `backlog.md` hasta T4», pero la etapa de especificación ya lo cambió en la rama (`aa46e51`: PBI-0045 `en curso` y PBI-0059 nuevo): el conflicto con `dev` ya existe. TASK-05 solo vuelve a tocar la fila de PBI-0045.
- **Plan y código coinciden** en lo que este desglose comprueba: la plantilla tiene la `section.admin-card overflow-hidden` con filas `grid-cols-[1fr_120px_110px_90px]`, el `fieldset` con la fila `flex gap-2` y «URL de foto» con `flex-1` y `subscriptSizing="dynamic"`, y el `h2` sin `id`; el seed tiene «OLED Vision 55” 4K» con una foto en la galería y «Microondas EasyCook 30 L» con stock 0; la página muestra «Esa foto ya está en el producto.» al repetir una URL; `apoyo/contraste.ts` y `apoyo/entorno.ts` exportan las ayudas que nombra el plan; la suite e2e usa un solo worker y ninguna spec crea productos.
