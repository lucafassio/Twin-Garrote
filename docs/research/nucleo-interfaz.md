# Research: path nucleo-interfaz (Fase 0)

Hallazgos para validar el plan del issue #5. Cada seccion termina con la implicancia para nuestro plan.

## Decisiones del grill (2026-11-07)

| Tema | Decision |
|---|---|
| Barrido | Lineal, 1,2 s por elemento, velocidad ajustable en vivo |
| Ojos cerrados | El barrido se congela mientras `ojos.cerrados`; la eleccion se confirma al abrir los ojos |
| Orden de opciones | Por probabilidad: la mejor primero (pedido al path llm) |
| Urgencia | Gesto de urgencia (2 s de ojos cerrados) desde cualquier estado, ademas de estar en la franja |
| Vueltas | Pausa del barrido tras 3 vueltas sin eleccion; se reanuda con parpadeo largo o turno nuevo |
| Si / No | Son respuesta: se dicen, entran al historial como `usuario` y limpian las opciones |
| Espera | Pide tiempo: se dice, mantiene opciones, reinicia el barrido desde la opcion 1, no entra al historial |
| Turno durante urgencia | Entra al historial; las opciones se piden al cortar la urgencia |

Reglas tomadas sin grill (correcciones obvias):
- Respuestas del LLM de un pedido viejo se descartan (contador de pedido).
- Otra se saltea en el barrido mientras se espera al LLM.
- Varios Otra seguidos acumulan `yaMostradas`.
- Al elegir, el barrido se pausa hasta `hablando {activo:false}`, con un maximo de 3 s si no llega `hablando` (el simulador no lo emite).
- Nota para voz: el microfono esta apagado mientras suena la urgencia, asi que un turno en ese momento llega por `CampoTurno`.

## 1. Barrido en CAA

