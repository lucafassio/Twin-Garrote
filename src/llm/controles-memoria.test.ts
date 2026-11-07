// Correr: node --test 'src/llm/*.test.ts'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { invalidarHecho, listarHechos } from './controles-memoria.ts'
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

  describe('listarHechos con fechas y vencidos', () => {
    const OPERACION = {
      id: 'op',
      texto: 'Laura se opera de la rodilla',
      tipo: 'evento' as const,
      expresionOriginal: 'el jueves',
      fechaEvento: '2026-11-12',
      validoHasta: '2026-11-13T02:59:59.999Z', // fin del 12/11 en Argentina
    }
    const listar = (hechos: Hecho[], ahora: string) =>
      listarHechos(crearAlmacenEnMemoria({ memoria: { hechos } }), new Date(ahora))

    test('un evento trae su fecha y no esta vencido hasta el fin de ese dia', async () => {
      const { activos, vencidos } = await listar([hecho(OPERACION)], '2026-11-12T20:00:00.000Z') // jueves 17:00
      assert.deepEqual(vencidos, [])
      assert.equal(activos.length, 1)
      assert.equal(activos[0].fechaEvento, '2026-11-12')
      assert.equal(activos[0].vencido, false)
    })

    test('pasado el fin del dia del evento va a vencidos, con su fecha, y sigue activo en la memoria', async () => {
      const almacen = crearAlmacenEnMemoria({ memoria: { hechos: [hecho(OPERACION)] } })
      const { activos, vencidos, invalidados } = await listarHechos(almacen, new Date('2026-11-13T03:00:00.000Z'))
      assert.deepEqual(activos, [])
      assert.deepEqual(invalidados, [])
      assert.equal(vencidos.length, 1)
      assert.equal(vencidos[0].fechaEvento, '2026-11-12')
      assert.equal(vencidos[0].vencido, true)
      assert.equal(almacen.memoria().hechos[0].estado, 'activo') // vencer no es invalidar
    })

    test('estable, estado sin fin y evento sin vencimiento nunca vencen', async () => {
      const { activos, vencidos } = await listar(
        [
          hecho({ id: 'a', texto: 'Es de River', tipo: 'estable' }),
          hecho({ id: 'b', texto: 'Laura esta de viaje', tipo: 'estado' }),
          hecho({ id: 'c', texto: 'Algo pasa', tipo: 'evento', fechaEvento: '2026-11-12' }), // fecha descartada: sin validoHasta
        ],
        '2027-06-01T00:00:00.000Z',
      )
      assert.deepEqual(vencidos, [])
      assert.deepEqual(activos.map((h) => h.vencido), [false, false, false])
    })

    test('un estado con fin vence despues de su validoHasta', async () => {
      const viaje = hecho({ id: 'v', texto: 'Laura esta de viaje', tipo: 'estado', validoHasta: '2026-11-09T02:59:59.999Z' })
      assert.deepEqual((await listar([viaje], '2026-11-08T12:00:00.000Z')).vencidos, [])
      assert.deepEqual((await listar([viaje], '2026-11-10T12:00:00.000Z')).vencidos.map((h) => h.id), ['v'])
    })

    test('vencidos, activos e invalidados quedan en grupos separados; un invalidado nunca cuenta como vencido', async () => {
      const { activos, vencidos, invalidados } = await listar(
        [
          hecho({ id: 'viva', texto: 'Es de River', fecha: '2026-11-05T10:00:00.000Z' }),
          hecho({ ...OPERACION, id: 'pasada', fecha: '2026-11-08T10:00:00.000Z' }),
          hecho({ ...OPERACION, id: 'vieja', fecha: '2026-11-06T10:00:00.000Z' }),
          hecho({ ...OPERACION, id: 'invalidada', estado: 'invalidado', fechaInvalidacion: '2026-11-09T10:00:00.000Z' }),
        ],
        '2026-11-20T12:00:00.000Z',
      )
      assert.deepEqual(activos.map((h) => h.id), ['viva'])
      assert.deepEqual(vencidos.map((h) => h.id), ['pasada', 'vieja']) // los nuevos primero
      assert.deepEqual(invalidados.map((h) => h.id), ['invalidada'])
      assert.equal(invalidados[0].vencido, false)
    })

    test('una memoria vieja, sin los campos nuevos, se lista como antes', async () => {
      const { activos, vencidos } = await listar([hecho({ id: 'a', texto: 'viejo' })], '2030-01-01T00:00:00.000Z')
      assert.deepEqual(vencidos, [])
      assert.equal(activos[0].texto, 'viejo')
      assert.equal(activos[0].fechaEvento, undefined)
      assert.equal(activos[0].vencido, false)
    })
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
})
