# AgroBits — Informe de validación de Fase 2 (hito M4)

Estado: **redactado el 17/10/2026 en la tarea T-26 — pendiente de aprobación humana de cierre de Fase 2.**
Alcance: `docs/spec.md` v2 (aprobada, M0), requisitos **R-01…R-14** con todos sus criterios de aceptación, incluidos los marcados `[F2]`.

## 1. Metodología

Cinco fuentes de evidencia, ninguna sustituye a otra:

1. **Suite E2E Playwright** versionada en `web/e2e/` (nueva en T-26, chromium, contra el servidor de desarrollo y Supabase real). Ejecución final del 17/10/2026: **9/9 pruebas en verde**.
2. **Suites SQL** con identidades simuladas y `ROLLBACK` (residuo 0): T-21 `supabase/tests/…` (autorización, R-02/R-07/R-14) y T-25 `supabase/tests/20261017_t25_evaluacion_alertas.sql` (evaluación de alertas, 8/8).
3. **Suite unitaria** (Vitest): **124 pruebas / 16 suites** en verde sobre el estado actual.
4. **E2E manuales previos** (T-22…T-25) con chrome-devtools contra Supabase real, con evidencia registrada en `docs/tasks.md`.
5. **Evidencia de esquema** consultada en la BD (`pg_constraint` sobre `measurements`) para R-08 AC2.

Verificación global del estado al cerrar T-26: `npm run test` 124/124 ✔ · `npm run build` ✔ · `npm run lint` ✔ · `npm run test:e2e` 9/9 ✔ · suites SQL 21/21 y 8/8 ✔.

## 2. Checklist de criterios de aceptación

| Requisito | AC | Estado | Evidencia |
|---|---|---|---|
| R-01 | AC1 — el registro crea la cuenta e inicia sesión | ◐ | E2E T-22 (17/10/2026): registro real contra GoTrue con confirmación híbrida + login. No re-ejecutado hoy: requiere buzón de correo real y cuota de signup (limitación §5) |
| R-01 | AC2 — email duplicado rechazado con mensaje | ◐ | E2E T-22: «Ya existe una cuenta con ese email» (ofuscación correcta). Mismo motivo que AC1 |
| R-01 | AC3 — contraseña corta rechazada con motivo | ✔ | Suite T-26 `01-acceso` (en vivo) + E2E T-22 |
| R-02 | AC1 — ninguna operación de A toca datos de B | ✔ | Suite SQL T-21 (identidades simuladas, pruebas negativas por fila) + suite T-26 `05-aislamiento` (observable en la app) |
| R-02 | AC2 — datos filtrados por la sesión | ✔ | Suite SQL T-21 + suite T-26 `05-aislamiento` (dos contextos de navegador) |
| R-03 | AC1 — cerrar sesión exige acceso de nuevo | ✔ | Suite T-26 `01-acceso`: persistencia al recargar, gate tras cerrar, reacceso |
| R-04 | AC1 — crear cultivo y verlo en la lista | ✔ | Suite T-26 `02-cultivos` |
| R-04 | AC2 — editar y persistir | ✔ | Suite T-26 `02-cultivos`: umbral sobrescrito, recarga y reapertura del formulario muestran el valor guardado |
| R-04 | AC3 — eliminar y no volver a aparecer | ✔ | Suite T-26 `02-cultivos`: tras borrar y recargar |
| R-05 | AC1 — guardar con todos los umbrales válidos | ✔ | Suite T-26 `02-cultivos` + unit T-11 |
| R-05 | AC2 — rechazar umbral inválido informando del error | ✔ | Suite T-26 `02-cultivos`: «El umbral mínimo debe ser menor que el máximo» y el cultivo no se guarda |
| R-06 | AC1 — crear sensor y verlo listado | ✔ | Suite T-26 `03-sensores-mediciones` |
| R-06 | AC2 — la asociación se refleja en las mediciones del cultivo | ✔ | Suite T-26 `03-sensores-mediciones`: el sensor del cultivo muestra sus lecturas |
| R-06 | AC3 — el modelo admite N–N (D5) | ✔ | Unit T-20 (mismo sensor en dos cultivos) + esquema (`sensor_crop` con PK compuesta) |
| R-07 | AC1 — asociar sensor propio a cultivo ajeno rechazado | ✔ | Suite SQL T-21 (RLS con identidades simuladas). No hay ruta en la UI para intentarlo (se certifica en BD) |
| R-08 | AC1 — la medición válida persiste y se consulta por su cultivo | ✔ | Suite T-26 `03-sensores-mediciones`: recarga + reapertura del detalle la sirve desde la BD |
| R-08 | AC2 — sensor no registrado o tipo desconocido rechazado | ✔ | Esquema: FK `measurements_sensor_id_fkey` (`ON DELETE CASCADE`) y CHECK `measurements_tipo_check` (solo los 4 tipos) — rechazo garantizado por la BD; RLS adicional en T-21 |
| R-09 | AC1 — 4 tipos con valor, unidad y hora | ✔ | Suite T-26 `03-sensores-mediciones`: «4 de 4» + unidades °C / % vol / % HR / lux |
| R-09 | AC2 — «sin datos» sin inventar valor | ✔ | Suite T-26 `03-sensores-mediciones`: cultivo sin sensores |
| R-10 | AC2 — el generador escribe vía API con el mismo formato que el hardware | ✔ | Suite T-26 `03-sensores-mediciones`: la **primera lectura llega sola** tras crear el sensor (tick inmediato del generador); E2E T-24 (cadencia real de 5 min observada en vivo) |
| R-11 | AC1 — umbrales del catálogo precargados | ✔ | Suite T-26 `02-cultivos`: Tomate 15–28 °C |
| R-11 | AC2 — aviso de «referencia orientativa» | ✔ | Suite T-26 `02-cultivos` |
| R-12 | AC1 — tras guardar un umbral, las evaluaciones usan el nuevo valor | ✔ | Suite T-26 `04-alertas`: editar a 0–100 + siguiente lectura resuelve la alerta; E2E T-25 |
| R-13 | AC1 — fuera de rango crea alerta con tipo, valor y hora | ✔ | Suite T-26 `04-alertas` (creada por la lectura automática del generador) + suite SQL T-25 |
| R-13 | AC2 — sin duplicados con lecturas sucesivas | ✔ | Suite T-26 `04-alertas` (2.ª lectura fuera de rango: sigue 1 alerta) + suite SQL T-25 (índice único, rechazo `23505`) |
| R-13 | AC3 — la vuelta al rango resuelve con hora | ✔ | Suite T-26 `04-alertas` (marca «Resuelta» + hora) + suite SQL T-25 |
| R-13 | AC4 — lectura en rango sin alerta previa no crea nada | ✔ | Suite T-26 `04-alertas` + suite SQL T-25 |
| R-14 | AC1 — la lista solo muestra alertas del usuario | ✔ | Suite SQL T-21/T-25 (B no ve alertas de A) + suite T-26 `05-aislamiento` |
| R-14 | AC2 — detalle con cultivo, tipo, valor y hora | ✔ | Suite T-26 `04-alertas` (fila con los cuatro datos) |

