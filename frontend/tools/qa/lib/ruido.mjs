// Clasificación de las diferencias de `comparar.mjs` (lote 37, PBI-0253, ADR-0031). Funciones puras, probadas en
// `ruido.spec.mjs`. `comparar.mjs` las ejecuta dentro del navegador con su código fuente (`toString()`): no pueden usar
// nada de fuera de su cuerpo, y los límites les llegan como argumento.
//
// Entre dos tomas del mismo código, el borde suavizado de las esquinas redondeadas cambia a veces unos pocos niveles:
// en el inicio a 1440 px salían 16 píxeles distintos en las esquinas de dos botones, con 33 frente al umbral de 30.
//
// El grupo de un píxel distinto es su entorno: los píxeles que se tocan con él (también en diagonal) y cambian más de la
// mitad del umbral. Así, unos píxeles sueltos por encima del umbral en un área que cambia entera un poco menos (un
// color sutil) forman un solo grupo grande, y unas esquinas suavizadas, grupos de unos pocos píxeles. Una diferencia es
// ruido de antialiasado si cumple todo esto:
//   - su grupo tiene como mucho `pixelesPorGrupo` píxeles;
//   - ningún píxel del grupo pasa del umbral en más de `excesoMaximo`;
//   - toda la captura suma como mucho `pixelesPorCaptura` píxeles de ruido por encima del umbral. Si pasa de ahí, ya no
//     son unas esquinas sueltas y todo cuenta como diferencia.
// Un cambio real pequeño no pasa: un borde, una línea de texto o un color sutil en un área forman grupos grandes, y un
// ícono que se mueve o un píxel de otro color pasan del umbral de sobra. Los píxeles que cuentan siguen siendo los que
// pasan del umbral. El ruido no se esconde: el resumen lo cuenta aparte, con su zona.

/**
 * Límites del ruido, fijados con tomas repetidas del mismo código (lote 37, ADR-0031): el inicio y la ficha con A, B,
 * C y dos temas propios, a 1440 y 375 px. Con la máquina libre, 0 píxeles distintos en 8 pares de tomas. Con la máquina
 * cargada (los cuatro núcleos ocupados), en 4 de 6 pares salieron grupos de 1 a 10 píxeles con su entorno (las esquinas
 * de «Ver electrohogar» y «Ver monitores» del inicio con C, las de las miniaturas y píxeles sueltos de la foto de la
 * ficha), con 1 a 4 por encima del umbral, hasta 37 frente al umbral de 30 y hasta 24 píxeles en una captura. Un cambio
 * real a propósito, el botón secundario un 9 % más claro, dio 168 píxeles sueltos por encima del umbral, hasta 38, en
 * un solo grupo de 12 993. Cada límite deja margen sobre lo medido: 16 píxeles por grupo, 10 por encima del umbral y
 * 48 píxeles por captura.
 */
export const LIMITES_DE_RUIDO = { pixelesPorGrupo: 16, excesoMaximo: 10, pixelesPorCaptura: 48 };

/**
 * Umbral por píxel por omisión de `comparar.mjs`: la diferencia mínima, suma de los tres canales, para contar un píxel
 * como distinto. Se queda en 30 tras medirlo en el lote 41 (PBI-0260, ADR-0032), con los límites de ruido de arriba.
 *
 * Tomas repetidas del mismo código: la tienda del lote 37 (inicio y ficha con A, B y C, a 1440 y 375 px, y la ficha en
 * la ventana) y cinco páginas del backoffice del lote 35 (B y C), 40 capturas por toma. Cuatro tomas con la máquina
 * libre y cuatro con los cuatro núcleos ocupados; 10 pares (4 libres, 2 cargados y 4 de una libre con una cargada), 400
 * comparaciones. Capturas con diferencias, que serían falsos positivos:
 *   - 30: 0 de 400 (el ruido de la foto de la ficha con C, hasta 35 con la máquina cargada, sale aparte como ruido);
 *   - 24: 12, en 4 de los 6 pares con una toma cargada (la foto de la ficha con C, 2 píxeles que pasan de 24 en 11);
 *   - 20: 21, también con la máquina libre (32 píxeles del pie del inicio con C a 1440 px, en 2 de los 4 pares libres);
 *   - 15: 21, y con la máquina cargada hasta 211 píxeles en la foto de la ficha; 10: 28.
 * Cambios reales sutiles aplicados a propósito en una toma, sin commit (capturas en que salen, de 40):
 *   - un borde de 1 px que cambia 22 en total: 0 con 30 y con 24; 40 con 20;
 *   - un botón que cambia 21 en total (unos 7 % más claro): 0 con 30 y con 24; 37 con 20;
 *   - un botón que cambia 12 en total (unos 4 % más claro): 0 con 30, 24, 20 y 15; 37 con 10.
 * Bajarlo a 24 no hace salir ninguno de esos cambios y da falsos positivos con carga; a 20 los haría salir, pero con
 * falsos positivos también con la máquina libre, y evitarlos pediría ensanchar los límites de ruido hasta esconder
 * cambios pequeños de verdad. Es un límite conocido: un cambio de color de menos de 30 en total no sale.
 */
