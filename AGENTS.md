# AgroBits — Agent Instructions

## 1. Propósito

AgroBits es un proyecto de monitoreo agrícola que busca conectar sensores físicos con una aplicación web capaz de presentar mediciones y generar alertas contextualizadas para cada cultivo.

El proyecto se desarrollará mediante Spec-Driven Development (SDD), con supervisión humana y agentes de IA.

## 2. Estado actual

El proyecto se está iniciando desde cero.

Todavía no hay una arquitectura técnica aprobada ni una implementación autorizada.

## 3. Stack y estructura

- Sistema de desarrollo: Windows y gitBash.
- Herramienta de agentes: OpenCode.
- Control de versiones: Git.
- Tecnologías de aplicación, base de datos y firmware: pendientes de evaluación y aprobación.
- Documentación del proyecto: carpeta `docs/`.

No asumir tecnologías o versiones que no hayan sido aprobadas explícitamente.

## 4. Forma de trabajar

- Seguir las etapas de SDD: constitución, especificación, clarificación, planificación, tareas, implementación y validación.
- No implementar funcionalidades antes de aprobar sus requisitos y criterios de aceptación.
- Analizar el contexto existente antes de proponer cambios.
- Dividir las tareas en unidades pequeñas y verificables.
- Explicar las decisiones técnicas y sus consecuencias.
- No afirmar que una prueba pasó si no se ejecutó y verificó.

### Roles de los agentes (decisión D11)

El trabajo se distribuye entre agentes especializados, con handoff documentado entre ellos y aprobación humana en los hitos:

- **Planner:** analiza, propone arquitectura, modelo de datos, estrategia de seguridad y pruebas, y redacta `docs/plan.md`. No escribe código de implementación.
- **Implementador:** ejecuta tareas aprobadas de `docs/tasks.md`, siguiendo los criterios de aceptación. No amplía el alcance de la especificación.
- **Verificador:** comprueba los criterios de aceptación y las pruebas de las tareas, e informa de limitaciones y pruebas pendientes. No declara completada una tarea sin ejecutar sus verificaciones.

Toda transición entre roles se documenta (qué se entrega, qué se verificó, qué queda pendiente). Las decisiones fuera del alcance de un rol se elevan al humano.

## 5. Guardarraíles de permisos

### Siempre permitido
- Leer y analizar archivos del repositorio.
- Revisar documentación.
- Proponer alternativas y planes.
- Identificar riesgos y ambigüedades.
- Consultar el estado de Git.

### Preguntar antes de actuar
- Instalar o actualizar dependencias.
- Crear archivos fuera de la estructura aprobada.
- Modificar la arquitectura o el esquema de datos.
- Ejecutar migraciones o comandos destructivos.
- Cambiar reglas de seguridad, configuración de nube o servicios facturables.
- Añadir integraciones externas o herramientas MCP.
- Modificar archivos existentes de forma masiva.

### Nunca permitido
- Publicar credenciales, contraseñas, tokens o claves privadas.
- Exponer datos personales o secretos en logs o documentación.
- Abrir indiscriminadamente el acceso de lectura o escritura a la base de datos.
- Borrar datos remotos o ejecutar acciones destructivas sin autorización explícita.
- Desplegar en producción sin aprobación humana.
- Declarar completada una tarea sin verificar sus criterios de aceptación.

## 6. Seguridad

- Aplicar el principio de mínimo privilegio.
- No incluir secretos en el repositorio.
- Diseñar la autorización antes de conectar datos de usuarios.
- Mantener los entornos de prueba separados de producción.
- Solicitar aprobación antes de modificar permisos o datos persistentes.

## 7. Documentación y memoria

- Registrar decisiones aprobadas en `docs/constitution.md` o en la documentación correspondiente.
- Mantener `MEMORY.md` breve, factual y actualizado.
- No registrar como hechos las hipótesis pendientes.
- Mantener `docs/spec.md`, `docs/plan.md` y `docs/tasks.md` coherentes entre sí.

## 8. Verificación

Antes de dar una tarea por terminada:

1. Comparar el resultado con los requisitos y criterios de aceptación.
2. Ejecutar las verificaciones pertinentes, si existen.
3. Informar qué se modificó y qué se comprobó.
4. Declarar explícitamente las pruebas pendientes y limitaciones.
5. No continuar con la siguiente etapa si existe un bloqueo crítico.

## 9. Idioma y comunicación

- Responder en español.
- Redactar la documentación del proyecto en español (decisión D9).
- Conservar en inglés los nombres técnicos convencionales.
- Explicar las decisiones con claridad y evitar complejidad innecesaria.
- Solicitar aclaraciones cuando falte información relevante.

## 10. Regla de inicio

Durante la fase de preparación, trabajar únicamente sobre el entorno y la documentación inicial. No generar código de la aplicación, firmware ni integraciones funcionales hasta que se aprueben las especificaciones y el plan correspondiente.