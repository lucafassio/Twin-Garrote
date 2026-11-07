// Correr: node --test 'src/llm/*.test.ts'
// El cliente es una capa fina sobre fetch: se reemplaza fetch por uno guionado que respeta el AbortSignal.
import { after, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { PedidoOpciones } from '@/eventos'
import { cerrarConversacion, completarFrase, esPedidoCancelado, pedirOpciones, pedirOpcionesConInterlocutor } from './cliente.ts'

type Llamada = {
  url: string
  cuerpo: unknown
  signal: AbortSignal
  responder: (estado: number, datos: unknown) => void
  fallar: (error: Error) => void
}

let llamadas: Llamada[] = []
const fetchOriginal = globalThis.fetch
after(() => {
  globalThis.fetch = fetchOriginal
})

beforeEach(() => {
  llamadas = []
  globalThis.fetch = ((url: string, init: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const signal = init.signal as AbortSignal
      signal.addEventListener('abort', () => reject(new DOMException('abortado', 'AbortError')))
      llamadas.push({
        url,
        cuerpo: JSON.parse(String(init.body)),
        signal,
        responder: (estado, datos) => resolve(new Response(JSON.stringify(datos), { status: estado })),
        fallar: reject,
      })
    })) as typeof fetch
})

const pedido = (ultimoTurno: string): PedidoOpciones => ({ historial: [], ultimoTurno, yaMostradas: [] })
const opciones = (texto: string) => ({ opciones: [{ intencion: 'otra', texto }] })

describe('pedirOpciones', () => {
  test('entrega las opciones del pedido', async () => {
    const p = pedirOpciones(pedido('¿Como estas?'))
    llamadas[0].responder(200, opciones('Bien'))
    assert.deepEqual(await p, [{ intencion: 'otra', texto: 'Bien' }])
  })

  test('un pedido nuevo cancela el anterior y el anterior se reporta como cancelado', async () => {
    const viejo = pedirOpciones(pedido('¿Tenes hambre?'))
    const nuevo = pedirOpciones(pedido('¿Queres agua?'))
    assert.equal(llamadas[0].signal.aborted, true)
    llamadas[1].responder(200, opciones('Si, agua'))
    await assert.rejects(viejo, (e) => esPedidoCancelado(e))
    assert.deepEqual(await nuevo, [{ intencion: 'otra', texto: 'Si, agua' }])
  })

  test('si la respuesta vieja ya llego al cancelarse, igual no se entrega', async () => {
    const viejo = pedirOpciones(pedido('¿Tenes hambre?'))
    llamadas[0].responder(200, opciones('Vieja'))
    const nuevo = pedirOpciones(pedido('¿Queres agua?'))
    await assert.rejects(viejo, (e) => esPedidoCancelado(e))
    llamadas[1].responder(200, opciones('Nueva'))
    assert.deepEqual(await nuevo, [{ intencion: 'otra', texto: 'Nueva' }])
  })

  test('una falla real no se reporta como cancelada', async () => {
    const p = pedirOpciones(pedido('¿Como estas?'))
    llamadas[0].responder(500, { error: 'se cayo' })
    await assert.rejects(p, (e) => e instanceof Error && !esPedidoCancelado(e) && e.message === 'se cayo')
  })

  test('una falla de red no se reporta como cancelada', async () => {
    const p = pedirOpciones(pedido('¿Como estas?'))
    llamadas[0].fallar(new TypeError('Failed to fetch'))
    await assert.rejects(p, (e) => !esPedidoCancelado(e))
  })
})

describe('pedirOpcionesConInterlocutor', () => {
  const conProbable = (texto: string) => ({
    ...opciones(texto),
    registro: 'intimo',
    nuevaConversacion: false,
    interlocutorProbable: { nombre: 'Laura', confianza: 'alta' },
  })

  test('entrega las opciones con el interlocutor probable y el registro', async () => {
    const p = pedirOpcionesConInterlocutor(pedido('Hola papa'))
    assert.equal(llamadas[0].url, '/api/opciones')
    llamadas[0].responder(200, conProbable('Hola, Laurita'))
    assert.deepEqual(await p, {
      opciones: [{ intencion: 'otra', texto: 'Hola, Laurita' }],
      interlocutorProbable: { nombre: 'Laura', confianza: 'alta' },
      registro: 'intimo',
    })
  })

  test('sin interlocutor probable en la respuesta, queda desconocido', async () => {
    const p = pedirOpcionesConInterlocutor(pedido('Hola'))
    llamadas[0].responder(200, opciones('Hola'))
    const r = await p
    assert.deepEqual(r.interlocutorProbable, { nombre: 'desconocido', confianza: 'baja' })
    assert.equal(r.registro, 'casual')
  })

  test('comparte el corte con pedirOpciones: el mas nuevo cancela al otro, en los dos sentidos', async () => {
    const viejo = pedirOpciones(pedido('¿Tenes hambre?'))
    const nuevo = pedirOpcionesConInterlocutor(pedido('¿Queres agua?'))
    const masNuevo = pedirOpciones(pedido('¿Y cafe?'))
    assert.deepEqual(
      llamadas.map((l) => l.signal.aborted),
      [true, true, false],
    )
    llamadas[2].responder(200, opciones('Cafe'))
    await assert.rejects(viejo, (e) => esPedidoCancelado(e))
    await assert.rejects(nuevo, (e) => esPedidoCancelado(e))
    assert.deepEqual(await masNuevo, [{ intencion: 'otra', texto: 'Cafe' }])
  })

  test('si la respuesta vieja ya llego al cancelarse, igual no se entrega', async () => {
    const viejo = pedirOpcionesConInterlocutor(pedido('¿Tenes hambre?'))
    llamadas[0].responder(200, conProbable('Vieja'))
    const nuevo = pedirOpcionesConInterlocutor(pedido('¿Queres agua?'))
    await assert.rejects(viejo, (e) => esPedidoCancelado(e))
    llamadas[1].responder(200, conProbable('Nueva'))
    assert.equal((await nuevo).opciones[0].texto, 'Nueva')
  })

  test('una falla real no se reporta como cancelada', async () => {
    const p = pedirOpcionesConInterlocutor(pedido('¿Como estas?'))
    llamadas[0].responder(500, { error: 'se cayo' })
    await assert.rejects(p, (e) => e instanceof Error && !esPedidoCancelado(e) && e.message === 'se cayo')
  })
})

