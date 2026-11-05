-- Alumnos inventados para probar (solo en el proyecto de PRUEBAS).
-- Ejecutar después de esquema.sql. Los saldos se cargan con la función para que quede el movimiento.

insert into alumnos (codigo, nombre, curso) values
  ('prueba7k3m9xq2', 'Ana Prueba Soto', '5°A'),
  ('prueba4h8w2zn6', 'Pedro Ejemplo Rojas', '5°A'),
  ('prueba9r5t3vb8', 'Carla Demo Díaz', '6°B');

-- El SQL Editor no tiene sesión de usuario, así que el saldo inicial se carga directo aquí:
insert into movimientos (alumno_id, monto, motivo, saldo_final)
select id, 20, 'Saldo inicial', 20 from alumnos where codigo like 'prueba%';
update alumnos set saldo = 20 where codigo like 'prueba%';

-- Para probar sin etiqueta, abre en el navegador (con sesión iniciada):
--   …/#/t/prueba7k3m9xq2
