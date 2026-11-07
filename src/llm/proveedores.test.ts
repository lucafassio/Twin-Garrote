import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nombreProveedor } from './proveedores.ts'

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
