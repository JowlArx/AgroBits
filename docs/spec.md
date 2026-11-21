# AgroBits — Especificación del MVP

## Estado

v2 — Redactada tras la sesión de clarificación del 16/10/2026 (decisiones D1–D15 en `MEMORY.md`).
**Aprobada por el humano el 16/10/2026** (hito M0). Modificada en la misma fecha para incorporar el modelo de alertas D14 (R-13) y resolver la pregunta correspondiente de §8.

v3 — **Enmienda aprobada por el humano el 19/10/2026** (decisión D27): R-01 ampliado con confirmación de contraseña y con teléfono y localidad obligatorios (catálogo provincia×ciudad), para registrar el entorno de trabajo de los sensores como base de la futura capa analítica.

v5 — **Enmienda aprobada por el humano el 24/10/2026** (decisión D51): R-06 añade el AC4. El detalle de un sensor («Ver mediciones») se despliega justo debajo de su tarjeta y muestra la última lectura de cada tipo de medición en texto plano; el historial de mediciones pasa a un bloque debajo de la lista de sensores.

v6 — **Enmienda pendiente de aprobación humana (29/10/2026)**: añade R-15 (ingesta de dispositivos físicos con token de dispositivo y simulador desactivado para sensores reales). Hasta su aprobación, R-15 no figura como aprobado.

Nota sobre fases: según la decisión D6, el proyecto avanza en dos fases (Fase 1: interfaz con datos simulados y auth provisional; Fase 2: backend, base de datos y auth real). Salvo indicación, los criterios de aceptación se verifican en la fase en la que el requisito queda implementado. Los criterios marcados como **[F2]** no pueden verificarse en la Fase 1, y su equivalente provisional en Fase 1 no se acepta como validación definitiva.

## 1. Problema

Los usuarios de huertas domésticas y pequeños cultivos necesitan comprender las condiciones de sus plantas sin tener que interpretar manualmente múltiples mediciones técnicas.

## 2. Usuarios objetivo

- Personas con huertas domésticas.
- Usuarios de pequeños cultivos.
- Otros perfiles por validar (hipótesis, no confirmada).

## 3. Alcance del MVP (decisión D1, aprobada)

Incluye:

- Registro e inicio de sesión.
- Gestión de cultivos (crear, editar, eliminar).
- Registro de sensores como entidad y asociación a cultivos.
- Visualización de las últimas mediciones con datos simulados.
- Umbrales por cultivo (catálogo editable, decisión D3).
- Visualización de alertas basadas en umbrales (decisión D4).

No incluye (ver §7): historial de mediciones, sensores compartidos entre usuarios. El hardware ESP32 se incorpora en M7 (ver §7 y `docs/tasks.md`), pendiente de aprobación de R-15.

## 4. Tipos de medición (decisión D2, aprobada)

| Tipo | Unidad | Observaciones |
|---|---|---|
| Humedad de suelo | % volumétrico (%) | Umbral por cultivo: mín / máx |
| Temperatura | °C | Umbral por cultivo: mín / máx |
| Humedad ambiental | % HR | Umbral por cultivo: mín / máx |
| Luminosidad | lux | Umbral por cultivo: mín / máx |

Cada cultivo define un par [mín, máx] por tipo de medición (decisión D3: valores por defecto del catálogo, editables por el usuario).

## 5. Requisitos en formato EARS

### A. Cuentas y acceso

- **R-01** Cuando un visitante envíe un registro con un email válido, una contraseña que cumpla los requisitos, su confirmación, un teléfono válido y una localidad del catálogo, el sistema debe crear la cuenta con su perfil e impedir el registro con un email ya existente. *(Ampliado en v3, D27.)*
  - AC1: con credenciales válidas, el registro crea la cuenta y permite iniciar sesión. **[F2]**
  - AC2: con un email ya registrado, el sistema rechaza el registro con mensaje de error. **[F2]**
  - AC3: con una contraseña que no cumpla los requisitos mínimos, el sistema rechaza el registro e indica el motivo. **[F2]**
  - AC4: con una confirmación de contraseña que no coincide con la contraseña, el sistema rechaza el registro con mensaje en pantalla, sin llegar a llamar al servidor. **[F2]**
  - AC5: con el teléfono vacío o en formato inválido, o sin localidad seleccionada, el sistema rechaza el registro indicando el campo. **[F2]**
  - AC6: con un registro válido, el teléfono y la localidad quedan guardados en el perfil de la cuenta (verificable en la base de datos) y el usuario puede iniciar sesión. **[F2]**
