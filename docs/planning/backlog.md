# Backlog de mejoras pendientes

Mejoras, deudas, decisiones y verificaciones pendientes que quedan fuera del alcance de una tarea. Se anotan aquí para que no se pierdan y para que el equipo las revise y decida cuáles priorizar en una próxima iteración.

No sustituye a las [historias de usuario](user-stories/user-stories.md) ni a las [especificaciones](../specs/README.md). Una mejora priorizada que cambia el comportamiento del sistema empieza su propia feature con el [flujo SDD](../architecture/development-workflow.md). Este archivo es el backlog al que remite [ADR-0001](../adrs/0001-registrar-decisiones-de-arquitectura.md) para los pendientes.

[`PENDING-DECISIONS.md`](PENDING-DECISIONS.md) sigue siendo la fuente del estado de cada decisión abierta y de quién la decide. Aquí solo se registra el elemento de trabajo que sale de ella.

## Cómo se usa

- **Anotar.** Quien detecta un elemento, persona o agente, añade una fila con el siguiente `PBI-NNNN` (Product Backlog Item, correlativo de cuatro dígitos), su tipo, su origen y el estado `propuesta`. El origen dice dónde apareció y con qué evidencia. El impacto es una propuesta de quien lo anota.
- **Priorizar.** Lo deciden las personas del equipo. Al priorizar un elemento, se crea su issue en GitHub (si el equipo lo pide), se enlaza en la columna «Decisión e issue» y la fila pasa a `priorizada`. Un agente no prioriza ni crea el issue sin que se lo pidan.
- **Cerrar.** Al terminar, la fila pasa a `hecha` con el PR que lo cierra, o a `descartada` con el motivo. Las filas no se borran.

| Tipo | Qué es |
|---|---|
| `enhancement` | Mejora de una capacidad, de la operación o de la documentación, o decisión de producto que la habilita |
| `technical-debt` | Algo que funciona, pero con un atajo, un defecto menor o un riesgo conocido que habrá que pagar |
| `pending-verification` | Una comprobación o validación pendiente que hoy no se puede cerrar |

| Estado | Significado |
|---|---|
| `propuesta` | Anotada, sin revisar |
| `priorizada` | Aprobada para una iteración |
| `en curso` | Con trabajo abierto (rama o PR) |
| `hecha` | Terminada, con el PR que la cierra |
| `descartada` | No se hará, con el motivo |

## Elementos

