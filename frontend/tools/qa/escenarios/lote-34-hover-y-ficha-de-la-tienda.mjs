// Escenarios del lote 34 (ADR-0029): PBI-0247, el principal fuerte (el botón principal con el puntero encima) de los temas
// propios cuyo principal casi es su contraste, y PBI-0248, la barra fija «Agregar al carrito» de la ficha a 375 px.
// Se toman el inicio y la ficha de un producto con los temas A, B y C (por la cookie de la vista previa del modo demo) y
// con dos temas propios: uno cuyo principal fuerte no se distingue del principal (cambia) y otro que ya se distingue
// (no cambia). La ficha se toma también con el puntero encima de «Agregar al carrito», el botón principal.
//
// Datos: una copia creada desde la semilla (`WEBSTORE_DATA_FILE`), con el BFF en modo demo. Los dos temas propios se
// crean una vez, antes de la primera toma, por la API del Admin (`POST /bff/admin/themes`), con los nombres y colores de
// `TEMAS_PROPIOS`; este archivo solo los busca. Un tema propio no se elige con la cookie de la vista previa (ADR-0022):
// el escenario lo activa por la API antes de abrir la página, sobre la copia, y deja la cookie con su id, que la tienda
// descarta. Las dos tomas activan los mismos temas en el mismo orden.
import { activarTema, BFF, tokensDeAdmin } from '../lib/qa.mjs';

/** Temas propios de las capturas: el principal fuerte del primero no se distingue (1.06:1) y el del segundo sí (1.16:1). */
export const TEMAS_PROPIOS = {
  cambia: {
    name: 'QA lote 34 cambia',
    colors: {
      primary: '#1F2328',
      secondary: '#C2410C',
      background: '#F3F5F8',
      surface: '#FFFFFF',
      contrast: '#0F172A',
    },
  },
  igual: {
    name: 'QA lote 34 igual',
    colors: {
      primary: '#123456',
      secondary: '#C2410C',
      background: '#F3F5F8',
      surface: '#FFFFFF',
      contrast: '#0F172A',
    },
  },
};

const productos = await (await fetch(`${BFF}/bff/catalog/products`)).json();
const conStock = productos.find((producto) => producto.stock > 0);

const { superadmin } = await tokensDeAdmin();
const { themes } = await (
  await fetch(`${BFF}/bff/admin/themes`, { headers: { authorization: `Bearer ${superadmin}` } })
).json();
const idDe = (clave) => {
  const tema = themes.find(({ name }) => name === TEMAS_PROPIOS[clave].name);
  if (!tema) throw new Error(`Falta el tema «${TEMAS_PROPIOS[clave].name}»: créalo antes de la primera toma`);
  return tema.id;
};

/** El carrusel cambia de banner cada 8 s y los avisos cada 6 s: se anulan, como en el lote 28. */
const quieto = (page) =>
  page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 || plazo === 6000 ? 0 : original(manejador, plazo, ...resto);
  });

/** Antes de abrir la página: quieta y, con un tema propio, ese tema activo en el BFF. */
const preparar = (idPropio) => async (page) => {
  await quieto(page);
  if (idPropio) await activarTema(superadmin, idPropio);
};

/** El puntero encima de «Agregar al carrito», el botón principal de la ficha (el de la barra fija a 375 px). */
const punteroEnAgregar = (page) =>
  page
    .getByRole('button', { name: /Agregar al carrito/ })
    .filter({ visible: true })
    .last()
    .hover({ timeout: 3000 });

const temas = {
  a: { tema: 'a' },
  b: { tema: 'b' },
  c: { tema: 'c' },
  'propio-cambia': { tema: idDe('cambia'), idPropio: idDe('cambia') },
  'propio-igual': { tema: idDe('igual'), idPropio: idDe('igual') },
};

const escenariosPorTema = {};
for (const [clave, { tema, idPropio }] of Object.entries(temas)) {
  const antes = preparar(idPropio);
  const ficha = `/catalogo/${conStock.slug}`;
  Object.assign(escenariosPorTema, {
    [`tienda-inicio-${clave}`]: { tienda: true, ruta: '/', tema, antes },
    [`tienda-ficha-${clave}`]: { tienda: true, ruta: ficha, tema, antes },
    [`tienda-ficha-puntero-${clave}`]: {
      tienda: true,
      ruta: ficha,
      tema,
      antes,
      accion: punteroEnAgregar,
    },
  });
}

export const escenarios = escenariosPorTema;
