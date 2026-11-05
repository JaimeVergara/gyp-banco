# Banco GYP 🪙

App Angular para entregar **GYP Dollars** a los alumnos usando etiquetas NFC como si fueran
tarjetas bancarias. Usa la misma lógica que `nfc-verifica`: cada etiqueta guarda una URL
(`…/#/t/CODIGO`). Al acercar el teléfono del profesor aparece un aviso; al tocarlo se abre la
tarjeta del alumno con su saldo y puedes **dar** o **cobrar** GYP Dollars en dos toques.

- El saldo vive en la base de datos, no en la etiqueta: si alguien copia la etiqueta no puede crear dinero.
- Solo usuarios con sesión (profesores) pueden ver tarjetas y mover saldo.
- Cada abono o cargo queda en **Movimientos** con quién lo hizo, motivo y saldo final.
- **Modo demo**: botón en el login para probar con alumnos inventados guardados solo en el navegador.

## 1. Supabase (base de datos)
1. Proyecto Supabase: **gyp-banco**.
2. **SQL Editor** → pegar `supabase/esquema.sql` → Run. (Opcional: `supabase/datos-prueba.sql`.)
3. **Authentication → Users → Add user**: crear las cuentas de los profesores.
4. **Authentication → Sign In / Providers**: desactivar "Allow new users to sign up".
5. `src/app/config.ts` ya apunta al proyecto gyp-banco.

## 2. Probar en el computador
```bash
npm install
npm start
```
Abrir http://localhost:4200 → **Probar en modo demo**.

## 3. Publicar en GitHub Pages
Cada `push` a `main` publica en `https://jaimevergara.github.io/gyp-banco/`
(Settings → Pages → Source: **GitHub Actions**).

## 4. Grabar las tarjetas
1. En la app: **Alumnos** → agregar → **URL NFC** (copia la URL).
2. En **NFC Tools** (iPhone/Android): *Escribir → Añadir registro → URL* → pegar → grabar.
3. Recomendado: *Otros → Bloquear etiqueta* para que nadie la regrabe (es permanente).
4. El botón **QR** genera la misma URL como código QR (para teléfonos sin NFC).

> Usa datos inventados en pruebas. Si cambias de dominio, configura `urlEtiquetas` en
> `config.ts` antes de grabar las etiquetas definitivas.
