// Correr: node --test 'src/llm/*.test.ts'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { LineaHistorial } from '@/eventos'
import { crearAgenteMemoria, crearDisparadorMemoria, crearOpcionesConMemoria, ErrorMemoria } from './memoria.ts'
import { crearAlmacenEnMemoria, memoriaVacia } from './almacen.ts'
import { crearAlmacenEnArchivos } from './almacen-archivos.ts'
import { PERFIL_ROBERTO } from './perfil-roberto.ts'
import type { ConversacionCerrada, Hecho, Memoria, Proveedor } from './tipos.ts'

const MIN = 60_000
const T0 = new Date('2026-11-07T15:00:00Z')
const despues = (ms: number) => new Date(T0.getTime() + ms)

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

const LINEAS: LineaHistorial[] = [
  { quien: 'interlocutor', texto: 'Papa, te cuento que Laura se opera el jueves.' },
  { quien: 'usuario', texto: '¿Y como esta ella?', origen: 'opcion' },
  { quien: 'interlocutor', texto: 'Tranquila. Ah, y el asado del domingo se paso al sabado.' },
  { quien: 'usuario', texto: 'Mandale un beso grande', origen: 'deletreo' },
]

const cerrada = (lineas = LINEAS): ConversacionCerrada => ({
  inicio: T0.toISOString(),
  fin: despues(10 * MIN).toISOString(),
  lineas,
  cercania: 'familia',
})

const respuesta = (hechos: unknown[], resumen = 'Marta conto que Laura se opera el jueves.') =>
  JSON.stringify({ hechos, resumen })

const memoria = (m: Partial<Memoria> = {}): Memoria => ({ ...memoriaVacia(), ...m })

