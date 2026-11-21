# AgroBits — Plan de implementación

Estado: **aprobado por el humano el 16/10/2026 (hito M1)**. Siguiente paso: desglose de `docs/tasks.md` (M2).

## 1. Decisiones de contexto (aprobadas, ver `MEMORY.md`)

- Alcance, tipos de medición, umbrales catálogo-editable y alertas binarias (D1–D4).
- Modelo sensor↔cultivo N–N, sin compartir en el MVP (D5).
- Dos fases: interfaz simulada, luego backend + BD + auth (D6).
- Plataforma managed en tier gratuito, coste ~0 €/mes, exportación de datos exigida (D7).
- Auth real de la plataforma con autorización por filas (D8).
- Frontend: **Vite + React + TypeScript** (D12).
- Backend/Fase 2: **Supabase** (Postgres, RLS, Auth) — con acceso del agente vía MCP Supabase; la creación de cuenta/proyecto la realiza el humano (D13).
- Alertas: **una alerta activa por (cultivo, tipo)** que se mantiene hasta volver al rango y se marca resuelta (D14).
- Generador simulado: **1 lectura cada 5 minutos por sensor** (D15).

## 2. Arquitectura

### Fase 1 (interfaz simulada)
- SPA: Vite + React + TypeScript, sin backend.
- Datos falsos en memoria (mock con el "contrato de medición" de R-08: `sensor_id`, tipo, valor, unidad, `measured_at`).
- Login provisional maquetado, marcado como temporal (no valida R-01…R-03).
- Estructura modular: `components/`, `pages/`, `data/` (mocks), `domain/` (reglas de umbrales/alertas puras, testeables).

### Fase 2 (backend y datos reales)
- Misma SPA + **Supabase**:
  - **Postgres** con esquema de §3 y RLS en todas las tablas con `user_id`.
  - **Auth** de la plataforma (email/contraseña + reset gestionado).
  - **API** generada (PostgREST) consumida con el cliente JS de Supabase.
  - **Generador de datos simulados** que escribe vía API con formato idéntico al futuro ESP32.
- Hosting: estático gratuito (Vercel/Netlify/Cloudflare Pages) + proyecto Supabase gratuito.
- Variables de entorno: `.env` con `.gitignore`; `anon key` (pública, segura solo con RLS) en cliente; `service_role` jamás en cliente ni repo.

### Ingesta de dispositivos (ESP32; ingesta en producción desde la versión 4 de la Edge Function, 21/11/2026; D69)
Flujo: ESP32 (`firmware/`, PlatformIO) → HTTPS `POST` con cabecera `x-device-token` → Edge Function `ingesta` (`verify_jwt: true`) → PostgREST con `service_role` (solo en servidor) → `measurements` → trigger `AFTER INSERT` `evaluar_alertas_de_sensor` (D19).

- La Edge Function valida: lote de máximo 32 lecturas; tipos y unidades canónicos (`humedad_suelo`/% vol, `temperatura`/°C, `humedad_ambiental`/% HR, `luminosidad`/lux); `medida_en` ISO-8601 dentro de una ventana de 24 h (ampliada desde ±10 min el 29/10/2026). Actualiza `last_seen_at` del sensor.
- Tokens de dispositivo (`device_tokens`): se guarda solo el hash SHA-256 (`token_hash`, único). RLS solo para `authenticated`, por propiedad del sensor; ninguna policy para `anon`. El token en claro se muestra una sola vez al generarlo. La UI permite generar, listar y revocar; no hay rotación automática.
- Separación real/simulado: el simulador (D18) solo escribe en sensores con `origen = 'simulado'`. La columna `sensors.origen` llega con `20261029000002_sensors_origen.sql` (aplicada el 29/10/2026).
- Verificación del 29/10/2026: prueba end-to-end (200, 422 y 401 según el caso; datos de prueba borrados) y de la ventana: 48 h → 422; 23 h → 401 (token inválido). La compilación del firmware es correcta (30/10/2026: RAM 12,0 %, flash 41,6 %); sensores en campo con lecturas que llegan a la app y reapertura del portal con BOOT verificadas por el responsable a finales de octubre de 2026; calibración de FC-28 y LDR cerrada el 30/10/2026 (registro del responsable). TLS verificado el 21/11/2026 (cadena y código; prueba negativa omitida por decisión del responsable).
- Aprovisionamiento (verificado en hardware el 30/10/2026; reapertura con BOOT verificada por el responsable a finales de octubre de 2026): firmware único. Sin configuración válida abre el portal cautivo `AgroBits-XXXX`, guarda WiFi y token en NVS y pasa al ciclo normal de lecturas. BOOT (GPIO9) con el equipo encendido reabre el portal; 5 min sin WiFi también.
- Limitación conocida: la ingesta **no es idempotente** (no hay índice único `(sensor_id, tipo, measured_at)` por 2 104 grupos duplicados existentes); un reenvío tras una respuesta perdida puede duplicar filas hasta que se apruebe la limpieza.

## 3. Modelo de datos

| Tabla | Campos clave | Notas |
|---|---|---|
| `crops` | id, user_id, name, crop_type, es_personalizado | Dueño = user_id; RLS |
| `crop_thresholds` | crop_id, tipo, min, max | Una fila por tipo de medición (4 tipos); evita 8 columnas; RLS por herencia del cultivo |
| `sensors` | id, user_id, name | Dueño; RLS |
| `sensor_crop` | sensor_id, crop_id | Asociación N–N (D5) desde el inicio; sin UI de compartir |
| `measurements` | id, sensor_id, tipo, value, unit, measured_at | Tabla de crecimiento; índice por `measured_at` y `sensor_id` |
| `alerts` | id, crop_id, tipo, value, estado, created_at, resolved_at | Índice único parcial: **una sola alerta activa por (crop_id, tipo)** (D14) |
| `crop_type_catalog` | crop_type, tipo, default_min, default_max | Semilla del catálogo editable (D3); marcada como referencia orientativa |

