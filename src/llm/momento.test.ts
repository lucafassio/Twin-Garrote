// Correr: node --test 'src/llm/*.test.ts'
// Franja horaria y dia de la semana del pedido (#45), en hora argentina (UTC-3).
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { PedidoOpciones } from '@/eventos'
import { describirMomento, franjaHoraria } from './fechas.ts'
import { crearOpciones } from './opciones.ts'
import { crearCompletado } from './completado.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import type { PromptProveedor, Proveedor } from './tipos.ts'

// Hora argentina -> instante: "2026-11-07T05:59" en Argentina.
const ar = (local: string) => new Date(`${local}:00-03:00`)

describe('franjaHoraria', () => {
  const casos: [string, string][] = [
    ['2026-11-07T05:59', 'noche'],
    ['2026-11-07T06:00', 'manana'],
    ['2026-11-07T11:59', 'manana'],
    ['2026-11-07T12:00', 'tarde'],
    ['2026-11-07T19:59', 'tarde'],
    ['2026-11-07T20:00', 'noche'],
    ['2026-11-07T23:59', 'noche'],
    ['2026-11-08T00:00', 'noche'],
  ]
  for (const [local, franja] of casos) {
    test(`${local} en Argentina es ${franja}`, () => {
      assert.equal(franjaHoraria(ar(local)), franja)
    })
  }

  test('usa la hora argentina, no la UTC', () => {
    // 23:30 UTC = 20:30 en Argentina (noche); 8:30 UTC = 5:30 (noche); 9:00 UTC = 6:00 (manana).
    assert.equal(franjaHoraria(new Date('2026-11-07T23:30:00Z')), 'noche')
    assert.equal(franjaHoraria(new Date('2026-11-07T08:30:00Z')), 'noche')
    assert.equal(franjaHoraria(new Date('2026-11-07T09:00:00Z')), 'manana')
  })
})

describe('describirMomento', () => {
  test('dice el dia de la semana y la franja', () => {
    assert.equal(describirMomento(ar('2026-11-07T10:00')), 'sábado 7/11/2026, a la mañana')
    assert.equal(describirMomento(ar('2026-11-08T13:00')), 'domingo 8/11/2026, a la tarde')
    assert.equal(describirMomento(ar('2026-11-09T22:00')), 'lunes 9/11/2026, a la noche')
  })

  test('cruzando la medianoche argentina cambia el dia aunque en UTC no', () => {
    // 23:59 del sabado en Argentina = 02:59 UTC del domingo.
    assert.equal(describirMomento(new Date('2026-11-08T02:59:00Z')), 'sábado 7/11/2026, a la noche')
    // 00:00 del domingo en Argentina = 03:00 UTC del domingo.
    assert.equal(describirMomento(new Date('2026-11-08T03:00:00Z')), 'domingo 8/11/2026, a la noche (de madrugada)')
    // 5:59 del domingo en Argentina = 08:59 UTC: sigue siendo domingo y noche.
    assert.equal(describirMomento(new Date('2026-11-08T08:59:00Z')), 'domingo 8/11/2026, a la noche (de madrugada)')
    // 6:00 ya es manana, sin madrugada.
    assert.equal(describirMomento(new Date('2026-11-08T09:00:00Z')), 'domingo 8/11/2026, a la mañana')
  })
})

// Proveedor guionado que guarda los prompts.
function guionado(respuesta: string) {
  const prompts: PromptProveedor[] = []
  const proveedor: Proveedor = {
    nombre: 'guionado',
    async generar(p) {
      prompts.push(p)
      return respuesta
    },
  }
  return { proveedor, prompts }
}

const pedido: PedidoOpciones = { historial: [], ultimoTurno: '¿Queres comer algo?', yaMostradas: [] }

const CUATRO = JSON.stringify({
  opciones: [
    { intencion: 'aceptar', texto: 'Si, algo liviano.' },
    { intencion: 'rechazar', texto: 'No, gracias.' },
    { intencion: 'preguntar', texto: '¿Que hay?' },
    { intencion: 'otra', texto: 'Mas tarde.' },
  ],
  registro: 'casual',
})

describe('el momento entra a los prompts', () => {
  test('opciones: un pedido a las 22 del domingo dice domingo y noche', async () => {
    const { proveedor, prompts } = guionado(CUATRO)
    const generar = crearOpciones({ proveedor, almacen: crearAlmacenEnMemoria() })
    await generar(pedido, ar('2026-11-08T22:00'))
    assert.match(prompts[0].usuario, /# Momento\ndomingo 8\/11\/2026, a la noche/)
  })

  test('opciones: cruzando la medianoche argentina toma el dia nuevo', async () => {
    const { proveedor, prompts } = guionado(CUATRO)
    const generar = crearOpciones({ proveedor, almacen: crearAlmacenEnMemoria() })
    await generar(pedido, new Date('2026-11-09T03:30:00Z'))
    assert.match(prompts[0].usuario, /# Momento\nlunes 9\/11\/2026, a la noche \(de madrugada\)/)
  })

  test('opciones: las 19:59 son tarde y las 20:00 noche', async () => {
    for (const [local, franja] of [['2026-11-07T19:59', 'tarde'], ['2026-11-07T20:00', 'noche']]) {
      const { proveedor, prompts } = guionado(CUATRO)
      await crearOpciones({ proveedor, almacen: crearAlmacenEnMemoria() })(pedido, ar(local))
      assert.match(prompts[0].usuario, new RegExp(`# Momento\\nsábado 7/11/2026, a la ${franja}\\.`))
    }
  })

  test('completado: cruzando la medianoche argentina toma el dia nuevo', async () => {
    const { proveedor, prompts } = guionado(JSON.stringify({ frase: 'Quiero dormir.' }))
    const completar = crearCompletado({ proveedor, almacen: crearAlmacenEnMemoria() })
    // 23:59 del sabado y 0:00 del domingo en Argentina.
    await completar('quiero d', pedido, new Date('2026-11-08T02:59:00Z'))
    await completar('quiero d', pedido, new Date('2026-11-08T03:00:00Z'))
    assert.match(prompts[0].usuario, /# Momento\nsábado 7\/11\/2026, a la noche\./)
    assert.match(prompts[1].usuario, /# Momento\ndomingo 8\/11\/2026, a la noche \(de madrugada\)\./)
  })

  test('completado: un pedido a las 9 del sabado dice sabado y manana', async () => {
    const { proveedor, prompts } = guionado(JSON.stringify({ frase: 'Quiero un cafe con leche.' }))
    const completar = crearCompletado({ proveedor, almacen: crearAlmacenEnMemoria() })
    await completar('quiero un', pedido, ar('2026-11-07T09:00'))
    assert.match(prompts[0].usuario, /# Momento\nsábado 7\/11\/2026, a la mañana/)
  })
})
