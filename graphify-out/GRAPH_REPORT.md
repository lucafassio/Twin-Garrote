# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 96 files · ~92,960 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 759 nodes · 1623 edges · 37 communities (34 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `88c6efae`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research: path llm
- iniciarVoz
- reductor.ts
- package.json
- completado.ts
- react
- eventos.ts
- Research: path voz
- 4. Módulos en detalle
- llm/tipos.ts
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
- PruebaCorte.tsx
- app/page.tsx
- completado.ts
- GLOSSARY.md (Parpadeo)
- Research: path nucleo-interfaz
- ADR 0001 Memoria por usuario
- motor.ts
- LineaHistorial
- crearEscuchaGroq
- reductor.test.ts
- Research: path deletrear (Fase 0)
- voz/index.ts
- sonidos.ts
- transcribir/route.ts
- crearNucleo

## God Nodes (most connected - your core abstractions)
1. `GLOSSARY.md (Parpadeo)` - 26 edges
2. `LineaHistorial` - 24 edges
3. `PedidoOpciones` - 22 edges
4. `iniciarVoz()` - 22 edges
5. `reducir()` - 21 edges
6. `Research: path llm` - 18 edges
7. `Research: onboarding, aprendizaje y memoria` - 18 edges
8. `compilerOptions` - 17 edges
9. `react` - 17 edges
10. `Research: path voz` - 17 edges

## Surprising Connections (you probably didn't know these)
- `TD Snap QuickFires` --semantically_similar_to--> `Opciones fijas`  [EXTRACTED] [semantically similar]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `renderHuella()` --implements--> `Huella`  [INFERRED]
  docs/research/llm-onboarding-memoria.md → GLOSSARY.md
- `Few-shot con frases reales del usuario` --rationale_for--> `Huella`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md
- `SocializeChat (cercania + memoria personal)` --rationale_for--> `Cercania`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md
- `Orden de opciones por probabilidad` --rationale_for--> `Opcion`  [INFERRED]
  docs/research/nucleo-interfaz.md → GLOSSARY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pipeline de memoria por usuario (perfil fijo + hechos + agente)** — docs_adr_0001_memoria_por_usuario_huella_md, docs_adr_0001_memoria_por_usuario_memoria_json, glossary_agente_de_memoria, docs_research_llm_onboarding_memoria_mem0, docs_research_llm_extraer_de_conversacion_cruda, glossary_huella [EXTRACTED 1.00]
- **Ciclo half-duplex: aviso, habla, relanzar escucha** — glossary_aviso, docs_adr_0002_voz_half_duplex_half_duplex, docs_research_voz_web_speech_api, docs_research_voz_speech_synthesis, docs_research_voz_relanzar_en_onend, docs_research_voz_chrome_sin_cancelacion_eco [INFERRED 0.85]
- **Seleccion por barrido y parpadeo** — glossary_barrido, glossary_parpadeo_largo, glossary_pausa_del_barrido, glossary_gesto_de_urgencia, docs_research_nucleo_interfaz_congelar_con_ojos_cerrados, docs_research_nucleo_interfaz_barrido_lineal [INFERRED 0.85]

## Communities (37 total, 3 thin omitted)

### Community 0 - "Research: path llm"
Cohesion: 0.10
Nodes (24): memoria.json (hechos aprendidos), Research: path llm, claude -p, Gemini Flash free tier, Groq (llama-3.3-70b, structured outputs), Propuesta memoria en tres capas (perfil, estilo, hechos), Research: onboarding, aprendizaje y memoria, Generative Agents (Park et al. 2023) (+16 more)

### Community 1 - "iniciarVoz"
Cohesion: 0.22
Nodes (17): Prueba(), callar(), cargarVoces(), elegirVoz(), hablar(), PREFERIDAS_LOCAL, PREFERIDAS_RED, voces (+9 more)

### Community 2 - "reductor.ts"
Cohesion: 0.19
Nodes (21): aceptarAcumulado(), activarUrgencia(), barridoDetenido(), Ctx, decir(), descartarAcumulado(), ejecutar(), esperarHabla() (+13 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (41): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+33 more)

### Community 4 - "completado.ts"
Cohesion: 0.11
Nodes (23): ai, @anthropic-ai/sdk, completar, esPedido(), POST(), proveedor, esPedido(), POST() (+15 more)

