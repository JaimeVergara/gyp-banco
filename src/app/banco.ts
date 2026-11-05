import { Injectable, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export interface Alumno {
  id: string;
  codigo: string;
  nombre: string;
  curso: string | null;
  saldo: number;
  activo: boolean;
}

export interface Movimiento {
  id: number | string;
  alumno_id: string;
  monto: number;
  motivo: string | null;
  saldo_final: number;
  usuario_email: string | null;
  fecha: string;
  alumnos?: { nombre: string; codigo: string } | null;
}

export interface Resumen {
  alumnos: number;
  circulacion: number;
  entregadoHoy: number;
  movimientosHoy: number;
}

const CLAVE_DEMO = 'gyp-banco-demo';

interface DatosDemo {
  alumnos: Alumno[];
  movimientos: Movimiento[];
}

/**
 * Toda la lógica del banco. Funciona con Supabase (real) o en "modo demo"
 * (datos inventados guardados solo en este navegador, para probar sin cuenta).
 */
@Injectable({ providedIn: 'root' })
export class Banco {
  readonly client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { detectSessionInUrl: false },
  });
  readonly usuario = signal<string | null>(null);
  readonly demo = signal(leerLocal('gyp-modo') === 'demo');

  constructor() {
    this.client.auth.onAuthStateChange((_e, sesion) => {
      if (!this.demo()) this.usuario.set(sesion?.user?.email ?? null);
    });
  }

  // ===== Sesión =====
  async haySesion(): Promise<boolean> {
    if (this.demo()) {
      this.usuario.set('Modo demo');
      return true;
    }
    const { data } = await this.client.auth.getSession();
    this.usuario.set(data.session?.user?.email ?? null);
    return !!data.session;
  }

  async ingresar(correo: string, clave: string): Promise<string | null> {
    const { error } = await this.client.auth.signInWithPassword({ email: correo, password: clave });
    return error ? 'Correo o contraseña incorrectos' : null;
  }

  entrarDemo() {
    guardarLocal('gyp-modo', 'demo');
    this.demo.set(true);
    this.usuario.set('Modo demo');
  }

  async salir() {
    if (this.demo()) {
      guardarLocal('gyp-modo', '');
      this.demo.set(false);
    } else {
      await this.client.auth.signOut();
    }
    this.usuario.set(null);
  }

  urlTarjeta(codigo: string): string {
    const base = config.urlEtiquetas || location.origin + location.pathname;
    return `${base}#/t/${codigo}`;
  }

  // ===== Alumnos =====
  async listarAlumnos(): Promise<Alumno[]> {
    if (this.demo()) return [...this.datosDemo().alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const { data, error } = await this.client.from('alumnos').select('*').order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  async alumnoPorCodigo(codigo: string): Promise<Alumno | null> {
    if (this.demo()) return this.datosDemo().alumnos.find((a) => a.codigo === codigo) ?? null;
    const { data, error } = await this.client.from('alumnos').select('*').eq('codigo', codigo).maybeSingle<Alumno>();
    if (error) throw error;
    return data;
  }

  async agregarAlumno(nombre: string, curso: string, saldoInicial = 0): Promise<Alumno> {
    const nuevo = { codigo: generarCodigo(), nombre, curso: curso || null };
    let alumno: Alumno;
    if (this.demo()) {
      const datos = this.datosDemo();
      alumno = { ...nuevo, id: crypto.randomUUID(), saldo: 0, activo: true };
      datos.alumnos.push(alumno);
      this.guardarDemo(datos);
    } else {
      const { data, error } = await this.client.from('alumnos').insert(nuevo).select('*').single<Alumno>();
      if (error) throw error;
      alumno = data;
    }
    if (saldoInicial > 0) alumno = await this.mover(alumno.codigo, saldoInicial, 'Saldo inicial');
    return alumno;
  }

  async cambiarActivo(alumno: Alumno) {
    if (this.demo()) {
      const datos = this.datosDemo();
      const a = datos.alumnos.find((x) => x.id === alumno.id);
      if (a) a.activo = !a.activo;
      this.guardarDemo(datos);
      return;
    }
    const { error } = await this.client.from('alumnos').update({ activo: !alumno.activo }).eq('id', alumno.id);
    if (error) throw error;
  }

  // ===== Dinero =====
  /** Suma (monto > 0) o descuenta (monto < 0) GYP Dollars. Devuelve el alumno con su saldo nuevo. */
  async mover(codigo: string, monto: number, motivo: string): Promise<Alumno> {
    if (!Number.isInteger(monto) || monto === 0) throw new Error('Monto inválido');
    if (this.demo()) {
      const datos = this.datosDemo();
      const a = datos.alumnos.find((x) => x.codigo === codigo);
      if (!a) throw new Error('Tarjeta no registrada');
      if (!a.activo) throw new Error('La tarjeta está bloqueada');
      if (a.saldo + monto < 0) throw new Error('Saldo insuficiente');
      a.saldo += monto;
      datos.movimientos.unshift({
        id: crypto.randomUUID(),
        alumno_id: a.id,
        monto,
        motivo: motivo || null,
        saldo_final: a.saldo,
        usuario_email: 'Modo demo',
        fecha: new Date().toISOString(),
      });
      this.guardarDemo(datos);
      return { ...a };
    }
    // La función de la base de datos hace todo en una sola operación (no se pierden montos).
    const { data, error } = await this.client.rpc('mover_gyp', { p_codigo: codigo, p_monto: monto, p_motivo: motivo || null });
    if (error) throw new Error(traducirError(error.message));
    return data as Alumno;
  }

  async movimientos(opciones: { alumnoId?: string; limite?: number } = {}): Promise<Movimiento[]> {
    const limite = opciones.limite ?? 50;
    if (this.demo()) {
      const datos = this.datosDemo();
      const nombres = new Map(datos.alumnos.map((a) => [a.id, a]));
      return datos.movimientos
        .filter((m) => !opciones.alumnoId || m.alumno_id === opciones.alumnoId)
        .slice(0, limite)
        .map((m) => {
          const a = nombres.get(m.alumno_id);
          return { ...m, alumnos: a ? { nombre: a.nombre, codigo: a.codigo } : null };
        });
    }
    let consulta = this.client
      .from('movimientos')
      .select('*, alumnos(nombre, codigo)')
      .order('fecha', { ascending: false })
      .limit(limite);
    if (opciones.alumnoId) consulta = consulta.eq('alumno_id', opciones.alumnoId);
    const { data, error } = await consulta;
    if (error) throw error;
    return (data ?? []) as Movimiento[];
  }

  async resumen(): Promise<Resumen> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (this.demo()) {
      const datos = this.datosDemo();
      const deHoy = datos.movimientos.filter((m) => new Date(m.fecha) >= hoy);
      return {
        alumnos: datos.alumnos.length,
        circulacion: datos.alumnos.reduce((s, a) => s + a.saldo, 0),
        entregadoHoy: deHoy.filter((m) => m.monto > 0).reduce((s, m) => s + m.monto, 0),
        movimientosHoy: deHoy.length,
      };
    }
    const [alumnos, hoyMov] = await Promise.all([
      this.client.from('alumnos').select('saldo'),
      this.client.from('movimientos').select('monto').gte('fecha', hoy.toISOString()),
    ]);
    if (alumnos.error) throw alumnos.error;
    const montos = (hoyMov.data ?? []).map((m) => m.monto as number);
    return {
      alumnos: alumnos.data.length,
      circulacion: alumnos.data.reduce((s, a) => s + (a.saldo as number), 0),
      entregadoHoy: montos.filter((m) => m > 0).reduce((s, m) => s + m, 0),
      movimientosHoy: montos.length,
    };
  }

  // ===== Modo demo (localStorage) =====
  private datosDemo(): DatosDemo {
    const guardado = leerLocal(CLAVE_DEMO);
    if (guardado) {
      try {
        return JSON.parse(guardado) as DatosDemo;
      } catch {
        /* datos dañados: se vuelven a crear */
      }
    }
    const datos = datosEjemplo();
    this.guardarDemo(datos);
    return datos;
  }

  private guardarDemo(datos: DatosDemo) {
    guardarLocal(CLAVE_DEMO, JSON.stringify(datos));
  }

  reiniciarDemo() {
    guardarLocal(CLAVE_DEMO, '');
  }
}

