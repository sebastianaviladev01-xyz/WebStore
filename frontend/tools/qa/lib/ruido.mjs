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
