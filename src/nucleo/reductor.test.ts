// Correr: npx tsx --test src/nucleo/reductor.test.ts
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { Opcion } from '@/eventos'
import { elementosBarrido, estadoInicial, reducir } from './reductor'
import type { Accion, Efecto, Estado } from './tipos'

const OPCIONES: Opcion[] = [
  { intencion: 'aceptar', texto: 'Dale, de carne.' },
  { intencion: 'rechazar', texto: 'No, hoy no.' },
  { intencion: 'preguntar', texto: '¿De donde?' },
  { intencion: 'otra', texto: 'Dejame pensarlo.' },
]

// Aplica varias acciones y junta todos los efectos.
function aplicar(estado: Estado, ...acciones: Accion[]) {
  let actual = estado
  const efectos: Efecto[] = []
  for (const a of acciones) {
    const r = reducir(actual, a)
    actual = r.estado
    efectos.push(...r.efectos)
  }
  return { estado: actual, efectos }
}

const tipos = (efectos: Efecto[]) => efectos.map((e) => e.tipo)
const decires = (efectos: Efecto[]) =>
  efectos.filter((e): e is Extract<Efecto, { tipo: 'decir' }> => e.tipo === 'decir')

// Estado con 4 opciones en pantalla para el turno "¿Queres empanadas?".
function conOpciones() {
  return aplicar(
    estadoInicial,
    { tipo: 'turno', texto: '¿Queres empanadas?' },
    { tipo: 'opcionesRecibidas', pedidoId: 1, opciones: OPCIONES },
  ).estado
}

// Avanza el barrido hasta el elemento pedido.
function iluminar(estado: Estado, buscado: string) {
  let e = estado
  for (let i = 0; i < 20; i++) {
    const el = elementosBarrido(e)[e.iluminado]
    const nombre = el.tipo === 'opcion' ? `opcion${el.indice}` : el.tipo
    if (nombre === buscado) return e
    e = reducir(e, { tipo: 'tick' }).estado
  }
  throw new Error(`no se ilumino ${buscado}`)
}

const nombres = (e: Estado) =>
  elementosBarrido(e).map((el) => (el.tipo === 'opcion' ? `opcion${el.indice}` : el.tipo))

describe('barrido', () => {
  test('antes del primer turno recorre solo urgencia y opciones fijas', () => {
    assert.deepEqual(nombres(estadoInicial), ['urgencia', 'si', 'no', 'espera', 'otra'])
  })

  test('con opciones recorre opciones primero y despues la franja', () => {
    assert.deepEqual(nombres(conOpciones()), [
      'opcion0', 'opcion1', 'opcion2', 'opcion3', 'urgencia', 'si', 'no', 'espera', 'otra',
    ])
  })

  test('mientras piensa el LLM, Otra se saltea', () => {
    const e = aplicar(estadoInicial, { tipo: 'turno', texto: 'Hola' }).estado
    assert.equal(e.conversacion, 'pensando')
    assert.deepEqual(nombres(e), ['urgencia', 'si', 'no', 'espera'])
  })

  test('el tick avanza y vuelve a empezar al final', () => {
    let e = estadoInicial
    for (let i = 0; i < 5; i++) e = reducir(e, { tipo: 'tick' }).estado
    assert.equal(e.iluminado, 0)
    assert.equal(e.vueltas, 1)
  })

  test('con los ojos cerrados el barrido se congela', () => {
    const e = aplicar(estadoInicial, { tipo: 'ojos', cerrados: true, progreso: 0.2 }, { tipo: 'tick' }).estado
    assert.equal(e.iluminado, 0)
  })

  test('cerrar los ojos arma el gesto de urgencia y abrirlos lo desarma', () => {
    const cerrar = reducir(estadoInicial, { tipo: 'ojos', cerrados: true, progreso: 0 })
    assert.ok(tipos(cerrar.efectos).includes('armarGestoUrgencia'))
    const abrir = reducir(cerrar.estado, { tipo: 'ojos', cerrados: false, progreso: 0 })
    assert.ok(tipos(abrir.efectos).includes('desarmarGestoUrgencia'))
  })

  test('tras 3 vueltas sin eleccion se pausa', () => {
    let e = estadoInicial
    for (let i = 0; i < 15; i++) e = reducir(e, { tipo: 'tick' }).estado
    assert.equal(e.pausado, true)
    const despues = reducir(e, { tipo: 'tick' }).estado
    assert.equal(despues.iluminado, e.iluminado)
  })

  test('en pausa, un parpadeo largo reanuda sin elegir nada', () => {
    let e = estadoInicial
    for (let i = 0; i < 15; i++) e = reducir(e, { tipo: 'tick' }).estado
    const r = reducir(e, { tipo: 'parpadeoLargo' })
    assert.equal(r.estado.pausado, false)
    assert.equal(r.estado.vueltas, 0)
    assert.equal(r.estado.iluminado, 0)
    assert.equal(decires(r.efectos).length, 0)
  })

  test('en pausa, un turno nuevo reanuda', () => {
    let e = estadoInicial
    for (let i = 0; i < 15; i++) e = reducir(e, { tipo: 'tick' }).estado
    e = reducir(e, { tipo: 'turno', texto: 'Hola' }).estado
    assert.equal(e.pausado, false)
  })
})

