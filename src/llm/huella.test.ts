// Correr: node --test 'src/llm/*.test.ts'
// Huella aprendida (#38): propuesta al cruzar un corte de mes (o con Consolidar ahora), aceptada o
// descartada por la familia, y su entrada al prompt de opciones al lado de la huella base.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { LineaHistorial } from '@/eventos'
import { crearDisparadorMemoria } from './memoria.ts'
import { crearOpciones } from './opciones.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import { aceptarHuella, crearHuella, descartarHuella, TOPE_HUELLA } from './huella.ts'
import { PERFIL_ROBERTO } from './perfil-roberto.ts'
import type { Bloque, ConversacionCerrada, Hecho, HuellaAprendida, Memoria, NivelRollup, Proveedor } from './tipos.ts'

// Lunes 2/11/2026, 9 de la manana en Argentina: ya cruzo el corte de octubre a noviembre.
const LUNES_2 = new Date('2026-11-02T12:00:00Z')
const MIERCOLES_4 = new Date('2026-11-04T12:00:00Z')

const hecho = (h: Partial<Hecho> & { id: string }): Hecho => ({
  texto: `hecho ${h.id}`,
  origen: 'interlocutor',
  interlocutor: null,
  importancia: 9,
  fecha: '2026-10-20T20:00:00.000Z',
  estado: 'activo',
  fechaInvalidacion: null,
  intimo: false,
  ...h,
})

const bloque = (id: string, desde: string, hasta: string, texto: string, fuentes: string[] = ['h-river']): Bloque => ({
  id,
  desde,
  hasta,
  texto,
  fuentes,
})

const MES_OCTUBRE = bloque('mes-2026-10-01', '2026-10-01T03:00:00.000Z', '2026-11-01T03:00:00.000Z', 'BLOQUE-MES')
const SEMANA_26 = bloque('semana-2026-10-26', '2026-10-26T03:00:00.000Z', '2026-11-02T03:00:00.000Z', 'BLOQUE-SEMANA')
const DIA_31 = bloque('dia-2026-10-31', '2026-10-31T03:00:00.000Z', '2026-11-01T03:00:00.000Z', 'BLOQUE-DIA-31')
const DIA_30 = bloque('dia-2026-10-30', '2026-10-30T03:00:00.000Z', '2026-10-31T03:00:00.000Z', 'BLOQUE-DIA-30')

const HUELLA_DE_OCTUBRE: HuellaAprendida = {
  aceptada: { texto: 'ACEPTADA-VIEJA', fuentes: ['h-river'], fechaAceptacion: '2026-10-04T12:00:00.000Z' },
  descartadas: ['DESCARTADA-VIEJA'],
  ultimaPropuesta: '2026-10-03T12:00:00.000Z',
}

// Lo que se sabe al empezar noviembre. Nada de los ultimos 7 dias sin bloque: el cierre no arma dias.
const MEMORIA_DE_OCTUBRE: Partial<Memoria> = {
  hechos: [
    hecho({ id: 'h-river', texto: 'Es hincha de River' }),
    hecho({ id: 'h-menor', importancia: 5 }),
    hecho({ id: 'h-invalidado', estado: 'invalidado', fechaInvalidacion: '2026-10-21T20:00:00.000Z' }),
    hecho({ id: 'h-salud', texto: 'Tiene turno con el neurologo', intimo: true }),
  ],
  resumenes: [{ id: 'r-oct', inicio: '2026-10-20T19:50:00.000Z', fin: '2026-10-20T20:00:00.000Z', resumen: 'Hablaron de River.' }],
  ejemplosEstilo: [{ texto: 'Dale, che', origen: 'deletreo', fecha: '2026-10-20T20:00:00.000Z' }],
  niveles: { dia: [DIA_30, DIA_31], semana: [SEMANA_26], mes: [MES_OCTUBRE] },
  huellaAprendida: HUELLA_DE_OCTUBRE,
}

const LINEAS: LineaHistorial[] = [
  { quien: 'interlocutor', texto: 'Buen dia, papa.' },
  { quien: 'usuario', texto: 'Buen dia', origen: 'opcion' },
]

const cerradaEl = (fin: Date): ConversacionCerrada => ({
  inicio: new Date(fin.getTime() - 10 * 60_000).toISOString(),
  fin: fin.toISOString(),
  lineas: LINEAS,
  cercania: 'familia',
})

const agenteMudo: Proveedor = {
  nombre: 'agente',
  async generar() {
    return JSON.stringify({ hechos: [], resumen: 'Se saludaron.' })
  },
}

const respuesta = (texto: string, fuentes: string[]) => JSON.stringify({ texto, fuentes })

