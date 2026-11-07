# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 87 files · ~60,165 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 640 nodes · 1327 edges · 36 communities (30 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `40fd69ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research: path llm
- iniciarVoz
- reductor.ts
- package.json
- proveedores.ts
- app/page.tsx
- eventos.ts
- Research: path voz
- llm/index.ts
- memoria.test.ts
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
- PruebaCorte.tsx
- escuchar.ts
- crearEscuchaGroq
- Research: path deletrear (Fase 0)
- voz/index.ts
- sonidos.ts
- transcribir/route.ts

## God Nodes (most connected - your core abstractions)
1. `GLOSSARY.md (Parpadeo)` - 26 edges
2. `iniciarVoz()` - 22 edges
3. `reducir()` - 21 edges
4. `LineaHistorial` - 20 edges
5. `Research: path llm` - 18 edges
6. `Research: onboarding, aprendizaje y memoria` - 18 edges
7. `compilerOptions` - 17 edges
8. `Research: path voz` - 17 edges
9. `PedidoOpciones` - 16 edges
10. `react` - 15 edges

## Surprising Connections (you probably didn't know these)
- `TD Snap QuickFires` --semantically_similar_to--> `Opciones fijas`  [EXTRACTED] [semantically similar]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `I, Robot? (autoetnografia AAC 2025)` --rationale_for--> `Cercania`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md
- `SocializeChat (cercania + memoria personal)` --rationale_for--> `Cercania`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md
- `Orden de opciones por probabilidad` --rationale_for--> `Opcion`  [INFERRED]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `renderHuella()` --implements--> `Huella`  [INFERRED]
  docs/research/llm-onboarding-memoria.md → GLOSSARY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pipeline de memoria por usuario (perfil fijo + hechos + agente)** — docs_adr_0001_memoria_por_usuario_huella_md, docs_adr_0001_memoria_por_usuario_memoria_json, glossary_agente_de_memoria, docs_research_llm_onboarding_memoria_mem0, docs_research_llm_extraer_de_conversacion_cruda, glossary_huella [EXTRACTED 1.00]
- **Ciclo half-duplex: aviso, habla, relanzar escucha** — glossary_aviso, docs_adr_0002_voz_half_duplex_half_duplex, docs_research_voz_web_speech_api, docs_research_voz_speech_synthesis, docs_research_voz_relanzar_en_onend, docs_research_voz_chrome_sin_cancelacion_eco [INFERRED 0.85]
- **Seleccion por barrido y parpadeo** — glossary_barrido, glossary_parpadeo_largo, glossary_pausa_del_barrido, glossary_gesto_de_urgencia, docs_research_nucleo_interfaz_congelar_con_ojos_cerrados, docs_research_nucleo_interfaz_barrido_lineal [INFERRED 0.85]

## Communities (36 total, 4 thin omitted)

### Community 0 - "Research: path llm"
Cohesion: 0.16
Nodes (18): Research: path llm, claude -p, Gemini Flash free tier, Groq (llama-3.3-70b, structured outputs), I, Robot? (autoetnografia AAC 2025), Propuesta memoria en tres capas (perfil, estilo, hechos), Research: onboarding, aprendizaje y memoria, Generative Agents (Park et al. 2023) (+10 more)

### Community 1 - "iniciarVoz"
Cohesion: 0.22
Nodes (17): Prueba(), callar(), cargarVoces(), elegirVoz(), hablar(), PREFERIDAS_LOCAL, PREFERIDAS_RED, voces (+9 more)

### Community 2 - "reductor.ts"
Cohesion: 0.07
Nodes (54): Opcion, Props, ACUMULADO_VENCE_MS, CONFIRMACION_FALSA_ALARMA_MS, crearNucleo(), despachar(), ejecutar(), leer() (+46 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (42): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+34 more)

### Community 4 - "proveedores.ts"
Cohesion: 0.11
Nodes (22): ai, @anthropic-ai/sdk, ref_node_test, completar, esPedido(), POST(), proveedor, esPedido() (+14 more)

### Community 5 - "app/page.tsx"
Cohesion: 0.12
Nodes (18): react, Conversacion(), Prueba(), Conversacion(), Simulador(), DebugNucleo(), AVISO_CUADRANTE, CeldaProps (+10 more)

