# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 94 files · ~65,410 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 706 nodes · 1534 edges · 29 communities (24 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b1572a4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research: path llm
- voz/index.ts
- reductor.ts
- package.json
- completado.ts
- app/page.tsx
- eventos.ts
- Research: path voz
- llm/tipos.ts
- memoria.test.ts
- memoria.ts
- opciones.ts
- compilerOptions
- CLAUDE.md
- opciones.test.ts
- llm/index.ts
- Deletrear.tsx
- urgencia/route.ts
- medir-latencias.ts
- correr.ts
- eslint.config.mjs
- ref_node_assert
- ref_node_fs
- GLOSSARY.md (Parpadeo)
- Research: path nucleo-interfaz
- ADR 0001 Memoria por usuario
- Research: path deletrear (Fase 0)
- transcribir/route.ts

## God Nodes (most connected - your core abstractions)
1. `GLOSSARY.md (Parpadeo)` - 26 edges
2. `LineaHistorial` - 22 edges
3. `iniciarVoz()` - 22 edges
4. `PedidoOpciones` - 21 edges
5. `reducir()` - 21 edges
6. `Research: path llm` - 18 edges
7. `Research: onboarding, aprendizaje y memoria` - 18 edges
8. `react` - 17 edges
9. `compilerOptions` - 17 edges
10. `Research: path voz` - 17 edges

## Surprising Connections (you probably didn't know these)
- `TD Snap QuickFires` --semantically_similar_to--> `Opciones fijas`  [EXTRACTED] [semantically similar]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `SocializeChat (cercania + memoria personal)` --rationale_for--> `Cercania`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md
- `Orden de opciones por probabilidad` --rationale_for--> `Opcion`  [INFERRED]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `renderHuella()` --implements--> `Huella`  [INFERRED]
  docs/research/llm-onboarding-memoria.md → GLOSSARY.md
- `Few-shot con frases reales del usuario` --rationale_for--> `Huella`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pipeline de memoria por usuario (perfil fijo + hechos + agente)** — docs_adr_0001_memoria_por_usuario_huella_md, docs_adr_0001_memoria_por_usuario_memoria_json, glossary_agente_de_memoria, docs_research_llm_onboarding_memoria_mem0, docs_research_llm_extraer_de_conversacion_cruda, glossary_huella [EXTRACTED 1.00]
- **Ciclo half-duplex: aviso, habla, relanzar escucha** — glossary_aviso, docs_adr_0002_voz_half_duplex_half_duplex, docs_research_voz_web_speech_api, docs_research_voz_speech_synthesis, docs_research_voz_relanzar_en_onend, docs_research_voz_chrome_sin_cancelacion_eco [INFERRED 0.85]
- **Seleccion por barrido y parpadeo** — glossary_barrido, glossary_parpadeo_largo, glossary_pausa_del_barrido, glossary_gesto_de_urgencia, docs_research_nucleo_interfaz_congelar_con_ojos_cerrados, docs_research_nucleo_interfaz_barrido_lineal [INFERRED 0.85]

## Communities (29 total, 4 thin omitted)

### Community 0 - "Research: path llm"
Cohesion: 0.10
Nodes (29): memoria.json (hechos aprendidos), Research: path llm, claude -p, Extraer de la conversacion cruda, no del resumen, Few-shot con frases reales del usuario, Gemini Flash free tier, Groq (llama-3.3-70b, structured outputs), Propuesta memoria en tres capas (perfil, estilo, hechos) (+21 more)

### Community 1 - "voz/index.ts"
Cohesion: 0.06
Nodes (58): Inicio(), Prueba(), CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, Alternativa (+50 more)

### Community 2 - "reductor.ts"
Cohesion: 0.07
Nodes (53): DebugNucleo(), Props, ACUMULADO_VENCE_MS, CONFIRMACION_FALSA_ALARMA_MS, crearNucleo(), despachar(), ejecutar(), leer() (+45 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (44): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+36 more)

### Community 4 - "completado.ts"
Cohesion: 0.07
Nodes (37): completar, esPedido(), POST(), proveedor, esPedido(), POST(), predecir, proveedor (+29 more)

### Community 5 - "app/page.tsx"
Cohesion: 0.10
Nodes (22): react, Conversacion(), Prueba(), Conversacion(), Simulador(), bus, Linea, MonitorBus() (+14 more)

### Community 6 - "eventos.ts"
Cohesion: 0.06
Nodes (40): ref_node_test, fecha(), Hechos, LoQueAprendi(), cerrar(), enviar(), ORIGEN, Medicion (+32 more)

### Community 7 - "Research: path voz"
Cohesion: 0.15
Nodes (20): ADR 0002 Voz half-duplex, Reconocimiento de Chrome como base y fallback permanente, Sin barge-in, Message banking (BCH, Team Gleason), Research: path voz, AssemblyAI streaming con speaker_labels, Azure Neural es-AR-ElenaNeural / TomasNeural, Bug de corte ~15 s de voces Google (+12 more)

