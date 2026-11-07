# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 114 files · ~116,871 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 1232 nodes · 2656 edges · 76 communities (70 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `04c82efb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research: path llm
- huella.ts
- niveles.test.ts
- package.json
- servidor.ts
- app/page.tsx
- opciones.ts
- Research: path voz
- saliencia.test.ts
- memoria.test.ts
- fechas.ts
- enFila
- compilerOptions
- CLAUDE.md
- memoria.ts
- ref_node_fs
- Deletrear.tsx
- urgencia/route.ts
- Research path voz: escuchar al interlocutor, fin de turno y decir la respuesta
- huella.test.ts
- eslint.config.mjs
- cliente.ts
- GLOSSARY.md (Parpadeo)
- completado.ts
- elecciones.ts
- Research: path nucleo-interfaz
- ADR 0001 Memoria por usuario
- reductor.ts
- 3. Aprender mientras se usa
- ref_node_assert
- Huella
- Research: path deletrear (Fase 0)
- medir-latencias.ts
- almacen-archivos.ts
- transcribir/route.ts
- interlocutor.ts
- deletrear/route.ts
- hechosVigentes
- motor.ts
- llm/tipos.ts
- 1. Que dice la investigacion sobre LLMs en CAA
- proveedores.ts
- Segunda tanda (pendientes del grill)
- Research: onboarding, aprendizaje y memoria del usuario (huella)
- Domain Docs
- Agent skills
- Research: path nucleo-interfaz (Fase 0)
- Tercera tanda: OpenAI y Groq contra Google
- GLOSSARY.md
- 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano
- 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla
- Cuarta tanda: que reconocedor usar (escuchar)
- llm/index.ts
- armar
- 2.6 Aviso al contacto en urgencia
- 3. Alternativas de reconocimiento
- 4. Voces para decir en voz alta
- correr.ts
- voz/index.ts
- completar/route.ts
- 5. Banco de voz y clonacion para ELA
- vencen.test.ts
- reductor.test.ts
- eventos.ts
- 2.2 Privacidad: alternativas locales para espanol
- Pantalla.tsx
- CLAUDE.md
- Agent skills
- Agent skills
- Agent skills
- Agent skills
- Agent skills
- crearNucleo
- 1. Web Speech API en Chrome con es-AR
- 6. Eco y barge-in

## God Nodes (most connected - your core abstractions)
1. `LineaHistorial` - 26 edges
2. `Research: path llm` - 26 edges
3. `GLOSSARY.md (Parpadeo)` - 26 edges
4. `PedidoOpciones` - 25 edges
5. `crearOpciones()` - 24 edges
6. `reducir()` - 23 edges
7. `crearAlmacenEnMemoria()` - 22 edges
8. `iniciarVoz()` - 22 edges
9. `crearCompletado()` - 20 edges
10. `crearDisparadorMemoria()` - 19 edges

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

## Communities (76 total, 5 thin omitted)

### Community 0 - "Research: path llm"
Cohesion: 0.10
Nodes (24): claude -p, Gemini Flash free tier, Groq (llama-3.3-70b, structured outputs), Propuesta memoria en tres capas (perfil, estilo, hechos), Research: onboarding, aprendizaje y memoria, Generative Agents (Park et al. 2023), Grid 3 (Smartbox) chat history, MemGPT / Letta memory blocks (+16 more)

### Community 1 - "huella.ts"
Cohesion: 0.11
Nodes (35): esLinea(), GET(), loAprendido(), POST(), listarHechos(), estaVencido(), aceptarHuella(), bloquesPorId() (+27 more)

### Community 2 - "niveles.test.ts"
Cohesion: 0.08
Nodes (27): armar(), rollupGuionado(), crearDisparadorMemoria(), consolidar(), consolidarAhora(), correr(), disparar(), agenteMudo (+19 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (42): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+34 more)

### Community 4 - "servidor.ts"
Cohesion: 0.31
Nodes (8): crearAlmacenEnArchivos(), directo(), crearOpcionesConMemoria(), elegirProveedor(), elegirProveedorRollup(), CHEQUEO_CIERRE_MS, conLlm, crearServidorLlm()