**Lineal vs por filas y columnas**
- El barrido lineal es el mas simple y el que menos errores tiene, pero el mas lento. Filas y columnas es mas rapido con muchos elementos, pero exige mas esfuerzo cognitivo y fisico (dos selecciones por eleccion). En chicos, los errores entre ambos no difieren significativamente. [AbleNet: What is Scanning?](https://support.ablenetinc.com/aac-education-and-resources/what-is-scanning/), [preescolares lineal vs fila-columna](https://experts.umn.edu/en/publications/examining-preschoolers-performance-in-linear-and-row-column-scann/), [PMC4617344](https://pmc.ncbi.nlm.nih.gov/articles/PMC4617344)
- Ordenar por probabilidad (lo mas probable primero) baja el tiempo de seleccion en barrido de un solo switch: el tiempo de acceso depende de la posicion en el recorrido. [Huffman scanning, PMC3828203](https://pmc.ncbi.nlm.nih.gov/articles/PMC3828203), [Fast switch scanning keyboards](https://arxiv.org/pdf/1606.02552)
- En barrido Huffman, una velocidad mas pausada dio mas velocidad de escritura que velocidades rapidas calibradas: los errores cuestan mas que la espera. [PMC3828203](https://pmc.ncbi.nlm.nih.gov/articles/PMC3828203)

**Velocidad**
- No hay un numero recomendado universal: se ajusta por persona. [AbleNet](https://support.ablenetinc.com/aac-education-and-resources/what-is-scanning/)
- Barrido operado por parpadeo (12 participantes sin discapacidad): probaron intervalos de 1000, 850 y 700 ms; el mejor rendimiento fue 850 ms con mas de 97% de precision. [MacKenzie, York University](https://www.yorku.ca/mack/UAIS2011.html)
- Barrido rapido aumenta las selecciones falsas. Los switches de parpadeo necesitan ajustar el umbral a medida que avanza la enfermedad. [typeset: blink communication](https://typeset.io/pdf/communication-technologies-based-on-voluntary-blinks-3gkrunt9qn.pdf)

**Cuantas vueltas antes de pausar**
- Grid 3: "maximo de barridos" de 1 a 5, o ilimitado. [Smartbox: switch scanning en Grid 3](https://hub.thinksmartbox.com/knowledgebase/using-switch-scanning-with-grid-3/)
- PRC-Saltillo: "Number of Rescans" de 0 a 5; al llegar, el barrido se detiene hasta que el switch lo reactiva. [PRC-Saltillo: Scanning Setup](https://documentation.prc-saltillo.com/docs/scanning-setup)

**Implicancias**
- Con 9 elementos, **lineal alcanza**: filas y columnas pide 2 parpadeos largos por eleccion y cada uno cuesta 500 ms mas 1 s de enfriamiento (issue de vision).
- **Riesgo clave del plan:** el parpadeo largo dura 500 ms y el barrido avanza cada 1,2 s. Si el barrido sigue avanzando con los ojos cerrados, se elige el elemento equivocado. **Hay que congelar el barrido mientras `ojos.cerrados` sea true** y elegir el elemento iluminado al cerrar los ojos.
- Velocidad configurable en vivo (teclas o slider de debug), arrancando en 1,2 s.
- **Tope de vueltas:** pausar despues de N vueltas sin eleccion (Grid 3 y PRC lo hacen) y reanudar con un parpadeo largo. Reduce fatiga y selecciones accidentales.
- Opciones del LLM primero en el recorrido, con la mas probable en la posicion 1.

## 2. Diseno para ELA

- No encontre guias con numeros concretos (tamano de letra, contraste) especificas de ELA. La guia de Microsoft para CAA por mirada en ELA y una tesis de OCAD listan areas: tamano, disposicion, feedback, color, tipografia y personalizacion. [Microsoft AACrobat](https://microsoft.com/en-us/research/wp-content/uploads/2016/10/AACrobat-1.pdf), [Chitty, OCAD](https://openresearch.ocadu.ca/id/eprint/143/1/Chitty_MRP.pdf)
- El uso por mirada o switch produce fatiga, cansancio visual y carga mental: procesar lo que dice el interlocutor mas navegar la interfaz. [It's Complicated, arXiv 2606.24854](https://arxiv.org/pdf/2606.24854)
- Eye tracking: alta usabilidad, limitada por fatiga, calibracion y problemas oculares. El movimiento ocular voluntario suele ser el ultimo canal que queda. [PMC6745732](https://pmc.ncbi.nlm.nih.gov/articles/PMC6745732)
- Cognicion: en un estudio de 797 pacientes, solo 48,2% era cognitivamente normal; 20,5% tenia ELA con demencia frontotemporal y 16,6% deterioro cognitivo. [Unito](https://iris.unito.it/handle/2318/1842468)
- La fatiga depende de la hora del dia. [speechpathology.com](https://www.speechpathology.com/files/event/07800/07831/slideshoalspart2winter9-22-16.pdf)

**Implicancias**
- Poca carga cognitiva: pocos elementos, siempre en el mismo lugar, texto plano y sin animaciones. El plan ya lo pide.
- Feedback claro de que elemento esta iluminado y de que el parpadeo se esta contando (barra de progreso).
- El color del iluminado no puede ser rojo: rojo es urgencia.
- Feedback despues de elegir: confirmar visualmente que se eligio antes de que suene la voz.

## 3. Sistemas comerciales

- TD Snap tiene "QuickFires": frases pre-cargadas siempre a mano como "Si", "No", "Necesito ayuda". El pedido de ayuda es una frase mas, no una alarma. [TD Snap quick guide](https://ticket.ttsd.k12.or.us/support/solutions/articles/19000162735)
- TD Snap se usa por tacto, mirada o switch con el mismo contenido. [App Store](https://apps.apple.com/us/app/td-snap/id1072799231)

**Implicancias**
- Nuestra franja de opciones fijas es el equivalente a QuickFires.
- Nuestra urgencia (alarma repetida hasta que alguien la corta) es mas fuerte que la de TD Snap. Bien para ELA, donde el usuario no puede llamar a nadie.

## 4. Posicion de las opciones: fija o por probabilidad

- Planificacion motora (LAMP, vocabulario nucleo): mantener cada elemento siempre en el mismo lugar permite que la eleccion se vuelva automatica. Es literatura de seleccion directa, sobre todo para autismo. [AbleNet: grid sizes and motor planning](https://support.ablenetinc.com/aac-education-and-resources/ableteams/understanding-aac-grid-sizes-and-motor-planning/), [AbleNet: core vocabulary](https://support.ablenetinc.com/aac-education-and-resources/why-core-vocabulary-is-on-the-aac-home-page/)
- En barrido, la posicion es tiempo: lo mas probable primero ahorra segundos. [PMC3828203](https://pmc.ncbi.nlm.nih.gov/articles/PMC3828203)
- No encontre estudios que comparen directamente ambas cosas para respuestas generadas.

**Implicancias**
- Franja fija (Urgencia, Si, No, Espera, Otra): **siempre en el mismo lugar y orden**.
- Las 4 opciones del LLM cambian en cada turno, asi que la memoria espacial del texto no aplica. Hay dos caminos:
  - (a) **Orden por probabilidad**: la mejor primero. Menos espera.
  - (b) **Cuadrante fijo por intencion** (aceptar, rechazar, preguntar, otra). El usuario aprende "la de aceptar siempre esta arriba a la izquierda" y puede anticipar.
  - A decidir en el grill.

## 5. Modelo de estados del nucleo

Estados de la conversacion (que muestran los cuadrantes):

| Estado | Cuadrantes | Barrido recorre |
|---|---|---|
| `escuchando` (sin turno todavia) | "Escuchando..." | Franja fija |
| `pensando` (esperando al LLM) | "Pensando..." | Franja fija (sin Otra) |
| `opciones` | 4 opciones | Opciones + franja |
| `sinConexion` (fallo el LLM) | "Sin conexion" | Franja fija (Otra reintenta) |

Estados que se superponen (pausan o reemplazan el barrido):

| Estado | Efecto |
|---|---|
| `hablando` | Barrido en pausa |
| `urgencia` | Pantalla roja, barrido en pausa, se corta con Escape o click |
| `deletreando` | Barrido del nucleo en pausa; Deletrear maneja el suyo |
| `ojosCerrados` | Barrido congelado (ver seccion 1) |
| `pausado` (N vueltas sin eleccion) | Barrido detenido hasta un parpadeo largo |

**Huecos y contradicciones del plan actual**
1. **Barrido avanza durante el parpadeo largo**: no esta definido. Propuesta: congelar.
2. **Si / No**: el plan no dice si van al historial ni si limpian las opciones. Propuesta: van al historial como `usuario` y limpian las opciones, igual que elegir una opcion.
3. **Espera**: dice algo en voz alta pero no esta definido si va al historial. Propuesta: no va (no es respuesta al turno) y las opciones se mantienen.
4. **Otra en `pensando`**: no deberia poder elegirse. Propuesta: se saltea.
5. **Turno nuevo durante `urgencia` o `hablando`**: no definido. Voz apaga el microfono mientras habla, asi que en `hablando` no deberian llegar. En `urgencia`: guardar el turno en el historial pero no pedir opciones hasta que termine.
6. **Respuesta del LLM que llega tarde**: si llega un turno nuevo mientras el anterior sigue en `pensando`, la respuesta vieja puede pisar a la nueva. Propuesta: descartar respuestas de pedidos viejos (contador de pedido).
7. **Parpadeo largo en `hablando`**: se ignora. Urgencia no se puede elegir mientras el sistema habla; aceptable porque el habla dura pocos segundos.
8. **Urgencia la corta otra persona** (Escape o click): correcto, el usuario no tiene como cortarla.
