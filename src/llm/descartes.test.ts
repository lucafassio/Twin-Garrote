// Correr: node --test 'src/llm/*.test.ts'
// Invalidar un hecho descarta lo que lo cita (#40): bloques de dia, semana y mes y la propuesta de
// huella pendiente se descartan y se rehacen sin el; la huella aceptada queda para revisar.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { LineaHistorial } from '@/eventos'
import { crearDisparadorMemoria } from './memoria.ts'
import { crearOpciones } from './opciones.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import { invalidarHecho } from './controles-memoria.ts'
import { aceptarHuella, descartarAceptada, descartarHuella, reaceptarHuella } from './huella.ts'
import type { Almacen, Bloque, ConversacionCerrada, Hecho, Memoria, NivelRollup, Proveedor, ResumenConversacion } from './tipos.ts'

// Martes 10/11/2026, 9 de la manana en Argentina.
const MARTES_10 = new Date('2026-11-10T12:00:00Z')
const INVALIDADO_EL = new Date('2026-11-10T11:00:00Z')

const hecho = (h: Partial<Hecho> & { id: string }): Hecho => ({
  texto: `hecho ${h.id}`,
  origen: 'interlocutor',
  interlocutor: null,
  importancia: 7,
  fecha: '2026-11-06T20:00:00.000Z',
  estado: 'activo',
  fechaInvalidacion: null,
  intimo: false,
  ...h,
})

const resumen = (id: string, fin: string): ResumenConversacion => ({
  id,
  inicio: new Date(Date.parse(fin) - 10 * 60_000).toISOString(),
  fin,
  resumen: `resumen ${id}`,
})

// Dia de Argentina que empieza en `fecha` (YYYY-MM-DD).
const dia = (fecha: string, fuentes: string[]): Bloque => {
  const desde = new Date(`${fecha}T03:00:00.000Z`)
  return {
    id: `dia-${fecha}`,
    desde: desde.toISOString(),
    hasta: new Date(desde.getTime() + 24 * 3_600_000).toISOString(),
    texto: `DIA-${fecha}`,
    fuentes,
  }
}

const SEMANA_26: Bloque = { id: 'semana-2026-10-26', desde: '2026-10-26T03:00:00.000Z', hasta: '2026-11-02T03:00:00.000Z', texto: 'SEMANA-OCTUBRE', fuentes: ['dia-2026-10-30'] }
const SEMANA_2: Bloque = { id: 'semana-2026-11-02', desde: '2026-11-02T03:00:00.000Z', hasta: '2026-11-09T03:00:00.000Z', texto: 'SEMANA-DEL-2', fuentes: ['dia-2026-11-04', 'dia-2026-11-05', 'dia-2026-11-06'] }
const MES_OCTUBRE: Bloque = { id: 'mes-2026-10-01', desde: '2026-10-01T03:00:00.000Z', hasta: '2026-11-01T03:00:00.000Z', texto: 'MES-OCTUBRE', fuentes: ['semana-2026-10-26'] }

