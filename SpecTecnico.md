# Spec técnico: asistente de comunicación aumentativa para ELA

Nov 7, 2026 · @Ciro

## 1. Contexto y alcance

Construimos una app web que permite a una persona con ELA (u otra condición que impida hablar) responder en una conversación con el menor esfuerzo motor posible y con frases que suenen a ella. El sistema escucha al interlocutor, propone respuestas listas para decir por TTS y ofrece un teclado con autocompletado y expansión de iniciales. Todo se apoya en un núcleo que aprende de la persona sin reentrenar ningún LLM.

**Principio de diseño:** el LLM propone y el modelo personal elige. El aprendizaje vive en una memoria (perfil, historial de frases elegidas, n-gramas y pesos de ranking), no en los pesos del LLM.

**Usuario principal:** la persona que no puede hablar (en este documento, "usuaria"). **Usuarios secundarios:** cuidadores que completan el perfil y ayudan con el onboarding. **Interlocutores:** familiares, médicos y amigos; no usan la app, solo hablan cerca del micrófono.

### Alcance de la hackathon (MVP)

- Captura de la voz del interlocutor y transcripción en español (es-AR).
- Selector manual de interlocutor (hija, médico, etc.).
- 4 respuestas sugeridas al terminar el turno del interlocutor.
- Teclado en pantalla con autocompletado de palabra, predicción de la siguiente palabra y expansión de iniciales con el LLM.
- Sugerencias que se filtran o regeneran mientras la usuaria tipea.
- Salida por TTS (voz clonada si hay clave de ElevenLabs; si no, la voz del navegador).
- Onboarding: preguntas de perfil + importación de un export de WhatsApp.
- Registro de eventos de selección y aprendizaje inmediato (memoria + n-gramas).
- Panel de métricas: tasa de aceptación, ahorro de teclas y latencia.
- Modo demo "antes y después": misma conversación con memoria vacía y con memoria cargada.

### Fuera de alcance (roadmap)

- Eye-tracking real y barrido por switch (el MVP usa mouse o tacto, pero la UI se diseña con objetivos grandes y pensando en un solo tipo de selección).
- Diarización automática de hablantes.
- Fine-tuning o LoRA del LLM.
- App móvil nativa, modo offline completo y sincronización entre dispositivos.
- Multiusuario y cuentas.

## 2. Arquitectura

Casi todo corre en el navegador. El backend es un proxy liviano que guarda las claves de API y llama al LLM y al TTS. La memoria, los n-gramas, los embeddings y el ranking viven en el cliente: son baratos, instantáneos y privados.

### Componentes

| Componente | Dónde corre | Responsabilidad |
| --- | --- | --- |
| `capture` | Cliente | Micrófono, transcripción del interlocutor y detección de fin de turno. |
| `personal-lm` | Cliente | Diccionarios de prefijos y n-gramas: autocompletado, predicción de la siguiente palabra y puntaje de estilo. |
| `memory` | Cliente (IndexedDB) | Perfil, eventos de selección, frases con embeddings y recuperación por similitud. |
| `embedder` | Cliente (Web Worker) | Embeddings locales con transformers.js. |
| `suggest` | Cliente + backend | Arma el prompt, llama al LLM y recibe candidatas. |
| `expand` | Cliente + backend | Expansión de iniciales y completado de frase mientras se tipea. |
| `ranker` | Cliente | Combina señales, aplica diversidad (MMR) y devuelve el top 4. |
| `tts` | Backend (proxy) + cliente | Streaming de audio con la voz elegida. |
| `onboarding` | Cliente | Preguntas de perfil, ingesta del export de WhatsApp y carga manual de vocabulario. |
| `consolidate` | Backend (a pedido o nocturno) | Actualiza la ficha de perfil con un LLM y aplica decaimiento a los conteos. |
| `metrics` | Cliente | Registra latencias, aceptación y ahorro de teclas; panel de métricas. |
| `api` | Backend | Endpoints `/suggest`, `/expand`, `/tts`, `/consolidate`. Sin estado. |

### Flujo A: respuestas sugeridas

1. `capture` transcribe al interlocutor de forma continua y emite transcripciones parciales y finales.
2. Al detectar fin de turno (resultado final + 700 ms de silencio), `memory` recupera los 8 eventos pasados más parecidos, filtrando primero por el interlocutor actual.
3. `suggest` envía al backend el perfil (prefijo cacheado), las últimas 6 líneas de la conversación y los ejemplos recuperados. El LLM devuelve 12 candidatas en JSON.
4. `ranker` puntúa cada candidata y muestra 4 diversas.
5. La usuaria elige (o edita y confirma). `tts` reproduce la frase. `memory` y `personal-lm` registran el evento.