### Community 6 - "eventos.ts"
Cohesion: 0.07
Nodes (38): almacen, CERCANIAS, esLinea(), GET(), memoria, POST(), proveedor, fecha() (+30 more)

### Community 7 - "Research: path voz"
Cohesion: 0.12
Nodes (26): ADR 0002 Voz half-duplex, Reconocimiento de Chrome como base y fallback permanente, Half-duplex (abort() durante aviso y habla), Sin barge-in, Message banking (BCH, Team Gleason), Modelo de estados (escuchando, pensando, opciones, sinConexion, hablando...), Research: path voz, AssemblyAI streaming con speaker_labels (+18 more)

### Community 8 - "llm/index.ts"
Cohesion: 0.16
Nodes (15): ref_node_path, AlmacenEnMemoria, CARPETA_DATOS, crearAlmacenEnArchivos(), memoriaVacia(), DependenciasCompletado, HechosListados, ActualizarMemoria (+7 more)

### Community 9 - "memoria.test.ts"
Cohesion: 0.19
Nodes (11): ref_node_os, crearDisparadorMemoria(), correr(), disparar(), crearOpcionesConMemoria(), cerrada(), despues(), generar() (+3 more)

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
Cohesion: 0.15
Nodes (7): armar(), CUATRO, guionado(), T0, CON_TURNO, SIN_TURNO, ConversacionCerrada

### Community 15 - "completado.ts"
Cohesion: 0.25
Nodes (12): crearAlmacenEnMemoria(), CompletarFrase, crearCompletado(), hechosParaCompletado(), interpretar(), normalizar(), promptSistema(), renderLinea() (+4 more)

### Community 16 - "llm/tipos.ts"
Cohesion: 0.25
Nodes (7): ConversacionActual, EjemploEstilo, OrigenHecho, Registro, ResultadoOpciones, ResumenConversacion, SalidaProveedor

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 20 - "correr.ts"
Cohesion: 0.07
Nodes (42): esLinea(), POST(), Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas() (+34 more)

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

### Community 29 - "PruebaCorte.tsx"
Cohesion: 0.16
Nodes (18): esperar(), Estado, Medicion, ms(), PruebaCorte(), completar(), letrasRapidas(), pedir() (+10 more)

### Community 30 - "escuchar.ts"
Cohesion: 0.12
Nodes (14): Inicio(), Linea, MonitorBus(), Alternativa, constructor(), crearEscucha(), depuracionEscucha, ERRORES_FATALES (+6 more)

### Community 31 - "crearEscuchaGroq"
Cohesion: 0.20
Nodes (11): Escucha, aWav(), crearEscuchaGroq(), cerrarFrase(), preparar(), procesar(), transcribir(), groqDisponible() (+3 more)

### Community 32 - "Research: path deletrear (Fase 0)"
Cohesion: 0.15
Nodes (12): 1. Disposicion de letras, 2. Prediccion de palabras, 3. Listas de frecuencia de palabras, 4. Bibliotecas npm, 5. Velocidad realista, 6. Correccion de errores, 7. Cosas que cambian el plan del issue, Decisiones del grill (cierran la Fase 0) (+4 more)

### Community 33 - "voz/index.ts"
Cohesion: 0.27
Nodes (9): bus, CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, ADR-0002, cerrarTurno() (+1 more)

### Community 34 - "sonidos.ts"
Cohesion: 0.38
Nodes (9): activos, campana(), ctx(), esperar(), PARCIALES, salidaCampana(), sonarAlarma(), sonarAviso() (+1 more)

## Knowledge Gaps
- **187 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+182 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 235 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `app/page.tsx` to `iniciarVoz`, `reductor.ts`, `package.json`, `voz/index.ts`, `eventos.ts`, `PruebaCorte.tsx`, `escuchar.ts`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `LineaHistorial` connect `eventos.ts` to `voz/index.ts`, `reductor.ts`, `app/page.tsx`, `memoria.test.ts`, `memoria.ts`, `opciones.ts`, `completado.ts`, `llm/tipos.ts`, `correr.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `PedidoOpciones` connect `eventos.ts` to `reductor.ts`, `proveedores.ts`, `opciones.ts`, `opciones.test.ts`, `completado.ts`, `PruebaCorte.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _187 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `reductor.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06875 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `proveedores.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11330049261083744 - nodes in this community are weakly interconnected._