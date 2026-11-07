// Correr: node --test 'src/llm/*.test.ts'
// Niveles de memoria (#34): bloque del dia al cruzar la medianoche, Consolidar ahora y su entrada al prompt.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { LineaHistorial } from '@/eventos'
import { crearDisparadorMemoria } from './memoria.ts'
import { crearOpciones } from './opciones.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import { idResumen } from './niveles.ts'
import type { Bloque, ConversacionCerrada, Hecho, Memoria, NivelRollup, Proveedor, ResumenConversacion } from './tipos.ts'

// Viernes 6/11/2026 en Argentina: de 2026-11-06T03:00Z a 2026-11-07T03:00Z.
const DIA_6 = { desde: '2026-11-06T03:00:00.000Z', hasta: '2026-11-07T03:00:00.000Z' }
const SABADO_9AM = new Date('2026-11-07T12:00:00Z')

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

const resumen = (id: string, fin: string, extra: Partial<ResumenConversacion> = {}): ResumenConversacion => ({
  id,
  inicio: new Date(Date.parse(fin) - 10 * 60_000).toISOString(),
  fin,
  resumen: `resumen ${id}`,
  ...extra,
})

// Lo que paso el viernes 6, mas cosas de otros dias y cosas que no entran.
const MEMORIA_DEL_VIERNES: Partial<Memoria> = {
  resumenes: [
    resumen('r-jueves', '2026-11-05T20:00:00.000Z'),
    resumen('r-tarde', '2026-11-06T20:00:00.000Z'),
    resumen('r-noche', '2026-11-07T01:00:00.000Z'), // 22:00 del viernes en Argentina
    resumen('r-descartado', '2026-11-06T21:00:00.000Z', { descartado: '2026-11-06T22:00:00.000Z' }),
  ],
  hechos: [
    hecho({ id: 'h-importante' }),
    hecho({ id: 'h-menor', importancia: 4 }),
    hecho({ id: 'h-invalidado', importancia: 9, estado: 'invalidado', fechaInvalidacion: '2026-11-06T22:00:00.000Z' }),
    hecho({ id: 'h-jueves', fecha: '2026-11-05T20:00:00.000Z' }),
  ],
  // El jueves ya tiene su bloque: al cerrar el sabado solo falta el viernes.
  niveles: {
    dia: [{ id: 'dia-2026-11-05', desde: '2026-11-05T03:00:00.000Z', hasta: DIA_6.desde, texto: 'El jueves...', fuentes: ['r-jueves'] }],
    semana: [],
    mes: [],
  },
}

const LINEAS: LineaHistorial[] = [
  { quien: 'interlocutor', texto: 'Buen dia, papa.' },
  { quien: 'usuario', texto: 'Buen dia', origen: 'opcion' },
]

// Una conversacion que se cierra el sabado a la manana.
const cerradaEl = (fin: Date): ConversacionCerrada => ({
  inicio: new Date(fin.getTime() - 10 * 60_000).toISOString(),
  fin: fin.toISOString(),
  lineas: LINEAS,
  cercania: 'familia',
})

// El agente de memoria siempre aprende nada y resume corto.
const agenteMudo: Proveedor = {
  nombre: 'agente',
  async generar() {
    return JSON.stringify({ hechos: [], resumen: 'Se saludaron.' })
  },
}

// Proveedor de rollups guionado: cuenta que nivel se pidio y con que prompt.
function rollupGuionado(respuestas: (string | Error)[]) {
  const pedidos: { nivel: NivelRollup; usuario: string }[] = []
  const proveedorRollup = (nivel: NivelRollup): Proveedor => ({
    nombre: `rollup-${nivel}`,
    async generar({ usuario }) {
      pedidos.push({ nivel, usuario })
      const r = respuestas.shift()
      if (r === undefined) throw new Error('el guion se quedo sin respuestas')
      if (r instanceof Error) throw r
      return r
    },
  })
  return { proveedorRollup, pedidos }
}

const bloque = (texto: string, fuentes: string[]) => JSON.stringify({ texto, fuentes })

function armar(respuestas: (string | Error)[], memoria: Partial<Memoria> = MEMORIA_DEL_VIERNES) {
  const almacen = crearAlmacenEnMemoria({ memoria })
  const rollup = rollupGuionado(respuestas)
  let ahora = SABADO_9AM
  const errores: unknown[] = []
  const disparador = crearDisparadorMemoria({
    proveedor: agenteMudo,
    almacen,
    proveedorRollup: rollup.proveedorRollup,
    reloj: () => ahora,
    alFallarNivel: (e) => errores.push(e),
  })
  return {
    almacen,
    disparador,
    errores,
    ...rollup,
    async cerrar(fin: Date) {
      ahora = new Date(fin.getTime() + 5 * 60_000)
      disparador.disparar(cerradaEl(fin))
      await disparador.listo()
    },
  }
}

