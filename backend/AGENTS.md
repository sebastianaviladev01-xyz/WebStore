# AGENTS.md — Backend (BFF de prueba)

Reglas para agentes que trabajan en `backend/`. Especializan las del [`AGENTS.md` raíz](../AGENTS.md); no las repiten.

La fuente de verdad del diseño es [`architecture.md`](architecture.md). El contrato HTTP está en [`docs/BFF-CONTRACT.md`](docs/BFF-CONTRACT.md): cualquier cambio de rutas, campos o códigos de error se refleja ahí y en el smoke test ([`tests/integration/contrato.smoke.mjs`](tests/integration/contrato.smoke.mjs)).

## Reglas

- Respeta las capas: `domain/` sin I/O, `application/` sin `node:http` ni `node:fs` (recibe el store y la seguridad como parámetros), `api/` sin acceso directo a la persistencia. La composición va en `src/main.mjs`.
- Sin dependencias externas: solo módulos de Node.
- Nunca modifiques `backend/data.json` en pruebas: usa una copia con `WEBSTORE_DATA_FILE`, como hacen las pruebas.
- Los usuarios de demostración y sus contraseñas solo sirven para uso local.

## Comandos

Desde `backend/`: `npm run check:syntax`, `npm test` y `npm run test:contract`. `npm start` levanta el BFF en el puerto 3000.
