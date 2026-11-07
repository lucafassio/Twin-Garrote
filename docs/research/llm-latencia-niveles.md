# Latencia de opciones con la memoria por niveles (#41)

Fecha: 2026-11-07. Cierra la spec #18: con todos los niveles, la huella aprendida y la saliencia en el prompt, las opciones tienen que seguir saliendo en menos de 2,5 s.

## Como se midio

- Script: `src/llm/medir-latencias.ts` en modo directo (los mismos modulos que las rutas, sin Next), con el proveedor real.
- Memoria: `src/llm/memoria-cargada.ts`, la de un Roberto con un mes de uso. Tiene:
  - 28 hechos activos con saliencia;
  - 6 resumenes de hoy, 3 enteros (menos de 5 h) y 3 recortados (5 a 12 h);
  - bloques de ayer, de la semana anterior y del mes anterior;
  - huella aprendida aceptada (~930 caracteres);
  - 10 frases de estilo.
  El test `memoria-cargada.test.ts` verifica que todo eso entra al prompt; si no, la medicion mediria un prompt mas chico.
- Los 10 turnos de prueba de `/prueba/llm`, uno por uno, con el historial vacio. Antes, un pedido de calentamiento que no cuenta.
- Los 10 turnos caen en la misma conversacion (menos de 3 min entre uno y otro): ningun cierre ni rollup corre en segundo plano mientras se miden. El agente de memoria corre recien con el cierre forzado del final.
- Para comparar, la misma corrida con `--vacia`: huella de Roberto sin nada mas.
- 5 corridas con memoria cargada y 4 vacias por el Gateway, intercaladas en el mismo rato. 2 corridas con Anthropic directo, con memoria cargada.

```
node --env-file=.env.local src/llm/medir-latencias.ts            # Gateway, memoria cargada
node --env-file=.env.local src/llm/medir-latencias.ts --vacia    # Gateway, memoria vacia
LLM_PROVEEDOR=anthropic node --env-file=.env.local src/llm/medir-latencias.ts
```

## Resultados

### Opciones por el Gateway (`anthropic/claude-haiku-5.5`), el proveedor por defecto

Los turnos 9 y 10 son con cercania formal: ahi no entran los bloques ni la huella aprendida, porque los tres bloques y la huella citan hechos intimos (es lo que pide #18). Por eso se separan: la memoria completa en el prompt solo esta en los turnos 1 a 8.

| Memoria | Turnos | Muestras | Promedio | Mediana | p90 | Max | > 2,5 s |
|---|---|---|---|---|---|---|---|
| Cargada | 1 a 8 (todo en el prompt) | 40 | 1938 ms | 1874 ms | 2092 ms | 2934 ms | 2/40 |
| Cargada | 9 y 10 (formal, sin bloques ni huella) | 10 | 1751 ms | 1722 ms | 1867 ms | 2023 ms | 0/10 |
| Vacia | 1 a 8 | 32 | 1802 ms | 1798 ms | 1959 ms | 2089 ms | 0/32 |
| Vacia | 9 y 10 | 8 | 1827 ms | 1837 ms | 1919 ms | 1939 ms | 0/8 |

### Opciones por Anthropic directo (`claude-haiku-5-5`), memoria cargada

| Corrida | Promedio | Mediana | Max | > 2,5 s |
|---|---|---|---|---|
| 1 (en paralelo con otra corrida) | 1884 ms | 1755 ms | 3116 ms | 1/10 |
| 2 (sola) | 1744 ms | 1709 ms | 2033 ms | 0/10 |

### Tamano del prompt de opciones (sistema mas usuario)

Contado con `count_tokens` de Anthropic:

| Memoria | Cercania familia | Cercania formal |
|---|---|---|
| Cargada | 3605 tokens | 2523 tokens |
| Vacia | 1814 tokens | 1830 tokens |

Con cercania formal entran menos tokens porque quedan afuera los hechos intimos, los bloques y la huella aprendida que los citan.

`estimarTokens` (largo / 2,3) da entre 1% y 3% menos que `count_tokens`. La primera version usaba largo / 3,5 y daba ~35% menos: el espanol con tildes y markdown rinde menos caracteres por token que el ingles.

### Otros

- Completado ("quiero mil"): 1,1 a 1,3 s. Una medicion por corrida, orientativo.
- Agente de memoria con el cierre forzado: 2,3 a 2,6 s. Corre en segundo plano, nunca dentro del turno.

## Conclusiones

- **Como se lee el limite de 2,5 s:** como el p90 de los turnos, no como el maximo de cada uno. La red agrega colas que el prompt no controla, y recortar el prompt no las saca.
- **Las opciones siguen por debajo de 2,5 s:** con todo en el prompt, mediana de 1,87 s y p90 de 2,09 s. No se recortaron bloques.
- **La memoria cargada suma poco:** ~75 ms de mediana y ~130 ms de p90 contra la memoria vacia, con el doble de tokens de entrada.
- **Los 2 turnos de mas de 2,5 s parecen ruido de red, pero no esta probado:**
  - fueron el 7 y el 8, que en las otras cuatro corridas dieron ~1,9 s;
  - los bloques y la huella suman ~1.800 tokens de entrada, y eso explica el ~75 ms de diferencia en la mediana, no un turno de +1 s;
  - la unica corrida de Anthropic con un turno de 3,1 s corria en paralelo con otra.
  Con la memoria vacia no hubo ninguno en 40 turnos, y 2 en 40 no alcanza para separar las dos cosas. Si en la demo aparecen seguidos, primero se recorta el bloque del mes, que es el mas largo, y se vuelve a medir.
- **El prompt de opciones queda cerca del umbral del modelo de decision.** Con un mes de memoria y cercania familia, el prompt tiene ~3.600 tokens, y el umbral para sumar el modelo de decision es ~4.000. Hechos activos: 28 de ~60. Lo mas probable es que el limite que se alcance primero sea el de tokens, no el de hechos. La condicion esta anotada en `docs/adr/0001-memoria-por-usuario.md`.
- Las comparaciones de #16 (memoria vacia, ~1,55 s de mediana en proceso) dieron ~250 ms menos que las de hoy con la misma memoria vacia (1,81 s). Desde entonces el prompt de sistema crecio (ids de hechos por opcion, interlocutor probable) y la red cambia de un rato a otro: por eso las corridas cargadas y vacias de hoy se intercalaron, para comparar solo la memoria.
