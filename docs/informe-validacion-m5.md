# AgroBits — Informe de validación de M5 (hito M5: registro enriquecido)

Estado: **aprobado por JowlArx el 19/10/2026 — hito M5 cerrado.**
Alcance: enmienda aprobada D27 / `docs/spec.md` **v3** — requisito **R-01 ampliado** con sus criterios **AC1–AC6** (confirmación de contraseña, teléfono y localidad con catálogo provincia×ciudad).

## 1. Metodología

Cinco fuentes de evidencia, ninguna sustituye a otra:

1. **Suite E2E Playwright** (`web/e2e/`, chromium): ejecución final del 19/10/2026 **13/13 en verde en local** y **13/13 contra producción** (`https://agrobits-jowlarxs-projects.vercel.app`, build desplegado tras el merge `f627d1e`). Incluye la spec nueva `06-registro-validacion` (AC4/AC5 en cliente, con **0 peticiones `POST /auth/v1/signup`** contadas en navegador).
2. **Suite SQL T-27** `supabase/tests/20261019_t27_perfiles_localidades.sql` (metodología T-21: identidades simuladas + `ROLLBACK`, residuo 0), ejecutada vía MCP: **14/14 pruebas OK**.
3. **Suite unitaria** (Vitest): **142 pruebas / 16 suites** en verde (+18 sobre M4); `npm run lint` ✔ y `npm run build` ✔.
4. **Pasada manual human-in-the-loop del 19/10/2026 contra producción**, con el correo real del humano (la dirección no se documenta por ser dato personal): registro duplicado, registro real con perfil completo, confirmación por enlace real de correo, y reprobación en vivo de contraseña corta, confirmación distinta y campos de perfil vacíos.
5. **Verificación servidor por SQL** tras la pasada: fila creada en `perfiles` por el trigger con localidad **La Pampa · General Pico** y teléfono de **10 dígitos con formato válido** (el valor no se muestra ni se registra en ningún documento — dato personal), y `email_confirmed_at` confirmado (cuenta creada 19/10/2026 18:14:26 UTC).

Verificación global al cerrar: `eslint` ✔ · `vitest` 142/142 ✔ · `build` ✔ · E2E local 13/13 ✔ · E2E producción 13/13 ✔ · suite SQL T-27 14/14 ✔.

## 2. Checklist de criterios de aceptación (R-01 v3)

| AC | Estado | Evidencia |
|---|---|---|
| AC1 — con credenciales válidas, el registro crea la cuenta con su perfil e impide el email duplicado | ✔ | Pasada manual 19/10: registro real en producción con el formulario enriquecido → **cuenta creada con perfil** (18:14:26 UTC) → correo de confirmación recibido y **clic real del enlace** (`email_confirmed_at` ✔) → **re-login manual de la cuenta nueva confirmado por el humano el 19/10/2026** («entré»), además de la E2E `01-acceso` del mismo build |
| AC2 — con un email ya registrado, el sistema rechaza el registro con mensaje | ✔ | Pasada manual 19/10: registro con el **correo real ya existente de M4** y el formulario nuevo → «Ya existe una cuenta con ese email.» y sin entrar |
| AC3 — contraseña que no cumpla los requisitos mínimos → rechazo con motivo | ✔ | Pasada manual 19/10: contraseña de 4 dígitos rechazada en vivo + E2E `01-acceso` + unit T-22/T-27 |
| AC4 — confirmación de contraseña que no coincide → rechazo en pantalla **sin llamar al servidor** | ✔ | Unit T-27 (espía del proveedor: **0 llamadas** en el rechazo) + E2E `06-registro-validacion` (**0 `POST /auth/v1/signup`** contados en navegador) + pasada manual en vivo (contraseñas correctas pero distintas → rechazado) |
| AC5 — teléfono vacío/inválido o localidad sin seleccionar → rechazo indicando el campo | ✔ | Unit T-27 (espía: 0 llamadas) + E2E `06-registro-validacion` (teléfono vacío, «123», y sin localidad) + pasada manual en vivo (registro sin campos de perfil → rechazado) |
| AC6 — con registro válido, teléfono y localidad quedan guardados en el perfil y el usuario puede iniciar sesión | ✔ | Suite SQL T-27 (signup simulado con metadata → perfil correcto en `perfiles`; backstops: sin metadata / localidad inexistente / teléfono corto revierten el alta) + **pasada manual REAL 19/10**: fila creada por el trigger en la cuenta nueva — La Pampa · General Pico, teléfono 10 dígitos formato válido (valor enmascarado), sesión utilizable tras confirmar el correo |

Resumen: **6/6 AC ✔** (más las 28 de M4, sin regresión: E2E 13/13 en local y producción).

## 3. Artefactos de T-27

- **BD:** `supabase/migrations/20261019000001_profiles_and_locations.sql` — `localidades` (109 filas / 24 provincias; lectura pública `anon`+`authenticated` para el registro anónimo) y `perfiles` (RLS de solo lectura propia, **sin escritura para clientes**); trigger `crear_perfil_de_usuario` (`SECURITY DEFINER`) con backstop de servidor.
- **Cliente:** contrato `PerfilRegistro`, `signUp` con `options.data`, validación AC4/AC5 en `storeSesion` antes de tocar el proveedor, `cargarLocalidades` (PostgREST + dobles) y formulario de 5 campos con cascada provincia→localidad.
- **Pruebas:** suite SQL T-27 (14/14), +18 unit (incl. espías y cascada), spec E2E `06-registro-validacion` (4 pruebas).
- **Detalle completo:** registro de verificación T-27 en `docs/tasks.md`.

## 4. Limitaciones conocidas

1. **Usuarios previos sin perfil:** las 3 cuentas creadas antes de T-27 (incluida la cuenta real de M4) no tienen fila en `perfiles`; la edición de perfil está fuera de alcance (D27) y una futura «edición de perfil» permitirá completarlos.
2. **Localidad fuera de la semilla impide registrarse** (109 localidades / 24 provincias): riesgo aceptado en D27; se amplía por migración.
3. **El registro real con perfil no entra en la suite automatizada** (cuota free tier, D21): AC6 se certifica con la suite SQL (signup simulado) y con pasada manual, no con Playwright.
4. **El SQL de recreación de fixtures E2E del informe M4 (§3) queda obsoleto**: ahora debe incluir metadata `telefono`/`localidad_id` válida para no ser rechazado por el trigger (patrón actualizado en las suites T-21/T-25 parcheadas).
5. **La evidencia se capturó sobre el build pre-rediseño visual** (el rediseño de UI en paralelo no afecta a esta validación lógica; los `data-testid` del formulario deben conservarse para mantener la suite E2E).
6. **El teléfono es dato personal**: se verifica solo su formato/longitud; nunca aparece en logs, docs ni commits.

## 5. Pruebas pendientes declaradas

*(Cerrada el 19/10/2026: el re-login manual de la cuenta creada en la pasada fue confirmado por el humano («entré») — ver §2 AC1.)*

- Acumuladas de M4 y sin relación con esta enmienda: matriz de navegadores móviles en la suite E2E; R-06 AC3 end-to-end por UI.

## 6. Aprobación

**Aprobado por JowlArx el 19/10/2026 («Apruebo»): hito M5 cerrado.** Registro en `docs/tasks.md` (addendum T-27) y en `MEMORY.md`.
