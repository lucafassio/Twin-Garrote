# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 79 files · ~50,194 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 576 nodes · 1193 edges · 24 communities (19 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b8f1b43`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GLOSSARY.md (Parpadeo)
- voz/index.ts
- reductor.ts
- package.json
- completado.ts
- app/page.tsx
- eventos.ts
- Research: path voz
- memoria.test.ts
- llm/index.ts
- memoria.ts
- opciones.ts
- compilerOptions
- CLAUDE.md
- opciones.test.ts
- crearDisparadorMemoria
- llm/tipos.ts
- urgencia/route.ts
- correr.ts
- eslint.config.mjs
- ref_node_assert
- ref_node_fs

## God Nodes (most connected - your core abstractions)
1. `GLOSSARY.md (Parpadeo)` - 26 edges
2. `iniciarVoz()` - 23 edges
3. `reducir()` - 21 edges
4. `Research: path llm` - 18 edges
5. `Research: onboarding, aprendizaje y memoria` - 18 edges
6. `LineaHistorial` - 17 edges
7. `compilerOptions` - 17 edges
8. `Research: path voz` - 17 edges
9. `react` - 14 edges
10. `PedidoOpciones` - 13 edges

## Surprising Connections (you probably didn't know these)
- `renderHuella()` --implements--> `Huella`  [INFERRED]
  docs/research/llm-onboarding-memoria.md → GLOSSARY.md
- `Barrido lineal 1,2 s ajustable` --implements--> `Barrido`  [INFERRED]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `Few-shot con frases reales del usuario` --rationale_for--> `Huella`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md
- `Use the glossary's vocabulary` --references--> `GLOSSARY.md (Parpadeo)`  [EXTRACTED]
  docs/agents/domain.md → GLOSSARY.md
- `huella.md (perfil fijo)` --implements--> `Perfil`  [EXTRACTED]
  docs/adr/0001-memoria-por-usuario.md → GLOSSARY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pipeline de memoria por usuario (perfil fijo + hechos + agente)** — docs_adr_0001_memoria_por_usuario_huella_md, docs_adr_0001_memoria_por_usuario_memoria_json, glossary_agente_de_memoria, docs_research_llm_onboarding_memoria_mem0, docs_research_llm_extraer_de_conversacion_cruda, glossary_huella [EXTRACTED 1.00]
- **Ciclo half-duplex: aviso, habla, relanzar escucha** — glossary_aviso, docs_adr_0002_voz_half_duplex_half_duplex, docs_research_voz_web_speech_api, docs_research_voz_speech_synthesis, docs_research_voz_relanzar_en_onend, docs_research_voz_chrome_sin_cancelacion_eco [INFERRED 0.85]
- **Seleccion por barrido y parpadeo** — glossary_barrido, glossary_parpadeo_largo, glossary_pausa_del_barrido, glossary_gesto_de_urgencia, docs_research_nucleo_interfaz_congelar_con_ojos_cerrados, docs_research_nucleo_interfaz_barrido_lineal [INFERRED 0.85]

## Communities (24 total, 3 thin omitted)

### Community 0 - "GLOSSARY.md (Parpadeo)"
Cohesion: 0.06
Nodes (63): ADR 0001 Memoria por usuario, .data/ storage en servidor, huella.md (perfil fijo), memoria.json (hechos aprendidos), Reglas del prompt fijas en codigo, Sin base vectorial, Vista 'Lo que aprendi de vos', Research: path llm (+55 more)

### Community 1 - "voz/index.ts"
Cohesion: 0.07
Nodes (48): Prueba(), LineaHistorial, CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, Alternativa (+40 more)

### Community 2 - "reductor.ts"
Cohesion: 0.07
Nodes (52): ACUMULADO_VENCE_MS, CONFIRMACION_FALSA_ALARMA_MS, crearNucleo(), despachar(), ejecutar(), leer(), reiniciarTick(), GESTO_URGENCIA_MS (+44 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (44): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+36 more)