### Community 8 - "llm/tipos.ts"
Cohesion: 0.20
Nodes (12): ref_node_path, AlmacenEnMemoria, CARPETA_DATOS, PERFIL_ROBERTO, Almacen, ConversacionActual, EjemploEstilo, OrigenHecho (+4 more)

### Community 9 - "memoria.test.ts"
Cohesion: 0.17
Nodes (10): ref_node_os, crearAlmacenEnArchivos(), memoriaVacia(), cerrada(), despues(), generar(), LINEAS, memoria() (+2 more)

### Community 10 - "memoria.ts"
Cohesion: 0.17
Nodes (18): Accion, ACCIONES, Candidato, crearAgenteMemoria(), ErrorMemoria, interpretar(), nombreUsuario(), normalizar() (+10 more)

### Community 11 - "opciones.ts"
Cohesion: 0.13
Nodes (21): Intencion, sumarEjemplos(), actualizarConversacion(), crearOpciones(), Deteccion, detectarConversacion(), ErrorOpciones, hechosParaPrompt() (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "CLAUDE.md"
Cohesion: 0.14
Nodes (14): Next.js 16 breaking changes rule, src/eventos.ts contrato compartido, Fase 0 (research + grill), Push directo a main con pull --rebase, Pagina de prueba por path (src/app/prueba/<path>), Parpadeo (AAC para ELA), Paths paralelos (path:* issues), npx tsc --noEmit antes de push (+6 more)

### Community 14 - "opciones.test.ts"
Cohesion: 0.20
Nodes (6): crearAlmacenEnMemoria(), armar(), CUATRO, guionado(), T0, ConversacionCerrada

### Community 15 - "llm/index.ts"
Cohesion: 0.18
Nodes (15): almacen, CERCANIAS, esLinea(), GET(), memoria, POST(), proveedor, cerrarConversacion() (+7 more)

### Community 16 - "Deletrear.tsx"
Cohesion: 0.08
Nodes (51): Accion, agregarLetra(), armarFilas(), avanzar(), Barrido, BARRIDO_INICIAL, borrarLetra(), borrarPalabra() (+43 more)

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 18 - "medir-latencias.ts"
Cohesion: 0.25
Nodes (13): armarPedido(), directo(), Llamar, main(), mediana(), Medido, medir(), porHttp() (+5 more)

### Community 20 - "correr.ts"
Cohesion: 0.07
Nodes (42): esLinea(), POST(), Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas() (+34 more)

### Community 25 - "GLOSSARY.md (Parpadeo)"
Cohesion: 0.24
Nodes (15): I, Robot? (autoetnografia AAC 2025), Segmentacion por gap de inactividad + chequeo LLM, Fin de turno por silencio (~1200 ms) + disparo manual, GLOSSARY.md (Parpadeo), Cercania, Contacto, Conversacion, Gesto de urgencia (+7 more)

### Community 26 - "Research: path nucleo-interfaz"
Cohesion: 0.14
Nodes (16): Half-duplex (abort() durante aviso y habla), Drift de estilo, Senales de aprendizaje (opcion, Otra, deletreo, interlocutor), Research: path nucleo-interfaz, Barrido lineal 1,2 s ajustable, Congelar barrido mientras ojos.cerrados, Contador de pedido (descartar respuestas viejas), Diseno para ELA (baja carga cognitiva, sin rojo salvo urgencia) (+8 more)

### Community 27 - "ADR 0001 Memoria por usuario"
Cohesion: 0.17
Nodes (12): ADR 0001 Memoria por usuario, .data/ storage en servidor, huella.md (perfil fijo), Reglas del prompt fijas en codigo, Sin base vectorial, Vista 'Lo que aprendi de vos', Domain Docs guide, Flag ADR conflicts (+4 more)

### Community 32 - "Research: path deletrear (Fase 0)"
Cohesion: 0.15
Nodes (12): 1. Disposicion de letras, 2. Prediccion de palabras, 3. Listas de frecuencia de palabras, 4. Bibliotecas npm, 5. Velocidad realista, 6. Correccion de errores, 7. Cosas que cambian el plan del issue, Decisiones del grill (cierran la Fase 0) (+4 more)

## Knowledge Gaps
- **201 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+196 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 249 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `app/page.tsx` to `voz/index.ts`, `reductor.ts`, `package.json`, `eventos.ts`, `Deletrear.tsx`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `LineaHistorial` connect `eventos.ts` to `voz/index.ts`, `reductor.ts`, `completado.ts`, `app/page.tsx`, `llm/tipos.ts`, `memoria.test.ts`, `memoria.ts`, `opciones.ts`, `llm/index.ts`, `Deletrear.tsx`, `medir-latencias.ts`, `correr.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `PedidoOpciones` connect `eventos.ts` to `reductor.ts`, `completado.ts`, `app/page.tsx`, `opciones.ts`, `opciones.test.ts`, `Deletrear.tsx`, `medir-latencias.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _201 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Research: path llm` be split into smaller, more focused modules?**
  _Cohesion score 0.10098522167487685 - nodes in this community are weakly interconnected._
- **Should `voz/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059076682316118935 - nodes in this community are weakly interconnected._
- **Should `reductor.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07139079851930195 - nodes in this community are weakly interconnected._