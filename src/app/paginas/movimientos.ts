import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Barra } from '../barra';
import { ListaMovimientos } from '../lista-movimientos';
import { Banco, Movimiento } from '../banco';

type Filtro = 'todos' | 'abonos' | 'cargos';

@Component({
  selector: 'app-movimientos',
  imports: [Barra, ListaMovimientos],
  template: `
    <app-barra titulo="Movimientos" subtitulo="Últimos 200" atras="/" />
    <main class="contenido">
      <div class="segmentado">
        <button [class.activo]="filtro() === 'todos'" (click)="filtro.set('todos')">Todos</button>
        <button [class.activo]="filtro() === 'abonos'" (click)="filtro.set('abonos')">Abonos</button>
        <button [class.activo]="filtro() === 'cargos'" (click)="filtro.set('cargos')">Cargos</button>
      </div>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <app-lista-movimientos [movimientos]="filtrados()" />
    </main>
  `,
})
export class Movimientos implements OnInit {
  private banco = inject(Banco);
  readonly todos = signal<Movimiento[]>([]);
  readonly filtro = signal<Filtro>('todos');
  readonly error = signal('');
  readonly filtrados = computed(() => {
    const f = this.filtro();
    return this.todos().filter((m) => f === 'todos' || (f === 'abonos' ? m.monto > 0 : m.monto < 0));
  });

  async ngOnInit() {
    try {
      this.todos.set(await this.banco.movimientos({ limite: 200 }));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
