import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icono } from './icono';
import { formatoGyp, Movimiento } from './banco';

@Component({
  selector: 'app-lista-movimientos',
  imports: [Icono, RouterLink],
  template: `
    <ul class="movs tarjeta">
      @for (m of movimientos(); track m.id) {
        <li class="mov">
          <span class="mov-icono" [class.entra]="m.monto > 0">
            <app-icono [nombre]="m.monto > 0 ? 'bajar' : 'subir'" />
          </span>
          <div class="mov-datos">
            @if (conNombre() && m.alumnos) {
              <a [routerLink]="['/t', m.alumnos.codigo]"><strong>{{ m.alumnos.nombre }}</strong></a>
            }
            <span [class.tenue]="conNombre()">{{ m.motivo || (m.monto > 0 ? 'Abono' : 'Cargo') }}</span>
            <small class="tenue">{{ fecha(m.fecha) }}</small>
          </div>
          <div class="mov-monto">
            <strong [class.entra]="m.monto > 0">{{ m.monto > 0 ? '+' : '−' }}{{ gyp(abs(m.monto)) }}</strong>
            <small class="tenue">Saldo {{ gyp(m.saldo_final) }}</small>
          </div>
        </li>
      } @empty {
        <li class="vacio">Aún no hay movimientos.</li>
      }
    </ul>
  `,
})
export class ListaMovimientos {
  readonly movimientos = input.required<Movimiento[]>();
  readonly conNombre = input(true);
  protected gyp = formatoGyp;
  protected abs = Math.abs;
  protected fecha(iso: string) {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
