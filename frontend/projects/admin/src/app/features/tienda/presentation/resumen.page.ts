import { CurrencyPipe, DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import {
  alternarPlegable,
  BloquePlegableDirective,
  FlechaPlegableDirective,
  idDeBloque,
} from '../../../shared/ui/plegable.directive';
import { SesionFacade } from '../../sesion/application/sesion.facade';
import { TiendaFacade } from '../application/tienda.facade';
import { distribucionPorCategoria } from '../domain/distribucion-ventas.rules';
import {
  fechaDelEncabezado,
  leerPeriodo,
  Periodo,
  PERIODO_POR_OMISION,
  PERIODOS,
} from '../domain/periodo.rules';
import {
  actividadReciente,
  calcularIndicadores,
  GrupoDeEstado,
  gruposDeEstado,
  pedidosDelPeriodo,
  serieDelPeriodo,
  tipoDeEvento,
  ultimosPedidos,
} from '../domain/resumen.rules';
import { NOTA_STOCK_BAJO } from '../domain/inventario.rules';
import { ZONA_HORARIA_LIMA } from '../domain/pedido.rules';
import { AgrupacionDeSerie } from '../domain/resumen.model';
import { ETIQUETAS_ESTADO_PEDIDO, EventoActividad } from '../domain/tienda.model';
import { clasesDeEstadoPedido } from './estado-pedido';
import { GraficoPedidosComponent } from './grafico-pedidos.component';
import { TarjetaIndicadorComponent } from './tarjeta-indicador.component';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

/** Cómo se nombra cada agrupación del gráfico en su título: «Pedidos por hora», «… por día»… */
const UNIDAD_DEL_GRAFICO: Readonly<Record<AgrupacionDeSerie, string>> = {
  hora: 'hora',
  dia: 'día',
  semana: 'semana',
  mes: 'mes',
};

/**
 * Bloques del Dashboard que se pliegan: los que tienen título y, desde el lote 13 (PBI-0187), también la fila de
 * tarjetas de cifras. El lote 45 (PBI-0270) suma la distribución de ventas por categoría.
 */
type BloqueDashboard =
  'cifras' | 'pedidos-por-dia' | 'alertas' | 'ultimos-pedidos' | 'estados' | 'distribucion' | 'actividad';

/** Qué suman las ventas (lote 13, ADR-0021, PBI-0186). */
const AYUDA_VENTAS =
  'Suma el valor de los productos vendidos, con IGV y sin el costo del envío. No cuenta los pedidos cancelados.';

/**
 * Título en dos tonos, como el panel del SGC (lote 45, PBI-0270): la primera palabra en el color del texto y el resto
 * en el principal. Un título de una sola palabra («Cifras») va entero en el color del texto.
 */
function dosTonos(titulo: string): { primera: string; resto: string } {
  const espacio = titulo.indexOf(' ');
  return espacio < 0
    ? { primera: titulo, resto: '' }
    : { primera: titulo.slice(0, espacio), resto: titulo.slice(espacio + 1) };
}

/** Insignia de cada tipo de evento de la actividad: el fondo suave y el texto que el tema mide sobre él. */
const INSIGNIA_DE_EVENTO: Readonly<Record<EventoActividad['type'], string>> = {
  'order-created': 'bg-primary-soft text-on-primary-soft',
  'order-status-changed': 'bg-soft text-body',
  'account-registered': 'bg-accent-soft text-ink',
  'complaint-registered': 'bg-warning-soft text-warning',
};

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
    MatFormFieldModule,
    MatSelectModule,
    BloquePlegableDirective,
    FlechaPlegableDirective,
    GraficoPedidosComponent,
    TarjetaIndicadorComponent,
  ],
  template: `
    <!--
      Lote 45 (ADR-0033, PBI-0270): el encabezado del panel del SGC. A la izquierda, el antetítulo, el título en dos tonos
      y la descripción con su ícono; a la derecha, el día y la fecha de Lima (el reloj de las cifras) y «Actualizar»
      (PBI-0140), que solo vuelve a consultar los datos.
    -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold tracking-wider text-link">
          <span class="text-accent-line" aria-hidden="true">•</span>
          Panel
        </p>
        <h1 wsAdminTitulo class="mt-1 text-3xl font-semibold tracking-tight text-ink">
          <span>
            Dashboard
            <span class="text-link">de la tienda</span>
          </span>
        </h1>
        <p class="mt-2 flex items-center gap-2 text-sm text-muted">
          <svg wsAdminIcono="info"></svg>
          Hola, {{ session.user()?.name }}. Esto es lo que necesita atención hoy.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <div class="text-right">
          <p class="text-xs font-semibold tracking-wider text-muted uppercase">{{ hoy().diaDeLaSemana }}</p>
          <p class="mt-0.5 flex items-center justify-end gap-2 text-sm font-medium text-ink">
            <svg wsAdminIcono="calendario"></svg>
            <time [attr.datetime]="hoy().iso">{{ hoy().fecha }}</time>
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
        nombre. Controla la región bloque-<id>, que lleva el contenido y el subtítulo. Lote 45 (PBI-0270): el título
        lleva la barra de acento a la izquierda y va en dos tonos; el nombre accesible no cambia.
      -->
      <ng-template #botonDeBloque let-id let-titulo="titulo">
        <span class="flex items-center gap-3">
          <span class="h-5 w-1 shrink-0 rounded-full bg-accent-line" aria-hidden="true"></span>
          <button
            type="button"
            class="flex cursor-pointer items-center gap-2 rounded-md text-left"
            [attr.aria-expanded]="bloqueAbierto(id)"
            [attr.aria-controls]="idDeRegion(id)"
            (click)="alternarBloque(id)"
          >
            <span>
              <span class="text-ink">{{ tonos(titulo).primera }}</span>
              @if (tonos(titulo).resto) {
                <!-- El espacio va dentro de la interpolación: Angular y Prettier quitan el que va suelto. -->
                <span class="text-link">{{ ' ' + tonos(titulo).resto }}</span>
              }
            </span>
            <svg wsAdminFlecha class="ws-plegable-indicador h-4 w-4 text-muted"></svg>
          </button>
        </span>
      </ng-template>

      @if (verPedidos()) {
        <!--
          Lote 45 (PBI-0270): el filtro principal del SGC. El periodo va en la URL (?periodo=, STD-08); sin él, «Mes
          actual». Lo siguen las tarjetas de cifras, el gráfico, «Pedidos por estado» y la distribución de ventas.
        -->
        <section class="admin-card mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 p-5">
          <div class="min-w-0">
            <p class="text-xs font-semibold tracking-wider text-link">Filtro principal</p>
            <h2 class="mt-1 text-lg font-semibold text-ink">Periodo del Dashboard</h2>
            <p class="mt-1 text-sm text-muted">Las cifras se calculan según el periodo seleccionado.</p>
          </div>
          <!-- El ancho va en un contenedor: los campos de Material ocupan el 100 % de su caja (styles.css). -->
          <div class="w-full sm:w-64">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Periodo</mat-label>
              <mat-select [value]="periodo()" (selectionChange)="cambiarPeriodo($event.value)">
                @for (opcion of periodos; track opcion.valor) {
                  <mat-option [value]="opcion.valor">{{ opcion.etiqueta }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </section>
      }

      <!-- Lote 13 (PBI-0187): las tarjetas de cifras se pliegan como los demás bloques, con su propio título. -->
      <section class="mt-6">
        <h2 class="text-lg font-semibold">
          <ng-container
            *ngTemplateOutlet="botonDeBloque; context: { $implicit: 'cifras', titulo: 'Cifras' }"
          />
        </h2>
        <div wsAdminBloquePlegable="cifras" [abierto]="bloqueAbierto('cifras')">
          <div class="ws-plegable-contenido">
            <!--
              Lote 45 (PBI-0270): tarjetas de color sólido, como el SGC. Pedidos en el principal, ventas en el principal
              fuerte, clientes web nuevos en el secundario y stock bajo en el color de alerta; el texto, el que el tema
              calcula para cada fondo (tarjeta-indicador.component.ts).
            -->
            <div
              class="mt-4 grid gap-4 sm:grid-cols-2"
              [class]="verPedidos() && verClientes() ? 'xl:grid-cols-4' : 'xl:grid-cols-3'"
            >
              @if (verPedidos()) {
                <ws-admin-tarjeta-indicador
                  titulo="Total de pedidos"
                  tono="principal"
                  [valor]="(indicadores().pedidos.total | number) ?? '0'"
                  [variacion]="indicadores().pedidos.variacion"
                  [periodo]="periodo()"
                  enlace="/pedidos"
                />
                <ws-admin-tarjeta-indicador
                  titulo="Total de ventas"
                  tono="principal-fuerte"
                  [valor]="(indicadores().ventas.total | currency: 'PEN' : 'symbol' : '1.2-2') ?? ''"
                  [variacion]="indicadores().ventas.variacion"
                  [periodo]="periodo()"
                  [ayuda]="ayudaVentas"
                  enlace="/pedidos"
                />
              }
              @if (verClientes()) {
                <ws-admin-tarjeta-indicador
                  titulo="Clientes web nuevos"
                  tono="acento"
                  [valor]="(indicadores().clientes.total | number) ?? '0'"
                  [variacion]="indicadores().clientes.variacion"
                  [periodo]="periodo()"
                  enlace="/clientes"
                />
              }
              <ws-admin-tarjeta-indicador
                titulo="Stock bajo"
                tono="alerta"
                [valor]="(admin.lowStock().length | number) ?? '0'"
                [nota]="notaStockBajo"
                [enlace]="enlaceStock()"
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
          Desde la auditoría del lote 45 (PBI-0270) sigue el periodo: por hora, día, semana o mes (serieDelPeriodo); el
          subtítulo dice el tramo. Conserva el id del bloque, pedidos-por-dia.
        -->
        <section class="admin-card mt-5 min-w-0 p-6">
          <h2 class="text-lg font-semibold">
            <ng-container
              *ngTemplateOutlet="
                botonDeBloque;
                context: {
                  $implicit: 'pedidos-por-dia',
                  titulo: tituloDelGrafico(),
                }
              "
            />
          </h2>
          <div wsAdminBloquePlegable="pedidos-por-dia" [abierto]="bloqueAbierto('pedidos-por-dia')">
            <div class="ws-plegable-contenido">
              <p class="mt-1 text-sm text-muted first-letter:uppercase">{{ serie().descripcion }}</p>
              <ws-admin-grafico-pedidos class="mt-4" [serie]="serie()" [conClientes]="verClientes()" />
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
              <!-- Lote 45 (PBI-0270): sigue el periodo del filtro principal. -->
              <p class="mt-1 text-sm text-muted">Porcentaje sobre los pedidos del periodo</p>
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

        <!--
          Lote 45 (PBI-0270): «Distribución» del panel del SGC. Cada categoría principal con «PARTICIPACIÓN», su nombre, su
          porcentaje y su barra, de mayor a menor; pasadas las seis primeras, «Otras». Son las ventas de «Total de ventas»
          (sin envío ni cancelados) del periodo, así que la ve quien ve las ventas.
        -->
        <section class="admin-card mt-5 p-6">
          <h2 class="text-lg font-semibold">
            <ng-container
              *ngTemplateOutlet="
                botonDeBloque;
                context: { $implicit: 'distribucion', titulo: 'Distribución de ventas por categoría' }
              "
            />
          </h2>
          <div wsAdminBloquePlegable="distribucion" [abierto]="bloqueAbierto('distribucion')">
            <div class="ws-plegable-contenido">
              <p class="mt-1 text-sm text-muted">
                Valor de los productos vendidos en el periodo, sin el envío ni los pedidos cancelados
              </p>
              @if (distribucion().length) {
                <ul class="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2" aria-label="Ventas por categoría">
                  @for (fila of distribucion(); track fila.clave) {
                    <li>
                      <p class="text-[11px] font-semibold tracking-wider text-muted uppercase">
                        Participación
                      </p>
                      <div class="mt-0.5 flex items-baseline justify-between gap-3">
                        <span class="min-w-0 truncate text-sm font-medium text-ink">{{ fila.nombre }}</span>
                        <strong class="text-lg font-semibold tabular-nums">{{ fila.porcentaje }} %</strong>
                      </div>
                      <div class="mt-2 h-2 rounded-full bg-soft" aria-hidden="true">
                        <div
                          class="h-full rounded-full"
                          [class]="fila.clave === 'otras' ? 'bg-muted' : 'bg-primary'"
                          [style.width.%]="fila.porcentaje"
                        ></div>
                      </div>
                    </li>
                  }
                </ul>
              } @else {
                <p class="mt-4 text-sm text-muted">Todavía no hay ventas en el periodo.</p>
              }
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
          actividad ocupa todo el ancho, como «Pedidos por estado». Lote 45 (PBI-0270): con la forma de «Últimos
          movimientos» del SGC, cada evento con la insignia de su tipo, su texto y su hora. No sigue el periodo.
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
                <ol class="mt-4 divide-y divide-line">
                  @for (evento of actividad(); track evento.id) {
                    <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm first:pt-0 last:pb-0">
                      <span
                        class="w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tracking-wider uppercase"
                        [class]="insigniaDeEvento(evento.type)"
                      >
                        {{ tipoDeEvento(evento.type) }}
                      </span>
                      <!-- En el celular, la insignia y la hora van arriba y el texto debajo, a todo el ancho. -->
                      <span class="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
                        {{ evento.description }}
                      </span>
                      <time
                        class="ml-auto shrink-0 text-xs text-muted tabular-nums sm:ml-0"
                        [attr.datetime]="evento.at"
                      >
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** Fecha de los últimos pedidos en la hora de Lima, como el gráfico (PBI-0067). */
  protected readonly zonaLima = ZONA_HORARIA_LIMA;
  protected readonly session = inject(SesionFacade);
  /**
   * Instante de referencia de los tramos, del gráfico y de la fecha del encabezado: se fija al abrir la página y al
   * pulsar «Actualizar», como las cifras del snapshot.
   */
  private readonly ahora = signal(new Date());
  protected readonly hoy = computed(() => fechaDelEncabezado(this.ahora()));
  protected readonly actualizando = signal(false);
  protected readonly errorActualizar = signal<string | null>(null);
  protected readonly etiquetas = ETIQUETAS_ESTADO_PEDIDO;

  /** Lote 45 (PBI-0270): el periodo del filtro principal, de la URL (`?periodo=`); sin él, «Mes actual». */
  protected readonly periodos = PERIODOS;
  protected readonly periodo = toSignal(
    this.route.queryParamMap.pipe(map((parametros) => leerPeriodo(parametros.get('periodo')))),
    { initialValue: PERIODO_POR_OMISION },
  );

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
    calcularIndicadores(this.admin.orders(), this.ahora(), this.periodo()),
  );
  private readonly delPeriodo = computed(() =>
    pedidosDelPeriodo(this.admin.orders(), this.ahora(), this.periodo()),
  );
  protected readonly serie = computed(() =>
    serieDelPeriodo(this.admin.orders(), this.ahora(), this.periodo()),
  );
  protected readonly tituloDelGrafico = computed(() => {
    const unidad = UNIDAD_DEL_GRAFICO[this.serie().agrupacion];
    return this.verClientes() ? `Pedidos y clientes web nuevos por ${unidad}` : `Pedidos por ${unidad}`;
  });
  protected readonly ultimos = computed(() => ultimosPedidos(this.admin.orders()));
  protected readonly actividad = computed(() => actividadReciente(this.admin.snapshot()?.activity ?? []));
  protected readonly estados = computed(() => gruposDeEstado(this.delPeriodo()));
  protected readonly distribucion = computed(() =>
    distribucionPorCategoria(this.delPeriodo(), this.admin.products(), this.admin.categories()),
  );
  protected readonly colorDeBarra: Readonly<Record<GrupoDeEstado, string>> = {
    completados: 'bg-primary-strong',
    enProceso: 'bg-primary',
    otros: 'bg-danger',
  };
  protected readonly notaStockBajo = NOTA_STOCK_BAJO;
  protected readonly ayudaVentas = AYUDA_VENTAS;
  protected readonly idDeRegion = idDeBloque;
  protected readonly tonos = dosTonos;
  protected readonly tipoDeEvento = tipoDeEvento;

  protected insigniaDeEvento(tipo: string): string {
    return INSIGNIA_DE_EVENTO[tipo as EventoActividad['type']] ?? 'bg-soft text-body';
  }

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

  /** Lleva el periodo elegido a la URL; «Mes actual», el de por omisión, la deja sin el parámetro. */
  protected cambiarPeriodo(periodo: Periodo): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { periodo: periodo === PERIODO_POR_OMISION ? null : periodo },
      queryParamsHandling: 'merge',
    });
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
