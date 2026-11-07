// Correr: npx tsx --test src/nucleo/reductor.test.ts
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { Opcion } from '@/eventos'
import { elementosBarrido, estadoInicial, pedidoActual, reducir } from './reductor'
import type { Accion, Efecto, Estado, LecturaTurno } from './tipos'

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
    assert.deepEqual(nombres(estadoInicial), ['urgencia', 'si', 'no', 'espera', 'otra', 'deletrear'])
  })

  test('con opciones recorre opciones primero y despues la franja', () => {
    assert.deepEqual(nombres(conOpciones()), [
      'opcion0', 'opcion1', 'opcion2', 'opcion3', 'urgencia', 'si', 'no', 'espera', 'otra', 'deletrear',
    ])
  })

  test('mientras piensa el LLM, Otra se saltea', () => {
    const e = aplicar(estadoInicial, { tipo: 'turno', texto: 'Hola' }).estado
    assert.equal(e.conversacion, 'pensando')
    assert.deepEqual(nombres(e), ['urgencia', 'si', 'no', 'espera', 'deletrear'])
  })

  test('el tick avanza y vuelve a empezar al final', () => {
    let e = estadoInicial
    for (let i = 0; i < 6; i++) e = reducir(e, { tipo: 'tick' }).estado
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
    for (let i = 0; i < 18; i++) e = reducir(e, { tipo: 'tick' }).estado
    assert.equal(e.pausado, true)
    const despues = reducir(e, { tipo: 'tick' }).estado
    assert.equal(despues.iluminado, e.iluminado)
  })

  test('en pausa, un parpadeo largo reanuda sin elegir nada', () => {
    let e = estadoInicial
    for (let i = 0; i < 18; i++) e = reducir(e, { tipo: 'tick' }).estado
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

describe('ojos perdidos (vision deja de ver los ojos)', () => {
  test('si se pierden los ojos durante el cierre, se cancela la eleccion pendiente', () => {
    const cerrado = aplicar(conOpciones(), { tipo: 'ojos', cerrados: true, progreso: 1 }, { tipo: 'parpadeoLargo' })
    assert.ok(cerrado.estado.eleccionPendiente)
    const r = reducir(cerrado.estado, { tipo: 'ojos', cerrados: false, progreso: 0, perdido: true })
    assert.equal(decires(r.efectos).length, 0)
    assert.equal(r.estado.eleccionPendiente, null)
    assert.equal(r.estado.ojosCerrados, false)
  })

  test('perder los ojos desarma el gesto de urgencia', () => {
    const e = reducir(estadoInicial, { tipo: 'ojos', cerrados: true, progreso: 0 }).estado
    const r = reducir(e, { tipo: 'ojos', cerrados: false, progreso: 0, perdido: true })
    assert.ok(tipos(r.efectos).includes('desarmarGestoUrgencia'))
    assert.equal(reducir(r.estado, { tipo: 'gestoUrgencia' }).estado.urgencia, false)
  })

  test('perder los ojos libera el turno que esperaba', () => {
    const e = aplicar(conOpciones(), { tipo: 'ojos', cerrados: true, progreso: 0.3 }, { tipo: 'turno', texto: 'Otra cosa' }).estado
    const r = reducir(e, { tipo: 'ojos', cerrados: false, progreso: 0, perdido: true })
    assert.equal(r.estado.ultimoTurno, 'Otra cosa')
  })

  test('el barrido sigue despues de perder los ojos', () => {
    let e = aplicar(conOpciones(), { tipo: 'ojos', cerrados: true, progreso: 0.5 }, { tipo: 'ojos', cerrados: false, progreso: 0, perdido: true }).estado
    const antes = e.iluminado
    e = reducir(e, { tipo: 'tick' }).estado
    assert.equal(e.iluminado, antes + 1)
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

describe('parcial vacio', () => {
  test('un parcial vacio deja de mostrar el parcial (voz cerro o descarto el turno)', () => {
    const e = aplicar(estadoInicial, { tipo: 'parcial', texto: '¿Quer' }, { tipo: 'parcial', texto: '' }).estado
    assert.equal(e.parcial, null)
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
    assert.deepEqual(r.estado.historial.at(-1), { quien: 'usuario', texto: 'No, hoy no.', origen: 'opcion' })
    assert.equal(r.estado.conversacion, 'escuchando')
    assert.equal(r.estado.opciones.length, 0)
    assert.equal(r.estado.ultimoTurno, null)
  })

  test('Si es respuesta: dice "Si.", entra al historial y limpia las opciones', () => {
    const r = reducir(iluminar(conOpciones(), 'si'), { tipo: 'parpadeoLargo' })
    assert.deepEqual(decires(r.efectos), [{ tipo: 'decir', texto: 'Sí.' }])
    assert.deepEqual(r.estado.historial.at(-1), { quien: 'usuario', texto: 'Sí.', origen: 'fija' })
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

describe('origen en el historial', () => {
  test('una opcion elegida entra con origen opcion', () => {
    const r = reducir(conOpciones(), { tipo: 'parpadeoLargo' })
    assert.deepEqual(r.estado.historial.at(-1), { quien: 'usuario', texto: 'Dale, de carne.', origen: 'opcion' })
  })

  test('Si y No entran con origen fija', () => {
    const r = reducir(iluminar(conOpciones(), 'no'), { tipo: 'parpadeoLargo' })
    assert.deepEqual(r.estado.historial.at(-1), { quien: 'usuario', texto: 'No.', origen: 'fija' })
  })
})

describe('repetir', () => {
  // Elige Si y espera a que termine de hablar.
  function despuesDeDecirSi() {
    const e = reducir(iluminar(conOpciones(), 'si'), { tipo: 'parpadeoLargo' }).estado
    return aplicar(e, { tipo: 'hablando', activo: true }, { tipo: 'hablando', activo: false }).estado
  }

  test('antes de decir algo, Repetir no esta en el barrido', () => {
    assert.ok(!nombres(conOpciones()).includes('repetir'))
  })

  test('despues de decir algo, Repetir es el ultimo del barrido', () => {
    assert.equal(nombres(despuesDeDecirSi()).at(-1), 'repetir')
  })

  test('elegir Repetir emite repetir, no entra al historial y espera la habla', () => {
    const antes = iluminar(despuesDeDecirSi(), 'repetir')
    const r = reducir(antes, { tipo: 'parpadeoLargo' })
    assert.ok(tipos(r.efectos).includes('repetir'))
    assert.equal(decires(r.efectos).length, 0)
    assert.deepEqual(r.estado.historial, antes.historial)
    assert.equal(r.estado.esperandoHabla, true)
  })

  test('la sala puede repetir con un click, sin pasar por el barrido', () => {
    const r = reducir(despuesDeDecirSi(), { tipo: 'repetir' })
    assert.ok(tipos(r.efectos).includes('repetir'))
  })

  test('repetir de la sala se ignora mientras habla o si no hay nada dicho', () => {
    assert.equal(reducir(estadoInicial, { tipo: 'repetir' }).efectos.length, 0)
    const hablando = reducir(despuesDeDecirSi(), { tipo: 'hablando', activo: true }).estado
    assert.equal(reducir(hablando, { tipo: 'repetir' }).efectos.length, 0)
  })
})

describe('falsa alarma', () => {
  function enUrgencia() {
    return reducir(iluminar(estadoInicial, 'urgencia'), { tipo: 'parpadeoLargo' }).estado
  }

  test('el primer parpadeo largo pide confirmar', () => {
    const r = reducir(enUrgencia(), { tipo: 'parpadeoLargo' })
    assert.equal(r.estado.urgencia, true)
    assert.equal(r.estado.urgenciaPaso, 'confirmar')
    assert.ok(tipos(r.efectos).includes('armarConfirmacion'))
  })

  test('el segundo parpadeo largo corta la urgencia como falsa alarma', () => {
    const r = aplicar(enUrgencia(), { tipo: 'parpadeoLargo' }, { tipo: 'parpadeoLargo' })
    assert.equal(r.estado.urgencia, false)
    assert.ok(r.efectos.some((x) => x.tipo === 'detenerUrgencia' && x.falsaAlarma === true))
  })

  test('funciona aunque la voz este diciendo la alarma', () => {
    const e = reducir(enUrgencia(), { tipo: 'hablando', activo: true }).estado
    const r = aplicar(e, { tipo: 'parpadeoLargo' }, { tipo: 'parpadeoLargo' })
    assert.equal(r.estado.urgencia, false)
  })

  test('si no confirma a tiempo vuelve al primer paso', () => {
    const e = aplicar(enUrgencia(), { tipo: 'parpadeoLargo' }, { tipo: 'finConfirmacion' }).estado
    assert.equal(e.urgencia, true)
    assert.equal(e.urgenciaPaso, 'aviso')
  })

  test('cuando la corta el cuidador no es falsa alarma', () => {
    const r = reducir(enUrgencia(), { tipo: 'cortarUrgencia' })
    assert.ok(r.efectos.some((x) => x.tipo === 'detenerUrgencia' && !x.falsaAlarma))
  })
})

describe('fragmentos y lectura del turno', () => {
  const PARA_ROBERTO: LecturaTurno = { paraUsuario: 0.9, completo: 0.9, tipo: 'abierta' }
  const INCOMPLETO: LecturaTurno = { paraUsuario: 0.9, completo: 0.2, tipo: 'otro' }
  const RUIDO: LecturaTurno = { paraUsuario: 0.1, completo: 0.8, tipo: 'comentario' }

  // Manda un fragmento y le responde la lectura indicada.
  function fragmentoLeido(estado: Estado, texto: string, lectura: LecturaTurno) {
    const r1 = reducir(estado, { tipo: 'fragmento', texto })
    const r2 = reducir(r1.estado, { tipo: 'lectura', lecturaId: r1.estado.lecturaId, lectura })
    return { estado: r2.estado, efectos: [...r1.efectos, ...r2.efectos] }
  }

  test('un fragmento pide una lectura y no pide opciones todavia', () => {
    const r = reducir(estadoInicial, { tipo: 'fragmento', texto: 'qué querés comer' })
    const leer = r.efectos.find((x) => x.tipo === 'leerTurno')
    assert.ok(leer && leer.tipo === 'leerTurno')
    assert.equal(leer.texto, 'qué querés comer')
    assert.ok(!tipos(r.efectos).includes('pedirOpciones'))
    assert.equal(r.estado.acumulado, 'qué querés comer')
  })

  test('si la lectura dice completo y para el usuario, se acepta como turno y se piden opciones', () => {
    const r = fragmentoLeido(estadoInicial, 'qué querés comer', PARA_ROBERTO)
    const pedido = r.efectos.find((x) => x.tipo === 'pedirOpciones')
    assert.ok(pedido && pedido.tipo === 'pedirOpciones')
    assert.equal(pedido.pedido.ultimoTurno, 'qué querés comer')
    assert.equal(r.estado.acumulado, null)
    assert.equal(r.estado.tipoTurno, 'abierta')
  })

  test('si esta incompleto, el siguiente fragmento se suma al acumulado', () => {
    const e = fragmentoLeido(estadoInicial, 'Roberto', INCOMPLETO).estado
    assert.equal(e.acumulado, 'Roberto')
    const r = reducir(e, { tipo: 'fragmento', texto: 'querés un mate' })
    const leer = r.efectos.find((x) => x.tipo === 'leerTurno')
    assert.ok(leer && leer.tipo === 'leerTurno')
    assert.equal(leer.texto, 'Roberto querés un mate')
  })

  test('si no es para el usuario se descarta: opciones y barrido quedan igual', () => {
    const antes = iluminar(conOpciones(), 'opcion2')
    const r = fragmentoLeido(antes, 'el proyecto está bueno', RUIDO)
    assert.ok(!tipos(r.efectos).includes('pedirOpciones'))
    assert.equal(r.estado.opciones.length, 4)
    assert.equal(r.estado.iluminado, antes.iluminado)
    assert.equal(r.estado.descartado, 'el proyecto está bueno')
    assert.equal(r.estado.acumulado, null)
    assert.deepEqual(r.estado.historial, antes.historial)
  })

  test('una lectura vieja se ignora', () => {
    let e = reducir(estadoInicial, { tipo: 'fragmento', texto: 'Roberto' }).estado
    const vieja = e.lecturaId
    e = reducir(e, { tipo: 'fragmento', texto: 'querés un mate' }).estado
    const r = reducir(e, { tipo: 'lectura', lecturaId: vieja, lectura: PARA_ROBERTO })
    assert.ok(!tipos(r.efectos).includes('pedirOpciones'))
    assert.equal(r.estado.acumulado, 'Roberto querés un mate')
  })

  test('al vencer el acumulado, si era para el usuario se acepta aunque este incompleto', () => {
    const e = fragmentoLeido(estadoInicial, 'Roberto querés que te traiga', INCOMPLETO).estado
    const r = reducir(e, { tipo: 'venceAcumulado' })
    assert.ok(tipos(r.efectos).includes('pedirOpciones'))
  })

  test('al vencer el acumulado sin lectura todavia, no hace nada', () => {
    const e = reducir(estadoInicial, { tipo: 'fragmento', texto: 'hola' }).estado
    const r = reducir(e, { tipo: 'venceAcumulado' })
    assert.equal(r.efectos.length, 0)
    assert.equal(r.estado.acumulado, 'hola')
  })

  test('cada fragmento arma el vencimiento del acumulado', () => {
    const r = reducir(estadoInicial, { tipo: 'fragmento', texto: 'hola' })
    assert.ok(tipos(r.efectos).includes('armarVencimientoAcumulado'))
  })

  test('un fragmento nuevo borra el descartado y el parcial', () => {
    let e = fragmentoLeido(estadoInicial, 'eh', RUIDO).estado
    e = reducir(e, { tipo: 'parcial', texto: 'qué' }).estado
    e = reducir(e, { tipo: 'fragmento', texto: 'qué hora es' }).estado
    assert.equal(e.descartado, null)
    assert.equal(e.parcial, null)
  })

  test('en una pregunta de si o no, el barrido arranca por Si y No', () => {
    const SI_NO: LecturaTurno = { paraUsuario: 0.9, completo: 0.9, tipo: 'siNo' }
    let e = fragmentoLeido(estadoInicial, 'tenés frío', SI_NO).estado
    assert.deepEqual(nombres(e).slice(0, 2), ['si', 'no']) // mientras piensa el LLM
    e = reducir(e, { tipo: 'opcionesRecibidas', pedidoId: e.pedidoId, opciones: OPCIONES }).estado
    assert.deepEqual(nombres(e).slice(0, 3), ['si', 'no', 'opcion0'])
  })

  test('al responder se olvida el tipo de turno', () => {
    const SI_NO: LecturaTurno = { paraUsuario: 0.9, completo: 0.9, tipo: 'siNo' }
    const e = fragmentoLeido(estadoInicial, 'tenés frío', SI_NO).estado
    const r = reducir(e, { tipo: 'parpadeoLargo' }) // elige Si, que esta primero
    assert.deepEqual(decires(r.efectos), [{ tipo: 'decir', texto: 'Sí.' }])
    assert.equal(r.estado.tipoTurno, null)
  })

  test('durante la urgencia un fragmento entra directo como turno, sin lectura', () => {
    const e = reducir(iluminar(estadoInicial, 'urgencia'), { tipo: 'parpadeoLargo' }).estado
    const r = reducir(e, { tipo: 'fragmento', texto: 'qué te pasa' })
    assert.ok(!tipos(r.efectos).includes('leerTurno'))
    assert.deepEqual(r.estado.historial.at(-1), { quien: 'interlocutor', texto: 'qué te pasa' })
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

describe('deletrear', () => {
  // Elige Deletrear con 4 opciones en pantalla.
  function deletreando() {
    return reducir(iluminar(conOpciones(), 'deletrear'), { tipo: 'parpadeoLargo' }).estado
  }

  test('elegir Deletrear lo abre sin decir nada', () => {
    const antes = iluminar(conOpciones(), 'deletrear')
    const r = reducir(antes, { tipo: 'parpadeoLargo' })
    assert.equal(r.estado.deletreando, true)
    assert.equal(decires(r.efectos).length, 0)
    assert.deepEqual(r.estado.historial, antes.historial)
  })

  test('mientras deletrea, tick y parpadeo largo no mueven el barrido del nucleo', () => {
    const e = deletreando()
    const r = aplicar(e, { tipo: 'tick' }, { tipo: 'tick' }, { tipo: 'parpadeoLargo' })
    assert.equal(r.estado.iluminado, e.iluminado)
    assert.equal(r.estado.deletreando, true)
    assert.equal(decires(r.efectos).length, 0)
  })

  test('terminar el deletreo lo dice y entra al historial como deletreo', () => {
    const r = reducir(deletreando(), { tipo: 'terminarDeletreo', texto: 'Quiero ver a mi nieta.' })
    assert.deepEqual(decires(r.efectos).map((d) => d.texto), ['Quiero ver a mi nieta.'])
    assert.deepEqual(r.estado.historial.at(-1), { quien: 'usuario', texto: 'Quiero ver a mi nieta.', origen: 'deletreo' })
    assert.equal(r.estado.deletreando, false)
    assert.deepEqual(r.estado.opciones, [])
    assert.equal(r.estado.ultimoTurno, null)
  })

  test('cancelar vuelve al barrido principal sin decir nada', () => {
    const e = deletreando()
    const r = reducir(e, { tipo: 'cancelarDeletreo' })
    assert.equal(r.estado.deletreando, false)
    assert.equal(r.estado.iluminado, 0)
    assert.equal(decires(r.efectos).length, 0)
    assert.deepEqual(r.estado.opciones, e.opciones)
  })

  test('terminar o cancelar sin estar deletreando no hace nada', () => {
    const e = conOpciones()
    assert.deepEqual(reducir(e, { tipo: 'terminarDeletreo', texto: 'Hola' }), { estado: e, efectos: [] })
    assert.deepEqual(reducir(e, { tipo: 'cancelarDeletreo' }).efectos, [])
  })

  test('el gesto de urgencia anda mientras deletrea y al cortarla sigue deletreando', () => {
    const e = aplicar(deletreando(), { tipo: 'ojos', cerrados: true, progreso: 1 }, { tipo: 'gestoUrgencia' }).estado
    assert.equal(e.urgencia, true)
    const r = aplicar(e, { tipo: 'ojos', cerrados: false, progreso: 0 }, { tipo: 'cortarUrgencia' })
    assert.equal(r.estado.urgencia, false)
    assert.equal(r.estado.deletreando, true)
  })

  test('"Fue sin querer" sigue andando con dos parpadeos largos mientras deletrea', () => {
    const e = aplicar(deletreando(), { tipo: 'ojos', cerrados: true, progreso: 1 }, { tipo: 'gestoUrgencia' }).estado
    const r = aplicar(e, { tipo: 'ojos', cerrados: false, progreso: 0 }, { tipo: 'parpadeoLargo' }, { tipo: 'parpadeoLargo' })
    assert.equal(r.estado.urgencia, false)
    assert.ok(r.efectos.some((x) => x.tipo === 'detenerUrgencia' && x.falsaAlarma))
  })

  test('un turno nuevo mientras deletrea pide opciones sin sacarlo de deletrear', () => {
    const r = reducir(deletreando(), { tipo: 'turno', texto: '¿Y de postre?' })
    assert.equal(r.estado.deletreando, true)
    assert.ok(tipos(r.efectos).includes('pedirOpciones'))
    assert.equal(pedidoActual(r.estado).ultimoTurno, '¿Y de postre?')
  })

  test('el pedido para Deletrear es el del turno actual, sin las opciones ya mostradas', () => {
    const e = reducir(iluminar(conOpciones(), 'otra'), { tipo: 'parpadeoLargo' }).estado
    assert.ok(e.yaMostradas.length > 0)
    const pedido = pedidoActual(e)
    assert.equal(pedido.ultimoTurno, '¿Queres empanadas?')
    assert.deepEqual(pedido.historial, [])
    assert.deepEqual(pedido.yaMostradas, [])
  })
})
