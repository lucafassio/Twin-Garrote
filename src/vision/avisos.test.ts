// Correr: npx tsx --test src/vision/avisos.test.ts
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { esAvisoMediaPipe } from './avisos'

describe('avisos informativos de MediaPipe', () => {
  test('el INFO de XNNPACK es un aviso, no un error', () => {
    assert.equal(esAvisoMediaPipe(['INFO: Created TensorFlow Lite XNNPACK delegate for CPU.']), true)
    assert.equal(esAvisoMediaPipe(['INFO: Created TensorFlow Lite XNNPACK delegate for CPU.\n']), true)
  })

  test('los W de gl_context son avisos', () => {
    assert.equal(esAvisoMediaPipe(['W1107 16:58:39.724999 2213568 gl_context.cc:1136] OpenGL error checking is disabled']), true)
  })

  test('un error de verdad no se silencia', () => {
    assert.equal(esAvisoMediaPipe(['E1107 face_landmarker.cc:12] fallo el modelo']), false)
    assert.equal(esAvisoMediaPipe([new Error('algo')]), false)
    assert.equal(esAvisoMediaPipe(['No pudimos iniciar la cámara']), false)
  })
})
