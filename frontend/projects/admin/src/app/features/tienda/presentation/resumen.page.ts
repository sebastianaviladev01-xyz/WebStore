import { CurrencyPipe, DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  alternarPlegable,
  BloquePlegableDirective,
  FlechaPlegableDirective,
  idDeBloque,
} from '../../../shared/ui/plegable.directive';
import { SesionFacade } from '../../sesion/application/sesion.facade';
import { TiendaFacade } from '../application/tienda.facade';
import {
  calcularIndicadores,
  gruposDeEstado,
  GrupoDeEstado,
  serieDelMes,
  actividadReciente,
  ultimosPedidos,
  ZONA_IANA_LIMA,
} from '../domain/resumen.rules';
import { NOTA_STOCK_BAJO } from '../domain/inventario.rules';
import { ZONA_HORARIA_LIMA } from '../domain/pedido.rules';
import { ETIQUETAS_ESTADO_PEDIDO } from '../domain/tienda.model';
import { clasesDeEstadoPedido } from './estado-pedido';
import { GraficoPedidosComponent } from './grafico-pedidos.component';
import { TarjetaIndicadorComponent } from './tarjeta-indicador.component';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

const MES_EN_LIMA = new Intl.DateTimeFormat('es-PE', {
  month: 'long',
  year: 'numeric',
  timeZone: ZONA_IANA_LIMA,
});

/**
 * Bloques del Dashboard que se pliegan: los que tienen título y, desde el lote 13 (PBI-0187), también la fila de
 * tarjetas de cifras.
 */
type BloqueDashboard = 'cifras' | 'pedidos-por-dia' | 'alertas' | 'ultimos-pedidos' | 'estados' | 'actividad';

/** Qué suman las ventas (lote 13, ADR-0021, PBI-0186). */
const AYUDA_VENTAS =
  'Suma el valor de los productos vendidos, con IGV y sin el costo del envío. No cuenta los pedidos cancelados.';

