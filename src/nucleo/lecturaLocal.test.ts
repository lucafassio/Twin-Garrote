// Correr: npx tsx --test src/nucleo/lecturaLocal.test.ts
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { leerTurnoLocal } from './lecturaLocal'

const leer = (texto: string, robertoAcabaDeHablar = false) =>
  leerTurnoLocal(texto, { nombreUsuario: 'Roberto', usuarioAcabaDeHablar: robertoAcabaDeHablar })

describe('lectura local del turno', () => {
  test('muletillas solas son ruido', () => {
    assert.ok(leer('eh').paraUsuario < 0.4)
    assert.ok(leer('sí sí').paraUsuario < 0.4)
    assert.ok(leer('mmm bueno').paraUsuario < 0.4)
  })

  test('el nombre solo es para el usuario pero esta incompleto', () => {
    const l = leer('Roberto')
    assert.ok(l.paraUsuario >= 0.6)
    assert.ok(l.completo < 0.6)
  })

  test('una pregunta en segunda persona es para el usuario, completa y de si o no', () => {
    for (const t of ['¿Querés un mate?', 'querés un mate', 'tenés frío']) {
      const l = leer(t)
      assert.ok(l.paraUsuario >= 0.6, t)
      assert.ok(l.completo >= 0.6, t)
      assert.equal(l.tipo, 'siNo', t)
    }
  })

  test('una pregunta con palabra interrogativa es abierta', () => {
    const l = leer('qué querés comer hoy')
    assert.equal(l.tipo, 'abierta')
    assert.ok(l.completo >= 0.6)
  })

  test('un saludo con el nombre es para el usuario y completo', () => {
    const l = leer('hola Roberto')
    assert.equal(l.tipo, 'saludo')
    assert.ok(l.paraUsuario >= 0.6)
    assert.ok(l.completo >= 0.6)
  })

  test('un comentario dirigido a el es comentario completo', () => {
    const l = leer('mañana viene Laura a visitarte')
    assert.equal(l.tipo, 'comentario')
    assert.ok(l.paraUsuario >= 0.6)
    assert.ok(l.completo >= 0.6)
  })

  test('una frase que termina en conector esta incompleta', () => {
    assert.ok(leer('y entonces le dije que').completo < 0.6)
    assert.ok(leer('querés que te traiga un').completo < 0.6)
  })

  test('una frase en tercera persona sin nombrarlo no parece para el usuario', () => {
    assert.ok(leer('el proyecto está muy bueno').paraUsuario < 0.4)
  })

  test('si el usuario acaba de hablar, lo que sigue probablemente es para el', () => {
    assert.ok(leer('el proyecto está muy bueno', true).paraUsuario >= 0.4)
  })

  test('nombrar al usuario sube la probabilidad aunque sea tercera persona', () => {
    assert.ok(leer('Roberto Laura llega a las ocho').paraUsuario >= 0.6)
  })
})
