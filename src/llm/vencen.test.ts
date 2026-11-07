// Hechos que vencen (#26): el agente devuelve la expresion temporal, el codigo calcula la fecha,
// y las opciones dejan de usar el hecho despues de su vencimiento.
// Correr: node --test 'src/llm/*.test.ts'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { LineaHistorial, PedidoOpciones } from '@/eventos'
import { crearAgenteMemoria } from './memoria.ts'
import { crearOpciones } from './opciones.ts'
import { crearCompletado } from './completado.ts'
import { crearAlmacenEnMemoria, memoriaVacia } from './almacen.ts'
import { PERFIL_ROBERTO } from './perfil-roberto.ts'
import type { ConversacionCerrada, Hecho, Memoria, Proveedor } from './tipos.ts'

const MIN = 60_000

function guionado(respuestas: string[]) {
  const prompts: { sistema: string; usuario: string }[] = []
  const proveedor: Proveedor = {
    nombre: 'guionado',
    async generar(p) {
      prompts.push(p)
      const r = respuestas.shift()
      if (r === undefined) throw new Error('el guion se quedo sin respuestas')
      return r
    },
  }
  return { proveedor, prompts }
}

const LINEAS: LineaHistorial[] = [{ quien: 'interlocutor', texto: 'Papa, te cuento que Laura se opera el jueves.' }]

// Una conversacion que termina a esta hora (UTC). Argentina es UTC-3.
const cerradaEl = (fin: string): ConversacionCerrada => ({
  inicio: new Date(Date.parse(fin) - 10 * MIN).toISOString(),
  fin,
  lineas: LINEAS,
  cercania: 'familia',
})

// Martes 10/11/2026, 15:00 en Argentina.
const MARTES_10 = '2026-11-10T18:00:00.000Z'
// Jueves 12/11/2026, 15:00 en Argentina.
const JUEVES_12 = '2026-11-12T18:00:00.000Z'

const SIN_TIEMPO = { expresion: '', forma: 'ninguna', diaSemana: '', dias: 0, dia: 0, mes: 0, anio: 0, hasta: false }
const tiempo = (t: Partial<typeof SIN_TIEMPO>) => ({ ...SIN_TIEMPO, ...t })

const candidato = (c: Record<string, unknown>) => ({
  accion: 'agregar',
  id: '',
  texto: 'Laura se opera de la rodilla.',
  linea: 1,
  interlocutor: '',
  importancia: 9,
  intimo: true,
  tipo: 'evento',
  tiempo: SIN_TIEMPO,
  ...c,
})

const respuesta = (hechos: unknown[]) => JSON.stringify({ hechos, resumen: 'Hablaron de la operacion de Laura.' })

// Corre el agente con un solo candidato y devuelve el hecho que quedo guardado.
async function guardar(c: Record<string, unknown>, fin = MARTES_10, memoria: Memoria = memoriaVacia()) {
  const { proveedor, prompts } = guionado([respuesta([candidato(c)])])
  const r = await crearAgenteMemoria({ proveedor })(cerradaEl(fin), memoria, PERFIL_ROBERTO)
  return { hecho: r.hechos[r.hechos.length - 1], memoria: r, prompts }
}

const OPCIONES = JSON.stringify({
  opciones: [
    { intencion: 'aceptar', texto: 'Si.' },
    { intencion: 'rechazar', texto: 'No.' },
    { intencion: 'preguntar', texto: '¿Que?' },
    { intencion: 'otra', texto: 'Otra.' },
  ],
  registro: 'casual',
  nuevaConversacion: false,
})

const pedido: PedidoOpciones = { historial: [], ultimoTurno: '¿Como andas?', yaMostradas: [] }

// El prompt de opciones que se arma con estos hechos a esta hora.
async function promptOpciones(hechos: Hecho[], ahora: string) {
  const { proveedor, prompts } = guionado([OPCIONES])
  const almacen = crearAlmacenEnMemoria({ memoria: { hechos } })
  await crearOpciones({ proveedor, almacen })(pedido, new Date(ahora))
  return prompts[0].usuario
}

