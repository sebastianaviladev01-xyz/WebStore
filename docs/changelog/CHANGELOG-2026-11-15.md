# Cambios — 2026-11-14 y 2026-11-15: cierre del backlog por lotes

Sebastián Avila pidió cerrar todo lo pendiente lo antes posible. El backlog abierto (127 elementos el 2026-11-14) se cerró en once lotes por área, ordenados por prioridad, como excepción al flujo SDD ([ADR-0017](../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md)). Cada lote tuvo su rama, su PR y la auditoría de la sesión principal.

- **BFF, robustez y seguridad (lote 01, PR #50):** entrada HTTP sin caídas ni `500`, persistencia atómica que no reemplaza un archivo dañado, guardado del Admin todo o nada y validado, reinicio y códigos de prueba solo en modo demo, alta y códigos con respuesta uniforme y tope de intentos, y el contrato reescrito ruta por ruta.
- **Tienda, carrito y checkout (lote 04, PR #51):** aceptación de términos, protección contra el pedido repetido, aviso si cambia el total, fechas de Lima, pedidos ajenos ocultos al cambiar de sesión y estados de carga y error.
- **Admin, guardado y datos (lote 06, PR #52):** guardado por registro sin pisar cambios ajenos ([ADR-0018](../adrs/0018-guardar-los-cambios-del-admin-por-registro.md)), fotos reducidas, validación de SKU, direcciones, correos, marcas y categorías en uso, y sesión vencida.
- **Temas y contraste (lote 03, PR #53):** error, alerta y texto sobre el principal calculados por el tema ([ADR-0019](../adrs/0019-calcular-con-el-tema-el-error-la-alerta-y-el-texto-sobre-el-principal.md)), fondos de Material desde el tema y temas guardados inválidos reparados o descartados.
- **Tienda, cuenta, catálogo y accesibilidad (lote 05, PR #54):** verificación con reenvío, mensajes en los campos, campos con contorno, catálogo que sigue a la URL, sugeridos al agregar, página 404 y favicon.
- **Admin, permisos, listados y accesibilidad (lote 07, PR #55):** permisos de los tres roles según la reunión del 11/11 (feature 006, con respuestas provisionales), «Actualizar» fuera de la cabecera y filtros estándar en todos los listados.
- **Admin, funciones nuevas (lote 07b, PR #56):** personas en línea, actividad reciente, campana de pedidos nuevos, perfil propio, menú reducible e imagen de categoría.
- **BFF, pruebas y limpieza (lote 02, PR #57):** 145 pruebas unitarias más, código de pedido sin repetidos y aviso de feriados.
- **Frontend, pruebas y deuda (lote 08, PR #58):** tipos de `domain/` y de las e2e en `verify`, e2e sin detalles internos, guiones de QA visual versionados y reglas llevadas a `domain/`.
- **Accesibilidad pendiente (lote 10, PR #59):** medidas de contraste de las e2e por lo que se pinta y contador del carrusel a 4.5:1 sobre una foto clara; el velo `--ws-scrim` resultó no estar bajo ningún texto (PBI-0166, descartada).
- **Cierre documental (lote 09):** decisiones provisionales reunidas para la revisión con Daniel, lista de accesibilidad con lector de pantalla, fricciones del trabajo con agentes en la guía y cierre de la excepción.

## Verificación

- Cada lote: `npm run verify` y `npm run test:e2e` completos en verde, ejecutados por la sesión del lote y repetidos por la sesión principal; capturas antes y después cuando tocaba la interfaz, guardadas en `frontend/output/visual-qa/lote-NN-*/` del checkout principal (no se versionan).
- Al terminar el lote 08: 287 pruebas del frontend, 491 del BFF, 34 de arquitectura y 290 e2e (al empezar: 125, 131, 29 y 141).

## Lo que queda abierto

Las decisiones provisionales, por confirmar con Daniel, en las [decisiones pendientes](../planning/PENDING-DECISIONS.md), y los elementos del [backlog](../planning/backlog.md) que dependen de él, de terceros o de una persona (prueba con lector de pantalla), cada uno con su motivo.