describe('turnos y opciones', () => {
  test('un turno entra al historial y pide opciones', () => {
    const r = aplicar(estadoInicial, { tipo: 'turno', texto: '¿Queres empanadas?' })
    assert.deepEqual(r.estado.historial, [{ quien: 'interlocutor', texto: '¿Queres empanadas?' }])
    const pedido = r.efectos.find((e) => e.tipo === 'pedirOpciones')
    assert.deepEqual(pedido, {
      tipo: 'pedirOpciones',
      pedidoId: 1,
      pedido: { historial: [], ultimoTurno: '¿Queres empanadas?', yaMostradas: [] },
    })
  })

  test('las opciones recibidas se muestran y el barrido arranca en la primera', () => {
    const e = conOpciones()
    assert.equal(e.conversacion, 'opciones')
    assert.equal(e.opciones.length, 4)
    assert.equal(e.iluminado, 0)
  })

  test('si falla el LLM queda sin conexion', () => {
    const e = aplicar(estadoInicial, { tipo: 'turno', texto: 'Hola' }, { tipo: 'opcionesFallaron', pedidoId: 1 }).estado
    assert.equal(e.conversacion, 'sinConexion')
  })

  test('las respuestas de un pedido viejo se descartan', () => {
    const e = aplicar(
      estadoInicial,
      { tipo: 'turno', texto: 'Uno' },
      { tipo: 'turno', texto: 'Dos' },
      { tipo: 'opcionesRecibidas', pedidoId: 1, opciones: OPCIONES },
    ).estado
    assert.equal(e.conversacion, 'pensando')
    assert.equal(e.opciones.length, 0)
  })

  test('un turno nuevo con opciones en pantalla las reemplaza y reinicia el barrido', () => {
    let e = iluminar(conOpciones(), 'opcion2')
    e = reducir(e, { tipo: 'turno', texto: '¿O preferis pizza?' }).estado
    assert.equal(e.conversacion, 'pensando')
    assert.equal(e.iluminado, 0)
    assert.equal(e.ultimoTurno, '¿O preferis pizza?')
  })

  test('con los ojos cerrados, el turno nuevo espera a que se abran', () => {
    let e = aplicar(conOpciones(), { tipo: 'ojos', cerrados: true, progreso: 0.3 }, { tipo: 'turno', texto: 'Otra cosa' }).estado
    assert.equal(e.conversacion, 'opciones')
    e = reducir(e, { tipo: 'ojos', cerrados: false, progreso: 0 }).estado
    assert.equal(e.conversacion, 'pensando')
    assert.equal(e.ultimoTurno, 'Otra cosa')
  })

  test('la transcripcion parcial se muestra y se limpia con el turno', () => {
    let e = reducir(estadoInicial, { tipo: 'parcial', texto: '¿Quer' }).estado
    assert.equal(e.parcial, '¿Quer')
    e = reducir(e, { tipo: 'turno', texto: '¿Queres?' }).estado
    assert.equal(e.parcial, null)
    assert.equal(e.turnoMostrado, '¿Queres?')
  })
})