### Community 5 - "app/page.tsx"
Cohesion: 0.16
Nodes (13): react, Conversacion(), Inicio(), Prueba(), Conversacion(), Simulador(), bus, DebugNucleo() (+5 more)

### Community 6 - "opciones.ts"
Cohesion: 0.13
Nodes (23): aliasHecho(), crearOpciones(), Deteccion, detectarConversacion(), ErrorOpciones, INTENCIONES, interpretarHechos(), interpretarRespuesta() (+15 more)

### Community 7 - "Research: path voz"
Cohesion: 0.13
Nodes (24): ADR 0002 Voz half-duplex, Reconocimiento de Chrome como base y fallback permanente, Half-duplex (abort() durante aviso y habla), Sin barge-in, Modelo de estados (escuchando, pensando, opciones, sinConexion, hablando...), Research: path voz, AssemblyAI streaming con speaker_labels, Azure Neural es-AR-ElenaNeural / TomasNeural (+16 more)

### Community 8 - "saliencia.test.ts"
Cohesion: 0.11
Nodes (18): Eleccion, Fija, FIJAS, MAX_MOSTRADAS, PASO_SALIENCIA, registrarEleccion(), SALIENCIA_INICIAL, SALIENCIA_TOPE (+10 more)

### Community 9 - "memoria.test.ts"
Cohesion: 0.09
Nodes (22): LineaHistorial, AlmacenEnMemoria, memoriaVacia(), ErrorMemoria, cerrada(), despues(), generar(), LINEAS (+14 more)

### Community 10 - "fechas.ts"
Cohesion: 0.14
Nodes (25): fechaDelEvento(), aTexto(), describirDia(), describirFecha(), describirMomento(), deTexto(), Dia, diaDeCalendario() (+17 more)

