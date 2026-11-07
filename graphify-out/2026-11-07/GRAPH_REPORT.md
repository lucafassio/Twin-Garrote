# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- Corpus is ~40,433 words - fits in a single context window. You may not need a graph.

## Summary
- 526 nodes · 1137 edges · 20 communities (18 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Decisiones de memoria (ADR/research)
- Voz y CampoTurno
- Motor del nucleo
- Config y dependencias
- Completado para deletrear
- Paginas de la app
- Ruta de opciones
- Voz half-duplex (ADR/research)
- Almacen de memoria
- Ruta de memoria
- Agente de memoria
- Modulo de opciones
- tsconfig
- Reglas de trabajo
- Tests de opciones
- Cableado del path llm
- Tipos del path llm
- Ruta de urgencia

## God Nodes (most connected - your core abstractions)
1. `GLOSSARY.md (Parpadeo)` - 26 edges
2. `iniciarVoz()` - 23 edges
3. `reducir()` - 18 edges
4. `Research: onboarding, aprendizaje y memoria` - 18 edges
5. `Research: path llm` - 18 edges
6. `compilerOptions` - 17 edges
7. `Research: path voz` - 17 edges
8. `react` - 15 edges
9. `LineaHistorial` - 14 edges
10. `PedidoOpciones` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Use the glossary's vocabulary` --references--> `GLOSSARY.md (Parpadeo)`  [EXTRACTED]
  docs/agents/domain.md → GLOSSARY.md
- `Few-shot con frases reales del usuario` --rationale_for--> `Huella`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md
- `renderHuella()` --implements--> `Huella`  [INFERRED]
  docs/research/llm-onboarding-memoria.md → GLOSSARY.md
- `Barrido lineal 1,2 s ajustable` --implements--> `Barrido`  [INFERRED]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `huella.md (perfil fijo)` --implements--> `Perfil`  [EXTRACTED]
  docs/adr/0001-memoria-por-usuario.md → GLOSSARY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pipeline de memoria por usuario (perfil fijo + hechos + agente)** — docs_adr_0001_memoria_por_usuario_huella_md, docs_adr_0001_memoria_por_usuario_memoria_json, glossary_agente_de_memoria, docs_research_llm_onboarding_memoria_mem0, docs_research_llm_extraer_de_conversacion_cruda, glossary_huella [EXTRACTED 1.00]
- **Ciclo half-duplex: aviso, habla, relanzar escucha** — glossary_aviso, docs_adr_0002_voz_half_duplex_half_duplex, docs_research_voz_web_speech_api, docs_research_voz_speech_synthesis, docs_research_voz_relanzar_en_onend, docs_research_voz_chrome_sin_cancelacion_eco [INFERRED 0.85]
- **Seleccion por barrido y parpadeo** — glossary_barrido, glossary_parpadeo_largo, glossary_pausa_del_barrido, glossary_gesto_de_urgencia, docs_research_nucleo_interfaz_congelar_con_ojos_cerrados, docs_research_nucleo_interfaz_barrido_lineal [INFERRED 0.85]

## Communities (20 total, 2 thin omitted)

### Community 0 - "Decisiones de memoria (ADR/research)"
Cohesion: 0.06
Nodes (50): ADR 0001 Memoria por usuario, .data/ storage en servidor, huella.md (perfil fijo), memoria.json (hechos aprendidos), Vista 'Lo que aprendi de vos', Research: path llm, claude -p, Gemini Flash free tier (+42 more)

### Community 1 - "Voz y CampoTurno"
Cohesion: 0.07
Nodes (48): Prueba(), CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, Alternativa, constructor() (+40 more)

### Community 2 - "Motor del nucleo"
Cohesion: 0.08
Nodes (45): CONFIRMACION_FALSA_ALARMA_MS, crearNucleo(), despachar(), ejecutar(), reiniciarTick(), GESTO_URGENCIA_MS, MAXIMO_ESPERA_HABLA_MS, MAXIMO_OPCIONES (+37 more)

### Community 3 - "Config y dependencias"
Cohesion: 0.05
Nodes (44): eslintConfig, nextConfig, dependencies, ai@^7.0.164, @anthropic-ai/sdk@^1.6.0, @google/genai@^3.0.0, groq-sdk@^1.6.0, @mediapipe/tasks-vision@^1.2.2 (+36 more)

### Community 4 - "Completado para deletrear"
Cohesion: 0.09
Nodes (31): completar, esPedido(), POST(), proveedor, CompletarFrase, crearCompletado(), DependenciasCompletado, hechosParaCompletado() (+23 more)

### Community 5 - "Paginas de la app"
Cohesion: 0.13
Nodes (25): react, Conversacion(), Home(), Inicio(), Prueba(), Prueba(), Prueba(), Conversacion() (+17 more)

### Community 6 - "Ruta de opciones"
Cohesion: 0.09
Nodes (22): esPedido(), { generarOpciones }, POST(), proveedor, fecha(), LoQueAprendi(), cerrar(), enviar() (+14 more)

### Community 7 - "Voz half-duplex (ADR/research)"
Cohesion: 0.12
Nodes (21): ADR 0002 Voz half-duplex, Message banking (BCH, Team Gleason), Modelo de estados (escuchando, pensando, opciones, sinConexion, hablando...), Research: path voz, AssemblyAI streaming con speaker_labels, Azure Neural es-AR-ElenaNeural / TomasNeural, Bug de corte ~15 s de voces Google, Chrome recognition sin cancelacion de eco (Chromium source) (+13 more)

### Community 8 - "Almacen de memoria"
Cohesion: 0.14
Nodes (14): AlmacenEnMemoria, CARPETA_DATOS, crearAlmacenEnArchivos(), memoriaVacia(), cerrada(), despues(), generar(), LINEAS (+6 more)

### Community 9 - "Ruta de memoria"
Cohesion: 0.17
Nodes (16): almacen, CERCANIAS, esLinea(), GET(), memoria, POST(), proveedor, Hechos (+8 more)

### Community 10 - "Agente de memoria"
Cohesion: 0.16
Nodes (19): Accion, ACCIONES, Candidato, crearAgenteMemoria(), ErrorMemoria, interpretar(), nombreUsuario(), normalizar() (+11 more)

### Community 11 - "Modulo de opciones"
Cohesion: 0.15
Nodes (19): actualizarConversacion(), crearOpciones(), Deteccion, detectarConversacion(), ErrorOpciones, hechosParaPrompt(), INTENCIONES, interpretar() (+11 more)

### Community 12 - "tsconfig"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "Reglas de trabajo"
Cohesion: 0.12
Nodes (12): src/eventos.ts contrato compartido, Pagina de prueba por path (src/app/prueba/<path>), Parpadeo (AAC para ELA), npx tsc --noEmit antes de push, Domain Docs guide, Flag ADR conflicts, Issue tracker: GitHub, gh CLI issue conventions (+4 more)

### Community 14 - "Tests de opciones"
Cohesion: 0.20
Nodes (6): crearAlmacenEnMemoria(), armar(), CUATRO, guionado(), T0, ConversacionCerrada

### Community 15 - "Cableado del path llm"
Cohesion: 0.24
Nodes (9): HechosListados, ActualizarMemoria, crearDisparadorMemoria(), correr(), disparar(), crearOpcionesConMemoria(), DependenciasMemoria, DependenciasOpciones (+1 more)

### Community 16 - "Tipos del path llm"
Cohesion: 0.29
Nodes (6): ConversacionActual, EjemploEstilo, OrigenHecho, Registro, ResultadoOpciones, ResumenConversacion

### Community 17 - "Ruta de urgencia"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

## Knowledge Gaps
- **19 isolated node(s):** `ADR-0002`, `ADR-0002`, `src/eventos.ts contrato compartido`, `Pagina de prueba por path (src/app/prueba/<path>)`, `npx tsc --noEmit antes de push` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 157 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Paginas de la app` to `Ruta de memoria`, `Config y dependencias`, `Ruta de opciones`, `Voz y CampoTurno`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **What connects `ADR-0002`, `ADR-0002`, `src/eventos.ts contrato compartido` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Decisiones de memoria (ADR/research)` be split into smaller, more focused modules?**
  _Cohesion score 0.05683563748079877 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Config y dependencias` to `Ruta de memoria`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `Voz y CampoTurno` be split into smaller, more focused modules?**
  _Cohesion score 0.07364114552893045 - nodes in this community are weakly interconnected._
- **Why does `LineaHistorial` connect `Ruta de memoria` to `Voz y CampoTurno`, `Motor del nucleo`, `Completado para deletrear`, `Ruta de opciones`, `Almacen de memoria`, `Agente de memoria`, `Modulo de opciones`, `Tipos del path llm`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `Motor del nucleo` be split into smaller, more focused modules?**
  _Cohesion score 0.07832080200501253 - nodes in this community are weakly interconnected._