### Community 4 - "completado.ts"
Cohesion: 0.09
Nodes (31): ref_node_test, completar, esPedido(), POST(), proveedor, CompletarFrase, crearCompletado(), DependenciasCompletado (+23 more)

### Community 5 - "app/page.tsx"
Cohesion: 0.11
Nodes (22): react, Conversacion(), Inicio(), Prueba(), Conversacion(), Simulador(), bus, DebugNucleo() (+14 more)

### Community 6 - "eventos.ts"
Cohesion: 0.07
Nodes (28): esPedido(), { generarOpciones }, POST(), proveedor, fecha(), Hechos, LoQueAprendi(), cerrar() (+20 more)

### Community 7 - "Research: path voz"
Cohesion: 0.12
Nodes (26): ADR 0002 Voz half-duplex, Reconocimiento de Chrome como base y fallback permanente, Half-duplex (abort() durante aviso y habla), Sin barge-in, Message banking (BCH, Team Gleason), Modelo de estados (escuchando, pensando, opciones, sinConexion, hablando...), Research: path voz, AssemblyAI streaming con speaker_labels (+18 more)

### Community 8 - "memoria.test.ts"
Cohesion: 0.17
Nodes (10): ref_node_os, crearAlmacenEnArchivos(), memoriaVacia(), cerrada(), despues(), generar(), LINEAS, memoria() (+2 more)

### Community 9 - "llm/index.ts"
Cohesion: 0.16
Nodes (17): almacen, CERCANIAS, esLinea(), GET(), memoria, POST(), proveedor, cerrarConversacion() (+9 more)

### Community 10 - "memoria.ts"
Cohesion: 0.17
Nodes (18): Accion, ACCIONES, Candidato, crearAgenteMemoria(), ErrorMemoria, interpretar(), nombreUsuario(), normalizar() (+10 more)

### Community 11 - "opciones.ts"
Cohesion: 0.14
Nodes (20): sumarEjemplos(), actualizarConversacion(), crearOpciones(), Deteccion, detectarConversacion(), ErrorOpciones, hechosParaPrompt(), INTENCIONES (+12 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "CLAUDE.md"
Cohesion: 0.12
Nodes (17): Next.js 16 breaking changes rule, src/eventos.ts contrato compartido, Fase 0 (research + grill), Push directo a main con pull --rebase, Pagina de prueba por path (src/app/prueba/<path>), Parpadeo (AAC para ELA), Paths paralelos (path:* issues), npx tsc --noEmit antes de push (+9 more)

### Community 14 - "opciones.test.ts"
Cohesion: 0.22
Nodes (5): crearAlmacenEnMemoria(), armar(), CUATRO, guionado(), T0

### Community 15 - "crearDisparadorMemoria"
Cohesion: 0.67
Nodes (4): crearDisparadorMemoria(), correr(), disparar(), crearOpcionesConMemoria()

### Community 16 - "llm/tipos.ts"
Cohesion: 0.20
Nodes (12): ref_node_path, AlmacenEnMemoria, CARPETA_DATOS, PERFIL_ROBERTO, Almacen, ConversacionActual, EjemploEstilo, OrigenHecho (+4 more)

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 20 - "correr.ts"
Cohesion: 0.08
Nodes (36): Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas(), leerConModelo(), leerLocal() (+28 more)

## Knowledge Gaps
- **169 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+164 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 211 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `app/page.tsx` to `voz/index.ts`, `package.json`, `eventos.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `LineaHistorial` connect `voz/index.ts` to `reductor.ts`, `completado.ts`, `eventos.ts`, `memoria.test.ts`, `llm/index.ts`, `memoria.ts`, `opciones.ts`, `llm/tipos.ts`, `correr.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _169 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GLOSSARY.md (Parpadeo)` be split into smaller, more focused modules?**
  _Cohesion score 0.05683563748079877 - nodes in this community are weakly interconnected._
- **Should `voz/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07130333138515488 - nodes in this community are weakly interconnected._
- **Should `reductor.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07288135593220339 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._