# 0003. Usar español para el vocabulario de negocio

- Estado: Aceptada
- Fecha: 2026-11-06

## Contexto

### Por qué había que decidir

Las rutas y la interfaz de WebStore están en español (`/catalogo`, `/carrito`, `/libro-reclamaciones`), pero el código usaba nombres en inglés (`CatalogFacade`, `CartStore`). IdShield nombra el negocio en español y lo técnico en inglés (su ADR-0007).

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Español de negocio, inglés técnico (elegida)** | `features/catalogo`, `CatalogoFacade`, `BffCatalogoGateway`, `Producto` | Un solo vocabulario entre negocio, interfaz y código; igual que IdShield | Diff grande; convive con lo pendiente en inglés |
| Mantener el inglés con los sufijos de IdShield | `features/catalog`, `CatalogFacade` | Diff pequeño | Dos vocabularios para lo mismo |

## Decisión

Las carpetas de features, los archivos y los tipos y clases exportados usan el vocabulario de negocio en español; los términos técnicos (`Facade`, `Gateway`, `Page`, `Bff`, `Command`) van en inglés.

*Motivo:* lo pidió el equipo, para alinear WebStore con IdShield.

## Consecuencias

- El renombrado se hizo con el servicio de lenguaje de TypeScript, no con búsqueda de texto: cada referencia la actualizó el compilador.
- Quedan en inglés, pendientes de migrar: métodos, propiedades y signals de las clases, funciones y constantes internas, y los campos y rutas del contrato HTTP. Cambiar el contrato exige cambiar a la vez el BFF y sus pruebas.
