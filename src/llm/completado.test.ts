// Correr: node --test 'src/llm/*.test.ts'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { PedidoOpciones } from '@/eventos'
import { crearCompletado, normalizar, SALIDA_COMPLETADO } from './completado.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import { crearProveedorFalso } from './proveedor-falso.ts'
import type { PromptProveedor, Proveedor } from './tipos.ts'

// Proveedor guionado: devuelve las respuestas en orden (o tira si es un Error) y guarda los prompts.
function guionado(respuestas: (string | Error)[]) {
  const prompts: PromptProveedor[] = []
  const proveedor: Proveedor = {
    nombre: 'guionado',
    async generar(p) {
      prompts.push(p)
      const r = respuestas.shift()
      if (r === undefined) throw new Error('el guion se quedo sin respuestas')
      if (r instanceof Error) throw r
      return r
    },
  }
  return { proveedor, prompts }
}

const pedido = (p: Partial<PedidoOpciones> = {}): PedidoOpciones => ({
  historial: [],
  ultimoTurno: '¿Como te sentis hoy?',
  yaMostradas: [],
  ...p,
})

const completado = (respuestas: (string | Error)[]) => {
  const g = guionado(respuestas)
  return { ...g, completar: crearCompletado({ proveedor: g.proveedor, almacen: crearAlmacenEnMemoria() }) }
}

describe('completado', () => {
  test('la frase respeta el prefijo', async () => {
    const { completar, prompts } = completado([JSON.stringify({ frase: 'Tengo frío, ¿me traés la manta?' })])
    const frase = await completar('tengo fr', pedido())
    assert.equal(frase, 'Tengo frío, ¿me traés la manta?')
    assert.ok(normalizar(frase).startsWith(normalizar('tengo fr')))
    assert.equal(prompts[0].salida, SALIDA_COMPLETADO)
    assert.match(prompts[0].usuario, /# Lo que lleva deletreado\ntengo fr/)
    assert.match(prompts[0].usuario, /Interlocutor: ¿Como te sentis hoy\?/)
  })

  test('si la frase no empieza con el prefijo, devuelve el prefijo', async () => {
    const { completar } = completado([JSON.stringify({ frase: 'Estoy bien, gracias.' })])
    assert.equal(await completar('tengo fr', pedido()), 'tengo fr')
  })

  test('si el modelo falla, devuelve el prefijo', async () => {
    const { completar } = completado([new Error('timeout')])
    assert.equal(await completar('quiero ag', pedido()), 'quiero ag')
  })

  test('con JSON invalido, devuelve el prefijo', async () => {
    for (const malo of ['no es json', '{"frase": 3}', '{"otra":"cosa"}', '[]']) {
      const { completar } = completado([malo])
      assert.equal(await completar('quiero ag', pedido()), 'quiero ag')
    }
  })

  test('con prefijo vacio no llama al modelo', async () => {
    const { completar, prompts } = completado([])
    assert.equal(await completar('  ', pedido()), '  ')
    assert.equal(prompts.length, 0)
  })

  test('acepta la salida con bloque de codigo', async () => {
    const { completar } = completado(['```json\n{"frase":"Quiero agua, por favor."}\n```'])
    assert.equal(await completar('quiero ag', pedido()), 'Quiero agua, por favor.')
  })

  test('con cercania formal no manda hechos intimos', async () => {
    const almacen = crearAlmacenEnMemoria()
    const m = await almacen.leerMemoria()
    const base = { origen: 'familia', interlocutor: null, fecha: '2026-11-07T00:00:00Z', estado: 'activo', fechaInvalidacion: null } as const
    m.hechos.push({ ...base, id: 'a', texto: 'Le duele la espalda', importancia: 9, intimo: true })
    m.hechos.push({ ...base, id: 'b', texto: 'Es hincha de River', importancia: 5, intimo: false })
    await almacen.guardarMemoria(m)
    const g = guionado([JSON.stringify({ frase: 'Estoy bien, doctor.' })])
    const completar = crearCompletado({ proveedor: g.proveedor, almacen })
    await completar('estoy', pedido({ cercania: 'formal' }))
    assert.doesNotMatch(g.prompts[0].usuario, /espalda/)
    assert.match(g.prompts[0].usuario, /River/)
  })

  test('con el proveedor falso devuelve el prefijo', async () => {
    const completar = crearCompletado({ proveedor: crearProveedorFalso(), almacen: crearAlmacenEnMemoria() })
    assert.equal(await completar('hola', pedido()), 'hola')
  })
})
