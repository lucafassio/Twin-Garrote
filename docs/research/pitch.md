# Research: path pitch

Fase 0 del issue #7. Pitch de **2:30** (el issue decia 3:00; el guion se recorta, ver abajo).

> **Estado de las fuentes:** los datos salen de resultados de busqueda web (resumenes + links), todavia **no se abrio cada pagina para leer la cifra en contexto**. Antes de poner un numero en una slide, abrir el link y confirmar. Lo marcado **(sin verificar)** no tiene fuente que lo respalde.

## 1. Cifras: mirada vs habla

| Dato | Valor | Fuente |
|---|---|---|
| Escritura con la mirada, medida en conversacion real (usuarios con ELA) | **8,1 ± 3,9 palabras/min** | [SpeakFaster Observer, Google Research](https://research.google/pubs/speakfaster-observer-long-term-instrumentation-of-eye-gaze-typing-for-measuring-aac-communication/) |
| Teclado por mirada, rango tipico | 10 a 20 palabras/min | [Microsoft Research, AAC self-expression](https://microsoft.com/en-us/research/wp-content/uploads/2016/10/aacselfexpression-1.pdf) |
| Habla tipica | ~180 a 190 palabras/min (ingles) | resultados citados en la misma busqueda; confirmar la fuente exacta |
| Brecha | "mas de un orden de magnitud" | [arXiv 2312.01532](https://arxiv.org/abs/2312.01532) |

**Hallazgo que corrige el plan del issue:** el issue dice "5 a 10 vs ~150". La cifra baja (~8) esta respaldada; la de **150 del habla no la encontre en una fuente** (las fuentes dan 180 a 190 en ingles). Recomendacion: decir **"~8 palabras por minuto con la mirada, contra mas de 150 hablando"** y citar la de la mirada con nombre (Google Research). "150" es conservador y no se contradice con las fuentes, pero no es una cita.

## 2. Prevalencia de ELA en Argentina

- **No hay dato oficial nacional.** Estimacion mas citada: **3.000 a 4.000 personas** viven con ELA, extrapolada de prevalencia mundial ([La Nacion](https://www.lanacion.com.ar/comunidad/ela-como-es-el-tratamiento-y-cuanto-cuesta-nid28042021)).
- **RegistELA** (Fundacion Esteban Bullrich): 995 pacientes identificados en todas las provincias; registro voluntario, no es el total ([Aire de Santa Fe](https://www.airedesantafe.com.ar/salud/el-mapa-la-ela-santa-fe-registra-81-casos-y-es-la-tercera-provincia-mas-diagnosticos-del-pais-n658509)).
- ~800 casos nuevos por ano segun [Infobae](https://www.infobae.com/salud/2018/06/21/vinculos-afectivos-y-rehabilitacion-dos-claves-fundamentales-para-mejorar-la-calidad-de-vida-de-las-personas-con-ela/) (2018, sin verificar el metodo).
- Un proyecto de ley de 2022 propone crear un Registro Nacional ([HCDN 3139-D-2022](https://www4.hcdn.gob.ar/dependencias/dsecretaria/Periodo2022/PDF2022/TP2022/3139-D-2022.pdf)); no confirme si se aprobo.

**Para la slide:** "entre 3.000 y 4.000 personas con ELA en Argentina (estimacion, no hay registro oficial)". Decir que es estimacion suma credibilidad con el jurado.

## 3. Costos y cobertura

- **No encontre precio en Argentina.** El representante oficial de Tobii en el pais fue Innovation Biomedical Solutions S.A. (nota de 2011/2012, puede estar desactualizado). Pendiente: pedir cotizacion o llamar.
- Referencias de afuera, solo como orden de magnitud:
  - Tobii Dynavox I-110 (tactil, discontinuado en 2022): lista US$ 5.999 ([Closing The Gap](https://online.flippingbook.com/view/238364925/71/)).
  - Ontario (Canada), formulario del Ministerio de Salud 2025: I-13 CA$ 10.906; version con mirada **CA$ 20.083** ([Ontario MOH](https://www.ontario.ca/files/2025-03/moh-communication-aids-manual-clinics-en-2025-03-27.pdf)).
  - PCEye (solo el sensor de mirada): ~US$ 3.900, dato viejo ([Montana AT Program](https://montech.ruralinstitute.umt.edu/mtdb/item_view.asp?ID=3343)).
- **Ley 24.901:** el capitulo de rehabilitacion incluye "ayudas tecnicas" y la obligacion de cobertura para quien no tiene obra social va por organismos estatales (art. 4) ([texto de la ley](https://www.entrerios.gov.ar/msalud//wp-content/uploads/2017/02/ley-24901.pdf)). **No encontre norma vigente que cubra expresamente la comunicacion aumentativa de alta tecnologia.** Hay un proyecto ("Ley Ivan", [HCDN 4783-D-2023](https://www4.hcdn.gob.ar/dependencias/dsecretaria/Periodo2023/PDF2023/TP2023/4783-D-2023.pdf)) que propone incluirla y nombra equipos Tobii e Irisbond; estado legislativo sin confirmar. En la practica la cobertura depende de cada obra social y suele ir por amparo judicial.

**Para la slide:** NO decir "la ley lo cubre". Decir algo como "un comunicador con mirada cuesta miles de dolares y la cobertura hoy no esta garantizada" (la primera mitad con la referencia de Ontario/Tobii, la segunda mitad con el proyecto de ley que existe justamente porque no esta garantizada). Confirmar con un abogado o con la asociacion antes de afirmar mas.

## 4. Competencia

- **Google SpeakFaster** (Nature Communications 2024): LLM que expande iniciales a frases, usuarios con ELA con mirada; ahorro de 57% de acciones en simulacion y **29% a 60%** mas velocidad que la base en 2 usuarios con ELA ([PMC11530652](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11530652/)). Es investigacion, no producto disponible; trabaja **sobre el teclado** (el usuario sigue escribiendo iniciales), no escucha a la sala.
- **UCL, CHI 2023:** sugerencias de modelo de lenguaje para respuestas de usuarios AAC ([PDF](https://discovery.ucl.ac.uk/10185220/1/3544548.3581560.pdf)). Investigacion.
- **Productos comerciales:** Tobii Dynavox (hardware dedicado + software que arma un clinico, mirada), Predictable y Proloquo4Text (prediccion con ML sobre lo que escribe el usuario, no LLM; Proloquo solo Apple), Cboard (tableros de simbolos, IA para armar tableros), SpeakAid y similares (LLM sobre tablero de simbolos) ([Global Symbols, 2025](https://globalsymbols.com/news/2025-08-28-catching-up-with-news-about-ai-in-aac-apps)).
- **No pude confirmar** que hacen Google Look to Speak ni Voiceitt: no usar afirmaciones sobre ellos.

**Diferencial defendible de Parpadeo** (todo lo anterior parte de que el usuario escribe o arma): *escucha al interlocutor*, propone **respuestas enteras** con la forma de hablar del usuario y su memoria, y se elige con un parpadeo; corre con **webcam comun**, sin hardware dedicado. Matiz honesto: "no existe nada igual" es una afirmacion fuerte que no puedo probar; mejor "lo que encontramos escribe con la mirada; nosotros escuchamos y proponemos la respuesta".

## 5. Proximo paso: asociaciones

- **Asociacion ELA Argentina**: civil, sin fines de lucro, fundada en noviembre de 2011 segun nota local de 2019, con filiales (ej. Mendoza) ([El Cronista](https://www.cronista.com/especiales/una-comunidad-para-ayudar-a-pacientes-con-ela/), [ANBariloche](https://www.anbariloche.com.ar/noticias/2019/07/19/70383-jornada-de-concientizacion-sobre-esclerosis-lateral-amiotrofica)). Decir "la unica" no esta verificado.
- **Clinica de ELA de FLENI**: equipo multidisciplinario, referencia clinica ([FLENI](https://www.fleni.org.ar/)).
- **Fundacion Esteban Bullrich / RegistELA**: tiene el registro de pacientes.
- Pendiente: contacto concreto (mail o telefono) de al menos una; sin eso "proximo paso" es solo una intencion.

## 6. Datos del producto para el pitch (del repo, no de internet)

- Memoria por usuario con huella, hechos y saliencia: `docs/adr/0001-memoria-por-usuario.md`.
- Voz half-duplex con aviso previo: `docs/adr/0002-voz-half-duplex.md`.
- Urgencia que no pasa por el LLM, deletreo, opciones fijas: `GLOSSARY.md`.
- **Voz de la persona:** `docs/research/voz.md` la considera viable con ElevenLabs Instant Voice Cloning (10 s minimo, 1-2 min recomendado) pero "como extra, no camino critico"; en `src/` no hay codigo de ElevenLabs (la voz base es `speechSynthesis`). **No prometer voz clonada en el pitch** salvo que se haga; decir "la voz de la persona" solo como proximo paso.
- Pendiente: confirmar con el equipo que la demo corre estable de punta a punta.

## 7. ELA avanzada: terminologia, etapas y efecto en el habla

> Misma salvedad que arriba: salen de resumenes de busqueda, sin abrir cada pagina. Esto es contexto para el pitch, **no asesoramiento clinico**: validar con una fonoaudiologa o con la asociacion antes de afirmar algo sobre etapas.

### Terminologia

| Termino | Que es |
|---|---|
| **ELA** (esclerosis lateral amiotrofica; ALS en ingles) | Enfermedad progresiva de las neuronas motoras: se pierde el control de los musculos voluntarios. No tiene cura. |
| **Inicio bulbar** vs **inicio espinal** | Bulbar: empieza por musculos de habla y deglucion (aparece como inicial en ~25% de los casos, [Junta de Andalucia](https://cdn.juntadeandalucia.es/export/drupaljda/salud_5af19569c8354_ela_02.pdf)). Espinal: empieza por brazos o piernas. |
| **Disartria** | Habla afectada por debilidad o rigidez de los musculos del habla (espastica, flacida o mixta): se entiende cada vez menos. |
| **Anartria** | Perdida total de la capacidad de articular palabras. Es el punto en que la logopedia instala un sistema alternativo de comunicacion ([Dano Cerebral](https://xn--daocerebral-2db.es/en/el-trabajo-de-logopedia-en-pacientes-con-ela/)). |
| **Disfagia** | Dificultad para tragar; suele aparecer junto con la disartria. |
| **CAA** (comunicacion aumentativa y alternativa; AAC en ingles) | Aumentativa: ayuda a que el habla residual se entienda. Alternativa: reemplaza al habla. |
| **ALSFRS-R** | Escala funcional de 12 items (0 a 4 cada uno); el item 1 mide el habla. Es burda para detectar disartria (un solo item), pero un puntaje de habla <= 3 la detecta con sensibilidad 79% y especificidad 75% ([JSLHR](https://pubs.asha.org/doi/10.1044/2022_JSLHR-22-00312)). |
| **Locked-in / completamente locked-in** | Conciencia intacta con parálisis casi total (en el primero quedan movimientos oculares o parpadeo; en el segundo ni eso). **No encontre fuente en esta busqueda**; es conocimiento general, confirmar antes de usarlo. |

### Etapas

- **No hay una escala unica de estadios.** Las guias clinicas hablan de fases funcionales (la guia andaluza describe una "fase avanzada" con alto grado de discapacidad, equivalente a la fase 4 de Roche, donde empeoran disartria, disfonia o hipofonia y crece el aislamiento). El resumen de etapas que se usa en divulgacion (inicial / intermedia / avanzada / terminal) es una simplificacion; no lo presentar como estandar.
- **Cuando se pierde el habla:** aparece en 80 a 95% de las personas en algun momento. En inicio bulbar es mas rapido: un estudio reporta ~23 meses hasta perder velocidad de habla funcional (< 120 palabras/min). En quienes tienen un solo sintoma bulbar, el habla se degrada primero el doble de veces que la deglucion ([resultados de busqueda sobre ALSFRS-R y habla](https://pmc.ncbi.nlm.nih.gov/articles/PMC7555482)).
- **Hacia el final:** en los ultimos 6 meses de vida la mayoria tiene dificultad para comunicarse con su habla natural, y algunos llegan a la anartria ([USSAAC](https://www.ussaac.org/speakup/aac-and-amyotrophic-lateral-sclerosis-als/)).

### Como afecta la comunicacion (lo que importa para Parpadeo)

1. **El interlocutor ya no entiende, el usuario si piensa.** Al avanzar, la inteligibilidad baja pero la cognicion suele estar conservada. Salvedad: cerca de la mitad muestra algun cambio cognitivo, sobre todo funciones ejecutivas, y ~20% llega a demencia frontotemporal (dato secundario, de una presentacion que cita un estudio de 2005; **verificar**). Implicancia: la interfaz tiene que ser simple, con pocas decisiones por turno.
2. **La mirada y el parpadeo son el canal que dura, pero no es garantia.** El acceso por mirada es el mas usado en etapas avanzadas, pero hay deficits oculomotores y de control del parpadeo que pueden afectar su uso, por eso la recomendacion es prepararse para **multiples formas de acceso** que cambien con la enfermedad ([ATIA](https://www.atia.org/wp-content/uploads/legacy/files/public/Research_Article-Eye_Gaze_Access_ALS_4AF258B.doc)). Implicancia para el pitch: no afirmar que el parpadeo sirve para todos; decir que es una de las formas de acceso y que el proximo paso es validar con usuarios.
3. **Fatiga.** Escribir con la mirada cansa, por eso el valor esta en reducir cuantas selecciones hacen falta (ver SpeakFaster en la seccion 4).
4. **La CAA se usa de a varios metodos.** En una encuesta de comunidad (autoseleccionada), entre quienes no cubrian sus necesidades con el habla, 84,6% usaba metodos sin ayuda (habla residual, gestos) y 90,5% al menos un dispositivo generador de habla. La mitad de una cohorte de 89 pacientes con afectacion bulbar empezo a usar CAA durante el seguimiento ([USSAAC](https://www.ussaac.org/speakup/aac-and-amyotrophic-lateral-sclerosis-als/), [Listy klinicke logopedie](https://prolekare.cz/casopisy/listy-klinicke-logopedie/2022-1-34/alternative-and-augmentative-communication-in-amyotrophic-lateral-sclerosis-patients-133449)).
5. **Impacto emocional.** Un estudio caso-control encontro menos depresion en quienes usaban comunicador por mirada ([Hwang et al., 2014](https://www.uwo.ca/fhs/lwm/teaching/EBP/2019_20/Carruthers.pdf)); muestra chica.
6. **La logopedia retrasa la perdida de la comunicacion verbal pero no la evita** ([SERMEF](https://www.diarioestrategia.cl/texto-diario/mostrar/5338143/sermef-destaca-papel-esencial-rehabilitacion-foniatrica-logopedica-personas-ela)). Es decir: hay una ventana para empezar a cargar el perfil y la voz *antes* de que el habla se pierda, que es un argumento a favor de un onboarding temprano.

### No usar
- Una pagina de 2026 (voxbooster.com) da cifras muy precisas (82,4% de exito con eye tracking, 12,4 palabras/min) sin links a las fuentes: **no se pudo verificar, no usar**.

### Que cambia para el pitch
- Frase mas precisa que "perdieron la voz": *pierden la voz y el cuerpo, no la cabeza*; sostenerla con "cognicion conservada en la mayoria" (no decir "todos").
- Agregar al proximo paso: **empezar antes de que se pierda el habla** (guardar perfil y frases propias mientras todavia hablan).
- Limite honesto: el parpadeo funciona mientras haya control del parpadeo; mas adelante hacen falta otros accesos (mirada, BCI). Decirlo antes de que lo pregunte el jurado.

## 8. Impacto psicologico: falta de comunicacion, depresion y progresion

> Misma salvedad: resumenes de busqueda, sin abrir cada pagina. Tema sensible: nada de esto va a una slide sin verificar el estudio original y sin revisarlo con un profesional de salud mental o la asociacion.

### Lo que SI esta respaldado

- **Depresion es frecuente, pero la cifra depende de como se mide.** Metaanalisis de 46 estudios: **34 %** (IC 27 a 41 %) ([J Affect Disord 2021](https://www.pubmed.gov/33799036/)). Segun la escala: 50 % con BDI, 20 % con PHQ, 15 % con HADS. Otra revision (103 estudios) concluyo que las escalas comunes **sobreestiman** la depresion porque se confunden con sintomas fisicos de la ELA. Una revision de 2018 reporta 35 a 57 % ([Frontiers in Neurology 2018](https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2018.00231/pdf)). Cifra citable y honesta: **"alrededor de un tercio"**.
- **Soledad y aislamiento.** Un estudio de 2024 encontro soledad en **38 %** de las personas con ELA, asociada a ansiedad, depresion y peor calidad de vida; el bienestar se relaciono con la satisfaccion social **independientemente del estado motor** ([Consonni et al., Ann Clin Transl Neurol 2024](https://air.unimi.it/retrieve/handle/2434/1041429/2388974/Ann%20Clin%20Transl%20Neurol%20-%202024%20-%20Consonni%20-%20Loneliness%20as%20neurobehavioral%20issue%20in%20amyotrophic%20lateral%20sclerosis.pdf)). Un proyecto financiado por NIH describe que al declinar el habla y el movimiento sube el riesgo de desconexion social y que esta poco estudiado ([descripcion NIH](https://www.findatrial.com/research/understanding-social-connections-for-people-with-als-NIH-11170577)). La ALS Association habla de la perdida de comunicacion como algo muy personal que tensiona los roles familiares ([Resource Guide](https://als.org/sites/default/files/2022-10/Resource-Guide-9.pdf)).
- **Perdida de autonomia y control** lleva a desesperanza y perdida de motivacion (misma revision de 2018).
- **Quien usa comunicador por mirada tuvo menos depresion** en un estudio caso-control, muestra chica ([Hwang et al., 2014](https://www.uwo.ca/fhs/lwm/teaching/EBP/2019_20/Carruthers.pdf)). Es lo mas cercano a "comunicar ayuda"; no prueba causalidad.
- **Deseo de adelantar la muerte** (tema delicado): en estudios con pacientes y cuidadores se asocia a depresion, ansiedad, **soledad**, sentirse una carga y baja calidad de vida; dos tercios se lo dijeron a la familia, **nadie al medico**, y la mitad quisiera hablarlo con el ([Attitudes towards hastened death in ALS](https://edoc.unibas.ch/33691)). Un estudio mas nuevo encontro que **soledad y menos sentido de la vida** predicen el deseo de muerte en general. Tambien se vio que no es solo un sintoma de depresion: pesa mas la **desesperanza**.

### Lo que NO esta probado (corregir la premisa)

- **"La falta de comunicacion acelera la enfermedad": no encontre evidencia directa.** No hay un estudio que mida perdida de habla -> depresion -> progresion. Lo que existe es mas debil y mixto:
  - Cohorte del Reino Unido: mal estado psicologico al diagnostico predijo **menor supervivencia, progresion mas rapida y mas discapacidad**, y los autores sostienen que no se debia solo a que el animo siga a la gravedad ([St Andrews](https://research-portal.st-andrews.ac.uk/en/publications/mood-as-a-predictor-of-disability-and-survival-in-patients-newly-/)).
  - Estudio grande de un centro: la depresion tuvo efecto negativo sobre la supervivencia aun ajustando por gravedad y velocidad de progresion; los autores hablan de posible contribucion, no de causa ([Cleveland Clinic](https://consultqd.clevelandclinic.org/self-reported-depression-als-new-insights-implications)).
  - Cohorte china (n = 166): la **presencia** de depresion **no** se relacionaba con supervivencia ni progresion; solo su severidad con la supervivencia.
  - Otro estudio: el declive funcional se correlaciona con **desesperanza**, no con depresion.
  - Una revision de 28 estudios: hay mas desesperanza y preocupaciones del final de vida que depresion clinica, y los estudios son chicos y transversales.
- Por lo tanto: **"correlacion si, causalidad no demostrada"**. Puede ser que el animo influya, que la enfermedad rapida deprima mas, o ambas. No hay mecanismo establecido.
- **Tampoco hay estudio en esta busqueda sobre anartria especificamente**; todo lo anterior es sobre perdida de habla y movimiento en general.
- No usar: "mas de 40 % con depresion clinica" del blog de ElevenLabs (fuente comercial).

### Que decir en el pitch (y que no)

- **Si:** "Alrededor de un tercio de las personas con ELA tiene depresion, y cerca de 4 de cada 10 se sienten solas. Y el bienestar depende mas de poder conectar con otros que de cuanto pueden mover el cuerpo." (cifras de los dos estudios citados, decir "alrededor de").
- **Si:** "Hay una ventana: estar conectado importa tanto como el tratamiento." Defendible sin causalidad.
- **No:** "la falta de comunicacion acelera la enfermedad" ni "Parpadeo alarga la vida". No esta probado y el jurado medico lo va a señalar.
- **No** usar el tema del deseo de morir como gancho de emocion: es sensible, puede doler a familias reales, y el dato necesita contexto clinico.
- **Posible argumento de producto (hipotesis, no dato):** perder la velocidad de la charla deja a la persona afuera de la conversacion; Parpadeo apunta a que pueda participar en el momento. Validar con usuarios antes de afirmar un efecto sobre el animo.
