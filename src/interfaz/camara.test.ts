// Correr: npx tsx --test src/interfaz/camara.test.ts
import { afterEach, beforeEach, describe, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import { crearControladorCamara } from './camara'
import { evaluarEncuadre } from './encuadre'

const vaciar = () => new Promise((r) => setImmediate(r))

describe('controlador de camara', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }))
  afterEach(() => mock.timers.reset())

  function falso() {
    const llamadas = { iniciar: 0, apagar: 0 }
    const iniciar = async () => {
      llamadas.iniciar++
      return () => {
        llamadas.apagar++
      }
    }
    return { llamadas, control: crearControladorCamara(iniciar) }
  }

  test('el doble montaje de React prende la camara una sola vez y no la apaga', async () => {
    const { llamadas, control } = falso()
    const a = control.enganchar('video')
    a.soltar() // React desmonta
    const b = control.enganchar('video') // y vuelve a montar
    await b.listo
    mock.timers.tick(500)
    await vaciar()
    assert.equal(llamadas.iniciar, 1)
    assert.equal(llamadas.apagar, 0)
  })

  test('al soltar del todo, apaga la camara', async () => {
    const { llamadas, control } = falso()
    const a = control.enganchar('video')
    await a.listo
    a.soltar()
    mock.timers.tick(500)
    await vaciar()
    assert.equal(llamadas.apagar, 1)
  })

  test('si prender falla, el proximo intento vuelve a probar', async () => {
    let intentos = 0
    const control = crearControladorCamara(async () => {
      intentos++
      if (intentos === 1) throw new Error('sin permiso')
      return () => {}
    })
    await assert.rejects(control.enganchar('video').listo, /sin permiso/)
    await control.enganchar('video').listo
    assert.equal(intentos, 2)
  })
})

describe('encuadre de la cara', () => {
  const bien = { x: 0.5, y: 0.45, ancho: 0.12 }

  test('sin cara pide ponerse frente a la camara', () => {
    const e = evaluarEncuadre([null, null, null])
    assert.equal(e.listo, false)
    assert.match(e.consejo, /cara/i)
  })

  test('cara centrada a buena distancia esta lista', () => {
    const e = evaluarEncuadre(Array(10).fill(bien))
    assert.equal(e.listo, true)
    assert.ok(e.cara && e.centrada && e.distancia === 'bien')
  })

  test('muy lejos pide acercarse', () => {
    const e = evaluarEncuadre(Array(10).fill({ ...bien, ancho: 0.05 }))
    assert.equal(e.distancia, 'lejos')
    assert.match(e.consejo, /acerc/i)
  })

  test('muy cerca pide alejarse', () => {
    const e = evaluarEncuadre(Array(10).fill({ ...bien, ancho: 0.3 }))
    assert.equal(e.distancia, 'cerca')
    assert.match(e.consejo, /alej/i)
  })

  test('corrida a un costado pide centrarse', () => {
    const e = evaluarEncuadre(Array(10).fill({ ...bien, x: 0.85 }))
    assert.equal(e.centrada, false)
    assert.match(e.consejo, /centr/i)
  })

  test('si la cara se pierde seguido no esta lista', () => {
    const e = evaluarEncuadre([bien, null, bien, null, bien, null, bien, null, bien, null])
    assert.equal(e.listo, false)
  })
})
