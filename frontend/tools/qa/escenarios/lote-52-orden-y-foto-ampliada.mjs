// Escenarios del lote 52 (ADR-0037): PBI-0278, el orden del catálogo de la tienda, y PBI-0282, la foto ampliada de la
// ficha del producto. Se toman, antes y después, el catálogo completo y el filtrado por categoría, y la ficha de un
// producto con dos fotos y la de uno con una sola, con los temas A, B y C (por la cookie de la vista previa del modo
// demo). La ficha se mira también con la ventana arriba y al final (`desplazamientos`), por la barra fija de 375 px.
//
// Lo nuevo (el catálogo con un orden elegido y el diálogo de la foto ampliada) no tiene «antes»: se toma solo después,
// con `NUEVAS=1` y `--salida output/visual-qa/lote-52-orden-y-foto-ampliada/nuevas`.
//
// Datos: una copia creada desde la semilla (`WEBSTORE_DATA_FILE`), con el BFF en modo demo. Nada aquí la modifica.

/** El carrusel cambia de banner cada 8 s y los avisos cada 6 s: se anulan, como en el lote 28. */
const quieto = (page) =>
  page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 || plazo === 6000 ? 0 : original(manejador, plazo, ...resto);
  });

/** Pulsa la foto principal de la ficha para abrir la vista ampliada. */
const ampliar = (page) => page.getByRole('button', { name: /^Ampliar foto/ }).click({ timeout: 3000 });

/** Abre la vista ampliada y pasa a la foto siguiente con la flecha derecha. */
const ampliarYSiguiente = async (page) => {
  await ampliar(page);
  await page.getByRole('dialog').waitFor({ timeout: 3000 });
  await page.keyboard.press('ArrowRight');
};

const CON_DOS_FOTOS = '/catalogo/oled-vision-55-4k';
const CON_UNA_FOTO = '/catalogo/lavadora-smartwash-18-kg';

const existentes = {};
for (const tema of ['a', 'b', 'c']) {
  Object.assign(existentes, {
    [`tienda-catalogo-${tema}`]: { tienda: true, ruta: '/catalogo', tema, antes: quieto },
    [`tienda-ficha-${tema}`]: {
      tienda: true,
      ruta: CON_DOS_FOTOS,
      tema,
      antes: quieto,
      desplazamientos: [0, 'final'],
    },
  });
}
Object.assign(existentes, {
  'tienda-catalogo-categoria-b': {
    tienda: true,
    ruta: '/catalogo?categoria=cat-tv',
    tema: 'b',
    antes: quieto,
  },
  'tienda-ficha-una-foto-b': { tienda: true, ruta: CON_UNA_FOTO, tema: 'b', antes: quieto },
});

const nuevas = {};
for (const tema of ['a', 'b', 'c']) {
  Object.assign(nuevas, {
    [`tienda-catalogo-precio-desc-${tema}`]: {
      tienda: true,
      ruta: '/catalogo?orden=precio-desc',
      tema,
      antes: quieto,
    },
    [`tienda-foto-ampliada-${tema}`]: {
      tienda: true,
      ruta: CON_DOS_FOTOS,
      tema,
      antes: quieto,
      accion: ampliar,
    },
  });
}
Object.assign(nuevas, {
  'tienda-catalogo-nombre-asc-categoria-b': {
    tienda: true,
    ruta: '/catalogo?categoria=cat-tv&orden=nombre-asc',
    tema: 'b',
    antes: quieto,
  },
  'tienda-foto-ampliada-siguiente-b': {
    tienda: true,
    ruta: CON_DOS_FOTOS,
    tema: 'b',
    antes: quieto,
    accion: ampliarYSiguiente,
  },
  'tienda-foto-ampliada-una-foto-b': {
    tienda: true,
    ruta: CON_UNA_FOTO,
    tema: 'b',
    antes: quieto,
    accion: ampliar,
  },
});

export const escenarios = process.env.NUEVAS === '1' ? nuevas : existentes;