| ID | Tipo | Elemento | Origen | Área | Impacto | Estado | Decisión e issue |
|---|---|---|---|---|---|---|---|
| PBI-0001 | `enhancement` | Decidir si el comparador de productos aporta valor suficiente para implementarlo | [Decisiones pendientes](PENDING-DECISIONS.md): «Comparador de productos» | Storefront | Bajo | propuesta | — |
| PBI-0002 | `enhancement` | Elegir la pasarela de pago definitiva (Mercado Pago, Stripe, Niubiz, Openpay, Yape u otra) según costos y restricciones. Hoy el checkout usa métodos demostrativos detrás de `CheckoutGateway` | Decisiones pendientes: «Pasarela definitiva» | Storefront y BFF | Alto | propuesta | — |
| PBI-0003 | `enhancement` | Decidir si se integra la facturación electrónica, tras validación legal y de costos | Decisiones pendientes: «Facturación electrónica integrada» | BFF | Alto | propuesta | — |
| PBI-0004 | `enhancement` | Decidir entre multi-tenant e instalación por cliente, tras una evaluación económica | Decisiones pendientes: «Multi-tenant vs instalación por cliente» | Arquitectura | Alto | propuesta | — |
| PBI-0005 | `enhancement` | Refactorizar hacia SSR y SEO después de la primera versión funcional | Decisiones pendientes: «SSR / SEO final»; [vista de sistema](../architecture/README.md#seo--ssr) | Frontend | Medio | propuesta | — |
| PBI-0006 | `enhancement` | Decidir entre una dirección por pedido (la del MVP) y direcciones por producto | Decisiones pendientes: «Una dirección para todo vs direcciones por producto» | Storefront y BFF | Medio | propuesta | — |
| PBI-0007 | `enhancement` | Definir el extorno real y sus plazos al cancelar un pedido. Depende de PBI-0002 | Decisiones pendientes: «Extorno real / plazos del proveedor» | BFF | Medio | propuesta | — |
| PBI-0008 | `enhancement` | Integrar el correo transaccional real (proveedor, credenciales y plantillas verificadas) para verificación y recuperación de cuentas. Hoy la demo devuelve los códigos en la respuesta | Decisiones pendientes: «Correo transaccional real» | BFF | Alto | propuesta | — |
| PBI-0009 | `pending-verification` | Revisión legal de reclamos, privacidad y condiciones antes de publicar a consumidores | Decisiones pendientes: «Revisión legal final» | Contenido y legal | Alto | propuesta | — |
| PBI-0010 | `enhancement` | Definir el calendario de días no laborables por tienda y su mantenimiento. Hoy el BFF excluye sábados y domingos y lee feriados de `WEBSTORE_NON_WORKING_DATES` | Decisiones pendientes: «Calendario de días no laborables» | BFF y operación | Medio | propuesta | — |
| PBI-0011 | `enhancement` | Definir el flujo y el plazo para atender solicitudes de supresión de datos y la retención postransacción | Decisiones pendientes: «Solicitudes de supresión de datos y retención postransacción» | BFF y legal | Alto | propuesta | — |
| PBI-0012 | `enhancement` | Enviar por correo, con evidencia de entrega, la respuesta del Libro de Reclamaciones. Depende de PBI-0008 | Decisiones pendientes: «Respuesta por correo al Libro de Reclamaciones» | BFF | Alto | propuesta | — |
| PBI-0013 | `pending-verification` | Confirmar con el equipo los permisos exactos del rol Vendedor | Decisiones pendientes: «Permisos exactos del rol Vendedor» | Admin y BFF | Medio | propuesta | — |
| PBI-0014 | `pending-verification` | Confirmar la paleta B con la revisión pendiente | Decisiones pendientes: «Confirmación de la paleta» | Diseño | Medio | propuesta | — |
| PBI-0015 | `pending-verification` | Revisar si Contenido y configuración del Admin equivalen a la configuración de OpenCart | Decisiones pendientes: «Relación de Contenido y configuración con OpenCart» | Admin | Bajo | propuesta | — |
| PBI-0016 | `pending-verification` | Presentar las imágenes propias del inicio y decidir si se cambian | Decisiones pendientes: «Imágenes del inicio» | Diseño | Bajo | propuesta | — |
| PBI-0017 | `pending-verification` | Confirmar que la tienda asume el plazo de 15 días hábiles que anuncia el inicio para el Libro de Reclamaciones | Decisiones pendientes: «Plazo del Libro de reclamaciones en los beneficios» | Contenido y legal | Medio | propuesta | — |
| PBI-0018 | `pending-verification` | Presentar en la revisión los ajustes visuales ya implementados (productos alternados y aparición al hacer scroll) | Decisiones pendientes: «Ajustes visuales propuestos» | Diseño | Bajo | propuesta | — |
| PBI-0019 | `pending-verification` | Decidir qué inicio queda: el actual, con estructura parecida a la portada de LG, o el de `/inicio-anterior`, con estructura propia | Decisiones pendientes: «Estructura del inicio parecida a LG» | Diseño y legal | Medio | propuesta | — |
| PBI-0020 | `enhancement` | Definir el contenido de la página 404, que se mencionó sin detalle | Decisiones pendientes: «Página 404» | Storefront | Bajo | propuesta | — |
| PBI-0021 | `enhancement` | Presentar la priorización de alcance y precio y actualizar las historias de usuario con su resultado | Decisiones pendientes: «Priorización (alcance y precio)» | Planificación | Alto | propuesta | — |
| PBI-0022 | `technical-debt` | Migrar al español el vocabulario que sigue en inglés: métodos, propiedades y signals de las clases, funciones y constantes internas, y campos y rutas del contrato HTTP. Cambiar el contrato exige cambiar a la vez el BFF, sus pruebas y los adaptadores | Reorganización del 2026-11-06: [ADR-0003](../adrs/0003-usar-espanol-para-el-vocabulario-de-negocio.md), Consecuencias; [`frontend/architecture.md` §4](../../frontend/architecture.md#4-componentes-y-convenciones) | Frontend y BFF | Medio | propuesta | — |
| PBI-0023 | `technical-debt` | Dar nombre accesible a los `mat-select` de la página de pedidos del Admin (filtro de estado y cambio de estado). Están dentro de un `<label>` con un `<span>`, que no los nombra para los lectores de pantalla | Reorganización del 2026-11-06: [`pedidos.page.ts`](../../frontend/projects/admin/src/app/features/tienda/presentation/pedidos.page.ts) | Admin | Medio | propuesta | — |
| PBI-0024 | `technical-debt` | Retirar o reutilizar `PaginaInformativaComponent`, que ninguna página usa | Reorganización del 2026-11-06: [`pagina-informativa.component.ts`](../../frontend/src/app/features/contenido/presentation/pagina-informativa.component.ts) | Storefront | Bajo | propuesta | — |
| PBI-0025 | `enhancement` | Configurar un entorno DOM para pruebas de componentes y de facades de Angular. Habilita TDD obligatorio en `application/` y `data/` del frontend ([STD-18](../architecture/standards.md)) | Reorganización del 2026-11-06: [`frontend/architecture.md` §6](../../frontend/architecture.md#6-pruebas), «Pendiente» | Frontend | Medio | propuesta | — |
| PBI-0026 | `bug` | Corregir el error de consola NG02953 (`priority` de `NgOptimizedImage` cambia después de inicializarse) que aparece en desarrollo al volver a pintar el catálogo, y el aviso NG02952 de proporción en las miniaturas de la ficha | Reorganización del 2026-11-06: salida de `ng serve` en las pruebas e2e | Storefront | Bajo | propuesta | — |

No se incluye «Volumen de tarifas de envío»: [`PENDING-DECISIONS.md`](PENDING-DECISIONS.md) lo da por cerrado.
