# Vision: que arreglar del eye tracker (revision, 7 nov 2026)

Revision del codigo de la rama `prueba-vision-local` (`src/vision/index.ts`, `zonas.ts`, `senales.ts`,
`src/nucleo/estabilizadorMirada.ts`) contra literatura y apps de referencia. Ordenado por impacto esperado.

## 0. Primero: medir (sin esto no sabemos si un cambio mejora)

Hoy no hay forma objetiva de comparar dos versiones: se prueba "a ojo". Propuesta, ~1 h:

- **Grabar sesiones**: durante la calibracion por zonas (y en una prueba de N objetivos al azar) guardar
  `{ t, zona_objetivo, rasgos[], eyeBlinkL, eyeBlinkR, cerrados }` por cuadro y exportarlo a JSON.
- **Evaluar offline** con un test de vitest/node sobre esos JSON: entrenar con la pasada de ida y probar
  con la de vuelta (ya hay dos pasadas). Reportar acierto por zona, **matriz de confusion**, % de cuadros
  sin zona confiable y fps.
- Con 3-4 grabaciones (distintas personas/luz) cualquier cambio de rasgos, k, clasificador o zonas
  se compara en segundos y con numeros.

## 1. Bugs concretos encontrados en el codigo

1. **Un solo cuadro "abierto" reinicia el parpadeo largo** (`senales.ts`, `crearDetector`). Hay un umbral
   unico sobre el promedio de 3 cuadros: si en medio de un cierre de 500 ms el valor baja un instante
   del umbral, `inicio = null` y el progreso vuelve a 0. Arreglo: **histeresis** (cerrar con umbral alto,
   abrir recien con uno mas bajo, p. ej. 60 % y 40 % del camino abierto -> cerrado) y tolerar ~100 ms de
   "abierto" antes de cortar el cierre.
2. **El umbral del parpadeo da por hecho que cerrado = 1.0.** `umbral = lineaBase + 0.5 * (1 - lineaBase)`.
   La calibracion solo mide ojos abiertos. Con ptosis o cierres incompletos (frecuentes en ELA: ptosis en
   ~16 % de usuarios de eye tracker en un estudio multicentrico) `eyeBlink` puede quedarse en 0.6-0.7 y
   nunca cruza. Arreglo: **calibracion de dos puntos**: medir abiertos (ya esta) y pedir 3 cierres
   largos, tomar la meseta de cerrado y poner los umbrales entre ambos.
3. **Mirar hacia abajo puede parecer un cierre.** Al mirar abajo el parpado superior baja y `eyeBlink`
   sube; la franja esta abajo de todo. Hay que medirlo con las grabaciones (punto 0): `eyeBlink` medio
   por zona. Si la franja sube la linea base, usar **linea base por zona** (la zona actual ya se conoce)
   o restar una parte de `eyeLookDown*`.
4. **El autoentrenamiento aprende de elecciones que despues se cancelan.** En `actualizarZona`, los
   cuadros se suman al clasificador cuando el cierre llega al umbral (`estado.confirmar`), pero el
   nucleo confirma recien al reabrir y puede cancelar (`perdido`). Lo que habia propuesto Alvaro en #3 es
   lo correcto: sumar solo cuando el nucleo confirma la eleccion.
5. **El autoentrenamiento se etiqueta con la zona de vision, no con la que eligio el nucleo.**
   `antesDeCerrar.zona` es la zona cruda de vision con confianza >= 0.6; el nucleo elige la zona
   estabilizada, que puede ser otra. Etiquetar con la zona elegida (que llega del nucleo) evita que el
   clasificador refuerce sus propios errores.
6. **Los ultimos cuadros antes del cierre ya tienen el ojo bajando.** `recientes.slice(-10)` incluye los
   ~3 cuadros de retraso del promedio, con iris tapado: rasgos malos con etiqueta. Descartar los ultimos
   3-5 cuadros.
7. **Inferencia en CPU.** No se pasa `delegate`, y el aviso `Created TensorFlow Lite XNNPACK delegate for
   CPU` confirma que corre en CPU, en el hilo principal, a 1280x720. Probar `baseOptions.delegate: 'GPU'`
   y **medir fps reales** (mostrarlos en DebugVision). Pocos fps = menos cuadros por zona, mas latencia y
   mas ruido.

## 2. El problema de fondo: le pedimos demasiado a una webcam

