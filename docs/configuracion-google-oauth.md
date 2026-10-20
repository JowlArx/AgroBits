# Configuración del acceso con Google (OAuth) — T-28

Guía de lo que hay que hacer **a mano en dos consolas** para que el botón
«Continuar con Google» funcione. El código del proyecto ya está escrito y
verificado (rama `t-28-google-oauth`) y **la migración de BD ya está
aplicada**; lo que falta es la parte que solo puede configurar el humano,
porque implica **secretos**.

- **Proyecto de Supabase:** `fxiukidjxdcsrhyiphmu`
  (`https://fxiukidjxdcsrhyiphmu.supabase.co`)
- **Callback de Supabase (el que hay que registrar en Google):**
  `https://fxiukidjxdcsrhyiphmu.supabase.co/auth/v1/callback`
- **URL de la app:** la SPA se sirve en `/app.html` (decisión D28), no en la
  raíz. Por eso las URLs de retorno son `…/app.html`.

> **Ninguna de estas credenciales va en el repositorio.** El `Client ID` y el
> `Client Secret` de Google se pega **solo** en el panel de Supabase. La app
> sigue usando únicamente la clave publicable (`VITE_SUPABASE_ANON_KEY`).

---

## 1. Google Cloud Console — credenciales OAuth — **HECHO el 20/10/2026**

1. Abrir <https://console.cloud.google.com/> y crear (o reutilizar) un proyecto.
2. **APIs & Services → OAuth consent screen**:
   - Tipo: *External*.
   - Nombre de la app: `AgroBits`.
   - Correo de soporte: el del humano.
   - Ámbitos: `.../auth/userinfo.email` y `.../auth/userinfo.profile`.
   - Si la pantalla queda en modo *Testing*, añadir el correo del humano como
     **usuario de prueba** (las cuentas de prueba pueden entrar con Google sin
     publicar la app; el límite de 100 usuarios de prueba no ata al proyecto).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Tipo de aplicación: **Web application**.
   - **Authorized JavaScript origins**:
     - `https://agrobits-jowlarxs-projects.vercel.app`
     - `https://web-omega-eight-80.vercel.app`
     - `http://localhost:5173`
   - **Authorized redirect URIs**:
     - `https://fxiukidjxdcsrhyiphmu.supabase.co/auth/v1/callback`
     - (opcional, para pruebas locales del callback: la misma de arriba; no
       hace falta ninguna otra: el callback siempre es el de Supabase)
4. Anotar el **Client ID** y el **Client secret** (el secreto solo se copia
   una vez).

## 2. Supabase — habilitar el proveedor Google — **HECHO el 20/10/2026**

1. Panel del proyecto → **Authentication → Providers → Google**.
2. Activar el proveedor y pegar el **Client ID** y el **Client secret** del
   paso 1.
   - El **Client ID** es el identificador público de la credencial (tiene la
     forma `123456789-abcde.apps.googleusercontent.com`).
   - El **Client secret** es la clave que Google muestra **solo una vez**
     (empieza por `GOCSPX-`).
   - **Con los dos campos vacíos, Supabase NO activa el proveedor**: al pulsar
     «Continuar con Google» la app responde «El acceso con Google no está
     habilitado en el proyecto» (verificado el 20/10/2026 contra
     `/auth/v1/authorize`).
3. **No** activar *Skip nonce check* (la casilla existe para pruebas locales de
   OAuth con nonce deshabilitado; dejarla marcada debilita la validación).
4. Guardar y pulsar **Save** en la propia tarjeta del proveedor.

**Estado verificado el 20/10/2026:** el proveedor quedó activo. Comprobación
(`302` = todo correcto; si volviera a salir `provider is not enabled`, faltan
el Client ID o el Secret):

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  "https://fxiukidjxdcsrhyiphmu.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fagrobits-jowlarxs-projects.vercel.app%2Fapp.html"
```

## 3. Supabase — allowlist de URLs de retorno — **YA LISTA (no hay que tocar nada)**

La allowlist actual del proyecto (verificada el 20/10/2026) es:

| Entrada actual | Cubre |
| --- | --- |
| `https://agrobits-jowlarxs-projects.vercel.app/**` | producción (URL canónica), incluida `/app.html` |
| `https://web-omega-eight-80.vercel.app/**` | producción (alias), incluida `/app.html` |
| `https://agrobits-git-main-jowlarxs-projects.vercel.app/**` | producción (alias de `main`), incluida `/app.html` |
| `http://localhost:5173/**` | desarrollo local y E2E, incluido `/app.html` |

