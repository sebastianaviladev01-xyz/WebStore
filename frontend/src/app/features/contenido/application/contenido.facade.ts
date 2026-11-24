import { computed, inject, Injectable, signal } from '@angular/core';

import { Banner, ConfiguracionTienda } from '../domain/contenido.model';
import { ContenidoGateway } from '../domain/contenido.gateway';
import { bannersDeZona, bannersVigentes } from '../domain/banner.rules';

/**
 * Contenido mientras no llega el del BFF (PBI-0111; Daniel pidió el 2026-11-20 el aviso de mantenimiento): sin datos de
 * contacto ni avisos de la demo y con las páginas informativas cerradas, porque no se sabe si el Admin las desactivó.
 * Los accesos del pie son los de la semilla, para que el pie no salte al llegar el contenido. Si nunca llega, la tienda
 * muestra el aviso de mantenimiento (PBI-0182).
 */
const FALLBACK: ConfiguracionTienda = {
  storeName: 'WebStore',
  logoText: 'W',
  logoUrl: '',
  contactEmails: [],
  contactPhones: [],
  socialLinks: [],
  fontFamily: 'Source Sans 3 Variable',
  announcements: [],
  footerText: 'Tecnología y electrohogar para tu casa.',
  sideNavigation: 'TV y audio, Electrohogar, Monitores, Cocina',
  quickLinks: [
    { group: 'Mi cuenta', label: 'Ingresar', url: '/cuenta/login' },
    { group: 'Mi cuenta', label: 'Mi perfil', url: '/cuenta/perfil' },
    { group: 'Mi cuenta', label: 'Mis pedidos', url: '/pedidos' },
    { group: 'Mi cuenta', label: 'Recuperar acceso', url: '/cuenta/recuperar' },
    { group: 'Información', label: 'Envíos', url: '/info/envios' },
    { group: 'Información', label: 'Privacidad', url: '/info/privacidad' },
    { group: 'Información', label: 'Términos', url: '/info/terminos' },
    { group: 'Ayuda', label: 'Contacto', url: '/info/contacto' },
    { group: 'Ayuda', label: 'Libro de reclamaciones', url: '/libro-reclamaciones' },
    { group: 'Ayuda', label: 'Carrito', url: '/carrito' },
  ],
  benefits:
    'Compra como invitado|No necesitas crear una cuenta para hacer tu pedido.;Envío según tu distrito|El costo depende de tu distrito y despachamos desde la tienda más cercana.;Stock a la vista|Cada producto muestra cuántas unidades quedan.;Libro de reclamaciones|Te respondemos en un máximo de 15 días hábiles.',
  contactContent:
    'Nuestro equipo puede orientarte antes y después de tu compra. Escríbenos o llámanos dentro del horario de atención publicado por la tienda.',
  shippingContent:
    'Los costos y la cobertura se calculan según el origen y el distrito de destino. La fecha final se confirma al registrar el pedido.',
  privacyContent:
    'Usamos tus datos para gestionar la compra, coordinar la entrega, atender solicitudes y cumplir obligaciones aplicables. Puedes actualizar o eliminar tu cuenta desde el perfil.',
  termsContent:
    'Los precios incluyen IGV salvo indicación expresa. La disponibilidad se confirma al registrar el pedido. Puedes solicitar cambios o cancelación dentro de las 24 horas posteriores a la compra, siempre que el pedido aún lo permita.',
  contactPageEnabled: false,
  shippingPageEnabled: false,
  privacyPageEnabled: false,
  termsPageEnabled: false,
};

/**
 * Estado del contenido (PBI-0182): `cargando` hasta la primera respuesta, `listo` desde que llegó una vez y
 * `sin-contenido` si el primer intento falló. Un fallo al recargar no deja de estar `listo` (PBI-0111).
 */
export type EstadoContenido = 'cargando' | 'listo' | 'sin-contenido';

@Injectable({ providedIn: 'root' })
export class ContenidoFacade {
  private readonly gateway = inject(ContenidoGateway);
  private readonly settingsState = signal<ConfiguracionTienda>(FALLBACK);
  private readonly bannersState = signal<readonly Banner[]>([]);
  private readonly estadoState = signal<EstadoContenido>('cargando');
  private readonly reintentandoState = signal(false);
  private loadPromise: Promise<void> | null = null;

  readonly settings = this.settingsState.asReadonly();
  readonly estado = this.estadoState.asReadonly();
  /** El contenido nunca llegó: la tienda muestra el aviso de mantenimiento en lugar de una tienda a medias. */
  readonly enMantenimiento = computed(() => this.estadoState() === 'sin-contenido');
  /** «Reintentar» está pidiendo el contenido otra vez. */
  readonly reintentando = this.reintentandoState.asReadonly();
  readonly activeBanners = computed(() => bannersVigentes(this.bannersState(), new Date()));
  readonly heroBanners = computed(() => bannersDeZona(this.activeBanners(), ['hero']));
  readonly promotionalBanners = computed(() =>
    bannersDeZona(this.activeBanners(), ['promotion', 'secondary']),
  );
  readonly sideNavigation = computed(() => this.parseList(this.settings().sideNavigation));
  readonly benefits = computed(() =>
    this.settings()
      .benefits.split(';')
      .map((entry) => {
        const [title, description = ''] = entry.split('|').map((item) => item.trim());
        return { title, description };
      })
      .filter((item) => item.title),
  );

  constructor() {
    void this.load();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => void this.load(true));
    }
  }

  load(force = false): Promise<void> {
    if (!force && this.loadPromise) return this.loadPromise;
    this.loadPromise = this.fetchContent();
    return this.loadPromise;
  }

  /** Botón «Reintentar» del aviso de mantenimiento (PBI-0182). */
  async reintentar(): Promise<void> {
    this.reintentandoState.set(true);
    try {
      await this.load(true);
    } finally {
      this.reintentandoState.set(false);
    }
  }

  private async fetchContent(): Promise<void> {
    try {
      const [settings, banners] = await Promise.all([this.gateway.getSettings(), this.gateway.getBanners()]);
      const resolved = { ...FALLBACK, ...settings };
      this.settingsState.set(resolved);
      this.bannersState.set(banners);
      this.estadoState.set('listo');
      // Contenido ya no trae colores (D3): el color de la tienda lo aplica el tema activo.
      if (typeof document !== 'undefined') {
        // Un nombre de familia con dígitos (p. ej. 'Source Sans 3') solo es válido en CSS entre comillas.
        document.documentElement.style.setProperty(
          '--ws-font',
          `"${resolved.fontFamily.replace(/["']/g, '')}"`,
        );
      }
    } catch {
      // Un fallo pasajero no reemplaza el contenido que ya llegó por el de respaldo (PBI-0111); si nunca llegó, la
      // tienda queda en mantenimiento (PBI-0182).
      if (this.estadoState() !== 'listo') this.estadoState.set('sin-contenido');
    }
  }

  private parseList(value: string): readonly string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