function datosEjemplo(): DatosDemo {
  const base: [string, string, number][] = [
    ['Ana Prueba Soto', '5°A', 42],
    ['Benjamín Ejemplo Rojas', '5°A', 18],
    ['Camila Demo Fuentes', '6°B', 65],
    ['Diego Ficticio Muñoz', '6°B', 7],
    ['Elena Inventada Díaz', '5°A', 30],
  ];
  const alumnos: Alumno[] = base.map(([nombre, curso, saldo], i) => ({
    id: `demo-${i}`,
    codigo: ['demoa7k3m9xq2', 'demob4h8w2zn6', 'democ9r5t3vb8', 'demod2p6y8ks4', 'demoe5n3j7tf9'][i],
    nombre,
    curso,
    saldo,
    activo: i !== 3,
  }));
  const ahora = Date.now();
  const movimientos: Movimiento[] = alumnos.map((a, i) => ({
    id: `m-${i}`,
    alumno_id: a.id,
    monto: a.saldo,
    motivo: 'Saldo inicial',
    saldo_final: a.saldo,
    usuario_email: 'Modo demo',
    fecha: new Date(ahora - 86_400_000 - i * 3_600_000).toISOString(), // ayer
  }));
  return { alumnos, movimientos };
}

function traducirError(mensaje: string): string {
  if (mensaje.includes('saldo_insuficiente')) return 'Saldo insuficiente';
  if (mensaje.includes('tarjeta_bloqueada')) return 'La tarjeta está bloqueada';
  if (mensaje.includes('tarjeta_no_existe')) return 'Tarjeta no registrada';
  return mensaje;
}

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardarLocal(clave: string, valor: string) {
  try {
    if (valor) localStorage.setItem(clave, valor);
    else localStorage.removeItem(clave);
  } catch {
    /* almacenamiento bloqueado */
  }
}

// Código aleatorio de 12 caracteres, sin letras confusas (0/O, 1/l/I).
export function generarCodigo(): string {
  const letras = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => letras[b % letras.length]).join('');
}

export function formatoGyp(monto: number): string {
  return 'G$ ' + monto.toLocaleString('es-CL');
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

// Tono de color estable por alumno (para avatares y tarjetas).
export function tono(texto: string): number {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