- WebGazer en condiciones buenas: 2-4 grados de error, con deriva a lo largo de la sesion. En condiciones
  reales de webcam, 6-11 grados (ya citado en #3). Para dwell la literatura recomienda objetivos de ~4
  grados *con eye trackers de verdad*.
- En una notebook a 60 cm, el centro de un cuadrante queda a ~7 grados del centro de la pantalla. Es
  justo el margen de error. Y la **senal vertical es la mas debil** (el iris casi no se mueve en vertical
  y el parpado lo tapa), pero 3 de las 5 zonas se distinguen por arriba/abajo.
- Lo que funciona en produccion con camara comun pide menos:
  - **Look to Speak (Google)**: solo izquierda, derecha y arriba (pausa). Cada mirada parte la lista en
    dos mitades; 16 frases en 4 miradas. Sensibilidad ajustable.
  - **GazeSpeak (Microsoft, pensado para ELA)**: 4 direcciones + ojos cerrados, gestos y no fijaciones.
  - **Project Gameface (Google, MediaPipe)**: umbral ajustable por gesto y por persona, con vista previa
    de la camara para elegirlo.

**Recomendacion:** bajar de 5 clases a 3 faciles de separar, aprovechando que la franja ya usa barrido:
`izquierda` (opciones 0 y 2), `derecha` (1 y 3) y `abajo` (franja) o incluso solo izquierda/derecha. Dentro
del lado elegido, la segunda opcion se resuelve con un segundo gesto o con barrido de 2 elementos (rapido).
Con las grabaciones del punto 0 se puede comprobar en el acto cuanto mejora el acierto al pasar de 5 a 3.

Variante mas robusta todavia: **gestos en vez de zonas** ("mira bien al costado y volve"). Una excursion
hasta el borde de la pantalla (o mas alla) da una senal mucho mas grande que fijar el centro de un
cuadrante, y se detecta relativa al centro neutro del momento, lo que tambien absorbe la deriva.

## 3. Mejoras del clasificador (medibles con el punto 0)

- **Cuadros casi identicos**: los vecinos de un cuadro nuevo suelen salir todos de la misma pasada de
  calibracion, asi que la confianza es casi siempre ~1 y no esta calibrada (confianzas altas en
  errores). Probar: submuestrear (1 de cada 3 cuadros), k mas chico, o un modelo lineal (regresion
  logistica / LDA) que da probabilidades mas razonables y fronteras mas suaves.
- **Posicion de la cabeza como rasgo** (`matriz[12..14]`): si la persona se acomoda distinto que en la
  calibracion, se corren todas las zonas. Probar sacarla o usarla relativa a la de calibracion.
- **Rasgos relativos al centro**: restar un "neutro" que se actualiza despacio cuando la mirada esta
  estable (por ejemplo mientras habla el interlocutor) corrige la deriva sin recalibrar.
- **Desbalance de zonas** con el autoentrenamiento (`maximoPorZona` recorta las viejas de la zona usada):
  las zonas que se eligen mucho se renuevan y las otras no. Mantener una base fija de calibracion por zona.

## 4. Puesta en escena (para la demo pesa tanto como el codigo)

- Luz de frente o de costado, nunca ventana atras. Evitar reflejos en anteojos.
- Camara centrada y a la altura de los ojos, cara grande en el cuadro (50-60 cm). El modelo de puntos
  trabaja sobre un recorte de la cara de ~256x256: subir la resolucion de la camara ayuda solo si la cara
  sale chica; acercarse ayuda siempre.
- Pantalla lo mas grande posible y opciones pegadas a los bordes: mas grados de separacion entre zonas.
- Recalibrar si la persona se mueve de lugar (la deriva con webcam esta documentada).

## 5. Contexto ELA a tener en cuenta

- Ptosis, menos parpadeo, ojo seco y fatiga empeoran el seguimiento con el tiempo de uso. Duracion del
  parpadeo largo y umbrales ajustables por perfil (ya existen `setUmbral` y `setDuracion`; falta que la
  calibracion de dos puntos los proponga sola).
- Dwell recomendado en la literatura: 600-800 ms con trackers baratos; el nucleo usa 300 ms de mirada
  estable + parpadeo, que esta bien porque el parpadeo es la confirmacion.

## Fuentes

- Look to Speak: https://www.trustedreviews.com/explainer/what-is-googles-look-to-speak-app-and-what-does-it-do-4221421 , https://www.androidpolice.com/2020/12/08/googles-latest-accessibility-app-lets-your-eyes-do-the-talking/
- GazeSpeak: https://microsoft.com/en-us/research/uploads/prod/2017/01/gazespeakUpdated.pdf
- Project Gameface: https://developers.googleblog.com/project-gameface-makes-gaming-accessible-to-everyone/
- Precision de WebGazer y deriva: https://studenttheses.uu.nl/handle/20.500.12932/40709?show=full , https://jeffhuang.com/papers/WebGazer_IJCAI16.pdf
- Medicion honesta de mirada por webcam (2026): https://arxiv.org/pdf/2608.11566
- Tamano de objetivo y dwell: https://arxiv.org/html/2512.16366 , https://www.cs.auckland.ac.nz/~lutteroth/publications/PenkarLutterothWeber2012-EyeDwellParameters.pdf , https://kaken.nii.ac.jp/grant/KAKENHI-PROJECT-20K20866
- Ptosis y fatiga en usuarios de eye tracker con ELA: https://ese-journals.unisalento.it/index.php/jdream/article/view/24095 , https://frontiersin.org/articles/10.3389/fnhum.2020.595890/pdf
- Menor deteccion de cierre al mirar abajo (parpado tapa el ojo): https://www.mdpi.com/2079-9292/14/21/4201
- Recorte de 256x256 del modelo de puntos (fuente secundaria): https://huggingface.co/senty-au/face_landmarks_detector-ONNX
