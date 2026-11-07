// Correr: node --test 'src/llm/*.test.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { periodoAnterior, periodoDe } from './periodos.ts'

const iso = (p: { desde: Date; hasta: Date }) => [p.desde.toISOString(), p.hasta.toISOString()]

test('el dia corta a la medianoche de Argentina (03:00 UTC)', () => {
  // 01:30 UTC del 8 es 22:30 del 7 en Argentina.
  assert.deepEqual(iso(periodoDe('dia', new Date('2026-11-08T01:30:00Z'))), [
    '2026-11-07T03:00:00.000Z',
    '2026-11-08T03:00:00.000Z',
  ])
  assert.deepEqual(iso(periodoDe('dia', new Date('2026-11-08T03:00:00Z'))), [
    '2026-11-08T03:00:00.000Z',
    '2026-11-09T03:00:00.000Z',
  ])
})

test('la semana va de lunes a lunes, en hora de Argentina', () => {
  // Sabado 7/11/2026 a la tarde: la semana arranca el lunes 2/11.
  assert.deepEqual(iso(periodoDe('semana', new Date('2026-11-07T18:00:00Z'))), [
    '2026-11-02T03:00:00.000Z',
    '2026-11-09T03:00:00.000Z',
  ])
  // Lunes 9/11 a la 01:00 de Argentina: semana nueva.
  assert.deepEqual(iso(periodoDe('semana', new Date('2026-11-09T04:00:00Z'))), [
    '2026-11-09T03:00:00.000Z',
    '2026-11-16T03:00:00.000Z',
  ])
  // Domingo 8/11 a las 23:00 de Argentina (02:00 UTC del lunes) es todavia la semana anterior.
  assert.equal(periodoDe('semana', new Date('2026-11-09T02:00:00Z')).desde.toISOString(), '2026-11-02T03:00:00.000Z')
})

test('el mes corta el dia 1 a la medianoche de Argentina, tambien al cambiar de anio', () => {
  assert.deepEqual(iso(periodoDe('mes', new Date('2026-12-31T23:00:00Z'))), [
    '2026-12-01T03:00:00.000Z',
    '2027-01-01T03:00:00.000Z',
  ])
  // 1/1 a las 01:00 UTC es todavia 31/12 en Argentina.
  assert.equal(periodoDe('mes', new Date('2027-01-01T01:00:00Z')).desde.toISOString(), '2026-12-01T03:00:00.000Z')
})

test('el periodo anterior es el que termina donde empieza el actual', () => {
  assert.deepEqual(iso(periodoAnterior('dia', new Date('2026-11-08T12:00:00Z'))), [
    '2026-11-07T03:00:00.000Z',
    '2026-11-08T03:00:00.000Z',
  ])
  assert.deepEqual(iso(periodoAnterior('mes', new Date('2026-01-15T12:00:00Z'))), [
    '2025-12-01T03:00:00.000Z',
    '2026-01-01T03:00:00.000Z',
  ])
})
