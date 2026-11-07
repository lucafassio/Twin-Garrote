// Correr: npx tsx --test src/nucleo/lecturaModelo.test.ts
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { armarPedidoLectura, interpretarLectura, leerTurnoConGateway, URL_GATEWAY_DECISION } from './lecturaModelo'

describe('pedido al modelo de decision', () => {
  test('arma el estado con el usuario, la conversacion reciente y lo escuchado', () => {
    const p = armarPedidoLectura({
      modelo: 'baseten/mammoth-1',
      nombreUsuario: 'Roberto',
      texto: 'querés unos mates',
      historial: [
        { quien: 'interlocutor', texto: 'Hola Roberto' },
        { quien: 'usuario', texto: 'Todo bien.' },
      ],
    })
    assert.equal(p.model, 'baseten/mammoth-1')
    assert.match(p.state, /Roberto/)
    assert.match(p.state, /Interlocutor: Hola Roberto/)
    assert.match(p.state, /Roberto: Todo bien\./)
    assert.match(p.state, /querés unos mates/)
    assert.deepEqual(Object.keys(p.questions), ['para_usuario', 'completo', 'tipo'])
    assert.equal(p.questions.para_usuario.type, 'noul')
    assert.equal(p.questions.tipo.type, 'choice')
  })

  test('manda solo las ultimas 4 lineas de la conversacion', () => {
    const historial = Array.from({ length: 10 }, (_, i) => ({ quien: 'interlocutor' as const, texto: `linea ${i}` }))
    const p = armarPedidoLectura({ modelo: 'm', nombreUsuario: 'Roberto', texto: 'x', historial })
    assert.doesNotMatch(p.state, /linea 5/)
    assert.match(p.state, /linea 6/)
    assert.match(p.state, /linea 9/)
  })
})

describe('llamada al Gateway', () => {
  const RESPUESTA_OK = {
    answers: {
      para_usuario: { type: 'noul', noul: 0.9 },
      completo: { type: 'noul', noul: 0.8 },
      tipo: { type: 'choice', choice: 'abierta' },
    },
  }

  test('manda el pedido con la key y devuelve la lectura', async () => {
    let llamada: { url: string; init: RequestInit } | null = null
    const fetchFalso = async (url: string | URL | Request, init?: RequestInit) => {
      llamada = { url: String(url), init: init! }
      return new Response(JSON.stringify(RESPUESTA_OK), { status: 200 })
    }
    const l = await leerTurnoConGateway({
      texto: 'qué querés comer',
      historial: [],
      nombreUsuario: 'Roberto',
      modelo: 'baseten/mammoth-1',
      key: 'clave',
      fetch: fetchFalso,
    })
    assert.deepEqual(l, { paraUsuario: 0.9, completo: 0.8, tipo: 'abierta' })
    assert.ok(llamada)
    const { url, init } = llamada as { url: string; init: RequestInit }
    assert.equal(url, URL_GATEWAY_DECISION)
    assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer clave')
    assert.equal(JSON.parse(String(init.body)).model, 'baseten/mammoth-1')
  })

  test('si el Gateway responde error, tira', async () => {
    const fetchFalso = async () => new Response(JSON.stringify({ error: { message: 'sin creditos' } }), { status: 403 })
    await assert.rejects(
      leerTurnoConGateway({ texto: 'x', historial: [], nombreUsuario: 'R', modelo: 'm', key: 'k', fetch: fetchFalso }),
      /403/,
    )
  })

  test('sin key, tira sin llamar', async () => {
    let llamo = false
    const fetchFalso = async () => {
      llamo = true
      return new Response('{}')
    }
    await assert.rejects(
      leerTurnoConGateway({ texto: 'x', historial: [], nombreUsuario: 'R', modelo: 'm', key: undefined, fetch: fetchFalso }),
    )
    assert.equal(llamo, false)
  })
})

describe('respuesta del modelo de decision', () => {
  test('traduce las respuestas a una lectura del turno', () => {
    const l = interpretarLectura({
      answers: {
        para_usuario: { type: 'noul', noul: 0.96 },
        completo: { type: 'noul', noul: 0.2 },
        tipo: { type: 'choice', choice: 'siNo', probabilities: { siNo: 0.9, otro: 0.1 } },
      },
    })
    assert.deepEqual(l, { paraUsuario: 0.96, completo: 0.2, tipo: 'siNo' })
  })

  test('un tipo desconocido queda como otro', () => {
    const l = interpretarLectura({
      answers: {
        para_usuario: { type: 'noul', noul: 0.5 },
        completo: { type: 'noul', noul: 0.5 },
        tipo: { type: 'choice', choice: 'cualquiera' },
      },
    })
    assert.equal(l.tipo, 'otro')
  })

  test('si falta una respuesta, tira error (el nucleo usa la heuristica local)', () => {
    assert.throws(() => interpretarLectura({ answers: { completo: { type: 'noul', noul: 0.5 } } }))
    assert.throws(() => interpretarLectura({ error: { message: 'Free tier users…' } }))
  })
})
