# Análisis de diseño (taste) — Borrador de cambios propuestos

> **Solo borrador. No se ha modificado ningún archivo.** Pendiente de tu aprobación antes de aplicar.
> Herramientas usadas: `lint.mjs` + `inspect.mjs --app` sobre `http://localhost:5175/app.html`.

## 1. FAILs del linter (13) — se dejan como están

Son legítimos para una app (no marketing): divisores de UI, sombras en overlays/menús, anillos de foco, color de serie de gráfico. Se documentan como aceptados:

| Regla | Ocurrencias | Justificación |
|-------|-------------|---------------|
| `hairline` (4) | `.cabecera`, `.separador-o` (×2), listado | Divisores de UI real; en app screens son normales. |
| `shadow` (8) | indicador de pestaña activa (×3), `.menu-usuario`, `.barra-inferior`, anillo de foco | Overlays/menús flotantes y foco accesible. |
| `purple` (1) | `--linea-violeta: #6d28d9` | Color de serie de gráfico, no acento principal. |

No se tocan. Si quieres eliminar alguno, se hace caso por caso.

## 2. WARNs accionables — cambios propuestos (a aplicar)

### 2.1 `height: 100vh` (estilos.css:881)
- **Estado actual:** ya hay fallback correcto (`100vh` + `100dvh`). Es progressive enhancement válido.
- **Cambio propuesto:** añadir comentario `/* taste-skill-ignore: h-screen (fallback intencional) */` o dejarlo. Sin cambio funcional.
- **Riesgo:** ninguno.

### 2.2 Em-dashes (24 en el proyecto)
- **Cambio propuesto:** revisar y reemplazar la mayoría por punto o coma; mantener 1–2 como máximo.
- **Acción:** requiere revisión manual del copy (App.tsx, Cuenta.tsx, etc.). Se propone hacerlo en un lote separado con revisión de copy.

### 2.3 `hero-void` (login, 33% del primer viewport vacío)
- **Causa:** el formulario de acceso ocupa la columna izquierda y deja un bloque vacío a la derecha.
- **Cambio propuesto:** reorganizar la pantalla de acceso para que el formulario ocupe el centro o llenar el espacio con el logo/ilustración de la marca. Alternativa: reducir el alto del contenedor.
- **Archivo:** `web/src/pages/Autenticacion.tsx` + `estilos.css`.

### 2.4 `unused-canvas` (login, contenido se detiene 553px antes del borde derecho)
- **Causa:** el layout de la pantalla de acceso no aprovecha el ancho disponible.
- **Cambio propuesto:** centrar el formulario o usar un layout de dos columnas (formulario + ilustración/branding) en escritorio.
- **Archivo:** `web/src/pages/Autenticacion.tsx` + `estilos.css`.

## 3. Análisis de vistas autenticadas (automatización de login)

El inspector solo vio la pantalla de acceso (app requiere auth). Para analizar el tablero, historial, cuenta, etc., se propone:

1. **Script de login automatizado:** usar Playwright para entrar con `E2E_EMAIL_A`/`E2E_PASSWORD_A`, navegar a cada vista y guardar capturas.
2. **Ejecutar `inspect.mjs`** sobre cada URL (el inspector acepta una URL; con login previo en el navegador no es trivial, así que se usaría el modo `--json` o capturas manuales).
3. **Alternativa más simple:** generar capturas con Playwright (desktop 1440, tablet 768, mobile 390) de cada vista y revisarlas manualmente (aunque este modelo no ve imágenes, el texto del inspector y las métricas sí ayudan).

**Vistas a analizar:** tablero, lista de cultivos, detalle de cultivo, alertas, sensores, cuenta, historial.

**Entregable:** informe por vista con FAIL/WARN y recomendaciones.

## 4. Cambios de marca → documentación en DESIGN.md

Cualquier edición de marca (colores, tipografías, logo) debe registrarse en `DESIGN.md`. Cambios propuestos que afectan a DESIGN.md:

- Si se cambia el color `--linea-violeta` (#6d28d9) por uno no-morado (ej. teal), actualizar:
  - `DESIGN.md` → sección `colors` (añadir `linea-teal` o renombrar).
  - `estilos.css` → `--linea-violeta` → `--linea-teal`.
  - `domain/tipos.ts` → `COLORES_SENSOR` ('violeta' → 'teal').
  - BD: migración para actualizar `color_linea = 'violeta'` → `'teal'` en sensores existentes.
  - `docs/brand.md` → actualizar paleta.
- Si se añade una nueva tipografía o se cambia el acento, actualizar `DESIGN.md` → `typography` / `colors`.

**No se modifica nada hasta que apruebes qué cambios aplicar.**

## 5. Resumen de acciones propuestas (pendientes de aprobación)

| # | Acción | Archivos afectados | Riesgo |
|---|--------|--------------------|--------|
| 1 | Añadir `taste-skill-ignore` a `100vh` (fallback) | `estilos.css` | Ninguno |
| 2 | Reducir em-dashes a 1–2 | varios | Bajo (copy) |
| 3 | Reorganizar pantalla de acceso (hero-void + unused-canvas) | `Autenticacion.tsx`, `estilos.css` | Medio |
| 4 | Automatizar login + capturas de vistas autenticadas | script nuevo | Bajo |
| 5 | (Opcional) Cambiar `--linea-violeta` por teal + migración | varios + BD | Medio |

**¿Apruebas alguna de estas acciones? Indica cuáles y las aplico.** Si ninguna, quedan como borrador documentado.