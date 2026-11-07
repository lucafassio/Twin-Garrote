# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 81 files · ~50,982 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 583 nodes · 1216 edges · 29 communities (24 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a7b1d03a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research: path llm
- voz/index.ts
- reductor.ts
- package.json
- proveedores.ts
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
- completado.ts
- llm/tipos.ts
- urgencia/route.ts
- correr.ts
- eslint.config.mjs
- ref_node_assert
- ref_node_fs
- Huella
- GLOSSARY.md (Parpadeo)
- Research: path nucleo-interfaz
- ADR 0001 Memoria por usuario
- Agente de memoria

## God Nodes (most connected - your core abstractions)
1. `GLOSSARY.md (Parpadeo)` - 26 edges
2. `iniciarVoz()` - 23 edges
3. `reducir()` - 21 edges
4. `LineaHistorial` - 19 edges
5. `Research: path llm` - 18 edges
6. `Research: onboarding, aprendizaje y memoria` - 18 edges
7. `compilerOptions` - 17 edges
8. `Research: path voz` - 17 edges
9. `react` - 14 edges
10. `PedidoOpciones` - 13 edges

## Surprising Connections (you probably didn't know these)
- `TD Snap QuickFires` --semantically_similar_to--> `Opciones fijas`  [EXTRACTED] [semantically similar]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `renderHuella()` --implements--> `Huella`  [INFERRED]
  docs/research/llm-onboarding-memoria.md → GLOSSARY.md
- `Barrido lineal 1,2 s ajustable` --implements--> `Barrido`  [INFERRED]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `I, Robot? (autoetnografia AAC 2025)` --rationale_for--> `Cercania`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md
- `SocializeChat (cercania + memoria personal)` --rationale_for--> `Cercania`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pipeline de memoria por usuario (perfil fijo + hechos + agente)** — docs_adr_0001_memoria_por_usuario_huella_md, docs_adr_0001_memoria_por_usuario_memoria_json, glossary_agente_de_memoria, docs_research_llm_onboarding_memoria_mem0, docs_research_llm_extraer_de_conversacion_cruda, glossary_huella [EXTRACTED 1.00]
- **Ciclo half-duplex: aviso, habla, relanzar escucha** — glossary_aviso, docs_adr_0002_voz_half_duplex_half_duplex, docs_research_voz_web_speech_api, docs_research_voz_speech_synthesis, docs_research_voz_relanzar_en_onend, docs_research_voz_chrome_sin_cancelacion_eco [INFERRED 0.85]
- **Seleccion por barrido y parpadeo** — glossary_barrido, glossary_parpadeo_largo, glossary_pausa_del_barrido, glossary_gesto_de_urgencia, docs_research_nucleo_interfaz_congelar_con_ojos_cerrados, docs_research_nucleo_interfaz_barrido_lineal [INFERRED 0.85]

## Communities (29 total, 3 thin omitted)

### Community 0 - "Research: path llm"
Cohesion: 0.16
Nodes (18): Research: path llm, claude -p, Gemini Flash free tier, Groq (llama-3.3-70b, structured outputs), I, Robot? (autoetnografia AAC 2025), Propuesta memoria en tres capas (perfil, estilo, hechos), Research: onboarding, aprendizaje y memoria, Generative Agents (Park et al. 2023) (+10 more)

### Community 1 - "voz/index.ts"
Cohesion: 0.07
Nodes (47): Prueba(), CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, Alternativa, constructor() (+39 more)

### Community 2 - "reductor.ts"
Cohesion: 0.07
Nodes (52): ACUMULADO_VENCE_MS, CONFIRMACION_FALSA_ALARMA_MS, crearNucleo(), despachar(), ejecutar(), leer(), reiniciarTick(), GESTO_URGENCIA_MS (+44 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (42): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+34 more)

### Community 4 - "proveedores.ts"
Cohesion: 0.12
Nodes (19): ai, @anthropic-ai/sdk, completar, esPedido(), POST(), proveedor, esPedido(), { generarOpciones } (+11 more)

### Community 5 - "app/page.tsx"
Cohesion: 0.11
Nodes (22): react, Conversacion(), Inicio(), Prueba(), Conversacion(), Simulador(), bus, DebugNucleo() (+14 more)

### Community 6 - "eventos.ts"
Cohesion: 0.09
Nodes (21): fecha(), LoQueAprendi(), cerrar(), enviar(), Medicion, Prueba(), Respuesta, TURNOS_DE_PRUEBA (+13 more)

### Community 7 - "Research: path voz"
Cohesion: 0.12
Nodes (26): ADR 0002 Voz half-duplex, Reconocimiento de Chrome como base y fallback permanente, Half-duplex (abort() durante aviso y habla), Sin barge-in, Message banking (BCH, Team Gleason), Modelo de estados (escuchando, pensando, opciones, sinConexion, hablando...), Research: path voz, AssemblyAI streaming con speaker_labels (+18 more)