Reglas de dominio (en `domain/`, puras y unitarias):
- Validación de umbrales: `min < max` por tipo (R-05).
- Evaluación de alerta: `valor < min || valor > max` ⇒ fuera de rango (R-13).

Retención de `measurements` decidida el 26/10/2026 (MEMORY, D54): crudas 30 días; resumen diario sin límite.

## 4. Estrategia de seguridad

1. **RLS en todas las tablas con `user_id`**: política base "el usuario solo ve/escribe sus filas". Cultivos → umbrales → alertas se protegen por herencia vía `crop_id`; sensores por `user_id`.
2. **Gate de seguridad**: pruebas de integración con **dos cuentas** (A y B) que verifiquen R-02 y R-07 antes de cualquier despliegue público.
3. **Claves y secretos**: `.env` en `.gitignore` desde el primer commit de código; `service_role` solo en servidor/CLI; ninguna credencial en repo ni en logs (AGENTS.md §6).
4. **Auth**: exclusivamente la de Supabase (D8). Sin criptografía o sesiones caseras. Requisitos de contraseña definidos por el proveedor.
5. **Entornos separados**: proyecto Supabase de desarrollo distinto del de producción; nunca datos personales en desarrollo.
6. **Servicios facturables**: crear el proyecto Supabase en tier gratuito requiere confirmación explícita del humano antes de registrarlo o superar el tier (D7).
7. **Ingesta de dispositivos (ESP32)**: token de dispositivo hasheado, sin acceso `anon`, `service_role` solo en servidor (§2, D69). La rotación es manual: generar y revocar.

## 5. Estrategia de pruebas

| Nivel | Alcance | Herramienta |
|---|---|---|
| Unidad | Reglas de umbrales y alertas (`domain/`), validaciones | Vitest |
| Integración | RLS con dos usuarios de prueba; escrituras y lecturas cruzadas | Supabase local (CLI) o proyecto de pruebas vía MCP |
| Fin a fin | Registro → cultivo → mediciones → alertas | Playwright |
| Manual | Criterios no automatizables y los marcados `[F2]` | Checklist trazado a R-01…R-14 |

Reglas (coherentes con `tasks.md`): ninguna tarea se cierra sin ejecutar sus pruebas; los criterios `[F2]` no cierran en Fase 1; se documentan siempre las pruebas pendientes.

## 6. Secuencia de implementación (hitos con aprobación humana)

```
M0. spec.md v2 aprobada                          ✅ (16/10/2026)
M1. Aprobación de este plan (docs/plan.md)       ✅ (16/10/2026)
M2. Desglose en docs/tasks.md + aprobación       ✅ (17/10/2026)
M3. Fase 1 — UI con datos simulados
     M3.1 Estructura del proyecto (Vite/React/TS), tooling, .gitignore, tests de dominio
     M3.2 Cultivos: CRUD + umbrales (catálogo editable)
     M3.3 Vista de mediciones simuladas (4 tipos) con contrato de medición
     M3.4 Alertas en UI + login provisional maquetado
     → Revisión humana: ¿la interfaz sirve?
M4. Fase 2 — Backend y datos reales (Supabase)
     M4.1 Crear proyecto Supabase (humano) + esquema + RLS + pruebas de dos cuentas
     M4.2 Auth real y sustitución del login provisional
     M4.3 Generador de datos simulados (1 lectura/5 min por sensor)
     M4.4 Evaluación de alertas (modelo D14) + verificación de R-01…R-14
     → Validación completa de la especificación
M5. Post-MVP: compartir sensores, notificaciones externas (fuera de alcance actual). ESP32: en producción fuera de este hito (§2, D69)
```

## 7. Riesgos y alternativas

| Riesgo | Impacto | Mitigación / alternativa |
|---|---|---|
| RLS mal configurada = fuga de datos entre usuarios | Alto | Gate M4.1: pruebas de dos cuentas antes de desplegar |
| Deriva entre simulación y formato futuro del ESP32 | Medio | Contrato de medición único (R-08) usado por mocks, generador y (futuro) firmware |
| Límites del tier gratuito | Medio | Frecuencia de 5 min/sensor (D15) y revisión mensual de consumo |
| Lock-in de Supabase | Medio-bajo | Postgres estándar con exportación; la UI solo depende de una capa de datos intercambiable |
| Complejidad de aprender RLS + stack a la vez | Medio | Alternativa (requiere aprobación): API propia mínima — pero contradice D8 |
| Crecimiento de `measurements` | Medio | Retención decidida el 26/10/2026 (MEMORY, D54) |
| Cambios de UI posteriores a invertir en backend | Bajo | Secuencia M3 → revisión humana → M4 minimiza el retrabajo |

## 8. Criterios de aprobación de este plan

El plan se considera aprobado cuando el humano confirma explícitamente y:
- Respeta las decisiones D1–D15 sin introducir alcance nuevo.
- La estrategia de seguridad cubre R-02 y R-07 con pruebas verificables.
- Los hitos tienen criterios de salida verificables y puntos de aprobación humana.
