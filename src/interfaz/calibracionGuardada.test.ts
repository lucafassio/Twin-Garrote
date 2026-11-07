// Correr: npx tsx --test src/interfaz/calibracionGuardada.test.ts
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { difiereEncuadre, leerCalibracion, serializarCalibracion, type CalibracionGuardada } from './calibracionGuardada'

const BASE: CalibracionGuardada = {
  version: 1,
  fecha: 1_700_000_000_000,
  vision: { lineaBase: 0.12, umbral: 0.5, zonas: { opcion0: [[0.1, 0.2]], franja: [[0.3, 0.4]] } },
  largoRasgos: 2,
  encuadre: { x: 0.5, y: 0.45, ancho: 0.12 },
}

describe('calibracion guardada', () => {
  test('se guarda y se lee igual', () => {
    assert.deepEqual(leerCalibracion(serializarCalibracion(BASE), 2), BASE)
  })

  test('sin nada guardado devuelve null', () => {
    assert.equal(leerCalibracion(null, 2), null)
  })

  test('un texto roto devuelve null', () => {
    assert.equal(leerCalibracion('{no es json', 2), null)
  })

  test('otra version devuelve null', () => {
    assert.equal(leerCalibracion(JSON.stringify({ ...BASE, version: 99 }), 2), null)
  })

  test('si cambiaron los rasgos de la mirada (otro largo), no se usa', () => {
    assert.equal(leerCalibracion(serializarCalibracion(BASE), 20), null)
  })

  test('sin muestras de mirada no sirve', () => {
    const vacia = { ...BASE, vision: { ...BASE.vision, zonas: {} } }
    assert.equal(leerCalibracion(serializarCalibracion(vacia), 2), null)
  })
})

describe('encuadre distinto al de la calibracion', () => {
  const guardado = { x: 0.5, y: 0.45, ancho: 0.12 }

  test('la misma posicion no difiere', () => {
    assert.equal(difiereEncuadre(guardado, { x: 0.52, y: 0.46, ancho: 0.125 }), false)
  })

  test('mucho mas cerca difiere', () => {
    assert.equal(difiereEncuadre(guardado, { ...guardado, ancho: 0.16 }), true)
  })

  test('corrida a un costado difiere', () => {
    assert.equal(difiereEncuadre(guardado, { ...guardado, x: 0.62 }), true)
  })
})
