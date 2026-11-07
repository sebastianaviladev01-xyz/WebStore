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

## Fuera de alcance y pendientes

- La demo entrega el código en la respuesta; el correo transaccional real está pendiente (PBI-0008 del [backlog](../../../backlog.md)).