Optimización especulativa: si una transcripción parcial dura más de 1,5 s sin cambios, se lanza la generación por adelantado. Si la frase final difiere en más de un 20% de los tokens, se descarta y se regenera.

### Flujo B: tipeo

1. Con cada tecla, `personal-lm` devuelve hasta 5 completados de la palabra actual y 3 predicciones de la siguiente, en menos de 5 ms.
2. Tras 350 ms sin teclas, o si el texto parece iniciales (3 o más letras sueltas separadas por espacio, o un token de 3 o más consonantes sin vocales), `expand` llama al LLM con el contexto de la conversación y lo tipeado.
3. Se descartan las candidatas que no respetan lo tipeado (validación de iniciales o del prefijo) y `ranker` ordena el resto.
4. Las sugerencias de frase del Flujo A que siguen en pantalla se filtran contra lo tipeado. Si quedan menos de 2, se pide una regeneración con el prefijo como restricción.

### Flujo C: aprendizaje

- **Inmediato (en cada selección):** se guarda el evento, se calcula el embedding de la frase dicha, se suman sus n-gramas y se agrega un ejemplo al ranker.
- **Diferido (cada 20 eventos o a pedido):** se reentrenan los pesos del ranker con regresión logística.
- **Consolidación (diaria o con un botón en la demo):** el LLM resume los eventos nuevos y propone cambios a la ficha de perfil; se aplica decaimiento a los n-gramas.

## 3. Modelo de datos

Todo se guarda en IndexedDB (con Dexie) bajo un `userId` local. Hay una sola usuaria por instalación. Los tipos están en TypeScript y viven en `packages/core/src/types.ts`.

```ts
// Ficha de perfil: se arma en el onboarding y la actualiza la consolidación
interface Profile {
  userId: string;
  displayName: string;          // "Marta"
  authorNameInChats: string;    // como figura en el export de WhatsApp
  language: "es-AR";
  personaCard: string;          // texto corto (≤ 250 palabras) que va al prompt
  styleRules: string[];         // "responde corto", "le dice 'gorda' a su hija"
  avoidTopics: string[];
  partners: Partner[];
  lexiconBoost: LexiconEntry[]; // nombres, remedios, lugares
  voice: { provider: "elevenlabs" | "browser"; voiceId?: string };
  updatedAt: number;
}

interface Partner {
  id: string;                   // "hija-laura"
  label: string;                // "Laura (hija)"
  relation: string;             // "hija", "médico", "amigo"
  register: "informal" | "formal";
  notes?: string;               // "le dice Lau"
}

interface LexiconEntry { term: string; boost: number; category?: string }

// Línea de conversación (lo dicho por cualquiera)
interface Turn {
  id: string;
  sessionId: string;
  speaker: "user" | "partner";
  partnerId?: string;
  text: string;
  ts: number;
}

// Evento de selección: la unidad de aprendizaje
interface SelectionEvent {
  id: string;
  sessionId: string;
  ts: number;
  mode: "suggest" | "type" | "expand";
  partnerId?: string;
  contextTurns: string[];       // últimas líneas, formateadas
  partnerUtterance?: string;    // lo último que dijo el interlocutor
  shown: Candidate[];           // lo que vio la usuaria, en orden
  chosenIndex: number | null;   // null = tipeó todo sin elegir
  finalText: string;            // lo que se dijo por TTS
  edited: boolean;              // eligió y luego modificó
  keystrokes: number;           // selecciones motoras hechas
  latencyMs: number;            // fin de turno → sugerencias visibles
  embedding: number[];          // de finalText
  contextEmbedding: number[];   // de partnerUtterance + contexto
}

interface Candidate {
  text: string;
  intent: "yes" | "no" | "short" | "elaborate" | "emotional" | "question" | "other";
  source: "llm" | "ngram" | "history";
  features?: RankFeatures;
  score?: number;
}

interface RankFeatures {
  llmRank: number;              // 0..1, 1 = primera del LLM
  styleLogProb: number;         // log-prob normalizada por largo bajo n-gramas personales
  histSim: number;              // similitud máx. con frases elegidas antes (mismo interlocutor primero)
  ctxMatch: number;             // similitud del contexto del ejemplo recuperado que inspiró la frase
  lengthPenalty: number;        // desvío del largo típico de la usuaria
}

// Pesos del ranker (aprendidos)
interface RankerWeights { w: Record<keyof RankFeatures, number>; bias: number; trainedOn: number }
```

### Modelo personal de lenguaje

Se guarda como JSON serializado en una sola clave de IndexedDB y se carga completo en memoria al iniciar.

