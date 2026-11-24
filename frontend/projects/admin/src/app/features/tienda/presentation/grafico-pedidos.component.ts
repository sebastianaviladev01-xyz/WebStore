import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DiaDelMes } from '../domain/resumen.model';

/**
 * Barras por día del mes con los pedidos y, si el rol los ve, los clientes nuevos. Solo CSS y tokens: `primary`
 * para «Pedidos» y `accent` para «Clientes nuevos», con el borde del acento (`accent-line`, PBI-0189) para que un
 * secundario claro se distinga del fondo. Para lectores de pantalla tiene un texto alternativo y una tabla
 * `sr-only` con los valores de cada día.
 */
@Component({
  selector: 'ws-admin-grafico-pedidos',
  host: { class: 'block' },
  template: `
    <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-body" aria-label="Leyenda">
      <li class="inline-flex items-center gap-2">
        <span class="size-3 rounded-sm bg-primary" aria-hidden="true"></span>
        Pedidos
      </li>
      @if (conClientes()) {
        <li class="inline-flex items-center gap-2">
          <span
            class="size-3 rounded-sm bg-accent ring-1 ring-accent-line ring-inset"
            aria-hidden="true"
          ></span>
          Clientes nuevos
        </li>
      }
    </ul>

    <div class="mt-2 overflow-x-auto pt-2 pb-1">
      <div class="flex min-w-[600px] gap-2" role="img" [attr.aria-label]="textoAlternativo()">
        <div class="relative h-40 w-6 shrink-0 text-right text-xs leading-none tabular-nums text-muted">
          <span class="absolute right-0 top-0 -translate-y-1/2">{{ escala() }}</span>
          <span class="absolute right-0 top-1/2 -translate-y-1/2">{{ escala() / 2 }}</span>
          <span class="absolute right-0 top-full -translate-y-1/2">0</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="relative flex h-40 items-end gap-0.5 border-b border-line">
            <span class="absolute inset-x-0 top-0 border-t border-dashed border-line"></span>
            <span class="absolute inset-x-0 top-1/2 border-t border-dashed border-line"></span>
            @for (dia of serie(); track dia.dia) {
              <div
                class="relative flex h-full flex-1 items-end justify-center gap-px"
                [attr.title]="detalleDia(dia)"
              >
                <span class="w-2 rounded-t-sm bg-primary" [style.height.%]="altura(dia.pedidos)"></span>
                @if (conClientes()) {
                  <span
                    class="w-2 rounded-t-sm bg-accent ring-1 ring-accent-line ring-inset"
                    [style.height.%]="altura(dia.clientesNuevos)"
                  ></span>
                }
              </div>
            }
          </div>
          <div class="mt-1.5 flex gap-0.5 text-[11px] tabular-nums text-muted">
            @for (dia of serie(); track dia.dia) {
              <span class="flex-1 text-center">{{ dia.dia }}</span>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- La tabla va dentro de un div sr-only: una tabla no respeta el ancho de 1 px y ensancharía la página. -->
    <div class="sr-only">
      <table>
        <caption>
          {{ textoAlternativo() }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Pedidos</th>
            @if (conClientes()) {
              <th scope="col">Clientes nuevos</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (dia of serie(); track dia.dia) {
            <tr>
              <th scope="row">{{ dia.dia }}</th>
              <td>{{ dia.pedidos }}</td>
              @if (conClientes()) {
                <td>{{ dia.clientesNuevos }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoPedidosComponent {
  readonly serie = input.required<readonly DiaDelMes[]>();
  /** Mes en curso en texto, por ejemplo «noviembre de 2026». */
  readonly mes = input.required<string>();
  /** El vendedor no recibe clientes: el gráfico muestra solo la serie «Pedidos». */
  readonly conClientes = input(true);

  /** Valor del tope del eje: par para que la línea del medio sea un entero; mínimo 2 para que el mes vacío tenga eje. */
  protected readonly escala = computed(() => {
    const maximo = Math.max(
      0,
      ...this.serie().map((dia) => Math.max(dia.pedidos, this.conClientes() ? dia.clientesNuevos : 0)),
    );
    return Math.max(2, Math.ceil(maximo / 2) * 2);
  });

  protected readonly textoAlternativo = computed(() => {
    const pedidos = this.serie().reduce((suma, dia) => suma + dia.pedidos, 0);
    const clientes = this.serie().reduce((suma, dia) => suma + dia.clientesNuevos, 0);
    const series = this.conClientes() ? 'Pedidos y clientes nuevos' : 'Pedidos';
    const totales = this.conClientes()
      ? `${contar(pedidos, 'pedido', 'pedidos')} y ${contar(clientes, 'cliente nuevo', 'clientes nuevos')}`
      : contar(pedidos, 'pedido', 'pedidos');
    return `${series} por día de ${this.mes()}: ${totales} en el mes.`;
  });

  protected altura(valor: number): number {
    return (valor / this.escala()) * 100;
  }

  protected detalleDia(dia: DiaDelMes): string {
    const pedidos = contar(dia.pedidos, 'pedido', 'pedidos');
    return this.conClientes()
      ? `Día ${dia.dia}: ${pedidos}, ${contar(dia.clientesNuevos, 'cliente nuevo', 'clientes nuevos')}`
      : `Día ${dia.dia}: ${pedidos}`;
  }
}

function contar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}
