# Parpadeo

Comunicacion aumentativa para personas con ELA: el sistema escucha al interlocutor, propone respuestas con la forma de hablar del usuario y el usuario elige una con un parpadeo para que se diga en voz alta.

## Lenguaje

### Personas

**Usuario**:
Persona con ELA que habla a traves del sistema. En la demo, "Roberto".
_Avoid_: paciente, persona, enfermo

**Interlocutor**:
Quien le habla al usuario en voz alta (familiar, medico, jurado).
_Avoid_: hablante, otro

**Perfil**:
Datos del usuario y su forma de hablar (familia, gustos, tono, frases tipicas) que dan personalidad a las opciones.
_Avoid_: config, persona

### Conversacion

**Turno**:
Una frase completa del interlocutor, cerrada por un segundo de silencio.
_Avoid_: pregunta, mensaje, input

**Opcion**:
Una de las 4 respuestas candidatas que propone el LLM para el ultimo turno.
_Avoid_: sugerencia, candidata

**Respuesta**:
Opcion, Si o No que el usuario eligio y que el sistema dijo en voz alta. Responde el turno: entra al historial y limpia las opciones. "Espera" no es respuesta.
_Avoid_: output, salida

**Opciones fijas**:
Si, No, Espera y Otra: siempre visibles y elegibles, no dependen del LLM. "Otra" pide 4 opciones nuevas para el mismo turno. "Espera" pide tiempo al interlocutor: se dice en voz alta, mantiene las opciones y no entra al historial.
_Avoid_: botones rapidos, atajos

**Urgencia**:
Pedido de ayuda siempre disponible, que no pasa por el LLM. Se dispara eligiendola en el barrido o con el gesto de urgencia.
_Avoid_: alarma, panico, emergencia

### Seleccion

**Barrido**:
Recorrido automatico que ilumina de a un elemento elegible por vez para que el usuario elija con un parpadeo largo.
_Avoid_: scan, recorrido, ciclo

**Parpadeo largo**:
Ojos cerrados al menos 500 ms; gesto que elige el elemento iluminado por el barrido. La eleccion se confirma al abrir los ojos. Los parpadeos normales se ignoran.
_Avoid_: seleccion, click, blink

**Gesto de urgencia**:
Ojos cerrados 2 s seguidos. Dispara la urgencia desde cualquier estado, aunque el barrido este en pausa. Reemplaza a la eleccion del parpadeo largo que lo inicio.
_Avoid_: parpadeo de emergencia, panico

**Pausa del barrido**:
El barrido se detiene solo despues de 3 vueltas sin eleccion. Se reanuda con un parpadeo largo o con un turno nuevo.
_Avoid_: stop, timeout
