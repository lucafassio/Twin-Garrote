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
Opcion u opcion fija que el usuario eligio y que el sistema dijo en voz alta.
_Avoid_: output, salida

**Opciones fijas**:
Si, No, Espera y Otra: siempre visibles y elegibles, no dependen del LLM. "Otra" pide 4 opciones nuevas para el mismo turno.
_Avoid_: botones rapidos, atajos

**Urgencia**:
Pedido de ayuda siempre visible y elegible, que no pasa por el LLM.
_Avoid_: alarma, panico, emergencia

### Seleccion

**Barrido**:
Recorrido automatico que ilumina de a un elemento elegible por vez para que el usuario elija con un parpadeo largo.
_Avoid_: scan, recorrido, ciclo

**Parpadeo largo**:
Ojos cerrados al menos 500 ms; unico gesto que elige el elemento iluminado por el barrido. Los parpadeos normales se ignoran.
_Avoid_: seleccion, click, blink
