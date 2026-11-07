# Research path voz: escuchar al interlocutor, fin de turno y decir la respuesta

Fecha: 2026-11-07. Fuentes primarias (specs, docs oficiales, codigo de Chromium) salvo donde se marca "(fuente secundaria)" o "(no verificado)".

## Resumen ejecutivo (stack recomendado)

- **Reconocimiento principal: Web Speech API de Chrome (`webkitSpeechRecognition`, `lang = 'es-AR'`, `continuous`, `interimResults`).** Gratis, cero backend, cero keys. Por defecto usa el servidor de Google (requiere internet). Es lo mas rapido de integrar en 5 horas.
- **Fin de turno: silencio fijo sobre los resultados de Web Speech** (timer de ~1000-1200 ms sin nuevos interim despues del ultimo `isFinal`), mas un boton/tecla manual para el interlocutor ("listo") como red de seguridad. Nada de modelos semanticos en el navegador para la demo.
- **Plan B de reconocimiento: Deepgram Nova-3 streaming** (USD 200 de credito gratis que no vence, websocket desde el navegador con token temporal minteado en un route handler). Alternativa: AssemblyAI Universal-Streaming multilingual (USD 50 gratis, diarizacion en streaming). Groq Whisper sirve solo por fragmentos (no es streaming).
- **Voz de salida principal: `speechSynthesis` con una voz local de Windows en espanol** (Sabina o Raul, es-MX), que no depende de red. No hay voz local es-AR. Cortar el texto por oraciones para esquivar el corte de ~15 s de las voces "Google" de Chrome.
- **Voz premium opcional: Azure Neural `es-AR-ElenaNeural` / `es-AR-TomasNeural`** (rioplatense real, tier F0 con 0,5 M caracteres/mes gratis) o ElevenLabs Flash v2.5 (~100 ms de latencia de modelo, 10k creditos/mes gratis). Siempre con fallback a `speechSynthesis`.
- **Eco: half-duplex.** Detener el reconocimiento (`abort()`) mientras el sistema habla y relanzarlo al terminar. El reconocimiento de Chrome por defecto no aplica cancelacion de eco (verificado en el codigo fuente). Sin barge-in.
- **Microfono:** un microfono direccional o de solapa apuntado al interlocutor, no el de la notebook; parlante alejado del microfono.
- **Urgencia:** alarma como archivo de audio pre-cargado (`<audio>` o Web Audio) + "Necesito ayuda" con `speechSynthesis` en loop; todo local, sin red.
- **"La voz de Roberto":** tecnicamente viable con ElevenLabs Instant Voice Cloning (minimo 10 s, recomendado 1-2 min de audio limpio), pero para la demo conviene como extra, no como camino critico.

---

## 1. Web Speech API en Chrome con es-AR

### Hallazgos