describe('eleccion', () => {
  test('sin eventos de ojos (simulador), el parpadeo largo elige directo', () => {
    const r = reducir(conOpciones(), { tipo: 'parpadeoLargo' })
    assert.deepEqual(decires(r.efectos), [{ tipo: 'decir', texto: 'Dale, de carne.' }])
  })

  test('con los ojos cerrados la eleccion se confirma al abrirlos', () => {
    const cerrado = aplicar(conOpciones(), { tipo: 'ojos', cerrados: true, progreso: 1 }, { tipo: 'parpadeoLargo' })
    assert.equal(decires(cerrado.efectos).length, 0)
    const abierto = reducir(cerrado.estado, { tipo: 'ojos', cerrados: false, progreso: 0 })
    assert.deepEqual(decires(abierto.efectos), [{ tipo: 'decir', texto: 'Dale, de carne.' }])
  })

  test('elegir una opcion la agrega al historial y limpia las opciones', () => {
    const r = reducir(iluminar(conOpciones(), 'opcion1'), { tipo: 'parpadeoLargo' })
    assert.deepEqual(r.estado.historial.at(-1), { quien: 'usuario', texto: 'No, hoy no.' })
    assert.equal(r.estado.conversacion, 'escuchando')
    assert.equal(r.estado.opciones.length, 0)
    assert.equal(r.estado.ultimoTurno, null)
  })

  test('Si es respuesta: dice "Si.", entra al historial y limpia las opciones', () => {
    const r = reducir(iluminar(conOpciones(), 'si'), { tipo: 'parpadeoLargo' })
    assert.deepEqual(decires(r.efectos), [{ tipo: 'decir', texto: 'Sí.' }])
    assert.deepEqual(r.estado.historial.at(-1), { quien: 'usuario', texto: 'Sí.' })
    assert.equal(r.estado.opciones.length, 0)
  })

  test('No es respuesta: dice "No."', () => {
    const r = reducir(iluminar(conOpciones(), 'no'), { tipo: 'parpadeoLargo' })
    assert.deepEqual(decires(r.efectos), [{ tipo: 'decir', texto: 'No.' }])
  })

  test('Espera pide tiempo: mantiene opciones, reinicia barrido y no entra al historial', () => {
    const antes = iluminar(conOpciones(), 'espera')
    const r = reducir(antes, { tipo: 'parpadeoLargo' })
    assert.deepEqual(decires(r.efectos), [{ tipo: 'decir', texto: 'Esperá, dejame pensar.' }])
    assert.equal(r.estado.opciones.length, 4)
    assert.equal(r.estado.iluminado, 0)
    assert.deepEqual(r.estado.historial, antes.historial)
  })

  test('Otra pide opciones nuevas para el mismo turno con las ya mostradas', () => {
    const r = reducir(iluminar(conOpciones(), 'otra'), { tipo: 'parpadeoLargo' })
    const pedido = r.efectos.find((e) => e.tipo === 'pedirOpciones')
    assert.ok(pedido && pedido.tipo === 'pedirOpciones')
    assert.equal(pedido.pedido.ultimoTurno, '¿Queres empanadas?')
    assert.deepEqual(pedido.pedido.yaMostradas, OPCIONES.map((o) => o.texto))
    assert.deepEqual(pedido.pedido.historial, [])
    assert.equal(r.estado.conversacion, 'pensando')
  })

  test('varios Otra seguidos acumulan las ya mostradas', () => {
    let e = reducir(iluminar(conOpciones(), 'otra'), { tipo: 'parpadeoLargo' }).estado
    e = reducir(e, { tipo: 'opcionesRecibidas', pedidoId: 2, opciones: [{ intencion: 'otra', texto: 'Nueva' }] }).estado
    const r = reducir(iluminar(e, 'otra'), { tipo: 'parpadeoLargo' })
    const pedido = r.efectos.find((x) => x.tipo === 'pedirOpciones')
    assert.ok(pedido && pedido.tipo === 'pedirOpciones')
    assert.deepEqual(pedido.pedido.yaMostradas, [...OPCIONES.map((o) => o.texto), 'Nueva'])
  })

  test('Otra sin turno pide frases para iniciar charla', () => {
    const r = reducir(iluminar(estadoInicial, 'otra'), { tipo: 'parpadeoLargo' })
    const pedido = r.efectos.find((x) => x.tipo === 'pedirOpciones')
    assert.ok(pedido && pedido.tipo === 'pedirOpciones')
    assert.equal(pedido.pedido.ultimoTurno, null)
  })

  test('Otra con sin conexion reintenta', () => {
    let e = aplicar(estadoInicial, { tipo: 'turno', texto: 'Hola' }, { tipo: 'opcionesFallaron', pedidoId: 1 }).estado
    const r = reducir(iluminar(e, 'otra'), { tipo: 'parpadeoLargo' })
    e = r.estado
    assert.equal(e.conversacion, 'pensando')
    assert.ok(tipos(r.efectos).includes('pedirOpciones'))
  })
})