```ts
interface PersonalLM {
  unigrams: Record<string, number>;               // "dale": 340
  bigrams: Record<string, Record<string, number>>; // "dale" → { "un": 12 }
  trigrams: Record<string, Record<string, number>>;// "dale un" → { "tecito": 9 }
  prefixIndex: Record<string, string[]>;          // "te" → top 8 palabras por conteo
  totalTokens: number;
  lastDecayAt: number;
}
```

- **Normalización:** minúsculas, NFC, sin URLs ni emojis, y se conservan las tildes. Para buscar por prefijo se compara sin tildes, pero se muestra la forma original más frecuente.
- **`prefixIndex`** se reconstruye para los prefijos de 1 a 4 caracteres cada vez que un conteo cambia el top 8 de ese prefijo.
- **Base genérica:** un archivo estático `es_base_freq.json` (las 50.000 palabras más frecuentes, generado una vez con `wordfreq`) que no se modifica.
- **Interpolación:** `P(w) = λ·P_personal(w) + (1−λ)·P_base(w)`, con `λ = min(0.9, totalTokens / (totalTokens + 2000))`.
- **Boost de léxico:** las entradas de `lexiconBoost` suman `boost × 50` a su unigrama y siempre entran en `prefixIndex`.

## 4. Módulos en detalle

### 4.1 `capture`: escucha y fin de turno

- **MVP:** Web Speech API (`webkitSpeechRecognition`, `lang = "es-AR"`, `continuous = true`, `interimResults = true`). Se reinicia sola al recibir `onend`.
- **Alternativa detrás de una interfaz:** `AsrProvider` con métodos `start()`, `stop()` y eventos `partial(text)` y `final(text)`. Una segunda implementación puede usar Deepgram streaming por WebSocket a través del backend.
- **Fin de turno:** llega un `final` y no hay `partial` nuevo durante 700 ms. Constante configurable `END_OF_TURN_MS`.
- **Eco del TTS:** mientras suena el TTS, se pausa la escucha y se retoma 300 ms después del final del audio, para no transcribir la voz de la propia usuaria.
- Cada turno final se guarda como `Turn` con el `partnerId` del selector activo.
- Siempre visible: un indicador de "escuchando" y un botón de pausa.

### 4.2 `memory`: almacenamiento y recuperación

- **Tablas Dexie:** `profile`, `turns`, `events`, `kv` (para `PersonalLM` y `RankerWeights`).
- **`retrieveExamples(partnerUtterance, partnerId, k = 8)`:**
  1. Calcula el embedding del contexto.
  2. Toma los eventos con `chosenIndex !== null` o con `finalText` tipeado.
  3. Puntúa: `cos(contextEmbedding, query) + 0.15` si coincide el `partnerId`, `+ 0.05` si la relación del interlocutor coincide, y `−0.1 × días/30` (mínimo −0.2) por antigüedad.
  4. Devuelve los k mejores como pares `{dijeron, respondió}`.
- **Búsqueda:** fuerza bruta sobre los vectores en memoria. Con menos de 20.000 eventos tarda menos de 10 ms y no necesita un índice vectorial.
- **Antes de tener eventos:** se usan pares sacados del export de WhatsApp (mensaje del otro → respuesta de la usuaria dentro de los 10 minutos siguientes) como eventos de origen `history`.

### 4.3 `embedder`

- transformers.js en un Web Worker con el modelo `Xenova/multilingual-e5-small` (384 dimensiones, cuantizado). Prefijos de e5: `"query: "` para el contexto y `"passage: "` para las frases.
- Se precarga al iniciar la app. Los embeddings se normalizan (L2) para usar el producto punto como coseno.
- Al importar WhatsApp se procesa por lotes de 32 y se muestra una barra de progreso.

### 4.4 `personal-lm`

- **`complete(prefix, prevWords)`:** candidatos de `prefixIndex[prefix]` y de la base. El puntaje combina la probabilidad interpolada del unigrama con el contexto del bigrama o trigrama si existe (backoff simple: trigrama → bigrama → unigrama, con factor 0,4 por cada nivel que se baja). Devuelve 5.
- **`predictNext(prevWords)`:** las 3 continuaciones más probables por trigrama, con backoff a bigrama.
- **`styleScore(text)`:** suma del log de la probabilidad con backoff de cada token, dividida por la cantidad de tokens. Se normaliza entre 0 y 1 con min-max sobre las candidatas del mismo lote.
- **`learn(text, weight = 1)`:** tokeniza y suma conteos. Si el texto fue editado, `weight = 2`. Actualiza `prefixIndex` para los prefijos afectados.
- **`decay()`:** multiplica todos los conteos por 0,98 por día transcurrido desde `lastDecayAt` y elimina los que quedan por debajo de 0,5.

### 4.5 `suggest`: respuestas sugeridas

