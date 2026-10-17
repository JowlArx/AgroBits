# AgroBits — Memoria del proyecto

## Estado del proyecto

AgroBits se encuentra en la fase de definición de requisitos (Spec-Driven Development).

La especificación del MVP (`docs/spec.md` v2) está redactada y **pendiente de aprobación humana**. Todavía no se ha aprobado la arquitectura ni se ha iniciado la implementación.

## Objetivo

Construir una plataforma de monitoreo agrícola que conecte sensores IoT con una aplicación web y ofrezca información y alertas adaptadas a los cultivos.

## Contexto conocido

- El proyecto se desarrolla inicialmente como pasatiempo.
- El presupuesto inicial es limitado (objetivo ~0 €/mes en infraestructura).
- Se valida el software con datos simulados antes de invertir en hardware.
- El desarrollo utiliza OpenCode y metodología SDD.

## Decisiones aprobadas

Anteriores:

- Iniciar el proyecto en un repositorio independiente.
- Utilizar Git para el control de versiones.
- Preparar la documentación antes de implementar funcionalidades.
- Exigir validación humana y pruebas verificables.

Clarificación del MVP (16/10/2026):

- **D1 — Alcance del MVP:** registro/inicio de sesión, gestión de cultivos, registro de sensores como entidad, mediciones simuladas, umbrales por cultivo y alertas. Historial de mediciones y hardware ESP32 quedan fuera del alcance.
- **D2 — Tipos de medición:** los 4 tipos — humedad de suelo, temperatura, humedad ambiental y luz — cada uno con unidad, rango y umbrales propios.
- **D3 — Umbrales agronómicos:** catálogo editable (valores por defecto por tipo de cultivo, sobreescribibles por el usuario, presentados como referencia orientativa).
- **D4 — Modelo de alertas:** binario (alerta cuando la medición sale del rango [mín, máx] del cultivo).
- **D5 — Sensores compartidos:** fuera del MVP, pero el modelo de asociación sensor↔cultivo es N–N desde el inicio.
- **D6 — Fase de simulación:** enfoque híbrido por fases — Fase 1: interfaz con datos falsos para validar pantallas; Fase 2: backend + base de datos + auth real + generador de datos simulados (futuro reemplazo por el ESP32).
- **D7 — Infraestructura:** plataforma gestionada (managed) en tier gratuito; objetivo de coste ~0 €/mes; exportación de datos como criterio de selección; cualquier servicio facturable requiere aprobación previa.
- **D8 — Autenticación y autorización:** auth provisional en Fase 1 (marcada como temporal, no válida como criterio de aceptación), auth real en Fase 2 de la plataforma managed, con autorización por filas (`user_id` + RLS) desde el diseño.
- **D9 — Idioma:** todos los documentos del proyecto en español, conservando en inglés los términos técnicos convencionales; corregido el texto truncado de AGENTS.md §2.
- **D10 — Versionado:** commit inicial de la documentación en `master` como punto de partida.
- **D11 — Equipo:** agentes especializados (planner / implementador / verificador) con documentos de handoff entre ellos y aprobación humana en los hitos.

## Decisiones pendientes

- Framework y arquitectura del frontend (etapa de planificación).
- Base de datos y servicios concretos dentro de la plataforma managed elegida.
- Protocolo de comunicación del ESP32 (post-MVP).
- Frecuencia de muestreo y política de retención del historial (post-MVP, pero condiciona el modelo de datos).
- Contenido y fuentes del catálogo inicial de cultivos.
- Formato concreto de handoff entre agentes especializados (D11).
- Modelado de alertas: una por lectura fuera de rango vs. una activa por incidencia (ver preguntas abiertas de spec.md).

## Próximo objetivo

Aprobar `docs/spec.md` v2 y, a partir de ella, elaborar `docs/plan.md` (arquitectura, modelo de datos, seguridad, pruebas y secuencia) antes de generar código.

## Reglas de actualización

Registrar únicamente hechos comprobados y decisiones aceptadas. Identificar expresamente las hipótesis y actualizar este archivo cuando cambie el estado del proyecto.
