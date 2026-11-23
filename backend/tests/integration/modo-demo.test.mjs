/**
 * TEST-12: levanta el BFF real con un archivo de estado temporal (nunca `backend/data.json`) y comprueba
 * `WEBSTORE_DEMO_MODE` y la caché de `theme.css`. Solo `true` (sin distinguir mayúsculas y sin espacios en los
 * extremos) enciende el modo demo; con cualquier otro valor, `theme.css` ignora la cookie `ws_tema_vista_previa`
 * (D4, D5 y ADR-0012).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverEntry = fileURLToPath(new URL('../../src/main.mjs', import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const COOKIE = 'ws_tema_vista_previa';

/**
 * Arranca el BFF con `modoDemo` como valor de la variable (`undefined`: sin definir) y `extra` como variables
 * adicionales, y ejecuta `alArrancar`.
 */
async function conBff(port, modoDemo, alArrancar, extra = {}) {
  const dataFile = join(tmpdir(), `webstore-modo-demo-${port}-${process.pid}.json`);
  await unlink(dataFile).catch(() => {});
  const env = { ...process.env, PORT: String(port), WEBSTORE_DATA_FILE: dataFile };
  delete env.WEBSTORE_DEMO_MODE;
  delete env.WEBSTORE_SHOW_TEST_CREDENTIALS;
  if (modoDemo !== undefined) env.WEBSTORE_DEMO_MODE = modoDemo;
  Object.assign(env, extra);
  const child = spawn(process.execPath, [serverEntry], { stdio: 'ignore', env });
  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await fetch(`http://localhost:${port}/health`);
        break;
      } catch {
        await sleep(100);
      }
    }
    await alArrancar(`http://localhost:${port}`);
  } finally {
    child.kill();
    await sleep(150);
    await unlink(dataFile).catch(() => {});
  }
}

const hoja = (base, headers = {}) => fetch(`${base}/bff/appearance/theme.css`, { headers });
const tokenPrimario = (tema) => `--ws-primary: ${tema.tokens['--ws-primary']};`;

