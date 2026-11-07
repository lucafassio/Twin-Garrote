import { test } from 'node:test'
import assert from 'node:assert/strict'
import { elegirProveedorRollup, modeloRollup, nombreProveedor } from './proveedores.ts'

test('sin keys queda el falso', () => {
  assert.equal(nombreProveedor({}), 'falso')
  assert.equal(nombreProveedor({ LLM_PROVEEDOR: 'gateway' }), 'falso')
  assert.equal(nombreProveedor({ LLM_PROVEEDOR: 'anthropic' }), 'falso')
})

test('LLM_PROVEEDOR elige si hay key', () => {
  const env = { AI_GATEWAY_API_KEY: 'x', ANTHROPIC_API_KEY: 'y' }
  assert.equal(nombreProveedor({ ...env, LLM_PROVEEDOR: 'gateway' }), 'gateway')
  assert.equal(nombreProveedor({ ...env, LLM_PROVEEDOR: 'anthropic' }), 'anthropic')
  assert.equal(nombreProveedor({ ...env, LLM_PROVEEDOR: 'falso' }), 'falso')
})

test('sin LLM_PROVEEDOR usa la primera key disponible, gateway primero', () => {
  assert.equal(nombreProveedor({ ANTHROPIC_API_KEY: 'y' }), 'anthropic')
  assert.equal(nombreProveedor({ AI_GATEWAY_API_KEY: 'x' }), 'gateway')
  assert.equal(nombreProveedor({ AI_GATEWAY_API_KEY: 'x', ANTHROPIC_API_KEY: 'y' }), 'gateway')
})

test('cada rollup tiene su modelo: Haiku para dia y semana, Sonnet para mes y huella', () => {
  const gateway = { AI_GATEWAY_API_KEY: 'x' }
  assert.equal(modeloRollup('dia', gateway), 'anthropic/claude-haiku-5.5')
  assert.equal(modeloRollup('semana', gateway), 'anthropic/claude-haiku-5.5')
  assert.equal(modeloRollup('mes', gateway), 'anthropic/claude-sonnet-5.5')
  assert.equal(modeloRollup('huella', gateway), 'anthropic/claude-sonnet-5.5')
  const anthropic = { ANTHROPIC_API_KEY: 'y' }
  assert.equal(modeloRollup('dia', anthropic), 'claude-haiku-5-5')
  assert.equal(modeloRollup('mes', anthropic), 'claude-sonnet-5-5')
})

test('el modelo de un rollup se cambia por configuracion, con alias o id completo', () => {
  const env = { AI_GATEWAY_API_KEY: 'x', LLM_MODELO_DIA: 'sonnet', LLM_MODELO_MES: 'anthropic/claude-opus-5.5' }
  assert.equal(modeloRollup('dia', env), 'anthropic/claude-sonnet-5.5')
  assert.equal(modeloRollup('mes', env), 'anthropic/claude-opus-5.5')
  assert.equal(elegirProveedorRollup('dia', env).nombre, 'gateway:anthropic/claude-sonnet-5.5')
  // Sin keys, el falso: la app nunca se rompe por no tener claves.
  assert.equal(elegirProveedorRollup('mes', {}).nombre, 'falso')
})
