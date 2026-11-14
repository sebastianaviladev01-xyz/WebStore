# 005. Contraste de controles con los temas — Verificación

- Feature: `005-contraste-de-controles-con-los-temas`
- Tareas: [tasks.md](tasks.md)

Documento creado por TASK-01 desde la [plantilla](../../templates/verification-template.md). La revisión y la ejecución por tarea las rellena cada tarea; `sdd-verify` completa las demás secciones.

## Revisión

| Dato | Valor |
|---|---|
| Rama y commit | `feature/005-contraste-de-controles-con-los-temas`, base `9efc62a` (`dev`). Sin push |
| Fecha | 2026-11-13 |
| Entorno | Windows 10 Pro 10.0.19045, Node v24.20.0, npm 11.19.0 (leídas con `node --version` y `npm --version`); Google Chrome instalado (headless, con Playwright `channel: 'chrome'`) para las capturas, las medidas y el e2e |
| Datos | Capturas y medidas: copia `backend/data-capturas.json` del worktree (creada por el BFF desde la semilla, ignorada por git), con el BFF del worktree en 3400. E2E: archivo temporal de Playwright. Nunca `backend/data.json`: su sha256 en el checkout principal es `f4480a1c…ae34e` antes y después de cada tarea con servidores; el worktree no tiene `backend/data.json` |

## Ejecución por tarea