describe('bloque del dia', () => {
  test('cerrar una conversacion despues de la medianoche arma el bloque de ayer con sus fuentes', async () => {
    const { almacen, pedidos, cerrar } = armar([bloque('El viernes Roberto charlo con la familia.', ['r-tarde', 'h-importante', 'inventado'])])
    await cerrar(SABADO_9AM)

    assert.equal(pedidos.length, 1)
    assert.equal(pedidos[0].nivel, 'dia')
    // Entran los resumenes del viernes y los hechos activos de importancia 6 o mas agregados ese dia.
    for (const id of ['r-tarde', 'r-noche', 'h-importante']) assert.ok(pedidos[0].usuario.includes(id), id)
    for (const id of ['r-jueves', 'r-descartado', 'h-menor', 'h-invalidado', 'h-jueves']) {
      assert.ok(!pedidos[0].usuario.includes(id), id)
    }

    const dia = almacen.memoria().niveles?.dia ?? []
    assert.equal(dia.length, 2) // el del jueves y el nuevo
    const b = dia[1]
    assert.equal(b.desde, DIA_6.desde)
    assert.equal(b.hasta, DIA_6.hasta)
    assert.equal(b.texto, 'El viernes Roberto charlo con la familia.')
    // Las fuentes inventadas por el modelo se descartan.
    assert.deepEqual(b.fuentes, ['r-tarde', 'h-importante'])
    // El agente de memoria hizo lo suyo igual.
    assert.equal(almacen.memoria().resumenes.at(-1)?.resumen, 'Se saludaron.')
  })

  test('un hecho intimo del dia queda en las fuentes aunque el modelo no lo cite', async () => {
    const conIntimo = structuredClone(MEMORIA_DEL_VIERNES)
    conIntimo.hechos!.push(hecho({ id: 'h-salud', importancia: 9, intimo: true }))
    const { almacen, cerrar } = armar([bloque('El viernes...', ['r-tarde'])], conIntimo)
    await cerrar(SABADO_9AM)
    const viernes = almacen.memoria().niveles?.dia.find((b) => b.id === 'dia-2026-11-06')
    assert.deepEqual(viernes?.fuentes, ['r-tarde', 'h-salud'])
  })

  test('arma cada dia que quedo sin bloque desde el ultimo, del mas viejo al mas nuevo', async () => {
    const { almacen, pedidos, cerrar } = armar(
      [bloque('El jueves...', ['r-jueves']), bloque('El viernes...', ['r-tarde'])],
      { ...MEMORIA_DEL_VIERNES, niveles: undefined },
    )
    await cerrar(SABADO_9AM)
    assert.deepEqual(
      (almacen.memoria().niveles?.dia ?? []).map((b) => [b.id, b.texto]),
      [
        ['dia-2026-11-05', 'El jueves...'],
        ['dia-2026-11-06', 'El viernes...'],
      ],
    )
    assert.ok(pedidos[0].usuario.includes('r-jueves') && !pedidos[0].usuario.includes('r-tarde'))
  })

  test('si el rollup falla, el dia se reintenta en el proximo cierre aunque sea otro dia', async () => {
    const soloViernes = { ...MEMORIA_DEL_VIERNES, resumenes: MEMORIA_DEL_VIERNES.resumenes!.slice(1) }
    soloViernes.hechos = MEMORIA_DEL_VIERNES.hechos!.filter((h) => h.id !== 'h-jueves')
    const { almacen, cerrar } = armar(
      [new Error('sin red'), bloque('El viernes...', ['r-tarde']), bloque('El sabado...', [idResumen({ inicio: '', fin: SABADO_9AM.toISOString(), resumen: '' })])],
      soloViernes,
    )
    await cerrar(SABADO_9AM)
    await cerrar(new Date('2026-11-08T12:00:00Z')) // domingo: arma el viernes y el sabado
    assert.deepEqual(
      (almacen.memoria().niveles?.dia ?? []).map((b) => b.id),
      ['dia-2026-11-05', 'dia-2026-11-06', 'dia-2026-11-07'], // el del jueves ya estaba
    )
  })

  test('si el agente de memoria falla, no se arma el bloque: falta la conversacion que cerro', async () => {
    const almacen = crearAlmacenEnMemoria({ memoria: MEMORIA_DEL_VIERNES })
    const { proveedorRollup, pedidos } = rollupGuionado([bloque('El viernes...', ['r-tarde'])])
    const disparador = crearDisparadorMemoria({
      proveedor: { nombre: 'roto', generar: async () => Promise.reject(new Error('sin red')) },
      almacen,
      proveedorRollup,
      reloj: () => SABADO_9AM,
      alFallar: () => {},
    })
    disparador.disparar(cerradaEl(SABADO_9AM))
    await disparador.listo()
    assert.equal(pedidos.length, 0)
  })

  test('cerrar otra conversacion el mismo dia no arma otro bloque', async () => {
    const { almacen, pedidos, cerrar } = armar([bloque('El viernes...', ['r-tarde'])])
    await cerrar(SABADO_9AM)
    await cerrar(new Date('2026-11-07T20:00:00Z')) // sabado 17:00
    assert.equal(pedidos.length, 1)
    assert.equal(almacen.memoria().niveles?.dia.length, 2)
  })

  test('un dia sin nada no llama al modelo', async () => {
    const { almacen, pedidos, cerrar } = armar([], {})
    await cerrar(SABADO_9AM)
    assert.equal(pedidos.length, 0)
    assert.equal(almacen.memoria().niveles?.dia.length ?? 0, 0)
  })

  test('un rollup que falla no rompe el cierre y se reintenta en el proximo', async () => {
    const { almacen, pedidos, errores, cerrar } = armar([new Error('sin red'), bloque('El viernes...', ['r-tarde'])])
    await cerrar(SABADO_9AM)
    assert.equal(errores.length, 1)
    assert.equal(almacen.memoria().niveles?.dia.length, 1) // solo el del jueves
    // El agente de memoria guardo lo suyo igual.
    assert.equal(almacen.memoria().resumenes.at(-1)?.resumen, 'Se saludaron.')

    await cerrar(new Date('2026-11-07T20:00:00Z'))
    assert.equal(pedidos.length, 2)
    assert.equal(almacen.memoria().niveles?.dia.length, 2)
  })

  test('JSON invalido o sin fuentes validas se reintenta una vez; si sigue mal, no guarda nada', async () => {
    const { almacen, pedidos, errores, cerrar } = armar(['no es json', bloque('Texto sin fuentes.', ['inventado'])])
    await cerrar(SABADO_9AM)
    assert.equal(pedidos.length, 2)
    assert.equal(errores.length, 1)
    assert.equal(almacen.memoria().niveles?.dia.length, 1)
  })

  test('una memoria vieja, sin niveles ni ids en los resumenes, se lee y suma el bloque', async () => {
    const vieja = structuredClone({ ...MEMORIA_DEL_VIERNES, niveles: undefined })
    // Sin el jueves: un solo dia para armar.
    vieja.resumenes = vieja.resumenes!.slice(1)
    vieja.hechos = vieja.hechos!.filter((h) => h.id !== 'h-jueves')
    for (const r of vieja.resumenes) delete r.id
    const id = idResumen(vieja.resumenes[0]) // r-tarde, citado con el id derivado de su fin
    const { almacen, pedidos, cerrar } = armar([bloque('El viernes...', [id])], vieja)
    await cerrar(SABADO_9AM)
    assert.ok(pedidos[0].usuario.includes(id))
    assert.deepEqual(almacen.memoria().niveles?.dia[0].fuentes, [id])
  })
})