export const UMBRAL_POR_OMISION = 30;

/** Diferencia de cada píxel entre dos imágenes RGBA del mismo tamaño: la suma de las diferencias de los tres canales. */
export function diferenciasPorPixel(a, b) {
  const diferencias = new Uint16Array(a.length / 4);
  for (let i = 0, p = 0; i < a.length; i += 4, p++) {
    diferencias[p] = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  }
  return diferencias;
}

/**
 * Clasifica cada píxel: 0 igual (no pasa del umbral), 1 distinto y 2 ruido de antialiasado. Con `estricto`, ningún
 * píxel es ruido. Devuelve el estado de cada píxel, las cuentas y las zonas (`[x0, y0, x1, y1]`, o `null` si no hay).
 */
export function clasificarDiferencias(
  diferencias,
  ancho,
  alto,
  { umbral, pixelesPorGrupo, excesoMaximo, pixelesPorCaptura, estricto = false },
) {
  const DISTINTO = 1;
  const RUIDO = 2;
  const estado = new Uint8Array(ancho * alto);
  const visto = new Uint8Array(ancho * alto);
  const entorno = umbral / 2;
  const grupos = [];
  for (let inicio = 0; inicio < estado.length; inicio++) {
    if (visto[inicio] || diferencias[inicio] <= umbral) continue;
    // Recorre el grupo: los píxeles que se tocan (vecindad de 8) y cambian más de la mitad del umbral.
    const pila = [inicio];
    visto[inicio] = 1;
    const miembros = [];
    let tamano = 0;
    let maximo = 0;
    while (pila.length > 0) {
      const pixel = pila.pop();
      tamano++;
      if (diferencias[pixel] > umbral) {
        estado[pixel] = DISTINTO;
        // Solo se guardan los píxeles de un grupo que todavía puede ser ruido.
        if (tamano <= pixelesPorGrupo) miembros.push(pixel);
      }
      maximo = Math.max(maximo, diferencias[pixel]);
      const x = pixel % ancho;
      const y = (pixel - x) / ancho;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const vx = x + dx;
          const vy = y + dy;
          if (vx < 0 || vy < 0 || vx >= ancho || vy >= alto) continue;
          const vecino = vy * ancho + vx;
          if (visto[vecino] || diferencias[vecino] <= entorno) continue;
          visto[vecino] = 1;
          pila.push(vecino);
        }
      }
    }
    if (!estricto && tamano <= pixelesPorGrupo && maximo <= umbral + excesoMaximo) {
      grupos.push({ miembros, maximo });
    }
  }
  const ruido = grupos.reduce((suma, grupo) => suma + grupo.miembros.length, 0);
  const esRuido = ruido > 0 && ruido <= pixelesPorCaptura;
  if (esRuido) for (const grupo of grupos) for (const pixel of grupo.miembros) estado[pixel] = RUIDO;

  const zonaDe = (valor) => {
    let [x0, y0, x1, y1] = [ancho, alto, -1, -1];
    let cuenta = 0;
    for (let pixel = 0; pixel < estado.length; pixel++) {
      if (estado[pixel] !== valor) continue;
      cuenta++;
      const x = pixel % ancho;
      const y = (pixel - x) / ancho;
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
    return { cuenta, zona: cuenta ? [x0, y0, x1, y1] : null };
  };
  const distintos = zonaDe(DISTINTO);
  const delRuido = esRuido ? zonaDe(RUIDO) : { cuenta: 0, zona: null };
  return {
    estado,
    distintos: distintos.cuenta,
    zona: distintos.zona,
    ruido: delRuido.cuenta,
    gruposDeRuido: esRuido ? grupos.length : 0,
    maximoDelRuido: esRuido ? Math.max(...grupos.map((grupo) => grupo.maximo)) : 0,
    zonaDelRuido: delRuido.zona,
  };
}
