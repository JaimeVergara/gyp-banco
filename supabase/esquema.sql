-- Banco GYP · Ejecutar una vez en Supabase: SQL Editor → New query → pegar → Run.
-- Puede convivir con las tablas de nfc-verifica en el mismo proyecto (nombres distintos).

create table alumnos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,             -- lo que va en la URL de la etiqueta (…/#/t/CODIGO)
  nombre text not null,
  curso text,
  saldo integer not null default 0 check (saldo >= 0),   -- GYP Dollars (enteros)
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table movimientos (
  id bigint generated always as identity primary key,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  monto integer not null check (monto <> 0),   -- positivo = abono, negativo = cargo
  motivo text,
  saldo_final integer not null,
  usuario uuid default auth.uid(),
  usuario_email text default (auth.jwt() ->> 'email'),
  fecha timestamptz not null default now()
);
create index movimientos_alumno_fecha on movimientos (alumno_id, fecha desc);
create index movimientos_fecha on movimientos (fecha desc);

-- Seguridad: sin sesión iniciada no se puede leer ni escribir nada.
alter table alumnos enable row level security;
alter table movimientos enable row level security;

create policy "con sesión leen alumnos" on alumnos for select to authenticated using (true);
create policy "con sesión agregan alumnos" on alumnos for insert to authenticated with check (saldo = 0);
-- El saldo NO se puede editar directo: solo con la función mover_gyp (deja registro).
create policy "con sesión editan alumnos" on alumnos for update to authenticated using (true);
revoke update on alumnos from authenticated, anon;
grant update (nombre, curso, activo) on alumnos to authenticated;

create policy "con sesión ven movimientos" on movimientos for select to authenticated using (true);
-- Sin política de insert: los movimientos solo los crea mover_gyp.

-- Suma o descuenta GYP Dollars en una sola operación y deja el movimiento registrado.
create or replace function mover_gyp(p_codigo text, p_monto integer, p_motivo text default null)
returns alumnos
language plpgsql
security definer
set search_path = public
as $$
declare
  a alumnos;
begin
  if auth.uid() is null then
    raise exception 'sin_sesion';
  end if;
  if p_monto is null or p_monto = 0 or abs(p_monto) > 10000 then
    raise exception 'monto_invalido';
  end if;

  select * into a from alumnos where codigo = p_codigo for update;
  if not found then raise exception 'tarjeta_no_existe'; end if;
  if not a.activo then raise exception 'tarjeta_bloqueada'; end if;
  if a.saldo + p_monto < 0 then raise exception 'saldo_insuficiente'; end if;

  update alumnos set saldo = saldo + p_monto where id = a.id returning * into a;
  insert into movimientos (alumno_id, monto, motivo, saldo_final)
  values (a.id, p_monto, nullif(trim(p_motivo), ''), a.saldo);
  return a;
end;
$$;

revoke all on function mover_gyp(text, integer, text) from public, anon;
grant execute on function mover_gyp(text, integer, text) to authenticated;