describe('consolidar ahora', () => {
  test('arma el dia de hoy con lo que haya, sin esperar el corte, y una segunda vez lo reemplaza', async () => {
    const hoy: Partial<Memoria> = {
      resumenes: [resumen('r-manana', '2026-11-07T11:00:00.000Z'), resumen('r-viernes', '2026-11-06T20:00:00.000Z')],
      hechos: [hecho({ id: 'h-hoy', fecha: '2026-11-07T11:00:00.000Z' })],
    }
    const { almacen, pedidos, disparador } = armar(
      [bloque('Hoy a la manana...', ['r-manana', 'h-hoy']), bloque('Hoy, todo el dia...', ['r-manana'])],
      hoy,
    )
    const b = await disparador.consolidarAhora()
    assert.equal(b?.texto, 'Hoy a la manana...')
    assert.equal(pedidos[0].nivel, 'dia')
    assert.ok(pedidos[0].usuario.includes('r-manana'))
    assert.ok(!pedidos[0].usuario.includes('r-viernes'))

    await disparador.consolidarAhora()
    const dia = almacen.memoria().niveles?.dia ?? []
    assert.equal(dia.length, 1)
    assert.equal(dia[0].texto, 'Hoy, todo el dia...')
    assert.equal(dia[0].desde, '2026-11-07T03:00:00.000Z')
  })

  test('el bloque parcial de hoy se rehace al cruzar la medianoche', async () => {
    const hoy: Partial<Memoria> = { resumenes: [resumen('r-manana', '2026-11-07T11:00:00.000Z')] }
    const { almacen, pedidos, disparador, cerrar } = armar(
      [bloque('Parcial.', ['r-manana']), bloque('Completo.', ['r-manana'])],
      hoy,
    )
    await disparador.consolidarAhora()
    await cerrar(new Date('2026-11-08T12:00:00Z')) // domingo a la manana
    assert.equal(pedidos.length, 2)
    const dia = almacen.memoria().niveles?.dia ?? []
    assert.equal(dia.length, 1)
    assert.equal(dia[0].texto, 'Completo.')
    assert.equal(dia[0].hasta, '2026-11-08T03:00:00.000Z')
  })

  test('si falla, el error le llega a quien lo pidio', async () => {
    const { disparador } = armar([new Error('sin red')], { resumenes: [resumen('r', '2026-11-07T11:00:00.000Z')] })
    await assert.rejects(disparador.consolidarAhora(), /sin red/)
  })
})