**No hay que añadir nada.** GoTrue compila la allowlist como lista de *glob*
(`gobwas/glob`), donde `**` cubre cualquier ruta: `…vercel.app/**` acepta
`…vercel.app/app.html` (la ruta en la que vive la SPA, D28). Si algún día se
quitaran los comodines, las entradas explícitas serían
`https://<host>/app.html` (la raíz **no** serviría).

## 4. Base de datos — migración del trigger de alta — **YA APLICADA**

La migración `supabase/migrations/20261020000001_alta_con_proveedor_externo.sql`
**es obligatoria**: sin ella, el alta de una cuenta nueva con Google se
revierte (el trigger de D27 exige `telefono` y `localidad_id`, que Google no
envía) y Supabase responde «Database error saving new user».

- **Estado: aplicada el 20/10/2026** (autorizada por el humano; vía MCP
  `apply_migration` → `20261020193508 / alta_con_proveedor_externo`; verificado
  en `list_migrations` y en la definición de la función en la BD).
- Qué hace: el trigger `crear_perfil_de_usuario` crea el perfil **solo** en el
  alta por email (`raw_app_meta_data.provider = 'email'`). Para un proveedor
  externo (`google`) la cuenta nace sin fila de perfil y lo completa después
  en «Mi cuenta» (RPC `actualizar_perfil`, que hace UPSERT).
- Qué **no** cambia: el backstop de D27 sigue intacto para el alta por
  formulario (metadata ausente, localidad inexistente o teléfono corto → el
  alta se rechaza). Sin cambios de esquema (ni tablas, ni políticas, ni RLS).
- Verificación: suite `supabase/tests/20261020_t28_alta_google_oauth.sql`
  (11 comprobaciones, `ROLLBACK`, residuo 0) re-ejecutada sobre el estado
  aplicado → **11/11 OK**.


## 5. Comprobación manual (en este orden)

1. Abrir `…/app.html` → pulsar **«Continuar con Google»** → se abre la
   pantalla de consentimiento de Google.
2. Entrar con una cuenta de Google → la app vuelve a `/app.html` **con la
   sesión abierta** (aparece el panel, no la pantalla de acceso).
3. «Mi cuenta» → la cuenta de Google **no tiene perfil todavía**: rellena
   teléfono y localidad y guarda (crea la fila vía el RPC).
4. Recargar → la sesión se mantiene (R-03).
5. Cerrar sesión → vuelve el gate de acceso.
6. Entrar de nuevo con la misma cuenta de Google → entra sin crear otra
   cuenta.

## Notas de seguridad

- El `Client secret` de Google vive **solo** en el panel de Supabase. Nunca
  en el repo, ni en `.env.local`, ni en un log.
- La SPA solo usa la clave publicable; el RLS sigue siendo el que protege los
  datos de cada cuenta (no cambia nada de T-20/T-21).
- Si una persona ya tenía cuenta en AgroBits con el mismo correo y entra con
  Google, Supabase **vincula** la identidad a esa cuenta (no crea una segunda
  cuenta ni borra datos).
- El nombre visible de la barra lateral: si la cuenta de Google trae nombre
  (`full_name`), se muestra ese; si no, la parte del email anterior a la «@»
  (mismo criterio que D32).
- **Flujo de token (decisión consciente):** el cliente usa el `flowType`
  por defecto de `supabase-js` (`implicit`), así que la vuelta de Google llega
  como `#access_token=…` en el fragmento de la URL (el fragmento no viaja al
  servidor, pero queda en el historial del navegador). Migrar a **PKCE**
  (`flowType: 'pkce'` en `clienteSupabase.ts`) es la mejora pendiente: exige
  revalidar el alta por email con confirmación (T-27), porque el enlace de
  confirmación depende del flujo. No se ha hecho en T-28 para no tocar un
  camino ya verificado.