Durante la implementación, cada tarea añade aquí una fila breve en su mismo commit ([guía](../../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). Una línea por control. La primera línea de cada tarea dice con qué se ejecutó: herramienta, modelo real, esfuerzo y si fue delegada. El SHA se rellena en un commit `docs` al cerrar la fase. `sdd-verify` completa el resto del documento a partir de estas filas.

| Tarea | Commit | Control | Resultado | Ejecutado con |
|---|---|---|---|---|
| TASK-01 | | Ejecución | — | Claude Code, `claude-opus-5-5`, sin delegar (el catálogo pide estándar · medio, `claude-sonnet-5-5`, `medium`; lo hizo el agente principal del bloque, que trabaja en avanzado). El esfuerzo de la sesión no se puede leer desde dentro |
| TASK-01 | | Capturas «antes» con A, B y C | 39 por tema, 117 en total, todas las filas de la [tabla del plan](planning.md#capturas-antes-y-después). Tienda: cajón móvil con «TV y audio» desplegada (375 px); `/cuenta/login`, detalle del pedido, carrito, `/pedidos` sin sesión, inicio, catálogo, ficha, diálogo «Producto agregado» (también con el puntero sobre «Ver carrito») y checkout (1440 y 375 px). Admin con `superadmin`: `/login`, `/`, `/temas` con el diálogo del tema propio abierto, `/contenido`, `/banners`, `/marcas`, `/productos` y `/usuarios` (1440 y 375 px), y el menú de usuario y la lista «Ubicación» de `/banners` abiertos (1440 px). Método: Playwright con Chrome, `capturas.mjs`; páginas completas salvo cajón, diálogos y menús (ventana). Capturas en `frontend/output/visual-qa/005-contraste-de-controles-con-los-temas/antes/{a,b,c}`, con su `LEEME.md`. B activo al terminar | — |
| TASK-01 | | Datos de la copia | Preparados con `preparar.mjs` antes de la toma: tema propio «AC-05 principal claro» (`#F2B705`, `#C2410C`, `#F2F3F5`, `#FFFFFF`, `#1F2328`) sin activar; pedido de invitado `WS-27735473` hecho con el checkout, con su `x-order-token` en `estado-tienda.json` y repuesto en `localStorage` en cada toma; un producto en el carrito (`p-004`). Las casillas «Activo» de los formularios nuevos del Admin salen marcadas por defecto y las de `/contenido` lo están en la semilla: no hubo que marcar ninguna | — |
| TASK-01 | | Medidas «antes» (`medidas.mjs`, `getComputedStyle` y relación WCAG con el fondo efectivo) | `antes/medidas.json`. **Confirma los dos defectos.** «Ver todos los productos» (375 px, cajón abierto): con B `rgb(30, 41, 59)` sobre `rgb(29, 78, 216)`, **2.18:1** (su utilidad pintaría blanco, 6.70:1); con A 1.77:1 (utilidad 10.23:1); con C 8.69:1, igual que su utilidad porque `--ws-on-primary` de C es el grafito que hereda. Casilla marcada «Página Contacto» de `/contenido`: con C la marca y el relleno son `rgb(31, 35, 40)`, **1:1** (relleno sobre la tarjeta, 15.80:1); con A, marca blanca sobre `rgb(76, 42, 146)`, 10.23:1; con B, sobre `rgb(29, 78, 216)`, 6.70:1. Los diez enlaces con B: ninguno pinta su utilidad (tabla en [Medidas «antes» de los enlaces](#medidas-antes-de-los-enlaces)) | — |
| TASK-01 | | Ruido de rasterizado | Segunda toma de B con el mismo árbol (`control-ruido/b`) y `comparar.mjs`: 33 de 39 iguales; las otras seis difieren en 1 a 4 niveles por canal: fotos de producto en `tienda-dialogo-1440`, `tienda-dialogo-hover-ver-carrito-375` y `tienda-detalle-pedido-375`, y 2 a 13 px sueltos en `tienda-dialogo-hover-ver-carrito-1440`, `admin-banners-375` y `admin-lista-desplegable-1440` (cajas en el `LEEME.md`). Se tratan como ruido en las comparaciones | — |
| TASK-01 | | Consola de la base | 117 rutas, 24 con un mensaje, todos ajenos a la feature: `404` de `/favicon.ico` en la primera carga de cada aplicación, `NG02952` en el detalle del pedido, `NG02955` en el carrito a 375 px y `NG0913` (aviso de desarrollo del tamaño de una imagen), intermitente en la ficha y el diálogo. Ningún error de la aplicación. Detalle en `antes/consola-abc.json` | — |
| TASK-01 | | `npm run verify` sobre la base `9efc62a`, con los servidores detenidos | Pasa (exit 0, 88 s): sintaxis de 68 archivos, formato, lint, Sheriff y build de las dos apps; 29 pruebas de arquitectura, estructura con «TEST-18 (a): el tema B del BFF es igual a tokens.css», «(b)» y «(c)», 83 del frontend, 118 del BFF y «Smoke test BFF: OK» | — |
| TASK-01 | | `npm run test:e2e` completo (línea base de caracterización) | Pasa (exit 0): 107 pruebas en 4.7 min, sin fallos ni pruebas inestables, sobre la base `9efc62a`, con los puertos 3400, 4400 y 4500 libres antes | — |
| TASK-01 | | Datos y servidores | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`). Copia con B activo (`activeThemeId: "b"`, revisión 28), el tema de AC-05 como único tema propio, el pedido `WS-27735473` y `schemaVersion: 3`. Servidores detenidos: dos `ng serve` sobrevivieron a la parada de la tarea y se cerraron por PID; puertos 3400, 4400 y 4500 libres antes de `verify` y del e2e | — |
| ⚠ TASK-02 | | Ejecución | — | Claude Code, `claude-opus-5-5`, sin delegar (avanzado · alto, como pide el catálogo para una ⚠). El esfuerzo de la sesión no se puede leer desde dentro. Paquete de revisión aprobado por Sebastián Avila el 2026-11-13 («Sí, apruébalo», desde su sesión principal, que antes repitió las pruebas y revisó el diff) |
| ⚠ TASK-02 | | Rojo, antes del código | `casos-tema.json` con `--ws-on-link` tras `--ws-link` y `onLink/link` al final de los pares (solo inserciones). `node --test backend/tests/unit/domain/temas/tema.rules.test.mjs` (TEST-01 y TEST-03): 15 de 32 fallan (los tres casos de `tokensDelTema` sin la clave, 31≠32 tokens, 20≠21 pares, la posición, los valores `undefined` y el último par `borderStrong/surface`). `temas-predefinidos.test.mjs` (TEST-02): 3 de 15 (mapa ≠ casos, `--ws-on-link` `undefined`, relaciones `NaN`). `temas.queries.test.mjs` (TEST-04): 2 de 13 (31≠32 declaraciones; tras `--ws-link` viene `--ws-focus-ring`). `npm run test:contract --prefix backend` (TEST-05): exit 1, «theme.css de B debe tener 32 declaraciones…». `tema.rules.spec.mjs` del Admin (TEST-06): 7 de 29. Ningún fallo de sintaxis ni de importación | — |
| ⚠ TASK-02 | | Verde | Los mismos archivos: 32/32, 15/15, 13/13, «Smoke test BFF: OK» y 29/29. `npm test --prefix backend` 131/131 y `npm test --prefix frontend` 84/84. Tras el verde se corrigió un valor esperado de la prueba, no del código: el par de AC-05 en `revisarContraste` es 15.7 (redondeo hacia abajo de 15.797), no 15.8 | — |
| ⚠ TASK-02 | | Desviación aprobada: TEST-03 | El plan pide «un tema con `onLink/link` bajo el mínimo se guarda», pero ese tema no se puede construir con el cálculo de ADR-0014. Si el enlace es el principal, es porque se lee a 4.5:1 o más sobre la superficie, que es candidata; si es el contraste, la superficie se lee sobre él como `contrast/surface` (`--ws-ink` es siempre el contraste, también con la base de un predefinido), que bloquea bajo 4.5:1. Se sustituye por: el par no bloquea (definición y `revisarContraste`), el tema de AC-05 se guarda con `exigirTemaValido` y su par llega (15.7), `INSUFFICIENT_THEME_CONTRAST` lista solo los dos pares de siempre y, en una rejilla de 32 temas válidos (8 principales sobre 4 bases, claras y oscuras), `onLink/link` nunca baja de 4.5:1. Aprobada por Sebastián Avila el 2026-11-13 | — |
| ⚠ TASK-02 | | Token, par y `theme.css` | `--ws-on-link` justo después de `--ws-link` y antes de `--ws-focus-ring` en `TOKENS_DEL_TEMA` de las dos copias, en `theme.css` y en `tokens.css`, fuera de la escala neutra. Valores: A `#FFFFFF`, B `#ffffff`, C `#FFFFFF` y `#1B1E25` en el caso «base oscura» (4.54:1). `onLink/link`: 10.23, 6.70 y 15.80 en A, B y C. Los demás tokens de A, B y C, iguales y en el mismo orden que en la base (31 → 32). `theme.css` de B con 32 líneas, también servido por el BFF en 3400 | — |
| ⚠ TASK-02 | | Contrato y alcance del diff | `BFF-CONTRACT.md`: 32 claves en `Tema.tokens` con la regla y los valores de `--ws-on-link`, 21 pares con `onLink/link` como aviso y 32 declaraciones de `theme.css`. `INSUFFICIENT_THEME_CONTRAST` sigue con `contrast/background` y `contrast/surface`. Diff sin cambios en `infrastructure/`, `api/`, `customThemes`, `schemaVersion` ni `--mat-sys-on-primary`. Ningún uso de `--ws-on-link` fuera de su declaración, los tipos y las reglas | — |
| ⚠ TASK-02 | | `npm run verify`, con los servidores detenidos | Pasa (exit 0): agentes, sintaxis de 68 archivos, formato, lint y Sheriff, 29 pruebas de arquitectura, TEST-18 (a), (b) y (c), 84 del frontend, 131 del BFF, build de las dos apps y «Smoke test BFF: OK» | — |
| ⚠ TASK-02 | | Capturas con B (`capturas.mjs tarea-02 b`) frente a `antes/b` | 34 de 39 iguales. Las otras 5 difieren en 1 a 4 niveles por canal, en cajas de ruido conocidas: fotos de producto de `tienda-dialogo-375`, `tienda-dialogo-hover-ver-carrito-1440` y `tienda-detalle-pedido-1440`, 2 px en `tienda-dialogo-hover-ver-carrito-375` y 4 px en `admin-lista-desplegable-1440` (x = 988). Frente a `control-ruido/b`, las mismas cajas. Resultado: «Iguales» salvo ruido de rasterizado. Consola sin mensajes nuevos (el `404` de `/favicon.ico` sale en `b/` porque la toma solo cargó B) | — |
| ⚠ TASK-02 | | `npm run test:e2e` completo (cierra la fase 1) | Pasa (exit 0): 107 pruebas en 4.3 min, sin fallos ni pruebas inestables, con los puertos 3400, 4400 y 4500 libres antes | — |
| ⚠ TASK-02 | | Datos, servidores y Prettier | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`). Copia con B activo (revisión 30) y `schemaVersion: 3`. Servidores detenidos; dos `ng serve` se cerraron por PID. Prettier sobre los `.mjs`, `.ts` y `.css` tocados; `casos-tema.json` se editó solo con inserciones, sin reformatear | — |

### Medidas «antes» de los enlaces

Con B, a 1440 px (los del cajón, a 375 px). «Utilidad» es lo que pintaría la clase del enlace si la regla `a` no la anulara: una sonda `<span>` con las mismas clases (con el puntero, las `hover:*` como clases normales).

| # | Enlace | Hoy, en reposo | Hoy, con el puntero | Utilidad |
|---|---|---|---|---|
| 1 | «Ver todos los productos» | `rgb(30, 41, 59)` sobre el principal, 2.18:1 | — | `rgb(255, 255, 255)`, 6.70:1 |
| 2 | «Ver toda la categoría» | `rgb(30, 41, 59)`, 14.63:1 | — | `rgb(29, 78, 216)` (`text-link`), 6.70:1 |
| 3 | Subcategoría «OLED» del cajón | `rgb(30, 41, 59)`, 14.63:1 | `rgb(30, 41, 59)` sobre `rgb(233, 237, 243)`, 12.45:1 | `rgb(82, 96, 117)` (`text-muted`), 6.39:1; con el puntero, 5.43:1 |
| 4 | «Crear cuenta» | `rgb(30, 41, 59)`, 14.63:1 | Igual | `rgb(29, 78, 216)`, 6.70:1 |
| 5 | «Mis pedidos» del detalle | `rgb(30, 41, 59)`, 14.01:1 | Igual | `rgb(82, 96, 117)`, 6.11:1; con el puntero `rgb(15, 23, 42)` (`text-ink`), 17.09:1 |
| 6 | Nombre del producto en el carrito | `rgb(30, 41, 59)`, 14.63:1 | Igual | Con el puntero, `rgb(29, 78, 216)`, 6.70:1 |
| 7 | Correo del pie | `rgb(197, 206, 221)` sobre `rgb(15, 27, 51)`, 10.81:1 | Igual | Con el puntero, `rgb(255, 255, 255)` (`text-footer-heading`), 17.14:1 |
| 8 | «Inicia sesión» de `/pedidos` | `rgb(82, 96, 117)`, 6.11:1, sin subrayado | Igual | Subrayado siempre |
| 9 | «Ayuda» de la franja superior | Blanco sobre `rgb(24, 57, 150)`, 10.17:1, sin subrayado | Igual, sin subrayado | Subrayado con el puntero |
| 10 | «Seguimiento de pedidos» (`/inicio-anterior`) | Igual que «Ayuda» | Igual, sin subrayado | Subrayado con el puntero |
| — | «Olvidé mi contraseña» (control) | `rgb(30, 41, 59)`, 14.63:1, sin subrayado | — | Igual: no tiene utilidades |

## Estado de los controles

| Control | Documentado | Configurado | Ejecutado |
|---|---|---|---|
| Sintaxis del BFF (`check:syntax`) | … | … | … |
| Formato (`format:check`) | … | … | … |
| Lint y límites de arquitectura | … | … | … |
| Pruebas unitarias | … | … | … |
| Pruebas de integración y contrato del BFF | … | … | … |
| Pruebas E2E | … | … | … |
| Build de Storefront y Admin | … | … | … |
| Capturas antes y después | … | … | … |
| Auditoría de dependencias | … | … | … |
| CI | … | … | … |

## Resultados de las pruebas

| ID | AC | Comando | Resultado | Evidencia |
|---|---|---|---|---|
| TEST-01 | AC-03, AC-05 | … | … | … |

## Capturas antes y después

| Pantalla o ruta | Anchos | Resultado | Evidencia |
|---|---|---|---|
| … | … | … | … |

## Cumplimiento TDD

| Área | TDD obligatorio | Prueba antes del código | Evidencia |
|---|---|---|---|
| … | … | … | … |

## Trazabilidad

| REQ | AC | TASK | Commit o PR | TEST | Resultado |
|---|---|---|---|---|---|
| … | … | … | … | … | … |

## Definition of Done

Marca solo lo que se cumple ([criterios](../../../development/definition-of-done.md)).

- [ ] …

## Riesgos remanentes y excepciones

- …

## Hito de entrega

pendiente
