// Correr: npx tsx --test src/nucleo/estabilizadorMirada.test.ts
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { crearEstabilizadorMirada } from './estabilizadorMirada'

describe('estabilizador de la mirada', () => {
  const nuevo = () => crearEstabilizadorMirada({ permanenciaMs: 300, umbral: 0.6, umbralMantener: 0.4, perdidaMs: 1000 })

  test('una zona firme 300 ms se marca', () => {
    const e = nuevo()
    assert.equal(e.leer({ zona: 'opcion0', confianza: 0.9 }, 0), undefined)
    assert.equal(e.leer({ zona: 'opcion0', confianza: 0.9 }, 200), undefined)
    assert.equal(e.leer({ zona: 'opcion0', confianza: 0.9 }, 300), 'opcion0')
    assert.equal(e.leer({ zona: 'opcion0', confianza: 0.9 }, 400), undefined) // ya marcada
  })

  test('un vistazo de menos de 300 ms no cambia la zona', () => {
    const e = nuevo()
    e.leer({ zona: 'opcion0', confianza: 0.9 }, 0)
    e.leer({ zona: 'opcion0', confianza: 0.9 }, 300)
    assert.equal(e.leer({ zona: 'opcion1', confianza: 0.9 }, 400), undefined)
    assert.equal(e.leer({ zona: 'opcion0', confianza: 0.9 }, 600), undefined)
    assert.equal(e.leer({ zona: 'opcion1', confianza: 0.9 }, 700), undefined)
  })

  test('cambiar de una zona marcada a otra pide 800 ms firmes', () => {
    const e = nuevo()
    e.leer({ zona: 'franja', confianza: 0.9 }, 0)
    e.leer({ zona: 'franja', confianza: 0.9 }, 300)
    e.leer({ zona: 'opcion3', confianza: 0.9 }, 400)
    assert.equal(e.leer({ zona: 'opcion3', confianza: 0.9 }, 900), undefined) // 500 ms: todavia no
    assert.equal(e.leer({ zona: 'opcion3', confianza: 0.9 }, 1200), 'opcion3')
  })

  test('la confianza baja no marca una zona nueva', () => {
    const e = nuevo()
    e.leer({ zona: 'opcion2', confianza: 0.5 }, 0)
    assert.equal(e.leer({ zona: 'opcion2', confianza: 0.5 }, 500), undefined)
  })

  test('histeresis: la zona marcada se mantiene con confianza media', () => {
    const e = nuevo()
    e.leer({ zona: 'franja', confianza: 0.9 }, 0)
    e.leer({ zona: 'franja', confianza: 0.9 }, 300)
    assert.equal(e.leer({ zona: 'franja', confianza: 0.45 }, 1500), undefined)
    assert.equal(e.leer({ zona: 'franja', confianza: 0.45 }, 3000), undefined)
  })

  test('sin zona confiable por 1 s, vuelve a null', () => {
    const e = nuevo()
    e.leer({ zona: 'opcion0', confianza: 0.9 }, 0)
    e.leer({ zona: 'opcion0', confianza: 0.9 }, 300)
    assert.equal(e.leer({ zona: null, confianza: 0 }, 400), undefined)
    assert.equal(e.leer({ zona: null, confianza: 0 }, 1400), null)
  })

  test('volver a una zona confiable antes del segundo no la pierde', () => {
    const e = nuevo()
    e.leer({ zona: 'opcion0', confianza: 0.9 }, 0)
    e.leer({ zona: 'opcion0', confianza: 0.9 }, 300)
    e.leer({ zona: null, confianza: 0 }, 400)
    e.leer({ zona: 'opcion0', confianza: 0.9 }, 900)
    assert.equal(e.leer({ zona: null, confianza: 0 }, 1500), undefined)
  })
})