describe('completarFrase', () => {
  test('entrega la frase completada', async () => {
    const p = completarFrase('tengo fr', pedido('¿Como estas?'))
    llamadas[0].responder(200, { frase: 'Tengo frio.' })
    assert.equal(await p, 'Tengo frio.')
  })

  test('un completado nuevo cancela el anterior y el cancelado nunca entrega su frase vieja', async () => {
    const viejo = completarFrase('tengo', pedido('¿Como estas?'))
    llamadas[0].responder(200, { frase: 'Tengo sueño.' })
    const nuevo = completarFrase('tengo fr', pedido('¿Como estas?'))
    llamadas[1].responder(200, { frase: 'Tengo frio.' })
    assert.equal(await nuevo, 'Tengo frio.')
    assert.equal(await viejo, 'Tengo frio.')
  })

  test('letras rapidas: todos los cancelados terminan con la frase del ultimo', async () => {
    const a = completarFrase('t', pedido('¿Como estas?'))
    const b = completarFrase('te', pedido('¿Como estas?'))
    const c = completarFrase('ten', pedido('¿Como estas?'))
    assert.deepEqual(
      llamadas.map((l) => l.signal.aborted),
      [true, true, false],
    )
    llamadas[2].responder(200, { frase: 'Tengo frio.' })
    assert.deepEqual(await Promise.all([a, b, c]), ['Tengo frio.', 'Tengo frio.', 'Tengo frio.'])
  })

  test('si falla, devuelve el prefijo y no tira', async () => {
    const p = completarFrase('tengo fr', pedido('¿Como estas?'))
    llamadas[0].fallar(new TypeError('Failed to fetch'))
    assert.equal(await p, 'tengo fr')
  })

  test('cancelar opciones no cancela el completado ni al reves', async () => {
    const o = pedirOpciones(pedido('¿Como estas?'))
    const c = completarFrase('tengo fr', pedido('¿Como estas?'))
    assert.deepEqual(
      llamadas.map((l) => l.signal.aborted),
      [false, false],
    )
    llamadas[0].responder(200, opciones('Bien'))
    llamadas[1].responder(200, { frase: 'Tengo frio.' })
    assert.deepEqual(await o, [{ intencion: 'otra', texto: 'Bien' }])
    assert.equal(await c, 'Tengo frio.')
  })
})

describe('cerrarConversacion', () => {
  const historial = [
    { quien: 'interlocutor' as const, texto: '¿Como dormiste?' },
    { quien: 'usuario' as const, texto: 'Bien, che.', origen: 'opcion' as const },
  ]

  test('pide el cierre a la ruta de memoria con el historial, sin esperar al agente', async () => {
    const cerrada = cerrarConversacion(historial)
    assert.equal(llamadas.length, 1)
    assert.equal(llamadas[0].url, '/api/memoria')
    assert.deepEqual(llamadas[0].cuerpo, { accion: 'cerrar', historial, esperar: false })
    llamadas[0].responder(200, { cerrada: true, lineas: 2 })
    assert.equal(await cerrada, true)
  })

  test('sin conversacion para cerrar devuelve false', async () => {
    const cerrada = cerrarConversacion()
    assert.deepEqual(llamadas[0].cuerpo, { accion: 'cerrar', historial: [], esperar: false })
    llamadas[0].responder(200, { cerrada: false, lineas: 0 })
    assert.equal(await cerrada, false)
  })

  test('nunca tira: si falla la ruta o la red, devuelve false', async () => {
    const conError = cerrarConversacion(historial)
    llamadas[0].responder(500, { error: 'se rompio' })
    assert.equal(await conError, false)
    const sinRed = cerrarConversacion(historial)
    llamadas[1].fallar(new TypeError('Failed to fetch'))
    assert.equal(await sinRed, false)
  })
})
