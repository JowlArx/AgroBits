# AgroBits

Monitoreo agrícola con sensores: conecta un sensor a cada cultivo y AgroBits
vigila la humedad del suelo, la temperatura, la humedad ambiental y la luz.
Tú pones los límites de cada cultivo; en cuanto una lectura se sale de rango
aparece la alerta, y se cierra sola cuando la lectura vuelve.

- **Web pública (landing):** `web/index.html` → `/`
- **Aplicación (panel):** `web/app.html` → `/app.html`

## Stack

- **Front:** React 19 + TypeScript + Vite, tokens de diseño propios
  (`web/src/tokens.css`), Recharts para los gráficos y una SPA sin
  dependencias de interfaz.
- **Datos:** Supabase (PostgreSQL + Auth + RLS). Las lecturas se **simulan**
  mientras no haya hardware; el ESP32 escribirá contra la misma API en una
  fase posterior.
- **Pruebas:** Vitest (unitarias), Playwright (E2E) y suites SQL versionadas
  en `supabase/tests/`.

## Puesta en marcha

```bash
cd web
npm install
cp .env.example .env.local   # credenciales de Supabase (no se versionan)
npm run dev                   # http://localhost:5173
```

## Verificación

```bash
cd web
npm run lint        # ESLint
npm run test        # Vitest (unitarias)
npm run build       # comprobación de tipos + build
npm run test:e2e    # Playwright (requiere el dev server en marcha)
```

Las suites SQL se ejecutan con el cliente de Supabase contra una base de
datos de pruebas; usan identidades simuladas y `ROLLBACK`.

## Estructura

| Ruta | Contenido |
|---|---|
| `web/src/` | Aplicación React: páginas, componentes, stores y tokens. |
| `web/index.html` | Landing (estática, con sus propios tokens). |
| `supabase/` | Migraciones y suites SQL de verificación. |
| `docs/` | Especificación, plan, tareas, constitución e informes de validación. |
| `MEMORY.md` | Estado del proyecto y decisiones aprobadas (D1…). |
| `AGENTS.md` | Reglas de trabajo para los agentes. |
| `DESIGN.md` | Sistema visual: tokens, componentes y normas de uso. |

## Licencia

El proyecto usa **dos licencias** según el tipo de archivo (mapa completo en
`REUSE.toml`):

- **Código** (`web/`, `supabase/`): **AGPL-3.0-or-later** — texto en
  [`LICENSE`](LICENSE). Puedes usarlo y modificarlo; si publicas una versión
  modificada (incluso sirviéndola por web) debes publicar ese código con la
  misma licencia.
- **Documentación y diseño** (`docs/`, `*.md`): **CC BY-NC-ND 4.0** — texto en
  [`LICENSES/CC-BY-NC-ND-4.0.txt`](LICENSES/CC-BY-NC-ND-4.0.txt). Se puede
  leer y citar indicando la autoría; no se puede copiar para uso comercial ni
  adaptar.

**Código fuente:** <https://github.com/JowlArx/AgroBits> (también está enlazado
en el pie de la web y en «Mi cuenta», como exige la AGPL §13).

**Marca:** «AgroBits», el logotipo y la identidad visual son de la autoría de
Joel Arce. La licencia del código **no** concede derechos sobre la marca: no
puedes usar el nombre ni el logotipo en obras derivadas o servicios que puedan
confundirse con el original sin pedir permiso. Ver [`NOTICE`](NOTICE).

## Atribuciones

La estructura del layout del panel sigue la del kit comunitario de Figma
«Snow Dashboard UI Kit»; las tipografías (Fraunces, Atkinson Hyperlegible) son
SIL OFL. El detalle está en [`NOTICE`](NOTICE).

## Estado

Versión en pruebas: las mediciones se generan de forma simulada mientras se
integra el hardware de sensores.
