import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Barra } from '../barra';
import { Icono } from '../icono';
import { Alumno, Banco, formatoGyp, iniciales, tono } from '../banco';

@Component({
  selector: 'app-alumnos',
  imports: [FormsModule, RouterLink, Barra, Icono],
  template: `
    <app-barra titulo="Alumnos" [subtitulo]="alumnos().length + ' tarjetas'" atras="/" />
    <main class="contenido">
      <div class="herramientas">
        <label class="buscador">
          <app-icono nombre="buscar" />
          <input type="search" placeholder="Buscar por nombre o curso" [ngModel]="filtro()" (ngModelChange)="filtro.set($event)" />
        </label>
        <button class="btn primario" (click)="formAbierto.set(!formAbierto())">
          <app-icono [nombre]="formAbierto() ? 'x' : 'mas'" /> {{ formAbierto() ? 'Cerrar' : 'Agregar' }}
        </button>
      </div>

      @if (formAbierto()) {
        <form class="tarjeta formulario" (ngSubmit)="agregar()">
          <h2>Nuevo alumno</h2>
          <label class="campo">
            Nombre completo
            <input name="nombre" [(ngModel)]="nombre" required />
          </label>
          <div class="dos-columnas">
            <label class="campo">
              Curso
              <input name="curso" [(ngModel)]="curso" placeholder="5°A" />
            </label>
            <label class="campo">
              Saldo inicial (G$)
              <input name="saldo" type="number" min="0" step="1" inputmode="numeric" [(ngModel)]="saldoInicial" />
            </label>
          </div>
          <div class="botones">
            <button type="button" class="btn" (click)="formAbierto.set(false)">Cancelar</button>
            <button class="btn primario" [disabled]="!nombre.trim() || guardando()">
              {{ guardando() ? 'Guardando…' : 'Crear tarjeta' }}
            </button>
          </div>
        </form>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <ul class="lista">
        @for (a of filtrados(); track a.id) {
          <li class="tarjeta persona" [class.apagado]="!a.activo">
            <a class="persona-cabecera" [routerLink]="['/t', a.codigo]">
              <span class="avatar" [style.--h]="tono(a.codigo)">{{ iniciales(a.nombre) }}</span>
              <div class="persona-datos">
                <strong>{{ a.nombre }}</strong>
                <span>{{ a.curso || 'Sin curso' }} · •••• {{ a.codigo.slice(-4).toUpperCase() }}</span>
              </div>
              <div class="persona-saldo">
                <strong>{{ gyp(a.saldo) }}</strong>
                <span class="insignia" [class.ok]="a.activo">{{ a.activo ? 'Activa' : 'Bloqueada' }}</span>
              </div>
            </a>
            <div class="persona-acciones">
              <a class="btn chico" [routerLink]="['/t', a.codigo]"><app-icono nombre="moneda" /> Dar GYP</a>
              <button class="btn chico" (click)="copiar(a)">
                <app-icono [nombre]="copiado() === a.id ? 'check' : 'copiar'" />
                {{ copiado() === a.id ? 'Copiada' : 'URL NFC' }}
              </button>
              <button class="btn chico" (click)="verQr(a)"><app-icono nombre="qr" /> QR</button>
              <button class="btn chico" (click)="cambiarActivo(a)">
                <app-icono [nombre]="a.activo ? 'bloqueado' : 'energia'" /> {{ a.activo ? 'Bloquear' : 'Activar' }}
              </button>
            </div>
            @if (qr()?.id === a.id) {
              <div class="qr">
                <img [src]="qr()!.imagen" alt="Código QR de la tarjeta" />
                <a class="btn chico" [href]="qr()!.imagen" [download]="'tarjeta-' + a.nombre + '.png'">
                  <app-icono nombre="descargar" /> Descargar QR
                </a>
              </div>
            }
          </li>
        } @empty {
          <li class="vacio">{{ filtro() ? 'Nadie coincide con la búsqueda.' : 'Aún no hay alumnos. Toca "Agregar".' }}</li>
        }
      </ul>
    </main>
  `,
})
export class Alumnos implements OnInit {
  protected banco = inject(Banco);
  protected gyp = formatoGyp;
  protected iniciales = iniciales;
  protected tono = tono;

  readonly alumnos = signal<Alumno[]>([]);
  readonly filtro = signal('');
  readonly filtrados = computed(() => {
    const f = this.filtro().trim().toLowerCase();
    return f
      ? this.alumnos().filter((a) => a.nombre.toLowerCase().includes(f) || a.curso?.toLowerCase().includes(f))
      : this.alumnos();
  });
  readonly formAbierto = signal(false);
  readonly error = signal('');
  readonly copiado = signal('');
  readonly guardando = signal(false);
  readonly qr = signal<{ id: string; imagen: string } | null>(null);
  nombre = '';
  curso = '';
  saldoInicial: number | null = 0;

  ngOnInit() {
    this.cargar();
  }

  async cargar() {
    try {
      this.alumnos.set(await this.banco.listarAlumnos());
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async agregar() {
    this.guardando.set(true);
    this.error.set('');
    try {
      const saldo = Math.max(0, Math.floor(Number(this.saldoInicial) || 0));
      await this.banco.agregarAlumno(this.nombre.trim(), this.curso.trim(), saldo);
      this.nombre = this.curso = '';
      this.saldoInicial = 0;
      this.formAbierto.set(false);
    } catch (e) {
      this.error.set((e as Error).message);
    }
    this.guardando.set(false);
    this.cargar();
  }

  async cambiarActivo(a: Alumno) {
    try {
      await this.banco.cambiarActivo(a);
    } catch (e) {
      this.error.set((e as Error).message);
    }
    this.cargar();
  }

  // El QR lleva la misma URL que la etiqueta NFC: la cámara del teléfono lo abre igual.
  async verQr(a: Alumno) {
    if (this.qr()?.id === a.id) {
      this.qr.set(null);
      return;
    }
    const QRCode = await import('qrcode');
    const imagen = await QRCode.toDataURL(this.banco.urlTarjeta(a.codigo), { width: 320, margin: 2 });
    this.qr.set({ id: a.id, imagen });
  }

  async copiar(a: Alumno) {
    await navigator.clipboard.writeText(this.banco.urlTarjeta(a.codigo));
    this.copiado.set(a.id);
  }
}
