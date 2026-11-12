# 002. Temas configurables — Verificación

- Feature: `002-temas-configurables`
- Tareas: [tasks.md](tasks.md)

<!-- Durante la implementación solo se rellena «Ejecución por tarea». sdd-verify completa el resto. Nunca registres como ejecutado algo que no se ejecutó. -->

## Revisión

| Dato | Valor |
|---|---|
| Rama y commit | `feature/002-temas-configurables`, desde `origin/dev` (`dec89f3`) |
| Fecha | 2026-11-11 |
| Entorno | Windows 10 Pro 10.0.19045, Node v24.20.0, npm 11.19.0; Google Chrome instalado (headless, con Playwright `channel: 'chrome'`) para las capturas |
| Datos | Capturas: copia `backend/data-capturas.json` (semilla) y `backend/data-migracion-v2.json` (estado v2 con colores propios, usado solo a través de copias de trabajo). Pruebas del BFF: archivos temporales. Nunca `backend/data.json` |

## Ejecución por tarea

Cada tarea añade aquí una fila breve en su mismo commit ([guía](../../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). Una línea por control. La primera línea de cada tarea dice con qué se ejecutó. El SHA se rellena en un commit `docs` al cerrar la fase.

| Tarea | Commit | Control | Resultado | Ejecutado con |
|---|---|---|---|---|
| TASK-01 | | Ejecución | Capturas y FCP tomados por un agente delegado; el agente principal revisó la carpeta, la consola, las capturas y los puertos | Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`), esfuerzo medio, delegada; revisión: Opus 5.5, esfuerzo alto |
| TASK-01 | | Capturas «antes» de B (TEST-23, toma «antes») | 20 capturas en `frontend/output/visual-qa/002-temas-configurables/antes/`, sobre `dec89f3` (solo documentación desde `0dcc4e2`). Tienda: `/`, `/catalogo`, `/catalogo/oled-vision-55-4k`, `/carrito` (1 unidad de `p-001`), `/checkout`. Admin: `/login` y, con la sesión del `superadmin` sembrado, `/`, `/productos`, `/pedidos` y `/contenido`. 1440×1200 y 390×844, página completa. BFF 3400, tienda 4400 y Admin 4500 con `proxy.e2e.conf.json`, sobre `backend/data-capturas.json`. Método reproducible: `capturar.mjs` (Playwright con el Chrome instalado), en la misma carpeta, con su `LEEME.md` | ídem |
| TASK-01 | | Copia v2 (AC-23, toma «antes») | `backend/data-migracion-v2.json`: semilla con `PUT /bff/admin/snapshot` de `primaryColor` `#0F766E` y `secondaryColor` `#7C2D12` (`schemaVersion` 2; sha256 `8dd280d2…57ea5ee`). Captura de `/` de la tienda a 1440 y 390 px con una copia de trabajo, en `.../antes-migracion-v2/`; la tienda se ve con el principal `#0F766E`. La copia de trabajo se borró al terminar | ídem |
| TASK-01 | | FCP de `/` en frío (TEST-24 (b), toma «antes») | 5 cargas, cada una en un contexto nuevo, 1440×1200, servidor de desarrollo: 928, 532, 552, 504 y 500 ms; **mediana 532 ms** (`medir-fcp.mjs`, `antes/fcp-antes.json`). La primera carga incluye el calentamiento del servidor | ídem |
| TASK-01 | | Consola | Sin `pageerror`. Mensajes previos a la feature, que la toma «después» debe repetir igual: un 404 de recurso, previsiblemente `/favicon.ico` (los `index.html` no declaran icono y `public/` está vacía), en la tienda y en el acceso al Admin a 1440; `NG0913` (imagen sobredimensionada) en la ficha; `NG02955` (LCP sin `priority`) en `/carrito` a 390. Detalle en `antes/consola.json` | ídem |
| TASK-01 | | Datos y servidores | sha256 de `backend/data.json` del checkout principal igual antes y después (`4095284…e9345f`); el worktree no tiene `backend/data.json`. Puertos 3400, 4400 y 4500 libres al terminar. La demo del equipo (3000, 4200 y 4300) no se tocó | ídem |
| TASK-02 | | Ejecución | Agente delegado con brief cerrado (casos, API y comandos); el agente principal revisó el diff y repitió `verify` sobre el árbol del commit | Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`), esfuerzo alto, delegada; revisión: Opus 5.5, esfuerzo alto |
| TASK-02 | | TEST-01 rojo | `node --test tests/unit/domain/temas/contraste.rules.test.mjs` (desde `backend/`): primero `ERR_MODULE_NOT_FOUND`; con las tres funciones sin implementar, `# tests 4`, `# pass 1`, `# fail 3`, los tres por `Error: Sin implementar` (pasa el de formato inválido, porque el esbozo también lanza) | ídem |
| TASK-02 | | TEST-01 verde | `# tests 4`, `# pass 4`, `# fail 0`. Casos en `casos-tema.json`: blanco y negro 21; `#1D4ED8` sobre blanco 6.70 (6.7016); `#F2B705` sobre blanco 1.8 (1.8180); simetría; minúsculas; `mezclarSrgb` `#183996` y `#E8EDFB`, pesos 1 y 0; `textoMasLegible` con empate | ídem |
| TASK-02 | | `npm run verify` | Exit 0: agentes, sintaxis (52 archivos), formato, lint, arquitectura, build, estructura OK, frontend 22/22, BFF 7/7 y smoke test OK. Prettier sobre los tres archivos: sin cambios | ídem |
| TASK-03 | | Ejecución | Sin delegar. Los valores esperados de `casos-tema.json` (mapas de A, B y C, pares y los tres casos de TEST-04) salieron de un cálculo independiente del código de producción, hecho a partir de la tabla de tokens del plan | Claude Code, Opus 5.5 (`claude-opus-5-5`), esfuerzo alto, no delegada |
| TASK-03 | | TEST-04 rojo | `node --test tests/unit/domain/temas/tema.rules.test.mjs`: primero `ERR_MODULE_NOT_FOUND`; con las exportaciones sin implementar, `# tests 10`, `# pass 1`, `# fail 9` (pasa la de valores no calculables, porque el esbozo también lanza) | ídem |
| TASK-03 | | TEST-04 verde | `# tests 10`, `# pass 10`: principal claro `#FFD400` sobre la base de B (texto, enlace y foco en `#0F172A`); `#123456` sobre la base de B en minúsculas (escala neutra de B y `primary-strong` = `color-mix(in srgb, #123456 62%, #0F172A)`); base oscura `#111318`/`#1B1E25`/`#F5F7FA` con principal `#3B82F6` (texto sobre el principal 3.68, bajo el mínimo; contraste sobre los fondos 17.31 y 15.54) | ídem |
| TASK-03 | | TEST-02 y TEST-03 rojo | `node --test tests/unit/domain/temas/temas-predefinidos.test.mjs` con `TEMAS_PREDEFINIDOS` vacío: `# tests 10`, `# pass 1`, `# fail 9` (pasa la de lista congelada) | ídem |
| TASK-03 | | TEST-02 y TEST-03 verde | `# tests 10`, `# pass 10`: ids, nombres y cinco colores; valores presentados de A y C; B literal de `tokens.css`; mapa completo de 28 tokens en orden; igual a `casos-tema.json`; los 14 pares de A, B y C en AA ([tabla](#pares-de-contraste-de-a-b-y-c-task-03)); en C, `on-primary`, `link` y `focus-ring` calculan `#1F2328`. BFF: 27/27 | ídem |
| TASK-03 | | `npm run verify` | Exit 0: sintaxis (56 archivos), formato, lint, arquitectura, build, estructura OK, frontend 22/22, BFF 27/27 y smoke test OK. Prettier sobre los archivos tocados | ídem |
| TASK-04 | | Ejecución | Agente delegado con brief cerrado; la regla de redondeo (un decimal hacia abajo) la fijó el agente principal. El agente principal revisó el diff y repitió `verify` | Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`), esfuerzo alto, delegada; revisión: Opus 5.5, esfuerzo alto |
| TASK-04 | | TEST-05 rojo | `node --test tests/unit/domain/temas/tema.rules.test.mjs`: primero falla la importación; con `revisarContraste` sin implementar, `# tests 17`, `# pass 10`, `# fail 7` (los 4 casos de `casos-tema.json` y las pruebas de forma, redondeo y bloqueo) | ídem |
| TASK-04 | | TEST-05 verde | `# tests 17`, `# pass 17`. Bloqueo: base de B con contraste `#9CA3AF` (`contrast/background` 2.3 y `contrast/surface` 2.5, `bloquea: true`). Aviso que no bloquea: base oscura (`onPrimary/primary` 3.6 y `onAccent/accent` 2.8, `bloquea: false`). Sin problemas: B. Redondeo: contraste `#717171`, `contrast/background` 4.4687 se informa 4.4 y bloquea. Siempre 14 pares, en orden y congelados. BFF: 34/34 | ídem |
| TASK-04 | | `npm run verify` | Exit 0: sintaxis (56 archivos), formato, lint, arquitectura, build, estructura OK, frontend 22/22, BFF 34/34 y smoke test OK. Prettier sobre los tres archivos: sin cambios | ídem |

### Pares de contraste de A, B y C (TASK-03)

Medidos por TEST-03 con `medirPares` sobre los mapas reales de `temas-predefinidos.mjs`, resolviendo las `var()` y `color-mix()` de B. Fórmula de WCAG 2.1, con dos decimales. El texto de contraste es `--ws-ink`, que es el color de contraste del tema. Todos alcanzan su mínimo: 4.5, o 3 en el foco.

| Par | B | A | C | Medida previa del plan (B / A / C) |
|---|---:|---:|---:|---|
| Contraste sobre fondo / superficie | 16.35 / 17.85 | 16.47 / 18.10 | 14.23 / 15.80 | 16.4 / 17.9 · 16.5 / 18.1 · 14.2 / 15.8 (especificación) |
| Texto secundario sobre fondo / superficie | 5.85 / 6.39 | 6.30 / 6.92 | 6.16 / 6.84 | 5.9 / 6.4 · 6.3 / 6.9 · 6.2 / 6.8 |
| Texto sobre el principal / el principal fuerte | 6.70 / 10.17 | 10.23 / 14.80 | 8.69 / 7.02 | 6.7 / 10.2 · 10.2 / 14.8 · 8.7 / 7.0 |
| Texto sobre el tinte | 8.69 | 10.95 | 5.48 | 8.7 · 11.0 · 5.5 |
| Texto sobre el acento | 5.18 | 8.40 | 8.69 | 5.2 · 8.4 · 8.7 |
| Enlace sobre fondo / superficie | 6.14 / 6.70 | 9.31 / 10.23 | 14.23 / 15.80 | 6.1 / 6.7 · 9.3 / 10.2 · 14.2 / 15.8 |
| Foco sobre fondo / superficie (mínimo 3) | 6.14 / 6.70 | 9.31 / 10.23 | 14.23 / 15.80 | igual que el enlace |
| Pie | 10.81 | 10.78 | 11.14 | 10.8 · 10.8 · 11.1 |
| Texto deshabilitado | 4.84 | 5.09 | 4.53 | 4.8 · 5.1 · 4.5 |

Coinciden con la medida previa salvo B «texto secundario sobre fondo»: 5.85 frente a 5.9 (5.846 redondea a 5.8), una diferencia de redondeo que no cambia el resultado. El texto deshabilitado de C queda en 4.53, sobre el mínimo, así que no hace falta el valor explícito que preveía el plan.