- **Red:** la spec define `processLocally` (por defecto `false`); con `false` el user agent puede procesar remoto, o sea mandar el audio a un servidor. [Spec Web Speech API](https://webaudio.github.io/web-speech-api/)
- **Modo on-device existe y ya shippeo:** `processLocally`, `SpeechRecognition.available()` y `SpeechRecognition.install()` estan en Chrome 139; el constructor sin prefijo `SpeechRecognition` tambien desde 139; `phrases` (biasing contextual) desde Chrome 142; `start(audioTrack)` desde Chrome 135. [MDN browser-compat-data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SpeechRecognition.json), [New in Chrome 139](https://developer.chrome.com/blog/new-in-chrome-139?hl=en), [Intent to Ship On-device Web Speech](https://groups.google.com/a/chromium.org/g/blink-dev/c/VNOok2dbmHM)
- `available()` resuelve `unavailable | downloadable | downloading | available`; por anti-fingerprinting devuelve `downloadable` hasta que la pagina llama `install()`, que requiere activacion del usuario (un click). [Spec](https://webaudio.github.io/web-speech-api/)
- **No esta confirmado que haya modelo on-device para espanol / es-AR.** Los packs on-device son los de SODA (Live Caption); se ven en `chrome://components`. Hay reportes de `language-not-supported` incluso tras instalar. [Hilo chrome-ai-dev-preview](https://groups.google.com/a/chromium.org/g/chrome-ai-dev-preview-discuss/c/Rlyc2uAsFCY) (fuente secundaria). Hay que probarlo en la notebook de la demo.
- **Cortes en Chrome (camino por red), codigo fuente de Chromium:**
  - `kNoSpeechTimeoutMs = 8000`: si no se detecta habla en 8 s, error `no-speech` y fin de sesion. [speech_recognizer_impl.h](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/speech_recognizer_impl.h)
  - En modo `continuous` el endpointer usa un unico timeout de silencio de 15 s; en modo no continuo, 0,5 s de silencio (1 s si el habla fue larga, > 3 s). [speech_recognizer_impl.cc](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/speech_recognizer_impl.cc)
  - El archivo no define un tope de duracion de grabacion; pero hay reportes de que el servicio corta sesiones largas igual (alrededor de 1-2 min). [W3C public-speech-api, 2015](https://lists.w3.org/Archives/Public/public-speech-api/2015May/0000.html) (fuente secundaria, no verificado en version actual).
  - La spec garantiza que `end` se dispara siempre que la sesion termina, sea cual sea la causa. [Spec](https://webaudio.github.io/web-speech-api/)
- **Errores relevantes:** `no-speech`, `network`, `language-not-supported`, `phrases-not-supported`. [Spec](https://webaudio.github.io/web-speech-api/)
- **Latencia y precision es-AR:** no hay benchmark publico oficial de Google para Web Speech en es-AR. Hay que medirlo en el lugar. (no verificado)
- **Relanzar sin perder palabras:** patron estandar: flag `deberiaEscuchar`; en `onend`, si el flag sigue en true, `start()` de nuevo tras 100-200 ms (evita `InvalidStateError` "already started"); no relanzar en loop si el error fue `not-allowed`. Servir por HTTPS o localhost para que no pida permiso en cada restart. [W3C public-speech-api](https://lists.w3.org/Archives/Public/public-speech-api/2015May/0000.html) (fuente secundaria). Lo que se dice durante los ~100-300 ms del hueco se pierde; para minimizarlo, relanzar en `onend` sin esperar y acumular el transcript propio (concatenar los `isFinal`) en vez de depender del `results` de la sesion.

### Recomendacion

Usar `webkitSpeechRecognition` (o `SpeechRecognition` si existe) con `lang='es-AR'`, `continuous=true`, `interimResults=true`, modo red. Envolverlo en un modulo con: flag de escucha, relanzado automatico en `onend`, transcript acumulado propio, y log de errores visible. Probar al inicio `SpeechRecognition.available({langs:['es-AR'], processLocally:true})`: si da `available`, es un plus para demos sin internet, pero no contar con eso. Cargar `phrases` con nombres propios de la demo (Roberto, etc.) si Chrome >= 142 y no da `phrases-not-supported`.

---

## 2. Fin de turno

### Hallazgos

- **Silencio fijo + VAD (lo clasico):** OpenAI Realtime `server_vad` usa en su ejemplo `threshold 0.5`, `prefix_padding_ms 300`, `silence_duration_ms 500`; `semantic_vad` con `eagerness` (`auto` = `medium`) decide segun si la frase "suena terminada". La guia no publica los defaults como tales, solo como ejemplo. [OpenAI Realtime VAD](https://developers.openai.com/api/docs/guides/realtime-vad)
- **LiveKit turn detector:** combina VAD + modelo de fin de turno (texto o audio). Endpointing por defecto: `min_delay` 0,5 s y `max_delay` 3,0 s (con el detector de audio, 0,3 s y 2,5 s). Soporta espanol. El detector de texto tarda ~50-160 ms en CPU; el VAD Silero por defecto exige 0,55 s de silencio. [LiveKit turn detector](https://docs.livekit.io/agents/build/turns/turn-detector/)
- **Pipecat Smart Turn v3.x:** modelo de audio basado en Whisper Tiny, ~8 M parametros (8 MB int8), 23 idiomas incluido espanol, ~10-100 ms en CPU; se corre despues de que el VAD detecta silencio. Inferencia en Python; no documenta version para navegador. [smart-turn](https://github.com/pipecat-ai/smart-turn)
- **Deepgram Flux:** STT con fin de turno integrado: `eot_threshold` 0,7, `eot_timeout_ms` 5000 (fuerza fin de turno tras 5 s de silencio), `eager_eot_threshold` opcional. Hay `flux-general-multi`; la doc no lista explicitamente espanol, pero el ejemplo usa `es` como `language_hint`. [Deepgram Flux config](https://developers.deepgram.com/docs/flux/configuration.md)
- **VAD en el navegador:** `@ricky0123/vad-web` (Silero ONNX). Defaults: `positiveSpeechThreshold 0.3`, `negativeSpeechThreshold 0.25`, `redemptionMs 1400` (silencio para cerrar segmento), `preSpeechPadMs 800`, `minSpeechMs 400`, frames de 512 muestras (v5) = 32 ms a 16 kHz. O sea, por defecto declara fin de habla ~1,4 s despues de que paras. [vad-web algoritmo](https://docs.vad.ricky0123.com/user-guide/algorithm/)
- El propio endpointer de Chrome en modo no continuo usa 0,5-1 s de silencio. [speech_recognizer_impl.cc](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/speech_recognizer_impl.cc)

### Recomendacion

Para Parpadeo el costo de cortar antes de tiempo (el LLM propone respuestas a media pregunta) es mas alto que esperar un poco: el usuario igual tarda segundos en elegir con parpadeos. Usar **silencio fijo de ~1200 ms** desde el ultimo resultado (interim o final) de Web Speech, configurable en el perfil. Opcional barato: si el texto termina en "?" o en palabras colgantes ("y", "que", "pero"), extender a 2 s. Agregar **disparo manual** (tecla grande o boton "ya pregunte") para el interlocutor/operador. No meter VAD extra ni modelos semanticos salvo que Web Speech falle.

---

## 3. Alternativas de reconocimiento

### Hallazgos

- **Groq Whisper:** `whisper-large-v3-turbo` USD 0,04/h, factor de velocidad 216x, WER 12%; `whisper-large-v3` USD 0,111/h. No es streaming (archivo por request). Minimo facturado 10 s por request; limite 25 MB en free. `language` opcional (pasar `es` mejora precision y latencia). [Groq STT](https://console.groq.com/docs/speech-to-text). Limites: 20 RPM, 2K RPD, 7,2K s audio/h, 28,8K s/dia (la pagina oficial los rotula como plan Developer; los limites del free hay que verlos en la consola). [Groq rate limits](https://console.groq.com/docs/rate-limits.md)
- **Deepgram:** USD 200 de credito gratis sin vencimiento y sin tarjeta; Nova-3 streaming USD 0,0077/min mono y 0,0092/min multilingue; Flux 0,0077-0,0078/min; 150 conexiones concurrentes. [Deepgram pricing](https://deepgram.com/pricing). Navegador: el backend llama `/v1/auth/grant` con la key y devuelve un JWT temporal (TTL default 30 s, max 3600 s); el token solo tiene que ser valido al abrir el websocket. [Deepgram token auth](https://developers.deepgram.com/guides/fundamentals/token-based-authentication)
- **AssemblyAI Universal-Streaming:** USD 50 gratis; multilingual (incluye espanol) USD 0,15/h; free: 5 streams nuevos por minuto; se factura por tiempo de conexion abierta. [AssemblyAI pricing](https://www.assemblyai.com/pricing). Navegador: token temporal por query param generado en el server. [AssemblyAI streaming websocket](https://assemblyai.com/docs/streaming/api-spec/streaming-websocket)
- **Gemini Live API:** audio de entrada PCM 16 bit 16 kHz, transcripcion de la entrada soportada, tokens efimeros recomendados para conexion directa desde el navegador. [Live API](https://aistudio.google.com/docs/live-api). Modelos `gemini-3.8-live`, `gemini-3.1-flash-live-preview`, `gemini-2.5-flash-native-audio-preview-12-2025` con tier gratis ("Free of charge"); pago desde USD 0,005/min de audio de entrada. [Gemini pricing](https://aistudio.google.com/docs/pricing). Es un modelo conversacional; usarlo solo como transcriptor es posible pero es mas pieza de la que hace falta. Rate limits del free: no verificados.
- **ElevenLabs Scribe v2 Realtime:** model id `scribe_v2_realtime`, ~150 ms, 90+ idiomas incluido espanol, websocket; sin diarizacion en realtime. [ElevenLabs models](https://elevenlabs.io/docs/models), [ElevenLabs STT](https://elevenlabs.io/docs/capabilities/speech-to-text). `scribe_v1` esta deprecado. Precio realtime ~USD 0,39/h (fuente secundaria).
- **Whisper en el navegador (transformers.js + WebGPU):** whisper-base ~74 M params, descarga ~200 MB segun precision; recomendacion general: solo tiny/base para tiempo real; Moonshine es solo ingles. Sin numeros de latencia confiables. [Comparativa offlinetts](https://offlinetts.com/blog/browser-speech-recognition-whisper-comparison/) (fuente secundaria).
- **Azure Speech STT:** es-AR soportado en tiempo real; F0: 5 h/mes gratis. [Azure idiomas](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts), [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/speech/)

### Tabla comparativa

| Opcion | Latencia | Costo / gratis | Espanol | Streaming | Integracion en Next.js |
|---|---|---|---|---|---|
| Web Speech (Chrome) | interim casi inmediato (no medido oficialmente) | gratis | es-AR | si | trivial, solo cliente, sin key |
| Deepgram Nova-3 / Flux | baja (streaming) | USD 200 gratis | si (Nova-3 multi; Flux multi con hint) | si, websocket | route handler que mintea JWT (`/v1/auth/grant`) + websocket desde cliente |
| AssemblyAI Universal-Streaming multi | baja (streaming) | USD 50 gratis, USD 0,15/h | si | si, websocket | route handler que mintea token temporal |
| Azure Speech STT | baja (streaming) | F0 5 h/mes | es-AR explicito | si | route handler que emite auth token; SDK JS |
| ElevenLabs Scribe v2 Realtime | ~150 ms | pago (~USD 0,39/h) | si | si, websocket | token de un solo uso desde server |
| Gemini Live | baja | tier gratis | si | si, websocket | token efimero desde server; protocolo mas complejo |
| Groq Whisper turbo | rapido por clip (216x), + red | barato, free con limites | si | no (por clip) | route handler que recibe blob; necesita VAD propio para cortar clips |
| Whisper en navegador | depende de GPU, no medido | gratis | si (multilingue) | pseudo | descarga ~200 MB, WebGPU, riesgo alto |

### Recomendacion

Arrancar con Web Speech. Si en la prueba en el lugar falla (red, ruido, precision), **Deepgram Nova-3 streaming** es el plan B: mas credito gratis, websocket desde el navegador con token temporal, `language=es` (o `multi`). Si la diarizacion importa, AssemblyAI. Descartar Whisper en navegador y Gemini Live para la hackathon (mucha pieza para poco beneficio).

---

## 4. Voces para decir en voz alta

### Hallazgos

- **Voces locales de Windows en espanol:** estandar: Pablo, Helena, Laura (es-ES); Raul, Sabina (es-MX). "Natural": Alvaro, Elvira (es-ES); Jorge, Dalia (es-MX). Ninguna es-AR. [Microsoft, idiomas y voces de Windows](https://support.microsoft.com/en-us/windows/appendix-a-supported-languages-and-voices-4486e345-7730-53da-fcfe-55cc64300f01)
- Las voces Natural de Windows no aparecen bien en Chrome; solo en Edge, y ahi como online. Las voces "Google" de Chrome desktop son online, sin fallback offline, y tienen el bug de corte con frases de mas de ~14 s; no emiten eventos `boundary`. [Readium, SpeechSynthesis en navegadores](https://readium.org/speech/docs/WebSpeech.html) (fuente secundaria tecnica)
- `localService` indica si la voz es local (true) o remota (false). [MDN SpeechSynthesisVoice](https://developer.mozilla.org/docs/Web/API/SpeechSynthesisVoice)
- **Bug de ~15 s:** con voces Google en Chromium desktop, utterances largas se cortan sin disparar `end`; workaround `pause()`+`resume()` cada ~10-14 s, o partir el texto en oraciones. No afecta voces de Microsoft/Edge. [PhET utterance-queue #60](https://github.com/phetsims/utterance-queue/issues/60), [Caktus, The Halting Problem](https://www.caktusgroup.com/blog/2025/11/03/the-halting-problem/) (fuentes secundarias)
- `getVoices()` puede devolver lista vacia al principio; hay que esperar `voiceschanged`. (comportamiento conocido; [MDN SpeechSynthesis](https://developer.mozilla.org/docs/Web/API/SpeechSynthesis))
- **Azure Neural:** `es-AR-ElenaNeural` (F) y `es-AR-TomasNeural` (M). F0: 0,5 M caracteres/mes gratis. [Azure idiomas](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts), [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/speech/). La latencia de primer byte no depende del largo del texto; usar streaming del SDK. [Azure, bajar latencia](https://docs.azure.cn/en-us/ai-services/speech-service/how-to-lower-speech-synthesis-latency)
- **ElevenLabs:** `eleven_flash_v2_5` ~100 ms mediana (sin red), 32 idiomas; `eleven_v4_turbo` ~100 ms; `eleven_v3_conversational` ~165 ms; `eleven_turbo_v2_5` deprecado. [ElevenLabs models](https://elevenlabs.io/docs/models). Free: 10k creditos/mes; Starter USD 6/mes. [ElevenLabs pricing](https://www.elevenlabs.io/pricing). El acento rioplatense depende de la voz elegida de la libreria (no verificado que haya buenas voces es-AR).
- **Gemini TTS:** `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, `gemini-2.5-flash-preview-tts` con tier gratis. [Gemini pricing](https://aistudio.google.com/docs/pricing). En Cloud TTS, locales espanol: es-ES (GA), es-419 y es-MX (preview); es-AR no listado; acento se pide por prompt de estilo. Sin cifras de latencia. [Gemini-TTS en Cloud](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts)
- **OpenAI TTS:** `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd` deprecados, se apagan el 6 de enero de 2027; voces optimizadas para ingles. No conviene empezar nada nuevo ahi. [OpenAI TTS](https://developers.openai.com/api/docs/guides/text-to-speech)
- **Deepgram Aura:** USD 0,030 / 1000 caracteres (Aura-2). [Deepgram pricing](https://deepgram.com/pricing). Soporte de espanol rioplatense no verificado.
- Latencia de primer audio en red: ninguna fuente oficial da numeros end-to-end comparables; solo ElevenLabs publica latencia de modelo. Medir en el lugar.

### Recomendacion

Base: `speechSynthesis` con la primera voz local espanola (`localService === true`, preferir Sabina/Raul, despues Helena/Pablo), partiendo el texto en oraciones. Es instantaneo, offline y suficiente. Si sobra tiempo: `es-AR-ElenaNeural`/`TomasNeural` de Azure via route handler que devuelve el audio (o un token), reproducido con `<audio>`; acento rioplatense real y gratis. ElevenLabs solo si se decide hacer la voz clonada (seccion 5). Urgencia: alarma en archivo local + `speechSynthesis` local en loop, nunca dependiente de red.

---

## 5. Banco de voz y clonacion para ELA

### Hallazgos

- **Message banking:** grabar con la voz natural palabras, frases y sonidos con significado personal para reproducirlos despues; no crea voz sintetica. **Voice banking:** crear una voz sintetica a partir de grabaciones. [Boston Children's, Message Banking](https://healthlibrary.childrenshospital.org/node/147997), [Team Gleason, Voice Preservation](https://teamgleason.org/pals-resource/voice-message-banking/). Team Gleason recomienda hacerlo lo antes posible tras el diagnostico. Boston Children's co-creo myMessageBanking.com con Tobii Dynavox. [AT3 Center](https://at3center.net/2022/05/24/als-awareness-preserve-your-voice/)
- **ElevenLabs Impact Program:** licencia Pro gratis para personas con perdida permanente de la voz (ELA/MND, entre otras), se aplica desde la cuenta. [ElevenLabs Impact Program](https://elevenlabs.io/impact-program). Duracion 5 anos extensible segun [Spoken AAC](https://spokenaac.com/blog/get-elevenlabs-access/) (fuente secundaria).
- **ElevenLabs Instant Voice Cloning:** minimo 10 s en total (archivos de >= 5 s); recomendado 1-2 min de audio limpio; no pasar de ~3 min. [ElevenLabs IVC](https://elevenlabs.io/docs/product-guides/voices/voice-cloning/instant-voice-cloning). El plan necesario no figura en la pagina leida (no verificado que el free lo incluya).
- **Acapela My-Own-Voice:** 50 oraciones con el motor actual; incluye espanol (variante norteamericana). [Comparativa MND Association, oct 2025](https://www.mndassociation.org/sites/default/files/public/2025-10/Voice%20banking%20services%20comparison%20chart%20-%20Oct%202025.pdf), [NASCL](https://nascl.rc.nau.edu/?p=199)
- **ModelTalker:** 800-1600 oraciones; idioma principal ingles. [Comparativa MND Association](https://www.mndassociation.org/sites/default/files/public/2025-10/Voice%20banking%20services%20comparison%20chart%20-%20Oct%202025.pdf)
- **Apple Personal Voice:** en iOS 26 bastan 10 frases; idiomas: ingles (EE.UU.), espanol (Mexico), chino mandarin. [9to5Mac](https://9to5mac.com/2026/03/19/ios-26-made-one-of-iphones-wildest-most-unique-features-a-lot-better/) (fuente secundaria). Solo dispositivos Apple; no usable desde Chrome en Windows.

### Recomendacion

Para la demo, "la voz de Roberto" es un golpe narrativo fuerte y tecnicamente barato (1-2 min de audio de alguien haciendo de Roberto + ElevenLabs IVC + `eleven_flash_v2_5`), pero agrega red, una key y un punto de falla en el camino critico. Hacerlo como capa opcional del perfil (`voz: 'sistema' | 'clonada'`) con fallback automatico a `speechSynthesis`. En el pitch, mencionar message banking + voice banking + Impact Program como camino real para usuarios.

---

## 6. Eco y barge-in

### Hallazgos

- **El reconocimiento de Chrome por defecto no usa getUserMedia ni cancelacion de eco:** `speech_recognizer_impl.cc` abre su propio dispositivo de entrada (`audio::CreateInputDevice`) y no tiene flags de echo cancellation, noise suppression ni AGC. [speech_recognizer_impl.cc](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/speech_recognizer_impl.cc). Por lo tanto las restricciones `echoCancellation`/`noiseSuppression` de getUserMedia no aplican a `webkitSpeechRecognition` en su modo por defecto.
- Desde Chrome 135 se puede pasar un `MediaStreamTrack` a `start(audioTrack)`; en teoria se podria pasar un track de getUserMedia con `echoCancellation: true`. [MDN start()](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start), [compat data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SpeechRecognition.json), [Intent to Ship MediaStreamTrack](https://groups.google.com/a/chromium.org/g/blink-dev/c/4ibjEVQ-i0s). No verificado en la practica.
- El cancelador de eco por software de Chrome usa un loopback interno de **lo que Chrome reproduce**. [Chrome, more native echo cancellation](https://developer.chrome.com/blog/more-native-echo-cancellation). Inferencia (no verificado): audio de TTS en la nube reproducido con `<audio>`/Web Audio entraria en la referencia; `speechSynthesis` con voces SAPI de Windows probablemente sale por el sistema operativo y no.
- Hay reportes de apps con Web Speech que se transcriben a si mismas cuando hablan; la solucion recomendada es pausar el microfono mientras se habla. [r/speechtech](https://libreddit.winscloud.net/r/speechtech/comments/1lctdun/help_web_speech_api_speechrecognition_is_picking) (fuente secundaria)

### Recomendacion

**Half-duplex estricto:** al empezar a hablar (`utterance.onstart` o `audio.play`) llamar `recognition.abort()` y marcar `deberiaEscuchar=false`; al terminar (`onend`, con timeout de seguridad por si `onend` no dispara) esperar ~300 ms y relanzar. Es mas confiable que cualquier AEC con parlantes fuertes. **Sin barge-in:** el usuario no habla, y si el interlocutor interrumpe mientras el sistema dice la respuesta elegida, perder eso es aceptable; la urgencia no se interrumpe por voz nunca.

---

## 7. Ruido ambiente y microfono

### Hallazgos

- Restricciones `echoCancellation`, `noiseSuppression`, `autoGainControl` de getUserMedia: solo aplican a streams capturados por getUserMedia, no al reconocimiento de Chrome por defecto (ver seccion 6). [MDN MediaTrackConstraints](https://developer.mozilla.org/docs/Web/API/MediaTrackConstraints), [speech_recognizer_impl.cc](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/speech_recognizer_impl.cc)
- El supresor de ruido por hardware del sistema puede interferir con la cancelacion de eco de Chrome. [Chrome, disabling hardware noise suppression](https://developer.chrome.com/blog/disabling-hardware-noise-suppression/)
- Para clonacion de voz y para ASR en general, la calidad de captura (un solo hablante, sin ruido ni reverberacion) pesa mas que el formato. [ElevenLabs IVC](https://elevenlabs.io/docs/product-guides/voices/voice-cloning/instant-voice-cloning)

### Recomendacion

Microfono de solapa (lavalier) o de mano direccional en el interlocutor, conectado por USB o cable a la notebook y elegido como dispositivo de entrada por defecto de Windows (Web Speech usa el default). Parlante lejos y apuntando hacia afuera del microfono. Mostrar en pantalla el transcript interim en vivo para que el jurado vea que escucha, y un indicador grande "escuchando / hablando". Ensayar en el lugar con el ruido real. Tener un modo "escribir la pregunta" como ultimo fallback.

---

## 8. Diarizacion

### Hallazgos

- **AssemblyAI streaming:** `speaker_labels: true` funciona en todos los modelos de streaming, incluido `universal-streaming-multilingual`; cada `Turn` trae `speaker_label` (A, B, ...); turnos de menos de ~1 s salen `PENDING`; las etiquetas se estabilizan con el tiempo. [AssemblyAI diarizacion streaming](https://www.assemblyai.com/docs/streaming/diarization-and-multichannel.md)
- **ElevenLabs Scribe v2 Realtime:** sin diarizacion (solo el modelo batch). [ElevenLabs STT](https://elevenlabs.io/docs/capabilities/speech-to-text)
- **Soniox:** dice diarizar hasta 15 hablantes en streaming en 60+ idiomas. [Soniox](https://soniox.com/speech-to-text/features/diarization) (pagina del proveedor)
- **Web Speech:** no tiene diarizacion. [Spec](https://webaudio.github.io/web-speech-api/)

### Recomendacion

No diarizar en la demo. Resolverlo fisicamente: un solo microfono direccional en el interlocutor, y el concepto de "turno del interlocutor" lo abre/cierra el sistema. Si se quiere mostrar "quien habla", AssemblyAI streaming multilingual con `speaker_labels` es la opcion mas concreta, pero agrega backend y latencia de estabilizacion.

---

## Preguntas abiertas para el grill

1. **Fin de turno:** aceptamos ~1,2 s de silencio + boton manual, o queremos que el interlocutor tenga una senal explicita ("listo") siempre? Quien toca el boton en la demo?
2. **Internet en el lugar:** tenemos red confiable? Si no, Web Speech por red y toda voz en la nube caen; el unico camino offline es on-device (sin confirmar para espanol) + `speechSynthesis` local.
3. **Voz de salida:** voz del sistema (Sabina/Raul, mexicana) alcanza, o el acento rioplatense (Azure es-AR) es parte del mensaje? Y la voz clonada de "Roberto": la hacemos, y con la voz de quien?
4. **Microfono:** conseguimos un microfono externo (solapa o de mano) para la demo, o dependemos del de la notebook?
5. **Que se transcribe:** solo al interlocutor durante su turno (half-duplex) o escucha continua? Mientras el usuario elige con parpadeos, se sigue escuchando o se pausa?
6. **Urgencia:** cuantas veces repite "Necesito ayuda", a que volumen, y como se corta (parpadeo, interlocutor, timeout)? Interrumpe una respuesta en curso?
7. **Varias personas hablando (jurado):** basta con ignorarlo o queremos mostrar quien habla (diarizacion)?
8. **Plan B de ASR:** definimos ahora el disparador para pasar a Deepgram (por ejemplo, si en la prueba en el lugar Web Speech falla mas de X veces) y quien prepara la key y el route handler?
9. **Privacidad en el pitch:** mencionamos que por defecto el audio va a Google, y que existe el modo on-device?

---

## Segunda tanda (pendientes del grill)

Fecha: 2026-11-07. Contexto ya decidido: escuchar con Web Speech de Chrome (es-AR, por red), hablar con `speechSynthesis`, microfono siempre abierto apuntado a una ronda de personas, aviso sonoro corto + corte de escucha antes de que el sistema hable.

### 2.1 Limites de los tiers gratis (solo para dejar anotado)

#### Hallazgos

- **Gemini Live API, modelos vigentes con tier gratis ("Free of charge"):** `gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-3.1-flash-live-preview`, `gemini-2.5-flash-native-audio-preview-12-2025`, `gemini-3.5-live-translate-preview` y **`gemini-3.5-transcribe-live`** (modelo de transcripcion en vivo, novedad respecto de la primera tanda). Pago: audio de entrada ~USD 0,005/min. En el tier gratis **los datos se usan para mejorar productos de Google**; en el pago no. [Gemini pricing](https://aistudio.google.com/docs/pricing)
- **Rate limits del free de Live:** la pagina publica de rate limits ya no los lista por modelo; remite a la pagina de la cuenta en AI Studio (requiere login), RPD se resetea a medianoche hora del Pacifico. No verificables sin cuenta. [Gemini rate limits](https://aistudio.google.com/docs/rate-limits)
- **Limites de sesion Live (todos los tiers):** sesion solo audio 15 min sin compresion de contexto; conexion websocket ~10 min (hay que reanudar con token de resumption, valido 2 h); con compresion de ventana deslizante la sesion puede durar indefinidamente. [Live session management](https://aistudio.google.com/docs/live-session)
- **Groq Whisper:** la pagina oficial muestra para `whisper-large-v3` y `whisper-large-v3-turbo`: 20 RPM, 2K RPD, 7,2K s de audio/hora, 28,8K s de audio/dia, y aclara que son "los limites base del plan Developer"; los del free solo se ven en la consola de la cuenta. [Groq rate limits](https://console.groq.com/docs/rate-limits). Fuentes secundarias reportan esos mismos numeros para el free y Developer en 400 RPM. [Free tier Groq, developersdigest](https://www.developersdigest.tech/rate-limits/groq) (fuente secundaria). Archivo maximo 25 MB en free. [Groq STT](https://console.groq.com/docs/speech-to-text)

#### Recomendacion

No cambia nada para la demo. Para el pitch: Gemini free usa los datos para entrenamiento, argumento mas a favor del camino local. Si alguna vez se usa Gemini como transcriptor, `gemini-3.5-transcribe-live` es el modelo indicado (no el conversacional), y hay que manejar la reconexion cada ~10 min.

---

### 2.2 Privacidad: alternativas locales para espanol

#### Hallazgos

- **Chrome on-device (`processLocally`), codigo de Chromium:**
  - Los packs de idioma son los de SODA (Live Caption). Locales con pack en desktop: `en-US`, `de-DE`, **`es-ES`**, `fr-FR`, `it-IT`, `ja-JP`, `hi-IN`, `pt-BR`, `id-ID`, `ko-KR`, `pl-PL`, `ru-RU`, `th-TH`, `tr-TR`, `vi-VN`, `cmn-Hans-CN`, `cmn-Hant-TW`. Existe el codigo `kEsUs` pero sin pack. **No hay pack es-AR ni es-419.** [components/soda/constants.h](https://chromium.googlesource.com/chromium/src/+/HEAD/components/soda/constants.h)
  - `available()`/`install()` mapean el idioma pedido con `GetLanguageComponentConfigMatchingLanguageSubtag`, que compara el subtag primario: `es-AR` deberia resolver al pack `es-ES`. [on_device_speech_recognition_impl.cc](https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/browser/speech/on_device_speech_recognition_impl.cc), [components/soda/constants.cc](https://chromium.googlesource.com/chromium/src/+/HEAD/components/soda/constants.cc). Ojo: otras comprobaciones del mismo archivo usan igualdad exacta (`IsLanguageInstallable`), asi que hay que probar en la notebook si `es-AR` da `downloadable` o hay que pedir `es-ES` explicitamente (no verificado en la practica).
  - Unico bloqueo de plataforma en ese archivo: Android (devuelve `unavailable`). Windows sigue el camino normal. Disponible desde Chrome 139 (ver seccion 1).
  - Microsoft Edge documenta la misma API con modelo propio (Edge Canary/Dev 150+, detras de flag) y lista **Spanish (es-ES)** entre los idiomas locales. Confirma que el modelo local de espanol es peninsular. [Edge, SpeechRecognition local](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/speech-recognition-api)
  - Calidad: es el motor de Live Caption; para rioplatense con un modelo es-ES no hay benchmark publico. Medir.
- **Whisper en navegador (transformers.js + WebGPU):** multilingue (espanol incluido), `whisper-base` ~74 M params (~40 MB en q4), `whisper-small` ~244 M; la guia practica es usar tiny/base para tiempo real, con chunks de ~3 s porque Whisper no es streaming nativo; si no hay WebGPU cae a WASM, mas lento. No hay benchmark de latencia en espanol publicado; hay que medir. [LogRocket, voice agent en el navegador](https://blog.logrocket.com/how-to-build-a-real-time-voice-ai-agent-in-the-browser) (fuente secundaria), [realtime-whisper-webgpu](https://huggingface.co/spaces/homegrownherbalist/realtime-whisper-webgpu/blob/353795a768ec59dfb94d568c35a85491d39fcd2b/README.md?code=true)
- **Moonshine:** **ya soporta espanol** (la primera tanda decia solo ingles: quedo desactualizado). README oficial: STT en ingles, espanol, aleman, mandarin, japones, coreano, vietnamita, tagalo, ucraniano y arabe; libreria para JavaScript/WASM entre otras plataformas; licencia MIT salvo los modelos legacy no streaming de idiomas no ingleses, que quedan bajo la "Moonshine Community License" no comercial (ver `LICENSE` para saber si el de espanol es uno de esos). Sin WER de espanol publicado en el README. [moonshine-ai/moonshine](https://github.com/moonshine-ai/moonshine)
- **Vosk (vosk-browser, WASM):** `vosk-model-small-es-0.42` 39 MB, WER 16,0 (Common Voice) / 16,7 (MTEDx) / 11,2 (MLS); `vosk-model-es-0.42` 1,4 GB, WER 7,5 / 10,1 / 5,8; ambos Apache 2.0. En navegador solo es razonable el small. [Modelos Vosk](https://alphacephei.com/vosk/models)

#### Comparativa local para espanol

| Opcion | Descarga | Precision esperable | Streaming | Costo de integrar |
|---|---|---|---|---|
| Chrome on-device (`processLocally`) | pack SODA, la baja Chrome | buena (motor Live Caption), modelo es-ES | si, misma API | casi cero: mismo modulo, `processLocally=true` + `install()` con un click |
| Moonshine (JS/WASM) | chico (decenas de MB) | sin dato publico para espanol | si (modelos streaming) | medio: libreria nueva, captura con getUserMedia, revisar licencia |
| Whisper base/small (transformers.js) | 40-250 MB | buena en small, floja en base | no (chunks) | alto: VAD + chunking + WebGPU |
| Vosk small (vosk-browser) | 39 MB | WER ~16% | si | medio, modelo viejo |

#### Recomendacion

Para el pitch: "hoy el audio va a Google; el camino es local y ya existe: el mismo codigo con `processLocally = true` usa el modelo de Chrome en la maquina, sin mandar audio". Es la unica opcion local con costo de integracion casi nulo, porque es la misma API. Si sobra tiempo en la hackathon, probar en la notebook: `SpeechRecognition.available({langs:['es-AR'], processLocally:true})` y, si da `unavailable`, repetir con `es-ES`; un click llama `install()`. No comprometerse a mostrarlo en vivo sin haberlo probado. Moonshine queda como segunda via local "seria" para despues (streaming, espanol, liviano), pendiente de licencia y precision.

---

### 2.3 `SpeechRecognition.start(audioTrack)` y eleccion de microfono

#### Hallazgos

- **Esta en la spec:** `start(optional MediaStreamTrack audioTrack)`. Si `kind != "audio"` o `readyState != "live"` tira `InvalidStateError`. Con track, no se pide permiso de microfono (`requestMicrophonePermission = false`) y el audio se consume "del MediaStreamTrack si se dio uno, o del microfono si no". La spec no define como elegir microfono. [Spec Web Speech API](https://webaudio.github.io/web-speech-api/), [MDN start()](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start)
- **Shippeado en Chrome desktop (Windows, Mac, Linux).** El Intent to Ship lo motiva justamente con que la API "usa el microfono default" y el track permite otras fuentes. [Intent to Ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/4ibjEVQ-i0s), [chromestatus](https://chromestatus.com/feature/5178378197139456). Compat MDN: Chrome 135 (ver seccion 1).
- **Ejemplos oficiales:** MDN usa `audioElement.captureStream()`; Edge usa `MediaStreamDestinationNode` de Web Audio. Hay un test de web-platform-tests que alimenta un WAV por track. [MDN start()](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start), [Edge](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/speech-recognition-api), [WPT SpeechRecognition-mediaStreamTrack](https://chromium.googlesource.com/external/w3c/web-platform-tests/+/refs/heads/DOMParser-interface/speech-api/SpeechRecognition-mediaStreamTrack-manual.https.html)
- **Con getUserMedia:** no encontre ejemplo oficial ni issue que muestre `getUserMedia({audio:{deviceId, noiseSuppression, echoCancellation, autoGainControl}})` -> `start(track)`. Por diseno deberia funcionar: un track de getUserMedia es un `MediaStreamTrack` de audio "live", y el procesamiento de audio (AEC/NS/AGC) se aplica al track antes de que lo consuma cualquier sink. En el codigo del manager, una sesion con track ("audio forwarder") no abre microfono propio (`use_microphone = !audio_forwarder_config`). [speech_recognition_manager_impl.cc](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/speech_recognition_manager_impl.cc). (Inferencia, no verificado en la practica.)
- **Sin track:** el manager usa el dispositivo que devuelve el flujo de permiso de Chrome; si no hay, `kDefaultDeviceId`. [speech_recognition_manager_impl.cc](https://chromium.googlesource.com/chromium/src/+/main/content/browser/speech/speech_recognition_manager_impl.cc). En la practica: el microfono elegido en la configuracion de sitio de Chrome (icono de camara/microfono en la barra o `chrome://settings/content/microphone`), que por defecto es el default de Windows (inferencia, no verificado en codigo).
- **Riesgo:** con track, el camino por red podria comportarse distinto (no documentado si el Intent cubre server-based; si cubre on-device). Hay que probarlo.

#### Recomendacion

Camino simple y seguro para la demo: **no usar track**; poner el microfono externo como dispositivo de entrada default de Windows **y** elegirlo en el selector de microfono del sitio en Chrome. Como mejora (30 min de prueba): `getUserMedia({audio:{deviceId:{exact:id}, echoCancellation:true, noiseSuppression:true, autoGainControl:true}})` y `recognition.start(stream.getAudioTracks()[0])`, con fallback a `start()` si tira error o no llegan resultados en ~5 s. Ventaja extra: el selector de microfono queda dentro de la app (`enumerateDevices`). Cuidado: al relanzar en `onend` hay que pasar de nuevo el mismo track (y no pararlo).

---

### 2.4 Voces gratis de `speechSynthesis` en Chrome Windows

#### Hallazgos

- **Las voces "Google" estan en Chrome desktop (incluido Windows)**, vienen de la extension interna "Google Network Speech" y **todas son remotas** (`"remote": true`, o sea `localService=false`). Espanol: **"Google espanol" (es-ES)** y **"Google espanol de Estados Unidos" (es-US)** (en el codigo los nombres llevan enie). No hay es-AR ni es-419. Total 19 voces. [manifest.json de network_speech_synthesis](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/resources/network_speech_synthesis/manifest.json)
- **Calidad vs SAPI:** Readium las describe como "voces de alta calidad", pero online, sin fallback offline, sin eventos `boundary`, y con el bug de corte; en su ranking las pone por debajo de las de Microsoft y Apple. Las voces "Natural" de Windows no aparecen en Chrome (solo en Edge). Las SAPI de Windows (Sabina/Raul es-MX, Helena/Pablo es-ES) son las voces "Desktop" clasicas, mas roboticas pero locales e instantaneas. [Readium, SpeechSynthesis en navegadores](https://readium.org/speech/docs/WebSpeech.html) (fuente secundaria tecnica). Comparacion auditiva: no hay fuente objetiva; la impresion comun es que "Google espanol de Estados Unidos" suena mas natural que Sabina/Raul (no verificado, probar).
- **Bug de corte (~14-15 s):** crbug 679437: con voces Google en Chromium desktop, utterances largas se detienen a los ~15 s y **no dispara `end` ni `error`**. Workarounds: `pause()`+`resume()` cada ~14 s desde `onstart` (rompe en Android), o partir el texto en oraciones. No afecta voces Microsoft. [PhET utterance-queue #60](https://github.com/phetsims/utterance-queue/issues/60), [Caktus, nov 2025](https://www.caktusgroup.com/blog/2025/11/03/the-halting-problem/) (fuentes secundarias que citan el crbug). No confirme si esta arreglado en Chrome actual.
- **`onend` que no dispara (otro caso):** si el objeto `SpeechSynthesisUtterance` no queda referenciado, puede ser recolectado y `onend` nunca llega; patron comun: guardarlo en una variable/array hasta `onend`. [Stack Overflow, onend not triggered](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/76204722/onend-not-triggered-with-speech-synthesis-api) (fuente secundaria). Tambien `getVoices()` vacio hasta `voiceschanged` (seccion 4).

#### Recomendacion

Elegir voz por `lang`, no por nombre: preferir `es-US` remota de Google si hay red (suena mejor, ademas su acento es latino neutro, mas cercano que es-ES), y caer a una local (`localService===true`, Sabina/Raul) si no aparece o si falla. Para la urgencia, **siempre voz local** (no depende de red ni tiene el bug de corte). Como las respuestas son cortas, partir por oraciones alcanza; igual poner un **timeout de seguridad** (largo estimado del texto + 2 s) que fuerce "termino de hablar" y reabra la escucha aunque `onend` no llegue, y guardar la referencia a cada utterance.

---

### 2.5 Microfono para captar una ronda de 3-5 personas

#### Hallazgos

- **Patrones:** omnidireccional capta igual en 360 grados (toda la sala); cardioide rechaza atras (nulo a 180 grados); supercardioide e hipercardioide son mas angostos adelante, con nulo a ~125 y ~110 grados y un lobulo trasero chico. [Shure, patrones hipercardioide y subcardioide](https://www.shure.com/en-US/performance-production/louder/specialist-polar-patterns-hypercardioid-and-subcardioid). Shotgun (lobular) es aun mas angosto: sirve para una sola fuente a distancia, no para una ronda.
- **Boundary (de mesa/conferencia):** capsula en la superficie de la mesa, pensado para reuniones. Shure Microflex MX391/MX392/MX393 viene en omni, cardioide y supercardioide (sufijo `/O`, `/C`, `/S`). [Shure MX393 (ficha de producto)](https://b2b.nmkelectronics.com/images/Products/SHURE/PDF/MX_pro_microflex_specsheet.pdf). Audio-Technica ATR4697-USB: boundary **omnidireccional**, USB-C, barato y facil de conseguir, pensado para teleconferencia. [ATR4697-USB](https://zzounds.com/item--AUTATR4697USB) (ficha de retailer)
- Un omni en el centro de una mesa capta igual a los jurados que el ruido del salon; un cardioide de mesa apuntado hacia la ronda deja el salon "atras".
- Mono vs estereo: irrelevante (Web Speech consume mono).

#### Recomendacion

Para una ronda de 3-5 personas sentadas o paradas cerca: **un microfono cardioide USB de mesa (tipo podcast/streaming, o un boundary cardioide), en el centro-borde de la mesa, apuntado hacia la ronda y con la espalda hacia el salon y el parlante.** Es lo mas barato y facil de conseguir. Evitar el boundary omni (capta todo el salon) y el shotgun (demasiado angosto para varias personas). La solapa sirve solo si hay un interlocutor principal. Lo que mas pesa: distancia corta (< 1 m de las bocas), parlante detras del microfono, y ganancia de Windows ajustada para no saturar. Si el salon es muy ruidoso, mejor un microfono de mano que se van pasando (el que habla, lo tiene): tambien ayuda a que el sistema sepa de quien es el turno.

---

### 2.6 Aviso al contacto en urgencia

#### Hallazgos

- **Telegram Bot API:** crear bot con @BotFather (token en 1 min); el contacto le manda cualquier mensaje al bot; `getUpdates` devuelve el `message.chat.id`; despues `POST https://api.telegram.org/bot<token>/sendMessage` con `chat_id` y `text`. Un bot no puede escribirle a quien nunca le hablo (el contacto tiene que iniciar el chat). Limites: ~1 msg/s por chat, ~30 msg/s global, 20/min en grupos. Gratis. [Bot API](https://core.telegram.org/bots/api#sendmessage), [Bots FAQ](https://core.telegram.org/bots/faq)
- **WhatsApp Cloud API (Meta):** requiere cuenta de Meta developer, app, business portfolio, numero de prueba y numeros destino verificados; los mensajes iniciados por la empresa van por plantilla (`hello_world` en el test) salvo dentro de la ventana de 24 h despues de que el destinatario escribe; el token temporal vence rapido (hay que crear system user para uno permanente). [Get started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started). Numero de prueba con hasta 5 destinatarios y token temporal de 24 h (segun docs de Meta, no visto en la pagina leida). Setup realista: 30-60 min y friccion de verificacion.
- **Twilio SMS trial:** solo a numeros verificados (hasta 5), 100 SMS de prueba, trial de 30 dias, SMS restringido al pais de registro durante el trial. [Twilio free trial](https://www.twilio.com/docs/messaging/guides/how-to-use-your-free-trial-account). Los SMS de trial llevan prefijo de cuenta de prueba (fuente secundaria). Hay que conseguir numero y verificar el destino; entrega SMS a Argentina no verificada.
- **CallMeBot (WhatsApp):** el contacto agenda +34 644 95 73 56 y le manda "I allow callmebot to send me messages"; recibe un apikey; despues un GET `https://api.callmebot.com/whatsapp.php?phone=...&text=...&apikey=...`. Gratis "solo para uso personal", sin SLA ni limites publicados; si el apikey no llega en 2 min, reintentar en 24 h. [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/). Ojo: el texto viaja en la URL (query string) a un tercero.
- **ntfy.sh:** sin cuenta: `POST https://ntfy.sh/<topic>` con el texto en el body; headers `Title` y `Priority: 5` (`urgent`/`max`). El contacto instala la app ntfy y se suscribe al topic. El topic funciona como contrasena: cualquiera que lo adivine puede leer o publicar. [ntfy publish](https://docs.ntfy.sh/publish/)
- **Email:** llega como push solo si el contacto tiene notificaciones de mail activas; con proveedores transaccionales hay que verificar dominio o remitente; es el canal mas lento y menos llamativo. (sin fuente especifica)

#### Tabla

| Canal | Setup | Costo | Confiabilidad | Limitaciones |
|---|---|---|---|---|
| Telegram Bot | ~5-10 min | gratis | alta (API oficial) | contacto con Telegram y que haya escrito al bot una vez |
| ntfy.sh | ~5 min | gratis | buena (servicio publico, sin SLA) | contacto instala la app ntfy; topic privado = secreto |
| CallMeBot WhatsApp | ~5 min + espera del apikey | gratis | media (tercero no oficial, uso personal) | datos en la URL; apikey puede tardar o no llegar |
| WhatsApp Cloud API | 30-60 min | gratis en test | alta | plantillas, ventana de 24 h, token que vence, verificacion de numeros |
| Twilio SMS trial | 15-30 min | trial gratis (100 SMS) | alta | solo verificados, pais de registro, prefijo de trial |
| Email | 10-20 min | gratis | media | push no garantizado, puede ir a spam |

#### Recomendacion

**Telegram Bot API** para la demo en vivo: el mas rapido de integrar con API oficial, gratis, y la notificacion llega como push con sonido al celular. Route handler `POST /api/urgencia` que hace `fetch` a `sendMessage` con `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en `.env.local` (el token nunca al cliente). Antes de la demo: el "contacto" (un celu del equipo, a la vista del jurado) le escribe al bot, se saca el `chat_id` con `getUpdates` y se guarda. Plan B de 5 min: ntfy.sh con `Priority: 5`. La alarma local y la voz de urgencia no dependen de este aviso: si la red falla, se loguea el error y sigue. WhatsApp Cloud API queda para el pitch ("en produccion, WhatsApp"), no para la hackathon.

---

### Sorpresas de esta tanda

- Moonshine ya tiene espanol (contradice la primera tanda) y libreria JS/WASM.
- Chrome on-device tiene pack `es-ES` y el mapeo por subtag sugiere que `es-AR` lo usa; no hay pack latino.
- Gemini tiene un modelo `gemini-3.5-transcribe-live` y en el tier gratis usa los datos para mejorar productos.
- Las voces "Google" de `speechSynthesis` son todas de red, incluida "Google espanol de Estados Unidos".
- `start(audioTrack)` permite elegir microfono y aplicar AEC/NS/AGC, pero no hay ejemplo publico con getUserMedia: probar antes de depender de eso.

---

## Tercera tanda: OpenAI y Groq contra Google

Fecha: 2026-11-07. Pregunta: "el proveedor de voz de OpenAI o Groq es mejor que Google?" Para que (escuchar, hablar), cuanto cuesta y cuanto lleva integrarlo hoy. "Google" aca es lo que usamos: Web Speech de Chrome (escuchar) y `speechSynthesis` (hablar).

### 3.0 Correcciones a las tandas anteriores

- **Defaults de `server_vad` / `semantic_vad` (seccion 2):** la referencia de la API ya los publica como defaults, no solo como ejemplo: `threshold` 0,5, `prefix_padding_ms` 300, `silence_duration_ms` 500; `semantic_vad` con `eagerness` `auto` (= `medium`) y **timeouts maximos de 8 s (`low`), 4 s (`medium`) y 2 s (`high`)**; `idle_timeout_ms` opcional de 5000 a 30000 (solo `server_vad`). [OpenAI, crear client secret (referencia)](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create.md)
- **OpenAI TTS (seccion 4): confirmado y ampliado.** La pagina oficial de deprecaciones (entrada 2026-10-01) dice que `tts-1`, `tts-1-hd` y `gpt-4o-mini-tts` (snapshots `-2025-03-20` y `-2025-12-15`) se apagan el **6 de enero de 2027**; el reemplazo indicado es `gpt-realtime-2.1-mini`, que **no** funciona en el endpoint `/v1/audio/speech` (solo Realtime). [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations), [OpenAI TTS](https://developers.openai.com/api/docs/guides/text-to-speech)
- **Nuevo, no estaba:** tambien se apagan los transcriptores viejos de OpenAI: `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` y `gpt-4o-transcribe-diarize` el **26 de febrero de 2027** (anuncio 2026-08-26); reemplazo `gpt-live-transcribe` o `gpt-transcribe`. [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations)
- **Groq rate limits (secciones 3 y 2.1):** hay contradiccion entre paginas oficiales. La de rate limits sigue mostrando 20 RPM / 2K RPD / 7,2K s de audio por hora para Whisper como "base del plan Developer"; la de modelos muestra para Developer 300 RPM (`whisper-large-v3`) y 400 RPM (`whisper-large-v3-turbo`), con 200K y 400K segundos de audio por hora, y archivo de hasta 100 MB. Probablemente los 20 RPM son los del free; los del free solo se ven en la consola. [Groq rate limits](https://console.groq.com/docs/rate-limits), [Groq models](https://console.groq.com/docs/models)

### 3.1 OpenAI para ESCUCHAR

#### Hallazgos

- **Modelos vigentes:** `gpt-live-transcribe` (streaming, deltas de texto mientras se habla) y `gpt-transcribe` (alta precision; en Realtime transcribe cada turno ya cerrado; tambien sirve por archivo en `/v1/audio/transcriptions`). Anunciados en el foro oficial el 2026-07-29. `gpt-realtime-whisper` sigue en la lista de modelos de transcripcion. [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription), [gpt-transcribe](https://developers.openai.com/api/docs/models/gpt-transcribe), [gpt-live-transcribe](https://developers.openai.com/api/docs/models/gpt-live-transcribe), [Anuncio en community.openai.com](https://community.openai.com/t/gpt-live-transcribe-and-gpt-transcribe-two-new-transcription-models-in-the-api/1388318)
- **Precio por minuto (pagina oficial):** `gpt-live-transcribe` USD 0,017/min (~USD 1/h), `gpt-realtime-whisper` USD 0,017/min, `gpt-transcribe` USD 0,0045/min (~USD 0,27/h), `gpt-4o-transcribe` ~0,006/min, `gpt-4o-mini-transcribe` ~0,003/min (estos dos deprecados). **No hay tier gratis** para audio: hace falta cuenta con saldo. [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
- **Fin de turno: depende del modelo.**
  - `gpt-live-transcribe` y `gpt-realtime-whisper` **no soportan VAD**: `turn_detection` tiene que ir en `null`; hay que detectar el fin de habla en el cliente (VAD propio) y mandar `input_audio_buffer.commit`. O sea, **no reemplaza nuestro silencio adaptativo**; lo seguimos necesitando (sobre audio en vez de sobre resultados). [Realtime VAD](https://developers.openai.com/api/docs/guides/realtime-vad), [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription)
  - Los modelos que si soportan VAD usan `server_vad` por defecto (en sesiones de transcripcion el VAD solo corta turnos, no genera respuesta). `semantic_vad` decide por el contenido si la frase termino, con tope de 8/4/2 s segun `eagerness`. La referencia no dice explicitamente que modelos de transcripcion soportan `semantic_vad`; que `gpt-transcribe` lo soporte es inferencia (no verificado). [Realtime VAD](https://developers.openai.com/api/docs/guides/realtime-vad), [Referencia client secrets](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create.md)
  - Con `gpt-transcribe` en Realtime el texto llega **despues** del commit del turno: no hay interim en vivo mientras habla el interlocutor. [gpt-transcribe](https://developers.openai.com/api/docs/models/gpt-transcribe)
- **Eventos:** `conversation.item.input_audio_transcription.delta` (texto incremental), `...completed` (final), `...failed`, `input_audio_buffer.committed`. Los `completed` pueden llegar desordenados: emparejar por `item_id`. [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription)
- **Configuracion util:** `languages: ["es"]` (array; con `gpt-live-transcribe` no mandar `language` singular; solo codigos ISO 639-1, no hay `es-AR`), `keywords` (nombres propios: "Roberto", etc.), `prompt` de contexto libre, `delay` (`minimal` a `xhigh`: menos delay = parciales antes, mas delay = mejor WER). Audio de entrada **solo PCM 16 bit a 24 kHz**. [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription), [Referencia](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create.md)
- **Ruido:** `audio.input.noise_reduction` con `type` `near_field` (microfono cerca) o `far_field` (microfono de notebook o de sala) y `strength` 0-1. Para la ronda de personas: `far_field`. Ademas, al capturar con `getUserMedia` Chrome aplica `echoCancellation`/`noiseSuppression`/`autoGainControl` al track (a diferencia de Web Speech, que abre su propio dispositivo, ver seccion 6). [Referencia](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create.md), [MDN MediaTrackConstraints](https://developer.mozilla.org/docs/Web/API/MediaTrackConstraints)
- **Desde el navegador:** un route handler hace `POST /v1/realtime/client_secrets` con la key y una config de sesion `type: "transcription"`; devuelve un secreto efimero (TTL default 600 s, min 10, max 7200; solo tiene que valer al abrir la sesion). El camino documentado para transcripcion es WebSocket (`wss://api.openai.com/v1/realtime?intent=transcription`; `gpt-transcribe` "requiere WebSocket"). Como el WebSocket del navegador no manda headers, el token va por subprotocolo; ese detalle, y el camino WebRTC (`/v1/realtime/calls`) para sesiones de solo transcripcion, aparecen solo en fuentes secundarias contradictorias (una dice que WebRTC daba 401, otra que funciona). [Referencia client secrets](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create.md), [Zenn](https://zenn.dev/seya/scraps/a43c7c072fb33d) (fuente secundaria), [community.openai.com](https://community.openai.com/t/how-to-use-transcription-only-with-the-realtime-typescript-sdk/1357903) (fuente secundaria). **No verificado oficialmente: probar antes de comprometerse.**
- **Calidad en espanol:** OpenAI no publica WER por idioma. Promedios propios: `gpt-live-transcribe` 19,70% en Common Voice (22 idiomas) y 9,60% en grabaciones reales (9 idiomas), apenas mejor que `gpt-realtime-whisper`. [Anuncio](https://community.openai.com/t/gpt-live-transcribe-and-gpt-transcribe-two-new-transcription-models-in-the-api/1388318). The Decoder reporta que `gpt-transcribe` mejora al anterior pero queda detras de ElevenLabs, Google y Mistral en tasa de error. [The Decoder](https://the-decoder.com/gpt-transcribe-improves-on-its-predecessor-but-cant-catch-elevenlabs-google-or-mistral-on-error-rates/) (fuente secundaria). **No hay comparacion publica contra Web Speech de Chrome en es-AR**: la afirmacion "OpenAI escucha mejor que Google" no esta respaldada por datos publicos para nuestro caso.
- **Latencia:** sin cifras oficiales; solo "low-latency" y `delay` ajustable. Medir.

### 3.2 OpenAI para HABLAR

#### Hallazgos

- **Vigente hasta el 2027-01-06:** `gpt-4o-mini-tts` en `/v1/audio/speech` (ver 3.0). Funciona hoy y para la demo alcanza; para produccion no, porque se apaga en dos meses y el reemplazo (`gpt-realtime-2.1-mini`) es un modelo conversacional de Realtime, no un TTS. [OpenAI TTS](https://developers.openai.com/api/docs/guides/text-to-speech), [gpt-realtime-2.1-mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
- **Voces:** alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse, **marin y cedar (recomendadas por calidad)**. "Optimizadas para ingles"; el soporte de idiomas sigue al de Whisper (espanol incluido). [OpenAI TTS](https://developers.openai.com/api/docs/guides/text-to-speech)
- **Acento rioplatense:** con `gpt-4o-mini-tts` el campo `instructions` controla acento, tono, entonacion y velocidad, asi que se puede pedir "espanol rioplatense, voseo, tono calido". Que suene argentino de verdad **no esta verificado** (voces de base inglesa). Probar con 2-3 frases antes de decidir. [OpenAI TTS](https://developers.openai.com/api/docs/guides/text-to-speech)
- **Streaming y formato:** respuesta con chunked transfer (se puede reproducir antes de que termine); mp3, opus, aac, flac, wav, pcm 24 kHz; para menor latencia, wav o pcm. Sin cifra oficial de latencia de primer audio. [OpenAI TTS](https://developers.openai.com/api/docs/guides/text-to-speech)
- **Precio:** `gpt-4o-mini-tts` USD 0,60 / 1M tokens de texto de entrada y USD 12 / 1M tokens de audio de salida; `tts-1` USD 15 / 1M caracteres; `tts-1-hd` USD 30 / 1M caracteres. Sin tier gratis. [OpenAI pricing](https://developers.openai.com/api/docs/pricing). La estimacion historica de OpenAI para `gpt-4o-mini-tts` era ~USD 0,015 por minuto de audio (hoy no figura; no verificado). Para respuestas cortas de Parpadeo, centavos por hora de demo.
- **Camino futuro de OpenAI para voz:** `gpt-realtime-2.1-mini` (audio de salida USD 20 / 1M tokens, solo `v1/realtime`, WebRTC/WebSocket/SIP). Se le puede mandar texto y pedirle que lo lea, pero es un modelo que razona y responde: riesgo de que no lea literal. No es lo que necesitamos. [gpt-realtime-2.1-mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)

### 3.3 Groq para ESCUCHAR

#### Hallazgos

- **Modelos vigentes (produccion):** `whisper-large-v3-turbo` (USD 0,04/h, 216x tiempo real, WER 12%) y `whisper-large-v3` (USD 0,111/h, 189x, WER 10,3%). Sin deprecacion anunciada; `distil-whisper-large-v3-en` se apago el 2025-08-23. [Groq STT](https://console.groq.com/docs/speech-to-text), [Groq models](https://console.groq.com/docs/models), [Groq deprecations](https://console.groq.com/docs/deprecations)
- **Confirmado: no hay streaming.** Solo request por archivo (flac, mp3, mp4, m4a, ogg, wav, **webm**). **Minimo facturado 10 s por request.** Archivo max 25 MB free / 100 MB dev. `language: "es"` mejora precision y latencia. [Groq STT](https://console.groq.com/docs/speech-to-text)
- **Latencia real por request:** Groq no publica numeros (solo el factor de velocidad). Por el factor, el computo de una frase de 5 s es de decenas de ms; el total lo domina la red Argentina-EE.UU. mas la subida del audio (estimado 300-800 ms, no verificado: medir).
- **Uso en tiempo casi real:** capturar con `getUserMedia` (con AEC/NS/AGC), VAD en el navegador (`@ricky0123/vad-web`, ver seccion 2) que corta cada frase al detectar silencio, mandar el segmento (WAV/webm) a un route handler `POST /api/voz/transcribir` que llama a Groq con la key del server. El fin de turno lo da el VAD (sobre audio, no sobre la llegada de resultados) y el texto llega de una vez por frase, sin interim. Con frases de ~3 s se pagan 10 s cada una (~3x el nominal), igual centavos.
- **Tier gratis:** existe, pero sus limites solo se ven en la consola de la cuenta (ver 3.0). Para una demo de minutos alcanza holgado.
- **Riesgo conocido de Whisper:** alucina texto sobre silencio o ruido (en espanol, frases tipo "Gracias por ver"). Mitigar mandando solo segmentos con habla (VAD) y descartando textos muy cortos. (conocido en la comunidad; sin fuente primaria leida en esta tanda)

### 3.4 Groq para HABLAR

#### Hallazgos

- `playai-tts` y `playai-tts-arabic` se apagaron el **2025-12-31**. Lo vigente es `canopylabs/orpheus-v1-english` (USD 22 / 1M caracteres) y `canopylabs/orpheus-arabic-saudi` (USD 40 / 1M caracteres), **ambos en preview** ("solo evaluacion, pueden discontinuarse sin aviso"). **No hay espanol.** Limite Developer: 10 RPM, 100 RPD. [Groq TTS](https://console.groq.com/docs/text-to-speech), [Groq models](https://console.groq.com/docs/models), [Groq deprecations](https://console.groq.com/docs/deprecations), [Groq rate limits](https://console.groq.com/docs/rate-limits)
- **Conclusion: Groq no sirve para hablar en espanol.** Descartado.

### 3.5 Tabla comparativa

**Escuchar**

| | Google Web Speech (actual) | OpenAI `gpt-live-transcribe` | OpenAI `gpt-transcribe` (Realtime) | Groq `whisper-large-v3-turbo` |
|---|---|---|---|---|
| Calidad es / es-AR | `lang='es-AR'` explicito; sin benchmark publico | solo promedios multilingues (19,7% CV); sin dato de espanol; `languages:["es"]` sin variante | "alta precision", sin dato de espanol | WER 12% promedio; sin variante regional; alucina en silencio |
| Streaming / interim | si, pero llega en tandas con atraso (lo visto) | si, deltas | no: texto despues de cerrar el turno | no: por frase |
| Fin de turno propio | no (silencio sobre resultados, lo nuestro) | **no** (VAD en el cliente + `commit`) | si: `server_vad` (500 ms default); `semantic_vad` probable, no verificado | no (VAD en el cliente) |
| Eco / ruido | sin AEC (abre su propio microfono) | `getUserMedia` con AEC/NS + `noise_reduction far_field` | igual | `getUserMedia` con AEC/NS |
| Latencia | no medida oficialmente | sin cifra oficial, `delay` ajustable | + tiempo de transcribir el turno | red + subida por frase, sin cifra oficial |
| Costo | gratis | USD 0,017/min (~1 USD/h) | USD 0,0045/min (~0,27 USD/h) | USD 0,04/h (min 10 s por request) |
| Tier gratis | si | no | no | si (limites en consola) |
| Integracion | hecha | 3-4 h: route handler de client secret, AudioWorklet a PCM 24 kHz + base64, websocket, VAD propio, reconexion; auth desde navegador sin doc oficial clara | 3-4 h, igual pero sin VAD propio | 2-3 h: vad-web + route handler que reenvia el audio |

**Hablar**

| | `speechSynthesis` (actual) | OpenAI `gpt-4o-mini-tts` | Groq Orpheus |
|---|---|---|---|
| Calidad / acento | robotica; es-US de red o es-MX/es-ES local; sin es-AR | mucho mas natural (marin/cedar); acento pedible por `instructions`, rioplatense no verificado | no hay espanol |
| Latencia | inmediata (local) | red + primer chunk, sin cifra oficial | n/a |
| Costo | gratis | ~USD 0,015/min estimado; sin tier gratis | n/a |
| Vigencia | estable | **se apaga 2027-01-06** | preview |
| Integracion | hecha | 1-1,5 h: route handler `POST /api/voz/decir` que hace streaming de opus/mp3, `<audio>` en el cliente, timeout y fallback | n/a |

### 3.6 Recomendacion

**Respuesta corta a "OpenAI o Groq es mejor que Google":** para **hablar**, OpenAI si suena claramente mejor que `speechSynthesis` (Groq no tiene espanol). Para **escuchar**, no hay evidencia publica de que OpenAI o Groq transcriban mejor es-AR que Web Speech; lo que ganan es control (AEC/NS via `getUserMedia`, VAD sobre audio, `keywords`), a costa de 2-4 h, una key paga (OpenAI) y un punto de falla mas. Ninguno resuelve solo el fin de turno con su modelo de streaming: `gpt-live-transcribe` exige VAD propio.

**Para la demo de hoy (pocas horas):**

1. **Cambiar primero HABLAR, no escuchar.** `gpt-4o-mini-tts`, voz `marin` o `cedar`, `instructions` pidiendo espanol rioplatense con voseo, formato `opus` o `mp3` en streaming, via route handler con `OPENAI_API_KEY` en `.env.local`. 1-1,5 h. Requiere cuenta OpenAI con saldo (no hay tier gratis). Probar el acento con 3 frases antes de integrar; si no convence, Azure `es-AR-ElenaNeural`/`TomasNeural` (seccion 4) sigue siendo la unica opcion con rioplatense nativo y tier gratis.
2. **Fallback de hablar:** si el route handler falla o no llega el primer audio en ~1,5 s, cancelar y decir con `speechSynthesis`. La **urgencia siempre con voz local**, nunca por red.
3. **Escuchar: mantener Web Speech** y atacar el "refresca tarde" sin cambiar de proveedor: correr `@ricky0123/vad-web` sobre un `getUserMedia` en paralelo y usar su `onSpeechEnd` como senal de fin de turno (sobre audio, no sobre la llegada de resultados); el texto lo sigue dando Web Speech. ~1 h. (Que Chrome permita `getUserMedia` mientras Web Speech usa el microfono es lo esperable, pero no verificado: probar.)
4. Si igual se quiere probar Groq para escuchar: es la opcion barata y rapida de integrar (vad-web + route handler), pero se pierde el interim en pantalla y aparece el riesgo de alucinaciones. No antes que 1-3.

**Para "produccion":**

- **Hablar:** no apostar a OpenAI TTS (se apaga 2027-01-06 y su reemplazo es un modelo conversacional). Azure Neural es-AR o ElevenLabs (voz clonada) siguen siendo mejores candidatos (secciones 4 y 5).
- **Escuchar:** si Web Speech no alcanza, `gpt-transcribe` en Realtime con `server_vad`/`semantic_vad` + `noise_reduction far_field` + `keywords` es la opcion OpenAI con mejor relacion precio/fin de turno (~USD 0,27/h). Compararla en el mismo audio contra Deepgram Flux (fin de turno integrado, credito gratis grande, secciones 2-3) y `gemini-3.5-transcribe-live` antes de elegir.
- **Google como fallback:** en `src/voz`, detras de `iniciarVoz`, una interfaz unica de escucha (iniciar/detener, eventos de texto y de fin de turno al bus) con dos implementaciones (`webspeech` y la de nube), elegida por perfil o variable de entorno. Pasar automaticamente a `webspeech` si falla el route handler del token, se cierra el websocket, o no llega texto en ~5 s con el VAD marcando habla. Lo mismo para decir: nube con timeout, `speechSynthesis` de respaldo.

### 3.7 Lo que no se pudo verificar

- Calidad real de cualquiera de los tres en es-AR con nuestro microfono y ruido: no hay benchmark publico. Medir con 10 frases grabadas.
- Latencia de primer audio de `gpt-4o-mini-tts` y latencia de `gpt-live-transcribe` / `gpt-transcribe`: sin cifras oficiales.
- Que `instructions` logre un acento rioplatense creible.
- Camino oficial para autenticar desde el navegador una sesion de solo transcripcion (subprotocolo de WebSocket o WebRTC `/v1/realtime/calls`): solo fuentes secundarias contradictorias.
- Que `gpt-transcribe` soporte `semantic_vad` en sesiones de transcripcion.
- Limites del tier gratis de Groq (solo en consola) y la contradiccion entre sus dos paginas de limites.
- Precio por minuto actual de `gpt-4o-mini-tts` (solo hay precio por token).

---

## Cuarta tanda: que reconocedor usar (escuchar)

Fecha: 2026-11-07. Decision del equipo: cambiar el reconocimiento (escuchar al interlocutor), no la voz que habla. Problema visto con Web Speech: resultados en tandas atrasadas y fin de turno dificil. Requisitos: espanol rioplatense, texto parcial en vivo, fin de turno propio del proveedor, baja latencia, conexion desde el navegador con token efimero minteado en un route handler, credito gratis o barato.

### 4.0 Correcciones a las tandas anteriores

- **Deepgram Flux SI soporta espanol (seccion 2 decia "la doc no lista explicitamente espanol").** `flux-general-multi` lista 10 idiomas, espanol (`es`) incluido; acepta subtags tipo `es-AR` pero cae al idioma base si no hay match exacto. `language_hint` es repetible y solo vale con `flux-general-multi` (con otro modelo da 400). Cada `EndOfTurn` trae `end_of_turn_confidence` y `trigger` (`"model"`). [Deepgram Flux language prompting](https://developers.deepgram.com/docs/flux/language-prompting). Flux Multilingual esta **GA** desde abril 2026. [Deepgram blog, Flux Multilingual](https://deepgram.com/blog/introducing-flux-multilingual.md)
- **Google Cloud Speech-to-Text NO tiene Chirp 3 para es-AR.** La tabla oficial de idiomas lista para `es-AR` solo `telephony` y `telephony_short`. Chirp 3 tiene `es-ES` y `es-US` (GA) y `es-MX` (preview); no `es-419` ni `es-AR`. Chirp 3 si hace streaming (`StreamingRecognize`), pero sin diarizacion en streaming. [Google STT idiomas](https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages), [Chirp 3](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3)
- **AssemblyAI (secciones 3 y Resumen):** el modelo de streaming por defecto hoy es `universal-3-6-pro` (Universal-3.6 Pro Realtime, 32 idiomas, USD 0,45/h); el USD 0,15/h que figuraba es el de `universal-streaming-multilingual` (en, es, de, fr, pt, it), que sigue vigente. Diarizacion en streaming +USD 0,12/h. [AssemblyAI elegir modelo](https://www.assemblyai.com/docs/streaming/select-the-speech-model), [AssemblyAI pricing](https://www.assemblyai.com/pricing)
- **ElevenLabs Scribe v2 Realtime (seccion 3):** el precio USD 0,39/h ahora esta confirmado en la pagina oficial (antes era fuente secundaria). [ElevenLabs API pricing](https://elevenlabs.io/pricing/api). Ademas el websocket tiene `commit_strategy` = `manual` | `vad` | `turn_prediction` (fin de turno propio, nuevo respecto de lo anotado). [ElevenLabs realtime API](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime)
- **Azure (seccion 3):** confirmado F0 = 5 h/mes de transcripcion en tiempo real. [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/speech/)

### 4.1 Rankings publicos de precision

- **Artificial Analysis (AA-WER v2, batch):** promedio de ~8 h de audio, 50% AA-AgentTalk, 25% VoxPopuli, 25% Earnings22, **todo en ingles; no hay desglose por idioma**. Algunos valores: Scribe v2 (ElevenLabs) 2,2%, MAI-Transcribe-2 (Microsoft) 2,0%, Voxtral Mini Transcribe 3 (Mistral) 2,2%, Gemini 3.5 Transcribe 2,6%, Universal-3.5 Pro (AssemblyAI) 3,0%, GPT Transcribe 3,3%, Soniox v5 Async 3,8%, Speechmatics Enhanced 4,0%, Chirp 3 4,3%, Whisper large v3 turbo (Groq) 4,6%, Nova-3 (Deepgram) 5,2%. Hay una vista de streaming (latencia hasta transcripcion final y hasta primer parcial, medida desde el fin de habla detectado por Silero VAD) con el mismo set de datos en ingles; sus numeros no se pudieron leer (la pagina los dibuja en graficos). [AA speech-to-text](https://artificialanalysis.ai/speech-to-text), [AA streaming](https://artificialanalysis.ai/speech-to-text/streaming). **Sirve como idea de calidad general, no dice nada de espanol.**
- **Hugging Face Open ASR Leaderboard, pista multilingue (independiente, batch):** paper con datos al 27-03-2026; el multilingue usa FLEURS y CoVoST-2 (habla leida) para de/fr/it/es/pt. WER en espanol (promedio de los datasets): **ElevenLabs Scribe v2 2,33**, **AssemblyAI Universal 3 Pro 2,34**, Speechmatics Enhanced 2,78, Cohere Transcribe 2,81 (abierto), Voxtral Small 24B 3,04, Canary 1B v2 3,25, Whisper large v3 3,65, Parakeet TDT 0.6B v3 3,73. **No estan** Deepgram, Soniox, OpenAI (salvo Whisper), Google ni Azure. Sin evaluacion de streaming. [Open ASR Leaderboard paper, arXiv 2510.06961v4](https://arxiv.org/html/2510.06961v4), [Space](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard)
- **Benchmarks del vendedor (sesgados por definicion):**
  - Soniox (streaming, audio de YouTube, 60 idiomas, 2026): espanol Soniox 1,25%, Speechmatics 1,4%, Deepgram 1,71%, AssemblyAI 1,74%, Google 2,84%, ElevenLabs Scribe v2 Realtime 3,16%, OpenAI 3,24%; otra pagina de Soniox pone Azure en 1,21% (por encima de Soniox). **Solo visto en resultados de busqueda sobre paginas de soniox.com; la pagina comparativa que se abrio no mostraba la tabla. (fuente del vendedor, no verificado en la pagina)** [Soniox vs AssemblyAI (es)](https://soniox.com/compare-stt/soniox-vs-assemblyai/spanish)
  - Deepgram: Flux Multilingual con "best-in-class WER" en la mayoria de los idiomas, espanol incluido, y "hasta 3x menos latencia" de fin de turno que la competencia; los numeros solo estan en graficos. (fuente del vendedor) [Deepgram blog](https://deepgram.com/blog/introducing-flux-multilingual.md)
- **Lectura:** en datos independientes, ElevenLabs y AssemblyAI encabezan espanol en batch. Para streaming en espanol no hay ranking independiente: solo el de Soniox (que se pone primero). Ninguna fuente mide **es-AR** ni habla espontanea rioplatense. La prueba propia es imprescindible.

### 4.2 Proveedores con streaming en espanol

**Deepgram Flux (`flux-general-multi`)**
- Streaming por websocket `/v2/listen`, fin de turno integrado en el modelo (eventos de turno con `EndOfTurn`, `eot_threshold` 0,7, `eot_timeout_ms` 5000, `eager_eot_threshold` opcional; ver seccion 2). Espanol GA. `language_hint=es` para fijar idioma. [Flux language prompting](https://developers.deepgram.com/docs/flux/language-prompting)
- Nova-3 (sin fin de turno semantico): espanol monolingue `es` y `es-419`; no hay `es-AR`. [Deepgram modelos e idiomas](https://developers.deepgram.com/docs/models-languages-overview)
- Precio streaming: Flux Multilingual USD 0,0078/min (~0,47/h), Nova-3 mono 0,0077/min, Nova-3 multi 0,0092/min. **USD 200 gratis, sin tarjeta, no vence.** 150 conexiones concurrentes. [Deepgram pricing](https://deepgram.com/pricing)
- Navegador: route handler llama `/v1/auth/grant` y devuelve JWT temporal (ver seccion 3). Latencia: sin cifra publica en ms. Diarizacion en Flux: no verificada.

**AssemblyAI Universal-3.6 Pro Realtime / Universal-Streaming Multilingual**
- `universal-3-6-pro` (default, 32 idiomas, code switching, prompting) o `universal-streaming-multilingual` (en/es/de/fr/pt/it). Ambos con parciales. [Elegir modelo](https://www.assemblyai.com/docs/streaming/select-the-speech-model), [Multilingue](https://www.assemblyai.com/docs/streaming/universal-streaming/multilingual-transcription)
- Fin de turno propio: en U-3.6 Pro se decide sobre el transcript con presets `min_latency` / `balanced` / `max_accuracy`; en Universal-Streaming por confianza: `end_of_turn_confidence_threshold` 0,4, `min_turn_silence` 400 ms, `max_turn_silence` 1280 ms (preset "conservative": 0,7 / 800 / 3600 ms). Se puede forzar con `ForceEndpoint`. La doc no dice si el fin de turno semantico es igual de bueno en espanol. [Turn detection](https://www.assemblyai.com/docs/streaming/universal-streaming/turn-detection)
- Precio: U-3.6 Pro USD 0,45/h, multilingual USD 0,15/h, diarizacion +0,12/h; **se factura por tiempo de websocket abierto** (cerrar al no escuchar). **USD 50 gratis, sin tarjeta**; free: 5 streams nuevos por minuto. [Pricing](https://www.assemblyai.com/pricing)
- Navegador: token temporal minteado en el server (detalle de endpoint en la pagina de temporary tokens, no leida en esta tanda; ver seccion 3). Latencia: solo "Fastest"/"Fast", sin ms.

**Soniox (`stt-rt-v6`, release 2026-11-03)**
- 60+ idiomas, espanol `es` en real-time (sin variantes regionales). `stt-rt-v5` se retira el 2026-12-15. [Soniox modelos](https://docs.soniox.com/stt/models), [Idiomas](https://docs.soniox.com/stt/concepts/supported-languages)
- Fin de turno semantico: `enable_endpoint_detection: true` devuelve un token `<end>`; `max_endpoint_delay_ms` 500-3000 (default 2000), `endpoint_sensitivity`, `endpoint_latency_adjustment_level`. Advierte que el endpointing baja la precision de diarizacion. [Endpoint detection](https://docs.soniox.com/stt/rt/endpoint-detection)
- Navegador: `POST https://api.soniox.com/v1/auth/temporary-api-key` con `usage_type: "transcribe_websocket"` y `expires_in_seconds` corto; solo tiene que valer al abrir el websocket. [Direct stream](https://docs.soniox.com/stt/guides/direct-stream)
- Precio: **USD 0,12/h** streaming (el mas barato con fin de turno). [Soniox pricing](https://soniox.com/pricing). **Sin credito gratis para cuentas nuevas desde octubre 2025** (hay docs viejas que dicen 300 min). [Blog Soniox](https://soniox.com/blog/2025-10-27-free-credits-update-for-soniox-api)

**Speechmatics (Melia 1 / Enhanced / Standard)**
- Real-time: Melia 1 USD 0,40/h, Standard 0,45/h, Enhanced 0,80/h. **USD 100 de credito gratis, sin tarjeta**; free: 2 sesiones real-time concurrentes. 55+ idiomas (la pagina no nombra espanol; es soportado segun Open ASR, pero no verificado en esta tanda para real-time). [Speechmatics pricing](https://www.speechmatics.com/pricing)
- Fin de turno: `end_of_utterance_silence_trigger` (0-2 s; recomendado 0,5-0,8 s) en Enhanced/Standard, mensaje `EndOfUtterance`; es por silencio, no semantico. **Melia 1 lo rechaza** (hay que mandar `ForceEndOfUtterance` desde el cliente). [Turn detection](https://docs.speechmatics.com/speech-to-text/realtime/turn-detection)
- Navegador: temporary key `type=rt`, `ttl` 60-86400 s, va como `?jwt=` en la URL del websocket. [Authentication](https://docs.speechmatics.com/get-started/authentication)

**ElevenLabs Scribe v2 Realtime (`scribe_v2_realtime`)**
- ~150 ms, 90+ idiomas, espanol incluido; `language_code` ISO 639-1/3 (sin variante regional). Eventos `PARTIAL_TRANSCRIPT` y `COMMITTED_TRANSCRIPT`. Hasta 50 keyterms. Sin diarizacion en realtime. [ElevenLabs STT](https://elevenlabs.io/docs/capabilities/speech-to-text)
- Fin de turno: `commit_strategy` `vad` (con `vad_silence_threshold_secs`, `vad_threshold`, `min_silence_duration_ms`) o `turn_prediction`; defaults no publicados en la referencia. [Realtime API](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime)
- Navegador: token de un solo uso `tokens.singleUse.create("realtime_scribe")` en el server, vence a los 15 min; el SDK cliente puede tomar el microfono directo (con `echoCancellation`/`noiseSuppression`), PCM 16 kHz. [Client-side streaming](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming)
- Precio USD 0,39/h (+0,08/h con keyterms). El plan gratis incluye horas de STT pero la pagina no dice cuantas. [API pricing](https://elevenlabs.io/pricing/api)

**Gemini Live Transcribe (`gemini-3.5-transcribe-live`)**
- Pipeline dedicado de transcripcion (no conversacional), websocket, PCM 16 bit 16 kHz mono en chunks de ~100 ms; `interim_input_transcription` (parciales) e `input_transcription` (final al pausar/terminar turno). Espanol: **`es-419`** y `es-US` (no `es-AR`). VAD automatico del server (default), hibrido (el cliente avisa `audio_stream_end`) o manual. Sesiones de **hasta 10 min** (hay que reconectar). Sin diarizacion. Token efimero con `uses: 1`, 30 min, y `liveConnectConstraints` que fijan modelo y config. [Live transcribe](https://aistudio.google.com/docs/live-api/live-transcribe)
- Precio: **tier gratis** (los datos se usan para mejorar productos de Google: ojo con privacidad); pago ~USD 0,009/min combinado (~0,54/h). [Gemini pricing](https://aistudio.google.com/docs/pricing). Silencio por defecto del VAD y latencia: no publicados.

**Azure Speech real-time**
- es-AR nativo (seccion 3). Segmentacion por silencio `Speech_SegmentationSilenceTimeoutMs` 100-5000 ms (tipico 500); `Speech_SegmentationStrategy = "Semantic"` corta por puntuacion final, pero la doc dice que es para dictado/subtitulos continuos, **no para escenarios interactivos**, y no en todos los idiomas. Eventos `recognizing` (parcial) y `recognized` (final). [Azure how to recognize](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech)
- F0: 5 h/mes gratis. [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/speech/). Navegador: SDK JS con token de autorizacion emitido por el server (TTL no reverificado en esta tanda). Necesita la dependencia `microsoft-cognitiveservices-speech-sdk` (avisar al grupo).

**Google Cloud Chirp 3:** sin es-AR (ver 4.0), streaming via gRPC sin camino de token efimero para navegador documentado (habria que proxiar el audio por el server). Descartado para nosotros.

### 4.3 Tabla comparativa (escuchar)

Integracion estimada en nuestra arquitectura: modulo `src/voz` con `crearEscucha` que emite parcial y turno; route handler para el token; captura con `getUserMedia` + AudioWorklet a PCM16 (salvo Web Speech y SDKs que toman el microfono).

| Opcion | Precision espanol (fuente) | Streaming / parcial | Fin de turno propio | Latencia publicada | Costo | Gratis | Integracion |
|---|---|---|---|---|---|---|---|
| Web Speech Chrome (actual) | sin dato | si, en tandas atrasadas (visto) | no | sin dato | 0 | si | hecha |
| Deepgram Flux multi | sin dato independiente; "best-in-class" (vendedor); Deepgram 1,71% en tabla de Soniox (vendedor rival) | si | **si, modelo** (`EndOfTurn`) | sin ms; "3x menos" EoT (vendedor) | USD 0,47/h | USD 200 | 2-3 h |
| AssemblyAI U-3.6 Pro RT | U3 Pro batch 2,34 (Open ASR, independiente) | si | **si, semantico + silencio** (params documentados) | sin ms | USD 0,45/h (multi: 0,15/h) | USD 50 | 2-3 h |
| ElevenLabs Scribe v2 RT | Scribe v2 batch 2,33 (Open ASR); RT 3,16% (tabla Soniox, vendedor rival) | si | si (`vad` / `turn_prediction`) | ~150 ms (vendedor) | USD 0,39/h | algo en plan free (cantidad sin dato) | 1,5-2,5 h (SDK con microfono) |
| Soniox stt-rt-v6 | 1,25% (vendedor) | si | **si, semantico** (`<end>`) | sin ms | USD 0,12/h | **no** | 2-3 h |
| Speechmatics Enhanced / Melia | Enhanced batch 2,78 (Open ASR); 1,4% (tabla Soniox) | si | por silencio (Enhanced/Standard); Melia no | sin ms | USD 0,40-0,80/h | USD 100 | 2-3 h |
| Gemini 3.5 Transcribe Live | sin dato es (AA ingles 2,6% para la version batch) | si | VAD del server (auto/hibrido) | sin ms | ~USD 0,54/h | **tier gratis** (datos usados por Google) | 3 h (reconexion cada 10 min) |
| Azure Speech | 1,21% (tabla Soniox, vendedor rival) | si | por silencio (semantico no apto interactivo) | sin ms | pago sin reverificar | 5 h/mes | 2-3 h + dependencia nueva |
| OpenAI gpt-live-transcribe | sin dato es; 3,24% OpenAI en tabla Soniox | si | **no** (VAD propio) | sin ms | USD 1/h | no | 3-4 h |
| OpenAI gpt-transcribe (Realtime) | sin dato es | no (texto al cerrar turno) | si (`server_vad`) | sin ms | USD 0,27/h | no | 3-4 h |
| Groq whisper-large-v3-turbo | Whisper large v3 3,65 (Open ASR) | no (por frase) | no (VAD propio) | sin ms | USD 0,04/h (min 10 s/request) | si | 2-3 h |
| Google Chirp 3 | sin es-AR | si (gRPC) | endpointing por silencio | sin ms | sin dato | sin dato | 4+ h, descartado |

### 4.4 Recomendacion

**Top 3 para la prueba comparativa con audio es-AR propio:**

1. **Deepgram Flux (`flux-general-multi`, `language_hint=es`).** Es el unico cuyo producto central es justamente el fin de turno, tiene el credito gratis mas grande y el camino de token para navegador ya documentado. Riesgo: no hay dato independiente de precision en espanol. Hace falta: cuenta en console.deepgram.com (sin tarjeta), API key en `.env.local` (`DEEPGRAM_API_KEY`), route handler que llame `/v1/auth/grant`.
2. **AssemblyAI Universal-3.6 Pro Realtime.** Mejor dato independiente de espanol (familia U3 Pro, 2,34 en Open ASR) y fin de turno semantico con parametros claros y presets (para Parpadeo, arrancar en "conservative": 0,7 / 800 / 3600 ms, porque cortar antes es peor que esperar). Hace falta: cuenta (USD 50, sin tarjeta), `ASSEMBLYAI_API_KEY`, route handler de token temporal. Recordar cerrar el websocket cuando no se escucha (se cobra por conexion abierta).
3. **ElevenLabs Scribe v2 Realtime.** Mejor WER independiente en espanol (batch) y SDK que toma el microfono directo, lo que acorta la integracion; tiene `turn_prediction`. Riesgo: en la tabla de Soniox el modo realtime rinde peor que el batch. Hace falta: cuenta ElevenLabs (verificar horas STT del plan free en la consola), `ELEVENLABS_API_KEY`, route handler que cree el token de un solo uso.

**Suplentes:** Gemini 3.5 Transcribe Live si se quiere costo cero (gratis, `es-419`, pero los datos los usa Google y hay que reconectar cada 10 min). Soniox si se acepta pagar desde el primer minuto (barato: USD 0,12/h; mejor numero de espanol, pero autoproclamado).

**Como armar la prueba rapido (~1 h):**

- **Audio:** 5-10 frases en es-AR dichas por el equipo como hablaria un interlocutor real (preguntas con voseo, nombres propios como "Roberto", una frase con pausa a mitad tipo "y... que queres comer?", una con ruido de fondo). Grabar WAV mono PCM 16 bit a 16 kHz (Audacity o `ffmpeg -i in.m4a -ac 1 -ar 16000 -sample_fmt s16 frase01.wav`), dejando ~2 s de silencio al final para que salte el fin de turno. Escribir la transcripcion de referencia en un `.txt` al lado.
- **Script de Node (scratch, fuera de `src/`):** por cada proveedor y cada WAV, **simular streaming**: abrir el websocket con la key del server (no hace falta token para la prueba), mandar el PCM en chunks de 20-100 ms con `setTimeout` a ritmo real, y registrar: (a) el tiempo desde el ultimo chunk con habla hasta el primer parcial que llega despues, (b) el tiempo hasta el evento de fin de turno (`EndOfTurn` en Flux, turno con `end_of_turn` en AssemblyAI, commit en ElevenLabs), (c) el texto final. Node 22+ trae `WebSocket` global, asi que no hace falta instalar nada.
- **WER:** normalizar referencia e hipotesis (minusculas, sin puntuacion, sin tildes solo para comparar) y calcular distancia de Levenshtein por palabras / cantidad de palabras de referencia. Anotar aparte si cortaron el turno antes de tiempo en la frase con pausa (eso importa mas que un punto de WER).
- **Version mas rapida pero menos fiel:** mandar los mismos WAV a la API por archivo de cada proveedor (Deepgram `/v1/listen`, AssemblyAI transcript, ElevenLabs `scribe_v2`, Gemini `gemini-3.5-transcribe`). Sirve solo para comparar WER: **la latencia por archivo no es la de streaming** (no incluye parciales ni fin de turno, y el modelo batch puede no ser el mismo que el de realtime; Flux no tiene version por archivo).
- Correr cada frase 2-3 veces por proveedor y desde la red del lugar de la demo si se puede: la latencia la domina la red Argentina-EE.UU.

### 4.5 Lo que no se pudo verificar

- Precision de cualquier proveedor en **es-AR** o habla espontanea rioplatense: no hay benchmark publico; Open ASR mide habla leida (FLEURS/CoVoST-2) y en batch.
- Numeros del leaderboard de streaming de Artificial Analysis (solo en graficos) y si incluye algun desglose por idioma.
- La tabla de espanol de Soniox se vio solo en resultados de busqueda, no en la pagina abierta.
- Latencia en ms de fin de turno de Flux, AssemblyAI, Soniox, Gemini y Speechmatics: ninguno la publica como numero.
- Defaults del VAD de ElevenLabs realtime y del VAD automatico de Gemini Live; horas STT del plan free de ElevenLabs.
- Si el fin de turno semantico de AssemblyAI / Soniox / Flux funciona igual de bien en espanol que en ingles.
- Endpoint exacto y TTL del token temporal de AssemblyAI (pagina de temporary tokens no leida) y TTL del token de Azure.
- Espanol en real-time de Speechmatics (pagina de idiomas no leida) y precio pago actual de Azure STT.
