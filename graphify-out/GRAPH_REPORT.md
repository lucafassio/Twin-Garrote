# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 116 files · ~123,300 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 1321 nodes · 2860 edges · 88 communities (83 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eefca3b3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research: path llm
- huella.ts
- niveles.test.ts
- package.json
- fechas.ts
- eventos.ts
- opciones.ts
- Research: path voz
- saliencia.test.ts
- memoria.test.ts
- memoria.ts
- iniciarVoz
- compilerOptions
- CLAUDE.md
- elecciones.ts
- ref_node_fs
- Deletrear.tsx
- urgencia/route.ts
- Research path voz: escuchar al interlocutor, fin de turno y decir la respuesta
- huella.test.ts
- eslint.config.mjs
- llm/index.ts
- GLOSSARY.md (Parpadeo)
- completado.ts
- cliente.ts
- vencen.test.ts
- ADR 0001 Memoria por usuario
- reductor.ts
- 3. Aprender mientras se usa
- ref_node_assert
- enFila
- Research: path deletrear (Fase 0)
- crearEscuchaGroq
- opciones.test.ts
- transcribir/route.ts
- voz/index.ts
- Huella
- sonidos.ts
- crearDisparadorMemoria
- hechosVigentes
- 1. Web Speech API en Chrome con es-AR
- 5. Banco de voz y clonacion para ELA
- motor.ts
- LoQueAprendi.tsx
- 1. Que dice la investigacion sobre LLMs en CAA
- medir-latencias.ts
- Segunda tanda (pendientes del grill)
- Research: onboarding, aprendizaje y memoria del usuario (huella)
- ref_node_test
- Domain Docs
- Agent skills
- llm/tipos.ts
- Research: path nucleo-interfaz (Fase 0)
- Tercera tanda: OpenAI y Groq contra Google
- nucleo/tipos.ts
- Lenguaje
- 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano
- 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla
- Cuarta tanda: que reconocedor usar (escuchar)
- niveles.ts
- GLOSSARY.md
- 2.6 Aviso al contacto en urgencia
- 3. Alternativas de reconocimiento
- 4. Voces para decir en voz alta
- Agent skills
- correr.ts
- Agent skills
- escuchar.ts
- Pantalla.tsx
- Research: path nucleo-interfaz
- Agent skills
- Lenguaje
- Lenguaje
- Lenguaje
- Lenguaje
- 2.2 Privacidad: alternativas locales para espanol
- Lenguaje
- Lenguaje
- Lenguaje
- Lenguaje
- Agent skills
- CLAUDE.md
- Agent skills
- Agent skills
- Agent skills
- Agent skills
- 6. Eco y barge-in

