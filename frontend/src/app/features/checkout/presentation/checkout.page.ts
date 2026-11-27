import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormRecord,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { CarritoFacade } from '../../carrito/application/carrito.facade';
import { CheckoutFacade } from '../application/checkout.facade';
import { EnviosFacade } from '../../envios/application/envios.facade';
import { DireccionEnvio, MetodoPago } from '../../pedidos/domain/pedido.model';
import { ContenidoFacade } from '../../contenido/application/contenido.facade';
import {
  destinosDelPedido,
  envioPorDestinos,
  modoDeDireccion,
} from '../../pedidos/domain/direccion-por-producto.rules';
import { CotizacionEnvio } from '../../envios/domain/envio.model';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PedidosFacade } from '../../pedidos/application/pedidos.facade';
import {
  esFechaDeEntregaValida,
  fechaDeEntregaPropuesta,
  fechaDeLima,
  fechaVisible,
} from '../../pedidos/domain/fecha-entrega.rules';

/** La fecha de entrega va desde la primera que permite la tienda (PBI-0096; lote 17, PBI-0178); vacía, la marca `required`. */
const desdeLaPrimeraFecha =
  (primera: () => string) =>
  (control: AbstractControl<string>): ValidationErrors | null =>
    !control.value || esFechaDeEntregaValida(control.value, primera()) ? null : { fechaPasada: true };

/** La dirección de una línea con una dirección por producto (lote 19, PBI-0006): la del pedido u otra. */
type DireccionDeLineaForm = FormGroup<{
  otra: FormControl<boolean>;
  district: FormControl<string>;
  addressLine: FormControl<string>;
  province: FormControl<string>;
  department: FormControl<string>;
  reference: FormControl<string>;
}>;

const CAMPOS_DE_OTRA_DIRECCION = ['district', 'addressLine', 'province', 'department', 'reference'] as const;

/** Una línea nueva va a la dirección del pedido: los campos de la otra quedan desactivados y no bloquean el envío. */
function nuevaDireccionDeLinea(): DireccionDeLineaForm {
  const grupo: DireccionDeLineaForm = new FormGroup({
    otra: new FormControl(false, { nonNullable: true }),
    district: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    addressLine: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)],
    }),
    province: new FormControl('Lima', { nonNullable: true, validators: [Validators.required] }),
    department: new FormControl('Lima', { nonNullable: true, validators: [Validators.required] }),
    reference: new FormControl('', { nonNullable: true }),
  });
  for (const campo of CAMPOS_DE_OTRA_DIRECCION) grupo.controls[campo].disable({ emitEvent: false });
  return grupo;
}