- Recibe el perfil, el interlocutor, la conversación reciente y los ejemplos recuperados, y arma el prompt de la sección 5.1.
- Llama a `POST /suggest`. Espera JSON con 12 candidatas etiquetadas por `intent`.
- Si el JSON es inválido, reintenta una vez con temperatura 0. Si vuelve a fallar, muestra respuestas genéricas guardadas ("Sí", "No", "Esperá", "No entendí") más las 2 frases más usadas con ese interlocutor.
- Las 4 respuestas de reserva están siempre disponibles en una fila fija, aunque falle la red.

### 4.6 `expand`: tipeo asistido

- **Detección de modo:** `initials` si todos los tokens tienen 1 o 2 letras y hay al menos 3 tokens; `initials` también si hay un token de 3 o más consonantes sin vocales ("dut"); en otro caso, `prefix`.
- **Modo `initials`:** prompt de la sección 5.2. Validación: la candidata tiene la misma cantidad de palabras que tokens tipeados, y cada palabra empieza con la letra correspondiente (sin tildes ni mayúsculas). Si el usuario escribió una palabra completa entre las iniciales, debe aparecer igual en esa posición.
- **Modo `prefix`:** prompt de la sección 5.3. Validación: la candidata empieza con el texto tipeado, normalizado.
- **Cancelación:** cada nueva tecla cancela con `AbortController` la llamada en curso.

### 4.7 `ranker`

Puntaje lineal sobre las señales de `RankFeatures`, seguido de una selección diversa.

```ts
score = bias + w.llmRank*llmRank + w.styleLogProb*styleLogProb
      + w.histSim*histSim + w.ctxMatch*ctxMatch + w.lengthPenalty*lengthPenalty
```

- **Pesos iniciales:** `llmRank 0.35`, `styleLogProb 0.30`, `histSim 0.25`, `ctxMatch 0.10`, `lengthPenalty −0.15`, `bias 0`.
- **Diversidad (MMR):** se elige la mejor candidata y luego, de forma iterativa, la que maximiza `0.7·score − 0.3·máx(sim con las ya elegidas)`. Con las 4 elegidas, se garantiza al menos una con `intent` en {`yes`, `short`} y una en {`no`} si la pregunta admite sí o no (la marca el LLM con `yesNoQuestion`).
- **Aprendizaje de pesos:** cada evento en el que se eligió una candidata genera ejemplos positivo (la elegida) y negativos (las otras mostradas). Cada 20 eventos nuevos se entrena una regresión logística en el cliente (descenso de gradiente, regularización L2 de 0,01, 200 iteraciones). Los pesos nuevos se mezclan 50/50 con los anteriores para evitar saltos. Si hay menos de 30 eventos, se usan los pesos iniciales.

### 4.8 `tts`

- `POST /tts` hace de proxy a ElevenLabs con streaming. El cliente reproduce los fragmentos con `MediaSource` o, más simple, con un `Audio` sobre el blob completo si no hay streaming.
- **Alternativa:** `speechSynthesis` con una voz es-AR o es-419.
- **Cache:** las frases ya dichas se guardan como audio en IndexedDB (clave = hash del texto + voz). Las frases repetidas suenan sin latencia ni costo.

### 4.9 `onboarding`

1. **Datos básicos:** nombre, cómo figura en los chats y voz.
2. **Interlocutores frecuentes:** nombre, relación, registro y apodos.
3. **Preguntas de estilo (8 a 10):** cómo saludás, cómo decís que sí o que no, palabras que usás mucho, tu humor, temas que no querés que te sugiera, cosas que pedís seguido, remedios y lugares que nombrás.
4. **Import de WhatsApp (opcional pero recomendado):** subir uno o más `.txt`. El parser acepta los formatos de Android (`12/3/24, 14:05 - Marta: texto`) y de iOS (`[12/3/24, 14:05:33] Marta: texto`), une mensajes de varias líneas, descarta `<Multimedia omitido>`, mensajes eliminados y avisos del sistema. Se queda con los mensajes de `authorNameInChats` para `personal-lm` y arma los pares de contexto para `memory`.
5. **Generación de la ficha:** se envían las respuestas y una muestra de hasta 300 mensajes de la usuaria al prompt de la sección 5.4, que devuelve `personaCard`, `styleRules` y `lexiconBoost` sugeridos. La usuaria o el cuidador los revisan antes de guardar.

Todo el import se procesa en el cliente: los chats crudos nunca salen del navegador. Al backend solo viaja la muestra elegida para generar la ficha, y eso se le avisa a la usuaria.

### 4.10 `consolidate`

