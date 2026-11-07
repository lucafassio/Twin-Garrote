// Correr: node --test 'src/llm/*.test.ts'
// La memoria cargada de la medicion de latencia (#41) tiene que poner todos los niveles en el prompt:
// si no, la medicion mide un prompt mas chico que el real.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { PedidoOpciones } from '@/eventos'
import { crearAlmacenEnMemoria } from './almacen.ts'
import { memoriaCargada } from './memoria-cargada.ts'
import { estimarTokens } from './tokens.ts'
import { crearOpciones } from './opciones.ts'
import type { Proveedor } from './tipos.ts'

const AHORA = new Date('2026-11-07T18:00:00Z')

const RESPUESTA = JSON.stringify({
  opciones: [
    { intencion: 'aceptar', texto: 'Dale.', hechos: [] },
    { intencion: 'rechazar', texto: 'No, gracias.', hechos: [] },
    { intencion: 'preguntar', texto: '¿Por que?', hechos: [] },
    { intencion: 'otra', texto: 'Despues vemos.', hechos: [] },
  ],
  registro: 'casual',
  nuevaConversacion: true,
})

async function promptCon(pedido: Partial<PedidoOpciones> = {}) {
  const prompts: string[] = []
  const proveedor: Proveedor = {
    nombre: 'guionado',
    async generar(p) {
      prompts.push(`${p.sistema}\n\n${p.usuario}`)
      return RESPUESTA
    },
  }
  const almacen = crearAlmacenEnMemoria({ memoria: memoriaCargada(AHORA) })
  const generar = crearOpciones({ proveedor, almacen })
  await generar({ historial: [], ultimoTurno: '¿Que queres comer hoy?', yaMostradas: [], cercania: 'familia', ...pedido }, AHORA)
  return prompts[0]
}

describe('memoria cargada para medir latencia', () => {
  test('con cercania familia entran la huella aprendida, los tres bloques y las conversaciones de hoy', async () => {
    const prompt = await promptCon()
    assert.match(prompt, /## Huella aprendida/)
    assert.match(prompt, /# Resumen de octubre de 2026/)
    assert.match(prompt, /# Resumen de la semana del lunes 26\/10\/2026/)
    assert.match(prompt, /# Resumen del viernes 6\/11\/2026/)
    assert.match(prompt, /# Conversaciones de hoy/)
  })

  test('con cercania formal no entran bloques ni huella aprendida: todos citan hechos intimos', async () => {
    const prompt = await promptCon({ cercania: 'formal' })
    assert.doesNotMatch(prompt, /## Huella aprendida/)
    assert.doesNotMatch(prompt, /# Resumen (del|de)/)
    assert.match(prompt, /# Conversaciones de hoy/)
  })

  test('entran 12 hechos, el tope, y el mas saliente va antes que uno de igual importancia sin uso', async () => {
    const prompt = await promptCon({ ultimoTurno: 'Hola' })
    const hechos = prompt.split('\n').filter((l) => /^- \[h\d+\]/.test(l))
    assert.equal(hechos.length, 12)
    const nieto = hechos.findIndex((l) => l.includes('Tomas'))
    const marta = hechos.findIndex((l) => l.includes('Marta lo acompana'))
    assert.ok(nieto >= 0 && marta >= 0 && nieto < marta, 'saliencia alta primero')
  })

  test('las conversaciones de hoy mezclan resumenes enteros y recortados a la primera linea', async () => {
    const prompt = await promptCon()
    const hoy = prompt.split('# Conversaciones de hoy\n')[1].split('\n\n')[0]
    assert.match(hoy, /segunda linea reciente/)
    assert.doesNotMatch(hoy, /segunda linea vieja/)
  })

  test('el prompt cargado pasa de 2.000 tokens estimados y no llega al umbral del modelo de decision', async () => {
    const tokens = estimarTokens(await promptCon())
    assert.ok(tokens > 2000 && tokens < 4000, `tokens: ${tokens}`)
  })

  test('estimarTokens cuenta un token cada ~2,3 caracteres', () => {
    assert.equal(estimarTokens('a'.repeat(23)), 10)
  })
})
