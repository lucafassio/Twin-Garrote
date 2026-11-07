import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearAlmacenEleccionesEnMemoria, registrarEleccion, resumirElecciones, type Eleccion, type PedidoEleccion } from './elecciones.ts'

const pedido: PedidoEleccion = {
  opciones: [
    { texto: 'Dale', intencion: 'aceptar', idsHechos: ['h1'] },
    { texto: 'Ahora no', intencion: 'rechazar' },
    { texto: 'Con quien?', intencion: 'preguntar' },
    { texto: 'Mas tarde', intencion: 'otra' },
  ],
  eleccion: 2,
  turno: 'Vamos al parque?',
  cercania: 'familia',
  interlocutor: 'Marta',
  tipoTurno: 'siNo',
}

test('registra lo mostrado, eleccion y contexto con la hora inyectada', async () => {
  const almacen = crearAlmacenEleccionesEnMemoria()
  const hora = new Date('2026-11-07T18:00:00.000Z')
  await registrarEleccion(almacen, pedido, hora)
  assert.deepEqual(await almacen.leer(), [{ ...pedido, hora: hora.toISOString() }])
  const copia = await almacen.leer()
  copia[0].opciones[0].texto = 'Cambiado'
  assert.equal((await almacen.leer())[0].opciones[0].texto, 'Dale')
})

test('cuenta posiciones, Otra y fijas sin mezclar el denominador de la posicion media', async () => {
  const almacen = crearAlmacenEleccionesEnMemoria()
  assert.deepEqual(await resumirElecciones(almacen), {
    total: 0, posiciones: [0, 0, 0, 0], tasaOtra: 0, tasaFijas: 0, posicionMedia: null,
  })
  const elecciones: Eleccion[] = [1, 1, 2, 3, 4, 'otra', 'otra', 'si', 'no', 'espera']
  for (const eleccion of elecciones) await registrarEleccion(almacen, { ...pedido, eleccion })
  assert.deepEqual((await almacen.leer()).map((r) => r.eleccion), elecciones)
  assert.deepEqual(await resumirElecciones(almacen), {
    total: 10, posiciones: [2, 1, 1, 1], tasaOtra: 0.2, tasaFijas: 0.3, posicionMedia: 2.2,
  })
})

test('rechaza elecciones invalidas sin escribir y admite fijas sin opciones disponibles', async () => {
  const almacen = crearAlmacenEleccionesEnMemoria()
  for (const invalido of [null, {}, { ...pedido, eleccion: 5 }, { ...pedido, opciones: [] },
    { ...pedido, opciones: [{ texto: 'Dale', intencion: 'inventada' }] },
    { ...pedido, cercania: 'desconocida' }, { ...pedido, tipoTurno: 'invalido' },
    { ...pedido, opciones: pedido.opciones.map((o) => ({ ...o, idsHechos: [5] })) }]) {
    await assert.rejects(registrarEleccion(almacen, invalido), /Eleccion invalida/)
  }
  assert.deepEqual(await almacen.leer(), [])
  await registrarEleccion(almacen, { ...pedido, opciones: [], eleccion: 'si' })
  assert.equal((await almacen.leer())[0].eleccion, 'si')
})
