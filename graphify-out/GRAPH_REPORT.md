# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 100 files · ~100,917 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 961 nodes · 1942 edges · 53 communities (50 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b7a3e282`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research: path llm
- voz/index.ts
- 4. Módulos en detalle
- package.json
- proveedores.ts
- react
- vencen.test.ts
- Research: path voz
- reductor.ts
- llm/tipos.ts
- memoria.ts
- opciones.ts
- compilerOptions
- CLAUDE.md
- llm/index.ts
- medir-latencias.ts
- Deletrear.tsx
- urgencia/route.ts
- Tercera tanda: OpenAI y Groq contra Google
- correr.ts
- eslint.config.mjs
- eventos.ts
- Huella
- completado.ts
- GLOSSARY.md (Parpadeo)
- Research: path nucleo-interfaz
- ADR 0001 Memoria por usuario
- motor.ts
- 3. Aprender mientras se usa
- reductor.test.ts
- Pantalla.tsx
- Research: path deletrear (Fase 0)
- Cuarta tanda: que reconocedor usar (escuchar)
- crearNucleo
- transcribir/route.ts
- 2.6 Aviso al contacto en urgencia
- 3. Alternativas de reconocimiento
- 2.3 `SpeechRecognition.start(audioTrack)` y eleccion de microfono
- 2. Fin de turno
- 4. Voces para decir en voz alta
- 7. Ruido ambiente y microfono
- 8. Diarizacion
- 1. Que dice la investigacion sobre LLMs en CAA
- Segunda tanda (pendientes del grill)
- Research path voz: escuchar al interlocutor, fin de turno y decir la respuesta
- Research: onboarding, aprendizaje y memoria del usuario (huella)
- Domain Docs
- Agent skills
- Research: path nucleo-interfaz (Fase 0)
- Lenguaje
- 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano
- 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla

## God Nodes (most connected - your core abstractions)
1. `Research: path llm` - 26 edges
2. `GLOSSARY.md (Parpadeo)` - 26 edges
3. `PedidoOpciones` - 24 edges
4. `LineaHistorial` - 24 edges
5. `reducir()` - 23 edges
6. `iniciarVoz()` - 22 edges
7. `crearCompletado()` - 18 edges
8. `Research: onboarding, aprendizaje y memoria` - 18 edges
9. `Deletrear()` - 17 edges
10. `compilerOptions` - 17 edges

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

## Communities (53 total, 3 thin omitted)

### Community 0 - "Research: path llm"
Cohesion: 0.11
Nodes (21): claude -p, Gemini Flash free tier, Groq (llama-3.3-70b, structured outputs), I, Robot? (autoetnografia AAC 2025), Propuesta memoria en tres capas (perfil, estilo, hechos), Research: onboarding, aprendizaje y memoria, Generative Agents (Park et al. 2023), Grid 3 (Smartbox) chat history (+13 more)

### Community 1 - "voz/index.ts"
Cohesion: 0.06
Nodes (61): Inicio(), Prueba(), Linea, MonitorBus(), CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla() (+53 more)

### Community 2 - "4. Módulos en detalle"
Cohesion: 0.04
Nodes (45): 1. Contexto y alcance, 2. Arquitectura, 3. Modelo de datos, 4.10 `consolidate`, 4.11 `metrics`, 4.1 `capture`: escucha y fin de turno, 4.2 `memory`: almacenamiento y recuperación, 4.3 `embedder` (+37 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (43): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+35 more)

### Community 4 - "proveedores.ts"
Cohesion: 0.11
Nodes (21): completar, esPedido(), POST(), proveedor, esPedido(), POST(), predecir, proveedor (+13 more)

### Community 5 - "react"
Cohesion: 0.22
Nodes (9): react, Conversacion(), Prueba(), Conversacion(), Simulador(), bus, SimuladorOjos(), useNucleo() (+1 more)

### Community 6 - "vencen.test.ts"
Cohesion: 0.21
Nodes (12): candidato(), cerradaEl(), guardar(), guionado(), LINEAS, Objeto, OPCIONES, pedido (+4 more)

