/**
 * Apoyo de las pruebas de integración del lote 01 (ADR-0017): levanta el BFF real con un archivo de estado
 * temporal (nunca `backend/data.json`) en un puerto propio y lo detiene al terminar. No es un archivo de pruebas:
 * `npm test` solo ejecuta `*.test.mjs`.
 */
import { spawn } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const serverEntry = fileURLToPath(new URL('../../../src/main.mjs', import.meta.url));
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Variables que cambian el comportamiento del BFF: cada prueba parte sin ellas y fija las que necesita. */
const VARIABLES_PROPIAS = [
  'WEBSTORE_DEMO_MODE',
  'WEBSTORE_EXPOSE_TEST_CODES',
  'WEBSTORE_ALLOW_STORE_RESET',
  'NODE_ENV',
];

/**
 * Arranca el BFF en `port` con `env` y ejecuta `alArrancar(base, child)`. Si `dataFile` no se indica, usa uno
 * temporal que borra al terminar.
 */
export async function conBff({ port, env = {}, dataFile, conservarArchivo = false }, alArrancar) {
  const archivo = dataFile ?? join(tmpdir(), `webstore-lote01-${port}-${process.pid}.json`);
  if (!dataFile) await unlink(archivo).catch(() => {});
  const entorno = { ...process.env, PORT: String(port), WEBSTORE_DATA_FILE: archivo };
  for (const clave of VARIABLES_PROPIAS) delete entorno[clave];
  Object.assign(entorno, env);
  const child = spawn(process.execPath, [serverEntry], { stdio: 'ignore', env: entorno });
  const base = `http://localhost:${port}`;
  try {
    let listo = false;
    for (let intento = 0; intento < 50 && !listo; intento++) {
      try {
        listo = (await fetch(`${base}/health`)).ok;
      } catch {
        await sleep(100);
      }
    }
    if (!listo) throw new Error(`El BFF no arrancó en el puerto ${port}`);
    return await alArrancar(base, child);
  } finally {
    child.kill();
    await sleep(150);
    if (!conservarArchivo) await unlink(archivo).catch(() => {});
  }
}

/** `fetch` con JSON: devuelve `{ status, headers, body }`, con `body` ya leído (JSON o texto). */
export async function pedir(base, path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const texto = await response.text();
  let cuerpo = texto;
  try {
    cuerpo = texto ? JSON.parse(texto) : null;
  } catch {}
  return { status: response.status, headers: response.headers, body: cuerpo };
}

export const bearer = (token) => ({ authorization: `Bearer ${token}` });

export async function ingresarAlAdmin(base, email = 'owner@webstore.demo', password = 'WebStore#2026') {
  const { status, body } = await pedir(base, '/bff/admin/sessions', {
    method: 'POST',
    body: { email, password },
  });
  if (status !== 201) throw new Error(`No se pudo ingresar al Admin: ${status}`);
  return body;
}

/** Fecha `AAAA-MM-DD` de Lima desplazada `dias` desde hoy. */
export function fechaDeLima(dias = 0) {
  const hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const fecha = new Date(`${hoy}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Pedido válido como lo envía la tienda, con los campos que se le cambien. */
export const pedidoValido = (cambios = {}) => ({
  customer: { fullName: 'Prueba Lote', email: 'lote@example.com', phone: '999999999', document: '12345678' },
  shipping: { addressLine: 'Av Demo 123', district: 'San Isidro', province: 'Lima', department: 'Lima' },
  deliveryDate: fechaDeLima(2),
  paymentMethod: 'card',
  items: [{ productId: 'p-004', quantity: 1 }],
  termsAccepted: true,
  ...cambios,
});