## God Nodes (most connected - your core abstractions)
1. `LineaHistorial` - 27 edges
2. `crearOpciones()` - 26 edges
3. `Research: path llm` - 26 edges
4. `GLOSSARY.md (Parpadeo)` - 26 edges
5. `PedidoOpciones` - 25 edges
6. `reducir()` - 25 edges
7. `crearAlmacenEnMemoria()` - 24 edges
8. `iniciarVoz()` - 22 edges
9. `crearDisparadorMemoria()` - 21 edges
10. `crearCompletado()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `TD Snap QuickFires` --semantically_similar_to--> `Opciones fijas`  [EXTRACTED] [semantically similar]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `SocializeChat (cercania + memoria personal)` --rationale_for--> `Cercania`  [INFERRED]
  docs/research/llm.md → GLOSSARY.md
- `Orden de opciones por probabilidad` --rationale_for--> `Opcion`  [INFERRED]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `Barrido lineal 1,2 s ajustable` --implements--> `Barrido`  [INFERRED]
  docs/research/nucleo-interfaz.md → GLOSSARY.md
- `renderHuella()` --implements--> `Huella`  [INFERRED]
  docs/research/llm-onboarding-memoria.md → GLOSSARY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pipeline de memoria por usuario (perfil fijo + hechos + agente)** — docs_adr_0001_memoria_por_usuario_huella_md, docs_adr_0001_memoria_por_usuario_memoria_json, glossary_agente_de_memoria, docs_research_llm_onboarding_memoria_mem0, docs_research_llm_extraer_de_conversacion_cruda, glossary_huella [EXTRACTED 1.00]
- **Ciclo half-duplex: aviso, habla, relanzar escucha** — glossary_aviso, docs_adr_0002_voz_half_duplex_half_duplex, docs_research_voz_web_speech_api, docs_research_voz_speech_synthesis, docs_research_voz_relanzar_en_onend, docs_research_voz_chrome_sin_cancelacion_eco [INFERRED 0.85]
- **Seleccion por barrido y parpadeo** — glossary_barrido, glossary_parpadeo_largo, glossary_pausa_del_barrido, glossary_gesto_de_urgencia, docs_research_nucleo_interfaz_congelar_con_ojos_cerrados, docs_research_nucleo_interfaz_barrido_lineal [INFERRED 0.85]

## Communities (88 total, 4 thin omitted)

### Community 0 - "Research: path llm"
Cohesion: 0.10
Nodes (24): claude -p, Gemini Flash free tier, Groq (llama-3.3-70b, structured outputs), Propuesta memoria en tres capas (perfil, estilo, hechos), Research: onboarding, aprendizaje y memoria, Generative Agents (Park et al. 2023), Grid 3 (Smartbox) chat history, MemGPT / Letta memory blocks (+16 more)

### Community 1 - "huella.ts"
Cohesion: 0.12
Nodes (39): esLinea(), GET(), loAprendido(), POST(), aceptadaVigente(), aceptarHuella(), bloquesPorId(), cambiarHuella() (+31 more)

### Community 2 - "niveles.test.ts"
Cohesion: 0.10
Nodes (18): agenteMudo, armar(), bloqueCon(), conDomingoSinBloque(), deDias(), DIA_6, diaBloque, LINEAS (+10 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (42): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+34 more)

### Community 4 - "fechas.ts"
Cohesion: 0.16
Nodes (21): fechaDelEvento(), aTexto(), describirDia(), describirFecha(), describirMomento(), deTexto(), Dia, diaDeCalendario() (+13 more)

### Community 5 - "eventos.ts"
Cohesion: 0.12
Nodes (19): react, Conversacion(), Prueba(), Conversacion(), Simulador(), bus, Eventos, Handler (+11 more)

### Community 6 - "opciones.ts"
Cohesion: 0.12
Nodes (25): prompt(), sumarEjemplos(), aliasHecho(), crearOpciones(), Deteccion, detectarConversacion(), INTENCIONES, interpretarHechos() (+17 more)

### Community 7 - "Research: path voz"
Cohesion: 0.13
Nodes (24): ADR 0002 Voz half-duplex, Reconocimiento de Chrome como base y fallback permanente, Half-duplex (abort() durante aviso y habla), Sin barge-in, Modelo de estados (escuchando, pensando, opciones, sinConexion, hablando...), Research: path voz, AssemblyAI streaming con speaker_labels, Azure Neural es-AR-ElenaNeural / TomasNeural (+16 more)

### Community 8 - "saliencia.test.ts"
Cohesion: 0.19
Nodes (9): armar(), conversacion(), despues(), generar(), guionado(), LAURA, pedido(), RIVER (+1 more)

### Community 9 - "memoria.test.ts"
Cohesion: 0.14
Nodes (18): ref_node_os, ref_node_path, AlmacenEnMemoria, CARPETA_DATOS, memoriaVacia(), AlmacenElecciones, RegistroEleccion, ErrorMemoria (+10 more)

### Community 10 - "memoria.ts"
Cohesion: 0.13
Nodes (23): estaVencido(), finDelDia(), Accion, ACCIONES, ActualizarMemoria, camposDeTiempo(), Candidato, crearAgenteMemoria() (+15 more)

### Community 11 - "iniciarVoz"
Cohesion: 0.22
Nodes (17): Prueba(), callar(), cargarVoces(), elegirVoz(), hablar(), PREFERIDAS_LOCAL, PREFERIDAS_RED, voces (+9 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "CLAUDE.md"
Cohesion: 0.06
Nodes (29): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker", Next.js 16 breaking changes rule, Triage Labels (+21 more)

### Community 14 - "elecciones.ts"
Cohesion: 0.20
Nodes (13): almacen, GET(), POST(), crearAlmacenEleccionesEnArchivos(), crearAlmacenEleccionesEnMemoria(), Eleccion, EleccionInvalida, esPedidoEleccion() (+5 more)

### Community 16 - "Deletrear.tsx"
Cohesion: 0.07
Nodes (56): esPedido(), POST(), predecir, proveedor, Accion, agregarLetra(), armarFilas(), avanzar() (+48 more)

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 18 - "Research path voz: escuchar al interlocutor, fin de turno y decir la respuesta"
Cohesion: 0.15
Nodes (12): 2. Fin de turno, 7. Ruido ambiente y microfono, 8. Diarizacion, Hallazgos, Hallazgos, Hallazgos, Preguntas abiertas para el grill, Recomendacion (+4 more)

### Community 20 - "huella.test.ts"
Cohesion: 0.12
Nodes (16): agenteMudo, armar(), DIA_30, DIA_31, generar(), HUELLA_DE_OCTUBRE, LINEAS, LUNES_2 (+8 more)

### Community 22 - "llm/index.ts"
Cohesion: 0.15
Nodes (16): CompletarFrase, DependenciasCompletado, SALIDA_HUELLA, CierreConversacion, DependenciasCierre, DependenciasOpciones, GenerarOpciones, Eleccion (+8 more)

### Community 23 - "GLOSSARY.md (Parpadeo)"
Cohesion: 0.30
Nodes (12): I, Robot? (autoetnografia AAC 2025), Segmentacion por gap de inactividad + chequeo LLM, Fin de turno por silencio (~1200 ms) + disparo manual, GLOSSARY.md (Parpadeo), Cercania, Interlocutor, Opcion, Opciones fijas (+4 more)

### Community 24 - "completado.ts"
Cohesion: 0.16
Nodes (18): LineaHistorial, crearCompletado(), interpretar(), lineasDeLaConversacionActual(), normalizar(), promptSistema(), renderLinea(), SALIDA_COMPLETADO (+10 more)

### Community 25 - "cliente.ts"
Cohesion: 0.06
Nodes (49): Medicion, Prueba(), elegir(), mostrarResumen(), pedir(), registrar(), Respuesta, TURNOS_DE_PRUEBA (+41 more)

### Community 26 - "vencen.test.ts"
Cohesion: 0.18
Nodes (15): crearAlmacenEnMemoria(), armar(), promptCon(), candidato(), cerradaEl(), guardar(), guionado(), LINEAS (+7 more)

### Community 27 - "ADR 0001 Memoria por usuario"
Cohesion: 0.18
Nodes (13): ADR 0001 Memoria por usuario, .data/ storage en servidor, memoria.json (hechos aprendidos), Reglas del prompt fijas en codigo, Sin base vectorial, Vista 'Lo que aprendi de vos', Extraer de la conversacion cruda, no del resumen, Hibrido JSON en disco + markdown en prompt (+5 more)

### Community 28 - "reductor.ts"
Cohesion: 0.18
Nodes (24): aceptarAcumulado(), activarUrgencia(), barridoDetenido(), Ctx, decir(), descartarAcumulado(), ejecutar(), eleccionDe() (+16 more)

### Community 29 - "3. Aprender mientras se usa"
Cohesion: 0.50
Nodes (4): 3. Aprender mientras se usa, Lo clasico en CAA, Memoria de LLMs en general, Que señales de aprendizaje tenemos en Parpadeo

### Community 31 - "enFila"
Cohesion: 0.26
Nodes (16): abrirConversacion(), armarCerrada(), completarCerrada(), conTurnoPendiente(), interlocutorDe(), lineasDeConversacion(), seguirConversacion(), sumarLineas() (+8 more)

### Community 32 - "Research: path deletrear (Fase 0)"
Cohesion: 0.15
Nodes (12): 1. Disposicion de letras, 2. Prediccion de palabras, 3. Listas de frecuencia de palabras, 4. Bibliotecas npm, 5. Velocidad realista, 6. Correccion de errores, 7. Cosas que cambian el plan del issue, Decisiones del grill (cierran la Fase 0) (+4 more)

### Community 33 - "crearEscuchaGroq"
Cohesion: 0.20
Nodes (11): Escucha, aWav(), crearEscuchaGroq(), cerrarFrase(), preparar(), procesar(), transcribir(), groqDisponible() (+3 more)

### Community 34 - "opciones.test.ts"
Cohesion: 0.17
Nodes (6): ErrorOpciones, armar(), CUATRO, guionado(), T0, ConversacionCerrada

### Community 36 - "voz/index.ts"
Cohesion: 0.29
Nodes (8): CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, ADR-0002, cerrarTurno(), registrarCierre()

### Community 37 - "Huella"
Cohesion: 0.18
Nodes (11): huella.md (perfil fijo), Few-shot con frases reales del usuario, Onboarding en dos carriles (<10 min), renderHuella(), Drift de estilo, Senales de aprendizaje (opcion, Otra, deletreo, interlocutor), Completado, Huella (+3 more)

### Community 38 - "sonidos.ts"
Cohesion: 0.38
Nodes (9): activos, campana(), ctx(), esperar(), PARCIALES, salidaCampana(), sonarAlarma(), sonarAviso() (+1 more)

### Community 39 - "crearDisparadorMemoria"
Cohesion: 0.48
Nodes (6): crearDisparadorMemoria(), consolidar(), consolidarAhora(), correr(), disparar(), conservarUsosNuevos()

### Community 40 - "hechosVigentes"
Cohesion: 0.67
Nodes (4): hechosParaCompletado(), hechosVigentes(), hechosParaPrompt(), pesoDe()

### Community 41 - "1. Web Speech API en Chrome con es-AR"
Cohesion: 0.67
Nodes (3): 1. Web Speech API en Chrome con es-AR, Hallazgos, Recomendacion

### Community 42 - "5. Banco de voz y clonacion para ELA"
Cohesion: 0.67
Nodes (3): 5. Banco de voz y clonacion para ELA, Hallazgos, Recomendacion

### Community 44 - "motor.ts"
Cohesion: 0.14
Nodes (14): ACUMULADO_VENCE_MS, CONFIRMACION_FALSA_ALARMA_MS, CONVERSACION_VENCE_MS, GESTO_URGENCIA_MS, LECTURA_MAXIMO_MS, LeerTurno, MAXIMO_ESPERA_HABLA_MS, MAXIMO_OPCIONES (+6 more)

### Community 48 - "LoQueAprendi.tsx"
Cohesion: 0.12
Nodes (23): ConFuentes, Corte, diaDe(), fecha(), fechaBloque(), fuentes(), Hechos, Huella (+15 more)

### Community 52 - "1. Que dice la investigacion sobre LLMs en CAA"
Cohesion: 0.33
Nodes (6): 1. Que dice la investigacion sobre LLMs en CAA, "I, Robot?" (Weinberg, Valencia y otros, 2025) — LLM ultra personalizado, n=1, SocializeChat (Zhejiang, 2025) — memoria personal + cercania, SpeakFaster (Google, Nature Communications 2024), "The less I type, the better" (Valencia et al., CHI 2023), "Why So Serious?" (CHI 2025)

### Community 53 - "medir-latencias.ts"
Cohesion: 0.06
Nodes (43): ai, @anthropic-ai/sdk, completar, POST(), proveedor, POST(), TipoTurno, crearAlmacenEnArchivos() (+35 more)

### Community 54 - "Segunda tanda (pendientes del grill)"
Cohesion: 0.14
Nodes (14): 2.1 Limites de los tiers gratis (solo para dejar anotado), 2.3 `SpeechRecognition.start(audioTrack)` y eleccion de microfono, 2.4 Voces gratis de `speechSynthesis` en Chrome Windows, 2.5 Microfono para captar una ronda de 3-5 personas, Hallazgos, Hallazgos, Hallazgos, Hallazgos (+6 more)

### Community 61 - "Research: onboarding, aprendizaje y memoria del usuario (huella)"
Cohesion: 0.17
Nodes (11): 1. Onboarding en AAC personalizada, 2. Aprender durante el uso: que es "esencial" y como consolidar, 3. Segmentacion automatica de conversaciones, 4. Formato de almacenamiento, 5. Riesgos y etica (onboarding y aprendizaje en ELA/AAC), Contradicciones y drift: patrones observados, Implicancias para Parpadeo (hackathon de 5 horas), Investigacion con LLMs (+3 more)

### Community 62 - "ref_node_test"
Cohesion: 0.23
Nodes (12): ref_node_test, crearNucleo(), despachar(), ejecutar(), leer(), reiniciarTick(), conProbable(), conRegistro() (+4 more)

### Community 63 - "Domain Docs"
Cohesion: 0.25
Nodes (8): Before exploring, read these, code:block1 (/), code:block2 (/), Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary, Domain Docs guide

### Community 64 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 65 - "llm/tipos.ts"
Cohesion: 0.08
Nodes (20): agenteMudo, INVALIDADO_EL, LINEAS, MARTES_10, MEMORIA, MES_OCTUBRE, Paso, SEMANA_2 (+12 more)

### Community 66 - "Research: path nucleo-interfaz (Fase 0)"
Cohesion: 0.25
Nodes (7): 1. Barrido en CAA, 2. Diseno para ELA, 3. Sistemas comerciales, 4. Posicion de las opciones: fija o por probabilidad, 5. Modelo de estados del nucleo, Decisiones del grill (2026-11-07), Research: path nucleo-interfaz (Fase 0)

### Community 67 - "Tercera tanda: OpenAI y Groq contra Google"
Cohesion: 0.15
Nodes (13): 3.0 Correcciones a las tandas anteriores, 3.1 OpenAI para ESCUCHAR, 3.2 OpenAI para HABLAR, 3.3 Groq para ESCUCHAR, 3.4 Groq para HABLAR, 3.5 Tabla comparativa, 3.6 Recomendacion, 3.7 Lo que no se pudo verificar (+5 more)

### Community 68 - "nucleo/tipos.ts"
Cohesion: 0.16
Nodes (18): Opcion, elementosBarrido(), aplicar(), conOpciones(), deletreando(), despuesDeDecirSi(), enUrgencia(), fragmentoLeido() (+10 more)

### Community 69 - "Lenguaje"
Cohesion: 0.33
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 71 - "0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano"
Cohesion: 0.40
Nodes (4): 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano, Consecuencias, Contexto, Decision

### Community 72 - "0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla"
Cohesion: 0.40
Nodes (4): 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla, Consecuencias, Contexto, Decision

### Community 75 - "Cuarta tanda: que reconocedor usar (escuchar)"
Cohesion: 0.29
Nodes (7): 4.0 Correcciones a las tandas anteriores, 4.1 Rankings publicos de precision, 4.2 Proveedores con streaming en espanol, 4.3 Tabla comparativa (escuchar), 4.4 Recomendacion, 4.5 Lo que no se pudo verificar, Cuarta tanda: que reconocedor usar (escuchar)

### Community 76 - "niveles.ts"
Cohesion: 0.08
Nodes (50): HechoListado, HechosListados, invalidar(), invalidarHecho(), dejaronDeValer(), descartarLoQueCita(), armar(), bloqueDe() (+42 more)

### Community 77 - "GLOSSARY.md"
Cohesion: 0.33
Nodes (5): Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 79 - "2.6 Aviso al contacto en urgencia"
Cohesion: 0.50
Nodes (4): 2.6 Aviso al contacto en urgencia, Hallazgos, Recomendacion, Tabla

### Community 80 - "3. Alternativas de reconocimiento"
Cohesion: 0.50
Nodes (4): 3. Alternativas de reconocimiento, Hallazgos, Recomendacion, Tabla comparativa

### Community 85 - "4. Voces para decir en voz alta"
Cohesion: 0.67
Nodes (3): 4. Voces para decir en voz alta, Hallazgos, Recomendacion

### Community 87 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 99 - "correr.ts"
Cohesion: 0.07
Nodes (41): esLinea(), POST(), Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas() (+33 more)

### Community 101 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 102 - "escuchar.ts"
Cohesion: 0.12
Nodes (14): Inicio(), Linea, MonitorBus(), Alternativa, constructor(), crearEscucha(), depuracionEscucha, ERRORES_FATALES (+6 more)

### Community 107 - "Pantalla.tsx"
Cohesion: 0.20
Nodes (9): AVISO_CUADRANTE, CeldaProps, ChipInterlocutor(), ChipProps, FRANJA, mismoElemento(), Props, chipInterlocutor() (+1 more)

### Community 109 - "Research: path nucleo-interfaz"
Cohesion: 0.24
Nodes (10): Research: path nucleo-interfaz, Barrido lineal 1,2 s ajustable, Congelar barrido mientras ojos.cerrados, Contador de pedido (descartar respuestas viejas), Diseno para ELA (baja carga cognitiva, sin rojo salvo urgencia), TD Snap QuickFires, Tope de vueltas (Grid 3 / PRC rescans), Barrido (+2 more)

### Community 114 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 115 - "Lenguaje"
Cohesion: 0.33
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 116 - "Lenguaje"
Cohesion: 0.33
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 117 - "Lenguaje"
Cohesion: 0.33
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 118 - "Lenguaje"
Cohesion: 0.33
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 120 - "2.2 Privacidad: alternativas locales para espanol"
Cohesion: 0.50
Nodes (4): 2.2 Privacidad: alternativas locales para espanol, Comparativa local para espanol, Hallazgos, Recomendacion

### Community 121 - "Lenguaje"
Cohesion: 0.33
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 122 - "Lenguaje"
Cohesion: 0.33
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 123 - "Lenguaje"
Cohesion: 0.33
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 124 - "Lenguaje"
Cohesion: 0.33
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 128 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 129 - "CLAUDE.md"
Cohesion: 0.25
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

### Community 137 - "6. Eco y barge-in"
Cohesion: 0.67
Nodes (3): 6. Eco y barge-in, Hallazgos, Recomendacion

## Knowledge Gaps
- **460 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+455 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 539 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `eventos.ts` to `package.json`, `voz/index.ts`, `escuchar.ts`, `iniciarVoz`, `Pantalla.tsx`, `LoQueAprendi.tsx`, `Deletrear.tsx`, `cliente.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `PedidoOpciones` connect `Deletrear.tsx` to `opciones.test.ts`, `nucleo/tipos.ts`, `eventos.ts`, `opciones.ts`, `saliencia.test.ts`, `motor.ts`, `medir-latencias.ts`, `completado.ts`, `cliente.ts`, `vencen.test.ts`, `reductor.ts`, `ref_node_test`, `enFila`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `LineaHistorial` connect `completado.ts` to `huella.ts`, `niveles.test.ts`, `eventos.ts`, `opciones.ts`, `memoria.test.ts`, `memoria.ts`, `Deletrear.tsx`, `huella.test.ts`, `cliente.ts`, `vencen.test.ts`, `reductor.ts`, `enFila`, `voz/index.ts`, `motor.ts`, `LoQueAprendi.tsx`, `medir-latencias.ts`, `llm/tipos.ts`, `nucleo/tipos.ts`, `correr.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _460 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Research: path llm` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `huella.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1173054587688734 - nodes in this community are weakly interconnected._
- **Should `niveles.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1038961038961039 - nodes in this community are weakly interconnected._