### Community 11 - "enFila"
Cohesion: 0.24
Nodes (17): lineasDeLaConversacionActual(), abrirConversacion(), armarCerrada(), completarCerrada(), conTurnoPendiente(), interlocutorDe(), lineasDeConversacion(), seguirConversacion() (+9 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "CLAUDE.md"
Cohesion: 0.07
Nodes (26): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Next.js 16 breaking changes rule, Triage Labels (+18 more)

### Community 14 - "memoria.ts"
Cohesion: 0.14
Nodes (20): Accion, ACCIONES, ActualizarMemoria, camposDeTiempo(), Candidato, crearAgenteMemoria(), DependenciasMemoria, interpretar() (+12 more)

### Community 16 - "Deletrear.tsx"
Cohesion: 0.08
Nodes (50): Accion, agregarLetra(), armarFilas(), avanzar(), Barrido, BARRIDO_INICIAL, borrarLetra(), borrarPalabra() (+42 more)

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 18 - "Research path voz: escuchar al interlocutor, fin de turno y decir la respuesta"
Cohesion: 0.15
Nodes (12): 2. Fin de turno, 7. Ruido ambiente y microfono, 8. Diarizacion, Hallazgos, Hallazgos, Hallazgos, Preguntas abiertas para el grill, Recomendacion (+4 more)

### Community 20 - "huella.test.ts"
Cohesion: 0.12
Nodes (14): agenteMudo, DIA_30, DIA_31, generar(), HUELLA_DE_OCTUBRE, LINEAS, LUNES_2, MEMORIA_DE_OCTUBRE (+6 more)

### Community 22 - "cliente.ts"
Cohesion: 0.06
Nodes (47): fecha(), fuentes(), LoQueAprendi(), cerrar(), consolidar(), decidirHuella(), enviar(), Medicion (+39 more)

### Community 23 - "GLOSSARY.md (Parpadeo)"
Cohesion: 0.30
Nodes (12): I, Robot? (autoetnografia AAC 2025), Segmentacion por gap de inactividad + chequeo LLM, Fin de turno por silencio (~1200 ms) + disparo manual, GLOSSARY.md (Parpadeo), Cercania, Interlocutor, Opcion, Opciones fijas (+4 more)

### Community 24 - "completado.ts"
Cohesion: 0.15
Nodes (19): crearAlmacenEnMemoria(), CompletarFrase, crearCompletado(), DependenciasCompletado, interpretar(), normalizar(), promptSistema(), renderLinea() (+11 more)

### Community 25 - "elecciones.ts"
Cohesion: 0.23
Nodes (12): almacen, GET(), POST(), crearAlmacenEleccionesEnMemoria(), Eleccion, EleccionInvalida, esPedidoEleccion(), PedidoEleccion (+4 more)

### Community 26 - "Research: path nucleo-interfaz"
Cohesion: 0.24
Nodes (10): Research: path nucleo-interfaz, Barrido lineal 1,2 s ajustable, Congelar barrido mientras ojos.cerrados, Contador de pedido (descartar respuestas viejas), Diseno para ELA (baja carga cognitiva, sin rojo salvo urgencia), TD Snap QuickFires, Tope de vueltas (Grid 3 / PRC rescans), Barrido (+2 more)

### Community 27 - "ADR 0001 Memoria por usuario"
Cohesion: 0.18
Nodes (13): ADR 0001 Memoria por usuario, .data/ storage en servidor, memoria.json (hechos aprendidos), Reglas del prompt fijas en codigo, Sin base vectorial, Vista 'Lo que aprendi de vos', Extraer de la conversacion cruda, no del resumen, Hibrido JSON en disco + markdown en prompt (+5 more)

### Community 28 - "reductor.ts"
Cohesion: 0.19
Nodes (18): aceptarAcumulado(), activarUrgencia(), barridoDetenido(), Ctx, decir(), descartarAcumulado(), ejecutar(), esperarHabla() (+10 more)

### Community 29 - "3. Aprender mientras se usa"
Cohesion: 0.50
Nodes (4): 3. Aprender mientras se usa, Lo clasico en CAA, Memoria de LLMs en general, Que señales de aprendizaje tenemos en Parpadeo

### Community 31 - "Huella"
Cohesion: 0.18
Nodes (11): huella.md (perfil fijo), Few-shot con frases reales del usuario, Onboarding en dos carriles (<10 min), renderHuella(), Drift de estilo, Senales de aprendizaje (opcion, Otra, deletreo, interlocutor), Completado, Huella (+3 more)

### Community 32 - "Research: path deletrear (Fase 0)"
Cohesion: 0.15
Nodes (12): 1. Disposicion de letras, 2. Prediccion de palabras, 3. Listas de frecuencia de palabras, 4. Bibliotecas npm, 5. Velocidad realista, 6. Correccion de errores, 7. Cosas que cambian el plan del issue, Decisiones del grill (cierran la Fase 0) (+4 more)

### Community 33 - "medir-latencias.ts"
Cohesion: 0.25
Nodes (10): ref_node_os, Cercania, armarPedido(), Llamar, main(), mediana(), Medido, medir() (+2 more)

### Community 34 - "almacen-archivos.ts"
Cohesion: 0.38
Nodes (5): ref_node_path, CARPETA_DATOS, AlmacenElecciones, crearAlmacenEleccionesEnArchivos(), RegistroEleccion

### Community 36 - "interlocutor.ts"
Cohesion: 0.62
Nodes (6): buscarEnHuella(), conMayuscula(), esElUsuario(), nombreUsuario(), normalizar(), validarInterlocutorProbable()

### Community 37 - "deletrear/route.ts"
Cohesion: 0.60
Nodes (4): esPedido(), POST(), predecir, proveedor

### Community 38 - "hechosVigentes"
Cohesion: 0.67
Nodes (4): hechosParaCompletado(), hechosVigentes(), hechosParaPrompt(), pesoDe()

### Community 44 - "motor.ts"
Cohesion: 0.11
Nodes (21): Opcion, Props, ACUMULADO_VENCE_MS, CONFIRMACION_FALSA_ALARMA_MS, GESTO_URGENCIA_MS, LECTURA_MAXIMO_MS, LeerTurno, MAXIMO_ESPERA_HABLA_MS (+13 more)

### Community 48 - "llm/tipos.ts"
Cohesion: 0.09
Nodes (27): ConFuentes, Corte, diaDe(), fechaBloque(), Hechos, Huella, LARGO, ORIGEN (+19 more)

### Community 52 - "1. Que dice la investigacion sobre LLMs en CAA"
Cohesion: 0.33
Nodes (6): 1. Que dice la investigacion sobre LLMs en CAA, "I, Robot?" (Weinberg, Valencia y otros, 2025) — LLM ultra personalizado, n=1, SocializeChat (Zhejiang, 2025) — memoria personal + cercania, SpeakFaster (Google, Nature Communications 2024), "The less I type, the better" (Valencia et al., CHI 2023), "Why So Serious?" (CHI 2025)

### Community 53 - "proveedores.ts"
Cohesion: 0.15
Nodes (15): ai, @anthropic-ai/sdk, ref_node_test, ESQUEMA_RESPUESTA, MAX_TOKENS, crearProveedorAnthropic(), MODELO_ANTHROPIC, crearProveedorGateway() (+7 more)

### Community 54 - "Segunda tanda (pendientes del grill)"
Cohesion: 0.14
Nodes (14): 2.1 Limites de los tiers gratis (solo para dejar anotado), 2.3 `SpeechRecognition.start(audioTrack)` y eleccion de microfono, 2.4 Voces gratis de `speechSynthesis` en Chrome Windows, 2.5 Microfono para captar una ronda de 3-5 personas, Hallazgos, Hallazgos, Hallazgos, Hallazgos (+6 more)

### Community 61 - "Research: onboarding, aprendizaje y memoria del usuario (huella)"
Cohesion: 0.17
Nodes (11): 1. Onboarding en AAC personalizada, 2. Aprender durante el uso: que es "esencial" y como consolidar, 3. Segmentacion automatica de conversaciones, 4. Formato de almacenamiento, 5. Riesgos y etica (onboarding y aprendizaje en ELA/AAC), Contradicciones y drift: patrones observados, Implicancias para Parpadeo (hackathon de 5 horas), Investigacion con LLMs (+3 more)

### Community 63 - "Domain Docs"
Cohesion: 0.25
Nodes (8): Before exploring, read these, code:block1 (/), code:block2 (/), Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary, Domain Docs guide

### Community 64 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 66 - "Research: path nucleo-interfaz (Fase 0)"
Cohesion: 0.25
Nodes (7): 1. Barrido en CAA, 2. Diseno para ELA, 3. Sistemas comerciales, 4. Posicion de las opciones: fija o por probabilidad, 5. Modelo de estados del nucleo, Decisiones del grill (2026-11-07), Research: path nucleo-interfaz (Fase 0)

### Community 67 - "Tercera tanda: OpenAI y Groq contra Google"
Cohesion: 0.15
Nodes (13): 3.0 Correcciones a las tandas anteriores, 3.1 OpenAI para ESCUCHAR, 3.2 OpenAI para HABLAR, 3.3 Groq para ESCUCHAR, 3.4 Groq para HABLAR, 3.5 Tabla comparativa, 3.6 Recomendacion, 3.7 Lo que no se pudo verificar (+5 more)

### Community 69 - "GLOSSARY.md"
Cohesion: 0.05
Nodes (41): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion, Conversacion, Lenguaje (+33 more)

### Community 71 - "0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano"
Cohesion: 0.40
Nodes (4): 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano, Consecuencias, Contexto, Decision

### Community 72 - "0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla"
Cohesion: 0.40
Nodes (4): 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla, Consecuencias, Contexto, Decision

### Community 75 - "Cuarta tanda: que reconocedor usar (escuchar)"
Cohesion: 0.29
Nodes (7): 4.0 Correcciones a las tandas anteriores, 4.1 Rankings publicos de precision, 4.2 Proveedores con streaming en espanol, 4.3 Tabla comparativa (escuchar), 4.4 Recomendacion, 4.5 Lo que no se pudo verificar, Cuarta tanda: que reconocedor usar (escuchar)

### Community 76 - "llm/index.ts"
Cohesion: 0.08
Nodes (47): huellaParaPrompt(), SALIDA_HUELLA, armar(), bloqueDe(), BloquesDeHoy, citaIntimo(), CORTES, crearNiveles() (+39 more)

### Community 79 - "2.6 Aviso al contacto en urgencia"
Cohesion: 0.50
Nodes (4): 2.6 Aviso al contacto en urgencia, Hallazgos, Recomendacion, Tabla

### Community 80 - "3. Alternativas de reconocimiento"
Cohesion: 0.50
Nodes (4): 3. Alternativas de reconocimiento, Hallazgos, Recomendacion, Tabla comparativa

### Community 85 - "4. Voces para decir en voz alta"
Cohesion: 0.67
Nodes (3): 4. Voces para decir en voz alta, Hallazgos, Recomendacion

### Community 99 - "correr.ts"
Cohesion: 0.07
Nodes (42): esLinea(), POST(), Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas() (+34 more)

### Community 102 - "voz/index.ts"
Cohesion: 0.06
Nodes (58): Prueba(), CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, Alternativa, constructor() (+50 more)

### Community 103 - "completar/route.ts"
Cohesion: 0.31
Nodes (7): completar, POST(), proveedor, POST(), TipoTurno, esPedido(), TIPOS_TURNO

### Community 111 - "5. Banco de voz y clonacion para ELA"
Cohesion: 0.67
Nodes (3): 5. Banco de voz y clonacion para ELA, Hallazgos, Recomendacion

### Community 115 - "vencen.test.ts"
Cohesion: 0.21
Nodes (12): candidato(), cerradaEl(), guardar(), guionado(), LINEAS, Objeto, OPCIONES, pedido (+4 more)

### Community 116 - "reductor.test.ts"
Cohesion: 0.32
Nodes (11): elementosBarrido(), reducir(), aplicar(), conOpciones(), deletreando(), despuesDeDecirSi(), enUrgencia(), fragmentoLeido() (+3 more)

### Community 119 - "eventos.ts"
Cohesion: 0.22
Nodes (8): Medicion, PREFIJOS_DE_PRUEBA, Eventos, Handler, handlers, Intencion, PedidoOpciones, Perfil

### Community 120 - "2.2 Privacidad: alternativas locales para espanol"
Cohesion: 0.50
Nodes (4): 2.2 Privacidad: alternativas locales para espanol, Comparativa local para espanol, Hallazgos, Recomendacion

### Community 123 - "Pantalla.tsx"
Cohesion: 0.24
Nodes (8): AVISO_CUADRANTE, CeldaProps, FRANJA, mismoElemento(), Pantalla(), Props, historialPrevio(), pedidoActual()

### Community 128 - "CLAUDE.md"
Cohesion: 0.25
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 129 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 130 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 131 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 132 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 133 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 134 - "crearNucleo"
Cohesion: 0.60
Nodes (5): crearNucleo(), despachar(), ejecutar(), leer(), reiniciarTick()

### Community 136 - "1. Web Speech API en Chrome con es-AR"
Cohesion: 0.67
Nodes (3): 1. Web Speech API en Chrome con es-AR, Hallazgos, Recomendacion

### Community 137 - "6. Eco y barge-in"
Cohesion: 0.67
Nodes (3): 6. Eco y barge-in, Hallazgos, Recomendacion

## Knowledge Gaps
- **416 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+411 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 490 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `app/page.tsx` to `package.json`, `voz/index.ts`, `motor.ts`, `llm/tipos.ts`, `Deletrear.tsx`, `cliente.ts`, `eventos.ts`, `Pantalla.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `LineaHistorial` connect `memoria.test.ts` to `huella.ts`, `medir-latencias.ts`, `correr.ts`, `niveles.test.ts`, `app/page.tsx`, `opciones.ts`, `voz/index.ts`, `enFila`, `motor.ts`, `memoria.ts`, `llm/tipos.ts`, `Deletrear.tsx`, `vencen.test.ts`, `huella.test.ts`, `cliente.ts`, `eventos.ts`, `completado.ts`, `reductor.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `PedidoOpciones` connect `eventos.ts` to `medir-latencias.ts`, `app/page.tsx`, `deletrear/route.ts`, `opciones.ts`, `completar/route.ts`, `memoria.test.ts`, `saliencia.test.ts`, `enFila`, `motor.ts`, `Deletrear.tsx`, `vencen.test.ts`, `cliente.ts`, `completado.ts`, `reductor.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _416 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Research: path llm` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `huella.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11379800853485064 - nodes in this community are weakly interconnected._
- **Should `niveles.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07862903225806452 - nodes in this community are weakly interconnected._