// h-laura salio de la conversacion del viernes a la tarde (r-vie, mismo fin). h-menor, de la del
// jueves: no tiene importancia para entrar a un bloque, solo esta en su resumen.
const MEMORIA: Partial<Memoria> = {
  hechos: [
    hecho({ id: 'h-laura', texto: 'Laura se opera el jueves' }),
    hecho({ id: 'h-vie-noche', texto: 'Vino Marta a cenar', fecha: '2026-11-06T23:00:00.000Z' }),
    hecho({ id: 'h-menor', importancia: 4, fecha: '2026-11-05T20:00:00.000Z' }),
    hecho({ id: 'h-river', texto: 'Es hincha de River', importancia: 9, fecha: '2026-11-04T20:00:00.000Z' }),
  ],
  resumenes: [
    resumen('r-mie', '2026-11-04T20:00:00.000Z'),
    resumen('r-jue', '2026-11-05T20:00:00.000Z'),
    resumen('r-vie', '2026-11-06T20:00:00.000Z'),
    resumen('r-vie-noche', '2026-11-06T23:00:00.000Z'),
    resumen('r-lun', '2026-11-09T20:00:00.000Z'),
  ],
  niveles: {
    dia: [
      dia('2026-10-30', ['h-otro']),
      dia('2026-11-04', ['r-mie', 'h-river']),
      dia('2026-11-05', ['r-jue']),
      dia('2026-11-06', ['r-vie', 'r-vie-noche', 'h-laura', 'h-vie-noche']),
      dia('2026-11-09', ['r-lun']),
    ],
    semana: [SEMANA_26, SEMANA_2],
    mes: [MES_OCTUBRE],
  },
  huellaAprendida: {
    propuesta: { texto: 'PROPUESTA', fuentes: ['semana-2026-11-02', 'h-river'], fecha: '2026-11-09T12:00:00.000Z' },
    aceptada: { texto: 'ACEPTADA', fuentes: ['h-laura', 'h-river'], fechaAceptacion: '2026-11-01T12:00:00.000Z' },
    ultimaPropuesta: '2026-11-09T12:00:00.000Z',
  },
}

const LINEAS: LineaHistorial[] = [
  { quien: 'interlocutor', texto: 'Buen dia, papa.' },
  { quien: 'usuario', texto: 'Buen dia', origen: 'opcion' },
]

const agenteMudo: Proveedor = {
  nombre: 'agente',
  async generar() {
    return JSON.stringify({ hechos: [], resumen: 'Se saludaron.' })
  },
}

const respuesta = (texto: string, fuentes: string[]) => JSON.stringify({ texto, fuentes })

// Un paso del guion: la respuesta, un error, o algo que pasa mientras el modelo piensa.
type Paso = string | Error | ((almacen: Almacen) => Promise<string>)

// Rollups guionados por nivel; sin guion, el nivel no resume nada.
function armar(guion: Partial<Record<NivelRollup, Paso[]>> = {}, memoria: Partial<Memoria> = MEMORIA) {
  const almacen = crearAlmacenEnMemoria({ memoria: structuredClone(memoria) })
  const pedidos: { nivel: NivelRollup; usuario: string }[] = []
  const proveedorRollup = (nivel: NivelRollup): Proveedor => ({
    nombre: `rollup-${nivel}`,
    async generar({ usuario }) {
      pedidos.push({ nivel, usuario })
      const paso = guion[nivel]?.shift() ?? respuesta('', [])
      if (paso instanceof Error) throw paso
      return typeof paso === 'function' ? paso(almacen) : paso
    },
  })
  const errores: unknown[] = []
  let ahora = MARTES_10
  const disparador = crearDisparadorMemoria({
    proveedor: agenteMudo,
    almacen,
    proveedorRollup,
    reloj: () => ahora,
    alFallarNivel: (e) => errores.push(e),
  })
  return {
    almacen,
    disparador,
    pedidos,
    errores,
    async cerrar(fin: Date) {
      ahora = new Date(fin.getTime() + 5 * 60_000)
      const cerrada: ConversacionCerrada = {
        inicio: new Date(fin.getTime() - 10 * 60_000).toISOString(),
        fin: fin.toISOString(),
        lineas: LINEAS,
        cercania: 'familia',
      }
      disparador.disparar(cerrada)
      await disparador.listo()
    },
  }
}

const bloquePorId = (m: Memoria, id: string) => {
  const n = m.niveles!
  return [...n.dia, ...n.semana, ...n.mes].find((b) => b.id === id)
}