describe('bloque del dia en el prompt de opciones', () => {
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

  const ayer = (texto: string, fuentes: string[], extra: Partial<Bloque> = {}): Bloque => ({
    id: 'dia-2026-11-06',
    ...DIA_6,
    texto,
    fuentes,
    ...extra,
  })

  async function promptCon(memoria: Partial<Memoria>, cercania?: 'familia' | 'formal') {
    const usuarios: string[] = []
    const proveedor: Proveedor = {
      nombre: 'opciones',
      async generar({ usuario }) {
        usuarios.push(usuario)
        return CUATRO
      },
    }
    const generar = crearOpciones({ proveedor, almacen: crearAlmacenEnMemoria({ memoria }) })
    await generar({ historial: [], ultimoTurno: '¿Como estas?', yaMostradas: [], ...(cercania ? { cercania } : {}) }, SABADO_9AM)
    return usuarios[0]
  }

  test('entra el bloque de ayer si existe y no esta descartado', async () => {
    const hechos = [hecho({ id: 'h-importante' })]
    assert.ok((await promptCon({ hechos, niveles: { dia: [ayer('AYER-VIGENTE', ['h-importante'])], semana: [], mes: [] } })).includes('AYER-VIGENTE'))
    const descartado = ayer('AYER-DESCARTADO', ['h-importante'], { descartado: '2026-11-07T10:00:00.000Z' })
    assert.ok(!(await promptCon({ hechos, niveles: { dia: [descartado], semana: [], mes: [] } })).includes('AYER-DESCARTADO'))
  })

  test('entra el de ayer aunque haya uno de hoy de Consolidar ahora; sin el de ayer, entra el de hoy', async () => {
    const hechos = [hecho({ id: 'h-importante' })]
    const hoy = ayer('HOY-PARCIAL', ['h-importante'], {
      id: 'dia-2026-11-07',
      desde: '2026-11-07T03:00:00.000Z',
      hasta: '2026-11-07T11:00:00.000Z',
    })
    const conAmbos = await promptCon({ hechos, niveles: { dia: [ayer('AYER-VIGENTE', ['h-importante']), hoy], semana: [], mes: [] } })
    assert.ok(conAmbos.includes('AYER-VIGENTE'))
    assert.ok(!conAmbos.includes('HOY-PARCIAL'))
    assert.ok((await promptCon({ hechos, niveles: { dia: [hoy], semana: [], mes: [] } })).includes('HOY-PARCIAL'))
  })

  test('un bloque de hace dias no entra como si fuera de ayer', async () => {
    const viejo = ayer('HACE-UNA-SEMANA', ['h-importante'], {
      id: 'dia-2026-10-30',
      desde: '2026-10-30T03:00:00.000Z',
      hasta: '2026-10-31T03:00:00.000Z',
    })
    const prompt = await promptCon({ hechos: [hecho({ id: 'h-importante' })], niveles: { dia: [viejo], semana: [], mes: [] } })
    assert.ok(!prompt.includes('HACE-UNA-SEMANA'))
  })

  test('con cercania formal no entra un bloque que cita un hecho intimo, aunque el hecho ya no este activo', async () => {
    const hechos = [
      hecho({ id: 'h-salud', intimo: true, estado: 'invalidado', fechaInvalidacion: '2026-11-07T01:00:00.000Z' }),
      hecho({ id: 'h-river' }),
    ]
    const intimo = { hechos, niveles: { dia: [ayer('AYER-INTIMO', ['h-salud', 'h-river'])], semana: [], mes: [] } }
    assert.ok(!(await promptCon(intimo, 'formal')).includes('AYER-INTIMO'))
    assert.ok((await promptCon(intimo, 'familia')).includes('AYER-INTIMO'))
    const publico = { hechos, niveles: { dia: [ayer('AYER-PUBLICO', ['h-river'])], semana: [], mes: [] } }
    assert.ok((await promptCon(publico, 'formal')).includes('AYER-PUBLICO'))
  })

  test('una memoria vieja sin niveles arma las opciones como siempre', async () => {
    const prompt = await promptCon({ hechos: [hecho({ id: 'h-importante' })] })
    assert.ok(prompt.includes('hecho h-importante'))
  })
})
