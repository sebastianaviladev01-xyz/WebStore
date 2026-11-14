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
| TASK-01 | `b38ac10` | Ejecución | — | Claude Code, `claude-opus-5-5`, sin delegar (el catálogo pide estándar · medio, `claude-sonnet-5-5`, `medium`; lo hizo el agente principal del bloque, que trabaja en avanzado). El esfuerzo de la sesión no se puede leer desde dentro |
| TASK-01 | | Capturas «antes» con A, B y C | 39 por tema, 117 en total, todas las filas de la [tabla del plan](planning.md#capturas-antes-y-después). Tienda: cajón móvil con «TV y audio» desplegada (375 px); `/cuenta/login`, detalle del pedido, carrito, `/pedidos` sin sesión, inicio, catálogo, ficha, diálogo «Producto agregado» (también con el puntero sobre «Ver carrito») y checkout (1440 y 375 px). Admin con `superadmin`: `/login`, `/`, `/temas` con el diálogo del tema propio abierto, `/contenido`, `/banners`, `/marcas`, `/productos` y `/usuarios` (1440 y 375 px), y el menú de usuario y la lista «Ubicación» de `/banners` abiertos (1440 px). Método: Playwright con Chrome, `capturas.mjs`; páginas completas salvo cajón, diálogos y menús (ventana). Capturas en `frontend/output/visual-qa/005-contraste-de-controles-con-los-temas/antes/{a,b,c}`, con su `LEEME.md`. B activo al terminar | — |
| TASK-01 | | Datos de la copia | Preparados con `preparar.mjs` antes de la toma: tema propio «AC-05 principal claro» (`#F2B705`, `#C2410C`, `#F2F3F5`, `#FFFFFF`, `#1F2328`) sin activar; pedido de invitado `WS-27735473` hecho con el checkout, con su `x-order-token` en `estado-tienda.json` y repuesto en `localStorage` en cada toma; un producto en el carrito (`p-004`). Las casillas «Activo» de los formularios nuevos del Admin salen marcadas por defecto y las de `/contenido` lo están en la semilla: no hubo que marcar ninguna | — |
| TASK-01 | | Medidas «antes» (`medidas.mjs`, `getComputedStyle` y relación WCAG con el fondo efectivo) | `antes/medidas.json`. **Confirma los dos defectos.** «Ver todos los productos» (375 px, cajón abierto): con B `rgb(30, 41, 59)` sobre `rgb(29, 78, 216)`, **2.18:1** (su utilidad pintaría blanco, 6.70:1); con A 1.77:1 (utilidad 10.23:1); con C 8.69:1, igual que su utilidad porque `--ws-on-primary` de C es el grafito que hereda. Casilla marcada «Página Contacto» de `/contenido`: con C la marca y el relleno son `rgb(31, 35, 40)`, **1:1** (relleno sobre la tarjeta, 15.80:1); con A, marca blanca sobre `rgb(76, 42, 146)`, 10.23:1; con B, sobre `rgb(29, 78, 216)`, 6.70:1. Los diez enlaces con B: ninguno pinta su utilidad (tabla en [Medidas «antes» de los enlaces](#medidas-antes-de-los-enlaces)) | — |
| TASK-01 | | Ruido de rasterizado | Segunda toma de B con el mismo árbol (`control-ruido/b`) y `comparar.mjs`: 33 de 39 iguales; las otras seis difieren en 1 a 4 niveles por canal: fotos de producto en `tienda-dialogo-1440`, `tienda-dialogo-hover-ver-carrito-375` y `tienda-detalle-pedido-375`, y 2 a 13 px sueltos en `tienda-dialogo-hover-ver-carrito-1440`, `admin-banners-375` y `admin-lista-desplegable-1440` (cajas en el `LEEME.md`). Se tratan como ruido en las comparaciones | — |
| TASK-01 | | Consola de la base | 117 rutas, 24 con un mensaje, todos ajenos a la feature: `404` de `/favicon.ico` en la primera carga de cada aplicación, `NG02952` en el detalle del pedido, `NG02955` en el carrito a 375 px y `NG0913` (aviso de desarrollo del tamaño de una imagen), intermitente en la ficha y el diálogo. Ningún error de la aplicación. Detalle en `antes/consola-abc.json` | — |
| TASK-01 | | `npm run verify` sobre la base `9efc62a`, con los servidores detenidos | Pasa (exit 0, 88 s): sintaxis de 68 archivos, formato, lint, Sheriff y build de las dos apps; 29 pruebas de arquitectura, estructura con «TEST-18 (a): el tema B del BFF es igual a tokens.css», «(b)» y «(c)», 83 del frontend, 118 del BFF y «Smoke test BFF: OK» | — |
| TASK-01 | | `npm run test:e2e` completo (línea base de caracterización) | Pasa (exit 0): 107 pruebas en 4.7 min, sin fallos ni pruebas inestables, sobre la base `9efc62a`, con los puertos 3400, 4400 y 4500 libres antes | — |
| TASK-01 | | Datos y servidores | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`). Copia con B activo (`activeThemeId: "b"`, revisión 28), el tema de AC-05 como único tema propio, el pedido `WS-27735473` y `schemaVersion: 3`. Servidores detenidos: dos `ng serve` sobrevivieron a la parada de la tarea y se cerraron por PID; puertos 3400, 4400 y 4500 libres antes de `verify` y del e2e | — |
| ⚠ TASK-02 | `8cad801` | Ejecución | — | Claude Code, `claude-opus-5-5`, sin delegar (avanzado · alto, como pide el catálogo para una ⚠). El esfuerzo de la sesión no se puede leer desde dentro. Paquete de revisión aprobado por Sebastián Avila el 2026-11-13 («Sí, apruébalo», desde su sesión principal, que antes repitió las pruebas y revisó el diff) |
| ⚠ TASK-02 | | Rojo, antes del código | `casos-tema.json` con `--ws-on-link` tras `--ws-link` y `onLink/link` al final de los pares (solo inserciones). `node --test backend/tests/unit/domain/temas/tema.rules.test.mjs` (TEST-01 y TEST-03): 15 de 32 fallan (los tres casos de `tokensDelTema` sin la clave, 31≠32 tokens, 20≠21 pares, la posición, los valores `undefined` y el último par `borderStrong/surface`). `temas-predefinidos.test.mjs` (TEST-02): 3 de 15 (mapa ≠ casos, `--ws-on-link` `undefined`, relaciones `NaN`). `temas.queries.test.mjs` (TEST-04): 2 de 13 (31≠32 declaraciones; tras `--ws-link` viene `--ws-focus-ring`). `npm run test:contract --prefix backend` (TEST-05): exit 1, «theme.css de B debe tener 32 declaraciones…». `tema.rules.spec.mjs` del Admin (TEST-06): 7 de 29. Ningún fallo de sintaxis ni de importación | — |
| ⚠ TASK-02 | | Verde | Los mismos archivos: 32/32, 15/15, 13/13, «Smoke test BFF: OK» y 29/29. `npm test --prefix backend` 131/131 y `npm test --prefix frontend` 84/84. Tras el verde se corrigió un valor esperado de la prueba, no del código: el par de AC-05 en `revisarContraste` es 15.7 (redondeo hacia abajo de 15.797), no 15.8 | — |
| ⚠ TASK-02 | | Desviación aprobada: TEST-03 | El plan pide «un tema con `onLink/link` bajo el mínimo se guarda», pero ese tema no se puede construir con el cálculo de ADR-0014. Si el enlace es el principal, es porque se lee a 4.5:1 o más sobre la superficie, que es candidata; si es el contraste, la superficie se lee sobre él como `contrast/surface` (`--ws-ink` es siempre el contraste, también con la base de un predefinido), que bloquea bajo 4.5:1. Se sustituye por: el par no bloquea (definición y `revisarContraste`), el tema de AC-05 se guarda con `exigirTemaValido` y su par llega (15.7), `INSUFFICIENT_THEME_CONTRAST` lista solo los dos pares de siempre y, en una rejilla de 32 temas válidos (8 principales sobre 4 bases, claras y oscuras), `onLink/link` nunca baja de 4.5:1. Aprobada por Sebastián Avila el 2026-11-13 | — |
| ⚠ TASK-02 | | Token, par y `theme.css` | `--ws-on-link` justo después de `--ws-link` y antes de `--ws-focus-ring` en `TOKENS_DEL_TEMA` de las dos copias, en `theme.css` y en `tokens.css`, fuera de la escala neutra. Valores: A `#FFFFFF`, B `#ffffff`, C `#FFFFFF` y `#1B1E25` en el caso «base oscura» (4.54:1). `onLink/link`: 10.23, 6.70 y 15.80 en A, B y C. Los demás tokens de A, B y C, iguales y en el mismo orden que en la base (31 → 32). `theme.css` de B con 32 líneas, también servido por el BFF en 3400 | — |
| ⚠ TASK-02 | | Contrato y alcance del diff | `BFF-CONTRACT.md`: 32 claves en `Tema.tokens` con la regla y los valores de `--ws-on-link`, 21 pares con `onLink/link` como aviso y 32 declaraciones de `theme.css`. `INSUFFICIENT_THEME_CONTRAST` sigue con `contrast/background` y `contrast/surface`. Diff sin cambios en `infrastructure/`, `api/`, `customThemes`, `schemaVersion` ni `--mat-sys-on-primary`. Ningún uso de `--ws-on-link` fuera de su declaración, los tipos y las reglas | — |
| ⚠ TASK-02 | | `npm run verify`, con los servidores detenidos | Pasa (exit 0): agentes, sintaxis de 68 archivos, formato, lint y Sheriff, 29 pruebas de arquitectura, TEST-18 (a), (b) y (c), 84 del frontend, 131 del BFF, build de las dos apps y «Smoke test BFF: OK» | — |
| ⚠ TASK-02 | | Capturas con B (`capturas.mjs tarea-02 b`) frente a `antes/b` | 34 de 39 iguales. Las otras 5 difieren en 1 a 4 niveles por canal, en cajas de ruido conocidas: fotos de producto de `tienda-dialogo-375`, `tienda-dialogo-hover-ver-carrito-1440` y `tienda-detalle-pedido-1440`, 2 px en `tienda-dialogo-hover-ver-carrito-375` y 4 px en `admin-lista-desplegable-1440` (x = 988). Frente a `control-ruido/b`, las mismas cajas. Resultado: «Iguales» salvo ruido de rasterizado. Consola sin mensajes nuevos (el `404` de `/favicon.ico` sale en `b/` porque la toma solo cargó B) | — |
| ⚠ TASK-02 | | `npm run test:e2e` completo (cierra la fase 1) | Pasa (exit 0): 107 pruebas en 4.3 min, sin fallos ni pruebas inestables, con los puertos 3400, 4400 y 4500 libres antes | — |
| ⚠ TASK-02 | | Datos, servidores y Prettier | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`). Copia con B activo (revisión 30) y `schemaVersion: 3`. Servidores detenidos; dos `ng serve` se cerraron por PID. Prettier sobre los `.mjs`, `.ts` y `.css` tocados; `casos-tema.json` se editó solo con inserciones, sin reformatear | — |
| ⚠ TASK-03 | `a930f41` | Ejecución | — | Claude Code, `claude-opus-5-5`, sin delegar (avanzado · alto, como pide el catálogo para una ⚠). El esfuerzo de la sesión no se puede leer desde dentro. Paquete de revisión aprobado por Sebastián Avila el 2026-11-14 («Sí, apruébalo», desde su sesión principal, que antes revisó el diff, las e2e, las capturas de C y el hash), con la corrección del borde de la casilla sin marcar |
| ⚠ TASK-03 | | Fallo «antes», con las e2e escritas y `tokens.css` sin cambiar | `npx playwright test admin-casillas admin-material-contraste storefront-material-contraste` desde `frontend/`: 7 pasan y 3 fallan, las tres por el defecto esperado, «C · casilla marcada, marca sobre el relleno: `rgb(31, 35, 40)` sobre `rgb(31, 35, 40)` = 1.00:1» (mínimo 3:1): TEST-10 con C, TEST-11 (tema de AC-05, también 1:1) y TEST-12 del Admin con C. Ningún fallo de sintaxis, de localización ni de tiempo | — |
| ⚠ TASK-03 | | Verde | El mismo comando tras el cambio: 10/10. Mutación: sin `--mat-button-filled-state-layer-color`, TEST-12 de la tienda con C falla («la capa de estado del botón relleno sigue en --ws-on-primary»: `rgb(255, 255, 255)` en lugar de `rgb(31, 35, 40)`) y A y B pasan; la línea se repuso. Las medidas que no son de la casilla, idénticas antes y después (comparación de las anotaciones) | — |
| ⚠ TASK-03 | | Desviación aprobada: borde de la casilla sin marcar | El plan (TEST-10) y la especificación (casos límite) dicen `--ws-border-strong`, pero Material 22.2.4 pinta ese borde con `--mat-checkbox-unselected-icon-color`, que por defecto es `--mat-sys-on-surface-variant` y `tokens.css` lleva a `--ws-muted`, también en la base. En reposo (sin puntero ni foco, que lo pintan con `on-surface`): A `rgb(91, 88, 102)`, 6.92:1; B `rgb(82, 96, 117)`, 6.39:1; C `rgb(85, 91, 101)`, 6.84:1. TEST-10 comprueba `--ws-muted` y el relleno transparente: lo que AC-07 protege es que no cambie. Aprobada por Sebastián Avila el 2026-11-14; TASK-06 deja la nota fechada | — |
| ⚠ TASK-03 | | Casilla marcada de `/contenido` («Página Contacto») | Con A, blanco sobre `rgb(76, 42, 146)`, 10.23:1; con B, blanco sobre `rgb(29, 78, 216)`, 6.70:1, igual que en la base. Con C, **blanco sobre `rgb(31, 35, 40)`, 15.80:1** (antes 1:1). Con el tema de AC-05, la marca es su `--ws-on-link` (blanco) sobre el mismo grafito, 15.80:1. El relleno sobre la tarjeta blanca, 10.23, 6.70 y 15.80:1. TEST-11 crea el tema con un nombre único y deja B activo y sin el tema al terminar | — |
| ⚠ TASK-03 | | Componentes de Material (TEST-12) | Todos llegan a su mínimo con A, B y C (tabla en [Medidas de los componentes de Material](#medidas-de-los-componentes-de-material-test-12)). Con C, la capa de estado de «Ver carrito» sigue en el grafito de `--ws-on-primary` (etiqueta a 7.55:1 con el puntero) | — |
| ⚠ TASK-03 | | Alcance del diff | Solo `frontend/src/styles/tokens.css` (`--mat-sys-on-primary: var(--ws-on-link)`, `--mat-button-filled-state-layer-color: var(--ws-on-primary)` y los comentarios) y las cuatro e2e nuevas (`apoyo/contraste.ts`, `admin-casillas`, `admin-material-contraste` y `storefront-material-contraste`). Sin `::ng-deep`, `.mdc-` ni colores fijos (búsqueda en el diff y en las e2e). Las e2e localizan por rol y nombre y, dentro de cada control, por posición (el hermano del `input` y su `svg path`, los hijos del recuadro del botón de opción, `input.labels`, el hijo con `::before` del botón) y por las etiquetas `mat-checkbox`, `mat-radio-button` y `mat-pseudo-checkbox`; solo leen con `getComputedStyle` | — |
| ⚠ TASK-03 | | `npm run verify`, con los servidores detenidos | Pasa (exit 0): agentes, sintaxis de 68 archivos, formato, lint y Sheriff, 29 pruebas de arquitectura, TEST-18 (a), (b) y (c), 84 del frontend, 131 del BFF, build de las dos apps y «Smoke test BFF: OK». El lint no cubre `tests/e2e/`, como con las e2e existentes: `tsc --strict` sobre las cuatro e2e nuevas, sin errores | — |
| ⚠ TASK-03 | | Capturas con A, B y C (`capturas.mjs tarea-03`) frente a `antes/{a,b,c}` | Admin: con A y B, «Iguales» (salvo los 4 px conocidos de `admin-lista-desplegable-1440`); con C, solo las marcas de las casillas marcadas, de grafito a blanco (172 px en `contenido` y 43 px en `banners`, `marcas`, `productos` y `usuarios`, a 1440 y 375 px). Tienda: diálogo (también con el puntero sobre «Ver carrito») y checkout «Iguales» con los tres temas, salvo las fotos de producto, que difieren igual entre dos tomas del mismo árbol (`control-ruido-03`). Con A, el catálogo y el inicio a 1440 px difieren en dos fotos (hasta 13 y 1 nivel), igual con el `tokens.css` de la punta (`control-base-03/a`): deriva del rasterizado desde TASK-01, ajena al cambio. Resultado: solo cambian las casillas marcadas con C. Consola: 11 rutas con mensaje, todos iguales a la base | — |
| ⚠ TASK-03 | | `npm run test:e2e` completo (cierra la fase 2) | Pasa (exit 0): 117 pruebas en 5.1 min (las 107 de la base y las 10 nuevas), sin fallos ni pruebas inestables, con los puertos 3400, 4400 y 4500 libres antes | — |
| ⚠ TASK-03 | | Datos, servidores y Prettier | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`). Copia con B activo (revisión 40), `schemaVersion: 3` y el tema de AC-05 como único tema propio. Servidores detenidos por PID antes de `verify` y del e2e. Prettier sobre `tokens.css` y las cuatro e2e | — |
| ⚠ TASK-04 | `1152d18` | Ejecución | — | Claude Code, `claude-opus-5-5`, sin delegar (avanzado · alto, como pide el catálogo para una ⚠). El esfuerzo de la sesión no se puede leer desde dentro. Paquete de revisión aprobado por Sebastián Avila el 2026-11-14 («Sí, apruébalo», desde su sesión principal, que antes revisó el diff, las capturas de `tarea-04` frente a `tarea-03` con los tres temas, el cajón con B, las medidas «después» y el hash) |
| ⚠ TASK-04 | | Fallo «antes», con la e2e escrita y `styles.css` sin cambiar | `npx playwright test storefront-enlaces` desde `frontend/`: 3 fallan y 1 pasa. TEST-08 con B, **2.18:1** (el defecto esperado), y con A, 1.77:1 («Expected: >= 4.5»); con C pasa, porque su `--ws-on-primary` es el grafito que ya heredaba (8.69:1). TEST-09 falla en los diez enlaces (aserciones blandas, una por enlace y estado): 1 a 6 con `rgb(30, 41, 59)` en lugar de su utilidad; 7 con el puntero, `rgb(197, 206, 221)` en lugar de `rgb(255, 255, 255)`; 8 sin subrayado en reposo; 9 y 10 sin subrayado con el puntero. El control «Olvidé mi contraseña» pasa. Ningún fallo de sintaxis, de localización ni de tiempo. Un primer intento se colgó en el inicio porque `asentar` espera a todas las animaciones del documento y el carrusel no termina; la spec espera solo las finitas del enlace, de su contenido y de sus antecesores (`asentarEn`), y el rojo citado se repitió completo con esa corrección antes del cambio | — |
| ⚠ TASK-04 | | Verde | El mismo comando tras el cambio: 4/4. Las anotaciones dan, con B, lo que pinta la utilidad de cada enlace ([Medidas «antes» de los enlaces](#medidas-antes-de-los-enlaces), columna «Utilidad»): «Ver todos los productos» blanco sobre `rgb(29, 78, 216)`, 6.70:1; «Ver toda la categoría» y «Crear cuenta» `rgb(29, 78, 216)`, 6.70:1; «OLED» `rgb(82, 96, 117)`, 6.39:1 (5.43:1 con el puntero); «Mis pedidos» 6.11:1 y, con el puntero, `rgb(15, 23, 42)`, 17.09:1; el nombre del carrito con el puntero, 6.70:1; el correo del pie con el puntero, blanco, 17.14:1; «Inicia sesión» subrayado siempre; «Ayuda» y «Seguimiento de pedidos» subrayados solo con el puntero. «Olvidé mi contraseña» sigue heredando `rgb(30, 41, 59)`, sin subrayado. `medidas.mjs despues` (`despues/medidas.json`) coincide con la utilidad en los diez enlaces | — |
| ⚠ TASK-04 | | «Ver todos los productos» con A, B y C (TEST-08) | Texto igual a `--ws-on-primary` y fondo igual a `--ws-primary`: A blanco sobre `rgb(76, 42, 146)`, 10.23:1; B blanco sobre `rgb(29, 78, 216)`, 6.70:1; C `rgb(31, 35, 40)` sobre `rgb(242, 183, 5)`, 8.69:1 (antes 1.77, 2.18 y 8.69) | — |
| ⚠ TASK-04 | | Alcance del diff | Solo `frontend/src/styles.css` (la regla `a` dentro de `@layer base`, junto a la de márgenes, con su comentario) y la e2e nueva `storefront-enlaces.spec.ts`. Sin cambios en plantillas, `storefront.css`, `home.css`, `tokens.css` ni `a:focus-visible`, que sigue fuera de capa con `--ws-focus-ring`. Ningún `<a>` con clase `ws-*` lleva además una utilidad de color o de subrayado (búsqueda en `src/app`) | — |
| ⚠ TASK-04 | | `npm run verify`, con los servidores detenidos | Pasa (exit 0): agentes, sintaxis de 68 archivos, formato, lint y Sheriff, 29 pruebas de arquitectura, TEST-18 (a), (b) y (c), 84 del frontend, 131 del BFF, build de las dos apps y «Smoke test BFF: OK». El lint no cubre `tests/e2e/`: `tsc --strict` sobre la e2e nueva, sin errores | — |
| ⚠ TASK-04 | | Capturas con A, B y C (`capturas.mjs tarea-04`) frente a `tarea-03/{a,b,c}` y `antes/{a,b,c}` | Solo cambian los enlaces de la tabla del plan: `tienda-cajon-375` (con A y B, 1914 px: el botón, «Ver toda la categoría» y «OLED»; con C, 193 px, solo «OLED», porque `--ws-link`, `--ws-text` y `--ws-on-primary` de C son el mismo `#1F2328`); «Crear cuenta» de `tienda-login` (1440 y 375, con A y B; con C no cambia por lo mismo); «Mis pedidos» de `tienda-detalle-pedido` (1440 y 375, con los tres); el subrayado de «Inicia sesión» en `tienda-pedidos` (1440 y 375, una fila de 75 px, con los tres). Los enlaces 6, 7, 9 y 10 solo cambian con el puntero (TEST-09). El resto de la tienda, «Iguales» salvo el ruido conocido de fotos (1 a 5 niveles, mismas cajas que `control-ruido-03`; `tienda-inicio-1440` con A sale igual que `antes/a` y difiere de `tarea-03/a` a 1 nivel: la foto alterna entre dos rasterizados). Ningún enlace con clase `ws-*` cambia. Admin «Iguales» frente a `tarea-03` (frente a `antes/c`, solo las casillas de ⚠ TASK-03). Sin desborde horizontal: ninguna captura cambia de tamaño. Consola: 117 rutas, 11 con mensaje, ninguno nuevo frente a `tarea-03` | — |
| ⚠ TASK-04 | | `npm run test:e2e` completo (cierra la fase 3) | Pasa (exit 0): 121 pruebas en 5.7 min (las 117 de la fase 2 y las 4 nuevas), sin fallos ni pruebas inestables, con los puertos 3400, 4400 y 4500 libres antes. TEST-20 de la feature 002 (`storefront-temas.spec.ts`) pasa en sus cinco rutas: sin hallazgo | — |
| ⚠ TASK-04 | | Datos, servidores y Prettier | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`). Copia con B activo (revisión 49), `schemaVersion: 3` y el tema de AC-05 como único tema propio. Servidores de capturas detenidos por PID; puertos libres. Prettier sobre `styles.css` y la e2e nueva | — |
| ⚠ TASK-05 | | Ejecución | — | Claude Code, `claude-opus-5-5`, sin delegar (avanzado · alto, como pide el catálogo para una ⚠). El esfuerzo de la sesión no se puede leer desde dentro. Paquete de revisión aprobado por Sebastián Avila el 2026-11-14 («Sí, apruébalas», desde su sesión principal, que antes repitió las comparaciones con A, B y C, revisó las dos diferencias que no son de enlaces y el hash). Sin cambios de código: las capturas, las medidas y la consola viven en `frontend/output/`, que git ignora |
| ⚠ TASK-05 | | Capturas «después» (`capturas.mjs despues`), TEST-13 | 39 por tema, 117 en total, en `despues/{a,b,c}`, con el método, la copia, el pedido `WS-27735473`, el producto en el carrito y la sesión de `superadmin` de TASK-01. Control de ruido: una segunda toma completa del mismo árbol (`control-ruido-05/{a,b,c}`) | — |
| ⚠ TASK-05 | | Comparación con `antes/{a,b,c}` (`comparar.mjs`) | Iguales: 29 con A, 29 con B y 23 con C. **Cambios, cada uno con su AC:** `tienda-cajon-375` (AC-01 y AC-02: con A y B, 1914 px, el botón, «Ver toda la categoría» y «OLED»; con C, 193 px, solo «OLED», porque `--ws-link`, `--ws-text` y `--ws-on-primary` de C son el mismo `#1F2328`); «Crear cuenta» de `tienda-login` 1440 y 375 con A y B (AC-02; con C no cambia por lo mismo); «Mis pedidos» de `tienda-detalle-pedido` 1440 y 375 con A, B y C (AC-02, 514 a 523 px en (85,211)–(172,223)); el subrayado de «Inicia sesión» de `tienda-pedidos` 1440 y 375 con A, B y C ([pregunta 1](planning.md#pregunta-1-qué-se-hace-con-los-cuatro-enlaces-que-d1-cambia-y-ac-02-no-lista), 75 px en una fila); con C, las casillas marcadas del Admin (AC-03 y AC-04: 172 px en `admin-contenido` y 43 px en `admin-banners`, `-marcas`, `-productos` y `-usuarios`, a 1440 y 375). **Ruido:** fotos de producto de 1 a 5 niveles en `tienda-dialogo-1440` (A), `tienda-dialogo-hover-ver-carrito-*` (B y C), `tienda-ficha-1440` (B, 1 nivel) y `tienda-detalle-pedido-1440` con C (116 px a 1 nivel en (110,419)–(195,482), separados del enlace con un corte en y = 300), todas reproducidas entre `despues/` y `control-ruido-05/`; `tienda-inicio-1440` con A (1 nivel, la foto del banner que alterna entre dos rasterizados, ya registrada en ⚠ TASK-04); y `tienda-catalogo-1440` con A, 17 046 px hasta 13 niveles en dos fotos: es la deriva del rasterizado desde TASK-01, ajena a la feature, porque `control-base-03/a` (con el `tokens.css` previo a los cambios visuales) difiere de `antes/a` exactamente igual y `despues/a` coincide con `control-base-03/a`. Admin con A y B, «Iguales»; `admin-temas-dialogo`, menús y lista desplegable, «Iguales» con los tres temas (el diálogo del tema de AC-05 no muestra un aviso nuevo). Ninguna captura cambia de tamaño: sin desborde horizontal. Frente a `tarea-04/{a,b,c}`, solo ruido (38, 34 y 35 iguales). Resultado: solo cambia lo de la tabla del plan (AC-07, con los cuatro enlaces de la pregunta 1) | — |
| ⚠ TASK-05 | | Medidas «después» (`medidas.mjs despues`) frente a `antes/medidas.json` | «Ver todos los productos»: A 1.77 → **10.23:1**, B 2.18 → **6.70:1**, C 8.69 → 8.69:1, con el texto de `--ws-on-primary` sobre el principal (AC-01). Los diez enlaces con B pintan el color y el subrayado de su utilidad en los 21 estados medidos, todos a 4.5:1 o más (AC-02 y pregunta 1; valores en [Medidas «antes» de los enlaces](#medidas-antes-de-los-enlaces), columna «Utilidad»); «Olvidé mi contraseña» sigue igual. Casilla marcada de `/contenido`: con C, marca blanca sobre `rgb(31, 35, 40)`, **15.80:1** (antes 1:1), y el relleno sobre la tarjeta, 15.80:1 (AC-03 y AC-04); con A y B, 10.23 y 6.70:1, como en la base. El tema de AC-05 (TEST-11) y los componentes de Material (TEST-12), medidos por el e2e completo | — |
| ⚠ TASK-05 | | Consola (`despues/consola-abc.json`) frente a la base | 117 rutas, 25 con un mensaje (24 en la base). Los mismos cuatro códigos y en las mismas rutas salvo `NG0913`: `404` de `/favicon.ico` (2 y 2), `NG02952` en el detalle del pedido (6 y 6), `NG02955` en el carrito a 375 px (3 y 3) y `NG0913`, intermitente en la ficha y el diálogo (13 y 14 rutas; entre `despues/` y `control-ruido-05/`, con el mismo árbol, cambia en 4 rutas). Sin mensajes nuevos ni errores de la aplicación | — |
| ⚠ TASK-05 | | `npm run verify` sobre `4dce3a4`, con los servidores detenidos | Pasa (exit 0, 83 s): agentes, sintaxis de 68 archivos, formato, lint y Sheriff, 29 pruebas de arquitectura, TEST-18 (a), (b) y (c), 84 del frontend, 131 del BFF, build de las dos apps y «Smoke test BFF: OK» | — |
| ⚠ TASK-05 | | `npm run test:e2e` completo | Pasa (exit 0): 121 pruebas en 5.7 min, sin fallos ni pruebas inestables, con los puertos 3400, 4400 y 4500 libres antes | — |
| ⚠ TASK-05 | | Datos y servidores | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`). Copia con B activo (revisión 62), `schemaVersion: 3` y el tema de AC-05 como único tema propio. Servidores detenidos; dos `ng serve` sobrevivieron a la parada y se cerraron por PID; puertos libres antes de `verify` y del e2e | — |

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

### Medidas de los componentes de Material (TEST-12)

Anotaciones de `admin-material-contraste.spec.ts` y `storefront-material-contraste.spec.ts` tras ⚠ TASK-03, a 1440 px. Relación WCAG con el fondo efectivo. Fuera de la casilla, iguales antes y después del cambio.

| App | Componente | A | B | C | Mínimo |
|---|---|---|---|---|---|
| Admin | Etiqueta enfocada de «Correo» (`/login`) | 7.92 | 5.19 | 12.23 | 4.5 |
| Admin | Menú de usuario, «Perfil» | 18.10 | 17.85 | 15.80 | 4.5 |
| Admin | Casilla marcada: marca sobre relleno y relleno sobre tarjeta | 10.23 y 10.23 | 6.70 y 6.70 | 15.80 y 15.80 | 3 |
| Admin | «Ubicación» de `/banners`: texto y marca de la opción seleccionada | 12.17 y 6.28 | 11.99 y 6.27 | 10.81 y 6.38 | 4.5 y 3 |
| Tienda | «Ver carrito» del diálogo, etiqueta sobre el contenedor | 10.23 | 6.70 | 8.69 | 4.5 |
| Tienda | «Ver carrito» con el puntero (capa de estado al 8 %, en `--ws-on-primary`) | 8.29 | 5.71 | 7.55 | 4.5 |
| Tienda | Etiqueta enfocada de «Nombres y apellidos» (checkout) | 10.23 | 6.70 | 15.80 | 4.5 |
| Tienda | «Distrito destino»: texto y marca de la opción seleccionada | 12.17 y 6.28 | 11.99 y 6.27 | 10.81 y 6.38 | 4.5 y 3 |
| Tienda | «Yape / Plin»: punto y anillo sobre la superficie | 10.23 | 6.70 | 15.80 | 3 |
| Tienda | Selector de tema del modo demo, «Azul cobalto» | 18.10 | 17.85 | 15.80 | 4.5 |

Al abrir la lista, la opción seleccionada es también la activa y Material pinta su texto con `on-surface`; la marca usa `on-secondary-container` de `azure-blue.css`. Se miden como se ven.

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