### Community 5 - "react"
Cohesion: 0.19
Nodes (11): react, Conversacion(), Prueba(), Conversacion(), Simulador(), bus, DebugNucleo(), Props (+3 more)

### Community 6 - "eventos.ts"
Cohesion: 0.11
Nodes (19): fecha(), Hechos, LoQueAprendi(), cerrar(), enviar(), ORIGEN, Medicion, Prueba() (+11 more)

### Community 7 - "Research: path voz"
Cohesion: 0.15
Nodes (16): ADR 0002 Voz half-duplex, Message banking (BCH, Team Gleason), Research: path voz, AssemblyAI streaming con speaker_labels, Azure Neural es-AR-ElenaNeural / TomasNeural, Bug de corte ~15 s de voces Google, Chrome recognition sin cancelacion de eco (Chromium source), Deepgram Nova-3 streaming (plan B) (+8 more)

### Community 8 - "4. Módulos en detalle"
Cohesion: 0.04
Nodes (45): 1. Contexto y alcance, 2. Arquitectura, 3. Modelo de datos, 4.10 `consolidate`, 4.11 `metrics`, 4.1 `capture`: escucha y fin de turno, 4.2 `memory`: almacenamiento y recuperación, 4.3 `embedder` (+37 more)

### Community 9 - "llm/tipos.ts"
Cohesion: 0.17
Nodes (14): AlmacenEnMemoria, memoriaVacia(), ErrorMemoria, cerrada(), despues(), generar(), LINEAS, memoria() (+6 more)

### Community 10 - "memoria.ts"
Cohesion: 0.14
Nodes (21): Accion, ACCIONES, Candidato, crearAgenteMemoria(), interpretar(), nombreUsuario(), normalizar(), nuevoId() (+13 more)