- Se dispara con un botón "Aprender de hoy" (para la demo) o una vez por día al abrir la app.
- Envía la ficha actual y hasta 100 eventos nuevos (`partnerUtterance`, `finalText`, si fue editado) al prompt de la sección 5.5.
- Recibe un diff de la ficha (`add`, `remove` y `update` sobre `styleRules`, `lexiconBoost` y `personaCard`). La app lo aplica y guarda una versión anterior para poder deshacer.
- Después ejecuta `personal-lm.decay()`.

### 4.11 `metrics`

- Por cada `SelectionEvent` se registra la latencia, si hubo aceptación y las teclas usadas.
- **Teclas de referencia:** cantidad de caracteres de `finalText` + 1 (el envío), como si se tipeara sin ninguna ayuda.
- El panel muestra las métricas de la sección 6 para la sesión actual y en total.

## 5. Prompts y contratos

Todos los prompts piden solo JSON, sin texto antes ni después ni bloques de código. El backend limpia posibles bloques \`\`\`json, valida con Zod y reintenta una vez si falla. El bloque estático (instrucciones + ficha de perfil) va primero y se marca para prompt caching. La parte variable (conversación, ejemplos, lo tipeado) va al final.

**Modelo:** uno rápido y barato, configurable por variable de entorno (`LLM_MODEL`, por ejemplo `claude-haiku-5-5`). Temperatura 0,7 para sugerencias, 0,3 para expansión y 0,2 para consolidación.

### 5.1 Respuestas sugeridas (`POST /suggest`)

```text
[SISTEMA, estático y cacheado]
Sos el motor de respuestas de un sistema de comunicación aumentativa para una persona que no puede hablar.
Tu trabajo es proponer frases que ELLA diría, en primera persona, con su forma de hablar. No sos un asistente: no expliques, no aconsejes, no agregues cortesías que ella no usa.

FICHA DE LA PERSONA:
{personaCard}
REGLAS DE ESTILO:
{styleRules, una por línea}
NO SUGERIR TEMAS: {avoidTopics}

Reglas:
- Frases cortas: la mayoría de 1 a 8 palabras, alguna de hasta 20.
- Español rioplatense, con voseo si ella lo usa.
- Variedad de intenciones: sí, no, corta, elaborada, emocional o con humor, y una pregunta de vuelta.
- Imitá el tono de los EJEMPLOS REALES: son lo más importante.
- Nunca afirmes datos médicos, decisiones de tratamiento ni consentimientos: en esos casos proponé frases como "Dejame pensarlo" o "Preguntale a mi hijo".

Devolvé SOLO este JSON:
{"yesNoQuestion": boolean, "candidates": [{"text": string, "intent": "yes"|"no"|"short"|"elaborate"|"emotional"|"question"|"other"}]}
Con exactamente 12 candidatas.

[USUARIO, variable]
INTERLOCUTOR: {label} ({relation}, registro {register}). {notes}
CONVERSACIÓN RECIENTE:
{últimas 6 líneas, "Laura: ..." / "Marta: ..."}
EJEMPLOS REALES DE CÓMO RESPONDE ELLA:
{k ejemplos: "Le dijeron: ... → Ella respondió: ..."}
ÚLTIMO MENSAJE AL QUE RESPONDER: {partnerUtterance}
```

Request y response del backend:

```ts
// POST /suggest
type SuggestReq = {
  profile: Pick<Profile, "personaCard" | "styleRules" | "avoidTopics" | "displayName">;
  partner: Partner;
  recentTurns: { speaker: string; text: string }[];
  examples: { said: string; replied: string }[];
  partnerUtterance: string;
};
type SuggestRes = {
  yesNoQuestion: boolean;
  candidates: { text: string; intent: Candidate["intent"] }[];
  usage: { inputTokens: number; outputTokens: number; cachedTokens: number };
  latencyMs: number;
};
```

### 5.2 Expansión de iniciales (`POST /expand`, `mode: "initials"`)

```text
[SISTEMA, estático y cacheado]
(Misma ficha y reglas de estilo que en 5.1.)
La persona escribe abreviado para ahorrar esfuerzo: solo la primera letra de cada palabra, y a veces alguna palabra completa.
Ejemplos: "d u t" → "dale, un tecito"; "n g e l" → "no, gracias, estoy llena"; "q h" → "qué hora"; "t q m" → "te quiero mucho"; "llamá a l" → "llamá a Laura".
Reglas:
- Una palabra por cada token, en el mismo orden.
- Cada palabra empieza con esa letra (sin importar tildes).
- Un token de más de una letra es la palabra exacta o su comienzo.
- La puntuación no cuenta como palabra.
Devolvé SOLO: {"candidates": [string]} con 8 candidatas distintas, de la más probable a la menos probable.