describe('invalidar un hecho descarta lo que lo cita', () => {
  test('descarta los bloques que lo citan, directo o por un bloque de abajo, y la propuesta pendiente', async () => {
    const { almacen } = armar()
    await invalidarHecho(almacen, 'h-laura', INVALIDADO_EL)
    const m = almacen.memoria()

    for (const id of ['dia-2026-11-06', 'semana-2026-11-02']) {
      assert.equal(bloquePorId(m, id)?.descartado, INVALIDADO_EL.toISOString(), id)
    }
    for (const id of ['dia-2026-10-30', 'dia-2026-11-04', 'dia-2026-11-05', 'dia-2026-11-09', 'semana-2026-10-26', 'mes-2026-10-01']) {
      assert.equal(bloquePorId(m, id)?.descartado, undefined, id)
    }
    // La propuesta citaba la semana descartada.
    assert.equal(m.huellaAprendida?.propuesta?.descartado, INVALIDADO_EL.toISOString())
  })

  test('descarta tambien lo que solo cita el resumen de su conversacion, y sube hasta el mes', async () => {
    const memoria = structuredClone(MEMORIA)
    // Una semana de octubre que cita el dia del jueves, y el mes que cita esa semana.
    memoria.niveles!.semana[0] = { ...SEMANA_26, fuentes: ['dia-2026-11-05'] }
    const { almacen } = armar({}, memoria)
    await invalidarHecho(almacen, 'h-menor', INVALIDADO_EL)
    const m = almacen.memoria()

    for (const id of ['dia-2026-11-05', 'semana-2026-11-02', 'semana-2026-10-26', 'mes-2026-10-01']) {
      assert.ok(bloquePorId(m, id)?.descartado, id)
    }
    assert.equal(bloquePorId(m, 'dia-2026-11-06')?.descartado, undefined)
  })

  test('la huella aceptada que lo cita queda para revisar, no se borra', async () => {
    const { almacen } = armar()
    await invalidarHecho(almacen, 'h-laura', INVALIDADO_EL)
    const aceptada = almacen.memoria().huellaAprendida?.aceptada
    assert.equal(aceptada?.texto, 'ACEPTADA')
    assert.equal(aceptada?.paraRevisar, INVALIDADO_EL.toISOString())
  })

  test('lo que no lo cita no se toca', async () => {
    const { almacen } = armar()
    await invalidarHecho(almacen, 'h-vie-noche', INVALIDADO_EL)
    const m = almacen.memoria()
    // Citado por el dia del viernes (y por ahi la semana y la propuesta); no por la aceptada.
    assert.ok(bloquePorId(m, 'dia-2026-11-06')?.descartado)
    assert.equal(m.huellaAprendida?.aceptada?.paraRevisar, undefined)
    assert.equal(bloquePorId(m, 'dia-2026-11-04')?.descartado, undefined)
  })
})

