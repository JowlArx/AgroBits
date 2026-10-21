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

## Verificación prevista

- Suite SQL versionada en `supabase/tests/`, ejecutada en transacción con `ROLLBACK`, con identidades simuladas.
- E2E sobre la cuenta de prueba `e2e-a`: crear datos, borrar la cuenta, comprobar residuo 0. La cuenta de prueba se recrea al final.
- Pruebas unitarias de la validación del email de confirmación.

## Decisiones que requieren aprobación

1. ¿Función `SECURITY DEFINER` en SQL o Edge Function?
2. ¿Se conserva un registro de auditoría (fecha y hash del email, sin datos personales)?
3. ¿Período de gracia (p. ej. 7 días para cancelar) o borrado inmediato?
4. Texto legal de la confirmación (Ley 25.326: derecho de supresión).

Ningún cambio de base de datos se aplica hasta aprobar esta especificación y su migración.