describe('habla', () => {
  test('despues de elegir, el barrido espera a que termine de hablar', () => {
    const r = reducir(conOpciones(), { tipo: 'parpadeoLargo' })
    assert.ok(tipos(r.efectos).includes('armarEsperaHabla'))
    const e = reducir(r.estado, { tipo: 'tick' }).estado
    assert.equal(e.iluminado, 0)
  })

  test('mientras habla, el barrido esta en pausa y los parpadeos se ignoran', () => {
    let e = aplicar(conOpciones(), { tipo: 'hablando', activo: true }, { tipo: 'tick' }).estado
    assert.equal(e.iluminado, 0)
    const r = reducir(e, { tipo: 'parpadeoLargo' })
    assert.equal(decires(r.efectos).length, 0)
    e = reducir(r.estado, { tipo: 'hablando', activo: false }).estado
    e = reducir(e, { tipo: 'tick' }).estado
    assert.equal(e.iluminado, 1)
  })

  test('si no llega hablando, el maximo de espera reanuda el barrido', () => {
    let e = reducir(iluminar(conOpciones(), 'espera'), { tipo: 'parpadeoLargo' }).estado
    e = aplicar(e, { tipo: 'finEsperaHabla' }, { tipo: 'tick' }).estado
    assert.equal(e.iluminado, 1)
  })
})

describe('urgencia', () => {
  test('elegir Urgencia dice el pedido de ayuda con urgencia', () => {
    const r = reducir(iluminar(conOpciones(), 'urgencia'), { tipo: 'parpadeoLargo' })
    assert.equal(r.estado.urgencia, true)
    assert.deepEqual(decires(r.efectos), [{ tipo: 'decir', texto: 'Necesito ayuda.', urgencia: true }])
  })

  test('el gesto de urgencia la dispara y anula la eleccion pendiente', () => {
    const r = aplicar(
      conOpciones(),
      { tipo: 'ojos', cerrados: true, progreso: 1 },
      { tipo: 'parpadeoLargo' },
      { tipo: 'gestoUrgencia' },
    )
    assert.equal(r.estado.urgencia, true)
    assert.equal(r.estado.eleccionPendiente, null)
    const abrir = reducir(r.estado, { tipo: 'ojos', cerrados: false, progreso: 0 })
    assert.equal(decires(abrir.efectos).length, 0)
  })

  test('el gesto de urgencia funciona aunque el barrido este en pausa', () => {
    let e = estadoInicial
    for (let i = 0; i < 15; i++) e = reducir(e, { tipo: 'tick' }).estado
    e = aplicar(e, { tipo: 'ojos', cerrados: true, progreso: 1 }, { tipo: 'gestoUrgencia' }).estado
    assert.equal(e.urgencia, true)
  })

  test('el gesto de urgencia se ignora si los ojos ya se abrieron', () => {
    const e = aplicar(
      estadoInicial,
      { tipo: 'ojos', cerrados: true, progreso: 0 },
      { tipo: 'ojos', cerrados: false, progreso: 0 },
      { tipo: 'gestoUrgencia' },
    ).estado
    assert.equal(e.urgencia, false)
  })

  test('durante la urgencia el barrido se detiene', () => {
    let e = reducir(iluminar(conOpciones(), 'urgencia'), { tipo: 'parpadeoLargo' }).estado
    const antes = e.iluminado
    e = reducir(e, { tipo: 'tick' }).estado
    assert.equal(e.iluminado, antes)
  })

  test('cortar la urgencia emite detenerUrgencia y reinicia el barrido', () => {
    const e = reducir(iluminar(conOpciones(), 'urgencia'), { tipo: 'parpadeoLargo' }).estado
    const r = reducir(e, { tipo: 'cortarUrgencia' })
    assert.equal(r.estado.urgencia, false)
    assert.ok(tipos(r.efectos).includes('detenerUrgencia'))
    assert.equal(r.estado.iluminado, 0)
  })

  test('un turno durante la urgencia entra al historial y las opciones se piden al cortarla', () => {
    let e = reducir(iluminar(estadoInicial, 'urgencia'), { tipo: 'parpadeoLargo' }).estado
    const r1 = reducir(e, { tipo: 'turno', texto: '¿Que te pasa?' })
    assert.ok(!tipos(r1.efectos).includes('pedirOpciones'))
    assert.deepEqual(r1.estado.historial.at(-1), { quien: 'interlocutor', texto: '¿Que te pasa?' })
    e = r1.estado
    const r2 = reducir(e, { tipo: 'cortarUrgencia' })
    const pedido = r2.efectos.find((x) => x.tipo === 'pedirOpciones')
    assert.ok(pedido && pedido.tipo === 'pedirOpciones')
    assert.equal(pedido.pedido.ultimoTurno, '¿Que te pasa?')
    assert.equal(r2.estado.conversacion, 'pensando')
  })
})