### Community 8 - "memoria.test.ts"
Cohesion: 0.14
Nodes (16): ref_node_os, ref_node_path, AlmacenEnMemoria, CARPETA_DATOS, crearAlmacenEnArchivos(), memoriaVacia(), cerrada(), despues() (+8 more)

### Community 9 - "llm/index.ts"
Cohesion: 0.21
Nodes (15): almacen, CERCANIAS, esLinea(), GET(), memoria, POST(), proveedor, cerrarConversacion() (+7 more)

### Community 10 - "memoria.ts"
Cohesion: 0.15
Nodes (20): Accion, ACCIONES, ActualizarMemoria, Candidato, crearAgenteMemoria(), DependenciasMemoria, ErrorMemoria, interpretar() (+12 more)

### Community 11 - "opciones.ts"
Cohesion: 0.11
Nodes (25): sumarEjemplos(), actualizarConversacion(), crearOpciones(), DependenciasOpciones, Deteccion, detectarConversacion(), ErrorOpciones, GenerarOpciones (+17 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "CLAUDE.md"
Cohesion: 0.14
Nodes (14): Next.js 16 breaking changes rule, src/eventos.ts contrato compartido, Fase 0 (research + grill), Push directo a main con pull --rebase, Pagina de prueba por path (src/app/prueba/<path>), Parpadeo (AAC para ELA), Paths paralelos (path:* issues), npx tsc --noEmit antes de push (+6 more)

### Community 14 - "opciones.test.ts"
Cohesion: 0.15
Nodes (10): crearAlmacenEnMemoria(), armar(), CUATRO, guionado(), T0, CON_TURNO, crearProveedorFalso(), SIN_TURNO (+2 more)

### Community 15 - "completado.ts"
Cohesion: 0.22
Nodes (13): ref_node_test, CompletarFrase, crearCompletado(), DependenciasCompletado, hechosParaCompletado(), interpretar(), normalizar(), promptSistema() (+5 more)

### Community 16 - "llm/tipos.ts"
Cohesion: 0.20
Nodes (10): Hechos, ORIGEN, Cercania, LineaHistorial, historial, EjemploEstilo, Hecho, OrigenHecho (+2 more)

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 20 - "correr.ts"
Cohesion: 0.07
Nodes (40): esLinea(), POST(), Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas() (+32 more)

### Community 24 - "Huella"
Cohesion: 0.18
Nodes (11): huella.md (perfil fijo), Few-shot con frases reales del usuario, Onboarding en dos carriles (<10 min), renderHuella(), Drift de estilo, Senales de aprendizaje (opcion, Otra, deletreo, interlocutor), Completado, Huella (+3 more)

### Community 25 - "GLOSSARY.md (Parpadeo)"
Cohesion: 0.35
Nodes (11): Segmentacion por gap de inactividad + chequeo LLM, Fin de turno por silencio (~1200 ms) + disparo manual, GLOSSARY.md (Parpadeo), Cercania, Conversacion, Interlocutor, Opcion, Opciones fijas (+3 more)

### Community 26 - "Research: path nucleo-interfaz"
Cohesion: 0.24
Nodes (10): Research: path nucleo-interfaz, Barrido lineal 1,2 s ajustable, Congelar barrido mientras ojos.cerrados, Contador de pedido (descartar respuestas viejas), Diseno para ELA (baja carga cognitiva, sin rojo salvo urgencia), TD Snap QuickFires, Tope de vueltas (Grid 3 / PRC rescans), Barrido (+2 more)

### Community 27 - "ADR 0001 Memoria por usuario"
Cohesion: 0.25
Nodes (8): ADR 0001 Memoria por usuario, .data/ storage en servidor, Reglas del prompt fijas en codigo, Sin base vectorial, Vista 'Lo que aprendi de vos', Domain Docs guide, Flag ADR conflicts, Use the glossary's vocabulary

### Community 28 - "Agente de memoria"
Cohesion: 0.29
Nodes (8): memoria.json (hechos aprendidos), Extraer de la conversacion cruda, no del resumen, Hibrido JSON en disco + markdown en prompt, Mem0 (ADD/UPDATE/DELETE/NOOP), Multi-Session Chat (Xu et al. 2022), Agente de memoria, Hecho, Memoria corta

## Knowledge Gaps
- **169 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+164 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 211 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `app/page.tsx` to `llm/tipos.ts`, `voz/index.ts`, `package.json`, `eventos.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `LineaHistorial` connect `llm/tipos.ts` to `voz/index.ts`, `reductor.ts`, `app/page.tsx`, `eventos.ts`, `memoria.test.ts`, `llm/index.ts`, `memoria.ts`, `opciones.ts`, `completado.ts`, `correr.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _169 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `voz/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07320024198427103 - nodes in this community are weakly interconnected._
- **Should `reductor.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07062146892655367 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `proveedores.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12307692307692308 - nodes in this community are weakly interconnected._