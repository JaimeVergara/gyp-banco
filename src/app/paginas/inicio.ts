import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Barra } from '../barra';
import { Icono } from '../icono';
import { Alumno, Banco, formatoGyp, iniciales, Resumen, tono } from '../banco';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Barra, Icono],
  template: `
    <app-barra titulo="Banco GYP" [subtitulo]="banco.usuario()" />
    <main class="contenido">
      <section class="hero">
        <small>GYP Dollars en circulación</small>
        <strong>{{ resumen() ? gyp(resumen()!.circulacion) : '—' }}</strong>
        <div class="hero-datos">
          <span><b>{{ resumen()?.alumnos ?? '–' }}</b> alumnos</span>
          <span><b>+{{ resumen()?.entregadoHoy ?? 0 }}</b> entregados hoy</span>
          <span><b>{{ resumen()?.movimientosHoy ?? '–' }}</b> movimientos hoy</span>
        </div>
      </section>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <h2 class="seccion">Dar GYP Dollars</h2>
      <div class="acciones-grandes">
        <div class="tarjeta accion">
          <span class="burbuja"><app-icono nombre="nfc" /></span>
          <strong>Tarjeta NFC</strong>
          <p>Acerca el teléfono a la tarjeta del alumno y toca el aviso que aparece.</p>
        </div>
        <a class="tarjeta accion clicable" routerLink="/escanear">
          <span class="burbuja"><app-icono nombre="qr" /></span>
          <strong>Escanear QR</strong>
          <p>Si el teléfono no lee NFC, usa la cámara con el QR de la tarjeta.</p>
        </a>
      </div>

      @if (top().length) {
        <h2 class="seccion">Top ahorradores</h2>
        <ol class="ranking tarjeta">
          @for (a of top(); track a.id; let i = $index) {
            <li>
              <a [routerLink]="['/t', a.codigo]">
                <span class="puesto" [class.oro]="i === 0">{{ i + 1 }}</span>
                <span class="avatar chico" [style.--h]="tono(a.codigo)">{{ iniciales(a.nombre) }}</span>
                <span class="ranking-nombre">{{ a.nombre }}<small class="tenue">{{ a.curso }}</small></span>
                <strong>{{ gyp(a.saldo) }}</strong>
              </a>
            </li>
          }
        </ol>
      }

      <h2 class="seccion">Administrar</h2>
      <a class="tarjeta fila clicable" routerLink="/alumnos">
        <span class="burbuja"><app-icono nombre="personas" /></span>
        <div>
          <strong>Alumnos y tarjetas</strong>
          <p>Agregar alumnos, URL para grabar la etiqueta y código QR</p>
        </div>
        <app-icono class="tenue" nombre="flecha" />
      </a>
      <a class="tarjeta fila clicable" routerLink="/movimientos">
        <span class="burbuja"><app-icono nombre="lista" /></span>
        <div>
          <strong>Movimientos</strong>
          <p>Historial de todos los abonos y cargos</p>
        </div>
        <app-icono class="tenue" nombre="flecha" />
      </a>
    </main>
  `,
})
export class Inicio implements OnInit {
  protected banco = inject(Banco);
  protected gyp = formatoGyp;
  protected iniciales = iniciales;
  protected tono = tono;

  readonly resumen = signal<Resumen | null>(null);
  readonly alumnos = signal<Alumno[]>([]);
  readonly error = signal('');
  readonly top = computed(() =>
    this.alumnos()
      .filter((a) => a.activo && a.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 5),
  );

  async ngOnInit() {
    try {
      const [resumen, alumnos] = await Promise.all([this.banco.resumen(), this.banco.listarAlumnos()]);
      this.resumen.set(resumen);
      this.alumnos.set(alumnos);
    } catch (e) {
      this.error.set(`No se pudieron cargar los datos: ${(e as Error).message}`);
    }
  }
}
