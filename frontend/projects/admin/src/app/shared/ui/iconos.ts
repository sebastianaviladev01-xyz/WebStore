/**
 * Íconos del backoffice: trazos de un SVG de 24 × 24, solo trazo (1.8), sin dependencias nuevas ni fuentes de íconos.
 * Los de los módulos son los del menú lateral (lote 07b, PBI-0044; el camión de «Tarifas de envío» es el del menú de
 * la tienda). Los de las acciones van a la izquierda del texto de cada botón (lote 31, ADR-0027, PBI-0243; confirmado
 * por Sebastián Avila; los del panel de filtros son los del lote 11, PBI-0171).
 */
export const ICONOS = {
  // Módulos: el menú lateral y el título de cada página.
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  productos: 'M3 12V4h8l9 9-8 8zM7.5 7.5h.01',
  inventario: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',
  categorias: 'M3 6h6l2 2h10v11H3z',
  marcas: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  pedidos: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  clientes:
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M21 20a6 6 0 0 0-4-5.6',
  reclamaciones: 'M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h11',
  banners: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01',
  contenido: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  entregas: 'M4 6h16v14H4zM8 3v5M16 3v5M4 10h16M8 14h2M14 14h2M8 17h2',
  temas:
    'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.7-1.4-.7-2.3 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5zM7.5 11h.01M10 7.5h.01M15 7.5h.01',
  envios:
    'M2 7h12v10H2zM14 11h4l4 3v3h-8M6 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM18 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  usuarios:
    'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 17a4 4 0 0 1 8 0',
  // Páginas sin entrada en el menú: Perfil (una persona) e Ingreso (entrar).
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  ingresar: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  // Acciones de los botones.
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  limpiar:
    'M7 21l-4.3-4.3a2.4 2.4 0 0 1 0-3.4l9.6-9.6a2.4 2.4 0 0 1 3.4 0l5.6 5.6a2.4 2.4 0 0 1 0 3.4L13 21M7 21h14M5 11l9 9',
  agregar: 'M12 5v14M5 12h14',
  guardar: 'M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7',
  cancelar: 'M6 6l12 12M18 6L6 18',
  volver: 'M19 12H5M11 18l-6-6 6-6',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  eliminar: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  quitar: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6',
  cargar: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  activar: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  subir: 'M12 19V5M6 11l6-6 6 6',
  anterior: 'M15 6l-6 6 6 6',
  siguiente: 'M9 6l6 6-6 6',
  actualizar: 'M20 11a8 8 0 0 0-14.9-4M4 4v4h4M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4',
  ver: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  contrasena: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  salir: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  deshacer: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  // Lote 43 (ADR-0033, PBI-0265 y PBI-0269): exportar, la paginación del pie, las fichas del resumen y la confirmación.
  exportar: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  hojaDeCalculo: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7M12.5 12v8',
  imprimir: 'M6 9V3h12v6M6 18H4v-8h16v8h-2M6 14h12v7H6z',
  desplegar: 'M6 9l6 6 6-6',
  primera: 'M17 6l-6 6 6 6M7 6v12',
  ultima: 'M7 6l6 6-6 6M17 6v12',
  confirmar: 'M5 12.5l4.5 4.5L19 7',
  lista: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  inactivo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12h8',
  alerta: 'M12 3.5l9.5 16.5h-19zM12 10v4.5M12 17.5h.01',
  // Lote 44 (ADR-0033, PBI-0268): las ayudas, la fila de cabecera y las secciones de los registros.
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  calendario: 'M4 6h16v14H4zM8 3v5M16 3v5M4 10h16',
  datos: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  precio:
    'M12 3v18M16 7.5C16 5.6 14.2 4.5 12 4.5S8 5.6 8 7.5s1.8 2.6 4 3 4 1.4 4 3.4-1.8 3.1-4 3.1-4-1.2-4-3.1',
  enlace:
    'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
} as const;

export type NombreIcono = keyof typeof ICONOS;

/**
 * Ícono de cada módulo según el primer tramo de su ruta: la entrada del menú lateral y el título de sus páginas,
 * también las de registro (`/productos/nuevo` lleva el de Productos). Una sola tabla para los dos, para que no se
 * separen. Perfil e Ingreso no están en el menú: llevan uno propio.
 */
const ICONO_DEL_MODULO: Readonly<Record<string, NombreIcono>> = {
  '': 'dashboard',
  productos: 'productos',
  inventario: 'inventario',
  categorias: 'categorias',
  marcas: 'marcas',
  pedidos: 'pedidos',
  clientes: 'clientes',
  reclamaciones: 'reclamaciones',
  banners: 'banners',
  contenido: 'contenido',
  entregas: 'entregas',
  temas: 'temas',
  envios: 'envios',
  usuarios: 'usuarios',
  perfil: 'perfil',
  login: 'ingresar',
};

/**
 * Ícono del módulo de una ruta del backoffice (`/productos/p-004?pagina=2` → `productos`), o `null` si la ruta no es
 * de ningún módulo. Sin los parámetros ni el fragmento, y con o sin la barra inicial.
 */
export function iconoDelModulo(ruta: string): NombreIcono | null {
  const camino = ruta.split(/[?#]/, 1)[0] ?? '';
  const modulo = camino.replace(/^\/+/, '').split('/', 1)[0] ?? '';
  return Object.hasOwn(ICONO_DEL_MODULO, modulo) ? (ICONO_DEL_MODULO[modulo] ?? null) : null;
}
