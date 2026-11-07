// Correr: node --test 'src/llm/*.test.ts'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { PedidoOpciones } from '@/eventos'
import { crearCierre, crearOpciones, ErrorOpciones } from './opciones.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import { crearProveedorFalso } from './proveedor-falso.ts'
import { crearAgenteMemoria } from './memoria.ts'
import type { ConversacionCerrada, Hecho, Memoria, Proveedor } from './tipos.ts'

const MIN = 60_000
const T0 = new Date('2026-11-07T15:00:00Z')
const despues = (ms: number) => new Date(T0.getTime() + ms)

const CUATRO = [
  { intencion: 'preguntar', texto: '¿De que es el asado?' },
  { intencion: 'aceptar', texto: 'Si, dale, me encanta.' },
  { intencion: 'rechazar', texto: 'No, hoy paso.' },
  { intencion: 'otra', texto: 'Mira, mejor el domingo.' },
]
const respuesta = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ opciones: CUATRO, registro: 'casual', nuevaConversacion: false, ...extra })

// Proveedor guionado: devuelve las respuestas en orden y guarda los prompts que recibio.
// trabarProximo: el proximo pedido espera hasta soltar(), para meter un cierre mientras el modelo piensa.
function guionado(respuestas: string[]) {
  const prompts: { sistema: string; usuario: string }[] = []
  let trabado: Promise<void> | null = null
  let soltar = () => {}
  const proveedor: Proveedor = {
    nombre: 'guionado',
    async generar(p) {
      prompts.push(p)
      if (trabado) {
        const espera = trabado
        trabado = null
        await espera
      }
      const r = respuestas.shift()
      if (r === undefined) throw new Error('el guion se quedo sin respuestas')
      return r
    },
  }
  const trabarProximo = () => {
    trabado = new Promise((r) => (soltar = r))
  }
  return { proveedor, prompts, trabarProximo, soltar: () => soltar() }
}

const pedido = (p: Partial<PedidoOpciones> = {}): PedidoOpciones => ({
  historial: [],
  ultimoTurno: '¿Queres asado el domingo?',
  yaMostradas: [],
  ...p,
})

const hecho = (h: Partial<Hecho> & { texto: string }): Hecho => ({
  id: h.texto,
  origen: 'interlocutor',
  interlocutor: null,
  importancia: 5,
  fecha: T0.toISOString(),
  estado: 'activo',
  fechaInvalidacion: null,
  intimo: false,
  ...h,
})

function armar(respuestas: string[], memoria?: Partial<Memoria>) {
  const { proveedor, prompts, trabarProximo, soltar } = guionado(respuestas)
  const almacen = crearAlmacenEnMemoria({ memoria })
  const cerradas: ConversacionCerrada[] = []
  const alCerrarConversacion = (c: ConversacionCerrada) => cerradas.push(c)
  const generar = crearOpciones({ proveedor, almacen, alCerrarConversacion })
  const cierre = crearCierre({ almacen, alCerrarConversacion })
  return { generar, cierre, prompts, almacen, cerradas, trabarProximo, soltar }
}

const vaciarPromesas = () => new Promise((r) => setImmediate(r))