// El prompt del completado que se arma con estos hechos a esta hora.
async function promptCompletado(hechos: Hecho[], ahora: string) {
  const { proveedor, prompts } = guionado([JSON.stringify({ frase: 'Que le vaya bien a Laura.' })])
  const almacen = crearAlmacenEnMemoria({ memoria: { hechos } })
  await crearCompletado({ proveedor, almacen })('que le', pedido, new Date(ahora))
  return prompts[0].usuario
}

describe('hechos que vencen: eventos con fecha', () => {
  test('"Laura se opera el jueves", dicho el martes 10/11, queda como evento del 12/11', async () => {
    const { hecho } = await guardar({ tiempo: tiempo({ expresion: 'el jueves', forma: 'diaSemana', diaSemana: 'jueves' }) })

    assert.equal(hecho.tipo, 'evento')
    assert.equal(hecho.expresionOriginal, 'el jueves')
    assert.equal(hecho.fechaEvento, '2026-11-12')
    // Vence al final del jueves en Argentina: 23:59:59.999 -03:00.
    assert.equal(hecho.validoHasta, '2026-11-13T02:59:59.999Z')
    assert.equal(hecho.estado, 'activo')
  })

  test('entra al prompt de opciones el jueves 12/11 y no el viernes 13/11', async () => {
    const { hecho } = await guardar({ tiempo: tiempo({ expresion: 'el jueves', forma: 'diaSemana', diaSemana: 'jueves' }) })

    assert.match(await promptOpciones([hecho], JUEVES_12), /Laura se opera de la rodilla/)
    // Jueves 23:30 en Argentina, ya viernes en UTC: todavia no vencio.
    assert.match(await promptOpciones([hecho], '2026-11-13T02:30:00.000Z'), /Laura se opera de la rodilla/)
    // Viernes 13/11, 9:00 en Argentina.
    assert.doesNotMatch(await promptOpciones([hecho], '2026-11-13T12:00:00.000Z'), /Laura se opera/)
  })

  test('el completado usa el mismo filtro y formato: entra el jueves 12/11 y no el viernes 13/11', async () => {
    const { hecho } = await guardar({ tiempo: tiempo({ expresion: 'el jueves', forma: 'diaSemana', diaSemana: 'jueves' }) })

    assert.match(await promptCompletado([hecho], MARTES_10), /Laura se opera de la rodilla\. \(el jueves 12\/11, en 2 dias\)/)
    assert.match(await promptCompletado([hecho], JUEVES_12), /Laura se opera de la rodilla/)
    assert.doesNotMatch(await promptCompletado([hecho], '2026-11-13T12:00:00.000Z'), /Laura se opera/)
  })

  test('vencer no es invalidar: el hecho sigue activo en la memoria', async () => {
    const { hecho } = await guardar({ tiempo: tiempo({ expresion: 'el jueves', forma: 'diaSemana', diaSemana: 'jueves' }) })
    const { proveedor } = guionado([OPCIONES])
    const almacen = crearAlmacenEnMemoria({ memoria: { hechos: [hecho] } })
    await crearOpciones({ proveedor, almacen })(pedido, new Date('2026-11-20T12:00:00.000Z'))
    assert.equal(almacen.memoria().hechos[0].estado, 'activo')
    assert.equal(almacen.memoria().hechos[0].fechaInvalidacion, null)
  })

  test('el prompt de opciones muestra la fecha absoluta y la distancia relativa', async () => {
    const { hecho } = await guardar({ tiempo: tiempo({ expresion: 'el jueves', forma: 'diaSemana', diaSemana: 'jueves' }) })

    assert.match(await promptOpciones([hecho], MARTES_10), /Laura se opera de la rodilla\. \(el jueves 12\/11, en 2 dias\)/)
    assert.match(await promptOpciones([hecho], '2026-11-11T18:00:00.000Z'), /\(el jueves 12\/11, mañana\)/)
    assert.match(await promptOpciones([hecho], JUEVES_12), /\(el jueves 12\/11, hoy\)/)
  })

  test('"mañana" dicho el 10/11 resuelve al 11/11', async () => {
    const { hecho } = await guardar({ tiempo: tiempo({ expresion: 'mañana', forma: 'relativo', dias: 1 }) })
    assert.equal(hecho.fechaEvento, '2026-11-11')
  })

  test('lo que se conto ayer como "mañana" aparece hoy como "hoy" en el prompt de opciones', async () => {
    const { hecho } = await guardar({ tiempo: tiempo({ expresion: 'mañana', forma: 'relativo', dias: 1 }) })
    // Miercoles 11/11, 15:00 en Argentina: el dia siguiente a la conversacion.
    const linea = (await promptOpciones([hecho], '2026-11-11T18:00:00.000Z')).split('\n').find((l) => l.includes('Laura se opera'))
    assert.equal(linea, '- Laura se opera de la rodilla. (el miércoles 11/11, hoy)')
  })

  test('los dias relativos tambien se restan: "ayer" dicho el 10/11 es el 9/11', async () => {
    const { hecho } = await guardar({ tiempo: tiempo({ expresion: 'ayer', forma: 'relativo', dias: -1 }) })
    assert.equal(hecho.fechaEvento, '2026-11-09')
  })

  test('el dia en Argentina manda: el martes 23:30 (miercoles en UTC) "mañana" es el miercoles', async () => {
    const { hecho } = await guardar(
      { tiempo: tiempo({ expresion: 'mañana', forma: 'relativo', dias: 1 }) },
      '2026-11-11T02:30:00.000Z',
    )
    assert.equal(hecho.fechaEvento, '2026-11-11')
  })

  test('"el jueves" dicho un jueves resuelve a ese mismo dia', async () => {
    const { hecho } = await guardar(
      { tiempo: tiempo({ expresion: 'el jueves', forma: 'diaSemana', diaSemana: 'jueves' }) },
      JUEVES_12,
    )
    assert.equal(hecho.fechaEvento, '2026-11-12')
  })

  test('una fecha sin año usa el año en curso, o el siguiente si ya paso', async () => {
    const noviembre = await guardar({ tiempo: tiempo({ expresion: 'el 20 de noviembre', forma: 'calendario', dia: 20, mes: 11 }) })
    assert.equal(noviembre.hecho.fechaEvento, '2026-11-20')
    const marzo = await guardar({ tiempo: tiempo({ expresion: 'el 5 de marzo', forma: 'calendario', dia: 5, mes: 3 }) })
    assert.equal(marzo.hecho.fechaEvento, '2027-03-05')
    const hoy = await guardar({ tiempo: tiempo({ expresion: 'el 10 de noviembre', forma: 'calendario', dia: 10, mes: 11 }) })
    assert.equal(hoy.hecho.fechaEvento, '2026-11-10')
  })

  test('un 29/2 sin año, dicho en un año que no es bisiesto, va al proximo 29/2 si esta dentro del año', async () => {
    // Dicho el 10/11/2027: el 29/2/2028 existe y esta a menos de un año.
    const { hecho } = await guardar(
      { tiempo: tiempo({ expresion: 'el 29 de febrero', forma: 'calendario', dia: 29, mes: 2 }) },
      '2027-11-10T18:00:00.000Z',
    )
    assert.equal(hecho.fechaEvento, '2028-02-29')
  })

  test('un "hasta" marca el fin de algo: no se guarda como el dia de un evento', async () => {
    const { hecho } = await guardar({
      texto: 'Laura esta de viaje.',
      tipo: 'evento',
      tiempo: tiempo({ expresion: 'hasta el domingo', forma: 'diaSemana', diaSemana: 'domingo', hasta: true }),
    })
    assert.equal(hecho.expresionOriginal, 'hasta el domingo')
    assert.equal(hecho.fechaEvento, undefined)
    // Igual vence al final del domingo 15/11.
    assert.equal(hecho.validoHasta, '2026-11-16T02:59:59.999Z')
  })

  test('una fecha imposible se descarta y el hecho se guarda igual, sin vencimiento', async () => {
    const { hecho } = await guardar({ tiempo: tiempo({ expresion: 'el 31 de febrero', forma: 'calendario', dia: 31, mes: 2 }) })
    assert.equal(hecho.texto, 'Laura se opera de la rodilla.')
    assert.equal(hecho.tipo, 'evento')
    assert.equal(hecho.expresionOriginal, 'el 31 de febrero')
    assert.equal(hecho.fechaEvento, undefined)
    assert.equal(hecho.validoHasta, undefined)
    // Sin vencimiento: sigue entrando al prompt mucho despues.
    assert.match(await promptOpciones([hecho], '2027-06-01T12:00:00.000Z'), /Laura se opera de la rodilla\.$/m)
  })

  test('una fecha a mas de un año de la referencia se descarta', async () => {
    const enDias = await guardar({ tiempo: tiempo({ expresion: 'en 400 dias', forma: 'relativo', dias: 400 }) })
    assert.equal(enDias.hecho.fechaEvento, undefined)
    const conAnio = await guardar({ tiempo: tiempo({ expresion: 'el 1 de enero de 2030', forma: 'calendario', dia: 1, mes: 1, anio: 2030 }) })
    assert.equal(conAnio.hecho.fechaEvento, undefined)
    const diaRaro = await guardar({ tiempo: tiempo({ expresion: 'el jueves', forma: 'diaSemana', diaSemana: 'juernes' }) })
    assert.equal(diaRaro.hecho.fechaEvento, undefined)
    assert.equal(diaRaro.hecho.validoHasta, undefined)
  })

  test('un hecho sin expresion temporal no tiene fecha ni vencimiento', async () => {
    const { hecho } = await guardar({ tipo: 'estable', texto: 'Roberto es hincha de River.', tiempo: SIN_TIEMPO })
    assert.equal(hecho.tipo, 'estable')
    assert.equal(hecho.expresionOriginal, undefined)
    assert.equal(hecho.fechaEvento, undefined)
    assert.equal(hecho.validoHasta, undefined)
  })

  test('una respuesta sin tipo ni tiempo se guarda como antes', async () => {
    const { proveedor } = guionado([
      respuesta([{ accion: 'agregar', id: '', texto: 'Roberto es hincha de River.', linea: 1, interlocutor: '', importancia: 5, intimo: false }]),
    ])
    const r = await crearAgenteMemoria({ proveedor })(cerradaEl(MARTES_10), memoriaVacia(), PERFIL_ROBERTO)
    assert.equal(r.hechos[0].texto, 'Roberto es hincha de River.')
    assert.equal(r.hechos[0].tipo, undefined)
    assert.equal(r.hechos[0].fechaEvento, undefined)
  })

  test('al actualizar un hecho, el nuevo trae sus propios campos de tiempo', async () => {
    const { memoria: m1, hecho: viejo } = await guardar({
      tiempo: tiempo({ expresion: 'el jueves', forma: 'diaSemana', diaSemana: 'jueves' }),
    })
    const { hecho: nuevo } = await guardar(
      {
        accion: 'actualizar',
        id: viejo.id,
        texto: 'La operacion de Laura se paso al lunes.',
        tiempo: tiempo({ expresion: 'el lunes', forma: 'diaSemana', diaSemana: 'lunes' }),
      },
      '2026-11-11T18:00:00.000Z',
      m1,
    )
    assert.equal(nuevo.reemplazaA, viejo.id)
    assert.equal(nuevo.expresionOriginal, 'el lunes')
    assert.equal(nuevo.fechaEvento, '2026-11-16')
  })

  test('el prompt del agente de memoria lleva la fecha y el dia de la semana del cierre', async () => {
    const { prompts } = await guardar({})
    assert.match(prompts[0].usuario, /martes 10\/11\/2026/)
  })

  test('el agente de memoria sigue recibiendo los hechos vencidos, marcados como vencidos', async () => {
    const { memoria: m1 } = await guardar({ tiempo: tiempo({ expresion: 'el jueves', forma: 'diaSemana', diaSemana: 'jueves' }) })
    // La conversacion siguiente cierra el viernes 13/11.
    const { prompts } = await guardar({ texto: 'Laura ya se opero y esta bien.' }, '2026-11-13T18:00:00.000Z', m1)
    const linea = prompts[0].usuario.split('\n').find((l) => l.includes('Laura se opera de la rodilla'))
    assert.ok(linea, 'el hecho vencido llega al agente')
    assert.match(linea, /vencido/)
    assert.match(linea, /12\/11/)
  })

  test('el esquema de salida del agente pide el tipo y el tiempo estructurado de cada hecho', async () => {
    const { SALIDA_MEMORIA } = await import('./memoria.ts')
    type Objeto = {
      properties: Record<string, Objeto & { enum?: string[]; items?: Objeto }>
      required: string[]
      additionalProperties: boolean
    }
    const item = (SALIDA_MEMORIA.esquema as unknown as Objeto).properties.hechos.items!
    assert.ok(item.required.includes('tipo'))
    assert.ok(item.required.includes('tiempo'))
    assert.deepEqual(item.properties.tipo.enum, ['estable', 'estado', 'evento'])
    // Todas las formas de la spec: dia de la semana, relativo, calendario, ninguna, y "hasta" una de ellas.
    assert.deepEqual(item.properties.tiempo.properties.forma.enum, ['ninguna', 'diaSemana', 'relativo', 'calendario'])
    assert.ok(item.properties.tiempo.properties.hasta)
    // Los dos proveedores piden salida estricta: todo requerido y sin propiedades extra.
    const t = item.properties.tiempo
    assert.equal(t.additionalProperties, false)
    assert.deepEqual([...t.required].sort(), Object.keys(t.properties).sort())
  })

  test('una memoria vieja sin los campos nuevos se lee y entra al prompt como hoy', async () => {
    const viejo: Hecho = {
      id: 'h1',
      texto: 'Roberto es hincha de River.',
      origen: 'interlocutor',
      interlocutor: null,
      importancia: 5,
      fecha: '2026-01-01T10:00:00.000Z',
      estado: 'activo',
      fechaInvalidacion: null,
      intimo: false,
    }
    assert.match(await promptOpciones([viejo], '2030-01-01T12:00:00.000Z'), /^- Roberto es hincha de River\.$/m)
  })
})