describe('lo descartado se rehace sin el hecho invalidado', () => {
  test('en el proximo cierre se rehacen el dia, la semana y la propuesta, y no lo citan', async () => {
    const { almacen, pedidos, errores, cerrar } = armar({
      dia: [respuesta('El viernes vino Marta.', ['r-vie-noche', 'h-vie-noche', 'h-laura'])],
      semana: [respuesta('La semana de Roberto.', ['dia-2026-11-04', 'dia-2026-11-06'])],
      huella: [respuesta('- Le gusta River', ['h-river'])],
    })
    await invalidarHecho(almacen, 'h-laura', INVALIDADO_EL)
    await cerrar(MARTES_10)
    assert.deepEqual(errores, [])

    assert.deepEqual(pedidos.map((p) => p.nivel), ['dia', 'semana', 'huella'])
    for (const p of pedidos) {
      assert.ok(!p.usuario.includes('h-laura'), `${p.nivel} no ve el hecho`)
      assert.ok(!p.usuario.includes('[r-vie]'), `${p.nivel} no ve su resumen`)
    }
    // La huella no se arma sobre la aceptada en revision.
    assert.ok(!pedidos[2].usuario.includes('ACEPTADA'))

    const m = almacen.memoria()
    const viernes = bloquePorId(m, 'dia-2026-11-06')!
    assert.equal(viernes.descartado, undefined)
    assert.equal(viernes.texto, 'El viernes vino Marta.')
    assert.deepEqual(viernes.fuentes, ['r-vie-noche', 'h-vie-noche']) // la fuente invalidada no vale
    const semana = bloquePorId(m, 'semana-2026-11-02')!
    assert.equal(semana.descartado, undefined)
    assert.equal(semana.texto, 'La semana de Roberto.')
    assert.equal(m.niveles!.dia.filter((b) => b.id === 'dia-2026-11-06').length, 1)
    assert.equal(m.huellaAprendida?.propuesta?.texto, '- Le gusta River')
    assert.equal(m.huellaAprendida?.propuesta?.descartado, undefined)
  })

  test('si la propuesta rehecha no trae nada nuevo, la descartada se va y no se vuelve a pedir', async () => {
    const { almacen, pedidos, cerrar } = armar()
    await invalidarHecho(almacen, 'h-laura', INVALIDADO_EL)
    await cerrar(MARTES_10)
    assert.equal(almacen.memoria().huellaAprendida?.propuesta, undefined)
    await cerrar(new Date(MARTES_10.getTime() + 3_600_000))
    assert.equal(pedidos.filter((p) => p.nivel === 'huella').length, 1)
  })

  test('un descartado que ya no tiene nada que resumir se borra en vez de quedar colgado', async () => {
    const { almacen, cerrar } = armar()
    await invalidarHecho(almacen, 'h-menor', INVALIDADO_EL) // el jueves solo tenia r-jue
    await cerrar(MARTES_10)
    assert.equal(bloquePorId(almacen.memoria(), 'dia-2026-11-05'), undefined)
  })

  test('si se invalida mientras el modelo arma un bloque, el bloque se guarda descartado', async () => {
    const memoria = structuredClone(MEMORIA)
    memoria.niveles!.dia = memoria.niveles!.dia.filter((b) => b.id !== 'dia-2026-11-09') // el lunes falta
    memoria.hechos!.push(hecho({ id: 'h-lun', fecha: '2026-11-09T20:00:00.000Z' }))
    const { almacen, errores, cerrar } = armar(
      {
        dia: [
          async (a) => {
            await invalidarHecho(a, 'h-lun', INVALIDADO_EL)
            return respuesta('El lunes...', ['r-lun'])
          },
        ],
      },
      memoria,
    )
    await cerrar(MARTES_10)
    assert.deepEqual(errores, [])
    assert.ok(bloquePorId(almacen.memoria(), 'dia-2026-11-09')?.descartado)
  })

  test('si se invalida mientras el modelo arma la propuesta, la propuesta se guarda descartada', async () => {
    const memoria = structuredClone(MEMORIA)
    delete memoria.huellaAprendida!.propuesta
    const { almacen, disparador } = armar(
      {
        huella: [
          async (a) => {
            await invalidarHecho(a, 'h-river', INVALIDADO_EL)
            return respuesta('- Le gusta el futbol', ['mes-2026-10-01'])
          },
        ],
      },
      memoria,
    )
    assert.equal(await disparador.proponerHuellaAhora(), null)
    assert.ok(almacen.memoria().huellaAprendida?.propuesta?.descartado)
  })

  test('si falla rehacer un periodo viejo, Consolidar ahora igual arma lo de hoy', async () => {
    const { almacen, disparador } = armar({
      dia: [new Error('se cayo el modelo')],
      semana: [respuesta('Esta semana.', ['dia-2026-11-09'])],
    })
    await invalidarHecho(almacen, 'h-laura', INVALIDADO_EL)
    const { semana } = await disparador.consolidarAhora()
    assert.equal(semana?.texto, 'Esta semana.')
    assert.ok(bloquePorId(almacen.memoria(), 'dia-2026-11-06')?.descartado, 'el viejo espera al proximo cierre')
  })

  test('Consolidar ahora rehace los bloques descartados de periodos ya cerrados', async () => {
    const { almacen, disparador } = armar({
      dia: [respuesta('El viernes vino Marta.', ['r-vie-noche'])],
      semana: [respuesta('La semana de Roberto.', ['dia-2026-11-04']), respuesta('Esta semana.', ['dia-2026-11-09'])],
    })
    await invalidarHecho(almacen, 'h-laura', INVALIDADO_EL)
    await disparador.consolidarAhora()
    const m = almacen.memoria()
    assert.equal(bloquePorId(m, 'dia-2026-11-06')?.texto, 'El viernes vino Marta.')
    assert.equal(bloquePorId(m, 'dia-2026-11-06')?.descartado, undefined)
    assert.equal(bloquePorId(m, 'semana-2026-11-02')?.texto, 'La semana de Roberto.')
    assert.equal(bloquePorId(m, 'semana-2026-11-09')?.texto, 'Esta semana.')
  })
})

