import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// La facade se transpila sin sus `import` (como los specs de domain/), junto con la regla `temaVisible` y los
// errores del puerto. Angular se sustituye por dobles mínimos (`signal`, `computed`, `inject`, `Injectable`),
// exportados para que la prueba registre las dependencias que `inject` devuelve.
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const dobles = `
const signal = (inicial) => {
  let valor = inicial;
  const leer = () => valor;
  leer.set = (nuevo) => { valor = nuevo; };
  leer.asReadonly = () => () => valor;
  return leer;
};
const computed = (calcular) => () => calcular();
const Injectable = () => (clase) => clase;
export const DOCUMENT = Symbol('DOCUMENT');
export class SesionFacade {}
const resolverTemaVisible = (...argumentos) => temaVisible(...argumentos);
export const dependencias = new Map();
const inject = (token) => dependencias.get(token);
`;
const fuente = [
  dobles,
  await leer('../domain/tema-visible.rules.ts'),
  await leer('../../sesion/domain/sesion.gateway.ts'),
  await leer('../domain/temas.gateway.ts'),
  await leer('./cookie-vista-previa.ts'),
  await leer('./temas.facade.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  dependencias,
  DOCUMENT,
  SesionFacade,
  TemasFacade,
  TemasGateway,
  TemasDesactualizadosError,
  ReglaTemaError,
  AVISO_TEMAS_DESACTUALIZADOS,
} = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

const tema = (id, primary) => ({
  id,
  name: id,
  kind: 'predefined',
  colors: { primary, secondary: '#000000', background: '#FFFFFF', surface: '#FFFFFF', contrast: '#000000' },
  tokens: { '--ws-primary': primary },
});
const A = tema('a', '#4C2A92');
const B = tema('b', '#1D4ED8');
const C = tema('c', '#F2B705');
const lista = (revision, activeThemeId) => ({ revision, activeThemeId, themes: [A, B, C] });

/**
 * Facade con un gateway falso que registra cada llamada. `respuestas[metodo]` es el valor que devuelve, o una
 * función que recibe el número de llamada (1, 2…) y devuelve el valor o lanza.
 */
function montar(respuestas) {
  const llamadas = [];
  const cuantas = (metodo) => llamadas.filter((llamada) => llamada.metodo === metodo).length;
  const gateway = new Proxy(
    {},
    {
      get:
        (_, metodo) =>
        async (...argumentos) => {
          llamadas.push({ metodo, argumentos });
          const respuesta = respuestas[metodo];
          return typeof respuesta === 'function' ? respuesta(cuantas(metodo)) : respuesta;
        },
    },
  );
  const propiedades = new Map();
  dependencias.clear();
  dependencias.set(TemasGateway, gateway);
  dependencias.set(SesionFacade, { requireToken: () => 'token' });
  dependencias.set(DOCUMENT, {
    cookie: '',
    location: { protocol: 'http:' },
    documentElement: { style: { setProperty: (nombre, valor) => propiedades.set(nombre, valor) } },
    querySelector: () => null,
  });
  return { facade: new TemasFacade(), llamadas, cuantas, propiedades };
}

const desactualizado = () => {
  throw new TemasDesactualizadosError();
};
const acciones = [
  ['activar', (facade) => facade.activar('c'), 1],
  ['crear', (facade) => facade.crear({ name: 'Mío', colors: B.colors }), 0],
  ['editar', (facade) => facade.editar('x', { name: 'Mío', colors: B.colors }), 1],
  ['borrar', (facade) => facade.borrar('x'), 1],
];

for (const [metodo, ejecutar, posicionRevision] of acciones) {
  test(`${metodo}: tras STALE_THEMES no reintenta, avisa y recarga la lista (AC-19)`, async () => {
    const { facade, llamadas, cuantas } = montar({
      temasAdmin: (vez) => (vez === 1 ? lista(4, 'b') : lista(5, 'a')),
      [metodo]: desactualizado,
    });
    await facade.cargarTemas();
    assert.equal(await ejecutar(facade), false);
    assert.equal(cuantas(metodo), 1, 'el cambio se envía una sola vez');
    const envio = llamadas.find((llamada) => llamada.metodo === metodo);
    assert.equal(envio.argumentos[posicionRevision], 4, 'con la revisión cargada');
    assert.equal(cuantas('temasAdmin'), 2, 'recarga la lista');
    assert.equal(facade.temasAdmin().revision, 5, 'queda la lista nueva');
    assert.equal(facade.aviso(), AVISO_TEMAS_DESACTUALIZADOS);
    assert.equal(facade.guardando(), false);
  });
}

test('activar aplica el tema nuevo sin recargar la página (AC-10)', async () => {
  const { facade, cuantas, propiedades } = montar({
    apariencia: { demoMode: false, activeThemeId: 'b', themes: [B] },
    temasAdmin: lista(0, 'b'),
    activar: lista(1, 'c'),
  });
  await facade.cargar();
  assert.equal(propiedades.get('--ws-primary'), '#1D4ED8');
  await facade.cargarTemas();
  assert.equal(await facade.activar('c'), true);
  assert.equal(facade.temaActivo().id, 'c');
  assert.deepEqual(
    facade.temas().map((item) => item.id),
    ['c'],
    'fuera del modo demo, la apariencia solo trae el activo',
  );
  assert.equal(propiedades.get('--ws-primary'), '#F2B705');
  assert.equal(facade.temasAdmin().revision, 1);
  assert.equal(cuantas('apariencia'), 1, 'no vuelve a pedir la apariencia');
});

test('un error de regla queda con su código y sus detalles, sin recargar la lista', async () => {
  const { facade, cuantas } = montar({
    temasAdmin: lista(2, 'b'),
    crear: () => {
      throw new ReglaTemaError('Elige un color válido en formato #RRGGBB.', 'INVALID_THEME_COLOR', {
        field: 'surface',
      });
    },
  });
  await facade.cargarTemas();
  assert.equal(await facade.crear({ name: 'Mío', colors: B.colors }), false);
  assert.equal(facade.errorDeRegla().code, 'INVALID_THEME_COLOR');
  assert.deepEqual(facade.errorDeRegla().details, { field: 'surface' });
  assert.equal(facade.error(), 'Elige un color válido en formato #RRGGBB.');
  assert.equal(facade.aviso(), null);
  assert.equal(cuantas('temasAdmin'), 1);
});