async function activarComoSuperadmin(base, themeId) {
  const sesion = await (
    await fetch(`${base}/bff/admin/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@webstore.demo', password: 'WebStore#2026' }),
    })
  ).json();
  const authorization = `Bearer ${sesion.token}`;
  const { revision } = await (await fetch(`${base}/bff/admin/themes`, { headers: { authorization } })).json();
  const respuesta = await fetch(`${base}/bff/admin/active-theme`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization },
    body: JSON.stringify({ revision, themeId }),
  });
  assert.equal(respuesta.status, 200, 'no se pudo activar el tema');
}

const apagados = [
  [3111, undefined, 'sin definir'],
  [3112, 'false', '«false»'],
  [3113, '1', '«1»'],
  [3114, 'sí', '«sí»'],
];
for (const [port, valor, nombre] of apagados) {
  test(`WEBSTORE_DEMO_MODE ${nombre}: demoMode false y theme.css ignora la cookie`, async () => {
    await conBff(port, valor, async (base) => {
      const apariencia = await (await fetch(`${base}/bff/appearance`)).json();
      assert.equal(apariencia.demoMode, false);
      assert.equal(apariencia.testCredentials, false);
      assert.deepEqual(
        apariencia.themes.map((tema) => tema.id),
        ['b'],
      );

      const sinCookie = await hoja(base);
      const cuerpo = await sinCookie.text();
      const conCookie = await hoja(base, { cookie: `${COOKIE}=c` });
      assert.equal(await conCookie.text(), cuerpo);
      assert.equal(conCookie.headers.get('etag'), sinCookie.headers.get('etag'));
      assert.ok(cuerpo.includes(tokenPrimario(apariencia.themes[0])));
    });
  });
}

const encendidos = [
  [3115, 'TRUE', '«TRUE»'],
  [3116, ' true ', '« true »'],
];
for (const [port, valor, nombre] of encendidos) {
  test(`WEBSTORE_DEMO_MODE ${nombre}: demoMode true y theme.css sirve la vista previa de la cookie`, async () => {
    await conBff(port, valor, async (base) => {
      const apariencia = await (await fetch(`${base}/bff/appearance`)).json();
      assert.equal(apariencia.demoMode, true);
      assert.equal(apariencia.testCredentials, true);
      assert.equal(apariencia.activeThemeId, 'b');
      assert.deepEqual(
        apariencia.themes.map((tema) => tema.id),
        ['a', 'b', 'c'],
      );
      const [, temaB, temaC] = apariencia.themes;

      const activo = await hoja(base);
      const conVistaPrevia = await hoja(base, { cookie: `otra=1; ${COOKIE}=c` });
      assert.ok((await activo.text()).includes(tokenPrimario(temaB)));
      assert.ok((await conVistaPrevia.text()).includes(tokenPrimario(temaC)));
      assert.notEqual(conVistaPrevia.headers.get('etag'), activo.headers.get('etag'));

      // Una cookie que no es un tema no hace fallar la hoja: sirve el activo.
      const invalida = await hoja(base, { cookie: `${COOKIE}=no-existe` });
      assert.equal(invalida.status, 200);
      assert.equal(invalida.headers.get('etag'), activo.headers.get('etag'));
    });
  });
}

test('WEBSTORE_SHOW_TEST_CREDENTIALS=true sin modo demo: testCredentials true, sin tuerca y theme.css ignora la cookie', async () => {
  await conBff(
    3118,
    'false',
    async (base) => {
      const apariencia = await (await fetch(`${base}/bff/appearance`)).json();
      assert.equal(apariencia.demoMode, false);
      assert.equal(apariencia.testCredentials, true);
      assert.deepEqual(
        apariencia.themes.map((tema) => tema.id),
        ['b'],
      );
      const sinCookie = await hoja(base);
      const conCookie = await hoja(base, { cookie: `${COOKIE}=c` });
      assert.equal(conCookie.headers.get('etag'), sinCookie.headers.get('etag'));
      assert.equal(sinCookie.headers.get('vary'), null);
    },
    { WEBSTORE_SHOW_TEST_CREDENTIALS: 'true' },
  );
});

test('theme.css: cabeceras, 304 con el mismo ETag y 200 con otro ETag tras activar otro tema', async () => {
  await conBff(3117, 'true', async (base) => {
    const primera = await hoja(base);
    const etag = primera.headers.get('etag');
    const cuerpo = await primera.text();
    assert.equal(primera.status, 200);
    assert.equal(primera.headers.get('content-type'), 'text/css; charset=utf-8');
    assert.equal(primera.headers.get('cache-control'), 'no-cache');
    assert.match(primera.headers.get('vary') ?? '', /(^|,\s*)Cookie(\s*,|$)/i);
    assert.match(etag ?? '', /^"[^"]+"$/);
    assert.match(cuerpo, /^:root:root \{\n(  --ws-[a-z0-9-]+: [^;{}\n]+;\n)+\}\n$/);

    const repetida = await hoja(base, { 'if-none-match': etag });
    assert.equal(repetida.status, 304);
    assert.equal(await repetida.text(), '');

    await activarComoSuperadmin(base, 'c');
    const trasActivar = await hoja(base, { 'if-none-match': etag });
    assert.equal(trasActivar.status, 200);
    assert.notEqual(trasActivar.headers.get('etag'), etag);
    assert.notEqual(await trasActivar.text(), cuerpo);
  });
});

// Lote 14 (PBI-0188, ADR-0022): la tuerca de la demo ofrece solo A, B y C. La apariencia pública no publica los temas
// propios (salvo el activo, para pintarlo) y `theme.css` no sirve la vista previa de un tema propio.
test('modo demo: la apariencia trae solo A, B, C y el activo, y la cookie de un tema propio se ignora', async () => {
  await conBff(3119, 'true', async (base) => {
    const sesion = await (
      await fetch(`${base}/bff/admin/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'owner@webstore.demo', password: 'WebStore#2026' }),
      })
    ).json();
    const authorization = `Bearer ${sesion.token}`;
    const { revision } = await (
      await fetch(`${base}/bff/admin/themes`, { headers: { authorization } })
    ).json();
    const creado = await fetch(`${base}/bff/admin/themes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization },
      body: JSON.stringify({
        revision,
        name: 'Propio de la demo',
        colors: {
          primary: '#0A7A5A',
          secondary: '#FFB300',
          background: '#F3F5F8',
          surface: '#FFFFFF',
          contrast: '#0F172A',
        },
      }),
    });
    assert.equal(creado.status, 201);
    const propio = (await creado.json()).themes.find((tema) => tema.kind === 'custom');

    const apariencia = await (await fetch(`${base}/bff/appearance`)).json();
    assert.deepEqual(
      apariencia.themes.map((tema) => tema.id),
      ['a', 'b', 'c'],
    );
    const activo = await (await hoja(base)).text();
    const conPropio = await hoja(base, { cookie: `${COOKIE}=${encodeURIComponent(propio.id)}` });
    assert.equal(await conPropio.text(), activo);

    await activarComoSuperadmin(base, propio.id);
    const conActivoPropio = await (await fetch(`${base}/bff/appearance`)).json();
    assert.deepEqual(
      conActivoPropio.themes.map((tema) => tema.id),
      ['a', 'b', 'c', propio.id],
    );
    const temaC = conActivoPropio.themes[2];
    assert.ok((await (await hoja(base, { cookie: `${COOKIE}=c` })).text()).includes(tokenPrimario(temaC)));
  });
});