Resumen: **26 AC marcados ✔** y **2 ◐** (R-01 AC1/AC2: verificadas en T-22, no re-ejecutadas hoy — justificado en §5). Ninguna AC sin verificar.

## 3. Infraestructura de E2E creada

- `web/playwright.config.ts` — chromium, ejecución secuencial (las cuentas comparten datos), `webServer` que reutiliza o lanza `npm run dev` en el puerto 5173.
- `web/e2e/` — `entorno.ts` (ayudantes y credenciales) + 5 specs: `01-acceso`, `02-cultivos`, `03-sensores-mediciones`, `04-alertas`, `05-aislamiento` (9 pruebas).
- Script `npm run test:e2e`; los specs quedan **fuera** del build (`tsconfig` solo incluye `src`) y de Vitest (que solo toma `src/**/*.test.*`).
- **Credenciales nunca en el repo**: las variables `E2E_EMAIL_A/B` y `E2E_PASSWORD_A/B` viven en `web/.env.local` (gitignored). La suite falla con un mensaje claro si faltan.
- Cuentas de prueba (fixtures de la suite, decisión reversible en M4): `e2e-a@agrobits.test` y `e2e-b@agrobits.test`, sembradas vía SQL con hash `bcrypt` y confirmadas. Para recrearlas si se borran:

```sql
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
  'authenticated', 'e2e-a@agrobits.test',
  extensions.crypt('<clave>', extensions.gen_salt('bf')), now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', '');
```

## 4. Limitaciones conocidas (acumuladas de la Fase 2)

1. **Sin historial de mediciones**: la vista muestra solo la última lectura por tipo; el historial está fuera de alcance (§7 de la spec).
2. **Sin hardware**: toda medición proviene del generador (T-24). El contrato R-08 está definido y probado contra la API; el ESP32 es post-MVP.
3. **La evaluación de alertas solo se dispara con nuevas mediciones**: editar umbrales o desasociar un sensor no re-evalúa al instante; la corrección llega con la siguiente lectura (semántica D14/D19 aprobada; R-12 AC1 la cubre).
4. **El generador solo escribe con la app abierta** con sesión (sustituto del hardware, D18).
5. **R-01 AC1/AC2 no automatizables** sin un buzón de correo real o un cambio de decisión sobre la confirmación híbrida; quedan certificadas por el E2E manual de T-22.
6. **Una recarga de página vuelve a la lista de cultivos** (SPA sin router): comportamiento conocido y asertado en la suite (R-08 AC1 reabre el detalle tras recargar).
7. **Sin pruebas de carga, concurrencia real ni de rendimiento** (tier gratuito, tráfico mínimo); la concurrencia de alertas está cubierta por el índice único (T-25).
8. **La suite E2E cubre chromium con viewport desktop**; no hay matriz de navegadores móviles automatizada (el diseño responsive se revisó manualmente en T-16).

## 5. Pruebas pendientes declaradas

- Re-ejecución automatizada de R-01 AC1/AC2 (registro real): requiere buzón de correo o decisión explícita sobre la confirmación.
- Matriz de navegadores móviles en la suite E2E (dispositivos Playwright) si se desea cerrar la limitación §4.8.
- R-06 AC3 end-to-end por UI: la interfaz solo asocia el sensor en curso; el modelo N–N está cubierto por unit T-20 y por el esquema.

## 6. Desviaciones respecto del plan M2

- La suite E2E se creó con **Playwright** (lo previsto) y se ejecuta contra `npm run dev` + Supabase real. Durante el desarrollo de la suite se detectaron dos fallos **del propio E2E** (no de la aplicación): una recarga completa del servidor de desarrollo a mitad de prueba (server reciclado y relanzado limpio) y una carrera en el test de R-12 (se pulsaba «Generar lectura» sin esperar a que el guardado asíncrono de umbrales terminara); ambos corregidos en el E2E con la suite en verde final.

## 7. Solicitud de aprobación

Se solicita al humano la **aprobación del cierre de Fase 2 (hito M4)** conforme a este informe. La aprobación queda registrada en `docs/tasks.md` (registro de verificación, T-26) y en `MEMORY.md`.
