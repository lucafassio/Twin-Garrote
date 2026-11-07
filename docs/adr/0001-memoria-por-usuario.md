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
