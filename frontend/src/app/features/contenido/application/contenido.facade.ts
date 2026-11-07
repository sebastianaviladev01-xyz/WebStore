import { computed, inject, Injectable, signal } from '@angular/core';

import { Banner, ConfiguracionTienda } from '../domain/contenido.model';
import { ContenidoGateway } from '../domain/contenido.gateway';

const FALLBACK: ConfiguracionTienda = {
  storeName: 'WebStore',
  logoText: 'W',
  logoUrl: '',
  contactEmail: 'contacto@webstore.demo',
  contactPhone: '+51 999 000 000',
  primaryColor: '#1D4ED8',
  secondaryColor: '#C2410C',
  fontFamily: 'Source Sans 3 Variable',
  headerMessage: 'Despachos en Lima. Consulta cobertura y tarifas.',
  footerText: 'Tecnología y electrohogar para tu casa.',
  topNavigation: 'Inicio, Productos, Pedidos, Envíos',
  sideNavigation: 'TV y audio, Electrohogar, Monitores, Cocina',
  quickLinks: 'Contacto, Envíos, Privacidad, Términos, Libro de reclamaciones',
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
  contactPageEnabled: true,
  shippingPageEnabled: true,
  privacyPageEnabled: true,
  termsPageEnabled: true,
};

@Injectable({ providedIn: 'root' })
export class ContenidoFacade {
  private readonly gateway = inject(ContenidoGateway);
  private readonly settingsState = signal<ConfiguracionTienda>(FALLBACK);
  private readonly bannersState = signal<readonly Banner[]>([]);
  private loadPromise: Promise<void> | null = null;

  readonly settings = this.settingsState.asReadonly();
  readonly activeBanners = computed(() => {
    const now = Date.now();
    return this.bannersState().filter(
      (banner) =>
        banner.active && new Date(banner.startAt).getTime() <= now && new Date(banner.endAt).getTime() >= now,
    );
  });
  readonly heroBanners = computed(() =>
    this.activeBanners()
      .filter((banner) => banner.placement === 'hero')
      .slice(0, 3),
  );
  readonly promotionalBanners = computed(() =>
    this.activeBanners()
      .filter((banner) => banner.placement === 'promotion' || banner.placement === 'secondary')
      .slice(0, 3),
  );
  readonly topNavigation = computed(() => this.parseList(this.settings().topNavigation));
  readonly sideNavigation = computed(() => this.parseList(this.settings().sideNavigation));
  readonly quickLinks = computed(() => this.parseList(this.settings().quickLinks));
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

  private async fetchContent(): Promise<void> {
    try {
      const [settings, banners] = await Promise.all([this.gateway.getSettings(), this.gateway.getBanners()]);
      const resolved = { ...FALLBACK, ...settings };
      this.settingsState.set(resolved);
      this.bannersState.set(banners);
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--ws-primary', resolved.primaryColor);
        document.documentElement.style.setProperty('--ws-accent', resolved.secondaryColor);
        // Un nombre de familia con dígitos (p. ej. 'Source Sans 3') solo es válido en CSS entre comillas.
        document.documentElement.style.setProperty(
          '--ws-font',
          `"${resolved.fontFamily.replace(/["']/g, '')}"`,
        );
      }
    } catch {
      this.settingsState.set(FALLBACK);
    }
  }

  private parseList(value: string): readonly string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
