# US07 — Registrar y verificar una cuenta

- Épica: [EP03 — Cuenta del cliente](../ep-03-cuenta-cliente.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: cuenta opcional, verificación); [TRACEABILITY](../../../TRACEABILITY.md) («Registro/login/recuperación», «Verificación por código»); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (Cuenta del cliente)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** cliente
- **Quiero** registrar una cuenta y activarla con un código de verificación
- **Para** consultar mis pedidos sin depender del dispositivo

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Registro

- **Dado** que el cliente no tiene cuenta
- **Cuando** se registra con sus datos y una contraseña
- **Entonces** el sistema crea la cuenta sin activar y genera un código de verificación temporal.

### Escenario 02 – Verificación

- **Dado** que el cliente recibió un código de verificación
- **Cuando** lo ingresa dentro de los 15 minutos siguientes
- **Entonces** la cuenta queda activa.

### Escenario 03 – Código vencido

- **Dado** que pasaron más de 15 minutos desde que se generó el código
- **Cuando** el cliente lo ingresa
- **Entonces** el sistema lo rechaza.

### Escenario 04 – Pedir un código nuevo

- **Dado** que el código venció o el cliente no lo tiene
- **Cuando** escribe su correo en «Verifica tu cuenta» y pide un código nuevo, o intenta ingresar sin haber verificado
- **Entonces** el sistema genera un código nuevo y anula el anterior, con la misma respuesta exista o no la cuenta; el ingreso le ofrece ir a verificarla. El código nunca viaja en la dirección de la página.

> Añadido el 2026-11-15 por el lote 05 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0098, decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md); el 2026-11-20 Daniel pidió que diga «te enviamos un código» y «Verificar cuenta», PBI-0180), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-cuenta-formularios.spec.ts`.

## Fuera de alcance y pendientes

- La demo entrega el código en la respuesta; el correo transaccional real está pendiente (PBI-0008 del [backlog](../../../backlog.md)).