- **R-02** Cuando un usuario se autentique correctamente, el sistema debe permitirle acceder únicamente a sus propios cultivos, sensores, mediciones y alertas.
  - AC1: con dos cuentas de prueba, ninguna operación de la cuenta A lee ni modifica datos de la cuenta B (pruebas de autorización por fila). **[F2]**
  - AC2: los datos de cada usuario se devuelven filtrados por el identificador de la sesión. **[F2]**
- **R-03** Mientras un usuario tenga una sesión iniciada, el sistema debe mantenerle el acceso hasta que cierre sesión o expire la sesión.
  - AC1: tras cerrar sesión, las rutas protegidas vuelven a exigir inicio de sesión. **[F2]**

### B. Cultivos

- **R-04** Mientras un usuario esté autenticado, el sistema debe permitirle crear, editar y eliminar sus cultivos.
  - AC1: el usuario puede crear un cultivo y este aparece en su lista.
  - AC2: el usuario puede editar los datos de un cultivo propio y los cambios persisten.
  - AC3: el usuario puede eliminar un cultivo propio y este desaparece de su lista.
- **R-05** Todo cultivo debe tener nombre, tipo (del catálogo o personalizado) y un par de umbrales [mín, máx] por cada uno de los 4 tipos de medición.
  - AC1: se guarda un cultivo con todos los umbrales válidos (mín < máx por tipo).
  - AC2: se rechaza guardar un cultivo con un umbral inválido (mín ≥ máx) e informa del error.

### C. Sensores

- **R-06** Mientras un usuario esté autenticado, el sistema debe permitirle registrar sensores y asociarlos a uno de sus cultivos.
  - AC1: el usuario puede crear un sensor con nombre y verlo listado.
  - AC2: el usuario puede asociar un sensor propio a un cultivo propio y la asociación se refleja en la visualización de mediciones.
  - AC3: el modelo de datos permite múltiples asociaciones sensor↔cultivo (N–N) aunque la interfaz del MVP asocie el sensor a un cultivo (decisión D5).
  - AC4: al pulsar «Ver mediciones» de un sensor, su detalle se despliega justo debajo de su tarjeta. Solo un sensor puede estar desplegado a la vez. El detalle muestra la gráfica de evolución y la última lectura de cada tipo de medición en texto plano; las lecturas anteriores se consultan en el historial de mediciones, debajo de la lista de sensores.
- **R-07** El sistema debe impedir que un sensor se asocie a un cultivo perteneciente a otro usuario.
  - AC1: la operación de asociación sobre un cultivo ajeno es rechazada (prueba negativa de autorización). **[F2]**

### D. Mediciones

- **R-08** Cuando se reciba una medición válida de un sensor registrado, el sistema debe almacenarla con valor, tipo, unidad, marca de tiempo y sensor de origen.
  - AC1: una medición válida persiste y es consultable por su cultivo. **[F2]**
  - AC2: una medición procedente de un sensor no registrado o con tipo desconocido es rechazada. **[F2]**
- **R-09** Mientras un usuario consulte un cultivo, el sistema debe mostrar la última medición disponible de los 4 tipos de medición, con valor, unidad y hora de lectura.
  - AC1: la vista del cultivo muestra los 4 tipos de medición con su unidad.
  - AC2: cuando un tipo no tiene datos, se muestra un indicador de "sin datos" y no se inventa un valor.
- **R-10** Durante la Fase 1, la interfaz debe presentar mediciones provenientes de datos simulados sin necesidad de backend; durante la Fase 2, un generador de datos simulados debe producir mediciones cuando no hay hardware conectado.
  - AC1 **[Fase 1]**: la aplicación muestra mediciones simuladas sin servidor real. Este estado es provisional y no valida por sí solo los requisitos R-01 a R-03.
  - AC2 **[F2]**: el generador produce mediciones que la API almacena y sirve a la interfaz con el mismo formato que futuro hardware.

### E. Umbrales

- **R-11** El sistema debe incluir un catálogo de tipos de cultivo con umbrales por defecto [mín, máx] para los 4 tipos de medición, presentados como referencia orientativa y no como asesoramiento certificado.
  - AC1: al crear un cultivo a partir del catálogo, los umbrales por defecto aparecen precargados.
  - AC2: la interfaz indica que los valores del catálogo son una referencia orientativa.
- **R-12** Mientras un usuario edite un cultivo, el sistema debe permitirle sobreescribir cualquiera de los umbrales por defecto.
  - AC1: tras modificar y guardar un umbral, las evaluaciones de alerta usan el nuevo valor.

### F. Alertas

