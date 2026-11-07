// Correr: node --test 'src/llm/*.test.ts'
// Saliencia (#36): los hechos de la opcion elegida suben de peso y aparecen antes en el prompt.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { PedidoOpciones } from '@/eventos'
import { crearOpciones } from './opciones.ts'
import { crearAlmacenEnMemoria } from './almacen.ts'
import { crearDisparadorMemoria } from './memoria.ts'
import { registrarEleccion, SALIENCIA_TOPE } from './saliencia.ts'
import { ESQUEMA_RESPUESTA } from './esquema.ts'
import type { Hecho, Memoria, Proveedor } from './tipos.ts'

const MIN = 60_000
const T0 = new Date('2026-11-07T15:00:00Z')
const despues = (ms: number) => new Date(T0.getTime() + ms)

const hecho = (h: Partial<Hecho> & { id: string; texto: string }): Hecho => ({
  origen: 'interlocutor',
  interlocutor: null,
  importancia: 5,
  fecha: T0.toISOString(),
  estado: 'activo',
  fechaInvalidacion: null,
  intimo: false,
  ...h,
})

const pedido = (p: Partial<PedidoOpciones> = {}): PedidoOpciones => ({
  historial: [],
  ultimoTurno: '¿Como andas?',
  yaMostradas: [],
  ...p,
})

// Cuatro opciones; cada una con los ids de hechos que devolveria el modelo.
const respuesta = (hechos: string[][]) =>
  JSON.stringify({
    opciones: hechos.map((ids, i) => ({ intencion: 'otra', texto: `Opcion ${i + 1}.`, hechos: ids })),
    registro: 'casual',
    nuevaConversacion: false,
  })

function guionado(respuestas: string[]) {
  const prompts: string[] = []
  const proveedor: Proveedor = {
    nombre: 'guionado',
    async generar(p) {
      prompts.push(p.usuario)
      const r = respuestas.shift()
      if (r === undefined) throw new Error('el guion se quedo sin respuestas')
      return r
    },
  }
  return { proveedor, prompts }
}

function armar(respuestas: string[], memoria: Partial<Memoria>) {
  const { proveedor, prompts } = guionado(respuestas)
  const almacen = crearAlmacenEnMemoria({ memoria })
  const generar = crearOpciones({ proveedor, almacen })
  const hechoDe = (id: string) => almacen.memoria().hechos.find((h) => h.id === id)!
  return { generar, prompts, almacen, hechoDe }
}

// El alias con que el prompt le muestra un hecho al modelo: "- [h2] Laura se opera..."
function alias(prompt: string, texto: string): string {
  const linea = prompt.split('\n').find((l) => l.includes(texto))
  const m = linea?.match(/^- \[(h\d+)\]/)
  assert.ok(m, `el hecho "${texto}" no esta en el prompt con su id`)
  return m[1]
}

// Los textos de los hechos en el orden en que aparecen en el prompt.
function ordenEnPrompt(prompt: string): string[] {
  const seccion = prompt.split('## Hechos que sabes\n')[1]?.split('\n\n')[0] ?? ''
  return seccion.split('\n').map((l) => l.replace(/^- \[h\d+\] /, ''))
}

const RIVER = hecho({ id: 'h-river', texto: 'Es hincha de River' })
const LAURA = hecho({ id: 'h-laura', texto: 'Laura es su hija' })

