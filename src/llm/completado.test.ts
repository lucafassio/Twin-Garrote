// Correr: node --test 'src/llm/*.test.ts'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { LineaHistorial, PedidoOpciones } from '@/eventos'
import { crearCompletado, normalizar, SALIDA_COMPLETADO } from './completado.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import { crearProveedorFalso } from './proveedor-falso.ts'
import type { ConversacionActual, Memoria, PromptProveedor, Proveedor } from './tipos.ts'

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

describe('completado con el contexto de las opciones', () => {
  const T0 = new Date('2026-11-07T15:00:00Z')
  const MIN = 60_000
  const despues = (ms: number) => new Date(T0.getTime() + ms)
  const linea = (quien: LineaHistorial['quien'], texto: string): LineaHistorial => ({ quien, texto })
  const frase = JSON.stringify({ frase: 'Quiero agua, por favor.' })
  // La conversacion actual, con su ultima actividad en T0.
  const conversacion = (desdeLinea: number, lineas?: LineaHistorial[]): ConversacionActual => ({
    inicio: T0.toISOString(),
    ultimaActividad: T0.toISOString(),
    desdeLinea,
    lineas,
  })

  async function conMemoria(cambiar: (m: Memoria) => void) {
    const almacen = crearAlmacenEnMemoria()
    const m = await almacen.leerMemoria()
    cambiar(m)
    await almacen.guardarMemoria(m)
    const g = guionado([frase])
    return { ...g, completar: crearCompletado({ proveedor: g.proveedor, almacen }) }
  }

  test('usa la conversacion actual y no las lineas de una conversacion anterior', async () => {
    const historial = [
      linea('interlocutor', '¿Viste el partido de anoche?'),
      linea('usuario', 'Si, un desastre.'),
      linea('interlocutor', '¿Tenes sed?'),
      linea('usuario', 'Un poco.'),
    ]
    const { completar, prompts } = await conMemoria((m) => {
      m.conversacion = conversacion(2)
    })
    await completar('quiero ag', pedido({ historial }), despues(1 * MIN))
    assert.match(prompts[0].usuario, /¿Tenes sed\?/)
    assert.match(prompts[0].usuario, /Un poco\./)
    assert.doesNotMatch(prompts[0].usuario, /partido/)
    assert.doesNotMatch(prompts[0].usuario, /desastre/)
  })

  test('suma los resumenes de las ultimas 12 h, sin los descartados ni los mas viejos', async () => {
    const hace = (horas: number) => new Date(T0.getTime() - horas * 60 * MIN).toISOString()
    const { completar, prompts } = await conMemoria((m) => {
      m.resumenes.push({ inicio: hace(3), fin: hace(2), resumen: 'Hablo con Marta del asado del domingo.' })
      m.resumenes.push({ inicio: hace(5), fin: hace(4), resumen: 'Le conto al medico que durmio mal.', descartado: hace(1) })
      m.resumenes.push({ inicio: hace(14), fin: hace(13), resumen: 'Miro el partido con Juan.' })
    })
    await completar('quiero ag', pedido(), T0)
    assert.match(prompts[0].usuario, /asado del domingo/)
    assert.doesNotMatch(prompts[0].usuario, /durmio mal/)
    assert.doesNotMatch(prompts[0].usuario, /partido con Juan/)
  })

  test('despues de una recarga usa las lineas guardadas en el servidor', async () => {
    const { completar, prompts } = await conMemoria((m) => {
      m.conversacion = conversacion(4, [linea('interlocutor', '¿Tenes sed?'), linea('usuario', 'Un poco.')])
    })
    await completar('quiero ag', pedido({ historial: [] }), despues(1 * MIN))
    assert.match(prompts[0].usuario, /¿Tenes sed\?/)
    assert.match(prompts[0].usuario, /Un poco\./)
  })

  test('suma las lineas del cliente que el servidor todavia no guardo, sin duplicar', async () => {
    const guardadas = [linea('interlocutor', '¿Tenes sed?'), linea('usuario', 'Un poco.')]
    const { completar, prompts } = await conMemoria((m) => {
      m.conversacion = conversacion(0, guardadas)
    })
    const historial = [...guardadas, linea('interlocutor', '¿Te traigo hielo?')]
    await completar('quiero ag', pedido({ historial }), despues(1 * MIN))
    assert.match(prompts[0].usuario, /¿Te traigo hielo\?/)
    assert.equal(prompts[0].usuario.match(/¿Tenes sed\?/g)?.length, 1)
  })

  test('una linea dicha de nuevo en la conversacion cuenta como nueva, igual que en las opciones', async () => {
    const guardadas = [linea('interlocutor', '¿Tenes sed?'), linea('usuario', 'Si.')]
    const { completar, prompts } = await conMemoria((m) => {
      m.conversacion = conversacion(0, guardadas)
    })
    const historial = [...guardadas, linea('interlocutor', '¿Con hielo?'), linea('usuario', 'Si.')]
    await completar('quiero ag', pedido({ historial }), despues(1 * MIN))
    assert.equal(prompts[0].usuario.match(/Usuario: Si\./g)?.length, 2)
  })

  test('con mas de 15 min de silencio, lo del historial es de una conversacion anterior', async () => {
    const historial = [linea('interlocutor', '¿Viste el partido de anoche?'), linea('usuario', 'Si, un desastre.')]
    const { completar, prompts } = await conMemoria((m) => {
      m.conversacion = conversacion(0)
    })
    await completar('quiero ag', pedido({ historial }), despues(20 * MIN))
    assert.doesNotMatch(prompts[0].usuario, /partido/)
  })
})
