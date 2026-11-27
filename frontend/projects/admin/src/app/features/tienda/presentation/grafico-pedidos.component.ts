import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AgrupacionDeSerie, PuntoDeSerie, SerieDelPeriodo } from '../domain/resumen.model';

/** Cómo se nombra cada agrupación en los textos del gráfico y en la cabecera de su tabla. */
const UNIDADES: Readonly<Record<AgrupacionDeSerie, { unidad: string; columna: string }>> = {
  hora: { unidad: 'hora', columna: 'Hora' },
  dia: { unidad: 'día', columna: 'Día' },
  semana: { unidad: 'semana', columna: 'Semana' },
  mes: { unidad: 'mes', columna: 'Mes' },
};

/**
 * Barras por hora, día, semana o mes del periodo del filtro principal (auditoría del lote 45, PBI-0270; hasta entonces,
 * por día del mes) con los pedidos y, si el rol los ve, los clientes web nuevos: quienes hicieron su primer pedido
 * en la tienda en línea («Clientes nuevos» hasta el lote 23, ADR-0025, PBI-0222). Solo CSS y tokens: `primary` para
 * «Pedidos» y `accent` para «Clientes web nuevos», con el borde del acento (`accent-line`, PBI-0189) para que un
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
          Clientes web nuevos
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
            @for (punto of puntos(); track $index) {
              <div
                class="relative flex h-full flex-1 items-end justify-center gap-px"
                [attr.title]="detallePunto(punto)"
              >
                <span class="w-2 rounded-t-sm bg-primary" [style.height.%]="altura(punto.pedidos)"></span>
                @if (conClientes()) {
                  <span
                    class="w-2 rounded-t-sm bg-accent ring-1 ring-accent-line ring-inset"
                    [style.height.%]="altura(punto.clientesNuevos)"
                  ></span>
                }
              </div>
            }
          </div>
          <div class="mt-1.5 flex gap-0.5 text-[11px] tabular-nums text-muted">
            @for (punto of puntos(); track $index) {
              <span class="flex-1 text-center">{{ punto.etiqueta }}</span>
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
            <th scope="col">{{ unidades[serie().agrupacion].columna }}</th>
            <th scope="col">Pedidos</th>
            @if (conClientes()) {
              <th scope="col">Clientes web nuevos</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (punto of puntos(); track $index) {
            <tr>
              <th scope="row">{{ punto.nombre }}</th>
              <td>{{ punto.pedidos }}</td>
              @if (conClientes()) {
                <td>{{ punto.clientesNuevos }}</td>
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
  /** Los puntos del periodo, su agrupación y el tramo en palabras («noviembre de 2026» con «Mes actual»). */
  readonly serie = input.required<SerieDelPeriodo>();
  /** El vendedor no recibe clientes: el gráfico muestra solo la serie «Pedidos». */
  readonly conClientes = input(true);

  /** Valor del tope del eje: par para que la línea del medio sea un entero; mínimo 2 para que el mes vacío tenga eje. */
  protected readonly unidades = UNIDADES;
  protected readonly puntos = computed(() => this.serie().puntos);

  protected readonly escala = computed(() => {
    const maximo = Math.max(
      0,
      ...this.puntos().map((punto) => Math.max(punto.pedidos, this.conClientes() ? punto.clientesNuevos : 0)),
    );
    return Math.max(2, Math.ceil(maximo / 2) * 2);
  });

  protected readonly textoAlternativo = computed(() => {
    const pedidos = this.puntos().reduce((suma, punto) => suma + punto.pedidos, 0);
    const clientes = this.puntos().reduce((suma, punto) => suma + punto.clientesNuevos, 0);
    const series = this.conClientes() ? 'Pedidos y clientes web nuevos' : 'Pedidos';
    const totales = this.conClientes()
      ? `${contar(pedidos, 'pedido', 'pedidos')} y ${contar(clientes, 'cliente web nuevo', 'clientes web nuevos')}`
      : contar(pedidos, 'pedido', 'pedidos');
    const { agrupacion, descripcion } = this.serie();
    const unidad = UNIDADES[agrupacion].unidad;
    // Con «Mes actual», el texto de siempre: «… por día de noviembre de 2026: … en el mes.»
    return descripcion.startsWith('Del ') || agrupacion !== 'dia'
      ? `${series} por ${unidad}, ${descripcion.charAt(0).toLowerCase()}${descripcion.slice(1)}: ${totales} en el periodo.`
      : `${series} por día de ${descripcion}: ${totales} en el mes.`;
  });

  protected altura(valor: number): number {
    return (valor / this.escala()) * 100;
  }

  protected detallePunto(punto: PuntoDeSerie): string {
    const pedidos = contar(punto.pedidos, 'pedido', 'pedidos');
    return this.conClientes()
      ? `${punto.nombre}: ${pedidos}, ${contar(punto.clientesNuevos, 'cliente web nuevo', 'clientes web nuevos')}`
      : `${punto.nombre}: ${pedidos}`;
  }
}

function contar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}
