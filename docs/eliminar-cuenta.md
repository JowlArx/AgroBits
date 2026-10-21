# Especificación: eliminar mi cuenta

Estado: **borrador pendiente de aprobación** (no hay cambios en la base de datos).

## Objetivo

Que la persona usuaria pueda borrar su cuenta y todos sus datos asociados, de forma irreversible y con confirmación explícita.

## Qué se borra

| Dato | Dónde vive | Tratamiento |
|---|---|---|
| Usuario y credenciales | `auth.users` (Supabase Auth) | Borrado con la función de servidor. |
| Perfil (teléfono, localidad) | `perfiles` | Borrado en cascada desde `auth.users`. **Pendiente de verificar en la migración.** |
| Cultivos y sus umbrales | `crops` | Borrado en cascada por `user_id`. |
| Sensores y enlaces con cultivos | `sensors`, tabla de enlaces N–N | Borrado en cascada. |
| Mediciones | `measurements` | Borrado en cascada desde los sensores. |
| Alertas | `alerts` | Borrado en cascada desde los cultivos. |

El catálogo de localidades no pertenece a la cuenta y **no se toca**.

## Flujo de usuario

1. En «Mi cuenta», en el bloque «Cerrar sesión» (zona de acciones), un enlace secundario «Eliminar mi cuenta».
2. Al pulsarlo se muestra la lista de lo que se borrará (cultivos, sensores, mediciones) con sus cifras.
3. Confirmación en dos pasos: escribir el email de la cuenta y pulsar «Eliminar definitivamente». Sin escribir el email el botón no se activa.
4. Al confirmar, se borra la cuenta, se cierra la sesión y se vuelve a la pantalla de acceso con un aviso.

## Diseño técnico propuesto

- **Función de servidor** (`SECURITY DEFINER`, o una Edge Function con la clave de servicio) que borra el usuario de Auth. Nunca desde el cliente: el cliente no tiene permiso para borrar `auth.users`.
- La función solo borra el `auth.uid()` que llama. No recibe ningún id como parámetro, para que nadie pueda borrar la cuenta de otra persona.
- Orden: confirmación en el servidor (el email escrito debe coincidir con el de la sesión), borrado, respuesta, cierre de sesión en el cliente.
- Si el borrado falla a mitad, la transacción se revierte: no quedan datos a medias.

## Requisitos de aceptación

- AC1: sin escribir el email exacto, el botón no se activa y el servidor también lo rechaza.
- AC2: tras borrar, no queda ninguna fila de la cuenta en `perfiles`, `crops`, `sensors`, `measurements`, `alerts` ni en `auth.users`.
- AC3: la cuenta de otra persona no se ve afectada (suite de aislamiento existente).
- AC4: tras borrar, el email puede volver a registrarse.
- AC5: la acción queda registrada en un log de auditoría sin datos personales.

## Decisiones aprobadas (21/10/2026, JowlArx)

1. **Función SQL `SECURITY DEFINER`.** `solicitar_eliminacion_cuenta(confirmacion_email)` actúa solo sobre el usuario de la sesión y exige que el email escrito coincida con el de la sesión. No recibe ningún id.
2. **Auditoría sin datos personales.** La tabla `auditoria_eliminaciones` guarda el hash SHA-256 del email, la fecha de la solicitud y la de ejecución. Ni el id ni el email.
3. **Período de gracia de 7 días.** La solicitud se programa 7 días después. Durante ese plazo la cuenta sigue funcionando, con un aviso en «Mi cuenta» y un botón para cancelar el borrado. Un job diario (`purgar_cuentas_vencidas`, con `pg_cron`) borra las cuentas vencidas.
4. **Texto de confirmación aprobado:** «Vas a eliminar tu cuenta y todos sus datos. Esta acción no se puede deshacer. Para confirmar, escribe tu email.»

**Advertencia sobre la decisión 3:** el derecho de supresión de la Ley 25.326 pide atender la solicitud sin demora. Conservar 7 días los datos de una cuenta pendiente de borrado debería justificarse; el periodo de gracia se ha implementado por decisión del titular del proyecto, no por recomendación técnica.

## Estado de la implementación

- Migración: `supabase/migrations/20261021000001_eliminar_cuenta.sql` (**escrita, no aplicada**).
- Suite SQL: `supabase/tests/20261021_d46_eliminar_cuenta.sql` (**escrita, no ejecutada**: la herramienta de Supabase no está disponible en la sesión actual).
- Interfaz: implementada en `src/pages/Cuenta.tsx`, con la store `src/data/storePerfil.ts` y el contrato del proveedor de datos ampliado. Cubierta por pruebas unitarias (4 casos nuevos).

Ningún cambio de base de datos se aplica hasta aprobar la ejecución de la migración y de la suite.

## Verificación prevista

- Suite SQL versionada en `supabase/tests/`, ejecutada en transacción con `ROLLBACK`, con identidades simuladas.
- E2E sobre la cuenta de prueba `e2e-a`: crear datos, pedir el borrado, comprobar el aviso de gracia, cancelar y confirmar que no queda solicitud. La cuenta de prueba se recrea al final.
- Pruebas unitarias de la validación del email de confirmación y del ciclo de gracia/cancelación.