### Community 7 - "Research: path voz"
Cohesion: 0.12
Nodes (21): ADR 0002 Voz half-duplex, Message banking (BCH, Team Gleason), Modelo de estados (escuchando, pensando, opciones, sinConexion, hablando...), Research: path voz, AssemblyAI streaming con speaker_labels, Azure Neural es-AR-ElenaNeural / TomasNeural, Bug de corte ~15 s de voces Google, Chrome recognition sin cancelacion de eco (Chromium source) (+13 more)

### Community 8 - "reductor.ts"
Cohesion: 0.18
Nodes (23): aceptarAcumulado(), activarUrgencia(), barridoDetenido(), Ctx, decir(), descartarAcumulado(), ejecutar(), esperarHabla() (+15 more)

### Community 9 - "llm/tipos.ts"
Cohesion: 0.13
Nodes (21): AlmacenEnMemoria, memoriaVacia(), ErrorMemoria, cerrada(), despues(), generar(), LINEAS, memoria() (+13 more)

### Community 10 - "memoria.ts"
Cohesion: 0.11
Nodes (36): aTexto(), describirDia(), describirFecha(), deTexto(), Dia, diaDeCalendario(), diaEnArgentina(), DIAS_SEMANA (+28 more)

### Community 11 - "opciones.ts"
Cohesion: 0.08
Nodes (42): abrirConversacion(), armarCerrada(), completarCerrada(), conTurnoPendiente(), interlocutorDe(), lineasDeConversacion(), seguirConversacion(), sumarLineas() (+34 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "CLAUDE.md"
Cohesion: 0.09
Nodes (16): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Triage Labels, src/eventos.ts contrato compartido (+8 more)

### Community 14 - "llm/index.ts"
Cohesion: 0.12
Nodes (23): esLinea(), GET(), POST(), esPedido(), POST(), CARPETA_DATOS, CompletarFrase, DependenciasCompletado (+15 more)

### Community 15 - "medir-latencias.ts"
Cohesion: 0.14
Nodes (15): crearAlmacenEnArchivos(), armarPedido(), directo(), Llamar, main(), mediana(), Medido, medir() (+7 more)

### Community 16 - "Deletrear.tsx"
Cohesion: 0.09
Nodes (50): Accion, agregarLetra(), armarFilas(), avanzar(), Barrido, BARRIDO_INICIAL, borrarLetra(), borrarPalabra() (+42 more)

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 18 - "Tercera tanda: OpenAI y Groq contra Google"
Cohesion: 0.15
Nodes (13): 3.0 Correcciones a las tandas anteriores, 3.1 OpenAI para ESCUCHAR, 3.2 OpenAI para HABLAR, 3.3 Groq para ESCUCHAR, 3.4 Groq para HABLAR, 3.5 Tabla comparativa, 3.6 Recomendacion, 3.7 Lo que no se pudo verificar (+5 more)

### Community 20 - "correr.ts"
Cohesion: 0.08
Nodes (39): esLinea(), POST(), Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas() (+31 more)

### Community 22 - "eventos.ts"
Cohesion: 0.07
Nodes (40): fecha(), Hechos, LoQueAprendi(), cerrar(), enviar(), ORIGEN, Medicion, Prueba() (+32 more)

### Community 23 - "Huella"
Cohesion: 0.18
Nodes (8): huella.md (perfil fijo), renderHuella(), Senales de aprendizaje (opcion, Otra, deletreo, interlocutor), Completado, Huella, Memoria larga, Onboarding, Perfil

### Community 24 - "completado.ts"
Cohesion: 0.23
Nodes (15): crearAlmacenEnMemoria(), crearCompletado(), hechosParaCompletado(), interpretar(), lineasDeLaConversacionActual(), normalizar(), promptSistema(), renderLinea() (+7 more)

### Community 25 - "GLOSSARY.md (Parpadeo)"
Cohesion: 0.35
Nodes (10): Segmentacion por gap de inactividad + chequeo LLM, GLOSSARY.md (Parpadeo), Cercania, Interlocutor, Opcion, Opciones fijas, Registro, Respuesta (+2 more)

### Community 26 - "Research: path nucleo-interfaz"
Cohesion: 0.24
Nodes (7): Research: path nucleo-interfaz, Contador de pedido (descartar respuestas viejas), TD Snap QuickFires, Tope de vueltas (Grid 3 / PRC rescans), Barrido, Parpadeo largo, Pausa del barrido

### Community 27 - "ADR 0001 Memoria por usuario"
Cohesion: 0.18
Nodes (9): ADR 0001 Memoria por usuario, .data/ storage en servidor, memoria.json (hechos aprendidos), Vista 'Lo que aprendi de vos', Mem0 (ADD/UPDATE/DELETE/NOOP), Multi-Session Chat (Xu et al. 2022), Agente de memoria, Hecho (+1 more)

### Community 28 - "motor.ts"
Cohesion: 0.11
Nodes (22): LineaHistorial, DebugNucleo(), Props, ACUMULADO_VENCE_MS, CONFIRMACION_FALSA_ALARMA_MS, GESTO_URGENCIA_MS, LECTURA_MAXIMO_MS, LeerTurno (+14 more)

### Community 29 - "3. Aprender mientras se usa"
Cohesion: 0.50
Nodes (4): 3. Aprender mientras se usa, Lo clasico en CAA, Memoria de LLMs en general, Que señales de aprendizaje tenemos en Parpadeo

### Community 30 - "reductor.test.ts"
Cohesion: 0.27
Nodes (10): elementosBarrido(), aplicar(), conOpciones(), deletreando(), despuesDeDecirSi(), enUrgencia(), fragmentoLeido(), iluminar() (+2 more)

### Community 31 - "Pantalla.tsx"
Cohesion: 0.20
Nodes (8): VELOCIDAD_DELETREO_MS, AVISO_CUADRANTE, CeldaProps, FRANJA, mismoElemento(), Pantalla(), Props, ElementoFijo

### Community 32 - "Research: path deletrear (Fase 0)"
Cohesion: 0.15
Nodes (12): 1. Disposicion de letras, 2. Prediccion de palabras, 3. Listas de frecuencia de palabras, 4. Bibliotecas npm, 5. Velocidad realista, 6. Correccion de errores, 7. Cosas que cambian el plan del issue, Decisiones del grill (cierran la Fase 0) (+4 more)

### Community 33 - "Cuarta tanda: que reconocedor usar (escuchar)"
Cohesion: 0.29
Nodes (7): 4.0 Correcciones a las tandas anteriores, 4.1 Rankings publicos de precision, 4.2 Proveedores con streaming en espanol, 4.3 Tabla comparativa (escuchar), 4.4 Recomendacion, 4.5 Lo que no se pudo verificar, Cuarta tanda: que reconocedor usar (escuchar)

### Community 34 - "crearNucleo"
Cohesion: 0.48
Nodes (6): nombreUsuario(), crearNucleo(), despachar(), ejecutar(), leer(), reiniciarTick()

### Community 36 - "2.6 Aviso al contacto en urgencia"
Cohesion: 0.50
Nodes (4): 2.6 Aviso al contacto en urgencia, Hallazgos, Recomendacion, Tabla

### Community 37 - "3. Alternativas de reconocimiento"
Cohesion: 0.50
Nodes (4): 3. Alternativas de reconocimiento, Hallazgos, Recomendacion, Tabla comparativa

### Community 38 - "2.3 `SpeechRecognition.start(audioTrack)` y eleccion de microfono"
Cohesion: 0.67
Nodes (3): 2.3 `SpeechRecognition.start(audioTrack)` y eleccion de microfono, Hallazgos, Recomendacion

### Community 39 - "2. Fin de turno"
Cohesion: 0.67
Nodes (3): 2. Fin de turno, Hallazgos, Recomendacion

### Community 40 - "4. Voces para decir en voz alta"
Cohesion: 0.67
Nodes (3): 4. Voces para decir en voz alta, Hallazgos, Recomendacion

### Community 41 - "7. Ruido ambiente y microfono"
Cohesion: 0.67
Nodes (3): 7. Ruido ambiente y microfono, Hallazgos, Recomendacion

### Community 42 - "8. Diarizacion"
Cohesion: 0.67
Nodes (3): 8. Diarizacion, Hallazgos, Recomendacion

### Community 52 - "1. Que dice la investigacion sobre LLMs en CAA"
Cohesion: 0.33
Nodes (6): 1. Que dice la investigacion sobre LLMs en CAA, "I, Robot?" (Weinberg, Valencia y otros, 2025) — LLM ultra personalizado, n=1, SocializeChat (Zhejiang, 2025) — memoria personal + cercania, SpeakFaster (Google, Nature Communications 2024), "The less I type, the better" (Valencia et al., CHI 2023), "Why So Serious?" (CHI 2025)

### Community 54 - "Segunda tanda (pendientes del grill)"
Cohesion: 0.13
Nodes (15): 2.1 Limites de los tiers gratis (solo para dejar anotado), 2.2 Privacidad: alternativas locales para espanol, 2.4 Voces gratis de `speechSynthesis` en Chrome Windows, 2.5 Microfono para captar una ronda de 3-5 personas, Comparativa local para espanol, Hallazgos, Hallazgos, Hallazgos (+7 more)

### Community 57 - "Research path voz: escuchar al interlocutor, fin de turno y decir la respuesta"
Cohesion: 0.15
Nodes (12): 1. Web Speech API en Chrome con es-AR, 5. Banco de voz y clonacion para ELA, 6. Eco y barge-in, Hallazgos, Hallazgos, Hallazgos, Preguntas abiertas para el grill, Recomendacion (+4 more)

### Community 61 - "Research: onboarding, aprendizaje y memoria del usuario (huella)"
Cohesion: 0.17
Nodes (11): 1. Onboarding en AAC personalizada, 2. Aprender durante el uso: que es "esencial" y como consolidar, 3. Segmentacion automatica de conversaciones, 4. Formato de almacenamiento, 5. Riesgos y etica (onboarding y aprendizaje en ELA/AAC), Contradicciones y drift: patrones observados, Implicancias para Parpadeo (hackathon de 5 horas), Investigacion con LLMs (+3 more)

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

### Community 71 - "0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano"
Cohesion: 0.40
Nodes (4): 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano, Consecuencias, Contexto, Decision

### Community 72 - "0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla"
Cohesion: 0.40
Nodes (4): 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla, Consecuencias, Contexto, Decision

## Knowledge Gaps
- **31 isolated node(s):** `ADR-0002`, `eslint`, `eslint-config-next`, `@google/genai`, `groq-sdk` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 399 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `voz/index.ts`, `package.json`, `Deletrear.tsx`, `eventos.ts`, `motor.ts`, `Pantalla.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `ADR-0002`, `eslint`, `eslint-config-next` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Research: path llm` be split into smaller, more focused modules?**
  _Cohesion score 0.10869565217391304 - nodes in this community are weakly interconnected._
- **Why does `LineaHistorial` connect `motor.ts` to `voz/index.ts`, `react`, `vencen.test.ts`, `reductor.ts`, `llm/tipos.ts`, `memoria.ts`, `opciones.ts`, `llm/index.ts`, `medir-latencias.ts`, `Deletrear.tsx`, `correr.ts`, `eventos.ts`, `completado.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `voz/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05561105561105561 - nodes in this community are weakly interconnected._
- **Why does `PedidoOpciones` connect `eventos.ts` to `proveedores.ts`, `react`, `vencen.test.ts`, `reductor.ts`, `opciones.ts`, `llm/index.ts`, `medir-latencias.ts`, `Deletrear.tsx`, `completado.ts`, `motor.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `4. Módulos en detalle` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._