describe('opciones', () => {
  for (const tipoTurno of [undefined, 'abierta', 'comentario', 'saludo', 'pedido', 'otro'] as const) {
    test(`con tipoTurno ${tipoTurno} conserva la regla de si y no`, async () => {
      const { generar, prompts } = armar([respuesta()])
      await generar(pedido({ tipoTurno }), T0)
      const prompt = prompts[0].sistema + '\n' + prompts[0].usuario
      assert.match(prompt, /una opcion.*si.*otra.*no/i)
      assert.doesNotMatch(prompt, /ninguna opcion.*sueltos/i)
    })
  }

  test('siNo pide matices y excluye si y no sueltos del prompt', async () => {
    const { generar, prompts } = armar([respuesta()])
    await generar({ ...pedido(), tipoTurno: 'siNo' }, T0)
    const prompt = prompts[0].sistema + '\n' + prompts[0].usuario
    assert.match(prompt, /ninguna opcion.*si.*no.*sueltos/i)
    assert.match(prompt, /matices|condiciones/i)
    assert.doesNotMatch(prompt, /una opcion es un si y otra es un no/i)
  })

  test('devuelve exactamente 4 opciones, en el orden que devolvio el modelo', async () => {
    const { generar } = armar([respuesta()])
    const r = await generar(pedido(), T0)
    assert.deepEqual(r.opciones, CUATRO)
    assert.equal(r.registro, 'casual')
  })

  test('si el modelo devuelve mas de 4, se queda con las 4 primeras', async () => {
    const cinco = [...CUATRO, { intencion: 'otra', texto: 'Sobra.' }]
    const { generar } = armar([JSON.stringify({ opciones: cinco, registro: 'formal' })])
    const r = await generar(pedido(), T0)
    assert.deepEqual(r.opciones, CUATRO)
    assert.equal(r.registro, 'formal')
  })

  test('con JSON roto reintenta una vez y sale bien', async () => {
    const { generar, prompts } = armar(['esto no es json', respuesta()])
    const r = await generar(pedido(), T0)
    assert.equal(prompts.length, 2)
    assert.equal(r.opciones.length, 4)
  })

  test('con JSON roto dos veces da error, sin un tercer intento', async () => {
    const { generar, prompts } = armar(['{roto', JSON.stringify({ opciones: CUATRO.slice(0, 3) }), respuesta()])
    await assert.rejects(generar(pedido(), T0), ErrorOpciones)
    assert.equal(prompts.length, 2)
  })

  test('las yaMostradas llegan al prompt', async () => {
    const { generar, prompts } = armar([respuesta()])
    await generar(pedido({ yaMostradas: ['Si, dale.', 'Dejame pensarlo.'] }), T0)
    assert.match(prompts[0].usuario, /Si, dale\./)
    assert.match(prompts[0].usuario, /Dejame pensarlo\./)
    assert.match(prompts[0].usuario, /cambien de intencion, largo o registro/i)
    assert.match(prompts[0].usuario, /no parafrasees ni repitas su idea/i)
    assert.match(prompts[0].usuario, /4 intenciones distintas/i)
    assert.match(prompts[0].usuario, /no.*aprendizaje/i)
  })

  test('dos Otra conservan todos los rechazos sin aprenderlos como voz ni hechos', async () => {
    const rejected = ['Prefiero hablar del partido.', 'Mejor cambiemos de tema.', 'Contame algo nuevo.', 'Hoy quiero escuchar.']
    const { generar, prompts, almacen, cerradas } = armar([
      respuesta(), respuesta({ opciones: CUATRO.map((o, i) => ({ ...o, texto: rejected[i] })) }), respuesta(), respuesta(),
    ], {
      ejemplosEstilo: [{ texto: 'Vamos todavia.', origen: 'deletreo', fecha: T0.toISOString() }],
      hechos: [hecho({ texto: 'Le gusta el tango', importancia: 7 })],
    })
    const profile = await almacen.leerPerfil()
    const before = await almacen.leerMemoria()
    const first = await generar(pedido(), T0)
    const firstRejected = first.opciones.map((o) => o.texto)
    const second = await generar(pedido({ yaMostradas: firstRejected }), despues(MIN))
    const allRejected = [...firstRejected, ...second.opciones.map((o) => o.texto)]
    await generar(pedido({ yaMostradas: allRejected }), despues(2 * MIN))

    for (const text of allRejected) {
      assert.ok(prompts[2].usuario.includes(`- ${text}`))
      assert.ok(!prompts[2].usuario.split('# Opciones rechazadas')[0].includes(text))
    }
    assert.match(prompts[2].sistema, /4 opciones tienen intenciones distintas/i)
    assert.match(prompts[2].usuario, /no parafrasees ni repitas su idea/i)
    assert.deepEqual((await almacen.leerMemoria()).ejemplosEstilo, before.ejemplosEstilo)
    assert.deepEqual((await almacen.leerMemoria()).hechos, before.hechos)
    assert.deepEqual(await almacen.leerPerfil(), profile)

    const history = [
      { quien: 'interlocutor' as const, texto: pedido().ultimoTurno! },
      { quien: 'usuario' as const, texto: 'Hablemos de musica.', origen: 'deletreo' as const },
    ]
    await generar(pedido({ historial: history }), despues(20 * MIN))
    await vaciarPromesas()
    assert.deepEqual(cerradas[0].lineas, history)
    const memoryProvider = guionado([JSON.stringify({ hechos: [], resumen: 'Hablaron de musica.' })])
    const learn = crearAgenteMemoria({ proveedor: memoryProvider.proveedor })
    const learned = await learn(cerradas[0], await almacen.leerMemoria(), profile)
    assert.ok(learned.ejemplosEstilo.some((e) => e.texto === 'Hablemos de musica.'))
    for (const text of allRejected) {
      assert.ok(!JSON.stringify({ hechos: learned.hechos, ejemplos: learned.ejemplosEstilo, resumenes: learned.resumenes }).includes(text))
      assert.ok(!memoryProvider.prompts[0].usuario.includes(text))
    }
    assert.deepEqual(learned.hechos, before.hechos)
  })

  test('el perfil de Roberto y el turno llegan al prompt', async () => {
    const { generar, prompts } = armar([respuesta()])
    await generar(pedido(), T0)
    assert.match(prompts[0].usuario, /River/)
    assert.match(prompts[0].usuario, /¿Queres asado el domingo\?/)
  })

  test('con cercania formal, ningun hecho intimo en el prompt', async () => {
    const memoria = {
      hechos: [
        hecho({ texto: 'Laura se opera el jueves', intimo: true, importancia: 9 }),
        hecho({ texto: 'Fue profesor de historia', intimo: false }),
      ],
    }
    const formal = armar([respuesta()], memoria)
    await formal.generar(pedido({ cercania: 'formal' }), T0)
    assert.doesNotMatch(formal.prompts[0].usuario, /Laura se opera/)
    assert.match(formal.prompts[0].usuario, /profesor de historia/)

    const familia = armar([respuesta()], memoria)
    await familia.generar(pedido({ cercania: 'familia' }), T0)
    assert.match(familia.prompts[0].usuario, /Laura se opera/)
  })

  test('el interlocutor aclarado llega al prompt; sin aclarar, se pide no nombrarlo', async () => {
    const con = armar([respuesta()])
    await con.generar(pedido({ interlocutor: 'Marta' }), T0)
    assert.match(con.prompts[0].usuario, /# Interlocutor\nMarta/)
    const sin = armar([respuesta()])
    await sin.generar(pedido(), T0)
    assert.match(sin.prompts[0].usuario, /# Interlocutor\nno aclarado/)
  })

  test('los hechos invalidados no entran al prompt', async () => {
    const { generar, prompts } = armar([respuesta()], {
      hechos: [hecho({ texto: 'Laura vive en Cordoba', estado: 'invalidado', fechaInvalidacion: T0.toISOString() })],
    })
    await generar(pedido(), T0)
    assert.doesNotMatch(prompts[0].usuario, /Cordoba/)
  })

  test('los resumenes de mas de ~12 h quedan fuera del prompt', async () => {
    const { generar, prompts } = armar([respuesta()], {
      resumenes: [
        { inicio: despues(-14 * 60 * MIN).toISOString(), fin: despues(-13 * 60 * MIN).toISOString(), resumen: 'Hablaron del medico de ayer.' },
        { inicio: despues(-3 * 60 * MIN).toISOString(), fin: despues(-2 * 60 * MIN).toISOString(), resumen: 'Marta conto lo del almuerzo.' },
      ],
    })
    await generar(pedido(), T0)
    assert.doesNotMatch(prompts[0].usuario, /medico de ayer/)
    assert.match(prompts[0].usuario, /almuerzo/)
  })

  test('los resumenes de menos de 5 h entran completos y los de 5 a 12 h solo con su primera linea', async () => {
    const { generar, prompts } = armar([respuesta()], {
      resumenes: [
        { inicio: despues(-9 * 60 * MIN).toISOString(), fin: despues(-8 * 60 * MIN).toISOString(), resumen: 'Hablaron con el kinesiologo.\nLe cambio los ejercicios.\nVuelve el martes.' },
        { inicio: despues(-4 * 60 * MIN).toISOString(), fin: despues(-3 * 60 * MIN).toISOString(), resumen: 'Marta conto lo del almuerzo.\nVa a llevar flan.\nViene con los chicos.' },
      ],
    })
    await generar(pedido(), T0)
    assert.match(prompts[0].usuario, /kinesiologo/)
    assert.doesNotMatch(prompts[0].usuario, /ejercicios|martes/)
    assert.match(prompts[0].usuario, /almuerzo/)
    assert.match(prompts[0].usuario, /flan/)
    assert.match(prompts[0].usuario, /los chicos/)
  })

  test('un resumen de justo 5 h ya entra recortado', async () => {
    const { generar, prompts } = armar([respuesta()], {
      resumenes: [
        { inicio: despues(-6 * 60 * MIN).toISOString(), fin: despues(-5 * 60 * MIN).toISOString(), resumen: 'Vino el medico.\nLe ajusto la dosis.' },
      ],
    })
    await generar(pedido(), T0)
    assert.match(prompts[0].usuario, /Vino el medico/)
    assert.doesNotMatch(prompts[0].usuario, /dosis/)
  })

  test('un resumen viejo escrito en un solo renglon se recorta a su primera oracion', async () => {
    const { generar, prompts } = armar([respuesta()], {
      resumenes: [
        { inicio: despues(-9 * 60 * MIN).toISOString(), fin: despues(-8 * 60 * MIN).toISOString(), resumen: 'Hablaron con el kinesiologo. Le cambio los ejercicios.' },
      ],
    })
    await generar(pedido(), T0)
    assert.match(prompts[0].usuario, /- Hablaron con el kinesiologo\.\n/)
    assert.doesNotMatch(prompts[0].usuario, /ejercicios/)
  })

  test('los resumenes descartados quedan fuera del prompt', async () => {
    const { generar, prompts } = armar([respuesta()], {
      resumenes: [
        { inicio: despues(-60 * MIN).toISOString(), fin: despues(-50 * MIN).toISOString(), resumen: 'Laura se opera el jueves.', descartado: despues(-10 * MIN).toISOString() },
      ],
    })
    await generar(pedido(), T0)
    assert.doesNotMatch(prompts[0].usuario, /se opera/)
  })

  test('las frases deletreadas aparecen antes que las elegidas como ejemplos de estilo', async () => {
    const { generar, prompts } = armar([respuesta()], {
      ejemplosEstilo: [
        { texto: 'Frase elegida', origen: 'opcion', fecha: T0.toISOString() },
        { texto: 'Frase deletreada', origen: 'deletreo', fecha: despues(-60 * MIN).toISOString() },
      ],
    })
    await generar(pedido(), T0)
    const u = prompts[0].usuario
    assert.ok(u.indexOf('Frase deletreada') < u.indexOf('Frase elegida'))
  })
})

describe('deteccion de conversacion', () => {
  const historial = [
    { quien: 'interlocutor' as const, texto: '¿Como dormiste?' },
    { quien: 'usuario' as const, texto: 'Bien, che.' },
  ]

  test('el primer pedido arranca una conversacion nueva', async () => {
    const { generar } = armar([respuesta()])
    assert.equal((await generar(pedido(), T0)).nuevaConversacion, true)
  })

  test('menos de 3 min es la misma, aunque el modelo diga que es nueva', async () => {
    const { generar, prompts, cerradas } = armar([respuesta(), respuesta({ nuevaConversacion: true })])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?' }), T0)
    const r = await generar(pedido({ historial }), despues(2 * MIN))
    assert.equal(r.nuevaConversacion, false)
    assert.doesNotMatch(prompts[1].usuario, /minutos/)
    assert.match(prompts[1].usuario, /Bien, che\./) // la conversacion actual va literal
    await vaciarPromesas()
    assert.equal(cerradas.length, 0)
  })

  test('mas de 15 min es nueva, aunque el modelo diga que no, y cierra la anterior', async () => {
    const { generar, cerradas } = armar([respuesta(), respuesta({ nuevaConversacion: false })])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?' }), T0)
    const r = await generar(pedido({ historial }), despues(16 * MIN))
    assert.equal(r.nuevaConversacion, true)
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
    assert.deepEqual(cerradas[0].lineas, historial)
  })

  for (const nueva of [true, false]) {
    test(`entre 3 y 15 min decide el flag del modelo (${nueva})`, async () => {
      const { generar, prompts, cerradas } = armar([respuesta(), respuesta({ nuevaConversacion: nueva })])
      await generar(pedido({ ultimoTurno: '¿Como dormiste?' }), T0)
      const r = await generar(pedido({ historial }), despues(8 * MIN))
      assert.equal(r.nuevaConversacion, nueva)
      assert.match(prompts[1].usuario, /8 minutos/)
      await vaciarPromesas()
      assert.equal(cerradas.length, nueva ? 1 : 0)
    })
  }

  test('despues de una conversacion nueva, la anterior ya no entra como conversacion actual', async () => {
    const { generar, prompts } = armar([respuesta(), respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?' }), T0)
    await generar(pedido({ historial }), despues(20 * MIN))
    const masHistorial = [...historial, { quien: 'interlocutor' as const, texto: '¿Vemos a River?' }, { quien: 'usuario' as const, texto: 'Obvio.' }]
    await generar(pedido({ historial: masHistorial }), despues(21 * MIN))
    assert.doesNotMatch(prompts[2].usuario, /Bien, che\./)
    assert.match(prompts[2].usuario, /Obvio\./)
  })
})

describe('conversacion actual con su contexto y sus lineas', () => {
  const historial = [
    { quien: 'interlocutor' as const, texto: '¿Como dormiste?' },
    { quien: 'usuario' as const, texto: 'Bien, che.' },
  ]
  // El turno por defecto de pedido(): si nadie lo responde, queda pendiente y entra al cerrar.
  const asado = { quien: 'interlocutor' as const, texto: '¿Queres asado el domingo?' }

  test('la cerrada usa la cercania y el interlocutor con que se abrio, no los del pedido siguiente', async () => {
    const { generar, cerradas } = armar([respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?', cercania: 'familia', interlocutor: 'Marta' }), T0)
    await generar(pedido({ historial, cercania: 'formal', interlocutor: 'el medico' }), despues(20 * MIN))
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
    assert.equal(cerradas[0].cercania, 'familia')
    assert.equal(cerradas[0].interlocutor, 'Marta')
  })

  test('una cercania y un interlocutor aclarados a mitad de la conversacion reemplazan a los anteriores', async () => {
    const { generar, cerradas } = armar([respuesta(), respuesta(), respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?', cercania: 'conocido' }), T0)
    await generar(pedido({ historial: historial.slice(0, 1), cercania: 'familia', interlocutor: 'Laura' }), despues(1 * MIN))
    await generar(pedido({ historial }), despues(2 * MIN)) // sin aclarar: no borra lo aclarado
    await generar(pedido({ historial, cercania: 'formal', interlocutor: 'el medico' }), despues(20 * MIN))
    await vaciarPromesas()
    assert.equal(cerradas[0].cercania, 'familia')
    assert.equal(cerradas[0].interlocutor, 'Laura')
  })

  test('las lineas se guardan en el servidor con cada pedido, sin duplicarse', async () => {
    const { generar, almacen } = armar([respuesta(), respuesta(), respuesta(), respuesta()])
    const previa = [{ quien: 'usuario' as const, texto: 'De otra charla.' }]
    await generar(pedido({ historial: previa, ultimoTurno: '¿Como dormiste?' }), T0)
    await generar(pedido({ historial: [...previa, ...historial] }), despues(1 * MIN))
    await generar(pedido({ historial: [...previa, ...historial] }), despues(2 * MIN)) // el mismo historial otra vez
    assert.deepEqual(almacen.memoria().conversacion?.lineas, historial)
    // Una linea igual a una anterior, dicha de nuevo, si es nueva.
    const conRepetida = [...previa, ...historial, { quien: 'interlocutor' as const, texto: '¿Como dormiste?' }]
    await generar(pedido({ historial: conRepetida }), despues(2.5 * MIN))
    assert.deepEqual(almacen.memoria().conversacion?.lineas, conRepetida.slice(1))
  })

  test('con el historial vacio despues de una recarga, el cierre dispara al agente con las lineas guardadas', async () => {
    const { generar, cerradas } = armar([respuesta(), respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?', cercania: 'familia' }), T0)
    await generar(pedido({ historial }), despues(1 * MIN))
    await generar(pedido({ historial: [] }), despues(20 * MIN)) // recargo la pagina
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
    assert.deepEqual(cerradas[0].lineas, [...historial, asado])
    assert.equal(cerradas[0].cercania, 'familia')
  })

  test('lo que se habla despues de una recarga se suma a lo guardado, sin perder lineas', async () => {
    const { generar, almacen } = armar([respuesta(), respuesta(), respuesta(), respuesta(), respuesta()])
    const previa = [
      { quien: 'interlocutor' as const, texto: 'Hola.' },
      { quien: 'usuario' as const, texto: 'Hola, ¿todo bien?' },
    ]
    await generar(pedido({ historial: previa, ultimoTurno: '¿Como dormiste?' }), T0) // empieza en la linea 2
    await generar(pedido({ historial: [...previa, ...historial] }), despues(1 * MIN))
    await generar(pedido({ historial: [], ultimoTurno: '¿Vemos a River?' }), despues(2 * MIN)) // recarga
    const despuesDeRecargar = [
      { quien: 'interlocutor' as const, texto: '¿Vemos a River?' },
      { quien: 'usuario' as const, texto: 'Obvio.' },
    ]
    await generar(pedido({ historial: despuesDeRecargar.slice(0, 1) }), despues(3 * MIN))
    await generar(pedido({ historial: despuesDeRecargar }), despues(4 * MIN))
    assert.deepEqual(almacen.memoria().conversacion?.lineas, [...historial, ...despuesDeRecargar])
  })

  test('dentro de los 3 minutos, un pedido con el historial vacio usa las lineas guardadas como contexto', async () => {
    const { generar, prompts, cerradas } = armar([respuesta(), respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?' }), T0)
    await generar(pedido({ historial }), despues(1 * MIN))
    const r = await generar(pedido({ historial: [], ultimoTurno: '¿Vemos a River?' }), despues(2 * MIN)) // recargo
    assert.equal(r.nuevaConversacion, false)
    assert.match(prompts[2].usuario, /# Conversacion actual\n- Interlocutor: ¿Como dormiste\?\n- Usuario: Bien, che\./)
    await vaciarPromesas()
    assert.equal(cerradas.length, 0)
  })

  test('una memoria vieja, sin cercania, interlocutor ni lineas en la conversacion, se sigue leyendo', async () => {
    const vieja = { inicio: T0.toISOString(), ultimaActividad: T0.toISOString(), desdeLinea: 0 }
    const { generar, prompts, cerradas, almacen } = armar([respuesta(), respuesta()], { conversacion: vieja })
    await generar(pedido({ historial: historial.slice(0, 1) }), despues(1 * MIN))
    assert.match(prompts[0].usuario, /¿Como dormiste\?/)
    await generar(pedido({ historial, cercania: 'formal' }), despues(20 * MIN))
    await vaciarPromesas()
    assert.deepEqual(cerradas[0].lineas, [...historial, asado])
    assert.equal(cerradas[0].cercania, null)
    assert.equal(cerradas[0].interlocutor, null)
    assert.equal(almacen.memoria().conversacion?.cercania, 'formal')
  })
})

describe('cierre de la conversacion', () => {
  const historial = [
    { quien: 'interlocutor' as const, texto: '¿Como dormiste?' },
    { quien: 'usuario' as const, texto: 'Bien, che.' },
  ]
  const respuestaFinal = { quien: 'usuario' as const, texto: 'Me voy a dormir.', origen: 'opcion' as const }
  // pedido() pregunta por el asado: el historial que manda el cliente despues trae el turno y la respuesta.
  const asado = { quien: 'interlocutor' as const, texto: '¿Queres asado el domingo?' }
  const conRespuesta = [...historial, asado, respuestaFinal]

  test('cerrar dispara al agente con las lineas guardadas y las del historial, y deja la conversacion vacia', async () => {
    const { generar, cierre, cerradas, almacen } = armar([respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?', cercania: 'familia', interlocutor: 'Marta' }), T0)
    await generar(pedido({ historial }), despues(1 * MIN))
    const cerrada = await cierre.cerrar(conRespuesta)
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
    assert.deepEqual(cerradas[0], cerrada)
    assert.deepEqual(cerradas[0].lineas, conRespuesta)
    assert.equal(cerradas[0].cercania, 'familia')
    assert.equal(cerradas[0].interlocutor, 'Marta')
    assert.equal(almacen.memoria().conversacion, null)
    // Llamada de nuevo, no hace nada.
    assert.equal(await cierre.cerrar(conRespuesta), null)
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
  })

  test('una memoria vieja sin lineas ni contexto guardados cierra con el historial desde donde empezo', async () => {
    const vieja = { inicio: T0.toISOString(), ultimaActividad: despues(5 * MIN).toISOString(), desdeLinea: 1 }
    const { cierre, cerradas, almacen } = armar([], { conversacion: vieja })
    const previa = { quien: 'usuario' as const, texto: 'De otra charla.' }
    const cerrada = await cierre.cerrar([previa, ...historial])
    assert.deepEqual(cerrada, { inicio: T0.toISOString(), fin: despues(5 * MIN).toISOString(), lineas: historial, cercania: null, interlocutor: null })
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
    assert.equal(almacen.memoria().conversacion, null)
  })

  test('una conversacion sin lineas se deja vacia sin disparar al agente', async () => {
    const { generar, cierre, cerradas, almacen } = armar([respuesta()])
    await generar(pedido({ ultimoTurno: null }), T0) // el usuario quiso arrancar charla y nadie respondio
    assert.equal(await cierre.cerrar([]), null)
    await vaciarPromesas()
    assert.equal(cerradas.length, 0)
    assert.equal(almacen.memoria().conversacion, null)
  })

  test('el cierre por tiempo cierra despues de 15 minutos sin actividad, una sola vez', async () => {
    const { generar, cierre, cerradas, almacen } = armar([respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?' }), T0)
    await generar(pedido({ historial }), despues(1 * MIN))
    assert.equal(await cierre.cerrarSiInactiva(despues(15 * MIN)), null) // 14 min desde la ultima actividad
    await vaciarPromesas()
    assert.equal(cerradas.length, 0)
    assert.notEqual(almacen.memoria().conversacion, null)

    const cerrada = await cierre.cerrarSiInactiva(despues(17 * MIN))
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
    assert.deepEqual(cerrada?.lineas, [...historial, asado]) // el asado quedo sin responder
    assert.equal(almacen.memoria().conversacion, null)

    assert.equal(await cierre.cerrarSiInactiva(despues(18 * MIN)), null)
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
  })

  test('el cierre por tiempo suma la ultima pregunta del interlocutor, que todavia no llego en el historial', async () => {
    const { generar, cierre, cerradas } = armar([respuesta()])
    await generar(pedido({ ultimoTurno: '¿Queres agua?', interlocutor: 'Marta' }), T0)
    await cierre.cerrarSiInactiva(despues(16 * MIN))
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
    assert.deepEqual(cerradas[0].lineas, [{ quien: 'interlocutor', texto: '¿Queres agua?' }])
  })

  test('despues de un cierre por tiempo, el pedido siguiente completa la conversacion con la respuesta que faltaba', async () => {
    const { generar, cierre, cerradas, almacen } = armar([respuesta(), respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Queres agua?', interlocutor: 'Marta' }), T0)
    await cierre.cerrarSiInactiva(despues(16 * MIN))
    const agua = { quien: 'interlocutor' as const, texto: '¿Queres agua?' }
    const si = { quien: 'usuario' as const, texto: 'Si, gracias.', origen: 'opcion' as const }
    // Media hora despues, otra charla: el historial trae la respuesta de la conversacion cerrada.
    const r = await generar(pedido({ historial: [agua, si], ultimoTurno: '¿Vemos el partido?' }), despues(30 * MIN))
    await vaciarPromesas()
    assert.equal(r.nuevaConversacion, true)
    assert.equal(cerradas.length, 2)
    assert.deepEqual(cerradas[1], {
      inicio: T0.toISOString(),
      fin: T0.toISOString(),
      lineas: [agua, si],
      cercania: null,
      interlocutor: 'Marta',
      yaAprendidas: 1,
    })
    // La conversacion nueva no arrastra lineas de la cerrada, y no se completa dos veces.
    assert.deepEqual(almacen.memoria().conversacion?.lineas, [])
    await generar(pedido({ historial: [agua, si, { quien: 'interlocutor', texto: '¿Vemos el partido?' }] }), despues(31 * MIN))
    await vaciarPromesas()
    assert.equal(cerradas.length, 2)
  })

  test('un cierre por tiempo mientras opciones espera al modelo no cierra dos veces ni pierde lineas', async () => {
    const { generar, cierre, cerradas, almacen, trabarProximo, soltar } = armar([respuesta(), respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?' }), T0)
    await generar(pedido({ historial }), despues(1 * MIN))
    // 16 min despues llega un turno con la ultima respuesta del usuario, y el modelo tarda.
    trabarProximo()
    const turno = generar(pedido({ historial: conRespuesta, ultimoTurno: 'Hola' }), despues(17 * MIN))
    await vaciarPromesas()
    await cierre.cerrarSiInactiva(despues(17.5 * MIN)) // el chequeo periodico cae en el medio
    soltar()
    const r = await turno
    await vaciarPromesas()
    assert.equal(r.nuevaConversacion, true)
    assert.equal(cerradas.length, 1)
    assert.deepEqual(cerradas[0].lineas, conRespuesta)
    // La conversacion que queda es la nueva, no la cerrada resucitada.
    assert.equal(almacen.memoria().conversacion?.inicio, despues(17 * MIN).toISOString())
    // Cerrar ahora cierra la nueva (solo su turno pendiente), nunca otra vez las lineas de la anterior.
    assert.deepEqual((await cierre.cerrar([]))?.lineas, [{ quien: 'interlocutor', texto: 'Hola' }])
  })

  test('un cierre explicito mientras un pedido de la misma conversacion espera al modelo no la resucita', async () => {
    const { generar, cierre, cerradas, almacen, trabarProximo, soltar } = armar([respuesta(), respuesta(), respuesta()])
    await generar(pedido({ ultimoTurno: '¿Como dormiste?' }), T0)
    await generar(pedido({ historial }), despues(1 * MIN))
    trabarProximo()
    const turno = generar(pedido({ historial: conRespuesta, ultimoTurno: '¿Y hoy?' }), despues(2 * MIN))
    await vaciarPromesas()
    await cierre.cerrar(conRespuesta) // el nucleo se apaga en el medio
    soltar()
    const r = await turno
    await vaciarPromesas()
    assert.equal(r.opciones.length, 4) // el turno igual sale
    assert.equal(cerradas.length, 1)
    assert.deepEqual(cerradas[0].lineas, conRespuesta)
    assert.equal(almacen.memoria().conversacion?.inicio, despues(2 * MIN).toISOString())
    assert.deepEqual(almacen.memoria().conversacion?.lineas, [])
  })
})

describe('interlocutor probable', () => {
  const probable = (nombre: string, confianza = 'alta') => respuesta({ interlocutorProbable: { nombre, confianza } })
  const hola = [{ quien: 'interlocutor' as const, texto: 'Hola papa, ¿como dormiste?' }]

  test('un nombre de la huella pasa con su confianza', async () => {
    const { generar } = armar([probable('Laura', 'media')])
    const r = await generar(pedido(), T0)
    assert.deepEqual(r.interlocutorProbable, { nombre: 'Laura', confianza: 'media' })
  })

  test('un nombre de la huella pasa aunque venga con otras mayusculas o tildes', async () => {
    const { generar } = armar([probable('  marta ')])
    const r = await generar(pedido(), T0)
    assert.equal(r.interlocutorProbable.nombre, 'Marta')
  })

  test('una persona que solo esta en los hechos activos tambien es de la huella', async () => {
    const memoria = { hechos: [hecho({ texto: 'Sergio, el kinesiologo, viene los martes' })] }
    const { generar } = armar([probable('Sergio')], memoria)
    const r = await generar(pedido(), T0)
    assert.equal(r.interlocutorProbable.nombre, 'Sergio')
  })

  test('una persona de la huella aprendida aceptada cuenta; de la propuesta pendiente, no', async () => {
    const aceptada = { texto: 'Los martes lo visita Sergio, el kinesiologo.', fuentes: [], fechaAceptacion: T0.toISOString() }
    const conAceptada = armar([probable('Sergio')], { huellaAprendida: { aceptada } })
    assert.equal((await conAceptada.generar(pedido(), T0)).interlocutorProbable.nombre, 'Sergio')
    const propuesta = { texto: aceptada.texto, fuentes: [], fecha: T0.toISOString() }
    const conPropuesta = armar([probable('Sergio')], { huellaAprendida: { propuesta } })
    assert.equal((await conPropuesta.generar(pedido(), T0)).interlocutorProbable.nombre, 'desconocido')
  })

  test('una persona de un hecho invalidado ya no cuenta', async () => {
    const memoria = {
      hechos: [hecho({ texto: 'Sergio, el kinesiologo, viene los martes', estado: 'invalidado' as const, fechaInvalidacion: T0.toISOString() })],
    }
    const { generar } = armar([probable('Sergio')], memoria)
    const r = await generar(pedido(), T0)
    assert.equal(r.interlocutorProbable.nombre, 'desconocido')
  })

  test('un nombre que no esta en la huella queda desconocido', async () => {
    const { generar } = armar([probable('Jorge')])
    const r = await generar(pedido(), T0)
    assert.deepEqual(r.interlocutorProbable, { nombre: 'desconocido', confianza: 'baja' })
  })

  test('una palabra suelta dentro de otra no cuenta como nombre de la huella', async () => {
    const { generar } = armar([probable('Mar')])
    const r = await generar(pedido(), T0)
    assert.equal(r.interlocutorProbable.nombre, 'desconocido')
  })

  test('una palabra de la huella que no esta escrita como nombre propio no pasa', async () => {
    const { generar } = armar([probable('tango'), probable('asado')])
    assert.equal((await generar(pedido(), T0)).interlocutorProbable.nombre, 'desconocido')
    assert.equal((await generar(pedido(), despues(1 * MIN))).interlocutorProbable.nombre, 'desconocido')
  })

  test('el primer nombre del usuario tambien queda desconocido', async () => {
    const { proveedor } = guionado([probable('Roberto')])
    const almacen = crearAlmacenEnMemoria({ perfil: { origen: 'familia', markdown: '# Roberto Fernandez\n\n- Esposa: Marta.' } })
    const r = await crearOpciones({ proveedor, almacen })(pedido(), T0)
    assert.equal(r.interlocutorProbable.nombre, 'desconocido')
  })

  test('el nombre del usuario queda desconocido', async () => {
    const { generar } = armar([probable('Roberto')])
    const r = await generar(pedido({ historial: hola }), T0)
    assert.deepEqual(r.interlocutorProbable, { nombre: 'desconocido', confianza: 'baja' })
  })

  test('desconocido del modelo conserva su confianza', async () => {
    const { generar } = armar([probable('desconocido', 'alta')])
    const r = await generar(pedido(), T0)
    assert.deepEqual(r.interlocutorProbable, { nombre: 'desconocido', confianza: 'alta' })
  })

  test('sin el campo, o con una confianza rara, no se cae: desconocido o confianza baja', async () => {
    const { generar } = armar([respuesta(), respuesta({ interlocutorProbable: { nombre: 'Laura', confianza: 'segura' } })])
    assert.deepEqual((await generar(pedido(), T0)).interlocutorProbable, { nombre: 'desconocido', confianza: 'baja' })
    assert.deepEqual((await generar(pedido(), despues(1 * MIN))).interlocutorProbable, { nombre: 'Laura', confianza: 'baja' })
  })

  test('el prompt pide el interlocutor probable sin nombrarlo en las opciones', async () => {
    const { generar, prompts } = armar([probable('Laura')])
    await generar(pedido(), T0)
    assert.match(prompts[0].sistema, /interlocutorProbable/)
    assert.match(prompts[0].usuario, /# Interlocutor\nno aclarado/)
  })

  test('sin confirmar no llega a la conversacion ni a la cerrada, ni al prompt siguiente', async () => {
    const respuestaUsuario = [...hola, { quien: 'usuario' as const, texto: 'Bien, che.' }]
    const { generar, prompts, almacen, cerradas } = armar([probable('Laura'), probable('Laura'), respuesta()])
    await generar(pedido({ ultimoTurno: hola[0].texto }), T0)
    await generar(pedido({ historial: respuestaUsuario, ultimoTurno: '¿Queres algo?' }), despues(1 * MIN))
    assert.equal(almacen.memoria().conversacion?.interlocutor, null)
    assert.match(prompts[1].usuario, /# Interlocutor\nno aclarado/)
    await generar(pedido({ historial: respuestaUsuario }), despues(30 * MIN))
    await vaciarPromesas()
    assert.equal(cerradas.length, 1)
    assert.equal(cerradas[0].interlocutor, null)
  })

  test('confirmado, viaja en interlocutor y llega a la cerrada', async () => {
    const respuestaUsuario = [...hola, { quien: 'usuario' as const, texto: 'Bien, che.' }]
    const { generar, cerradas } = armar([probable('Laura'), probable('Laura'), respuesta()])
    await generar(pedido({ ultimoTurno: hola[0].texto }), T0)
    await generar(pedido({ historial: respuestaUsuario, interlocutor: 'Laura' }), despues(1 * MIN))
    await generar(pedido({ historial: respuestaUsuario }), despues(30 * MIN))
    await vaciarPromesas()
    assert.equal(cerradas[0].interlocutor, 'Laura')
  })
})

describe('proveedor falso', () => {
  test('devuelve 4 opciones al instante, con y sin turno', async () => {
    const generar = crearOpciones({ proveedor: crearProveedorFalso(), almacen: crearAlmacenEnMemoria() })
    assert.equal((await generar(pedido(), T0)).opciones.length, 4)
    const arranques = await generar(pedido({ ultimoTurno: null }), T0)
    assert.equal(arranques.opciones.length, 4)
    assert.match(arranques.opciones[0].texto, /River/)
    assert.deepEqual(arranques.interlocutorProbable, { nombre: 'desconocido', confianza: 'baja' })
  })
})