describe('hechos que vencen: estados y estables', () => {
  const VIAJE = { texto: 'Laura esta de viaje.', tipo: 'estado' }
  const hastaElDomingo = tiempo({ expresion: 'hasta el domingo', forma: 'diaSemana', diaSemana: 'domingo', hasta: true })

  test('"Laura esta de viaje hasta el domingo", dicho el martes 10/11, vale hasta el final del domingo 15/11', async () => {
    const { hecho } = await guardar({ ...VIAJE, tiempo: hastaElDomingo })
    assert.equal(hecho.tipo, 'estado')
    assert.equal(hecho.expresionOriginal, 'hasta el domingo')
    assert.equal(hecho.fechaEvento, undefined)
    assert.equal(hecho.validoHasta, '2026-11-16T02:59:59.999Z')
  })

  test('un estado "hasta el domingo" entra al prompt de opciones el domingo y no el lunes', async () => {
    const { hecho } = await guardar({ ...VIAJE, tiempo: hastaElDomingo })
    // Domingo 15/11, 15:00 y 23:30 en Argentina.
    assert.match(await promptOpciones([hecho], '2026-11-15T18:00:00.000Z'), /Laura esta de viaje/)
    assert.match(await promptOpciones([hecho], '2026-11-16T02:30:00.000Z'), /Laura esta de viaje/)
    // Lunes 16/11, 9:00 en Argentina.
    assert.doesNotMatch(await promptOpciones([hecho], '2026-11-16T12:00:00.000Z'), /Laura esta de viaje/)
  })

  test('un "hasta" con fecha del calendario usa la misma cuenta: "hasta el 20 de noviembre"', async () => {
    const { hecho } = await guardar({
      ...VIAJE,
      tiempo: tiempo({ expresion: 'hasta el 20 de noviembre', forma: 'calendario', dia: 20, mes: 11, hasta: true }),
    })
    assert.equal(hecho.validoHasta, '2026-11-21T02:59:59.999Z')
  })

  test('un "hasta" con fecha imposible se descarta: el estado se guarda sin fin y sigue entrando', async () => {
    const { hecho } = await guardar({
      ...VIAJE,
      tiempo: tiempo({ expresion: 'hasta el 31 de febrero', forma: 'calendario', dia: 31, mes: 2, hasta: true }),
    })
    assert.equal(hecho.texto, 'Laura esta de viaje.')
    assert.equal(hecho.expresionOriginal, 'hasta el 31 de febrero')
    assert.equal(hecho.validoHasta, undefined)
    assert.match(await promptOpciones([hecho], '2027-06-01T12:00:00.000Z'), /Laura esta de viaje/)
  })

  test('un estado sin fin conocido sigue entrando al prompt de opciones', async () => {
    const { hecho } = await guardar({ ...VIAJE, tiempo: SIN_TIEMPO })
    assert.equal(hecho.validoHasta, undefined)
    assert.match(await promptOpciones([hecho], '2027-06-01T12:00:00.000Z'), /Laura esta de viaje/)
  })

  test('un estado que empieza en una fecha no vence ese dia: el momento no es su fin', async () => {
    const { hecho } = await guardar({
      ...VIAJE,
      tiempo: tiempo({ expresion: 'desde el jueves', forma: 'diaSemana', diaSemana: 'jueves' }),
    })
    assert.equal(hecho.validoHasta, undefined)
    assert.match(await promptOpciones([hecho], '2026-11-20T12:00:00.000Z'), /Laura esta de viaje/)
  })

  test('un estable nunca vence, aunque el agente le ponga un "hasta"', async () => {
    const { hecho } = await guardar({ texto: 'Roberto es hincha de River.', tipo: 'estable', tiempo: hastaElDomingo })
    assert.equal(hecho.tipo, 'estable')
    assert.equal(hecho.validoHasta, undefined)
    assert.match(await promptOpciones([hecho], '2030-01-01T12:00:00.000Z'), /Roberto es hincha de River/)
  })

  test('al actualizar un estado con fin por uno sin fin, el nuevo no hereda el vencimiento', async () => {
    const { memoria: m1, hecho: viejo } = await guardar({ ...VIAJE, tiempo: hastaElDomingo })
    const { hecho: nuevo } = await guardar(
      { ...VIAJE, accion: 'actualizar', id: viejo.id, texto: 'Laura se quedo a vivir afuera.', tiempo: SIN_TIEMPO },
      '2026-11-11T18:00:00.000Z',
      m1,
    )
    assert.equal(nuevo.reemplazaA, viejo.id)
    assert.equal(nuevo.expresionOriginal, undefined)
    assert.equal(nuevo.validoHasta, undefined)
    assert.match(await promptOpciones([nuevo], '2026-11-20T12:00:00.000Z'), /Laura se quedo a vivir afuera/)
  })
})
