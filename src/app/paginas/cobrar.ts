import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Barra } from '../barra';
import { Icono } from '../icono';
import { TarjetaGyp } from '../tarjeta-gyp';
import { ListaMovimientos } from '../lista-movimientos';
import { Alumno, Banco, formatoGyp, Movimiento } from '../banco';

type Estado = 'cargando' | 'listo' | 'no-existe' | 'error';
type Modo = 'dar' | 'cobrar';

const MOTIVOS: Record<Modo, string[]> = {
  dar: ['Participación', 'Tarea cumplida', 'Buena conducta', 'Ayudó a un compañero', 'Premio'],
  cobrar: ['Canje en tienda', 'Multa', 'Corrección'],
};

/** Pantalla que abre la etiqueta NFC: muestra la tarjeta y permite dar o cobrar GYP Dollars. */
@Component({
  selector: 'app-cobrar',
  imports: [FormsModule, RouterLink, Barra, Icono, TarjetaGyp, ListaMovimientos],
  template: `
    <app-barra titulo="Tarjeta GYP" [subtitulo]="alumno()?.nombre ?? 'Leyendo tarjeta…'" atras="/" />
    <main class="contenido">
      @switch (estado()) {
        @case ('cargando') {
          <div class="tarjeta-gyp esqueleto"></div>
        }
        @case ('no-existe') {
          <div class="estado-vacio">
            <span class="sello rojo"><app-icono nombre="x" /></span>
            <h1>Tarjeta no registrada</h1>
            <p class="tenue">Esta etiqueta no corresponde a ningún alumno del banco.</p>
            <a class="btn primario" routerLink="/alumnos">Ver alumnos</a>
          </div>
        }
        @case ('error') {
          <div class="estado-vacio">
            <span class="sello rojo"><app-icono nombre="alerta" /></span>
            <h1>Sin conexión</h1>
            <p class="tenue">{{ mensajeError() }}</p>
            <button class="btn primario" (click)="cargar()">Reintentar</button>
          </div>
        }
        @case ('listo') {
          <app-tarjeta-gyp [alumno]="alumno()!" [class.latido]="exito()" />

          @if (!alumno()!.activo) {
            <p class="error">Tarjeta bloqueada: actívala en “Alumnos” para volver a usarla.</p>
          } @else {
            <section class="tarjeta panel-monto">
              <div class="segmentado" role="tablist">
                <button role="tab" [class.activo]="modo() === 'dar'" (click)="cambiarModo('dar')">
                  <app-icono nombre="mas" /> Dar
                </button>
                <button role="tab" [class.activo]="modo() === 'cobrar'" (click)="cambiarModo('cobrar')">
                  <app-icono nombre="menos" /> Cobrar
                </button>
              </div>

              <div class="monto" [class.cobro]="modo() === 'cobrar'">
                <button class="icono-btn redondo" (click)="ajustar(-1)" [disabled]="monto() <= 0" aria-label="Restar 1">
                  <app-icono nombre="menos" />
                </button>
                <div class="monto-valor">
                  <small>{{ modo() === 'dar' ? 'Abonar' : 'Descontar' }}</small>
                  <strong>{{ modo() === 'dar' ? '+' : '−' }}{{ gyp(monto()) }}</strong>
                </div>
                <button class="icono-btn redondo" (click)="ajustar(1)" aria-label="Sumar 1">
                  <app-icono nombre="mas" />
                </button>
              </div>

              <div class="chips">
                @for (v of rapidos; track v) {
                  <button class="chip" [class.activo]="monto() === v" (click)="monto.set(v)">{{ v }}</button>
                }
              </div>

              <div class="chips motivos">
                @for (m of motivos(); track m) {
                  <button class="chip suave" [class.activo]="motivo === m" (click)="motivo = m">{{ m }}</button>
                }
              </div>
              <label class="campo">
                <span class="sr-only">Motivo</span>
                <input name="motivo" [(ngModel)]="motivo" placeholder="Motivo (opcional)" maxlength="80" />
              </label>

              @if (mensajeError()) {
                <p class="error">{{ mensajeError() }}</p>
              }
              @if (modo() === 'cobrar' && monto() > alumno()!.saldo) {
                <p class="error">Saldo insuficiente: tiene {{ gyp(alumno()!.saldo) }}.</p>
              }

              <button
                class="btn bloque grande"
                [class.primario]="modo() === 'dar'"
                [class.peligro]="modo() === 'cobrar'"
                [disabled]="!puedeConfirmar()"
                (click)="confirmar()"
              >
                @if (guardando()) {
                  Procesando…
                } @else {
                  {{ modo() === 'dar' ? 'Dar' : 'Cobrar' }} {{ gyp(monto()) }} {{ modo() === 'dar' ? 'a' : 'de' }} {{ primerNombre() }}
                }
              </button>
            </section>
          }

          <h2 class="seccion">Últimos movimientos</h2>
          <app-lista-movimientos [movimientos]="historial()" [conNombre]="false" />
        }
      }
    </main>

    @if (exito(); as e) {
      <div class="exito" [class.cobro]="e.monto < 0" (click)="exito.set(null)">
        <div class="monedas" aria-hidden="true">
          @for (i of lluvia; track i) {
            <span [style.--i]="i"><app-icono nombre="moneda" /></span>
          }
        </div>
        <div class="exito-caja" (click)="$event.stopPropagation()">
          <span class="sello"><app-icono nombre="check" /></span>
          <p class="exito-etiqueta">{{ e.monto > 0 ? '¡GYP Dollars entregados!' : 'Cobro realizado' }}</p>
          <strong class="exito-monto">{{ e.monto > 0 ? '+' : '−' }}{{ gyp(abs(e.monto)) }}</strong>
          <p>{{ alumno()?.nombre }}</p>
          <p class="exito-saldo">Saldo nuevo: <b>{{ gyp(e.saldo) }}</b></p>
          <div class="exito-botones">
            <button class="btn claro" (click)="exito.set(null)">Seguir con esta tarjeta</button>
            <a class="btn transparente" routerLink="/escanear"><app-icono nombre="qr" /> Escanear otra</a>
            <a class="btn transparente" routerLink="/"><app-icono nombre="inicio" /> Inicio</a>
          </div>
        </div>
      </div>
    }
  `,
})
export class Cobrar {
  private banco = inject(Banco);
  protected gyp = formatoGyp;
  protected abs = Math.abs;
  protected readonly rapidos = [1, 2, 5, 10, 20, 50];
  protected readonly lluvia = Array.from({ length: 14 }, (_, i) => i);