describe('agente de memoria', () => {
  test('agrega un hecho nuevo con texto, origen, interlocutor, importancia y fecha', async () => {
    const { proveedor, prompts } = guionado([
      respuesta([
        { accion: 'agregar', texto: 'Laura se opera el jueves 12/11.', linea: 1, interlocutor: 'Marta', importancia: 9, intimo: true },
      ]),
    ])
    const r = await crearAgenteMemoria({ proveedor })(cerrada(), memoria(), PERFIL_ROBERTO)

    assert.equal(r.hechos.length, 1)
    const [h] = r.hechos
    assert.equal(h.texto, 'Laura se opera el jueves 12/11.')
    assert.equal(h.origen, 'interlocutor')
    assert.equal(h.interlocutor, 'Marta')
    assert.equal(h.importancia, 9)
    assert.equal(h.intimo, true)
    assert.equal(h.estado, 'activo')
    assert.equal(h.fecha, cerrada().fin)
    assert.ok(h.id)
    // Extrae de la transcripcion cruda, no de un resumen.
    assert.match(prompts[0].usuario, /Laura se opera el jueves/)
    assert.match(prompts[0].usuario, /Mandale un beso grande/)
  })

  test('el origen sale de la linea: deletreo si el usuario lo deletreo', async () => {
    const { proveedor } = guionado([
      respuesta([{ accion: 'agregar', texto: 'Roberto le manda un beso a Laura.', linea: 4, importancia: 3 }]),
    ])
    const r = await crearAgenteMemoria({ proveedor })(cerrada(), memoria(), PERFIL_ROBERTO)
    assert.equal(r.hechos[0].origen, 'deletreo')
  })

  test('actualiza uno que cambio: el viejo queda invalidado con su historia y el nuevo lo reemplaza', async () => {
    const viejo = hecho({ id: 'asado', texto: 'El asado familiar es el domingo.' })
    const { proveedor, prompts } = guionado([
      respuesta([{ accion: 'actualizar', id: 'asado', texto: 'El asado familiar se paso al sabado.', linea: 3, importancia: 6 }]),
    ])
    const r = await crearAgenteMemoria({ proveedor })(cerrada(), memoria({ hechos: [viejo] }), PERFIL_ROBERTO)

    assert.match(prompts[0].usuario, /\[asado\].*El asado familiar es el domingo/)
    assert.equal(r.hechos.length, 2)
    const antes = r.hechos.find((h) => h.id === 'asado')!
    assert.equal(antes.estado, 'invalidado')
    assert.equal(antes.texto, viejo.texto)
    assert.equal(antes.fecha, viejo.fecha)
    assert.equal(antes.fechaInvalidacion, cerrada().fin)
    const ahora = r.hechos.find((h) => h.estado === 'activo')!
    assert.equal(ahora.texto, 'El asado familiar se paso al sabado.')
    assert.equal(ahora.reemplazaA, 'asado')
  })

  test('invalida uno contradicho sin borrarlo', async () => {
    const viejo = hecho({ id: 'kine', texto: 'Roberto tiene kinesiologia los martes.', importancia: 7 })
    const otro = hecho({ id: 'river', texto: 'Roberto es de River.' })
    const { proveedor } = guionado([respuesta([{ accion: 'invalidar', id: 'kine' }, { accion: 'nada', id: 'river' }])])
    const r = await crearAgenteMemoria({ proveedor })(cerrada(), memoria({ hechos: [viejo, otro] }), PERFIL_ROBERTO)

    assert.equal(r.hechos.length, 2)
    const kine = r.hechos.find((h) => h.id === 'kine')!
    assert.equal(kine.estado, 'invalidado')
    assert.equal(kine.texto, viejo.texto)
    assert.equal(kine.fecha, viejo.fecha)
    assert.equal(kine.fechaInvalidacion, cerrada().fin)
    assert.deepEqual(
      r.hechos.find((h) => h.id === 'river'),
      otro,
    )
  })

  test('escribe el resumen de la conversacion para la memoria corta', async () => {
    const { proveedor } = guionado([respuesta([], 'Marta conto lo de Laura. El asado paso al sabado.')])
    const r = await crearAgenteMemoria({ proveedor })(cerrada(), memoria(), PERFIL_ROBERTO)
    assert.deepEqual(r.resumenes, [
      { inicio: cerrada().inicio, fin: cerrada().fin, resumen: 'Marta conto lo de Laura. El asado paso al sabado.' },
    ])
  })

  test('nunca modifica el perfil', async () => {
    const almacen = crearAlmacenEnMemoria()
    const perfilAntes = await almacen.leerPerfil()
    const { proveedor } = guionado([
      respuesta([{ accion: 'agregar', texto: 'A Roberto ya no le gusta River.', linea: 2, importancia: 5 }]),
    ])
    const disparador = crearDisparadorMemoria({ proveedor, almacen })
    disparador.disparar(cerrada())
    await disparador.listo()

    assert.deepEqual(await almacen.leerPerfil(), perfilAntes)
    assert.deepEqual(perfilAntes, PERFIL_ROBERTO)
    assert.equal(almacen.memoria().hechos.length, 1) // lo aprendido va aparte
  })

  test('las frases deletreadas quedan por encima de las elegidas en los ejemplos de estilo', async () => {
    const lineas: LineaHistorial[] = [
      { quien: 'usuario', texto: 'Mandale un beso grande', origen: 'deletreo' },
      { quien: 'usuario', texto: 'Si, dale.', origen: 'opcion' },
      { quien: 'usuario', texto: 'Necesito ayuda.', origen: 'fija' },
      { quien: 'interlocutor', texto: 'Bueno, chau.' },
    ]
    const previos = memoria({
      ejemplosEstilo: [{ texto: 'Che, que lindo dia.', origen: 'opcion', fecha: despues(60 * MIN).toISOString() }],
    })
    const { proveedor } = guionado([respuesta([])])
    const r = await crearAgenteMemoria({ proveedor })(cerrada(lineas), previos, PERFIL_ROBERTO)

    const textos = r.ejemplosEstilo.map((e) => e.texto)
    assert.equal(textos[0], 'Mandale un beso grande') // aunque la elegida previa sea mas reciente
    assert.ok(textos.includes('Si, dale.'))
    assert.ok(!textos.includes('Necesito ayuda.')) // las fijas no son su voz
    assert.ok(!textos.includes('Bueno, chau.'))

    // Y en el prompt de opciones lo deletreado aparece antes.
    const almacen = crearAlmacenEnMemoria({ memoria: r })
    const { proveedor: p2, prompts } = guionado([
      JSON.stringify({
        opciones: [
          { intencion: 'aceptar', texto: 'a' },
          { intencion: 'rechazar', texto: 'b' },
          { intencion: 'preguntar', texto: 'c' },
          { intencion: 'otra', texto: 'd' },
        ],
      }),
    ])
    const { generarOpciones } = crearOpcionesConMemoria({ proveedor: p2, almacen })
    await generarOpciones({ historial: [], ultimoTurno: '¿Todo bien?', yaMostradas: [] }, T0)
    const u = prompts[0].usuario
    assert.ok(u.indexOf('Mandale un beso grande') < u.indexOf('Che, que lindo dia.'))
  })

  test('con JSON roto reintenta una vez; si falla, igual guarda los ejemplos de estilo y da error', async () => {
    const { proveedor, prompts } = guionado(['nada de json', '{"hechos": "mal"}'])
    await assert.rejects(
      crearAgenteMemoria({ proveedor })(cerrada(), memoria(), PERFIL_ROBERTO),
      (e: unknown) => e instanceof ErrorMemoria && e.memoriaParcial?.ejemplosEstilo.length === 2,
    )
    assert.equal(prompts.length, 2)
  })
})