@Component({
  selector: 'ws-checkout-page',
  imports: [
    CurrencyPipe,
    EmptyStateComponent,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  template: `
    <section class="ws-container py-10 sm:py-14">
      <div class="mb-9">
        <h1 class="ws-title">Datos de tu compra</h1>
      </div>
      @if (cart.cargando()) {
        <div class="ws-card p-8 text-center text-muted" role="status">Cargando tu carrito…</div>
      } @else if (cart.error()) {
        <div class="rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger" role="alert">
          <p>No pudimos cargar tu carrito. Revisa tu conexión e inténtalo nuevamente.</p>
          <button
            type="button"
            class="mt-2 font-semibold underline underline-offset-4"
            (click)="cart.reintentar()"
          >
            Reintentar
          </button>
        </div>
      } @else if (cart.isEmpty()) {
        <ws-empty-state
          title="No hay productos para comprar"
          description="Agrega productos al carrito antes de continuar."
        />
      } @else {
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="grid gap-7 lg:grid-cols-[1fr_380px] lg:items-start"
        >
          <div class="ws-checkout-panel">
            <section class="ws-checkout-step">
              <h2 class="ws-checkout-step-title">1. Datos del cliente</h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                Puedes comprar sin crear una cuenta. Usaremos estos datos para registrar tu compra.
              </p>
              <div class="mt-5 grid gap-4 sm:grid-cols-2">
                <mat-form-field>
                  <mat-label>Nombres y apellidos</mat-label>
                  <input matInput formControlName="fullName" autocomplete="name" />
                  @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
                    <mat-error>Ingresa al menos 3 caracteres.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Correo</mat-label>
                  <input matInput type="email" formControlName="email" autocomplete="email" />
                  @if (form.controls.email.touched && form.controls.email.invalid) {
                    <mat-error>Ingresa un correo válido.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="phone" autocomplete="tel" />
                  @if (form.controls.phone.touched && form.controls.phone.invalid) {
                    <mat-error>Ingresa un teléfono válido.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field>
                  <mat-label>DNI / documento</mat-label>
                  <input matInput formControlName="document" autocomplete="off" />
                  @if (form.controls.document.touched && form.controls.document.invalid) {
                    <mat-error>Ingresa al menos 8 caracteres.</mat-error>
                  }
                </mat-form-field>
              </div>
            </section>
            <section class="ws-checkout-step">
              <h2 class="ws-checkout-step-title">2. Entrega</h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                Calculamos el costo según el distrito de destino y despachamos desde la tienda más cercana.
              </p>
              <div class="mt-5 grid gap-4 sm:grid-cols-2">
                <mat-form-field>
                  <mat-label>Distrito destino</mat-label>
                  <mat-select formControlName="district" (selectionChange)="refreshQuote()">
                    @for (d of destinations(); track d) {
                      <mat-option [value]="d">{{ d }}</mat-option>
                    }
                  </mat-select>
                  @if (form.controls.district.touched && form.controls.district.invalid) {
                    <mat-error>Selecciona un distrito.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Dirección</mat-label>
                  <input matInput formControlName="addressLine" autocomplete="street-address" />
                  @if (form.controls.addressLine.touched && form.controls.addressLine.invalid) {
                    <mat-error>Ingresa una dirección válida.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Provincia</mat-label>
                  <input matInput formControlName="province" />
                  @if (form.controls.province.touched && form.controls.province.invalid) {
                    <mat-error>Ingresa la provincia.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Departamento</mat-label>
                  <input matInput formControlName="department" />
                  @if (form.controls.department.touched && form.controls.department.invalid) {
                    <mat-error>Ingresa el departamento.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Fecha de entrega preferida</mat-label>
                  <input matInput type="date" formControlName="deliveryDate" [attr.min]="primera()" />
                  @if (
                    form.controls.deliveryDate.touched && form.controls.deliveryDate.hasError('required')
                  ) {
                    <mat-error>Elige una fecha de entrega.</mat-error>
                  } @else if (form.controls.deliveryDate.touched && form.controls.deliveryDate.invalid) {
                    <mat-error>Elige una fecha desde el {{ fechaVisible(primera()) }}.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Referencia</mat-label>
                  <input matInput formControlName="reference" />
                </mat-form-field>
              </div>
              @if (shipping.error()) {
                <div
                  class="rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
                  role="alert"
                >
                  <p>{{ shipping.error() }}</p>
                  <button
                    type="button"
                    class="mt-2 font-semibold underline underline-offset-4"
                    (click)="shipping.load()"
                  >
                    Reintentar
                  </button>
                </div>
              }
              @if (quoting()) {
                <p class="rounded-xl bg-soft p-3 text-sm text-muted" role="status">
                  Calculando costo de envío…
                </p>
              }
              @if (shippingError()) {
                <div
                  class="rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
                  role="alert"
                >
                  <p>{{ shippingError() }}</p>
                  <button
                    type="button"
                    class="mt-2 font-semibold underline underline-offset-4"
                    (click)="refreshQuote()"
                  >
                    Reintentar
                  </button>
                </div>
              }
              @if (!quoting() && !shippingError() && shippingQuote(); as quote) {
                <p class="rounded-xl bg-primary-soft p-3 text-sm font-semibold text-on-primary-soft">
                  Envío cotizado:
                  <span class="ws-price-numerals">
                    {{ quote.price | currency: 'PEN' : 'symbol' : '1.2-2' }}
                  </span>
                  · despacho desde {{ quote.origin }}
                </p>
              }
              <!--
                Lote 19 (ADR-0021, PBI-0006; confirmado por Sebastián Avila): con una dirección por producto, cada línea
                va a la dirección de entrega o a otra. Con una por pedido (por defecto) no se muestra nada y el checkout
                es el de siempre.
              -->
              @if (lineasConDireccion().length) {
                <div class="mt-6 grid gap-4">
                  <div>
                    <h3 class="text-base font-semibold">Dirección de cada producto</h3>
                    <p class="mt-1 text-sm leading-6 text-muted">
                      Cada producto va a la dirección de entrega, salvo que elijas otra. El envío se cobra una
                      vez por cada dirección distinta.
                    </p>
                  </div>
                  @for (fila of lineasConDireccion(); track fila.id) {
                    <fieldset class="rounded-xl border border-line p-4" [formGroup]="fila.grupo">
                      <legend class="px-1 text-sm font-semibold">{{ fila.nombre }}</legend>
                      <mat-radio-group
                        formControlName="otra"
                        class="flex flex-wrap gap-x-6 gap-y-2"
                        [attr.aria-label]="'Dirección de ' + fila.nombre"
                        (change)="elegirDireccion(fila.grupo, $event.value)"
                      >
                        <mat-radio-button [value]="false">La dirección de entrega</mat-radio-button>
                        <mat-radio-button [value]="true">Otra dirección</mat-radio-button>
                      </mat-radio-group>
                      @if (fila.grupo.controls.otra.value) {
                        <div class="mt-4 grid gap-4 sm:grid-cols-2">
                          <mat-form-field>
                            <mat-label>Distrito</mat-label>
                            <mat-select formControlName="district">
                              @for (d of destinations(); track d) {
                                <mat-option [value]="d">{{ d }}</mat-option>
                              }
                            </mat-select>
                            @if (
                              fila.grupo.controls.district.touched && fila.grupo.controls.district.invalid
                            ) {
                              <mat-error>Selecciona un distrito.</mat-error>
                            }
                          </mat-form-field>
                          <mat-form-field>
                            <mat-label>Dirección</mat-label>
                            <input matInput formControlName="addressLine" autocomplete="off" />
                            @if (
                              fila.grupo.controls.addressLine.touched &&
                              fila.grupo.controls.addressLine.invalid
                            ) {
                              <mat-error>Ingresa una dirección válida.</mat-error>
                            }
                          </mat-form-field>
                          <mat-form-field>
                            <mat-label>Provincia</mat-label>
                            <input matInput formControlName="province" />
                            @if (
                              fila.grupo.controls.province.touched && fila.grupo.controls.province.invalid
                            ) {
                              <mat-error>Ingresa la provincia.</mat-error>
                            }
                          </mat-form-field>
                          <mat-form-field>
                            <mat-label>Departamento</mat-label>
                            <input matInput formControlName="department" />
                            @if (
                              fila.grupo.controls.department.touched && fila.grupo.controls.department.invalid
                            ) {
                              <mat-error>Ingresa el departamento.</mat-error>
                            }
                          </mat-form-field>
                          <mat-form-field class="sm:col-span-2">
                            <mat-label>Referencia</mat-label>
                            <input matInput formControlName="reference" />
                          </mat-form-field>
                        </div>
                      }
                    </fieldset>
                  }
                </div>
              }
            </section>
            <section class="ws-checkout-step">
              <h2 class="ws-checkout-step-title">3. Método de pago</h2>
              <mat-radio-group
                formControlName="paymentMethod"
                class="mt-5 grid gap-3"
                aria-label="Método de pago"
              >
                <mat-radio-button value="card">Tarjeta de crédito o débito</mat-radio-button>
                <mat-radio-button value="yape-plin">Yape / Plin</mat-radio-button>
                <mat-radio-button value="transfer">Transferencia bancaria</mat-radio-button>
              </mat-radio-group>
              <p class="mt-4 text-sm leading-6 text-muted">
                Tienda de demostración: el pago se simula y no se realiza ningún cobro.
              </p>
            </section>
          </div>
          <aside class="ws-order-summary lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <h2 class="text-xl font-semibold tracking-[-0.025em]">Resumen del pedido</h2>
            <div class="mt-6 grid gap-4 text-sm">
              <div class="flex justify-between">
                <span>Valor de venta</span>
                <strong class="ws-price-numerals">
                  {{ cart.taxableBase() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span>IGV (18%)</span>
                <strong class="ws-price-numerals">
                  {{ cart.igv() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span>Subtotal</span>
                <strong class="ws-price-numerals">
                  {{ cart.subtotal() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span>Envío</span>
                <strong class="ws-price-numerals">
                  {{
                    shippingCost() === null
                      ? 'Selecciona destino'
                      : (shippingCost()! | currency: 'PEN' : 'symbol' : '1.2-2')
                  }}
                </strong>
              </div>
              <!-- Lote 19 (PBI-0006): con otra dirección en algún producto, el envío de cada dirección distinta. -->
              @if (envioDesglosado(); as envio) {
                <ul class="-mt-2 grid gap-1 text-xs text-muted" aria-label="Envío por dirección">
                  @for (destino of envio.desglose; track $index) {
                    <li class="flex justify-between gap-3">
                      <span class="min-w-0 break-words">
                        {{ destino.direccion.district }} · {{ destino.direccion.addressLine }}
                      </span>
                      <span class="ws-price-numerals shrink-0">
                        {{ destino.precio | currency: 'PEN' : 'symbol' : '1.2-2' }}
                      </span>
                    </li>
                  }
                </ul>
              }
              <div class="flex justify-between border-t border-line pt-4">
                <span class="font-semibold">Total</span>
                <strong class="ws-price-numerals text-2xl font-semibold">
                  {{ total() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
            </div>
            @if (notices().length) {
              <div class="mt-4 rounded-xl bg-soft p-3 text-sm" role="status">
                <p class="font-semibold">Actualizamos tu pedido con los datos vigentes:</p>
                <ul class="mt-2 grid list-disc gap-1 pl-5">
                  @for (notice of notices(); track $index) {
                    <li>{{ notice }}</li>
                  }
                </ul>
                <p class="mt-2">Revisa el total antes de finalizar la compra.</p>
              </div>
            }
            <a routerLink="/carrito" class="ws-btn-secondary mt-6 w-full">Volver al carrito</a>
          </aside>
          <!--
            Lote 16 (ADR-0021, PBI-0190; confirmado por Sebastián Avila): «Finalizar compra» es el último paso, después
            de los datos de pago y de la casilla de términos. En escritorio va debajo de los pasos, con el resumen al
            lado; en el celular, después del resumen, para que el total se vea antes de pagar.
          -->
          <div class="ws-checkout-confirm lg:col-start-1">
            @if (checkout.error()) {
              <p class="mb-5 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
                {{ checkout.error() }}
              </p>
            }
            <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <mat-checkbox formControlName="termsAccepted" aria-describedby="ws-terms-error">
                  Acepto los términos y condiciones
                </mat-checkbox>
                <p id="ws-terms-error" class="text-xs text-danger" aria-live="polite">
                  @if (form.controls.termsAccepted.touched && form.controls.termsAccepted.invalid) {
                    Acepta los términos y condiciones para finalizar la compra.
                  }
                </p>
                <a
                  routerLink="/info/terminos"
                  target="_blank"
                  rel="noopener"
                  class="mt-1 inline-block text-sm font-semibold text-link underline-offset-4 hover:underline"
                >
                  Leer los términos y condiciones
                </a>
              </div>
              <button
                type="submit"
                class="ws-btn-primary w-full shrink-0 disabled:opacity-50 sm:w-auto sm:min-w-60"
                [disabled]="checkout.submitting() || quoting() || shippingCost() === null"
              >
                {{ checkout.submitting() ? 'Procesando…' : 'Finalizar compra' }}
              </button>
            </div>
          </div>
        </form>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CurrencyPipe],
})
export class CheckoutPage {
  protected readonly cart = inject(CarritoFacade);
  protected readonly checkout = inject(CheckoutFacade);
  protected readonly shipping = inject(EnviosFacade);
  private readonly router = inject(Router);
  private readonly currency = inject(CurrencyPipe);
  private readonly orders = inject(PedidosFacade);
  /**
   * El mínimo del campo de fecha y la fecha propuesta: la primera fecha de entrega que calcula el BFF con la
   * configuración de la tienda (lote 17, PBI-0178). Mientras no llega, hoy en Lima (PBI-0096); el BFF vuelve a validar.
   */
  private readonly hoy = fechaDeLima(new Date());
  protected readonly primera = computed(() => this.orders.primeraFechaDeEntrega() ?? this.hoy);
  protected readonly fechaVisible = fechaVisible;
  /** Cotizaciones pedidas: solo cuenta la última (PBI-0107). */
  private quoteRequest = 0;
  /** El envío cambió entre lo que vio el comprador y lo vigente (PBI-0106). */
  private readonly shippingChange = signal<{ antes: number; ahora: number } | null>(null);
  /** Lo que cambió desde lo que vio el comprador: precio, stock o envío (PBI-0106). */
  protected readonly notices = computed(() => {
    const money = (value: number) => this.currency.transform(value, 'PEN', 'symbol', '1.2-2');
    const notices = this.cart.cambios().map((cambio) => {
      if (cambio.tipo === 'precio')
        return `El precio de ${cambio.nombre} cambió de ${money(cambio.antes)} a ${money(cambio.ahora)}.`;
      if (cambio.tipo === 'stock')
        return `De ${cambio.nombre} solo quedan ${cambio.ahora} unidades: ajustamos la cantidad.`;
      return `${cambio.nombre} ya no está disponible y salió del carrito.`;
    });
    const shipping = this.shippingChange();
    if (shipping) notices.push(`El envío cambió de ${money(shipping.antes)} a ${money(shipping.ahora)}.`);
    return notices;
  });
  protected readonly shippingQuote = signal<CotizacionEnvio | null>(null);
  private readonly contenido = inject(ContenidoFacade);
  /** Una dirección por pedido (por defecto) o una por producto, según la configuración de la tienda (PBI-0006). */
  protected readonly modo = computed(() => modoDeDireccion(this.contenido.settings()));
  /** La dirección de cada línea del carrito, con una por producto; vacía con una por pedido. */
  protected readonly porProducto = new FormRecord<DireccionDeLineaForm>({});
  protected readonly quoting = signal(false);
  protected readonly shippingError = signal<string | null>(null);
  protected readonly destinations = computed(() =>
    [...new Set(this.shipping.rates().map((r) => r.destination))].sort(),
  );
  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(7)],
    }),
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    addressLine: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)],
    }),
    district: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    province: new FormControl('Lima', { nonNullable: true, validators: [Validators.required] }),
    department: new FormControl('Lima', { nonNullable: true, validators: [Validators.required] }),
    reference: new FormControl('', { nonNullable: true }),
    deliveryDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, desdeLaPrimeraFecha(() => this.primera())],
    }),
    paymentMethod: new FormControl<MetodoPago>('card', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    termsAccepted: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });
  /** Cualquier cambio del formulario o de las direcciones de las líneas, para recalcular el envío. */
  private readonly cambiosDelFormulario = toSignal(
    merge(this.form.valueChanges, this.porProducto.valueChanges, this.porProducto.statusChanges),
    { initialValue: null },
  );
  /** Las líneas del carrito con su formulario de dirección, en el orden del carrito (PBI-0006). */
  protected readonly lineasConDireccion = computed(() => {
    this.cambiosDelFormulario();
    if (this.modo() !== 'per-product') return [];
    return this.cart.items().flatMap((linea) => {
      const grupo = this.porProducto.controls[linea.product.id];
      return grupo ? [{ id: linea.product.id, nombre: linea.product.name, grupo }] : [];
    });
  });
  /**
   * Con otra dirección en alguna línea (lote 19, PBI-0006), el envío de cada dirección distinta, con la misma regla
   * del BFF; null si todas van a la dirección de entrega (el envío es el cotizado, como siempre) o falta un distrito.
   */
  protected readonly envioDesglosado = computed(() => {
    const lineas = this.lineasConDireccion();
    if (!lineas.some((fila) => fila.grupo.controls.otra.value)) return null;
    const destinos = destinosDelPedido(
      this.direccionPrincipal(),
      lineas.map((fila) => ({ shipping: this.otraDireccion(fila.grupo) })),
    );
    if (destinos.some((destino) => !destino.district)) return null;
    return envioPorDestinos(this.shipping.rates(), destinos);
  });
  protected readonly shippingCost = computed(() => {
    const cotizado = this.shippingQuote()?.price ?? null;
    if (cotizado === null) return null;
    if (!this.lineasConDireccion().some((fila) => fila.grupo.controls.otra.value)) return cotizado;
    return this.envioDesglosado()?.total ?? null;
  });
  protected readonly total = computed(() => this.cart.subtotal() + (this.shippingCost() ?? 0));

  constructor() {
    this.checkout.iniciar();
    // Lote 19 (PBI-0006): con una por producto, un formulario de dirección por línea del carrito; con una por pedido
    // (o si la tienda vuelve a ella), ninguno.
    effect(() => {
      const ids = this.modo() === 'per-product' ? this.cart.items().map((linea) => linea.product.id) : [];
      untracked(() => {
        for (const id of Object.keys(this.porProducto.controls))
          if (!ids.includes(id)) this.porProducto.removeControl(id);
        for (const id of ids)
          if (!this.porProducto.contains(id)) this.porProducto.addControl(id, nuevaDireccionDeLinea());
      });
    });
    // Lote 18 (ADR-0021): si el BFF rechazó la dirección de una línea (por ejemplo, una dirección hecha solo de
    // espacios), se marcan sus campos en esa línea; el error se va al corregirlos.
    effect(() => {
      const rechazada = this.checkout.direccionDeLineaRechazada();
      if (!rechazada) return;
      untracked(() => {
        const grupo = this.porProducto.controls[rechazada.productId];
        if (!grupo?.controls.otra.value) return;
        for (const campo of rechazada.fields) {
          const control = grupo.controls[campo];
          control.setErrors({ ...control.errors, rechazadaPorLaTienda: true });
          control.markAsTouched();
        }
      });
    });
    // Lote 17 (PBI-0178): al llegar la primera fecha (o al cambiar, tras un rechazo del BFF), se propone ella, salvo
    // que el comprador ya haya elegido una válida.
    effect(() => {
      const primera = this.orders.primeraFechaDeEntrega();
      if (!primera) return;
      const fecha = this.form.controls.deliveryDate;
      fecha.setValue(fechaDeEntregaPropuesta(fecha.value, primera));
    });
    // Lote 17 (PBI-0177): si los términos cambiaron, el comprador los vuelve a aceptar.
    effect(() => {
      if (!this.checkout.terminosCambiaron()) return;
      const terminos = this.form.controls.termsAccepted;
      terminos.setValue(false);
      terminos.markAsTouched();
    });
  }

  protected async refreshQuote(): Promise<void> {
    const value = this.form.getRawValue();
    const request = ++this.quoteRequest;
    this.shippingQuote.set(null);
    this.shippingError.set(null);
    if (!value.district) {
      this.quoting.set(false);
      return;
    }

    this.quoting.set(true);
    try {
      const quote = await this.shipping.quote(value.district);
      // Llegó la respuesta de un distrito anterior: vale la del elegido ahora.
      if (request !== this.quoteRequest) return;
      if (quote === null) {
        this.shippingError.set(
          'Todavía no contamos con una tarifa para ese destino. Elige otro distrito o inténtalo nuevamente.',
        );
        return;
      }
      this.shippingQuote.set(quote);
    } catch {
      if (request !== this.quoteRequest) return;
      this.shippingError.set(
        'No pudimos calcular el envío en este momento. Revisa tu conexión e inténtalo nuevamente.',
      );
    } finally {
      if (request === this.quoteRequest) this.quoting.set(false);
    }
  }
  /** «Otra dirección» activa sus campos; «La dirección de entrega» los desactiva para que no bloqueen la compra. */
  protected elegirDireccion(grupo: DireccionDeLineaForm, otra: boolean): void {
    for (const campo of CAMPOS_DE_OTRA_DIRECCION)
      if (otra) grupo.controls[campo].enable();
      else grupo.controls[campo].disable();
  }

  private direccionPrincipal(): DireccionEnvio {
    const v = this.form.getRawValue();
    return {
      addressLine: v.addressLine,
      district: v.district,
      province: v.province,
      department: v.department,
      reference: v.reference || undefined,
    };
  }

  /** La otra dirección de la línea, o undefined si va a la dirección de entrega. */
  private otraDireccion(grupo: DireccionDeLineaForm | undefined): DireccionEnvio | undefined {
    if (!grupo?.controls.otra.value) return undefined;
    const v = grupo.getRawValue();
    return {
      addressLine: v.addressLine,
      district: v.district,
      province: v.province,
      department: v.department,
      reference: v.reference || undefined,
    };
  }

  protected async submit(): Promise<void> {
    if (
      this.form.invalid ||
      this.porProducto.invalid ||
      this.cart.isEmpty() ||
      this.shippingCost() === null
    ) {
      this.form.markAllAsTouched();
      this.porProducto.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const shownShipping = this.shippingCost()!;
    const receipt = await this.checkout.submit({
      customer: { fullName: v.fullName, email: v.email, phone: v.phone, document: v.document },
      shipping: this.direccionPrincipal(),
      deliveryDate: v.deliveryDate,
      paymentMethod: v.paymentMethod,
      // Con una por producto, cada línea que va a otra dirección la lleva (PBI-0006); si no, las del carrito tal cual.
      items: this.cart.items().map((linea) => {
        const shipping = this.otraDireccion(this.porProducto.controls[linea.product.id]);
        return shipping ? { ...linea, shipping } : linea;
      }),
      subtotal: this.cart.subtotal(),
      igv: this.cart.igv(),
      shippingCost: this.shippingCost()!,
      total: this.total(),
      termsAccepted: v.termsAccepted,
    });
    if (!receipt) {
      // Cambiaron el precio, el stock o el envío: se vuelve a cotizar y se avisa antes de reintentar (PBI-0106).
      if (this.checkout.datosCambiaron()) {
        await this.refreshQuote();
        const current = this.shippingCost();
        if (current !== null && current !== shownShipping)
          this.shippingChange.set({ antes: shownShipping, ahora: current });
      }
      return;
    }
    this.cart.clear();
    await this.router.navigate(['/pedido', receipt.id]);
  }
}