@Component({
  selector: 'ws-admin-dashboard',
  imports: [
    IconoDirective,
    TituloPaginaDirective,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    NgTemplateOutlet,
    RouterLink,
    BloquePlegableDirective,
    FlechaPlegableDirective,
    GraficoPedidosComponent,
    TarjetaIndicadorComponent,
  ],
  template: `
    <!--
      PBI-0140: «Actualizar» del Dashboard, junto a sus cifras; solo vuelve a consultar sus datos. Lote 13 (ADR-0021,
      PBI-0168): la vista «Dashboard» pasa a llamarse «Dashboard», en la misma ruta (/).
    -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 wsAdminTitulo class="text-3xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p class="mt-2 text-sm text-muted">
          Hola, {{ session.user()?.name }}. Esto es lo que necesita atención hoy.
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 min-h-10 rounded-lg border border-line px-4 text-sm font-medium hover:bg-subtle disabled:opacity-50"
        type="button"
        [disabled]="actualizando()"
        (click)="actualizar()"
      >
        <svg wsAdminIcono="actualizar"></svg>
        {{ actualizando() ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </div>
    @if (errorActualizar(); as mensaje) {
      <p
        class="mt-4 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
        role="alert"
      >
        {{ mensaje }}
      </p>
    }

    <!-- Sin snapshot (BFF caído o sesión vencida) el aviso de error del panel basta: no se muestran cifras a medias. -->
    @if (admin.snapshot()) {
      <!--
        Botón plegable de un bloque con título (feature 003, D1): va dentro del h2, que conserva su nivel y su
        nombre. Controla la región bloque-<id>, que lleva el contenido y el subtítulo.
      -->
      <ng-template #botonDeBloque let-id let-titulo="titulo">
        <button
          type="button"
          class="flex cursor-pointer items-center gap-2 rounded-md text-left"
          [attr.aria-expanded]="bloqueAbierto(id)"
          [attr.aria-controls]="idDeRegion(id)"
          (click)="alternarBloque(id)"
        >
          {{ titulo }}
          <svg wsAdminFlecha class="ws-plegable-indicador h-4 w-4 text-muted"></svg>
        </button>
      </ng-template>

      <!-- Lote 13 (PBI-0187): las tarjetas de cifras se pliegan como los demás bloques, con su propio título. -->
      <section class="mt-6">
        <h2 class="text-lg font-semibold">
          <ng-container
            *ngTemplateOutlet="botonDeBloque; context: { $implicit: 'cifras', titulo: 'Cifras' }"
          />
        </h2>
        <div wsAdminBloquePlegable="cifras" [abierto]="bloqueAbierto('cifras')">
          <div class="ws-plegable-contenido">
            <div
              class="mt-4 grid gap-4 sm:grid-cols-2"
              [class]="verPedidos() && verClientes() ? 'xl:grid-cols-4' : 'xl:grid-cols-3'"
            >
              @if (verPedidos()) {
                <ws-admin-tarjeta-indicador
                  titulo="Total de pedidos"
                  [valor]="(indicadores().pedidos.total | number) ?? '0'"
                  [variacion]="indicadores().pedidos.variacion"
                  enlace="/pedidos"
                />
                <ws-admin-tarjeta-indicador
                  titulo="Total de ventas"
                  [valor]="(indicadores().ventas.total | currency: 'PEN' : 'symbol' : '1.2-2') ?? ''"
                  [variacion]="indicadores().ventas.variacion"
                  [ayuda]="ayudaVentas"
                  enlace="/pedidos"
                />
              }
              @if (verClientes()) {
                <ws-admin-tarjeta-indicador
                  titulo="Total de clientes"
                  [valor]="(indicadores().clientes.total | number) ?? '0'"
                  [variacion]="indicadores().clientes.variacion"
                  enlace="/clientes"
                />
              }
              <ws-admin-tarjeta-indicador
                titulo="Stock bajo"
                [valor]="(admin.lowStock().length | number) ?? '0'"
                [nota]="notaStockBajo"
                [enlace]="enlaceStock()"
                [alerta]="true"
              />
            </div>
          </div>
        </div>
      </section>

      @if (verPedidos()) {
        <!--
          Lote 23 (ADR-0025, PBI-0222; provisional): sin «Pedidos por distrito», que Daniel y Walther llamaron relleno, el
          gráfico ocupa todo el ancho, como «Pedidos por estado». «Clientes nuevos» pasa a «Clientes web nuevos», como
          pidió Walther: son quienes hicieron su primer pedido en la tienda en línea, no los que compran en persona.
        -->
        <section class="admin-card mt-5 min-w-0 p-6">
          <h2 class="text-lg font-semibold">
            <ng-container
              *ngTemplateOutlet="
                botonDeBloque;
                context: {
                  $implicit: 'pedidos-por-dia',
                  titulo: verClientes() ? 'Pedidos y clientes web nuevos por día' : 'Pedidos por día',
                }
              "
            />
          </h2>
          <div wsAdminBloquePlegable="pedidos-por-dia" [abierto]="bloqueAbierto('pedidos-por-dia')">
            <div class="ws-plegable-contenido">
              <p class="mt-1 text-sm text-muted first-letter:uppercase">{{ mes() }}</p>
              <ws-admin-grafico-pedidos
                class="mt-4"
                [serie]="serie()"
                [mes]="mes()"
                [conClientes]="verClientes()"
              />
            </div>
          </div>
        </section>
      }

      <div class="mt-5 grid gap-5 lg:grid-cols-3">
        <section class="admin-card min-w-0 p-6" [class.self-start]="!bloqueAbierto('alertas')">
          <h2 class="text-lg font-semibold">
            <ng-container
              *ngTemplateOutlet="
                botonDeBloque;
                context: { $implicit: 'alertas', titulo: 'Alertas de inventario' }
              "
            />
          </h2>
          <div wsAdminBloquePlegable="alertas" [abierto]="bloqueAbierto('alertas')">
            <div class="ws-plegable-contenido">
              <div class="mt-4 grid gap-2">
                @for (product of admin.lowStock(); track product.id) {
                  <div class="flex justify-between rounded-lg bg-warning-soft px-3 py-2.5 text-sm">
                    <span>{{ product.name }}</span>
                    <strong class="font-semibold text-warning">{{ product.stock }} un.</strong>
                  </div>
                } @empty {
                  <p class="text-sm text-muted">Sin alertas.</p>
                }
              </div>
              <a
                data-sin-icono="enlace de texto"
                [routerLink]="enlaceStock()"
                class="mt-5 inline-flex text-sm font-medium text-link"
              >
                {{ session.can('inventory.manage') ? 'Gestionar inventario →' : 'Gestionar productos →' }}
              </a>
            </div>
          </div>
        </section>

        @if (verPedidos()) {
          <section
            class="admin-card min-w-0 lg:col-span-2"
            [class.self-start]="!bloqueAbierto('ultimos-pedidos')"
            aria-labelledby="ultimos-pedidos"
          >
            <!-- Plegado, el encabezado recupera el relleno inferior de los demás bloques (p-6). -->
            <div
              class="flex flex-wrap items-baseline justify-between gap-2 p-6"
              [class.pb-4]="bloqueAbierto('ultimos-pedidos')"
            >
              <h2 id="ultimos-pedidos" class="text-lg font-semibold">
                <ng-container
                  *ngTemplateOutlet="
                    botonDeBloque;
                    context: { $implicit: 'ultimos-pedidos', titulo: 'Últimos pedidos' }
                  "
                />
              </h2>
              <a data-sin-icono="enlace de texto" routerLink="/pedidos" class="text-sm font-medium text-link">
                Ver todos los pedidos →
              </a>
            </div>
            <div wsAdminBloquePlegable="ultimos-pedidos" [abierto]="bloqueAbierto('ultimos-pedidos')">
              <div class="ws-plegable-contenido">
                <!-- relative: los sr-only de la tabla quedan dentro del contenedor que se desplaza y no ensanchan la página. -->
                <div class="relative overflow-x-auto">
                  <table class="w-full min-w-[600px] text-left text-sm">
                    <thead class="bg-subtle text-xs text-muted">
                      <tr>
                        <th class="px-4 py-3 font-medium">ID</th>
                        <th class="px-4 py-3 font-medium">Cliente</th>
                        <th class="px-4 py-3 font-medium">Estado</th>
                        <th class="px-4 py-3 font-medium">Fecha</th>
                        <th class="px-4 py-3 text-right font-medium">Total</th>
                        <th class="px-4 py-3 font-medium"><span class="sr-only">Acción</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (order of ultimos(); track order.id) {
                        <tr class="border-t border-line">
                          <td class="px-4 py-3 font-semibold whitespace-nowrap">{{ order.id }}</td>
                          <td class="max-w-56 truncate px-4 py-3">{{ order.customer }}</td>
                          <td class="px-4 py-3">
                            <span
                              class="rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                              [class]="insignia(order.status)"
                            >
                              {{ etiquetas[order.status] }}
                            </span>
                          </td>
                          <td class="px-4 py-3 whitespace-nowrap tabular-nums">
                            {{ order.createdAt | date: 'dd/MM/yyyy' : zonaLima }}
                          </td>
                          <td class="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                            {{ order.total | currency: 'PEN' : 'symbol' : '1.2-2' }}
                          </td>
                          <td class="px-4 py-3 text-right">
                            <a
                              class="inline-flex min-h-8 gap-2 items-center rounded-lg border border-line px-3 text-xs font-medium text-link hover:border-link"
                              routerLink="/pedidos"
                              [queryParams]="{ pedido: order.id }"
                            >
                              <svg wsAdminIcono="ver"></svg>
                              Ver
                              <span class="sr-only">el pedido {{ order.id }}</span>
                            </a>
                          </td>
                        </tr>
                      } @empty {
                        <tr class="border-t border-line">
                          <td colspan="6" class="px-4 py-10 text-center text-muted">
                            Todavía no hay pedidos.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        }
      </div>

      @if (verPedidos()) {
        <section class="admin-card mt-5 p-6">
          <h2 class="text-lg font-semibold">
            <ng-container
              *ngTemplateOutlet="
                botonDeBloque;
                context: { $implicit: 'estados', titulo: 'Pedidos por estado' }
              "
            />
          </h2>
          <div wsAdminBloquePlegable="estados" [abierto]="bloqueAbierto('estados')">
            <div class="ws-plegable-contenido">
              <p class="mt-1 text-sm text-muted">Porcentaje sobre todos los pedidos registrados</p>
              <div class="mt-4 grid gap-5 sm:grid-cols-3">
                @for (estado of estados(); track estado.clave) {
                  <div>
                    <div class="flex items-baseline justify-between gap-3">
                      <span class="text-sm font-medium">{{ estado.nombre }}</span>
                      <strong class="text-lg font-semibold tabular-nums">{{ estado.porcentaje }} %</strong>
                    </div>
                    <p class="text-xs text-muted">{{ estado.detalle }}</p>
                    <div class="mt-2 h-2 rounded-full bg-soft" aria-hidden="true">
                      <div
                        class="h-full rounded-full"
                        [class]="colorDeBarra[estado.clave]"
                        [style.width.%]="estado.porcentaje"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </section>
      }

      @if (dashboardCompleto()) {
        <!--
          Lote 07b (Daniel no pidió cambios el 2026-11-20): «Actividad reciente» (PBI-0028), los 10 últimos eventos que
          registra el BFF. Va al final para no mover los bloques que ya había; solo para el Dashboard completo
          (orders.manage): el vendedor ve los pedidos (PBI-0170), pero no la actividad, que nombra a clientes y reclamos
          que no ve. Lote 13 (PBI-0172): sin «Personas en línea», que ocupaba la tercera columna de esta fila, la
          actividad ocupa todo el ancho, como «Pedidos por estado».
        -->
        <section class="admin-card mt-5 min-w-0 p-6">
          <h2 class="text-lg font-semibold">
            <ng-container
              *ngTemplateOutlet="
                botonDeBloque;
                context: { $implicit: 'actividad', titulo: 'Actividad reciente' }
              "
            />
          </h2>
          <div wsAdminBloquePlegable="actividad" [abierto]="bloqueAbierto('actividad')">
            <div class="ws-plegable-contenido">
              <p class="mt-1 text-sm text-muted">Pedidos, cambios de estado, cuentas y reclamos</p>
              @if (actividad().length) {
                <ol class="mt-4 grid gap-3">
                  @for (evento of actividad(); track evento.id) {
                    <li class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                      <span class="min-w-0">{{ evento.description }}</span>
                      <time class="shrink-0 text-xs text-muted tabular-nums" [attr.datetime]="evento.at">
                        {{ evento.at | date: 'dd/MM/yyyy HH:mm' : zonaLima }}
                      </time>
                    </li>
                  }
                </ol>
              } @else {
                <p class="mt-4 text-sm text-muted">Todavía no hay actividad.</p>
              }
            </div>
          </div>
        </section>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Dashboard del Admin. Se llamaba «Resumen» hasta el lote 13 (ADR-0021, PBI-0168); el archivo, la clase y las reglas
 * (`resumen.rules.ts`) conservan ese nombre interno, que enlazan las especificaciones de las features 001 y 003.
 */
export class ResumenPage {
  protected readonly admin = inject(TiendaFacade);
  /** Fecha de los últimos pedidos en la hora de Lima, como el gráfico (PBI-0067). */
  protected readonly zonaLima = ZONA_HORARIA_LIMA;
  protected readonly session = inject(SesionFacade);
  /**
   * Instante de referencia de los tramos y del gráfico: se fija al abrir la página y al pulsar «Actualizar», como las
   * cifras del snapshot.
   */
  private readonly ahora = signal(new Date());
  protected readonly mes = computed(() => MES_EN_LIMA.format(this.ahora()));
  protected readonly actualizando = signal(false);
  protected readonly errorActualizar = signal<string | null>(null);
  protected readonly etiquetas = ETIQUETAS_ESTADO_PEDIDO;

  /** PBI-0170 (lote 11): el vendedor también ve los pedidos, así que también sus cifras y bloques del Dashboard. */
  protected readonly verPedidos = computed(() => this.session.can('orders.view'));
  /** Actividad reciente: solo para quien gestiona los pedidos (el BFF no la envía al vendedor). */
  protected readonly dashboardCompleto = computed(() => this.session.can('orders.manage'));
  protected readonly verClientes = computed(() => this.session.can('customers.manage'));
  /** Sin Inventario, el stock se cambia en la ficha de cada producto (desde el lote 11, los tres roles lo tienen). */
  protected readonly enlaceStock = computed(() =>
    this.session.can('inventory.manage') ? '/inventario' : '/productos',
  );

  protected readonly indicadores = computed(() =>
    calcularIndicadores(this.admin.orders(), this.admin.customers(), this.ahora()),
  );
  protected readonly serie = computed(() => serieDelMes(this.admin.orders(), this.ahora()));
  protected readonly ultimos = computed(() => ultimosPedidos(this.admin.orders()));
  protected readonly actividad = computed(() => actividadReciente(this.admin.snapshot()?.activity ?? []));
  protected readonly estados = computed(() => gruposDeEstado(this.admin.orders()));
  protected readonly colorDeBarra: Readonly<Record<GrupoDeEstado, string>> = {
    completados: 'bg-primary-strong',
    enProceso: 'bg-primary',
    otros: 'bg-danger',
  };
  protected readonly notaStockBajo = NOTA_STOCK_BAJO;
  protected readonly ayudaVentas = AYUDA_VENTAS;
  protected readonly idDeRegion = idDeBloque;

  /**
   * Bloques plegados. Vive con la página: al entrar al Dashboard, también al volver desde otra página o al
   * recargar, todos están desplegados (D2), y no se guarda en el navegador (D4, STD-08).
   */
  protected readonly bloquesPlegados = signal<ReadonlySet<BloqueDashboard>>(new Set());

  protected bloqueAbierto(id: BloqueDashboard): boolean {
    return !this.bloquesPlegados().has(id);
  }

  protected alternarBloque(id: BloqueDashboard): void {
    this.bloquesPlegados.update((plegados) => alternarPlegable(plegados, id));
  }

  /** Vuelve a consultar los datos del Dashboard (PBI-0140); si falla, conserva las cifras y lo dice junto al botón. */
  protected async actualizar(): Promise<void> {
    this.actualizando.set(true);
    this.errorActualizar.set(null);
    const actual = await this.admin.refresh();
    this.actualizando.set(false);
    if (actual) this.ahora.set(new Date());
    else
      this.errorActualizar.set(
        'No pudimos actualizar el Dashboard. Las cifras son las de la última consulta; inténtalo de nuevo.',
      );
  }

  /** Mismos colores de estado que la página de Pedidos. */
  protected readonly insignia = clasesDeEstadoPedido;
}
