# Graph Report - AgroBits  (2026-10-26)

## Corpus Check
- 122 files · ~106,151 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .toml 1, .xml 1)

## Summary
- 1005 nodes · 2142 edges · 94 communities (38 shown, 56 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 97 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Alerts Page UI
- Data Store and Sessions
- Project Memory and Decisions
- Supabase Client and Auth Provider
- Session Store and Onboarding
- Frontend Tooling Dependencies
- Test Fixtures and Mocks
- Data Model and E2E Infra
- E2E Acceptance Tests
- Brand Guidelines
- App Entry and Product Overview
- Serena Project Config
- Simulated Measurement Generator
- Data Provider Interface
- Plan Decisions Log
- Supabase Data Adapter
- Supabase Adapter Tests
- Spec Requirements and Acceptance
- TypeScript Configuration
- MCP and OpenCode Config
- Supabase Row Mappers
- Measurement History Requirements
- Account Deletion Design
- Phase 1 Task Decisions
- Google Sign-In Tasks
- Measurement Data Access
- Dropdown Selector Component
- Sensor Management Adapter
- Auth Redirect Flow
- Design System Tokens
- Measurement History Decisions
- Leaf Signal Icon Assets
- Logo SVG Assets
- Alert Evaluation Logic
- Dark Logo Assets
- Agent Guidelines
- Agent Roles
- Measurement Jobs Plan
- Product Scope
- Initial Project Rules
- Permission Guardrails
- Elevation and Motion Tokens
- Documentation License
- Paper Background Color
- Dropdown Component Spec
- Layout Spec
- Google OAuth Config
- OAuth Manual Checks
- Google Cloud Credentials
- OAuth Security Notes
- Design Linter Failures
- Design Action Summary
- Authenticated Views Analysis
- Design Warnings
- Measurement History Spec
- Measurement Out of Scope
- Measurement History Objective
- Measurement History Context
- Measurement Objective
- Measurement Architecture
- Measurement Client Plan
- Measurement Dependencies
- Measurement Test Plan
- Measurement Risks
- Measurement Security
- M4 Validation Report
- M4 Limitations
- M4 Methodology
- M4 Pending Tests
- M4 Approval Request
- M5 Validation Approval
- M5 Limitations
- M5 Methodology
- M5 Pending Tests
- Plan Architecture
- Test Strategy
- Plan Risks
- Security Strategy
- MVP Scope
- Out of Scope
- Open Questions
- Constraints
- Measurement Types
- Accessibility Target
- Brand Identity
- License Terms
- Dark Logo PNG

## God Nodes (most connected - your core abstractions)
1. `AgroBits project memory` - 55 edges
2. `Resultado` - 43 edges
3. `App()` - 36 edges
4. `exigirProveedor()` - 35 edges
5. `DatosFalsos` - 33 edges
6. `ProveedorDatosSupabase` - 30 edges
7. `ProveedorDatos` - 28 edges
8. `Fase 2 — Backend y datos reales` - 25 edges
9. `Sensor` - 24 edges
10. `TipoMedicion` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Cerebro de marca AgroBits` --semantically_similar_to--> `Misión`  [INFERRED] [semantically similar]
  docs/brand.md → docs/constitution.md
- `cargar()` --calls--> `exigirProveedor()`  [EXTRACTED]
  web/src/pages/Historial.tsx → web/src/data/datos/proveedorDatos.ts
- `DetalleCultivo()` --indirect_call--> `suscribirCultivos()`  [INFERRED]
  web/src/pages/DetalleCultivo.tsx → web/src/data/storeCultivos.ts
- `DetalleCultivo()` --indirect_call--> `obtenerCultivos()`  [INFERRED]
  web/src/pages/DetalleCultivo.tsx → web/src/data/storeCultivos.ts
- `ListaCultivos()` --indirect_call--> `obtenerEstadoCarga()`  [INFERRED]
  web/src/pages/ListaCultivos.tsx → web/src/data/storeCultivos.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agent roles (Planner, Implementador, Verificador)** — agents_agent_role_planner, agents_agent_role_implementador, agents_agent_role_verificador [EXTRACTED 1.00]
- **Milestones M0-M5** — memory_milestone_m0, memory_milestone_m1, memory_milestone_m2, memory_milestone_m3, memory_milestone_m4, memory_milestone_m5 [EXTRACTED 1.00]
- **Design color system (botánico, alarma, papel)** — design_color_botanico, design_color_alarma, design_color_papel [EXTRACTED 1.00]
- **Tareas de Fase 1** — docs_tasks_t10, docs_tasks_t11, docs_tasks_t12, docs_tasks_t13, docs_tasks_t14, docs_tasks_t15, docs_tasks_t16, docs_tasks_t17, docs_tasks_t18 [EXTRACTED 1.00]
- **Tareas de Fase 2** — docs_tasks_t20, docs_tasks_t21, docs_tasks_t22, docs_tasks_t23, docs_tasks_t24, docs_tasks_t25, docs_tasks_t26 [EXTRACTED 1.00]
- **Requisitos R-01 a R-14** — docs_spec_r_01, docs_spec_r_02, docs_spec_r_03, docs_spec_r_04, docs_spec_r_05, docs_spec_r_06, docs_spec_r_07, docs_spec_r_08, docs_spec_r_09, docs_spec_r_10, docs_spec_r_11, docs_spec_r_12, docs_spec_r_13, docs_spec_r_14 [EXTRACTED 1.00]
- **Measured variables of AgroBits** — web_index_humedad_suelo, web_index_temperatura, web_index_humedad_ambiental, web_index_luminosidad [EXTRACTED 1.00]
- **Crop catalog (tomate, lechuga, albahaca, pimiento)** — web_index_cultivo_tomate, web_index_cultivo_lechuga, web_index_cultivo_albahaca, web_index_cultivo_pimiento [EXTRACTED 1.00]
- **Alert lifecycle (out-of-range -> alert -> auto-resolve)** — web_index_lectura, web_index_umbral, web_index_alerta [EXTRACTED 1.00]
- **Icon Visual Composition (Leaves + WiFi Signal + Green Palette)** — web_public_icono_hoja_senial_left_leaf, web_public_icono_hoja_senial_right_leaf, web_public_icono_hoja_senial_wifi_signal, web_public_icono_hoja_senial_green_palette [EXTRACTED 1.00]
- **AgroBits brand identity elements** — web_public_logo_dark_icon, web_public_logo_dark_wordmark, web_public_logo_dark_color, web_public_logo_dark_font [EXTRACTED 1.00]
- **AgroBits Brand Identity** — web_public_logo_logo, web_public_logo_icon, web_public_logo_wordmark, web_public_logo_color_primary, web_public_logo_color_accent, web_public_logo_typography [EXTRACTED 1.00]

## Communities (94 total, 56 thin omitted)

### Community 0 - "Alerts Page UI"
Cohesion: 0.05
Nodes (94): react, recharts, recharts@^3.10.1, App(), MenuCuenta(), resumenTopbar(), tituloVista(), Vista (+86 more)

### Community 1 - "Data Store and Sessions"
Cohesion: 0.05
Nodes (78): vitest, cargarDatosSesion(), vaciarDatosSesion(), exigirProveedor(), INTERVALO_LECTURAS_MS, cargarMediciones(), contadores, generarLectura() (+70 more)

### Community 2 - "Project Memory and Decisions"
Cohesion: 0.04
Nodes (9): AgroBits project memory, Milestone M0: spec v2 approved 16/10/2026, Milestone M1: plan approved 16/10/2026, Milestone M2: tasks approved 17/10/2026, Milestone M3: phase 1 verified 17/10/2026, Milestone M4: phase 2 validated 17/10/2026, Milestone M5: enriched registration 19/10/2026, Phase 1: UI with fake data (+1 more)

### Community 3 - "Supabase Client and Auth Provider"
Cohesion: 0.08
Nodes (19): @supabase/supabase-js, clavePublica, clienteSupabase, url, configurarProveedorDatos(), Resultado, PerfilRegistro, ProveedorAuth (+11 more)

### Community 4 - "Session Store and Onboarding"
Cohesion: 0.08
Nodes (42): crearCultivoRapido(), guardar(), irANuevoCultivo(), rellenarNombre(), SolicitudEliminacion, redirigir(), LONGITUD_MINIMA_CLAVE, cancelarEliminacion() (+34 more)

### Community 5 - "Frontend Tooling Dependencies"
Cohesion: 0.05
Nodes (49): eslint, @eslint/js, eslint-plugin-react-hooks, jsdom, react-dom, @testing-library/dom, @testing-library/react, @types/node (+41 more)

### Community 6 - "Test Fixtures and Mocks"
Cohesion: 0.10
Nodes (10): AgregadoDiario, ErrorCampo, Localidad, NuevoCultivo, Perfil, Alerta, DatosFalsos, exito() (+2 more)

### Community 7 - "Data Model and E2E Infra"
Cohesion: 0.06
Nodes (15): Infraestructura de E2E, alerts, crop_thresholds, crop_type_catalog, crops, measurements, Modelo de datos, sensor_crop (+7 more)

### Community 8 - "E2E Acceptance Tests"
Cohesion: 0.20
Nodes (14): @playwright/test, abrirDetalle(), cerrarSesion(), crearCultivo(), crearSensor(), cuentaA, cuentaB, cultivoEn() (+6 more)

### Community 9 - "Brand Guidelines"
Cohesion: 0.07
Nodes (23): Aplicaciones, Arquetipo y personalidad, Audiencia, Cerebro de marca AgroBits, Do's and Don'ts, Glosario, Gobernanza, Identidad (+15 more)

### Community 10 - "App Entry and Product Overview"
Cohesion: 0.10
Nodes (24): React entry module /src/main.tsx, Noscript fallback to landing page, AgroBits SPA entry (app.html), AGPL-3.0 license, AgroBits agricultural monitoring (product), Auto-resolving alert, Crop catalog (tomate, lechuga, albahaca, pimiento), User account (email, password, phone, location) (+16 more)

### Community 11 - "Serena Project Config"
Cohesion: 0.08
Nodes (25): activation_command, activation_command_timeout, added_modes, agent_interface, default_modes, encoding, excluded_apis, excluded_tools (+17 more)

### Community 12 - "Simulated Measurement Generator"
Cohesion: 0.15
Nodes (16): EntradaCatalogo, crearGenerador(), DECIMALES, Generador, generarSerie(), mulberry32(), Alerta, COLORES_SENSOR (+8 more)

### Community 13 - "Data Provider Interface"
Cohesion: 0.10
Nodes (3): ProveedorDatos, Cultivo, Props

### Community 14 - "Plan Decisions Log"
Cohesion: 0.10
Nodes (7): M0, M1, M2, M3, M4, M5, Secuencia de implementación

### Community 15 - "Supabase Data Adapter"
Cohesion: 0.14
Nodes (3): aAgregado(), ProveedorDatosSupabase, SERVIDOR()

### Community 16 - "Supabase Adapter Tests"
Cohesion: 0.11
Nodes (6): CadenaFalsa, Captura, clienteFalso(), Responder, Respuesta, umbrales

### Community 17 - "Spec Requirements and Acceptance"
Cohesion: 0.13
Nodes (18): R-H2, Checklist de criterios de aceptación, R-02, R-03, R-04, R-05, R-07, R-08 (+10 more)

### Community 18 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 19 - "MCP and OpenCode Config"
Cohesion: 0.11
Nodes (17): command, type, headers, type, url, CONTEXT7_API_KEY, mcp, chrome-devtools (+9 more)

### Community 20 - "Supabase Row Mappers"
Cohesion: 0.16
Nodes (14): aAlerta(), aCultivo(), aISO(), aUmbrales(), FilaAgregado, FilaAlerta, FilaCultivo, FilaMedicion (+6 more)

### Community 21 - "Measurement History Requirements"
Cohesion: 0.14
Nodes (13): Requisitos R-H, R-H1, R-H3, R-H4, R-H5, T-H1, T-H2, T-H3 (+5 more)

### Community 22 - "Account Deletion Design"
Cohesion: 0.17
Nodes (9): auditoria_eliminaciones, Diseño técnico propuesto, Flujo de usuario, Estado de implementación, Objetivo, purgar_cuentas_vencidas, Requisitos de aceptación, solicitar_eliminacion_cuenta (+1 more)

### Community 23 - "Phase 1 Task Decisions"
Cohesion: 0.17
Nodes (9): Fase 1 — Interfaz con datos simulados, T-10, T-12, T-13, T-14, T-15, T-16, T-17 (+1 more)

### Community 24 - "Google Sign-In Tasks"
Cohesion: 0.20
Nodes (9): Migración trigger de alta, Supabase — proveedor Google, Artefactos de T-27, Checklist de criterios de aceptación, R-01, M5 — Registro enriquecido, M6 — Acceso con Google (OAuth), T-27 (+1 more)

### Community 25 - "Measurement Data Access"
Cohesion: 0.22
Nodes (3): FilaLectura, aMedicion(), Medicion

### Community 26 - "Dropdown Selector Component"
Cohesion: 0.31
Nodes (8): OpcionSelector, Props, SelectorDesplegable(), alTecladoDeLaLista(), alTecladoDelBoton(), cerrar(), elegir(), mover()

### Community 27 - "Sensor Management Adapter"
Cohesion: 0.38
Nodes (4): aSensor(), Sensor, ColorSensor, esColorSensor()

### Community 28 - "Auth Redirect Flow"
Cohesion: 0.24
Nodes (4): configurarRedireccion(), Redireccion, restablecerRedireccion(), authFalsoActual()

### Community 29 - "Design System Tokens"
Cohesion: 0.25
Nodes (5): Color: ámbar de alarma (solo alertas activas), Color: verde botánico (marca), Design tokens (web/src/tokens.css) fuente de verdad, Typography: Atkinson Hyperlegible (sans), Typography: Fraunces (serif)

### Community 31 - "Leaf Signal Icon Assets"
Cohesion: 0.33
Nodes (7): Icono Hoja Señal (Leaf + WiFi Signal Icon), Agricultural Sensor Connectivity Icon Purpose, Claude (Anthropic) Provenance (C2PA), Green Palette (#74c894 stroke, #cdeedb fill), Left Leaf Shape, Right Leaf Shape, WiFi Signal Arcs

### Community 32 - "Logo SVG Assets"
Cohesion: 0.33
Nodes (7): Accent Light Green (#cdeedb), Primary Dark Green (#1e5b3d), Leaf with WiFi Signal Icon, AgroBits Logo (SVG), Sensor + Plant Connectivity Concept, Fraunces Serif Typography, AgroBits Wordmark

### Community 33 - "Alert Evaluation Logic"
Cohesion: 0.48
Nodes (5): AccionAlerta, estaFueraDeRango(), evaluarAlerta(), umbral, Umbral

### Community 34 - "Dark Logo Assets"
Cohesion: 0.40
Nodes (6): Brand green color (#74c894), Sensor + plant concept (IoT agriculture), Fraunces serif typography, Leaf + wifi signal icon, AgroBits dark logo, AgroBits wordmark

### Community 35 - "Agent Guidelines"
Cohesion: 0.40
Nodes (5): AgroBits, SDD stages (constitution, spec, clarification, plan, tasks, implementation, validation), Spec-Driven Development (SDD), AgroBits README, Tech stack (React 19 + Vite + TS, Supabase, Recharts)

### Community 36 - "Agent Roles"
Cohesion: 0.50
Nodes (3): Implementador (agent role), Planner (agent role), Verificador (agent role)

### Community 37 - "Measurement Jobs Plan"
Cohesion: 0.67
Nodes (3): Jobs pg_cron, mediciones_diarias, Modelo de datos

### Community 38 - "Product Scope"
Cohesion: 0.67
Nodes (3): AgroBits product, MVP capabilities (accounts, crops, sensors, measurements, thresholds, alerts), User: home gardener / small crop grower

## Knowledge Gaps
- **156 isolated node(s):** `SDD stages (constitution, spec, clarification, plan, tasks, implementation, validation)`, `Planner (agent role)`, `Implementador (agent role)`, `Verificador (agent role)`, `Permission guardrails (always allowed / ask before / never allowed)` (+151 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 470 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Data Store and Sessions` to `Alert Evaluation Logic`, `Supabase Client and Auth Provider`, `Session Store and Onboarding`, `Frontend Tooling Dependencies`, `Simulated Measurement Generator`, `Supabase Adapter Tests`, `Auth Redirect Flow`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `App()` (e.g. with `obtenerAlertas()` and `suscribirAlertas()`) actually correct?**
  _`App()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `SDD stages (constitution, spec, clarification, plan, tasks, implementation, validation)`, `Planner (agent role)`, `Implementador (agent role)` to the rest of the system?**
  _156 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Alerts Page UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05110565110565111 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Alerts Page UI` to `Data Store and Sessions`, `Supabase Client and Auth Provider`, `Session Store and Onboarding`, `Frontend Tooling Dependencies`, `Dropdown Selector Component`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `Data Store and Sessions` be split into smaller, more focused modules?**
  _Cohesion score 0.05278643129110419 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `E2E Acceptance Tests` to `Frontend Tooling Dependencies`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._