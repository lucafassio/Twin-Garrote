# Graph Report - Twin-Garrote  (2026-11-07)

## Corpus Check
- 99 files · ~89,810 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1527 nodes · 2943 edges · 94 communities (84 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63113696`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Research path llm|Research: path llm]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_completado.ts|completado.ts]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Research path voz|Research: path voz]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_memoria.ts|memoria.ts]]
- [[_COMMUNITY_opciones.ts|opciones.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_CLAUDE|CLAUDE.md]]
- [[_COMMUNITY_opciones.test.ts|opciones.test.ts]]
- [[_COMMUNITY_llmindex.ts|llm/index.ts]]
- [[_COMMUNITY_Deletrear.tsx|Deletrear.tsx]]
- [[_COMMUNITY_urgenciaroute.ts|urgencia/route.ts]]
- [[_COMMUNITY_medir-latencias.ts|medir-latencias.ts]]
- [[_COMMUNITY_visionindex.ts|vision/index.ts]]
- [[_COMMUNITY_correr.ts|correr.ts]]
- [[_COMMUNITY_eslint.config.mjs|eslint.config.mjs]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_GLOSSARY.md (Parpadeo)|GLOSSARY.md (Parpadeo)]]
- [[_COMMUNITY_Research path nucleo-interfaz|Research: path nucleo-interfaz]]
- [[_COMMUNITY_ADR 0001 Memoria por usuario|ADR 0001 Memoria por usuario]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Research path deletrear (Fase 0)|Research: path deletrear (Fase 0)]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_transcribirroute.ts|transcribir/route.ts]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]

## God Nodes (most connected - your core abstractions)
1. `LineaHistorial` - 47 edges
2. `PedidoOpciones` - 45 edges
3. `llm/index.ts` - 38 edges
4. `voz/index.ts` - 38 edges
5. `llm/tipos.ts` - 36 edges
6. `GLOSSARY.md (Parpadeo)` - 26 edges
7. `nucleo/tipos.ts` - 24 edges
8. `bus` - 22 edges
9. `iniciarVoz()` - 22 edges
10. `reducir()` - 21 edges

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

## Hyperedges (group relationships)
- **Pipeline de memoria por usuario (perfil fijo + hechos + agente)** — docs_adr_0001_memoria_por_usuario_huella_md, docs_adr_0001_memoria_por_usuario_memoria_json, glossary_agente_de_memoria, docs_research_llm_onboarding_memoria_mem0, docs_research_llm_extraer_de_conversacion_cruda, glossary_huella [EXTRACTED 1.00]
- **Ciclo half-duplex: aviso, habla, relanzar escucha** — glossary_aviso, docs_adr_0002_voz_half_duplex_half_duplex, docs_research_voz_web_speech_api, docs_research_voz_speech_synthesis, docs_research_voz_relanzar_en_onend, docs_research_voz_chrome_sin_cancelacion_eco [INFERRED 0.85]
- **Seleccion por barrido y parpadeo** — glossary_barrido, glossary_parpadeo_largo, glossary_pausa_del_barrido, glossary_gesto_de_urgencia, docs_research_nucleo_interfaz_congelar_con_ojos_cerrados, docs_research_nucleo_interfaz_barrido_lineal [INFERRED 0.85]

## Communities (94 total, 10 thin omitted)

### Community 0 - "Research: path llm"
Cohesion: 0.10
Nodes (29): memoria.json (hechos aprendidos), Research: path llm, claude -p, Extraer de la conversacion cruda, no del resumen, Few-shot con frases reales del usuario, Gemini Flash free tier, Groq (llama-3.3-70b, structured outputs), Propuesta memoria en tres capas (perfil, estilo, hechos) (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.21
Nodes (19): callar(), hablar(), avisarContacto(), esperar(), iniciarVoz(), decir(), empezarHabla(), terminarHabla() (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (29): nucleo/index.ts, aceptarAcumulado(), activarUrgencia(), barridoDetenido(), Ctx, decir(), descartarAcumulado(), ejecutar() (+21 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (42): nextConfig, dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next (+34 more)

### Community 4 - "completado.ts"
Cohesion: 0.13
Nodes (21): ai, @anthropic-ai/sdk, ref_node_test, deletrear/route.ts, esPedido(), POST(), predecir, proveedor (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (25): react, app/page.tsx, Conversacion(), deletrear/page.tsx, nucleo/page.tsx, Prueba(), vision/page.tsx, conversacion/page.tsx (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (21): completarFrase(), esAbortado(), esPedidoCancelado(), PedidoCancelado, pedirCompletado(), pedirOpciones(), LoQueAprendi(), Medicion (+13 more)

### Community 7 - "Research: path voz"
Cohesion: 0.15
Nodes (20): ADR 0002 Voz half-duplex, Reconocimiento de Chrome como base y fallback permanente, Sin barge-in, Message banking (BCH, Team Gleason), Research: path voz, AssemblyAI streaming con speaker_labels, Azure Neural es-AR-ElenaNeural / TomasNeural, Bug de corte ~15 s de voces Google (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (45): 1. Contexto y alcance, 2. Arquitectura, 3. Modelo de datos, 4.10 `consolidate`, 4.11 `metrics`, 4.1 `capture`: escucha y fin de turno, 4.2 `memory`: almacenamiento y recuperación, 4.3 `embedder` (+37 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (20): ref_node_os, ref_node_path, AlmacenEnMemoria, CARPETA_DATOS, crearAlmacenEnArchivos(), crearAlmacenEnMemoria(), memoriaVacia(), llm/index.ts (+12 more)

### Community 10 - "memoria.ts"
Cohesion: 0.12
Nodes (26): Accion, ACCIONES, ActualizarMemoria, Candidato, crearAgenteMemoria(), DependenciasMemoria, interpretar(), nombreUsuario() (+18 more)

### Community 11 - "opciones.ts"
Cohesion: 0.13
Nodes (25): Intencion, abrirConversacion(), armarCerrada(), interlocutorDe(), lineasDeConversacion(), seguirConversacion(), unirLineas(), actualizarConversacion() (+17 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "CLAUDE.md"
Cohesion: 0.14
Nodes (14): Next.js 16 breaking changes rule, src/eventos.ts contrato compartido, Fase 0 (research + grill), Push directo a main con pull --rebase, Pagina de prueba por path (src/app/prueba/<path>), Parpadeo (AAC para ELA), Paths paralelos (path:* issues), npx tsc --noEmit antes de push (+6 more)

### Community 14 - "opciones.test.ts"
Cohesion: 0.20
Nodes (5): armar(), CUATRO, guionado(), T0, ConversacionCerrada

### Community 15 - "llm/index.ts"
Cohesion: 0.17
Nodes (18): memoria/route.ts, almacen, CERCANIAS, esLinea(), GET(), memoria, POST(), proveedor (+10 more)

### Community 16 - "Deletrear.tsx"
Cohesion: 0.08
Nodes (51): Accion, agregarLetra(), armarFilas(), avanzar(), Barrido, BARRIDO_INICIAL, borrarLetra(), borrarPalabra() (+43 more)

### Community 17 - "urgencia/route.ts"
Cohesion: 0.83
Nodes (4): urgencia/route.ts, ntfy(), POST(), telegram()

### Community 18 - "medir-latencias.ts"
Cohesion: 0.25
Nodes (13): armarPedido(), directo(), Llamar, main(), mediana(), Medido, medir(), porHttp() (+5 more)

### Community 20 - "correr.ts"
Cohesion: 0.16
Nodes (16): Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas(), leerLocal(), main() (+8 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (30): fecha(), LoQueAprendi(), cerrar(), enviar(), llm/page.tsx, Medicion, Prueba(), Respuesta (+22 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (14): Inicio(), Linea, MonitorBus(), Alternativa, constructor(), crearEscucha(), depuracionEscucha, ERRORES_FATALES (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (18): ref_node_assert, CompletarFrase, crearCompletado(), DependenciasCompletado, hechosParaCompletado(), interpretar(), lineasDeLaConversacionActual(), normalizar() (+10 more)

### Community 25 - "GLOSSARY.md (Parpadeo)"
Cohesion: 0.24
Nodes (15): I, Robot? (autoetnografia AAC 2025), Segmentacion por gap de inactividad + chequeo LLM, Fin de turno por silencio (~1200 ms) + disparo manual, GLOSSARY.md (Parpadeo), Cercania, Contacto, Conversacion, Gesto de urgencia (+7 more)

### Community 26 - "Research: path nucleo-interfaz"
Cohesion: 0.14
Nodes (16): Half-duplex (abort() durante aviso y habla), Drift de estilo, Senales de aprendizaje (opcion, Otra, deletreo, interlocutor), Research: path nucleo-interfaz, Barrido lineal 1,2 s ajustable, Congelar barrido mientras ojos.cerrados, Contador de pedido (descartar respuestas viejas), Diseno para ELA (baja carga cognitiva, sin rojo salvo urgencia) (+8 more)

### Community 27 - "ADR 0001 Memoria por usuario"
Cohesion: 0.17
Nodes (12): ADR 0001 Memoria por usuario, .data/ storage en servidor, huella.md (perfil fijo), Reglas del prompt fijas en codigo, Sin base vectorial, Vista 'Lo que aprendi de vos', Domain Docs guide, Flag ADR conflicts (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (13): leerTurnoRemoto(), ACUMULADO_VENCE_MS, CONFIRMACION_FALSA_ALARMA_MS, GESTO_URGENCIA_MS, LECTURA_MAXIMO_MS, LeerTurno, MAXIMO_ESPERA_HABLA_MS, MAXIMO_OPCIONES (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.06
Nodes (44): Linea, anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, Alternativa, constructor(), crearEscucha() (+36 more)

### Community 30 - "Community 30"
Cohesion: 0.20
Nodes (11): Escucha, aWav(), crearEscuchaGroq(), cerrarFrase(), preparar(), procesar(), transcribir(), groqDisponible() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.27
Nodes (9): elementosBarrido(), aplicar(), conOpciones(), despuesDeDecirSi(), enUrgencia(), fragmentoLeido(), iluminar(), nombres() (+1 more)

### Community 32 - "Research: path deletrear (Fase 0)"
Cohesion: 0.15
Nodes (12): 1. Disposicion de letras, 2. Prediccion de palabras, 3. Listas de frecuencia de palabras, 4. Bibliotecas npm, 5. Velocidad realista, 6. Correccion de errores, 7. Cosas que cambian el plan del issue, Decisiones del grill (cierran la Fase 0) (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (9): CampoTurno(), anotarEnCurso(), anotarLinea(), contextoCharla(), lineas, voz/index.ts, ADR-0002, cerrarTurno() (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.07
Nodes (48): Accion, agregarLetra(), armarFilas(), avanzar(), Barrido, BARRIDO_INICIAL, borrarLetra(), borrarPalabra() (+40 more)

### Community 36 - "Community 36"
Cohesion: 0.60
Nodes (5): crearNucleo(), despachar(), ejecutar(), leer(), reiniciarTick()

### Community 37 - "Community 37"
Cohesion: 0.06
Nodes (42): Caso, CASOS, ROBERTO_DALE, ROBERTO_FRIO, ROBERTO_LAURA, enTandas(), leerConModelo(), leerLocal() (+34 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (24): completar, esPedido(), POST(), proveedor, esPedido(), POST(), predecir, proveedor (+16 more)

### Community 39 - "Community 39"
Cohesion: 0.07
Nodes (23): ErrorOpciones, armar(), cinco, con, conRepetida, CUATRO, despuesDeRecargar, familia (+15 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (23): ErrorMemoria, agenteTrabado, almacen, cerrada(), CUATRO, despues(), disparador, errores (+15 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (25): elementosBarrido(), abierto, abrir, antes, aplicar(), cerrado, cerrar, conOpciones() (+17 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (22): cerrarConversacion(), HechosListados, abrirConversacion(), armarCerrada(), interlocutorDe(), lineasDeConversacion(), seguirConversacion(), unirLineas() (+14 more)

### Community 43 - "Community 43"
Cohesion: 0.07
Nodes (26): dependencies, ai, @anthropic-ai/sdk, @google/genai, groq-sdk, @mediapipe/tasks-vision, next, react (+18 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (18): Props, leerTurnoRemoto(), crearNucleo(), LeerTurno, Nucleo, OpcionesNucleo, leidos, off (+10 more)

### Community 45 - "Community 45"
Cohesion: 0.11
Nodes (9): Conversacion(), Conversacion(), AVISO_CUADRANTE, CeldaProps, FRANJA, Props, useNucleo(), Prueba() (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (17): CompletarFrase, crearCompletado(), DependenciasCompletado, hechosParaCompletado(), interpretar(), normalizar(), promptSistema(), SALIDA_COMPLETADO (+9 more)

### Community 47 - "Community 47"
Cohesion: 0.10
Nodes (15): invalidarHecho(), listarHechos(), ahora, almacen, conActual, historial, Hechos, ORIGEN (+7 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+12 more)

### Community 49 - "Community 49"
Cohesion: 0.14
Nodes (16): Accion, ACCIONES, ActualizarMemoria, Candidato, crearAgenteMemoria(), DependenciasMemoria, interpretar(), nombreUsuario() (+8 more)

### Community 50 - "Community 50"
Cohesion: 0.28
Nodes (17): Pantalla(), aceptarAcumulado(), activarUrgencia(), barridoDetenido(), Ctx, decir(), descartarAcumulado(), ejecutar() (+9 more)

### Community 51 - "Community 51"
Cohesion: 0.20
Nodes (14): AlmacenEnMemoria, crearAlmacenEnMemoria(), memoriaVacia(), memoria(), PERFIL_ROBERTO, Almacen, ConversacionActual, EjemploEstilo (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (16): 1. Que dice la investigacion sobre LLMs en CAA, 2. Imitar como habla una persona, 3. Aprender mientras se usa, 4. Riesgos propios de ELA y de este producto, 5. Proveedores y JSON (lo minimo para decidir), 6. Propuesta para la memoria (para el grill), 7. Agente de memoria: como extraer y consolidar (state of the art), "I, Robot?" (Weinberg, Valencia y otros, 2025) — LLM ultra personalizado, n=1 (+8 more)

### Community 53 - "Community 53"
Cohesion: 0.17
Nodes (14): CONECTORES_FINALES, ContextoLectura, esSegundaPersona(), INTERROGATIVAS, leerTurnoLocal(), limitar(), MULETILLAS, palabras() (+6 more)

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (14): 2.1 Limites de los tiers gratis (solo para dejar anotado), 2.3 `SpeechRecognition.start(audioTrack)` y eleccion de microfono, 2.4 Voces gratis de `speechSynthesis` en Chrome Windows, 2.5 Microfono para captar una ronda de 3-5 personas, Hallazgos, Hallazgos, Hallazgos, Hallazgos (+6 more)

### Community 55 - "Community 55"
Cohesion: 0.26
Nodes (12): lectura/route.ts, esLinea(), POST(), leerConModelo(), armarPedidoLectura(), interpretarLectura(), leerTurnoConGateway(), MODELO_LECTURA_POR_DEFECTO (+4 more)

### Community 56 - "Community 56"
Cohesion: 0.15
Nodes (12): 1. Disposicion de letras, 2. Prediccion de palabras, 3. Listas de frecuencia de palabras, 4. Bibliotecas npm, 5. Velocidad realista, 6. Correccion de errores, 7. Cosas que cambian el plan del issue, Decisiones del grill (cierran la Fase 0) (+4 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (12): 2. Fin de turno, 7. Ruido ambiente y microfono, 8. Diarizacion, Hallazgos, Hallazgos, Hallazgos, Preguntas abiertas para el grill, Recomendacion (+4 more)

### Community 58 - "Community 58"
Cohesion: 0.27
Nodes (11): crearAlmacenEnArchivos(), armarPedido(), directo(), Llamar, main(), mediana(), Medido, porHttp() (+3 more)

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (10): a, b, c, Llamada, llamadas, nuevo, o, p (+2 more)

### Community 60 - "Community 60"
Cohesion: 0.15
Nodes (13): 3.0 Correcciones a las tandas anteriores, 3.1 OpenAI para ESCUCHAR, 3.2 OpenAI para HABLAR, 3.3 Groq para ESCUCHAR, 3.4 Groq para HABLAR, 3.5 Tabla comparativa, 3.6 Recomendacion, 3.7 Lo que no se pudo verificar (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.17
Nodes (11): 1. Onboarding en AAC personalizada, 2. Aprender durante el uso: que es "esencial" y como consolidar, 3. Segmentacion automatica de conversaciones, 4. Formato de almacenamiento, 5. Riesgos y etica (onboarding y aprendizaje en ELA/AAC), Contradicciones y drift: patrones observados, Implicancias para Parpadeo (hackathon de 5 horas), Investigacion con LLMs (+3 more)

### Community 62 - "Community 62"
Cohesion: 0.36
Nodes (8): voz/page.tsx, Prueba(), cargarVoces(), elegirVoz(), PREFERIDAS_LOCAL, PREFERIDAS_RED, voces, mensajeUrgencia()

### Community 63 - "Community 63"
Cohesion: 0.25
Nodes (7): Before exploring, read these, code:block1 (/), code:block2 (/), Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 64 - "Community 64"
Cohesion: 0.25
Nodes (6): Agent skills, Domain docs, graphify, Issue tracker, Reglas de trabajo en paralelo (obligatorias), Triage labels

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (7): conversacion, desdeLinea, inicio, ultimaActividad, ejemplosEstilo, hechos, resumenes

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (7): 1. Barrido en CAA, 2. Diseno para ELA, 3. Sistemas comerciales, 4. Posicion de las opciones: fija o por probabilidad, 5. Modelo de estados del nucleo, Decisiones del grill (2026-11-07), Research: path nucleo-interfaz (Fase 0)

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (6): Curation Rules, Domain Behavior Guardrails, Execution & Validation (Highest Priority), Napkin Runbook, Shell & Command Reliability, User Directives

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (6): Conversacion, Lenguaje, Memoria, Parpadeo, Personas, Seleccion

### Community 70 - "Community 70"
Cohesion: 0.29
Nodes (7): 4.0 Correcciones a las tandas anteriores, 4.1 Rankings publicos de precision, 4.2 Proveedores con streaming en espanol, 4.3 Tabla comparativa (escuchar), 4.4 Recomendacion, 4.5 Lo que no se pudo verificar, Cuarta tanda: que reconocedor usar (escuchar)

### Community 71 - "Community 71"
Cohesion: 0.40
Nodes (4): 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano, Consecuencias, Contexto, Decision

### Community 72 - "Community 72"
Cohesion: 0.40
Nodes (4): 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla, Consecuencias, Contexto, Decision

### Community 73 - "Community 73"
Cohesion: 0.60
Nodes (5): completar/route.ts, completar, esPedido(), POST(), proveedor

### Community 74 - "Community 74"
Cohesion: 0.50
Nodes (5): opciones/route.ts, esPedido(), { generarOpciones }, POST(), proveedor

### Community 75 - "Community 75"
Cohesion: 0.50
Nodes (4): 2.2 Privacidad: alternativas locales para espanol, Comparativa local para espanol, Hallazgos, Recomendacion

### Community 76 - "Community 76"
Cohesion: 0.50
Nodes (4): 2.6 Aviso al contacto en urgencia, Hallazgos, Recomendacion, Tabla

### Community 77 - "Community 77"
Cohesion: 0.50
Nodes (4): 3. Alternativas de reconocimiento, Hallazgos, Recomendacion, Tabla comparativa

### Community 79 - "Community 79"
Cohesion: 0.83
Nodes (3): ntfy(), POST(), telegram()

### Community 82 - "Community 82"
Cohesion: 0.67
Nodes (3): 1. Web Speech API en Chrome con es-AR, Hallazgos, Recomendacion

### Community 83 - "Community 83"
Cohesion: 0.67
Nodes (3): 4. Voces para decir en voz alta, Hallazgos, Recomendacion

### Community 84 - "Community 84"
Cohesion: 0.67
Nodes (3): 5. Banco de voz y clonacion para ELA, Hallazgos, Recomendacion

### Community 85 - "Community 85"
Cohesion: 0.67
Nodes (3): 6. Eco y barge-in, Hallazgos, Recomendacion

## Knowledge Gaps
- **579 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+574 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LineaHistorial` connect `llm/index.ts` to `Community 2`, `Community 5`, `Community 6`, `Community 9`, `memoria.ts`, `opciones.ts`, `Deletrear.tsx`, `medir-latencias.ts`, `correr.ts`, `Community 22`, `Community 24`, `Community 28`, `Community 29`, `Community 33`, `Community 34`, `Community 37`, `Community 40`, `Community 42`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 49`, `Community 50`, `Community 51`, `Community 55`, `Community 58`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `PedidoOpciones` connect `Community 6` to `Community 2`, `completado.ts`, `Community 5`, `opciones.ts`, `opciones.test.ts`, `llm/index.ts`, `Deletrear.tsx`, `medir-latencias.ts`, `Community 22`, `Community 24`, `Community 28`, `Community 34`, `Community 38`, `Community 39`, `Community 42`, `Community 44`, `Community 45`, `Community 46`, `Community 50`, `Community 58`, `Community 59`, `Community 73`, `Community 74`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `bus` connect `Community 5` to `Community 33`, `Community 34`, `Community 6`, `Community 44`, `Community 45`, `llm/index.ts`, `Deletrear.tsx`, `Community 23`, `Community 28`, `Community 29`, `Community 62`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _586 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Research: path llm` be split into smaller, more focused modules?**
  _Cohesion score 0.10098522167487685 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14482758620689656 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._