# 0007. Organizar el BFF de prueba en capas

- Estado: Aceptada
- Fecha: 2026-11-06

## Contexto

### Por qué había que decidir

El BFF de prueba era un solo archivo de unas 1.265 líneas con configuración, seed, persistencia, seguridad, reglas de negocio y un router de unas 40 rutas. IdShield organiza su backend en Clean Architecture simplificada (Domain, Application, Infrastructure, Api).

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Separar en capas, en Node sin dependencias (elegida)** | `src/{domain,application,infrastructure,api}` por capacidad y `main.mjs` como raíz de composición | Reglas puras y probables; mismo esquema que IdShield | Más archivos para un BFF de demostración |
| Moverlo como un solo archivo | `backend/server.mjs` | Sin riesgo | Sigue mezclando responsabilidades |

## Decisión

Separaremos el BFF de prueba en capas, sin dependencias externas y con el mismo contrato HTTP. Detalle en [`backend/architecture.md`](../../backend/architecture.md).

*Motivo:* deja las reglas de negocio (stock, estados de pedido, tarifas, roles) aisladas del transporte y la persistencia, como en IdShield.

## Consecuencias

- El smoke test del contrato y una comparación de 47 respuestas entre el servidor anterior y el nuevo no mostraron diferencias.
- Sigue siendo un sustituto de demostración: sin identidad gestionada, rate limiting, auditoría ni persistencia transaccional.