### Community 11 - "opciones.ts"
Cohesion: 0.13
Nodes (26): Intencion, lineasDeLaConversacionActual(), abrirConversacion(), armarCerrada(), interlocutorDe(), lineasDeConversacion(), seguirConversacion(), unirLineas() (+18 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "CLAUDE.md"
Cohesion: 0.14
Nodes (10): src/eventos.ts contrato compartido, Pagina de prueba por path (src/app/prueba/<path>), Parpadeo (AAC para ELA), npx tsc --noEmit antes de push, Issue tracker: GitHub, gh CLI issue conventions, Wayfinding operations (map + child tickets), Triage Labels (+2 more)

### Community 14 - "opciones.test.ts"
Cohesion: 0.15
Nodes (6): historial, armar(), CUATRO, guionado(), T0, Hecho

### Community 15 - "llm/index.ts"
Cohesion: 0.16
Nodes (16): almacen, CERCANIAS, esLinea(), GET(), memoria, POST(), proveedor, CARPETA_DATOS (+8 more)

### Community 16 - "Deletrear.tsx"
Cohesion: 0.08
Nodes (50): Accion, agregarLetra(), armarFilas(), avanzar(), Barrido, BARRIDO_INICIAL, borrarLetra(), borrarPalabra() (+42 more)

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 18 - "medir-latencias.ts"
Cohesion: 0.14
Nodes (19): esPedido(), { generarOpciones }, POST(), proveedor, crearAlmacenEnArchivos(), cerrarConversacion(), armarPedido(), directo() (+11 more)

### Community 20 - "correr.ts"
Cohesion: 0.07
Nodes (41): esLinea(), POST(), Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas() (+33 more)

### Community 22 - "PruebaCorte.tsx"
Cohesion: 0.16
Nodes (18): esperar(), Estado, Medicion, ms(), PruebaCorte(), completar(), letrasRapidas(), pedir() (+10 more)

### Community 23 - "app/page.tsx"
Cohesion: 0.11
Nodes (16): Inicio(), Linea, MonitorBus(), Alternativa, constructor(), crearEscucha(), depuracionEscucha, ERRORES_FATALES (+8 more)

### Community 24 - "completado.ts"
Cohesion: 0.18
Nodes (17): crearAlmacenEnMemoria(), CompletarFrase, crearCompletado(), DependenciasCompletado, hechosParaCompletado(), interpretar(), normalizar(), promptSistema() (+9 more)

### Community 25 - "GLOSSARY.md (Parpadeo)"
Cohesion: 0.24
Nodes (14): I, Robot? (autoetnografia AAC 2025), Segmentacion por gap de inactividad + chequeo LLM, GLOSSARY.md (Parpadeo), Cercania, Contacto, Conversacion, Gesto de urgencia, Interlocutor (+6 more)

### Community 26 - "Research: path nucleo-interfaz"
Cohesion: 0.14
Nodes (11): Senales de aprendizaje (opcion, Otra, deletreo, interlocutor), Research: path nucleo-interfaz, Contador de pedido (descartar respuestas viejas), Modelo de estados (escuchando, pensando, opciones, sinConexion, hablando...), TD Snap QuickFires, Tope de vueltas (Grid 3 / PRC rescans), Aviso, Barrido (+3 more)

### Community 27 - "ADR 0001 Memoria por usuario"
Cohesion: 0.17
Nodes (8): ADR 0001 Memoria por usuario, .data/ storage en servidor, huella.md (perfil fijo), Vista 'Lo que aprendi de vos', Domain Docs guide, Flag ADR conflicts, Onboarding, Perfil

### Community 28 - "motor.ts"
Cohesion: 0.13
Nodes (14): Opcion, ACUMULADO_VENCE_MS, CONFIRMACION_FALSA_ALARMA_MS, GESTO_URGENCIA_MS, LECTURA_MAXIMO_MS, LeerTurno, MAXIMO_ESPERA_HABLA_MS, MAXIMO_OPCIONES (+6 more)

### Community 29 - "LineaHistorial"
Cohesion: 0.17
Nodes (12): LineaHistorial, AVISO_CUADRANTE, CeldaProps, FRANJA, mismoElemento(), Pantalla(), Props, Conversacion (+4 more)

### Community 30 - "crearEscuchaGroq"
Cohesion: 0.20
Nodes (11): Escucha, aWav(), crearEscuchaGroq(), cerrarFrase(), preparar(), procesar(), transcribir(), groqDisponible() (+3 more)

### Community 31 - "reductor.test.ts"
Cohesion: 0.24
Nodes (10): elementosBarrido(), aplicar(), conOpciones(), despuesDeDecirSi(), enUrgencia(), iluminar(), nombres(), OPCIONES (+2 more)

### Community 32 - "Research: path deletrear (Fase 0)"
Cohesion: 0.15
Nodes (12): 1. Disposicion de letras, 2. Prediccion de palabras, 3. Listas de frecuencia de palabras, 4. Bibliotecas npm, 5. Velocidad realista, 6. Correccion de errores, 7. Cosas que cambian el plan del issue, Decisiones del grill (cierran la Fase 0) (+4 more)

### Community 33 - "voz/index.ts"
Cohesion: 0.29
Nodes (8): CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, ADR-0002, cerrarTurno(), registrarCierre()

### Community 34 - "sonidos.ts"
Cohesion: 0.38
Nodes (9): activos, campana(), ctx(), esperar(), PARCIALES, salidaCampana(), sonarAlarma(), sonarAviso() (+1 more)

### Community 36 - "crearNucleo"
Cohesion: 0.60
Nodes (5): crearNucleo(), despachar(), ejecutar(), leer(), reiniciarTick()

## Knowledge Gaps
- **31 isolated node(s):** `ADR-0002`, `ADR-0002`, `eslint`, `eslint-config-next`, `@google/genai` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 282 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `iniciarVoz`, `voz/index.ts`, `package.json`, `eventos.ts`, `Deletrear.tsx`, `PruebaCorte.tsx`, `app/page.tsx`, `LineaHistorial`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **What connects `ADR-0002`, `ADR-0002`, `eslint` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Research: path llm` be split into smaller, more focused modules?**
  _Cohesion score 0.10098522167487685 - nodes in this community are weakly interconnected._
- **Why does `LineaHistorial` connect `LineaHistorial` to `voz/index.ts`, `reductor.ts`, `react`, `eventos.ts`, `llm/tipos.ts`, `memoria.ts`, `opciones.ts`, `opciones.test.ts`, `llm/index.ts`, `Deletrear.tsx`, `medir-latencias.ts`, `correr.ts`, `completado.ts`, `motor.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Why does `PedidoOpciones` connect `eventos.ts` to `completado.ts`, `react`, `opciones.ts`, `opciones.test.ts`, `Deletrear.tsx`, `medir-latencias.ts`, `PruebaCorte.tsx`, `completado.ts`, `motor.ts`, `LineaHistorial`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `completado.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10967741935483871 - nodes in this community are weakly interconnected._