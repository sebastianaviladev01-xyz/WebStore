# 0006. Organizar el frontend por features con capas internas

- Estado: Aceptada
- Fecha: 2026-11-06

## Contexto

### Por qué había que decidir

El storefront estaba en capas horizontales (`domain/models`, `domain/ports`, `application/<x>`, `infrastructure/<x>`, `features/<x>`, `shared/ui`): el código de una capacidad estaba repartido en cinco carpetas y nada impedía que una página llamara a un adaptador HTTP. El Admin tenía `domain/`, `application/`, `infrastructure/` y `pages/`. IdShield resolvió lo mismo con su ADR-0007.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Features con capas internas y Sheriff (elegida)** | `features/<feature>/{domain,application,data,presentation}`, puertos como clases abstractas y límites comprobados en ESLint | El código de cada capacidad junto; reglas verificables; igual que IdShield | Más carpetas; hay que declarar las dependencias entre features |
| Mantener las capas horizontales | Solo renombrar archivos | Diff pequeño | Los límites siguen sin comprobarse |

## Decisión

Organizaremos cada aplicación por features con capas internas, con los nombres y sufijos de IdShield y los límites en [`frontend/sheriff.config.ts`](../../frontend/sheriff.config.ts). Detalle en [`frontend/architecture.md`](../../frontend/architecture.md).

Diferencias con IdShield, por el negocio de WebStore:

- Una facade puede usar la de otra feature declarada (el checkout coordina carrito, cuenta y pedidos). El grafo de features es acíclico.
- La feature `vitrina` reúne la presentación que combina catálogo, carrito y contenido, para que `catalogo` no dependa de `carrito`.
- En el Admin, `UsuarioAdmin` pasó al dominio de `sesion` y el puerto `TiendaGateway` recibe el token como argumento, para que `data/` no dependa de `application/`.

*Motivo:* es la única opción que hace verificables los límites, y el equipo ya la conoce.

## Consecuencias

- `npm run lint` y `npm run test:architecture` fallan si una dependencia rompe las reglas.
- Dos plantillas tienen una excepción de línea a `interactive-supports-focus`: un contenedor que escucha Escape o `focusout` de sus hijos enfocables.
- La reorganización no cambió el resultado: DOM y capturas de las 36 pantallas, en escritorio y móvil, iguales antes y después.