[USUARIO, variable]
INTERLOCUTOR: ...
CONVERSACIÓN RECIENTE: ...
EJEMPLOS REALES: ...
ABREVIATURA: {tokens separados por espacio}
```

### 5.3 Completado de frase (`POST /expand`, `mode: "prefix"`)

Igual que 5.2, cambiando la tarea por: "Completá la frase que empezó a escribir. Cada candidata empieza EXACTAMENTE con: `{typed}`". Devuelve 6 candidatas.

```ts
// POST /expand
type ExpandReq = Omit<SuggestReq, "partnerUtterance"> & {
  partnerUtterance?: string;
  mode: "initials" | "prefix";
  typed: string;
};
type ExpandRes = { candidates: string[]; usage: SuggestRes["usage"]; latencyMs: number };
```

### 5.4 Ficha inicial (`POST /consolidate`, `kind: "bootstrap"`)

```text
A partir de las respuestas del onboarding y de mensajes reales escritos por {displayName}, escribí:
- personaCard: un retrato de hasta 250 palabras en segunda persona ("Hablás corto, usás 'dale'...") enfocado en CÓMO habla: largo de frase, muletillas, humor, apodos, registro con cada persona. Nada de diagnósticos ni juicios.
- styleRules: de 5 a 12 reglas concretas y verificables.
- lexiconBoost: hasta 40 términos propios (nombres, apodos, lugares, remedios, expresiones) con boost de 1 a 3.
Devolvé SOLO: {"personaCard": string, "styleRules": [string], "lexiconBoost": [{"term": string, "boost": number, "category": string}]}

RESPUESTAS DEL ONBOARDING:
{q/a}
MUESTRA DE MENSAJES:
{hasta 300 mensajes}
```

### 5.5 Consolidación (`POST /consolidate`, `kind: "daily"`)

```text
Esta es la ficha actual de {displayName} y lo que dijo desde la última actualización (marcado si tuvo que corregir la sugerencia).
Proponé SOLO cambios respaldados por al menos 2 eventos. Si no hay nada nuevo, devolvé listas vacías.
Devolvé SOLO:
{"styleRules": {"add": [string], "remove": [string]},
 "lexiconBoost": {"add": [{"term": string, "boost": number}], "remove": [string]},
 "personaCardPatch": string | null,
 "rationale": [string]}

FICHA ACTUAL: ...
EVENTOS: {"Le dijeron X → Dijo Y [corregida]"}
```

`personaCardPatch` es la ficha completa reescrita o `null`. La app muestra el diff y `rationale` antes de aplicarlo.

### 5.6 `POST /tts`

```ts
type TtsReq = { text: string; voiceId?: string };
// Respuesta: audio/mpeg en streaming. Error 503 → el cliente usa speechSynthesis.
```

## 6. Latencia, costos y evaluación

La meta es que las sugerencias aparezcan en menos de 1,5 s (p50) después del fin de turno, y que el autocompletado de palabra nunca espere a la red. Los valores de la tabla son objetivos a medir, no garantías.

### Presupuesto de latencia (Flujo A)

| Etapa | Objetivo p50 | Notas |
| --- | --- | --- |
| Detección de fin de turno | 700 ms | Fijo por diseño; se puede bajar a 500 ms si no corta frases. |
| Embedding + recuperación | < 50 ms | Local, en el worker. |
| LLM (primer token → JSON completo) | < 800 ms | Modelo rápido, prefijo cacheado, salida de unos 250 tokens. |
| Ranking + render | < 20 ms | Local. |
| **Total desde fin de turno** | **< 1,5 s** | Con generación especulativa puede quedar por debajo de 1 s. |
| TTS (desde la selección hasta el primer audio) | < 500 ms | 0 ms si la frase está en cache. |

En el Flujo B, el autocompletado de palabra tiene un objetivo de menos de 5 ms y la expansión con el LLM de menos de 900 ms después de la pausa.

### Costos

- El LLM se llama una vez por turno del interlocutor y como máximo una vez por pausa al tipear (las llamadas canceladas no cuentan si se cortan antes de generar).
- **Por llamada:** unos 1.500 tokens de prefijo cacheado (instrucciones + ficha), entre 400 y 1.200 tokens variables (conversación + 8 ejemplos) y unos 250 de salida.
- La app registra el `usage` de cada llamada y el panel muestra tokens y costo estimado por hora de conversación, con los precios configurados en `.env`. Así el costo se mide en lugar de suponerse.
- ASR (Web Speech), embeddings, n-gramas y ranking no cuestan nada por uso. El TTS se ahorra con la cache.

### Métricas en vivo

| Métrica | Definición |
| --- | --- |
| Aceptación@4 | Eventos en los que la usuaria eligió una de las 4 sugerencias ÷ eventos totales. |
| Aceptación sin edición | Igual que la anterior, pero solo cuando no editó la frase elegida. |
| KSR (ahorro de teclas) | 1 − teclas usadas ÷ teclas de referencia (`finalText.length + 1`). |
| Latencia p50 y p95 | Desde el fin de turno (o la pausa al tipear) hasta que se ven las sugerencias. |
| Costo por hora | Suma estimada de tokens LLM y caracteres de TTS por hora de sesión. |

### Evaluación offline (script `eval/run.ts`)

Sirve para mostrar el aprendizaje con números y para ajustar parámetros sin depender de una persona real.

1. Se separa el export de WhatsApp por fecha: 80% para construir la memoria y los n-gramas, y el 20% más reciente para evaluar.
2. **Sugerencias:** para cada par (mensaje del otro → respuesta real de la usuaria) del conjunto de evaluación, se generan las 4 sugerencias. Hay acierto si alguna tiene similitud coseno ≥ 0,85 con la respuesta real (umbral ajustable), y se reporta también la similitud media de la mejor.
3. **Iniciales:** para cada mensaje real de 2 a 10 palabras, se generan sus iniciales y se mide si la frase exacta (normalizada) aparece en el top 1 y en el top 5. Con eso se calcula el KSR simulado.
4. **Condiciones:** (a) sin memoria ni n-gramas personales, (b) solo con la ficha de perfil, (c) sistema completo. La diferencia entre (a) y (c) es el número del pitch.
5. Se guarda un reporte en `eval/results/<fecha>.json` y una tabla en Markdown.

## 7. Stack, repo y plan de implementación

### Stack

| Capa | Elección |
| --- | --- |
| Monorepo | pnpm workspaces, TypeScript estricto |
| Frontend | Vite + React 18 + Tailwind; estado con Zustand |
| Persistencia local | Dexie (IndexedDB) |
| Embeddings | `@huggingface/transformers` en un Web Worker, modelo `Xenova/multilingual-e5-small` |
| Backend | Node 20 + Hono, sin estado |
| LLM | SDK oficial del proveedor, modelo configurable por `LLM_MODEL`, con prompt caching |
| TTS | ElevenLabs (streaming) con `speechSynthesis` como alternativa |
| Validación | Zod, con esquemas compartidos entre cliente y backend |
| Tests | Vitest para `packages/core` |

### Estructura

```text
/apps
  /web            # UI, capture, memory (Dexie), embedder worker, tts client, metrics
  /api            # Hono: /suggest /expand /tts /consolidate, prompts, retries
