// Correr: node --test src/deletrear/deletrear.test.ts
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { buscar, clave, crearDiccionario } from './diccionario.ts'
import { validarFrases, validarPalabras } from './llm.ts'
import {
  agregarLetra,
  armarFilas,
  avanzar,
  BARRIDO_INICIAL,
  borrarPalabra,
  elegir,
  fragmento,
  iluminado,
  ponerPalabra,
  type Barrido,
  type Fila,
} from './barrido.ts'

describe('diccionario', () => {
  const dic = crearDiccionario('de 100\nfrío 50\nfrente 40\n# comentario\nfranco 10\naño 9\nano 1\n123 5\n', [])

  test('la clave saca tildes pero conserva la enie', () => {
    assert.equal(clave('Frío'), 'frio')
    assert.equal(clave('año'), 'año')
    assert.notEqual(clave('año'), clave('ano'))
  })

  test('busca por prefijo sin tildes, por frecuencia', () => {
    assert.deepEqual(buscar(dic, 'fr', [], 4, []), ['frío', 'frente', 'franco'])
    assert.deepEqual(buscar(dic, 'an', [], 4, []), ['ano'])
    assert.deepEqual(buscar(dic, 'añ', [], 4, []), ['año'])
  })

  test('las palabras de la charla van primero', () => {
    assert.deepEqual(buscar(dic, 'fr', ['franco'], 2, []), ['franco', 'frío'])
  })

  test('las extras van antes que la lista general', () => {
    assert.deepEqual(buscar(dic, 'fr', [], 2, ['frazada']), ['frazada', 'frío'])
  })

  test('sin fragmento no predice', () => {
    assert.deepEqual(buscar(dic, '', [], 4, []), [])
  })
})

describe('barrido', () => {
  const filas: Fila[] = armarFilas(['Tengo frío.'], ['frío'], true)

  test('orden: frases, palabras, acciones, letras, numeros', () => {
    assert.deepEqual(
      filas.map((f) => f.id),
      ['frases', 'palabras', 'acciones', 'l1', 'l2', 'l3', 'l4', 'l5', 'n1', 'n2'],
    )
    assert.deepEqual(
      armarFilas([], [], false).map((f) => f.id),
      ['acciones', 'l1', 'l2', 'l3', 'l4', 'l5', 'n1', 'n2'],
    )
  })

  test('los numeros se escriben como cualquier letra', () => {
    const n = filas.filter((f) => f.id === 'n1' || f.id === 'n2').flatMap((f) => f.items)
    assert.deepEqual(
      n.map((i) => (i.tipo === 'letra' ? i.letra : '?')).join(''),
      '1234567890',
    )
    assert.equal(agregarLetra('tengo ', '8'), 'tengo 8')
  })

  test('entra a la fila y elige una letra, despues vuelve arriba', () => {
    let b: Barrido = BARRIDO_INICIAL
    b = avanzar(avanzar(avanzar(b, filas), filas), filas) // frases -> palabras -> acciones -> l1
    assert.deepEqual(iluminado(b, filas), { fila: 'l1', item: null })
    b = elegir(b, filas).barrido
    b = avanzar(b, filas) // ' ' -> 'e'
    const r = elegir(b, filas)
    assert.deepEqual(r.item, { tipo: 'letra', letra: 'e' })
    assert.deepEqual(r.barrido, BARRIDO_INICIAL)
  })

  test('si recorre la fila entera sin elegir, vuelve arriba', () => {
    let b = elegir(BARRIDO_INICIAL, filas).barrido // dentro de frases (1 item)
    b = avanzar(b, filas)
    assert.deepEqual(iluminado(b, filas), { fila: 'frases', item: null })
    assert.equal(b.dentro, null)
  })

  test('se pausa tras 3 vueltas y el parpadeo largo lo reanuda sin elegir', () => {
    let b: Barrido = BARRIDO_INICIAL
    for (let i = 0; i < filas.length * 3; i++) b = avanzar(b, filas)
    assert.equal(b.pausado, true)
    const r = elegir(b, filas)
    assert.equal(r.item, null)
    assert.deepEqual(r.barrido, BARRIDO_INICIAL)
  })
})

describe('validacion de lo que devuelve el LLM', () => {
  test('frases: deben usar la palabra a medias, sin repetidas, maximo 4', () => {
    const json = JSON.stringify({
      frases: ['El lunes tengo franco.', 'El lunes tengo frío.', 'Hola, ¿cómo andás?', 'el lunes tengo franco', 'Tengo francos', 'Fresco', ''],
    })
    assert.deepEqual(validarFrases(json, 'el lunes tengo fr'), ['El lunes tengo franco.', 'El lunes tengo frío.', 'Tengo francos', 'Fresco'])
  })

  test('palabras: una sola palabra que empieza con la palabra a medias', () => {
    const json = JSON.stringify({ palabras: ['franco', 'Frío', 'fresco', 'mañana', 'fr io', 'franco'] })
    assert.deepEqual(validarPalabras(json, 'el lunes tengo fr'), ['franco', 'Frío', 'fresco'])
  })

  test('JSON invalido no rompe', () => {
    assert.deepEqual(validarFrases('no es json', 'fr'), [])
    assert.deepEqual(validarPalabras('{"otra":1}', 'fr'), [])
  })
})

describe('texto', () => {
  test('espacio sin duplicar ni al principio', () => {
    assert.equal(agregarLetra('', ' '), '')
    assert.equal(agregarLetra('hola ', ' '), 'hola ')
    assert.equal(agregarLetra('hola', ' '), 'hola ')
  })

  test('poner palabra reemplaza el fragmento y agrega espacio', () => {
    assert.equal(fragmento('el lunes tengo fr'), 'fr')
    assert.equal(ponerPalabra('el lunes tengo fr', 'franco'), 'el lunes tengo franco ')
    assert.equal(ponerPalabra('', 'hola'), 'hola ')
  })

  test('borrar palabra', () => {
    assert.equal(borrarPalabra('tengo fr'), 'tengo ')
    assert.equal(borrarPalabra('tengo frio '), 'tengo ')
    assert.equal(borrarPalabra('tengo'), '')
  })
})
