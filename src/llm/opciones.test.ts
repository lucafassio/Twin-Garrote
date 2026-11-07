// Correr: node --test 'src/llm/*.test.ts'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { PedidoOpciones } from '@/eventos'
import { crearOpciones, ErrorOpciones } from './opciones.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import { crearProveedorFalso } from './proveedor-falso.ts'
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
function guionado(respuestas: string[]) {
  const prompts: { sistema: string; usuario: string }[] = []
  const proveedor: Proveedor = {
    nombre: 'guionado',
    async generar(p) {
      prompts.push(p)
      const r = respuestas.shift()
      if (r === undefined) throw new Error('el guion se quedo sin respuestas')
      return r
    },
  }
  return { proveedor, prompts }
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
  const { proveedor, prompts } = guionado(respuestas)
  const almacen = crearAlmacenEnMemoria({ memoria })
  const cerradas: ConversacionCerrada[] = []
  const generar = crearOpciones({ proveedor, almacen, alCerrarConversacion: (c) => cerradas.push(c) })
  return { generar, prompts, almacen, cerradas }
}

const vaciarPromesas = () => new Promise((r) => setImmediate(r))

describe('opciones', () => {
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

describe('proveedor falso', () => {
  test('devuelve 4 opciones al instante, con y sin turno', async () => {
    const generar = crearOpciones({ proveedor: crearProveedorFalso(), almacen: crearAlmacenEnMemoria() })
    assert.equal((await generar(pedido(), T0)).opciones.length, 4)
    const arranques = await generar(pedido({ ultimoTurno: null }), T0)
    assert.equal(arranques.opciones.length, 4)
    assert.match(arranques.opciones[0].texto, /River/)
  })
})