/packages
  /core           # lógica pura y testeable, sin DOM
    types.ts
    personal-lm.ts      # n-gramas, prefijos, styleScore, learn, decay
    ranker.ts           # features, score, MMR, entrenamiento logístico
    abbrev.ts           # detección de modo y validación de iniciales/prefijos
    whatsapp-parser.ts  # Android + iOS, pares de contexto
    retrieval.ts        # puntuación de ejemplos
    schemas.ts          # Zod de requests/responses
  /prompts        # plantillas de la sección 5 como archivos .ts
/eval
  run.ts
  fixtures/       # chats sintéticos para probar sin datos reales
/data
  es_base_freq.json
```

### UI

- **Una pantalla:** la transcripción arriba, el selector de interlocutor, 4 sugerencias grandes en el centro, la fila fija de reserva y el teclado abajo con la fila de autocompletado.
- **Objetivos táctiles:** de 64 px o más, con alto contraste y sin acciones que necesiten doble clic, arrastre o mantener presionado.
- **Todo con un solo tipo de selección:** se elige con clic o toque, para poder sumar después selección por permanencia de la mirada o por barrido sin rediseñar.
- **Al elegir una sugerencia:** se carga en el campo de texto y se reproduce de inmediato. Hay un botón "editar antes de decir" opcional.
- **Modo demo:** un interruptor "memoria vacía / memoria cargada" y un guion de conversación que reproduce los turnos del interlocutor con TTS desde otro dispositivo o con texto.

### Fases

Cada fase termina con algo que funciona de punta a punta.

1. **Esqueleto.** Monorepo, `/api` con `/suggest` devolviendo datos falsos y la UI con las 4 sugerencias y el TTS del navegador. *Hecho si:* se tipea una frase del interlocutor a mano, aparecen 4 sugerencias y suena la elegida.
2. **LLM real + captura.** Prompt 5.1, Web Speech, fin de turno y la fila de reserva. *Hecho si:* se habla al micrófono y en menos de 2 s aparecen sugerencias coherentes.
3. **Modelo personal + teclado.** `personal-lm` con la base genérica, autocompletado y predicción de la siguiente palabra. *Hecho si:* las sugerencias de palabra aparecen al instante y aprenden una palabra nueva después de usarla dos veces.
4. **Memoria + onboarding.** Dexie, embedder, parser de WhatsApp, recuperación, ficha inicial (5.4). *Hecho si:* después de importar un chat de prueba, las sugerencias usan muletillas y apodos de ese chat.
5. **Ranker + expansión.** Features, MMR, prompts 5.2 y 5.3, validación de iniciales y filtrado de sugerencias al tipear. *Hecho si:* "d u t" se expande correctamente en la conversación de prueba.
6. **Aprendizaje + métricas + eval.** Entrenamiento logístico, consolidación (5.5), panel de métricas, `eval/run.ts`. *Hecho si:* el reporte muestra la mejora entre las condiciones (a) y (c).
7. **Pulido de demo.** Voz clonada, cache de audio, modo demo y guion. Si sobra tiempo: generación especulativa.

Si el tiempo aprieta, el orden de recorte es: generación especulativa, consolidación, entrenamiento de pesos (se quedan los fijos) y completado por prefijo. El núcleo de la demo son las fases 1 a 5 más las métricas.

### Instrucciones para el LLM que implemente

- Implementá por fases, en orden, y no avances hasta cumplir el criterio de "hecho si" de la fase actual. Al terminar cada fase, resumí qué quedó y cómo probarlo.
- Toda la lógica sin DOM va en `packages/core`, con tests de Vitest. Como mínimo: parser de WhatsApp (los dos formatos, mensajes de varias líneas, mensajes de sistema), validación de iniciales, backoff de n-gramas, MMR y una iteración de entrenamiento del ranker.
- Las constantes ajustables (`END_OF_TURN_MS`, pesos iniciales, `k` de recuperación, cantidad de candidatas, umbrales) van en un único `config.ts`.
- Ninguna clave de API va al cliente. El backend lee `.env` (`LLM_API_KEY`, `LLM_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`) y hay un `.env.example`.
- Las llamadas al LLM se cancelan con `AbortController` y tienen un timeout de 4 s. Ante cualquier falla de red, la UI sigue funcionando con la fila de reserva y el modelo personal.
- No uses `localStorage` para datos de la usuaria: todo va a IndexedDB.
- Incluí `eval/fixtures` con dos chats sintéticos en formato WhatsApp (uno de Android y uno de iOS), de al menos 400 mensajes cada uno y con personalidades marcadas, para desarrollar y testear sin datos reales.
- Si algo de este spec es ambiguo o contradictorio, elegí la opción más simple que cumpla el criterio de la fase, dejá un `// DECISIÓN:` en el código y listalo en el resumen.

