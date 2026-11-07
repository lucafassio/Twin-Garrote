// Correr: npx tsx --test src/vision/zonas.test.ts
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { crearClasificadorZonas, extraerRasgos, LARGO_RASGOS } from './zonas'

// Nube de puntos alrededor de un centro, determinista.
function nube(centro: number[], n: number, ruido = 0.05, semilla = 1) {
  let s = semilla
  const azar = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647 - 0.5
  }
  return Array.from({ length: n }, () => centro.map((c) => c + azar() * ruido * 2))
}

describe('clasificador de zonas', () => {
  const A = [0, 0, 0]
  const B = [1, 0, 0]
  const C = [0, 1, 1]

  function entrenado() {
    const c = crearClasificadorZonas({ k: 7 })
    c.entrenar([
      ...nube(A, 40, 0.05, 1).map((r) => ({ zona: 'a', rasgos: r })),
      ...nube(B, 40, 0.05, 2).map((r) => ({ zona: 'b', rasgos: r })),
      ...nube(C, 40, 0.05, 3).map((r) => ({ zona: 'c', rasgos: r })),
    ])
    return c
  }

  test('sin entrenar no clasifica', () => {
    const c = crearClasificadorZonas()
    assert.equal(c.listo(), false)
    assert.equal(c.clasificar([0, 0, 0]), null)
  })

  test('clasifica cada zona con confianza alta', () => {
    const c = entrenado()
    assert.equal(c.listo(), true)
    for (const [zona, centro] of [['a', A], ['b', B], ['c', C]] as const) {
      const r = c.clasificar([...centro])
      assert.ok(r)
      assert.equal(r.zona, zona)
      assert.ok(r.confianza > 0.9, `${zona}: ${r.confianza}`)
    }
  })

  test('entre dos zonas la confianza baja', () => {
    const c = entrenado()
    const r = c.clasificar([0.5, 0, 0])
    assert.ok(r)
    assert.ok(r.confianza < 0.9)
  })

  test('las probabilidades suman 1', () => {
    const r = entrenado().clasificar([0.2, 0.1, 0])
    assert.ok(r)
    const suma = Object.values(r.probabilidades).reduce((a, b) => a + b, 0)
    assert.ok(Math.abs(suma - 1) < 1e-9)
  })

  test('estandariza: un rasgo con escala enorme no domina', () => {
    const c = crearClasificadorZonas({ k: 5 })
    // El rasgo 0 separa las zonas; el rasgo 1 es ruido de escala 1000.
    c.entrenar([
      ...nube([0, 0], 30, 0.05, 4).map(([x], i) => ({ zona: 'a', rasgos: [x, ((i * 37) % 100) * 10] })),
      ...nube([1, 0], 30, 0.05, 5).map(([x], i) => ({ zona: 'b', rasgos: [x, ((i * 53) % 100) * 10] })),
    ])
    assert.equal(c.clasificar([1, 500])?.zona, 'b')
    assert.equal(c.clasificar([0, 500])?.zona, 'a')
  })

  test('agregar muestras de una zona corrige la deriva', () => {
    const c = entrenado()
    const corrido = [0.8, 0.5, 0] // la zona c se corrio hacia aca (hoy queda mas cerca de b)
    assert.notEqual(c.clasificar(corrido)?.zona, 'c')
    c.agregar('c', nube(corrido, 20, 0.02, 9))
    assert.equal(c.clasificar(corrido)?.zona, 'c')
  })

  test('exporta sus muestras y otro clasificador las importa igual', () => {
    const a = entrenado()
    const b = crearClasificadorZonas({ k: 7 })
    b.importar(JSON.parse(JSON.stringify(a.datos())))
    assert.equal(b.clasificar([1, 0, 0])?.zona, 'b')
    assert.equal(b.muestras('c'), a.muestras('c'))
  })

  test('guarda como maximo las ultimas muestras de cada zona', () => {
    const c = crearClasificadorZonas({ k: 3, maximoPorZona: 10 })
    c.entrenar(nube(A, 30, 0.05, 6).map((r) => ({ zona: 'a', rasgos: r })))
    assert.equal(c.muestras('a'), 10)
  })
})

describe('rasgos de la cara', () => {
  // Cara sintetica: 478 puntos en el centro, con ojos e iris en su lugar.
  function cara(irisDx = 0) {
    const p = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
    const ojo = (rabilloA: number, rabilloB: number, iris: number, arriba: number, abajo: number, cx: number) => {
      p[rabilloA] = { x: cx - 0.03, y: 0.45, z: 0 }
      p[rabilloB] = { x: cx + 0.03, y: 0.45, z: 0 }
      p[iris] = { x: cx + irisDx, y: 0.45, z: 0 }
      p[arriba] = { x: cx, y: 0.44, z: 0 }
      p[abajo] = { x: cx, y: 0.46, z: 0 }
    }
    ojo(33, 133, 468, 159, 145, 0.4)
    ojo(362, 263, 473, 386, 374, 0.6)
    return p
  }
  const forma = ['eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight'].map(
    (categoryName, i) => ({ categoryName, score: i / 10 }),
  )
  const identidad = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -50, 1]

  test('arma un vector de largo fijo', () => {
    const r = extraerRasgos(cara(), forma, identidad, 16 / 9)
    assert.ok(r)
    assert.equal(r.length, LARGO_RASGOS)
    assert.ok(r.every(Number.isFinite))
  })

  test('mover el iris cambia los rasgos del iris', () => {
    const a = extraerRasgos(cara(0), forma, identidad, 16 / 9)!
    const b = extraerRasgos(cara(0.01), forma, identidad, 16 / 9)!
    assert.notEqual(a[0], b[0])
  })

  test('sin iris no hay rasgos', () => {
    const p = cara()
    p.length = 468
    assert.equal(extraerRasgos(p, forma, identidad, 16 / 9), null)
  })

  test('sin matriz de pose usa ceros para la cabeza', () => {
    const r = extraerRasgos(cara(), forma, undefined, 16 / 9)
    assert.ok(r)
    assert.equal(r.length, LARGO_RASGOS)
  })
})