describe('disparo en segundo plano', () => {
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

  test('cerrar una conversacion dispara al agente, sin esperarlo dentro del turno', async () => {
    const almacen = crearAlmacenEnMemoria()
    let soltarAgente!: () => void
    const agenteTrabado = new Promise<void>((r) => (soltarAgente = r))
    const prompts: string[] = []
    const opcionesSeguidas = [CUATRO, CUATRO]
    const proveedor: Proveedor = {
      nombre: 'mixto',
      async generar({ sistema, usuario }) {
        prompts.push(sistema)
        if (sistema.includes('agente de memoria')) {
          await agenteTrabado // el agente tarda: el turno no lo espera
          return respuesta([{ accion: 'agregar', texto: 'Laura se opera el jueves.', linea: 1, importancia: 9, intimo: true }])
        }
        assert.ok(usuario)
        return opcionesSeguidas.shift()!
      },
    }
    const { generarOpciones, memoria: agente } = crearOpcionesConMemoria({ proveedor, almacen })

    await generarOpciones({ historial: [], ultimoTurno: 'Hola papa', yaMostradas: [] }, T0)
    const historial = LINEAS
    // 20 minutos despues: conversacion nueva, la anterior se cierra.
    const r = await generarOpciones({ historial, ultimoTurno: '¿Que tal dormiste?', yaMostradas: [] }, despues(20 * MIN))
    assert.equal(r.nuevaConversacion, true)
    assert.equal(r.opciones.length, 4) // el turno ya volvio
    assert.equal(almacen.memoria().hechos.length, 0) // y el agente todavia no termino

    soltarAgente()
    await new Promise((r) => setImmediate(r))
    await agente.listo()
    const m = almacen.memoria()
    assert.equal(m.hechos.length, 1)
    assert.equal(m.hechos[0].texto, 'Laura se opera el jueves.')
    assert.equal(m.resumenes.length, 1)
    // La conversacion actual que guardo opciones no se pierde al guardar el agente.
    assert.equal(m.conversacion?.inicio, despues(20 * MIN).toISOString())
    assert.equal(prompts.filter((s) => s.includes('agente de memoria')).length, 1)
  })

  test('si el agente falla, el turno sigue y no se rompe nada', async () => {
    const almacen = crearAlmacenEnMemoria()
    const errores: unknown[] = []
    const proveedor: Proveedor = {
      nombre: 'roto',
      async generar() {
        throw new Error('sin red')
      },
    }
    const disparador = crearDisparadorMemoria({ proveedor, almacen, alFallar: (e) => errores.push(e) })
    disparador.disparar(cerrada())
    await disparador.listo()
    assert.equal(errores.length, 1)
    assert.deepEqual(almacen.memoria().hechos, [])
  })
})

describe('almacen en archivos', () => {
  test('perfil en markdown y memoria en JSON; el perfil arranca con el de Roberto', async () => {
    const carpeta = await mkdtemp(join(tmpdir(), 'parpadeo-'))
    try {
      const almacen = crearAlmacenEnArchivos(carpeta)
      assert.deepEqual(await almacen.leerMemoria(), memoriaVacia())
      assert.deepEqual(await almacen.leerPerfil(), PERFIL_ROBERTO)
      assert.equal(await readFile(join(carpeta, 'huella.md'), 'utf8'), PERFIL_ROBERTO.markdown)

      const m = memoria({ hechos: [hecho({ id: 'laura', texto: 'Laura se opera el jueves.' })] })
      await almacen.guardarMemoria(m)
      assert.deepEqual(JSON.parse(await readFile(join(carpeta, 'memoria.json'), 'utf8')), m)
      assert.deepEqual(await crearAlmacenEnArchivos(carpeta).leerMemoria(), m)
    } finally {
      await rm(carpeta, { recursive: true, force: true })
    }
  })
})