describe('propuesta descartada y huella para revisar', () => {
  test('una propuesta descartada por invalidar no se puede aceptar ni descartar', async () => {
    const { almacen } = armar()
    await invalidarHecho(almacen, 'h-laura', INVALIDADO_EL)
    assert.equal(await aceptarHuella(almacen, MARTES_10), null)
    assert.equal(await descartarHuella(almacen), false)
    assert.equal(almacen.memoria().huellaAprendida?.descartadas, undefined)
  })

  test('volver a aceptarla la saca de revision; descartarla la borra y no se vuelve a proponer igual', async () => {
    const a = armar()
    assert.equal(await reaceptarHuella(a.almacen, MARTES_10), null) // no estaba para revisar
    await invalidarHecho(a.almacen, 'h-laura', INVALIDADO_EL)
    const vuelta = await reaceptarHuella(a.almacen, MARTES_10)
    assert.equal(vuelta?.paraRevisar, undefined)
    assert.equal(vuelta?.fechaAceptacion, MARTES_10.toISOString())
    assert.equal(a.almacen.memoria().huellaAprendida?.aceptada?.paraRevisar, undefined)

    const b = armar()
    assert.equal(await descartarAceptada(b.almacen), false)
    await invalidarHecho(b.almacen, 'h-laura', INVALIDADO_EL)
    assert.equal(await descartarAceptada(b.almacen), true)
    const huella = b.almacen.memoria().huellaAprendida
    assert.equal(huella?.aceptada, undefined)
    assert.deepEqual(huella?.descartadas, ['ACEPTADA'])
  })
})

describe('lo descartado no entra al prompt de opciones', () => {
  const CUATRO = JSON.stringify({
    opciones: [
      { intencion: 'aceptar', texto: 'Si, dale.' },
      { intencion: 'rechazar', texto: 'No, gracias.' },
      { intencion: 'preguntar', texto: '¿Cuando?' },
      { intencion: 'otra', texto: 'Dejame pensarlo.' },
    ],
    registro: 'casual',
    nuevaConversacion: false,
  })

  async function prompt(almacen: ReturnType<typeof armar>['almacen'], ahora: Date) {
    const usuarios: string[] = []
    const generar = crearOpciones({
      proveedor: { nombre: 'opciones', generar: async ({ usuario }) => (usuarios.push(usuario), CUATRO) },
      almacen,
    })
    await generar({ historial: [], ultimoTurno: '¿Como estas?', yaMostradas: [] }, ahora)
    return usuarios[0]
  }

  test('ni los bloques descartados ni la huella aceptada en revision', async () => {
    const { almacen } = armar()
    const SABADO_7 = new Date('2026-11-07T12:00:00Z') // ayer = viernes 6
    const antesSabado = await prompt(almacen, SABADO_7)
    assert.ok(antesSabado.includes('DIA-2026-11-06'))
    const antes = await prompt(almacen, MARTES_10)
    assert.ok(antes.includes('SEMANA-DEL-2'))
    assert.ok(antes.includes('ACEPTADA'))

    await invalidarHecho(almacen, 'h-laura', INVALIDADO_EL)
    assert.ok(!(await prompt(almacen, SABADO_7)).includes('DIA-2026-11-06'))
    const despues = await prompt(almacen, MARTES_10)
    assert.ok(!despues.includes('SEMANA-DEL-2'))
    assert.ok(!despues.includes('ACEPTADA'))
    assert.ok(despues.includes('DIA-2026-11-09'), 'lo que no lo cita sigue entrando')

    await reaceptarHuella(almacen, MARTES_10)
    assert.ok((await prompt(almacen, MARTES_10)).includes('ACEPTADA'))
  })
})