- **R-13** Cuando una medición de un cultivo caiga fuera del rango [mín, máx] definido para ese cultivo y tipo, y no exista ya una alerta activa para ese cultivo y tipo, el sistema debe generar una alerta; la alerta se mantiene activa mientras la condición persista y se marca como resuelta cuando la medición vuelva al rango (decisión D14).
  - AC1: con una medición fuera de rango y sin alerta activa de ese cultivo y tipo, se crea una alerta con tipo, valor leído y hora.
  - AC2: con mediciones sucesivas fuera de rango del mismo cultivo y tipo, no se crean alertas duplicadas: la alerta activa persiste.
  - AC3: cuando una medición vuelve al rango, la alerta activa de ese cultivo y tipo se marca como resuelta.
  - AC4: con una medición dentro del rango y sin alerta previa, no se crea ninguna alerta.
- **R-14** Mientras un usuario esté autenticado, el sistema debe mostrar las alertas de sus cultivos.
  - AC1: la lista de alertas solo contiene alertas de cultivos del usuario en sesión. **[F2]**
  - AC2: el usuario puede ver el detalle de una alerta (cultivo, tipo, valor, hora).

- **R-15** Cuando un dispositivo físico envíe un lote de lecturas con un token de dispositivo válido asociado a un sensor, el sistema debe almacenarlas con su sensor de origen y su marca de tiempo, y el simulador no debe escribir en sensores marcados como reales. La configuración del dispositivo (red WiFi y token de dispositivo) se realiza sin recompilar, mediante un portal cautivo de aprovisionamiento; el firmware es único para todos los clientes. *(Añadido en v6, pendiente de aprobación.)*
  - AC1: un lote válido con token válido se inserta y el sensor registra su última conexión. **Verificado** el 29/10/2026 (prueba end-to-end: 200 con inserción).
  - AC2: un lote con unidad incorrecta se rechaza. **Verificado** el 29/10/2026 (422).
  - AC3: un token inválido se rechaza. **Verificado** el 29/10/2026 (401).
  - AC4: el simulador no escribe en sensores con `origen = 'real'`. Migración `20261029000002_sensors_origen.sql` aplicada (29/10/2026 hora local; en remoto con versión `20261030002236`, comprobado con consulta de solo lectura el 21/11/2026).

## 6. Restricciones

- Presupuesto limitado: objetivo de coste mensual ~0 € (tier gratuito, decisión D7).
- Desarrollo inicial con datos simulados (decisión D6).
- No depender del hardware para validar las primeras pantallas.
- Proteger los datos de cada usuario: autorización por usuario desde el diseño (decisión D8).
- Documentación del proyecto en español, conservando los términos técnicos convencionales en inglés (decisión D9).

## 7. Fuera de alcance inicial (decisión D1 y D5, aprobadas)

- Historial y gráficas de mediciones: incorporado en Fase 2 (política de retención en MEMORY, D54).
- Hardware y firmware ESP32: en implementación desde el 29/10/2026 (ingesta con token de dispositivo, R-15 pendiente de aprobación; ver `docs/plan.md` §2 y `docs/tasks.md` M7). Instalación en campo y calibración: pendientes.
- Compartir sensores entre usuarios (post-MVP; el modelo de datos ya lo soporta).
- Notificaciones externas (email, push) — solo alertas dentro de la aplicación.
- Aplicación móvil, suscripciones y automatización de riego.

Estos elementos no deben aparecer en tareas del MVP salvo aprobación explícita que modifique esta especificación.

## 8. Preguntas abiertas (restantes tras la clarificación)

- Retención de `measurements`: **decidida el 26/10/2026** (ver MEMORY, D54): crudas 30 días; resumen diario (`mediciones_diarias`) sin límite. *Frecuencia del simulador ya decidida: 1 lectura cada 5 minutos por sensor (D15).*
- ¿Qué cultivos incluye el catálogo inicial y con qué fuentes se justifican sus umbrales? (Se debe documentar que son referencias orientativas.)
- Semilla de localidades: **se mantiene la actual** (decisión del 27/10/2026; el proyecto toma General Pico como base). (Semilla inicial: provincias argentinas + localidades de referencia; ampliable por migraciones. Riesgo asumido: si la localidad de un usuario no está en la semilla, no podrá registrarse.)
- Perfiles de usuario: **se mantienen** los «otros perfiles» además de huerta doméstica y pequeño cultivo (decisión del 27/10/2026).

Resueltas en esta versión:
- ~~Modelo de alertas~~ → decisión D14: una alerta activa por (cultivo, tipo) que se mantiene hasta volver al rango (R-13).
