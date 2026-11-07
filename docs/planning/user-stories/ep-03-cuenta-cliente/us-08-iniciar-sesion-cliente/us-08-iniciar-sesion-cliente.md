# US08 — Iniciar sesión y recuperar la contraseña

- Épica: [EP03 — Cuenta del cliente](../ep-03-cuenta-cliente.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: recuperación); [TRACEABILITY](../../../TRACEABILITY.md) («Registro/login/recuperación»); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (Cuenta del cliente)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** cliente con cuenta
- **Quiero** iniciar y cerrar sesión, y recuperar mi contraseña si la olvido
- **Para** acceder a mi cuenta de forma segura

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Iniciar sesión

- **Dado** que el cliente tiene una cuenta activa
- **Cuando** ingresa su correo y su contraseña
- **Entonces** el sistema abre una sesión que vence con el tiempo.

### Escenario 02 – Recuperar la contraseña

- **Dado** que el cliente olvidó su contraseña
- **Cuando** solicita la recuperación e ingresa el código temporal con una contraseña nueva
- **Entonces** puede iniciar sesión con la contraseña nueva.

### Escenario 03 – Cerrar sesión

- **Dado** que el cliente tiene una sesión abierta
- **Cuando** cierra la sesión
- **Entonces** la sesión queda revocada.

## Fuera de alcance y pendientes

- El correo transaccional real está pendiente (PBI-0008 del [backlog](../../../backlog.md)).
