# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 97 files · ~92,944 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 901 nodes · 1847 edges · 45 communities (41 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `940a349f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research: path llm
- escuchar.ts
- iniciarVoz
- package.json
- proveedores.ts
- react
- vencen.test.ts
- Research: path voz
- llm/tipos.ts
- memoria.ts
- opciones.ts
- compilerOptions
- CLAUDE.md
- opciones.test.ts
- llm/index.ts
- Deletrear.tsx
- urgencia/route.ts
- correr.ts
- eslint.config.mjs
- eventos.ts
- Huella
- completado.ts
- GLOSSARY.md (Parpadeo)
- Research: path nucleo-interfaz
- ADR 0001 Memoria por usuario
- reductor.ts
- 3. Aprender mientras se usa
- ref_node_assert
- Research: path deletrear (Fase 0)
- transcribir/route.ts
- 1. Que dice la investigacion sobre LLMs en CAA
- Segunda tanda (pendientes del grill)
- app/page.tsx
- Research path voz: escuchar al interlocutor, fin de turno y decir la respuesta
- Research: onboarding, aprendizaje y memoria del usuario (huella)
- crearEscuchaGroq
- Domain Docs
- Agent skills
- Research: path nucleo-interfaz (Fase 0)
- Lenguaje
- voz/index.ts
- 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano
- 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla
- sonidos.ts

## God Nodes (most connected - your core abstractions)
1. `Research: path llm` - 26 edges
2. `GLOSSARY.md (Parpadeo)` - 26 edges
3. `LineaHistorial` - 25 edges
4. `PedidoOpciones` - 24 edges
5. `reducir()` - 23 edges
6. `iniciarVoz()` - 22 edges
7. `crearCompletado()` - 18 edges
8. `Research: onboarding, aprendizaje y memoria` - 18 edges
9. `react` - 17 edges
10. `Deletrear()` - 17 edges

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

## Communities (45 total, 3 thin omitted)

### Community 0 - "Research: path llm"
Cohesion: 0.11
Nodes (23): claude -p, Gemini Flash free tier, Groq (llama-3.3-70b, structured outputs), I, Robot? (autoetnografia AAC 2025), Propuesta memoria en tres capas (perfil, estilo, hechos), Research: onboarding, aprendizaje y memoria, Generative Agents (Park et al. 2023), Grid 3 (Smartbox) chat history (+15 more)

### Community 1 - "escuchar.ts"
Cohesion: 0.13
Nodes (12): Linea, MonitorBus(), Alternativa, constructor(), crearEscucha(), depuracionEscucha, ERRORES_FATALES, EventoResultado (+4 more)

### Community 2 - "iniciarVoz"
Cohesion: 0.40
Nodes (10): callar(), hablar(), avisarContacto(), esperar(), iniciarVoz(), decir(), empezarHabla(), terminarHabla() (+2 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (42): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+34 more)

### Community 4 - "proveedores.ts"
Cohesion: 0.10
Nodes (23): ai, @anthropic-ai/sdk, completar, esPedido(), POST(), proveedor, esPedido(), POST() (+15 more)

### Community 5 - "react"
Cohesion: 0.22
Nodes (9): react, Conversacion(), Prueba(), Conversacion(), Simulador(), bus, SimuladorOjos(), useNucleo() (+1 more)

### Community 6 - "vencen.test.ts"
Cohesion: 0.21
Nodes (12): candidato(), cerradaEl(), guardar(), guionado(), LINEAS, Objeto, OPCIONES, pedido (+4 more)

### Community 7 - "Research: path voz"
Cohesion: 0.12
Nodes (26): ADR 0002 Voz half-duplex, Reconocimiento de Chrome como base y fallback permanente, Half-duplex (abort() durante aviso y habla), Sin barge-in, Message banking (BCH, Team Gleason), Modelo de estados (escuchando, pensando, opciones, sinConexion, hablando...), Research: path voz, AssemblyAI streaming con speaker_labels (+18 more)

### Community 9 - "llm/tipos.ts"
Cohesion: 0.12
Nodes (23): ref_node_os, ref_node_path, AlmacenEnMemoria, CARPETA_DATOS, memoriaVacia(), ErrorMemoria, cerrada(), despues() (+15 more)

### Community 10 - "memoria.ts"
Cohesion: 0.10
Nodes (37): aTexto(), describirDia(), describirFecha(), deTexto(), Dia, diaDeCalendario(), diaEnArgentina(), DIAS_SEMANA (+29 more)

