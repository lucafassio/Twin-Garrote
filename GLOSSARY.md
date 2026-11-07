# Parpadeo

Comunicacion aumentativa para personas con ELA: el sistema escucha al interlocutor, propone respuestas con la forma de hablar del usuario y el usuario elige una con un parpadeo para que se diga en voz alta.

## Lenguaje

### Personas

**Usuario**:
Persona con ELA que habla a traves del sistema. En la demo, "Roberto".
_Avoid_: paciente, persona, enfermo

**Interlocutor**:
Quien le habla al usuario en voz alta (familiar, medico, jurado). Puede haber varios a la vez; el sistema no distingue quien es quien.
_Avoid_: hablante, otro

**Perfil**:
Datos del usuario y su forma de hablar (familia, gustos, tono, frases tipicas, temas a evitar) que carga un familiar en el onboarding. Es la base de la huella: el aprendizaje no lo modifica.
_Avoid_: config, persona

**Contacto**:
Persona fuera de la sala a la que le llega al celular el aviso de urgencia, con el contexto de la charla.
_Avoid_: familiar, cuidador, contacto de emergencia

**Onboarding**:
Carga inicial del perfil para un usuario nuevo, hecha por un familiar en menos de 10 minutos. Lo que carga la familia queda marcado como dicho *sobre* el usuario, no *por* el usuario.
_Avoid_: setup, alta

**Cercania**:
Relacion del interlocutor con el usuario (familia, conocido, formal). Opcional y no bloquea: la aclara el interlocutor o un cuidador, nunca el usuario con el barrido. Si nadie la aclara, la infiere el LLM. Define el tono y que hechos se pueden usar.
_Avoid_: relacion, nivel de confianza

### Memoria

**Huella**:
Lo que el sistema sabe del usuario y entra en cada pedido de opciones: el perfil, los hechos activos mas importantes y frases reales del usuario como ejemplos de estilo.
_Avoid_: fingerprint, persona, contexto

**Hecho**:
Dato sobre el usuario o su entorno extraido de una conversacion ("Laura se opera el jueves"), con fecha, origen, interlocutor e importancia de 1 a 10. Cuando otro hecho lo contradice se invalida, no se borra.
_Avoid_: recuerdo, dato, memoria

**Memoria corta**:
La conversacion actual literal y un resumen de 2 o 3 lineas de cada conversacion de las ultimas ~12 horas.
_Avoid_: contexto, ventana

**Memoria larga**:
La huella: el perfil y los hechos activos. No vence por tiempo.
_Avoid_: historial, base de datos

**Agente de memoria**:
Proceso en segundo plano que, al cerrarse una conversacion, extrae hechos de la conversacion cruda, los reconcilia con los que ya hay (agregar, actualizar, invalidar o nada) y escribe el resumen. Nunca corre durante un turno.
_Avoid_: extractor, consolidador

### Conversacion

**Conversacion**:
Serie de turnos y respuestas sin un silencio largo en el medio. Se detecta sola, sin UI para el usuario: mas de 15 min sin turnos es una conversacion nueva, menos de 3 min es la misma, y entre medio lo infiere el LLM.
_Avoid_: sesion, chat, hilo

**Registro**:
Tono de la conversacion (formal, casual, intimo) que el LLM infiere del turno y ajusta el tono de las opciones. Si hay cercania aclarada, gana la cercania.
_Avoid_: formalidad, estilo

**Turno**:
Una frase completa del interlocutor, cerrada por un silencio corto (alrededor de un segundo) o a mano.
_Avoid_: pregunta, mensaje, input

**Opcion**:
Una de las 4 respuestas candidatas que propone el LLM para el ultimo turno. Llegan ordenadas por probabilidad, la mas probable primero.
_Avoid_: sugerencia, candidata

**Completado**:
Frase entera que propone el LLM mientras el usuario deletrea, a partir de lo que lleva escrito y del contexto. Aparece como un elemento mas del barrido de deletrear.
_Avoid_: autocompletado de palabra, sugerencia

**Respuesta**:
Opcion, Si o No que el usuario eligio y que el sistema dijo en voz alta. Responde el turno: entra al historial y limpia las opciones. "Espera" no es respuesta.
_Avoid_: output, salida

**Aviso**:
Sonido corto que suena siempre antes de que el sistema diga algo en voz alta, para que la sala haga silencio. Desde el aviso hasta que el sistema termina de hablar, no se escucha.
_Avoid_: chime, campana, alerta

**Opciones fijas**:
Si, No, Espera, Otra y Repetir: siempre visibles y elegibles, no dependen del LLM. "Otra" pide 4 opciones nuevas para el mismo turno. "Espera" pide tiempo al interlocutor: se dice en voz alta, mantiene las opciones y no entra al historial. "Repetir" vuelve a decir la ultima respuesta sin que entre de nuevo al historial; tambien la puede pedir cualquiera de la sala.
_Avoid_: botones rapidos, atajos

**Urgencia**:
Pedido de ayuda siempre disponible, que no pasa por el LLM. Se dispara eligiendola en el barrido o con el gesto de urgencia. Corta todo lo que este pasando, hace sonar una alarma en la sala y le avisa al contacto con las ultimas lineas de la charla. Termina como atendida (alguien de la sala la apaga) o como falsa alarma (el usuario confirma que fue sin querer); el contacto recibe un mensaje distinto en cada caso.
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
