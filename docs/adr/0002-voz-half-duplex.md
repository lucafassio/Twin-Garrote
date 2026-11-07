# 0002 - Voz: reconocimiento de Chrome y microfono apagado mientras el sistema habla

Estado: aceptada (Fase 0 del path voz, issue #4)

## Contexto

Para escuchar al interlocutor usamos el reconocimiento de voz de Chrome (Web Speech API, `es-AR`, por red): es gratis, no necesita backend y con el wifi del lugar alcanza (4 ms de ping, 0% de perdida). La investigacion ([docs/research/voz.md](../research/voz.md)) encontro en el codigo de Chromium que ese reconocimiento abre el microfono por su cuenta, sin cancelacion de eco, supresion de ruido ni control de ganancia. Con parlantes fuertes en la demo, el sistema se transcribiria a si mismo y cada respuesta volveria como un turno nuevo.

## Decision

- **Half-duplex:** el reconocimiento se corta (`abort()`) desde que suena el aviso hasta 500 ms despues de que el sistema termina de hablar. Lo que el interlocutor estaba diciendo cuando sono el aviso se descarta.
- **Sin barge-in:** nadie puede interrumpir al sistema mientras habla, salvo la urgencia, que corta todo.
- **Aviso siempre antes de hablar**, para que la sala haga silencio y no se pierdan frases durante el corte.
- **Reconocimiento de Chrome como base y como fallback permanente.** Las mejoras (Deepgram, reconocimiento en el dispositivo, traduccion) se suman encima, sin sacarlo.

## Consecuencias

- Se pierde lo que alguien diga mientras el sistema habla; el boton Repetir y el aviso compensan del lado de la sala.
- El audio del interlocutor va a servidores de Google. Para la demo se presenta como limitacion; el camino es el modo en el dispositivo de Chrome (`processLocally`, misma API, modelo `es-ES` sin confirmar para `es-AR`).
- `start(audioTrack)` (Chrome 135+) podria pasarle un microfono con cancelacion de eco y permitir barge-in. No esta probado: si anda, se revisa esta decision.