### Community 11 - "opciones.ts"
Cohesion: 0.13
Nodes (26): abrirConversacion(), armarCerrada(), interlocutorDe(), lineasDeConversacion(), seguirConversacion(), unirLineas(), sumarEjemplos(), actualizarConversacion() (+18 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "CLAUDE.md"
Cohesion: 0.09
Nodes (20): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Next.js 16 breaking changes rule, Triage Labels (+12 more)

### Community 14 - "opciones.test.ts"
Cohesion: 0.15
Nodes (9): armar(), CUATRO, guionado(), T0, CON_TURNO, crearProveedorFalso(), SIN_TURNO, Hecho (+1 more)

### Community 15 - "llm/index.ts"
Cohesion: 0.11
Nodes (31): almacen, CERCANIAS, esLinea(), GET(), memoria, POST(), proveedor, Cercania (+23 more)

### Community 16 - "Deletrear.tsx"
Cohesion: 0.08
Nodes (50): Accion, agregarLetra(), armarFilas(), avanzar(), Barrido, BARRIDO_INICIAL, borrarLetra(), borrarPalabra() (+42 more)

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 20 - "correr.ts"
Cohesion: 0.07
Nodes (40): esLinea(), POST(), Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas() (+32 more)

### Community 22 - "eventos.ts"
Cohesion: 0.07
Nodes (38): fecha(), Hechos, LoQueAprendi(), cerrar(), enviar(), ORIGEN, Medicion, Prueba() (+30 more)

### Community 23 - "Huella"
Cohesion: 0.18
Nodes (11): huella.md (perfil fijo), Few-shot con frases reales del usuario, Onboarding en dos carriles (<10 min), renderHuella(), Drift de estilo, Senales de aprendizaje (opcion, Otra, deletreo, interlocutor), Completado, Huella (+3 more)

### Community 24 - "completado.ts"
Cohesion: 0.13
Nodes (23): ref_node_test, LineaHistorial, crearAlmacenEnMemoria(), CompletarFrase, crearCompletado(), DependenciasCompletado, hechosParaCompletado(), interpretar() (+15 more)

### Community 25 - "GLOSSARY.md (Parpadeo)"
Cohesion: 0.35
Nodes (11): Segmentacion por gap de inactividad + chequeo LLM, Fin de turno por silencio (~1200 ms) + disparo manual, GLOSSARY.md (Parpadeo), Cercania, Interlocutor, Opcion, Opciones fijas, Registro (+3 more)

### Community 26 - "Research: path nucleo-interfaz"
Cohesion: 0.24
Nodes (10): Research: path nucleo-interfaz, Barrido lineal 1,2 s ajustable, Congelar barrido mientras ojos.cerrados, Contador de pedido (descartar respuestas viejas), Diseno para ELA (baja carga cognitiva, sin rojo salvo urgencia), TD Snap QuickFires, Tope de vueltas (Grid 3 / PRC rescans), Barrido (+2 more)

### Community 27 - "ADR 0001 Memoria por usuario"
Cohesion: 0.18
Nodes (13): ADR 0001 Memoria por usuario, .data/ storage en servidor, memoria.json (hechos aprendidos), Reglas del prompt fijas en codigo, Sin base vectorial, Vista 'Lo que aprendi de vos', Extraer de la conversacion cruda, no del resumen, Hibrido JSON en disco + markdown en prompt (+5 more)

### Community 28 - "reductor.ts"
Cohesion: 0.06
Nodes (65): DebugNucleo(), Props, AVISO_CUADRANTE, CeldaProps, FRANJA, mismoElemento(), Pantalla(), Props (+57 more)

### Community 29 - "3. Aprender mientras se usa"
Cohesion: 0.50
Nodes (4): 3. Aprender mientras se usa, Lo clasico en CAA, Memoria de LLMs en general, Que señales de aprendizaje tenemos en Parpadeo

### Community 32 - "Research: path deletrear (Fase 0)"
Cohesion: 0.15
Nodes (12): 1. Disposicion de letras, 2. Prediccion de palabras, 3. Listas de frecuencia de palabras, 4. Bibliotecas npm, 5. Velocidad realista, 6. Correccion de errores, 7. Cosas que cambian el plan del issue, Decisiones del grill (cierran la Fase 0) (+4 more)

### Community 52 - "1. Que dice la investigacion sobre LLMs en CAA"
Cohesion: 0.33
Nodes (6): 1. Que dice la investigacion sobre LLMs en CAA, "I, Robot?" (Weinberg, Valencia y otros, 2025) — LLM ultra personalizado, n=1, SocializeChat (Zhejiang, 2025) — memoria personal + cercania, SpeakFaster (Google, Nature Communications 2024), "The less I type, the better" (Valencia et al., CHI 2023), "Why So Serious?" (CHI 2025)

### Community 54 - "Segunda tanda (pendientes del grill)"
Cohesion: 0.09
Nodes (22): 2.1 Limites de los tiers gratis (solo para dejar anotado), 2.2 Privacidad: alternativas locales para espanol, 2.3 `SpeechRecognition.start(audioTrack)` y eleccion de microfono, 2.4 Voces gratis de `speechSynthesis` en Chrome Windows, 2.5 Microfono para captar una ronda de 3-5 personas, 2.6 Aviso al contacto en urgencia, Comparativa local para espanol, Hallazgos (+14 more)

### Community 55 - "app/page.tsx"
Cohesion: 0.22
Nodes (11): Inicio(), Prueba(), escuchaDisponible(), cargarVoces(), elegirVoz(), PREFERIDAS_LOCAL, PREFERIDAS_RED, voces (+3 more)

### Community 57 - "Research path voz: escuchar al interlocutor, fin de turno y decir la respuesta"
Cohesion: 0.04
Nodes (48): 1. Web Speech API en Chrome con es-AR, 2. Fin de turno, 3.0 Correcciones a las tandas anteriores, 3.1 OpenAI para ESCUCHAR, 3.2 OpenAI para HABLAR, 3.3 Groq para ESCUCHAR, 3.4 Groq para HABLAR, 3.5 Tabla comparativa (+40 more)

### Community 61 - "Research: onboarding, aprendizaje y memoria del usuario (huella)"
Cohesion: 0.17
Nodes (11): 1. Onboarding en AAC personalizada, 2. Aprender durante el uso: que es "esencial" y como consolidar, 3. Segmentacion automatica de conversaciones, 4. Formato de almacenamiento, 5. Riesgos y etica (onboarding y aprendizaje en ELA/AAC), Contradicciones y drift: patrones observados, Implicancias para Parpadeo (hackathon de 5 horas), Investigacion con LLMs (+3 more)

### Community 62 - "crearEscuchaGroq"
Cohesion: 0.20
Nodes (11): Escucha, aWav(), crearEscuchaGroq(), cerrarFrase(), preparar(), procesar(), transcribir(), groqDisponible() (+3 more)

### Community 63 - "Domain Docs"
Cohesion: 0.25
Nodes (8): Before exploring, read these, code:block1 (/), code:block2 (/), Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary, Domain Docs guide

### Community 64 - "Agent skills"
Cohesion: 0.25
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 66 - "Research: path nucleo-interfaz (Fase 0)"
Cohesion: 0.25
Nodes (7): 1. Barrido en CAA, 2. Diseno para ELA, 3. Sistemas comerciales, 4. Posicion de las opciones: fija o por probabilidad, 5. Modelo de estados del nucleo, Decisiones del grill (2026-11-07), Research: path nucleo-interfaz (Fase 0)

### Community 69 - "Lenguaje"
Cohesion: 0.33
Nodes (5): Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 70 - "voz/index.ts"
Cohesion: 0.29
Nodes (8): CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, ADR-0002, cerrarTurno(), registrarCierre()

### Community 71 - "0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano"
Cohesion: 0.40
Nodes (4): 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano, Consecuencias, Contexto, Decision

### Community 72 - "0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla"
Cohesion: 0.40
Nodes (4): 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla, Consecuencias, Contexto, Decision

### Community 74 - "sonidos.ts"
Cohesion: 0.38
Nodes (9): activos, campana(), ctx(), esperar(), PARCIALES, salidaCampana(), sonarAlarma(), sonarAviso() (+1 more)

## Knowledge Gaps
- **308 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+303 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 367 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `escuchar.ts`, `package.json`, `voz/index.ts`, `Deletrear.tsx`, `eventos.ts`, `app/page.tsx`, `reductor.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `PedidoOpciones` connect `eventos.ts` to `proveedores.ts`, `react`, `vencen.test.ts`, `opciones.ts`, `opciones.test.ts`, `llm/index.ts`, `Deletrear.tsx`, `completado.ts`, `reductor.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `LineaHistorial` connect `completado.ts` to `react`, `vencen.test.ts`, `voz/index.ts`, `llm/tipos.ts`, `memoria.ts`, `opciones.ts`, `llm/index.ts`, `Deletrear.tsx`, `correr.ts`, `eventos.ts`, `reductor.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _308 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Research: path llm` be split into smaller, more focused modules?**
  _Cohesion score 0.10869565217391304 - nodes in this community are weakly interconnected._
- **Should `escuchar.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._