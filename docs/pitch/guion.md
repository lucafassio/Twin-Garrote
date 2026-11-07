# Pitch Parpadeo: guion de 2:30

Decisiones del grill (issue #7): primero el problema hasta que la sala empatice, recien despues el producto. Preguntas del jurado guionadas y video de respaldo de 49 s. La competencia no se nombra en el pitch, queda para las preguntas. Cifras y fuentes en `docs/research/pitch.md`.

## Roles

| Quien | Hace |
|---|---|
| **Presentador** | Dice todo el texto. Parado al costado de la pantalla, nunca tapandola. |
| **Laura** (alguien del equipo) | Hace de hija de Roberto en la demo: dice la frase guionada. |
| **Roberto** (alguien del equipo) | Sentado frente a la webcam. Solo elige con parpadeos largos y hace el gesto de urgencia. No habla. |
| **Operador** | En la compu: tiene el video de respaldo abierto y listo; apaga la urgencia. |

## Tiempos

| Bloque | Desde | Hasta | Dura |
|---|---|---|---|
| 1. Problema | 0:00 | 0:42 | 42 s |
| 2. Solucion | 0:42 | 1:21 | 39 s |
| 3. Demo | 1:21 | 2:10 | 49 s |
| 4. Cierre | 2:10 | 2:30 | 20 s |

---

## 1. Problema (0:00 a 0:42)

*Pantalla: foto de Roberto. Es un personaje: usar una ilustracion o una foto con licencia libre, nunca la foto de una persona real presentada como paciente.*

> Este es Roberto. Un tipo tranquilo y alegre, que queria disfrutar su jubilacion con su familia y sus amigos.
>
> Hace unos anos le diagnosticaron ELA, una enfermedad que de a poco le fue apagando los musculos, hasta que perdio la capacidad de comunicarse. Y de a poco se fue apagando la chispa que alguna vez tuvo.

*Pantalla: "3.000 a 4.000 personas con ELA en Argentina".*

> Pero Roberto no es un caso aislado: hoy se estima que hay entre tres y cuatro mil personas con ELA en Argentina. Muchisimos Robertos.

*Pantalla: fotos de Stephen Hawking y Esteban Bullrich (de Wikimedia Commons, con credito) y debajo "miles de dolares".*

> Existen soluciones. El estandar de hoy es lo que tienen personas como ellos. Pero Roberto no se puede permitir algo de ese valor.

## 2. Solucion (0:42 a 1:21)

*Pantalla: logo Parpadeo y "una computadora con camara".*

> Por eso hoy creamos Parpadeo: una forma de que las personas con ELA se comuniquen con sus seres queridos, accesible para cualquier argentino. Solo necesitas una computadora con camara.

*Pantalla: diagrama que se arma de a un paso mientras se habla: ojo (parpadeo largo) → IA con 4 frases → teclado con prediccion → parlante.*

> La camara de la compu reconoce un parpadeo largo: asi elige Roberto. La IA escucha la charla y, con lo que sabe de el, le propone cuatro frases con su forma de hablar. Si ninguna sirve, tiene un teclado pensado para los ojos, donde la IA le adivina la palabra o la frase entera. Y lo que elige, se dice en voz alta.

*Notas para el presentador (no se dicen, sirven si preguntan):*
- *Vision (rama `vision-prueba`, todavia no en `main`): sigue la mirada con la webcam despues de una calibracion corta ("Mira aca", 10 puntos) y detecta el parpadeo largo (al menos medio segundo; los parpadeos normales se ignoran). Confirmar con el path vision si en la demo se elige mirando la opcion + parpadeo o con el barrido + parpadeo, y decir eso.*
- *Antes de proponer, la lectura del turno descarta lo que no es para Roberto.*
- *La memoria: lo que cargo la familia, lo que se dijo en charlas anteriores y sus propias frases elegidas o deletreadas (lo deletreado pesa mas).*
- *Teclado: letras por frecuencia en espanol, las dos primeras filas cubren ~85 % de lo que se escribe. La frase entera no tiene que empezar con lo escrito: "fr" puede dar "Tengo frio".*
- *"Eye tracker" se puede decir si la vision con mirada llega a la demo. No decir "opciones personalizables" ni "le recupera el habla".*

## 3. Demo (1:21 a 2:10)

*Pantalla: la app en vivo. Roberto frente a la webcam.*

**Conversacion guionada (1:21 a 1:43)**

> Laura, la hija, le habla.

**Laura:** "Pa, ¿viste el partido de River?"

*Aparecen las 4 opciones. Roberto espera que el barrido llegue a la que tenga su humor y hace un parpadeo largo. Suena el aviso y el sistema la dice en voz alta.*

> Fijense: no es una respuesta generica, es su humor.

**Jurado en vivo (1:43 a 1:58)**

> Ahora ustedes. Hablenle a Roberto.

*El presentador le da al jurado la frase en voz alta o en un cartel: "Roberto, ¿que te parecio el hackathon?". El jurado la dice. Roberto elige. El sistema responde.*

**Urgencia (1:58 a 2:10)**

> Y si pasa algo, cierra los ojos dos segundos.

*Roberto cierra los ojos 2 s. Suena la alarma.*

> Suena en la sala y a Marta le llega un aviso al celular, sin depender de la IA.

*El operador apaga la urgencia (atendida).*

## 4. Cierre (2:10 a 2:30)

*Pantalla: "La IA propone. Roberto elige."*

> Parpadeo propone, nunca habla solo: si Roberto no elige, no se dice nada. Que decir lo decide el.

*Pantalla: "Proximo paso: Asociacion ELA Argentina".*

> Todavia no lo probamos con personas con ELA: el proximo paso es hacerlo con la Asociacion ELA Argentina.

*Pantalla: la frase final.*

> Roberto sigue teniendo mucho para decir. Parpadeo le devuelve la chispa de la conversacion.

---

## Si algo falla en la demo

- **Antes de arrancar:** la app abierta con el perfil de Roberto cargado, la webcam enfocada, el volumen probado. El video de respaldo (49 s, solo la demo) abierto en otra pestana.
- **Las opciones tardan mas de ~5 s o la webcam no detecta:** el presentador dice *"Les muestro como se ve cuando anda con buena conexion"* y el operador pasa al video de respaldo. Se retoma el guion en el cierre, sin explicar el error.
- **El micro no toma la frase de Laura o del jurado:** el operador la escribe a mano en el campo del turno y se sigue.
- **No se apaga la alarma:** el operador baja el volumen y el presentador sigue con el cierre.

## Preguntas probables del jurado

| Pregunta | Respuesta corta |
|---|---|
| ¿No existe ya algo asi? | Lo que encontramos ayuda a escribir mas rapido con la mirada (Tobii, y Google SpeakFaster, que con un LLM acelera 29 a 60 %). Nosotros escuchamos a la sala y proponemos la respuesta entera, con una webcam comun. No decimos que no exista nada igual. |
| ¿Por que no automatizar todo? | Hoy hace falta otra persona con un tablero de letras; con Parpadeo desaparece. La unica decision humana que queda es la de Roberto sobre que decir, y esa no se debe automatizar. |
| ¿Cuanto cuesta un comunicador hoy? | Miles de dolares (en Canada un comunicador con mirada figura a unos 20.000 dolares canadienses). La cobertura por la Ley 24.901 no esta garantizada; hay un proyecto de ley justamente para eso. Parpadeo usa una webcam. |
| ¿Y si la IA inventa cosas sobre el? | Usa solo lo que cargo la familia y lo que se dijo en conversaciones, marcado con su origen. Y nada se dice sin que Roberto lo elija. |
| ¿Sirve para todas las personas con ELA? | Mientras haya control del parpadeo. En etapas mas avanzadas hacen falta otros accesos (mirada, interfaces cerebro-computadora). Es una forma de acceso mas, no la unica. |
| ¿Mejora la depresion o alarga la vida? | No lo afirmamos. Hay estudios que asocian el aislamiento con peor calidad de vida, pero no esta probado que comunicar mejor cambie la enfermedad. Es lo que queremos medir con usuarios. |
| ¿Es la voz de Roberto? | Hoy no: es una voz sintetica. Clonar la voz con un minuto de audio es tecnicamente viable y es un proximo paso, por eso conviene empezar cuando todavia hablan. |
| ¿Que usaban Hawking o Bullrich? | Hawking, un sistema hecho a medida por Intel que manejaba con un sensor en la mejilla. Bullrich, un comunicador por mirada. Son equipos especializados que la mayoria no puede pagar. *(Verificar el dato de Bullrich antes del pitch.)* |
| ¿Alcanza de verdad con una laptop? | Con la webcam de la laptop y conexion a internet: las respuestas las arma un modelo de lenguaje en la nube. Sin internet siguen andando la urgencia y las opciones fijas (Si, No, Espera). |
| ¿Como aprende como habla? | Arranca con lo que carga la familia (gustos, muletillas, frases reales). Despues, cada frase que Roberto elige o deletrea queda como ejemplo de su estilo, y lo deletreado pesa mas porque es 100 % suyo. |
| ¿Que pasa con la privacidad? | Ver el estado de los issues de privacidad (#49 a #60) antes del pitch y responder solo con lo que este hecho. |

## Checklist para el ensayo

- [ ] Cronometrar el texto en voz alta: el bloque 1 no puede pasar de 42 s.
- [ ] Confirmar las 3 cifras en las paginas originales (ver `docs/research/pitch.md`).
- [ ] Confirmar con una fuente que dispositivo usa Esteban Bullrich para comunicarse, y que Hawking usaba el sistema de Intel. Si no se confirma, decir solo "tecnologia de miles de dolares" sin nombres.
- [ ] Confirmar que sin internet la urgencia y las opciones fijas siguen andando (respuesta "¿alcanza con una laptop?").
- [ ] Probar la frase de Laura y la del jurado con la app real, 3 veces, y anotar que opciones salen.
- [ ] Grabar el video de respaldo de la demo (49 s).
- [ ] Imagen de Roberto y 6 slides (ver las indicaciones de *Pantalla*).
- [ ] **Vision:** confirmar con el path vision que la deteccion del parpadeo por camara esta en `main` (hoy esta en la rama `vision-prueba`). Si no llega, la demo va con el simulador de ojos y en la solucion se dice "elige con un parpadeo largo" sin "la camara de la compu reconoce".
- [ ] **Demo en 49 s:** el presentador habla ~18 s y quedan ~31 s para la frase de Laura, la del jurado, la espera de opciones, dos elecciones, la voz y la alarma. Cronometrarlo con la app real; si no entra, el jurado en vivo pasa al video de respaldo.
