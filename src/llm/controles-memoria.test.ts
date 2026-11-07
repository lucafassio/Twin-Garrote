// Correr: node --test 'src/llm/*.test.ts'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { LineaHistorial } from '@/eventos'
import { cerrarConversacion, invalidarHecho, listarHechos } from './controles-memoria.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import type { Hecho } from './tipos.ts'

const hecho = (h: Partial<Hecho> & { id: string; texto: string }): Hecho => ({
  origen: 'interlocutor',
  interlocutor: null,
  importancia: 5,
  fecha: '2026-11-01T10:00:00.000Z',
  estado: 'activo',
  fechaInvalidacion: null,
  intimo: false,
  ...h,
})

const historial: LineaHistorial[] = [
  { quien: 'interlocutor', texto: 'Hola' },
  { quien: 'usuario', texto: 'Hola', origen: 'opcion' },
  { quien: 'interlocutor', texto: 'Laura se opera el jueves' },
  { quien: 'usuario', texto: 'Uy, mandale un beso', origen: 'opcion' },
]

describe('controles de memoria', () => {
  test('listarHechos separa activos e invalidados, los nuevos primero', async () => {
    const almacen = crearAlmacenEnMemoria({
      memoria: {
        hechos: [
          hecho({ id: 'a', texto: 'viejo', fecha: '2026-11-01T10:00:00.000Z' }),
          hecho({ id: 'b', texto: 'nuevo', fecha: '2026-11-05T10:00:00.000Z' }),
          hecho({ id: 'c', texto: 'ya no', estado: 'invalidado', fechaInvalidacion: '2026-11-06T10:00:00.000Z' }),
        ],
      },
    })
    const { activos, invalidados } = await listarHechos(almacen)
    assert.deepEqual(activos.map((h) => h.id), ['b', 'a'])
    assert.deepEqual(invalidados.map((h) => h.id), ['c'])
  })

  test('invalidarHecho no borra: marca la fecha de invalidacion', async () => {
    const almacen = crearAlmacenEnMemoria({ memoria: { hechos: [hecho({ id: 'a', texto: 'Laura se opera el jueves' })] } })
    const ahora = new Date('2026-11-07T15:00:00Z')
    const h = await invalidarHecho(almacen, 'a', ahora)
    assert.equal(h?.estado, 'invalidado')
    const guardado = almacen.memoria().hechos
    assert.equal(guardado.length, 1)
    assert.equal(guardado[0].estado, 'invalidado')
    assert.equal(guardado[0].fechaInvalidacion, ahora.toISOString())
    assert.equal(await invalidarHecho(almacen, 'a', ahora), null) // ya invalidado
    assert.equal(await invalidarHecho(almacen, 'no-existe', ahora), null)
  })

  test('invalidarHecho descarta el resumen de la conversacion de donde salio', async () => {
    const fin = '2026-11-07T14:05:00.000Z'
    const almacen = crearAlmacenEnMemoria({
      memoria: {
        hechos: [hecho({ id: 'a', texto: 'Laura se opera el jueves', fecha: fin })],
        resumenes: [
          { inicio: '2026-11-07T14:00:00.000Z', fin, resumen: 'Le contaron que Laura se opera el jueves.' },
          { inicio: '2026-11-07T10:00:00.000Z', fin: '2026-11-07T10:10:00.000Z', resumen: 'Hablaron de River.' },
        ],
      },
    })
    const ahora = new Date('2026-11-07T15:00:00Z')
    await invalidarHecho(almacen, 'a', ahora)
    const [conLaura, deRiver] = almacen.memoria().resumenes
    assert.equal(conLaura.descartado, ahora.toISOString())
    assert.equal(conLaura.resumen, 'Le contaron que Laura se opera el jueves.') // no se borra
    assert.equal(deRiver.descartado, undefined)
  })

  test('cerrarConversacion arma la conversacion desde donde empezo y la deja cerrada', async () => {
    const almacen = crearAlmacenEnMemoria({
      memoria: {
        conversacion: { inicio: '2026-11-07T14:00:00.000Z', ultimaActividad: '2026-11-07T14:05:00.000Z', desdeLinea: 2 },
      },
    })
    const cerrada = await cerrarConversacion(almacen, historial, 'familia')
    assert.deepEqual(cerrada, {
      inicio: '2026-11-07T14:00:00.000Z',
      fin: '2026-11-07T14:05:00.000Z',
      lineas: historial.slice(2),
      cercania: 'familia',
    })
    assert.equal(almacen.memoria().conversacion, null)
  })

  test('cerrarConversacion sin nada que aprender devuelve null', async () => {
    const almacen = crearAlmacenEnMemoria()
    assert.equal(await cerrarConversacion(almacen, []), null)
    const conActual = crearAlmacenEnMemoria({
      memoria: { conversacion: { inicio: 'x', ultimaActividad: 'x', desdeLinea: 4 } },
    })
    assert.equal(await cerrarConversacion(conActual, historial), null)
    assert.equal(conActual.memoria().conversacion, null)
  })
})