// Rollups guionados por nivel: la huella sigue su guion; los demas niveles no resumen nada.
function rollupGuionado(guionHuella: (string | Error)[]) {
  const pedidos: { nivel: NivelRollup; usuario: string }[] = []
  const proveedorRollup = (nivel: NivelRollup): Proveedor => ({
    nombre: `rollup-${nivel}`,
    async generar({ usuario }) {
      pedidos.push({ nivel, usuario })
      if (nivel !== 'huella') return respuesta('', [])
      const r = guionHuella.shift()
      if (r === undefined) throw new Error('el guion se quedo sin respuestas')
      if (r instanceof Error) throw r
      return r
    },
  })
  return { proveedorRollup, pedidos, deHuella: () => pedidos.filter((p) => p.nivel === 'huella') }
}

function armar(guion: (string | Error)[], memoria: Partial<Memoria> = MEMORIA_DE_OCTUBRE) {
  const almacen = crearAlmacenEnMemoria({ memoria })
  const rollup = rollupGuionado(guion)
  let ahora = LUNES_2
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

describe('propuesta de huella aprendida', () => {
  test('cerrar una conversacion que cruza el corte de mes pide la propuesta al modelo de huella', async () => {
    const { almacen, deHuella, cerrar } = armar([respuesta('Le dice "che" a todos. Sigue a River.', ['h-river', 'frases', 'inventado'])])
    await cerrar(LUNES_2)

    const pedidos = deHuella()
    assert.equal(pedidos.length, 1)
    const prompt = pedidos[0].usuario
    // El bloque de mes, no el de semana ni el de dia.
    assert.ok(prompt.includes('BLOQUE-MES'))
    assert.ok(!prompt.includes('BLOQUE-SEMANA') && !prompt.includes('BLOQUE-DIA'))
    // Hechos activos de importancia alta, ejemplos de estilo, la aceptada anterior y las descartadas.
    for (const t of ['h-river', 'h-salud', 'Dale, che', 'ACEPTADA-VIEJA', 'DESCARTADA-VIEJA']) assert.ok(prompt.includes(t), t)
    for (const t of ['h-menor', 'h-invalidado']) assert.ok(!prompt.includes(t), t)

    const huella = almacen.memoria().huellaAprendida
    assert.equal(huella?.propuesta?.texto, 'Le dice "che" a todos. Sigue a River.')
    assert.equal(huella?.propuesta?.fecha, new Date(LUNES_2.getTime() + 5 * 60_000).toISOString())
    // Las fuentes inventadas se descartan; el hecho intimo que vio el modelo queda aunque no lo cite.
    assert.deepEqual(huella?.propuesta?.fuentes.sort(), ['frases', 'h-river', 'h-salud'])
    // La aceptada y las descartadas siguen igual hasta que la familia decida.
    assert.equal(huella?.aceptada?.texto, 'ACEPTADA-VIEJA')
    assert.deepEqual(huella?.descartadas, ['DESCARTADA-VIEJA'])
  })

  test('sin bloque de mes usa el de semana; sin semana, el de dia mas reciente', async () => {
    const sinMes = { ...MEMORIA_DE_OCTUBRE, niveles: { dia: [DIA_30, DIA_31], semana: [SEMANA_26], mes: [] } }
    const a = armar([respuesta('algo', ['h-river'])], sinMes)
    await a.cerrar(LUNES_2)
    assert.ok(a.deHuella()[0].usuario.includes('BLOQUE-SEMANA'))
    assert.ok(!a.deHuella()[0].usuario.includes('BLOQUE-DIA'))

    const soloDias = { ...MEMORIA_DE_OCTUBRE, niveles: { dia: [DIA_30, DIA_31], semana: [], mes: [] } }
    const b = armar([respuesta('algo', ['h-river'])], soloDias)
    await b.cerrar(LUNES_2)
    assert.ok(b.deHuella()[0].usuario.includes('BLOQUE-DIA-31'))
    assert.ok(!b.deHuella()[0].usuario.includes('BLOQUE-DIA-30'))
  })

  test('otra conversacion en el mismo mes no vuelve a proponer', async () => {
    const { deHuella, cerrar } = armar([respuesta('algo', ['h-river'])])
    await cerrar(LUNES_2)
    await cerrar(MIERCOLES_4)
    assert.equal(deHuella().length, 1)
  })

  test('sin propuestas previas, la primera es al cruzar el primer corte de mes desde que hay memoria', async () => {
    const nueva = { ...MEMORIA_DE_OCTUBRE, huellaAprendida: undefined }
    const enOctubre = armar([respuesta('algo', ['h-river'])], { ...nueva, resumenes: [{ ...MEMORIA_DE_OCTUBRE.resumenes![0], inicio: '2026-11-02T10:00:00.000Z', fin: '2026-11-02T10:10:00.000Z' }] })
    await enOctubre.cerrar(LUNES_2)
    assert.equal(enOctubre.deHuella().length, 0) // toda la memoria es de este mes

    const desdeOctubre = armar([respuesta('algo', ['h-river'])], nueva)
    await desdeOctubre.cerrar(LUNES_2)
    assert.equal(desdeOctubre.deHuella().length, 1)
  })

  test('un fallo no rompe el cierre y se reintenta en el proximo', async () => {
    const { almacen, deHuella, errores, cerrar } = armar([new Error('sin red'), respuesta('algo', ['h-river'])])
    await cerrar(LUNES_2)
    assert.equal(errores.length, 1)
    assert.equal(almacen.memoria().resumenes.at(-1)?.resumen, 'Se saludaron.') // el agente hizo lo suyo
    assert.equal(almacen.memoria().huellaAprendida?.propuesta, undefined)
    await cerrar(MIERCOLES_4)
    assert.equal(deHuella().length, 2)
    assert.equal(almacen.memoria().huellaAprendida?.propuesta?.texto, 'algo')
  })

  test('una propuesta igual a una descartada no se guarda', async () => {
    const { almacen, deHuella, cerrar } = armar([respuesta('  descartada-vieja ', ['h-river'])])
    await cerrar(LUNES_2)
    assert.equal(deHuella().length, 1)
    assert.equal(almacen.memoria().huellaAprendida?.propuesta, undefined)
  })

  test('lo intimo bajo un bloque queda como id de hecho: si el bloque se recorta, sigue contando', async () => {
    const memoria = structuredClone(MEMORIA_DE_OCTUBRE)
    memoria.niveles!.mes = [{ ...MES_OCTUBRE, fuentes: ['h-oculto'] }]
    memoria.hechos!.push(hecho({ id: 'h-oculto', importancia: 3, intimo: true }))
    memoria.hechos = memoria.hechos!.filter((h) => h.id !== 'h-salud')
    const { almacen, cerrar } = armar([respuesta('algo', ['h-river'])], memoria)
    await cerrar(LUNES_2)
    assert.deepEqual(almacen.memoria().huellaAprendida?.propuesta?.fuentes.sort(), ['h-oculto', 'h-river'])
  })

  test('si la familia descarta mientras el modelo piensa, la misma propuesta no vuelve', async () => {
    const almacen = crearAlmacenEnMemoria({
      memoria: { ...MEMORIA_DE_OCTUBRE, huellaAprendida: { propuesta: { texto: 'P', fuentes: ['h-river'], fecha: LUNES_2.toISOString() } } },
    })
    const huella = crearHuella({
      almacen,
      proveedorRollup: () => ({
        nombre: 'huella',
        async generar() {
          await descartarHuella(almacen)
          return respuesta('P', ['h-river'])
        },
      }),
    })
    assert.equal(await huella.proponerAhora(MIERCOLES_4), null)
    assert.equal(almacen.memoria().huellaAprendida?.propuesta, undefined)
    assert.deepEqual(almacen.memoria().huellaAprendida?.descartadas, ['P'])
  })

  test('Consolidar ahora propone sin esperar el corte de mes', async () => {
    const { almacen, disparador } = armar([respuesta('ahora', ['h-river'])], {
      ...MEMORIA_DE_OCTUBRE,
      huellaAprendida: { ultimaPropuesta: LUNES_2.toISOString() },
    })
    const propuesta = await disparador.proponerHuellaAhora()
    assert.equal(propuesta?.texto, 'ahora')
    assert.equal(almacen.memoria().huellaAprendida?.propuesta?.texto, 'ahora')
  })
})

describe('aceptar y descartar la huella aprendida', () => {
  const conPropuesta = (texto: string, fuentes = ['h-river']): Partial<Memoria> => ({
    ...MEMORIA_DE_OCTUBRE,
    huellaAprendida: { ...HUELLA_DE_OCTUBRE, propuesta: { texto, fuentes, fecha: LUNES_2.toISOString() } },
  })

  test('aceptar reemplaza la aceptada, con fecha de aceptacion y tope de largo', async () => {
    const almacen = crearAlmacenEnMemoria({ memoria: conPropuesta('x'.repeat(TOPE_HUELLA + 300)) })
    const aceptada = await aceptarHuella(almacen, MIERCOLES_4)
    const huella = almacen.memoria().huellaAprendida
    assert.equal(huella?.propuesta, undefined)
    assert.equal(huella?.aceptada?.fechaAceptacion, MIERCOLES_4.toISOString())
    assert.ok((huella?.aceptada?.texto.length ?? 0) <= TOPE_HUELLA)
    assert.deepEqual(huella?.aceptada?.fuentes, ['h-river'])
    assert.deepEqual(aceptada, huella?.aceptada)
  })

  test('descartar la guarda en descartadas y la saca de pendiente', async () => {
    const almacen = crearAlmacenEnMemoria({ memoria: conPropuesta('NUEVA') })
    assert.ok(await descartarHuella(almacen))
    const huella = almacen.memoria().huellaAprendida
    assert.equal(huella?.propuesta, undefined)
    assert.deepEqual(huella?.descartadas, ['DESCARTADA-VIEJA', 'NUEVA'])
    assert.equal(huella?.aceptada?.texto, 'ACEPTADA-VIEJA')
  })

  test('sin propuesta pendiente no hay nada que aceptar ni descartar', async () => {
    const almacen = crearAlmacenEnMemoria({ memoria: MEMORIA_DE_OCTUBRE })
    assert.equal(await aceptarHuella(almacen, MIERCOLES_4), null)
    assert.equal(await descartarHuella(almacen), false)
  })
})

describe('huella aprendida en el prompt de opciones', () => {
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

  async function promptCon(huellaAprendida: HuellaAprendida | undefined, cercania?: 'familia' | 'formal') {
    const usuarios: string[] = []
    const proveedor: Proveedor = {
      nombre: 'opciones',
      async generar({ usuario }) {
        usuarios.push(usuario)
        return CUATRO
      },
    }
    const almacen = crearAlmacenEnMemoria({ memoria: { ...MEMORIA_DE_OCTUBRE, huellaAprendida } })
    const generar = crearOpciones({ proveedor, almacen })
    await generar({ historial: [], ultimoTurno: '¿Como estas?', yaMostradas: [], ...(cercania ? { cercania } : {}) }, MIERCOLES_4)
    return { prompt: usuarios[0], perfil: await almacen.leerPerfil() }
  }

  const aceptada = (texto: string, fuentes: string[]) => ({ texto, fuentes, fechaAceptacion: LUNES_2.toISOString() })
  const propuesta = (texto: string) => ({ texto, fuentes: ['h-river'], fecha: LUNES_2.toISOString() })

  test('la aceptada entra marcada como aprendida, despues de la base; pendiente y descartada no', async () => {
    const { prompt } = await promptCon({
      aceptada: aceptada('APRENDIDA-OK', ['h-river']),
      propuesta: propuesta('PENDIENTE'),
      descartadas: ['DESCARTADA'],
    })
    assert.ok(prompt.includes('APRENDIDA-OK'))
    assert.ok(!prompt.includes('PENDIENTE'))
    assert.ok(!prompt.includes('DESCARTADA'))
    const base = prompt.indexOf(PERFIL_ROBERTO.markdown.trim())
    const marca = prompt.search(/##[^\n]*aprendid/i)
    assert.ok(base >= 0 && marca > base, 'la aprendida va marcada y despues de la base')
    assert.ok(prompt.indexOf('APRENDIDA-OK') > marca)
  })

  test('sin aceptada no hay seccion de aprendida', async () => {
    const { prompt } = await promptCon({ propuesta: propuesta('PENDIENTE') })
    assert.equal(prompt.search(/##[^\n]*aprendid/i), -1)
  })

  test('la huella base nunca cambia', async () => {
    const { prompt, perfil } = await promptCon({ aceptada: aceptada('APRENDIDA-OK', ['h-river']) })
    assert.deepEqual(perfil, PERFIL_ROBERTO)
    assert.ok(prompt.includes(PERFIL_ROBERTO.markdown.trim()))
  })

  test('con cercania formal no entra una aprendida que cite un hecho intimo, ni por un bloque', async () => {
    const intima = { aceptada: aceptada('APRENDIDA-INTIMA', ['h-river', 'h-salud']) }
    assert.ok((await promptCon(intima, 'familia')).prompt.includes('APRENDIDA-INTIMA'))
    assert.ok(!(await promptCon(intima, 'formal')).prompt.includes('APRENDIDA-INTIMA'))

    // Cita un bloque que cita el hecho intimo.
    const porBloque = { aceptada: aceptada('APRENDIDA-POR-BLOQUE', [MES_OCTUBRE.id]) }
    const memoria = structuredClone(MEMORIA_DE_OCTUBRE)
    memoria.niveles!.mes = [{ ...MES_OCTUBRE, fuentes: ['h-salud'] }]
    const usuarios: string[] = []
    const generar = crearOpciones({
      proveedor: { nombre: 'opciones', generar: async ({ usuario }) => (usuarios.push(usuario), CUATRO) },
      almacen: crearAlmacenEnMemoria({ memoria: { ...memoria, huellaAprendida: porBloque } }),
    })
    await generar({ historial: [], ultimoTurno: '¿Como estas?', yaMostradas: [], cercania: 'formal' }, MIERCOLES_4)
    assert.ok(!usuarios[0].includes('APRENDIDA-POR-BLOQUE'))

    assert.ok((await promptCon({ aceptada: aceptada('APRENDIDA-PUBLICA', ['h-river']) }, 'formal')).prompt.includes('APRENDIDA-PUBLICA'))
  })
})