  readonly codigo = input.required<string>();
  readonly estado = signal<Estado>('cargando');
  readonly alumno = signal<Alumno | null>(null);
  readonly historial = signal<Movimiento[]>([]);
  readonly modo = signal<Modo>('dar');
  readonly monto = signal(5);
  readonly guardando = signal(false);
  readonly mensajeError = signal('');
  readonly exito = signal<{ monto: number; saldo: number } | null>(null);
  motivo = '';

  readonly motivos = computed(() => MOTIVOS[this.modo()]);
  readonly primerNombre = computed(() => this.alumno()?.nombre.split(' ')[0] ?? '');
  readonly puedeConfirmar = computed(
    () =>
      !this.guardando() &&
      this.monto() > 0 &&
      !(this.modo() === 'cobrar' && this.monto() > (this.alumno()?.saldo ?? 0)),
  );

  constructor() {
    // Se recarga cada vez que cambia la tarjeta leída (aunque la pantalla ya esté abierta).
    effect(() => {
      this.codigo();
      untracked(() => {
        this.exito.set(null);
        this.cambiarModo('dar');
        this.cargar();
      });
    });
  }

  async cargar() {
    this.estado.set('cargando');
    this.mensajeError.set('');
    try {
      const alumno = await this.banco.alumnoPorCodigo(this.codigo());
      this.alumno.set(alumno);
      if (!alumno) {
        this.estado.set('no-existe');
        return;
      }
      this.historial.set(await this.banco.movimientos({ alumnoId: alumno.id, limite: 10 }));
      this.estado.set('listo');
    } catch (e) {
      this.mensajeError.set((e as Error).message || 'Revisa internet y vuelve a leer la tarjeta.');
      this.estado.set('error');
    }
  }

  cambiarModo(modo: Modo) {
    this.modo.set(modo);
    this.motivo = '';
    this.mensajeError.set('');
  }

  ajustar(delta: number) {
    this.monto.update((m) => Math.max(0, m + delta));
  }

  async confirmar() {
    const alumno = this.alumno();
    if (!alumno || !this.puedeConfirmar()) return;
    const monto = this.modo() === 'dar' ? this.monto() : -this.monto();
    this.guardando.set(true);
    this.mensajeError.set('');
    try {
      const actualizado = await this.banco.mover(alumno.codigo, monto, this.motivo.trim());
      this.alumno.set(actualizado);
      this.exito.set({ monto, saldo: actualizado.saldo });
      navigator.vibrate?.(monto > 0 ? [40, 60, 40] : 80);
      this.motivo = '';
      this.historial.set(await this.banco.movimientos({ alumnoId: alumno.id, limite: 10 }));
    } catch (e) {
      this.mensajeError.set((e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }
}
