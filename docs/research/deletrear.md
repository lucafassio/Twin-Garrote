# Research: path deletrear (Fase 0)

Hallazgos para validar el plan del issue #6. Construye sobre `docs/research/nucleo-interfaz.md` (barrido lineal, congelar con ojos cerrados, pausa tras 3 vueltas): eso no se repite aca.

Supuestos de los calculos propios (scripts en el scratchpad de la sesion, reproducibles): paso de barrido 1,2 s; un elemento elegido cuesta unos 2,0 s en vez de 1,2 s (reaccion + 500 ms de ojos cerrados + 1 s de enfriamiento de vision); despues de cada eleccion el barrido vuelve al principio. Frecuencias de letras de [sttmedia](https://www.sttmedia.com/characterfrequency-spanish) con las tildes sumadas a la letra base; espacio estimado con el largo medio de palabra de ese mismo corpus (1,69 M caracteres / 381 mil palabras = 4,44 letras por palabra, o sea espacio = 18,4% de los caracteres).

## Propuesta

| Decision | Recomendacion | Por que (corto) |
|---|---|---|
| Disposicion de letras | **5 filas por frecuencia, fijas**: `_ E A O S N` / `R I L D T U` / `C M P B H Q` / `Y V G F J Z` / `(enie) X K W`. Fila, despues letra (2 parpadeos largos por letra) | 4,5 pasos por letra contra 7,1 de los grupos alfabeticos del issue (-36%); mismo numero de parpadeos. Las dos primeras filas cubren 84,5% de lo que se escribe |
| Espacio | Primer lugar de la fila 1 **y** espacio automatico al elegir una palabra o la frase | El espacio es el caracter mas frecuente (18%); el issue no lo tenia en ningun lado |
| Letras que se reordenan solas | **No**. Teclado fijo; el modelo de lenguaje solo pone palabras y frase en su fila | Reordenar letras suma carga cognitiva que puede comerse la ganancia ([Roark et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC3828203)) |
| Orden del barrido de arriba | `Frase` (solo si el LLM devolvio algo distinto del prefijo) / `Palabras` / filas 1 a 5 / `Borrar` / `Decir` / `Salir` | Lo que mas ahorra va primero; los controles al final no le cobran pasos a cada letra |
| Prediccion de palabras | **Lista de frecuencias + busqueda por prefijo**, 4 palabras en la fila `Palabras`, mas el **completado** de `completarFrase` como elemento `Frase` | Sin el completado, "tengo frio" no baja de ~50 s con parpadeos reales |
| Elegir `Frase` | La dice directo (`onTerminar`), sin pasar por `Decir` | Un parpadeo menos; igual que elegir una opcion en el nucleo |
| Proxima palabra sin letras (despues de un espacio) | La palabra que sigue en el completado del LLM va primera en `Palabras`; el resto, las mas frecuentes que suelen arrancar frase | No hay n-gramas libres listos para 2 horas; el LLM ya conoce la charla |
| Lista de palabras | **hermitdave/FrequencyWords `es_50k.txt` (OpenSubtitles 2018), recortada a ~20 mil formas**, mas una lista a mano de voseo y el perfil (nombres de la familia, frases tipicas) con peso alto | Licencia CC BY-SA 4.0 (sirve en repo publico con atribucion); ya trae `queres`, `podes`, `sabes`, `che` con tilde |
| Tildes y enie | Clave de busqueda sin tildes pero **con enie**; se muestra y se dice la forma con tilde mas frecuente | NFD + borrar marcas combinantes convierte la enie en n: hay que preservarla a mano |
| Libreria | **Ninguna**: array ordenado por frecuencia y `filter(startsWith)` o busqueda binaria sobre un array ordenado por clave | 20 mil palabras se filtran en menos de 1 ms; cero dependencias que avisar |
| Donde vive la lista | `public/palabras-es.txt` (una palabra por linea, ya ordenada), `fetch` al montar | No infla el bundle de JS; ~150-250 KB sin comprimir (estimado) |
| Borrar | `Borrar` borra la ultima letra; si lo ultimo fue una palabra o frase elegida, borra esa palabra entera | Un error de palabra se arregla con un parpadeo |
| Fila equivocada | Si se recorre la fila entera sin eleccion, vuelve solo al nivel de arriba (sin elemento extra) | Grid 3 tiene "back up one level"; un elemento "Volver" en cada fila le cobra pasos a todo |
| Salir | `Salir` siempre presente, al final; lo escrito queda guardado como borrador para la proxima vez | Sin confirmacion: ahorra un parpadeo y no se pierde nada |
| Cifra para el pitch | "Letra por letra con un switch se escribe 1 a 3 palabras por minuto (Koester y Simpson 2014). Con prediccion y la frase del LLM, 'tengo frio' sale en ~35-45 s" | Ver seccion 5 |

## 1. Disposicion de letras

**Frecuencia de letras en espanol**
- E 13,72%, A 11,72%, O 8,44%, S 7,20%, N 6,83%, R 6,41%, I 5,28%, L 5,24%, D 4,67%, T 4,60%, U 4,55%; enie 0,17%; tildes aparte (o con tilde 0,76%, i con tilde 0,70%, a con tilde 0,44%). Corpus literario de 2,13 M caracteres. [sttmedia](https://www.sttmedia.com/characterfrequency-spanish)
- Otra tabla da cifras parecidas (E 13,7%, A 12,3%, O 8,7%, S 7,0%). [dcode](https://www.dcode.fr/analisis-frecuencias)
- Espacio: ninguna fuente confiable da el porcentaje en espanol. Lo estime con el largo medio de palabra del corpus de sttmedia: **18,4%** de los caracteres, mas que la E.
- Orden resultante (con espacio, tildes plegadas): `_ E A O S N R I L U D T C M P B H Q Y V G F J Z (enie) X K W`. Entropia unigrama: 4,0 bits por caracter (calculo propio).

**Pasos de barrido por caracter (calculo propio, espanol, incluye espacio)**

| Disposicion | Pasos por caracter | Parpadeos largos | Segundos por caracter (1,2 s/paso) |
|---|---|---|---|
| Lineal alfabetica, espacio al final | 14,5 | 1 | 18,2 |
| Lineal alfabetica, espacio primero | 10,4 | 1 | 13,3 |
| Lineal por frecuencia | 6,6 | 1 | 8,7 |
| Grupos del issue (A-F, G-L, M-R, S-Z, espacio en S-Z) | 7,1 | 2 | 10,1 |
| 4 filas por frecuencia de 7 | 4,8 | 2 | 7,3 |
| **5 filas por frecuencia de 6** | **4,5** | 2 | **7,0** |
| Fila-columna optima 6x5 (diagonales por frecuencia) | 4,2 | 2 | 6,6 |

- El ahorro de pasos de las filas por frecuencia contra los grupos alfabeticos del issue es de ~36%. En ingles, MacKenzie mide lo mismo: disposicion optimizada 4,27 pasos por caracter contra 5,78 alfabetica (-26%), y 2,6-2,7 con prediccion de palabras. [MacKenzie, ICCHP 2012](https://www.yorku.ca/mack/icchp2012.html)
- Lineal (1 parpadeo por letra) pierde aunque ahorre parpadeos: el recorrido largo cuesta mas que el segundo parpadeo, incluso con cada eleccion a 2 s.
- La fila-columna "optima" (letras por diagonales) ahorra 0,3 pasos mas pero mezcla letras sin un patron legible. Las filas por frecuencia se leen de izquierda a derecha y casi no pierden.
- Un caso real (Ace Centre, un usuario, barrido fila-columna auditivo): disposicion por frecuencia comun (EARDU) 17,9% mas eficiente que su teclado actual; ABCD igual que el actual; QWERTY 18% peor. El espacio fue el simbolo mas frecuente y sugieren no gastarle una celda propia. [Ace Centre](https://acecentre.org.uk/project/switch-scanning-frequency-analysis/)

**Huffman y letras dinamicas**
- Roark et al., 16 novatos con un switch: fila-columna 19,6-21,2 caracteres por minuto (cpm), Huffman con modelo unigrama 12,8 cpm, Huffman con modelo de 8-gramas de caracteres 24,5 cpm, lineal en grilla ordenada por el modelo 23,2 cpm con el menor error (2,4%). [Roark et al., PMC3828203](https://pmc.ncbi.nlm.nih.gov/articles/PMC3828203)
- Sin un buen modelo de caracteres, Huffman es **peor** que fila-columna (12,8 contra ~20 cpm). Con modelo, gana poco (~15%) y pide vigilar resaltados no contiguos todo el tiempo.
- Los mismos autores citan trabajos previos: reorganizar la grilla letra a letra suma carga cognitiva que puede superar la ganancia; por eso Huffman resalta sin mover letras. [PMC3828203](https://pmc.ncbi.nlm.nih.gov/articles/PMC3828203)
- Un modelo de caracteres con LLM existe (Gaines y Vertanen convierten un LLM de subpalabras a probabilidades por letra), pero no es para 2 horas ni para 1 s de latencia por letra. [arXiv 2501.10582](https://arxiv.org/html/2501.10582v3)

**Novato (jurado) vs entrenado**
- No encontre un estudio controlado de novatos con frecuencia vs alfabetico en barrido. Lo mas cercano: un informe de 1981 (tipeo general, no CAA) dice que para el novato la busqueda visual y el procesamiento mental se compensan y las disposiciones quedan parecidas. [DTIC ADA108930](https://apps.dtic.mil/sti/html/tr/ADA108930/index.html)
- Ace Centre: los terapeutas eligen ABC o QWERTY porque al usuario y a la familia les cuesta cambiar, aunque la frecuencia se aprende rapido y en barrido se puede seguir con la vista. [Ace Centre](https://acecentre.org.uk/project/switch-scanning-frequency-analysis/)
- En barrido el usuario no busca la letra contra reloj en toda la pantalla: solo decide "esta en esta fila o no" durante 1,2 s, con 6 letras a la vista.
- **En la demo, quien parpadea es alguien del equipo (entrenado); el jurado solo mira.** La frecuencia no le cuesta nada al jurado si las letras son grandes y la frase que se va armando se ve arriba.

**Implicancias**
- Cambiar los grupos alfabeticos del issue por 5 filas por frecuencia con el espacio primero.
- Teclado fijo. Nada de letras que se mueven.

## 2. Prediccion de palabras

**Lo que dice la literatura de "keystroke savings" vs costo cognitivo**
- Koester y Levine (1996): con prediccion de palabras, usuarios con lesion medular escribieron **mas lento**; los sin discapacidad, apenas mas rapido. El costo de mirar la lista se comio el ahorro de teclas. [Nel et al., arXiv 1712.10073](https://ar5iv.arxiv.org/html/1712.10073), [resumen del estudio](https://www.bohrium.com/paper-details/effect-of-a-word-prediction-feature-on-user-performance/812304092322856965-10208)
- Koester y Simpson (2014), 9 usuarios reales de un switch: 2,7 ppm con prediccion contra 1,5 sin; lo que mas pesa es el retardo del barrido, la prediccion y la disposicion del alfabeto. [Nel et al.](https://ar5iv.arxiv.org/html/1712.10073)
- La diferencia entre ambos estudios se atribuye a que la prediccion hay que ajustarla a cada usuario. [Nel et al.](https://ar5iv.arxiv.org/html/1712.10073)
- Grid 2 recomienda apagar la prediccion en modo auditivo o con retardos de barrido largos. [Nel et al.](https://ar5iv.arxiv.org/html/1712.10073)
- Con prediccion, diccionarios mas grandes dan **mas** pasos por caracter (mas competidores por los primeros lugares). [MacKenzie](https://www.yorku.ca/mack/icchp2012.html)
- Techo general: ningun sistema de prediccion supera ~70% de ahorro de teclas (citando a Garay-Vitoria y Abascal 2006). [Trnka 2008](https://www.eecis.udel.edu/~mccoy/publications/2008/trnka08at.pdf)

**Que aprendieron los sistemas con LLM**
- **SpeakFaster** (Google, Nature Communications 2024): el usuario tipea solo iniciales ("ishpitb") y un LLM (LaMDA 64B ajustado con ~1,8 M ejemplos) devuelve 5 frases. Si no esta, deletrea alguna palabra (KeywordAE) o cambia una palabra equivocada (FillMask). [PMC11530652](https://pmc.ncbi.nlm.nih.gov/articles/PMC11530652), [arXiv 2312.01532](https://arxiv.org/html/2312.01532v1)
  - Simulacion: 65,7% de ahorro de teclas contra 48,2% de la prediccion de Gboard.
  - Iniciales solas aciertan la frase exacta en el top-5 en 72,6-76,3% de los casos con contexto; sin el contexto de la charla, la cantidad de turnos que salen con una sola llamada cae a la mitad.
  - 2 usuarios con ELA por mirada: 6,54 contra 4,05 ppm (+61%, guionado) y 10,4 contra 8,1 ppm (+29%, campo). Sin guion, la mejora no fue significativa.
  - Mostrar 5 opciones: el ahorro simulado se aplana en ~5. Elegir entre las frases tarda 3 a 6 veces lo que una tecla.
  - Latencia del LLM ~0,8 s, cuatro veces menor que el intervalo entre teclas del usuario por mirada.
  - Fallas en frases largas y complejas.
- **KWickChat**: bolsa de palabras clave + GPT-2 con historial de la charla y perfil; ~71% de ahorro de teclas con un umbral de error de palabra de 0,65 (o sea, la frase no siempre es exacta). [Shen et al., IUI 2022](https://www.pokristensson.com/pubs/ShenEtAlIUI2022.pdf)
- **Dasher**: el modelo de lenguaje decide el tamano de cada opcion; por mirada, 15 ppm novato y 25 ppm experto tras una hora. Es para gestos continuos, no para un barrido de 1,2 s con elecciones caras. No encontre una cifra verificada de Dasher con un boton. [Dasher](https://dasher.acecentre.net/dasher/download/papers/dasherRehabArticle.pdf)
- **Nomon** (un switch, relojes): 9,3 ppm un usuario experto con >10 horas de practica, 1,2 clicks por caracter. [Broderick y MacKay, arXiv 0909.2450](https://arxiv.org/abs/0909.2450)
- **Look to Speak** (Google): solo elige frases precargadas mirando a izquierda o derecha; no deletrea. [blog.google](https://blog.google/outreach-initiatives/accessibility/look-to-speak/)

**Trie vs n-gramas vs LLM, en nuestro caso**
- Lista con frecuencias + prefijo: instantaneo, sin red, predecible. Es lo minimo que tiene que andar siempre (si el LLM cae, `completarFrase` devuelve el prefijo y no se muestra nada).
- N-gramas (proxima palabra sin letras): necesitan un corpus de bigramas en espanol; no encontre uno libre y chico listo para usar en 2 horas. Lo reemplaza el completado del LLM.
- LLM: `completarFrase` ya da una frase entera con el contexto de la charla, ~1,0-1,2 s. Con un paso de 1,2 s, llega antes de que el barrido vuelva arriba.
- **Combinar**: palabras de la lista (instantaneas) + frase del LLM (contexto). La palabra siguiente del completado sirve como primera prediccion de proxima palabra.

**Cuantas predicciones**
- 4 en la fila `Palabras` (5 en SpeakFaster y en la simulacion de Gaines y Vertanen). Con 4 se mantiene la fila corta y coincide con las 4 opciones del nucleo. [arXiv 2312.01532](https://arxiv.org/html/2312.01532v1), [arXiv 2501.10582](https://arxiv.org/html/2501.10582v3)
- Una sola `Frase` del LLM (no 5): con barrido, cada frase extra cuesta 1,2 s por vuelta. A futuro se puede pedir mas de una.

**Calculo propio: "tengo frio" (meta del issue: menos de 40 s)**

| Diseno | Pasos | Parpadeos | Con parpadeos reales (2 s por eleccion) | Con barra espaciadora |
|---|---|---|---|---|
| Grupos del issue, letra por letra | 66 | 20 | 95 s | 79 s |
| Grupos del issue + `Palabras` 5to grupo ("te" -> tengo, "fri" -> frio) | 46 | 14 | 66 s | 55 s |
| Filas por frecuencia + `Palabras` primero (idem) | 36 | 14 | 54 s | 43 s |
| Filas por frecuencia + `Palabras` ("fr" -> frio en 3er lugar) | 33 | 12 | 49 s | 40 s |
| + `Frase` del LLM primero ("te" -> tengo, "f", `Frase` "Tengo frio...") | 30 | 9 | 43 s | 36 s |
| + `Frase` del LLM, solo "t", "e", "n" y `Frase` | 25 | 7 | 36 s | 30 s |
| Variante: una sola fila `Sugerencias` = [frase, 3 palabras] ("te" -> tengo, "f", frase) | 28 | 10 | 42 s | 34 s |
| Iniciales + LLM estilo SpeakFaster ("t", "f", elegir frase 2 de 4) | 21 | 6 | 30 s | 25 s |

- Supuesto: la palabra buscada aparece entre las 4 primeras con esas letras (tengo es la palabra 51 de la lista de subtitulos, y "frio" con tilde tambien esta). Falta medirlo con la lista real.
- **Con el diseno del issue la meta de 40 s no se cumple**, ni siquiera con barra espaciadora. Las filas por frecuencia la dejan en el limite; el completado del LLM la hace holgada.

**Implicancias**
- El completado (`Frase`) no es un extra: es lo que hace usable el deletreo.
- La fila `Palabras` solo se recorre si tiene palabras; la `Frase` solo si el LLM devolvio algo distinto del prefijo (asi lo pide el aviso de llm en el issue).
- Las respuestas del LLM viejas se descartan (contador, como en el nucleo). Debounce ~400 ms despues de cada letra, segun el aviso de llm.

## 3. Listas de frecuencia de palabras

| Lista | Licencia | Descarga | Voseo | Notas |
|---|---|---|---|---|
| **hermitdave/FrequencyWords** (OpenSubtitles 2016 y 2018) | Codigo MIT, **contenido CC BY-SA 4.0** | [repo](https://github.com/hermitdave/FrequencyWords), [es_50k.txt 2018](https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt) | Si, parcial: `queres` 2830, `podes` 1680, `sabes` 3085, `che` 2064, `veni`, `mira`, `escuchame` (todas con tilde donde corresponde), `vos` 26194, `sos` 5099. `tenes` no aparecio en las primeras ~16 mil palabras | Formato `palabra cuenta` por linea. Trae duplicados con y sin tilde (`mas` 103445 sin tilde y 1503527 con tilde, `aqui` con y sin tilde). Top: de, que, no, a, la, el, y, es, en, lo, un, por, que (con tilde)... `tengo` en el puesto 51 |
| **wordfreq** (rspeer) | Codigo Apache, **datos CC BY-SA 4.0**; incluye OpenSubtitles 2018 (pide atribucion a OpenSubtitles) y Wikipedia | Paquete de Python, [PyPI](https://pypi.org/project/wordfreq) | No verificado | Hay que exportarla con Python; mas trabajo que un txt. No encontre el desglose de fuentes del espanol |
| **SUBTLEX-ESP** (Cuetos et al. 2011, 41 M palabras de subtitulos) | **No encontre la licencia** | No encontre la pagina de descarga del archivo; [paper](https://www.uv.es/revispsi/articulos2.11/1CUETOS.pdf) | No verificado (subtitulos de Espana) | Validada contra tiempos de reaccion, pero sin licencia clara no sirve para un repo publico |
| **Leipzig Corpora** | Contradictorio: la pagina propia dice copyright y remite a sus terminos; catalogos externos dicen CC BY | [descarga](https://wortschatz.uni-leipzig.de/en/download) | No encontre corpus argentino | Diarios y web, no habla |
| **ACTIV-ES** (dialogo de peliculas de Argentina, Mexico y Espana) | **GPL-2.0** | [repo](https://github.com/francojc/activ-es) | Si, tiene columnas por pais (Argentina) | Licencia de codigo para datos; trae n-gramas de 1 a 5. Interesante para bigramas argentinos, pero no hay tiempo de procesarlo |
| **CREA (RAE)** | No revise la licencia; no la encontre como descarga libre | - | - | Descartada por tiempo |

**Tamano**
- No encontre una cifra confiable de cobertura de habla en espanol por cantidad de formas. Un analisis no academico sobre OpenSubtitles da 74,9% con las 1000 primeras y 87,4% con las 5000 (blog, no verificado). [mindomax](https://www.mindomax.com/most-common-spanish-words)
- El espanol flexiona mucho (tengo, tenes, tiene, tenemos...): una lista de formas necesita mas entradas que una de lemas. Mas grande no es mejor para prediccion (mas competidores). [MacKenzie](https://www.yorku.ca/mack/icchp2012.html)
- Propuesta: recortar a ~20 mil formas, sacar basura de subtitulos (nombres en ingles, numeros, onomatopeyas largas) y sumar con peso alto: voseo, palabras del perfil (`familia`, `frasesTipicas`, `gustos`) y vocabulario de cuidado (dolor, bano, agua, frio, calor, almohada, aspirar, cama, girar...).

**Tildes y enie**
- El usuario escribe sin tildes; la clave de busqueda es la palabra sin tildes. Se agrupan las variantes por clave y se muestra la de mayor cuenta (`mas` sin tilde y con tilde -> se muestra con tilde; idem `aqui`).
- Ojo: `si` sin tilde (2348665) y con tilde (2350514) son palabras distintas con cuentas parecidas. Agruparlas pierde una; para el habla da igual (se pronuncian igual), y el LLM corrige en la frase.
- `normalize('NFD')` descompone la enie en `n` + tilde combinante, asi que el truco comun de borrar el rango U+0300 a U+036F convierte "ano" y "anio" (con enie) en la misma clave. Borrar solo el acento agudo y la dieresis (U+0301 y U+0308) y despues `normalize('NFC')`. [MDN normalize](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)
- El texto que se le pasa a `onTerminar` va con tildes (la forma elegida de la lista o la frase del LLM), asi la voz pronuncia bien.

**Implicancias**
- Usar `es_50k.txt` 2018. Agregar en el repo un aviso de atribucion: "Lista derivada de hermitdave/FrequencyWords (CC BY-SA 4.0), datos de OpenSubtitles 2018". La lista derivada queda bajo CC BY-SA 4.0. El repo no tiene archivo LICENSE.

## 4. Bibliotecas npm

- Hay varias: `mnemonist` (TrieMap con `find(prefijo)`), `prefix-trie-ts`, `@smikhalevski/trie` (~2 kB gzip segun su autor), `@neosh11/autocomplete-search`. No verifique mantenimiento ni descargas. [mnemonist TrieMap](https://yomguithereal.github.io/mnemonist/trie-map), [prefix-trie-ts](https://www.npmjs.com/package/prefix-trie-ts)
- No hace falta ninguna: con 20 mil palabras ya ordenadas por frecuencia, `palabras.filter(p => p.clave.startsWith(prefijo)).slice(0, 4)` recorre el array entero en menos de 1 ms (estimado, no medido). Un trie ahorra microsegundos que nadie nota con pasos de 1,2 s.
- Si se quiere algo mejor: array ordenado por clave + busqueda binaria del primer elemento con el prefijo, y despues tomar el rango; el top 4 por frecuencia sale de ese rango.
- Agregar una dependencia obliga a avisar al grupo (CLAUDE.md). Escribirlo a mano son ~30 lineas.

**Tamano**
- `es_50k.txt` completo pesa ~650 KB (649 mil caracteres). 20 mil formas sin la cuenta, ya ordenadas, deberian quedar en ~150-250 KB sin comprimir (estimado).
- En `public/` se baja una vez con `fetch` y no entra al bundle de JS. Importarlo desde un `.ts` lo mete en el bundle de la pagina y hace mas lento el tipado y el build. Recomiendo `public/palabras-es.txt`.

## 5. Velocidad realista

- Koester y Simpson (2014), 9 usuarios reales de un switch: 0,3-2,9 ppm antes de ajustar, 1,1-6,5 ppm despues; promedio 1,5 ppm sin prediccion y 2,7 con prediccion. "Un usuario muy rapido llega a 7-8 ppm; 1 ppm o menos es comun." [Nel et al.](https://ar5iv.arxiv.org/html/1712.10073)
- Un novato arranca con ~3 s por paso (0,57 ppm) y llega a ~1 s (1,7 ppm). Es raro que un usuario real use barrido jerarquico con menos de 1 s. [Nel et al.](https://ar5iv.arxiv.org/html/1712.10073)
- Novatos sin discapacidad con un boton y pasos de 330-500 ms: 20-25 cpm (~4-5 ppm). Con 1,2 s por paso, eso escala a mucho menos. [Roark et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC3828203)
- Calculo propio con 1,2 s por paso y parpadeos de 2 s: filas por frecuencia sin prediccion, 7,0 s por caracter = **~1,6 ppm**. Grupos del issue: ~1,1 ppm.
- Con prediccion y LLM: "tengo frio" (2 palabras) en ~36-43 s = **~3 ppm** en una frase favorable.
- Con LLM, en usuarios con ELA por mirada (no switch): SpeakFaster 6,5-10,4 ppm. No es comparable con un parpadeo por barrido. [PMC11530652](https://pmc.ncbi.nlm.nih.gov/articles/PMC11530652)

**Cifra honesta para el pitch**
- "Deletrear con un solo parpadeo es lento: en la literatura, 1 a 3 palabras por minuto con un switch (Koester y Simpson 2014). Por eso el deletreo es el ultimo recurso, y el LLM completa la frase con el contexto de la charla: 'tengo frio' sale en unos 40 segundos en vez de un minuto y medio letra por letra."
- No prometer las cifras de SpeakFaster: son por mirada, con un modelo ajustado y con 2 usuarios.

## 6. Correccion de errores

- Los tres metodos estandar de correccion en barrido (Grid 2): ventana de recuperacion entre clicks aceptados, ventana para deshacer (anular la eleccion de fila si no se elige columna en N vueltas) y un simbolo de borrar. [Nel et al.](https://ar5iv.arxiv.org/html/1712.10073)
- Los falsos positivos son muy dificiles de arreglar a mano en simulacion; acortar el paso aumenta errores y las correcciones bajan la velocidad. [Nel et al.](https://ar5iv.arxiv.org/html/1712.10073), [Roark et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC3828203)
- Grid 3 tiene "back up one level" y "stop scan" en la configuracion de switches. [Smartbox](https://hub.thinksmartbox.com/knowledgebase/using-switch-scanning-with-grid-3/)
- No encontre como manejan exactamente borrar palabra vs letra Grid 3 o TD Snap.

**Costo de un error (calculo propio, orden propuesto)**
- Letra equivocada: `Borrar` en la posicion 8 de arriba = ~10 s, mas reescribir la letra ~7 s = **~17 s por error**. Con 5% de errores (Roark: 2,4-6,2%), son ~0,9 s promedio por letra.
- Poner `Borrar` primero le cobraria 1,2 s a **cada** letra: sale mas caro que el error. Va despues de las filas.
- Fila equivocada: si la fila se recorre entera sin eleccion, volver arriba solo (~7 s). Mas barato que un elemento "Volver" en cada fila.
- Palabra o frase equivocada: `Borrar` la saca entera (un parpadeo).

**Salir**
- `Salir` siempre presente, ultimo. Sin confirmacion, pero lo escrito queda guardado y aparece al volver a entrar. Si el usuario sale sin querer, no pierde nada.
- El gesto de urgencia (2 s) tiene que seguir andando dentro de deletrear (ver preguntas abiertas).

## 7. Cosas que cambian el plan del issue

1. **Grupos alfabeticos -> filas por frecuencia.** -36% de pasos por letra, mismo numero de parpadeos.
2. **Falta el espacio.** Es el 18% de lo que se escribe. Espacio primero en la fila 1 y automatico despues de una palabra o frase.
3. **La meta de 40 s para "tengo frio" no se cumple con el diseno del issue** (66 s con parpadeos reales, 55 s con barra espaciadora). Con filas por frecuencia + palabras queda en ~49-54 s reales; con el completado del LLM, ~36-43 s. El completado tiene que estar desde el principio.
4. **`Frase` dice directo**: elegirla llama `onTerminar(frase)` sin pasar por `Decir`.
5. **Iniciales + LLM (SpeakFaster) seria mas rapido** (~30 s para "tengo frio", la mitad de parpadeos), pero: necesita otro prompt (hoy `completarFrase` toma lo deletreado como comienzo literal), SpeakFaster lo logro con un modelo de 64B ajustado con 1,8 M ejemplos, y si falla el usuario necesita un plan B. No es para 2 horas; queda como idea para despues.
6. **Congelar con ojos cerrados y elegir al abrir**, igual que el nucleo: deletrear tiene que escuchar `ojos` ademas de `parpadeoLargo`, si no el gesto de urgencia de 2 s tambien elige una letra.

## Preguntas abiertas para el grill

1. Filas por frecuencia (mas rapido, hay que aprenderlas) o grupos alfabeticos (los entiende cualquiera a primera vista)? En la demo parpadea alguien del equipo.
2. `Frase` y `Palabras` como dos elementos separados (`Frase` dice con un parpadeo) o una sola fila `Sugerencias` (1 paso menos por letra, 1 parpadeo mas para la frase)? Dan casi lo mismo.
3. Elegir `Frase` la dice directo, o la pone en el texto para poder seguir editandola?
4. La enie: fila 5 (casi nunca se usa, 0,17%) o sacarla y que la lista resuelva "ano" -> "anio" (con enie)? El riesgo de la segunda es obvio.
5. Mientras se deletrea, quien detecta el gesto de urgencia: el nucleo (que tiene su barrido en pausa) o deletrear? Hay que confirmarlo con nucleo-interfaz.
6. La velocidad del barrido de deletrear es la misma que la del nucleo (1,2 s, ajustable en vivo) o propia?
7. Al salir, el borrador se guarda o se descarta? Y si llega un turno nuevo del interlocutor mientras se deletrea: se actualiza el `PedidoOpciones` que va a `completarFrase`?
8. Vale la pena probar iniciales + LLM despues de la demo (cambio de prompt en el path llm)?
9. Lista: alcanza `es_50k` recortada + voseo a mano, o conviene generar la lista con el LLM una vez (sin licencia de por medio)?

## Decisiones del grill (cierran la Fase 0)

Las decisiones finales estan en el issue #6 (comentario "Fase 0 cerrada"). Cambios respecto de la propuesta de arriba:

- Deletrear es darle pistas a la IA: **4 frases** (no una) y lo escrito puede ser el comienzo o la palabra clave, por eso no se usa `completarFrase` sino una ruta propia `/api/deletrear`.
- Las palabras tambien se piden al LLM, en paralelo a las frases, para que usen el contexto ("el lunes tengo fr" -> franco). El diccionario queda para respuesta instantanea y sin internet.
- Orden del barrido: `Frases` / `Palabras` / `Acciones` (una fila con Decir, Borrar letra, Borrar palabra, Salir) / filas de letras. Las acciones en una fila cuestan 1 paso por letra y no quedan detras del teclado.

## Transformer local en el navegador (spike, descartado para hoy)

Idea: que un modelo chico local re-rankee los candidatos del diccionario usando el contexto (privado, sin red).

- Modelos ONNX listos para transformers.js con espanol: [onnx-community/Qwen2.5-0.5B-Instruct](https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct) (q4f16 461 MB, el mejor espanol), [onnx-community/gemma-3-270m-it-ONNX](https://huggingface.co/onnx-community/gemma-3-270m-it-ONNX) (q4f16 273 MB, espanol sin verificar), [bnicenboim/gpt2-spanish-onnx](https://huggingface.co/bnicenboim/gpt2-spanish-onnx) (125 MB cuantizado, origen sin verificar). DeepESP/gpt2-spanish y datificate/gpt2-small-spanish no tienen ONNX. SmolLM2 es principalmente ingles.
- Log-probs: `const { logits } = await model(inputs)` ([docs](https://huggingface.co/docs/transformers.js/api/models)). Atajo viable: una pasada sobre el contexto y rankear ~20 candidatos por la log-prob de su primer token.
- Next.js: la [guia oficial](https://huggingface.co/docs/transformers.js/tutorials/next) usa Web Worker y alias de webpack; Next 16 usa Turbopack por defecto y no hay camino verificado. Problemas conocidos con los .wasm ([issue 748](https://github.com/xenova/transformers.js/issues/748)). Version actual `@huggingface/transformers` 4.3.2, que depende de una build dev de onnxruntime-web.
- Veredicto: 1,5 a 2,5 h solo para tenerlo andando, descarga de 125 a 460 MB en el wifi de la demo, latencias sin benchmarks. Queda enchufable detras de `predecirPalabras` para despues (argumento de privacidad para el pitch). No verificado: latencias reales, soporte de Turbopack.