describe('saliencia', () => {
  test('el prompt muestra cada hecho con un id corto y pide los ids usados por opcion', async () => {
    const { generar, prompts } = armar([respuesta([[], [], [], []])], { hechos: [RIVER] })
    await generar(pedido(), T0)
    assert.equal(alias(prompts[0], 'hincha de River'), 'h1')
  })

  test('elegir una opcion sube la saliencia de sus hechos y anota su ultimo uso', async () => {
    const { generar, prompts, almacen, hechoDe } = armar([respuesta([['h1'], ['h2'], [], []])], {
      hechos: [RIVER, LAURA],
    })
    await generar(pedido(), T0)
    assert.equal(alias(prompts[0], 'hincha de River'), 'h1')
    assert.equal(alias(prompts[0], 'Laura es su hija'), 'h2')

    const subidos = await registrarEleccion(almacen, { tipo: 'opcion', texto: 'Opcion 1.' }, despues(MIN))
    assert.deepEqual(subidos, ['h-river'])
    assert.ok(hechoDe('h-river').saliencia! > 1)
    assert.equal(hechoDe('h-river').ultimoUso, despues(MIN).toISOString())
    assert.equal(hechoDe('h-laura').saliencia, undefined)
    assert.equal(hechoDe('h-laura').ultimoUso, undefined)
  })

  test('la saliencia sube hasta un tope', async () => {
    const { generar, almacen, hechoDe } = armar(
      Array.from({ length: 20 }, () => respuesta([['h1'], [], [], []])),
      { hechos: [RIVER] },
    )
    for (let i = 0; i < 20; i++) {
      await generar(pedido(), despues(i * MIN))
      await registrarEleccion(almacen, { tipo: 'opcion', texto: 'Opcion 1.' }, despues(i * MIN))
    }
    assert.equal(hechoDe('h-river').saliencia, SALIENCIA_TOPE)
  })

  test('"Otra" y las opciones fijas no tocan la saliencia', async () => {
    const { generar, almacen } = armar([respuesta([['h1'], ['h1'], ['h1'], ['h1']])], { hechos: [RIVER] })
    await generar(pedido(), T0)
    const antes = almacen.memoria().hechos
    for (const eleccion of [
      { tipo: 'otra' } as const,
      { tipo: 'fija', fija: 'si' } as const,
      { tipo: 'fija', fija: 'no' } as const,
      { tipo: 'fija', fija: 'espera' } as const,
      { tipo: 'fija', fija: 'deletrear' } as const,
      { tipo: 'fija', fija: 'repetir' } as const,
      { tipo: 'fija', fija: 'urgencia' } as const,
    ]) {
      assert.deepEqual(await registrarEleccion(almacen, eleccion, despues(MIN)), [])
    }
    assert.deepEqual(almacen.memoria().hechos, antes)
  })

  test('un texto que no esta entre las ultimas opciones mostradas no toca nada', async () => {
    const { generar, almacen, hechoDe } = armar([respuesta([['h1'], [], [], []])], { hechos: [RIVER] })
    await generar(pedido(), T0)
    assert.deepEqual(await registrarEleccion(almacen, { tipo: 'opcion', texto: 'Algo deletreado.' }, despues(MIN)), [])
    assert.equal(hechoDe('h-river').saliencia, undefined)
  })

  test('los ids que no estaban entre los hechos mandados al modelo se ignoran', async () => {
    const { generar, almacen, hechoDe } = armar([respuesta([['h1', 'h9', 'h-laura', 'inventado'], [], [], []])], {
      hechos: [RIVER, { ...LAURA, intimo: true }],
    })
    // Formal: Laura queda afuera del prompt por intima, aunque el modelo nombre su id real.
    await generar(pedido({ cercania: 'formal' }), T0)
    await registrarEleccion(almacen, { tipo: 'opcion', texto: 'Opcion 1.' }, despues(MIN))
    assert.equal(hechoDe('h-laura').saliencia, undefined)
    assert.deepEqual(almacen.memoria().conversacion?.mostradas?.[0].hechos.length, 1)
  })

  test('una respuesta sin ids de hechos se sigue leyendo', async () => {
    const sinIds = JSON.stringify({
      opciones: [1, 2, 3, 4].map((i) => ({ intencion: 'otra', texto: `Opcion ${i}.` })),
      registro: 'casual',
      nuevaConversacion: false,
    })
    const { generar, almacen } = armar([sinIds], { hechos: [RIVER] })
    const r = await generar(pedido(), T0)
    assert.equal(r.opciones.length, 4)
    assert.deepEqual(await registrarEleccion(almacen, { tipo: 'opcion', texto: 'Opcion 1.' }, despues(MIN)), [])
  })

  test('el esquema pide los ids de hechos por opcion, con todo requerido (lo aceptan los dos proveedores)', () => {
    const opcion = ESQUEMA_RESPUESTA.properties.opciones.items
    assert.deepEqual(opcion.properties.hechos, { type: 'array', items: { type: 'string' } })
    assert.deepEqual([...opcion.required].sort(), Object.keys(opcion.properties).sort())
    assert.equal(opcion.additionalProperties, false)
  })

  test('una opcion de una vuelta anterior se puede elegir aunque despues llegaran otras', async () => {
    // Un pedido cancelado en el cliente puede terminar igual en el servidor y guardar sus opciones.
    const otraVuelta = JSON.stringify({
      opciones: [5, 6, 7, 8].map((i) => ({ intencion: 'otra', texto: `Opcion ${i}.`, hechos: [] })),
      registro: 'casual',
      nuevaConversacion: false,
    })
    const { generar, almacen } = armar([respuesta([['h1'], [], [], []]), otraVuelta], { hechos: [RIVER] })
    await generar(pedido(), T0)
    await generar(pedido(), despues(MIN))
    assert.deepEqual(await registrarEleccion(almacen, { tipo: 'opcion', texto: 'Opcion 1.' }, despues(MIN)), ['h-river'])
  })

  test('si el mismo texto salio en dos vueltas, cuentan los hechos de la mas nueva', async () => {
    const { generar, almacen, hechoDe } = armar([respuesta([['h1'], [], [], []]), respuesta([[], [], [], []])], {
      hechos: [RIVER],
    })
    await generar(pedido(), T0)
    await generar(pedido(), despues(MIN))
    assert.deepEqual(await registrarEleccion(almacen, { tipo: 'opcion', texto: 'Opcion 1.' }, despues(MIN)), [])
    assert.equal(hechoDe('h-river').saliencia, undefined)
  })

  test('las opciones devueltas no llevan los ids de hechos', async () => {
    const { generar } = armar([respuesta([['h1'], [], [], []])], { hechos: [RIVER] })
    const r = await generar(pedido(), T0)
    assert.deepEqual(r.opciones[0], { intencion: 'otra', texto: 'Opcion 1.' })
  })

  test('el orden de los hechos en el prompt cambia con la saliencia', async () => {
    const memoria = {
      hechos: [hecho({ id: 'a', texto: 'Le gusta el mate', importancia: 6 }), hecho({ id: 'b', texto: 'Juega al truco', importancia: 5 })],
    }
    const sin = armar([respuesta([[], [], [], []])], memoria)
    await sin.generar(pedido(), T0)
    assert.deepEqual(ordenEnPrompt(sin.prompts[0]), ['Le gusta el mate', 'Juega al truco'])

    // Elegir una opcion que uso el truco lo pone primero.
    const con = armar([respuesta([['h2'], [], [], []]), respuesta([[], [], [], []])], memoria)
    await con.generar(pedido(), T0)
    await registrarEleccion(con.almacen, { tipo: 'opcion', texto: 'Opcion 1.' }, T0)
    await con.generar(pedido(), despues(MIN))
    assert.deepEqual(ordenEnPrompt(con.prompts[1]), ['Juega al truco', 'Le gusta el mate'])
  })

  test('la coincidencia con el turno sigue pesando junto con la saliencia', async () => {
    const memoria = {
      hechos: [
        hecho({ id: 'a', texto: 'Le gusta el mate', importancia: 6, saliencia: 1.5 }),
        hecho({ id: 'b', texto: 'Juega al truco con Pocho', importancia: 5 }),
      ],
    }
    const { generar, prompts } = armar([respuesta([[], [], [], []])], memoria)
    await generar(pedido({ ultimoTurno: '¿Jugamos un truco con Pocho?' }), T0)
    assert.deepEqual(ordenEnPrompt(prompts[0]), ['Juega al truco con Pocho', 'Le gusta el mate'])
  })

  test('con mas hechos que el tope de cantidad, uno saliente entra y uno sin uso queda afuera', async () => {
    const muchos = Array.from({ length: 12 }, (_, i) => hecho({ id: `x${i}`, texto: `Dato numero ${i}`, importancia: 6 }))
    const saliente = hecho({ id: 's', texto: 'Dato saliente', importancia: 5, saliencia: SALIENCIA_TOPE })
    const { generar, prompts } = armar([respuesta([[], [], [], []])], { hechos: [...muchos, saliente] })
    await generar(pedido(), T0)
    const orden = ordenEnPrompt(prompts[0])
    assert.equal(orden.length, 12)
    assert.equal(orden[0], 'Dato saliente')
    // Empatados en peso y fecha, el ultimo de la lista queda afuera.
    assert.ok(!orden.includes('Dato numero 11'))
  })

  test('si el agente de memoria guarda mientras se elige, la saliencia subida no se pierde', async () => {
    let soltar!: () => void
    const espera = new Promise<void>((r) => (soltar = r))
    const lento: Proveedor = {
      nombre: 'lento',
      async generar() {
        await espera
        return JSON.stringify({ hechos: [], resumen: 'Charlaron.' })
      },
    }
    const { generar, almacen, hechoDe } = armar([respuesta([['h1'], [], [], []])], { hechos: [RIVER] })
    await generar(pedido(), T0)
    const memoria = crearDisparadorMemoria({ proveedor: lento, almacen })
    memoria.disparar({ inicio: T0.toISOString(), fin: T0.toISOString(), lineas: [{ quien: 'usuario', texto: 'Hola.' }], cercania: null })
    await registrarEleccion(almacen, { tipo: 'opcion', texto: 'Opcion 1.' }, despues(MIN))
    soltar()
    await memoria.listo()
    assert.ok(hechoDe('h-river').saliencia! > 1)
    assert.equal(hechoDe('h-river').ultimoUso, despues(MIN).toISOString())
  })
})
