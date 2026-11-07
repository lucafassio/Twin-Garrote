# Research: path llm

Fase 0 del issue #2. Foco pedido: **memoria por usuario** para que las opciones suenen al usuario, que aprenda mientras se usa, cercania con el interlocutor, y como aplica a la comunicacion en ELA. Al final, lo minimo sobre proveedores y JSON.

> Fuentes leidas con busqueda web y lectura de papers (nov 2026). Donde un dato viene de una fuente secundaria o de un resumen, esta marcado.

---

## 1. Que dice la investigacion sobre LLMs en CAA

### SpeakFaster (Google, Nature Communications 2024)
- LLM que expande abreviaturas (iniciales de palabras) usando el contexto de la conversacion; devuelve top-5 opciones.
- En simulacion ahorra 57% mas acciones motoras que un teclado predictivo; con usuarios con ELA por mirada, 29-60% mas rapido que la linea base.
- Se aprende rapido (20-50 frases de practica).
- **Para nosotros:** el contexto conversacional (lo que dijo el interlocutor) es lo que mas aporta. Elegir entre pocas opciones generadas es un patron validado.
- [Paper (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11530652) · [Blog de Google](https://research.google/blog/speakfaster-revolutionizing-communication-for-people-with-severe-motor-impairments/) · [arXiv](https://arxiv.org/abs/2312.01532v1)

### "The less I type, the better" (Valencia et al., CHI 2023)
- 12 usuarios de CAA con LLMs ("speech macros").
- Hallazgo central: el LLM **no alcanza para reflejar el tono, el estilo, la personalidad y la identidad** del usuario. Los usuarios quieren mas que ahorro de teclas.
- Piden participacion del usuario para preservar privacidad, autonomia y control.
- [ACM](https://dl.acm.org/doi/fullHtml/10.1145/3544548.3581560) · [PDF UCL](https://discovery.ucl.ac.uk/10185220/1/3544548.3581560.pdf)

### "Why So Serious?" (CHI 2025)
- 5 usuarios de CAA, comentarios con humor en el momento justo.
- Cuando el timing importa, los usuarios **ceden agencia a cambio de velocidad** (a diferencia de estudios anteriores).
- Riesgo: depender del autocompletado reduce los comentarios espontaneos e impredecibles.
- [arXiv 2410.16634](https://arxiv.org/html/2410.16634)

### SocializeChat (Zhejiang, 2025) — memoria personal + cercania
Lo mas cercano a lo que queremos.
- **Dos memorias editables por el usuario:**
  - *Persona del interlocutor*: por cada interlocutor, temas preferidos y **nivel de cercania** (Normal, Familiar, Muy familiar).
  - *Registros de memoria*: texto libre con recuerdos concretos (eventos, rutinas, experiencias).
- **Recuperacion por turno:** extrae palabras clave del turno, las expande por similitud, puntua cada registro por coincidencias, mete **los 3 mejores** en el prompt.
- **Arranque de charla:** hasta 4 registros segun los temas del historial con ese interlocutor.
- **Estilo:** no usan ejemplos de frases del usuario; lo controlan con la cercania:
  - Normal: lenguaje cortes y distante, **sin detalles de los registros**.
  - Familiar: algo de detalle, con cuidado.
  - Muy familiar: detalles de los registros y preguntas de seguimiento.
- **Resultados (16 adultos mayores):** 11/16 destacaron el tono segun la cercania. Los arranques por tema bajaron el esfuerzo de empezar a hablar. Sugerencias ancladas en recuerdos daban ganas de seguir charlando.
- **Problema:** a veces el LLM contradecia la experiencia real del usuario (hechos inventados).
- Dicen que cada conversacion "es un recuerdo nuevo", pero **no describen como se escribe de vuelta** en la memoria.
- [arXiv 2510.19017](https://arxiv.org/html/2510.19017)

### "I, Robot?" (Weinberg, Valencia y otros, 2025) — LLM ultra personalizado, n=1
Autoetnografia de un usuario de CAA argentino durante 3 meses. *Detalles numericos de un resumen del paper, verificar en el PDF.*
- **Memoria en los pesos:** fine-tuning de GPT-4.1-mini con ~20k mensajes propios (~USD 120). Sin memoria recuperable ni actualizacion durante el uso.
- **Bien:** reprodujo cambios de idioma y **modismos rioplatenses**. Muy preciso en contextos estructurados (reuniones de laboratorio).
- **Mal:**
  - Cambios rapidos de tema (en un bar) y presion de tiempo (en un aeropuerto rechazo las 130 sugerencias).
  - **Sacaba detalles intimos (familia, religion) donde no correspondian.**
  - Los interlocutores le atribuian al autor sugerencias que todavia no habia elegido.
- **Riesgos:**
  - *Integridad contextual:* mezclar todos los contextos en una sola memoria hace que lo privado aparezca frente a cualquiera.
  - *Autocensura:* sabiendo que todo se registraba, evitaba decir cosas.
  - *Identidad recortada:* al filtrar groserias y humor negro quedo "un modelo bien portado" que no era el.
  - *Arrastre:* el modelo empujaba la charla hacia sus patrones conocidos.
- **Recomendaciones:**
  - Anotar datos con contexto e interlocutor.
  - Modulos de memoria separados y editables en lugar de uno monolitico.
  - Preguntar periodicamente si todavia "suena a vos".
- [arXiv 2509.13671](https://arxiv.org/html/2509.13671v2)

---

## 2. Imitar como habla una persona

- **Ejemplos > descripcion.** Few-shot con textos reales del autor da hasta 23,5 veces mas coincidencia de estilo que zero-shot ([arXiv 2509.24930](https://arxiv.org/pdf/2509.24930v1)).
- Aun asi, imitar el estilo implicito de personas comunes desde pocos ejemplos sigue costando ([arXiv 2509.14543](https://arxiv.org/pdf/2509.14543)). Con prompts o fine-tuning, los LLMs en general no simulan bien a un hablante concreto ([arXiv 2405.10150](https://arxiv.org/pdf/2405.10150v2)).
- **Para nosotros:** el perfil con "tono calido e ironico" ayuda poco. Lo que mas ayuda: **frases reales del usuario** en el prompt (frases tipicas y respuestas anteriores) como ejemplos.

## 3. Aprender mientras se usa

### Lo clasico en CAA
- Los predictores de palabras adaptativos (SIBYLLE, Wandmacher 2008) aprenden de todo lo que escribe el usuario. La ganancia llega hasta ~9% y se estanca recien a ~20.000 palabras. *Dato de un espejo de terceros.*
- El problema conocido: **al principio no sirve**, porque todavia no hay datos del usuario.
- [Tesis Wandmacher](https://www.info.univ-tours.fr/~antoine/articles/2008_PhD_Wandmacher.pdf) · [ASSETS 2007](https://www.info.univ-tours.fr/~antoine/articles/2007_ASSETS.pdf)

### Memoria de LLMs en general
- **Mem0** y **MemGPT/Letta**: memoria por usuario en capas (corto plazo, episodica, semantica). Un paso que extrae hechos de cada conversacion, les pone importancia y resuelve contradicciones.
- Los numeros de Mem0 (+26% sobre OpenAI Memory en LOCOMO) son del propio vendedor.
- Son librerias o servicios pesados para 5 horas. **La idea sirve; la dependencia no.**
- [Mem0 arXiv 2504.19413](https://arxiv.org/abs/2504.19413) · [MemGPT arXiv 2310.08560](https://arxiv.org/abs/2310.08560) · [Perfiles persistentes, arXiv 2510.07925](https://arxiv.org/html/2510.07925v1)

### Que señales de aprendizaje tenemos en Parpadeo
El usuario **no escribe libremente**: elige entre 4 opciones, opciones fijas, o deletrea (path deletrear). Eso define que se puede aprender:

| Señal | Que dice | Cuanto vale |
|---|---|---|
| Opcion elegida | "esto lo diria" | Media. Solo elige entre lo que propuso el LLM, asi que se refuerza a si mismo (arrastre, identidad recortada). |
| "Otra" pedida | "ninguna de estas sonaba a mi" | Baja pero util. Las 4 rechazadas son ejemplos negativos. |
| Texto deletreado | palabras propias del usuario | **Alta.** Es la unica fuente que no sale del LLM. Es oro para la memoria de estilo. |
| Lo que dice el interlocutor | hechos ("mañana viene Laura") | Media. Sirve para memoria de hechos, con cuidado de contexto. |

---

## 4. Riesgos propios de ELA y de este producto

1. **Poner palabras en la boca.** Con un parpadeo largo por eleccion, el costo de rechazar es alto (pedir "Otra" es lento). Por eso, que el sistema "casi acierte" empuja a aceptar algo que no es exactamente lo que el usuario queria decir. Mitigacion: opciones bien distintas entre si, y siempre una salida neutra (Espera, una pregunta).
2. **Hechos inventados** (SocializeChat). La memoria ayuda solo si el prompt la marca como unica fuente de hechos.
3. **Integridad contextual** ("I, Robot?"). Lo que se charla con la esposa no debe aparecer frente al medico. Hace falta separar la memoria por interlocutor o por cercania.
4. **Arrastre e identidad recortada.** Si solo se aprende de las opciones elegidas, el estilo se va achicando. Mitigacion: dar mas peso a lo deletreado y no limpiar el "lado filoso" del perfil (la ironia de Roberto).
5. **Privacidad.** Se guarda todo lo que se dice cerca del usuario. Para la demo es local; en el pitch hay que decir que la memoria es del usuario y que puede borrarla.

---

## 5. Proveedores y JSON (lo minimo para decidir)

- **Groq:**
  - Tier gratis para llama-3.3-70b: ~30 pedidos/min, ~1.000/dia, ~280-390 tokens/s. *Fuentes secundarias, verificar en la consola.*
  - Structured outputs con `strict: true` (decodificacion restringida) solo en algunos modelos (segun LangChain, gpt-oss-20b y 120b). El modo best-effort esta en mas modelos.
  - Sin streaming junto con structured outputs.
  - [Docs Groq](https://console.groq.com/docs/structured-outputs)
- **Gemini Flash (AI Studio gratis):**
  - Limites por proyecto, visibles en la consola. Fuentes secundarias dicen ~15 pedidos/min y ~1.500/dia.
  - **El tier gratis usa los datos para entrenar.** Importa: son conversaciones de una persona enferma.
  - [Precios](https://ai.google.dev/pricing)
- **`claude -p`:**
  - Los terminos no permiten usar los tokens OAuth de Free/Pro/Max en otro producto. Para la demo local de un hackathon es zona gris; **no sirve para un producto**.
  - En 2026 hubo cambios (y una pausa) en como se cobra el uso por SDK y `claude -p` en los planes. Verificar la pagina de ayuda en vivo.
  - Latencia de arranque: no encontre mediciones. **Hay que medirla.**
  - [Ayuda Anthropic](https://support.claude.com/en/articles/15036540)

---

## 6. Propuesta para la memoria (para el grill)

Tres capas, todas en JSON local, sin base vectorial:

1. **Perfil** (`src/llm/perfil.ts`): hechos estables y editables, como hoy, mas `frasesTipicas` usadas como ejemplos reales de estilo.
2. **Memoria de estilo:** las ultimas N respuestas del usuario, con mas peso para lo deletreado, metidas como ejemplos ("asi hablo yo"). Se aprende sola con el uso.
3. **Memoria de hechos:** frases cortas extraidas de los turnos ("Laura viene el domingo"), cada una con quien la dijo. Se recuperan por palabra clave, maximo 3 por pedido (como SocializeChat). Se filtran por cercania del interlocutor.

Mas la **cercania del interlocutor** (familia / conocido / medico) como dato del pedido, que cambia el tono y que memoria se puede usar.

Preguntas abiertas → ver el grill en el issue #2. Onboarding, aprendizaje y formato de memoria en detalle: [llm-onboarding-memoria.md](llm-onboarding-memoria.md).

---

## 7. Agente de memoria: como extraer y consolidar (state of the art)

- **Extraer de la conversacion cruda, no del resumen.** En LoCoMo y LongMemEval, guardar los mensajes crudos le gana a los resumenes en todos los datasets. Por ejemplo, 0,826 vs 0,675 en LoCoMo: el resumen convierte "una convencion de tecnologia para el bien" en "una convencion" ([Couchbase, vendedor](https://www.couchbase.com/blog/what-we-learned-evaluating-agent-memorythe-results-part-2/)). Los sistemas que puntuan mejor guardan los episodios crudos y extraen poco ([MemMachine](https://www.alphaxiv.org/abs/2604.04853), [arXiv 2511.17208](https://arxiv.org/pdf/2511.17208v2)).
- **Ponerle fecha a cada recuerdo.** En los mismos tests, agregar la fecha de la sesion a cada memoria sube el razonamiento temporal de 0,10 a 0,74 (Couchbase).
- **No borrar: invalidar con fecha.** Zep/Graphiti separa episodios crudos, entidades y comunidades. Cuando un hecho nuevo contradice uno viejo, le pone `invalid_at` en vez de borrarlo ([arXiv 2501.13956](https://arxiv.org/html/2501.13956)).
- **Consolidar fuera del turno.** "Sleep-time compute" de Letta: un agente de memoria aparte reescribe la memoria entre turnos, y asi baja ~5 veces el computo que hace falta al responder ([arXiv 2504.13171](https://arxiv.org/html/2504.13171v1)).
- **Mem0:** extraccion con ADD / UPDATE / DELETE / NOOP contra los recuerdos parecidos ([arXiv 2504.19413](https://arxiv.org/abs/2504.19413)). Un agregador reporta que en LongMemEval puntua bastante por debajo de pasar todo el contexto (sin verificar).
- **Para nosotros:** el usuario propuso "resumen de la conversacion, y un agente extrae lo relevante y lo agrega a la huella si no esta". La evidencia sugiere cuatro ajustes:
  1. Extraer de la transcripcion cruda, no del resumen; el resumen es solo para la memoria corta.
  2. Reconciliar (agregar, actualizar, invalidar), no solo agregar.
  3. No escribir sobre la huella base que cargo la familia, sino en una seccion aprendida aparte.
  4. Fechar todo.
