# 0001 - Memoria por usuario: perfil fijo, hechos aprendidos y agente de memoria en segundo plano

Estado: aceptada (Fase 0 del path llm, issue #2)

## Contexto

Las opciones tienen que sonar al usuario y saber de su vida. Ademas, el sistema tiene que aprender mientras se usa. La investigacion ([docs/research/llm.md](../research/llm.md), [llm-onboarding-memoria.md](../research/llm-onboarding-memoria.md)) muestra tres riesgos al mezclar todo en una sola memoria: hechos inventados, detalles privados que aparecen frente a cualquiera, y un estilo que se achica porque solo aprende de lo que el propio modelo propuso. El usuario no puede manejar conversaciones ni memoria: cada parpadeo cuesta.

## Decision

- **Perfil fijo:** lo carga un familiar en el onboarding, en `huella.md`. El aprendizaje automatico nunca lo reescribe. Lo que carga la familia queda marcado como dicho *sobre* el usuario.
- **Hechos aprendidos aparte**, en `memoria.json`. Cada hecho tiene id, texto, origen (deletreo, opcion, fija, interlocutor, familia), interlocutor, importancia de 1 a 10, fecha y estado activo o invalidado. Se invalidan, no se borran.
- **Agente de memoria en segundo plano:** corre al cerrarse una conversacion, nunca durante un turno.
  1. Extrae hechos de la conversacion **cruda**, no del resumen.
  2. Los reconcilia con los que ya hay: agregar, actualizar, invalidar o nada (patron Mem0).
  3. Escribe un resumen de 2 o 3 lineas para la memoria corta.
  4. Pasa las frases deletreadas a los ejemplos de estilo, con mas peso que lo elegido.
- **Conversaciones detectadas solas:** mas de 15 min sin turnos es nueva, menos de 3 min es la misma, y entre medio lo infiere el LLM con un campo en la misma llamada de opciones.
- **Las reglas del prompt son fijas en codigo.** La mejora automatica toca la huella, nunca las reglas.
- **El prompt de opciones recibe en markdown corto:** perfil, hechos activos mas importantes y compatibles con la cercania, resumenes de las ultimas ~12 h, y la conversacion actual.

## Consecuencias

- Sin base vectorial: con decenas de hechos alcanza con importancia, recencia y coincidencia de palabras.
- La memoria vive en archivos en el servidor (`.data/`, fuera de git). Funciona corriendo local; en Vercel no persiste sin otro almacenamiento.
- Cada conversacion cerrada cuesta una llamada extra al LLM, fuera del camino del turno.
- Hace falta una vista "Lo que aprendi de vos" para ver e invalidar hechos (en `/prueba/llm` para la demo).

## Actualizacion: niveles, huella aprendida y saliencia (#18)

- **Niveles:** bloques de dia, semana y mes armados en segundo plano al cerrar una conversacion que cruza un corte de periodo (los cortes los calcula el codigo, en hora de Argentina). Cada bloque cita sus fuentes. Al prompt entran el de ayer, el de la semana anterior y el del mes anterior. "Hoy" es un solo nivel: los resumenes de menos de 5 h enteros y los de 5 a 12 h con su primera linea.
- **Huella aprendida:** el sistema la propone y la familia la acepta o la descarta en "Lo que aprendi de vos". Solo la aceptada entra al prompt, marcada como aprendida, al lado de la huella base, que no se toca nunca.
- **Saliencia:** los hechos usados en la opcion elegida suben de peso; al cerrar una conversacion, los no usados decaen hacia 1. "Otra" y las opciones fijas no tocan nada. El orden de los hechos en el prompt es importancia por saliencia mas coincidencia con el turno.
- **Con cercania formal** no entra ningun bloque ni huella aprendida que cite hechos intimos; se deriva de las fuentes.
- **Invalidar en cascada:** invalidar un hecho descarta los bloques y la propuesta que lo citan; la huella aceptada queda para revisar.

### Modelo de decision: cuando sumarlo

Hoy no hay modelo de decision para elegir que memoria entra al prompt de opciones: se mandan los 12 hechos de mas peso y todos los niveles. Sumaria 400-600 ms antes de Haiku, y con una memoria de un mes el turno ya anda en ~1,9 s de mediana ([docs/research/llm-latencia-niveles.md](../research/llm-latencia-niveles.md)).

**Se suma cuando pase cualquiera de estas dos cosas:**

- mas de ~60 hechos activos en la memoria;
- el prompt de opciones (sistema mas usuario) pasa de ~4.000 tokens.

Las dos condiciones miden cosas distintas. Al prompt entran a lo sumo 12 hechos, asi que la cantidad de hechos no lo agranda: con mas de ~60, lo que se pierde es que los 12 elegidos por peso y palabras del turno sean los que hacen falta. El tamano lo empujan los bloques, la huella aprendida y los resumenes de hoy. Con un mes de memoria, el prompt ya anda en ~3.600 tokens, asi que lo mas probable es que se llegue primero al limite de tokens. Para vigilarlo: `estimarTokens` (`src/llm/tokens.ts`) y la linea "Prompt de opciones" de `src/llm/medir-latencias.ts`.

Las preguntas abiertas de #15 (si aplica tambien al completado, que modelo usar y cuantos casos etiquetados hacen falta) se retoman en ese momento.