## 8. Privacidad, riesgos y preguntas abiertas

### Privacidad

- **Escucha visible y controlable:** un indicador permanente y un botón de pausa. No se graba audio: solo se guarda texto transcripto.
- **Datos locales:** memoria, chats importados, n-gramas y embeddings quedan en el navegador. Al backend solo viajan la conversación reciente, los ejemplos recuperados y la ficha, y el backend no guarda nada.
- **Borrado:** un botón "borrar todo" que vacía IndexedDB, y otro para borrar solo una sesión.
- **Terceros:** los interlocutores también quedan transcriptos. Para un producto real hace falta consentimiento y avisar a quienes hablan cerca. Hay que tenerlo presente en el pitch.

### Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| El LLM tarda más de 1,5 s | Generación especulativa, la fila de reserva siempre visible y el modelo personal sin red. Medir en la fase 2 y, si hace falta, cambiar de proveedor o modelo. |
| Las iniciales en castellano se expanden mal sin fine-tuning | Probarlo en la fase 5 con `eval`. Si el top 5 es bajo, mostrar más candidatas, sumar ejemplos al prompt o mezclar iniciales con palabras completas. |
| Web Speech transcribe mal o se corta | Interfaz `AsrProvider` con Deepgram como alternativa. En la demo, micrófono cerca y ambiente silencioso. |
| Sugerencias que hablan por la persona en temas sensibles | Regla en el prompt (5.1) y, para temas médicos o de consentimiento, siempre pedir confirmación explícita. |
| Las sugerencias suenan genéricas | Peso del estilo en el ranker, ejemplos reales en el prompt y la evaluación (a) vs (c) para detectarlo. |
| El TTS transcribe la propia voz de la usuaria | Pausar la escucha mientras suena el TTS (4.1). |

### Preguntas abiertas

- ¿Qué método de entrada se simula en la demo: tacto, mouse, permanencia de la mirada por webcam o barrido? Cambia el tamaño y la disposición de los objetivos.
- ¿Hay un chat real (con consentimiento) para la demo, o se usa solo el sintético?
- ¿Qué voz se usa para la demo: una clonada de alguien del equipo o una del catálogo?
- ¿El selector de interlocutor alcanza, o vale la pena intentar reconocer quién habla por la voz?
