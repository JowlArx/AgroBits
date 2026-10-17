# AgroBits — Plan de implementación

Estado: pendiente de aprobación.

No iniciar la implementación hasta que:
- La especificación (`docs/spec.md`) haya sido aprobada.
- Las ambigüedades críticas estén resueltas.
- La arquitectura y el modelo de datos hayan sido revisados.
- Existan criterios de aceptación verificables.

Decisiones de contexto que el plan debe respetar (ya aprobadas, ver `MEMORY.md`):
- Alcance y tipos de medición del MVP (D1, D2).
- Umbrales tipo catálogo editable y alertas binarias (D3, D4).
- Modelo sensor↔cultivo N–N, sin compartir en el MVP (D5).
- Dos fases: interfaz simulada, luego backend + BD + auth (D6).
- Plataforma managed en tier gratuito, coste ~0 €/mes (D7).
- Auth real de la plataforma con autorización por filas (D8).

El agente planner deberá proponer:
1. Arquitectura.
2. Modelo de datos.
3. Estrategia de seguridad.
4. Estrategia de pruebas.
5. Secuencia de implementación (Fase 1 y Fase 2, con hitos de aprobación humana).
6. Riesgos y alternativas.

Formato de entrega: documento aprobado por el humano antes de pasar a `docs/tasks.md`.
