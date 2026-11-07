// Correr: npx tsx --test src/nucleo/motor.test.ts
import { afterEach, beforeEach, describe, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import { bus, type Opcion, type PedidoOpciones } from '@/eventos'
import { crearNucleo, type Nucleo } from './motor'

const OPCIONES: Opcion[] = [
  { intencion: 'aceptar', texto: 'Dale.' },
  { intencion: 'rechazar', texto: 'No, gracias.' },
]

// Deja correr las promesas pendientes.
const vaciarPromesas = () => new Promise((r) => setImmediate(r))

let nucleo: Nucleo
let pedidos: PedidoOpciones[]
let dichos: { texto: string; urgencia?: boolean }[]
let offDecir: () => void

beforeEach(() => {
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
  pedidos = []
  dichos = []
  offDecir = bus.on('decir', (d) => dichos.push(d))
  nucleo = crearNucleo({
    velocidadMs: 1000,
    pedirOpciones: async (p) => {
      pedidos.push(p)
      return OPCIONES
    },
  })
  nucleo.iniciar()
})

afterEach(() => {
  nucleo.detener()
  offDecir()
  mock.timers.reset()
})

describe('motor', () => {
  test('un turno del bus pide opciones y las muestra', async () => {
    bus.emit('turno', { texto: '¿Queres mate?' })
    assert.equal(pedidos.length, 1)
    assert.equal(pedidos[0].ultimoTurno, '¿Queres mate?')
    await vaciarPromesas()
    assert.equal(nucleo.obtener().conversacion, 'opciones')
  })

  test('el barrido avanza con el tiempo', () => {
    mock.timers.tick(1000)
    assert.equal(nucleo.obtener().iluminado, 1)
    mock.timers.tick(2000)
    assert.equal(nucleo.obtener().iluminado, 3)
  })

  test('un parpadeo largo emite decir en el bus', async () => {
    bus.emit('turno', { texto: '¿Queres mate?' })
    await vaciarPromesas()
    bus.emit('parpadeoLargo', {})
    assert.deepEqual(dichos, [{ texto: 'Dale.' }])
  })

  test('2 s con los ojos cerrados disparan la urgencia', () => {
    bus.emit('ojos', { cerrados: true, progreso: 0 })
    mock.timers.tick(1999)
    assert.equal(nucleo.obtener().urgencia, false)
    mock.timers.tick(1)
    assert.equal(nucleo.obtener().urgencia, true)
    assert.deepEqual(dichos, [{ texto: 'Necesito ayuda.', urgencia: true }])
  })

  test('abrir los ojos antes de 2 s no dispara la urgencia', () => {
    bus.emit('ojos', { cerrados: true, progreso: 0 })
    mock.timers.tick(1500)
    bus.emit('ojos', { cerrados: false, progreso: 0 })
    mock.timers.tick(1000)
    assert.equal(nucleo.obtener().urgencia, false)
  })

  test('si no llega hablando, el barrido vuelve a los 3 s', () => {
    mock.timers.tick(1000) // sin turno el barrido es Urgencia, Si...: ilumina Si
    bus.emit('parpadeoLargo', {})
    assert.equal(nucleo.obtener().esperandoHabla, true)
    mock.timers.tick(3000)
    assert.equal(nucleo.obtener().esperandoHabla, false)
  })

  test('cortarUrgencia emite detenerUrgencia en el bus', () => {
    let detenida = false
    const off = bus.on('detenerUrgencia', () => (detenida = true))
    bus.emit('ojos', { cerrados: true, progreso: 0 })
    mock.timers.tick(2000)
    nucleo.cortarUrgencia()
    off()
    assert.equal(detenida, true)
  })

  test('la falsa alarma confirmada emite detenerUrgencia con falsaAlarma', () => {
    const recibidos: { falsaAlarma?: boolean }[] = []
    const off = bus.on('detenerUrgencia', (d) => recibidos.push(d))
    bus.emit('parpadeoLargo', {}) // sin turno, lo primero iluminado es Urgencia
    bus.emit('parpadeoLargo', {})
    bus.emit('parpadeoLargo', {})
    off()
    assert.deepEqual(recibidos, [{ falsaAlarma: true }])
  })

  test('si no confirma la falsa alarma en 5 s vuelve al primer paso', () => {
    bus.emit('parpadeoLargo', {})
    bus.emit('parpadeoLargo', {})
    assert.equal(nucleo.obtener().urgenciaPaso, 'confirmar')
    mock.timers.tick(5000)
    assert.equal(nucleo.obtener().urgenciaPaso, 'aviso')
  })

  test('repetir de la sala emite repetir en el bus', () => {
    let repetido = false
    const off = bus.on('repetir', () => (repetido = true))
    mock.timers.tick(1000) // ilumina Si
    bus.emit('parpadeoLargo', {})
    bus.emit('hablando', { activo: true })
    bus.emit('hablando', { activo: false })
    nucleo.repetir()
    off()
    assert.equal(repetido, true)
  })

  test('el evento escuchando llega al estado', () => {
    bus.emit('escuchando', { activo: true })
    assert.equal(nucleo.obtener().escuchando, true)
  })

  test('si pedirOpciones falla queda sin conexion', async () => {
    nucleo.detener()
    nucleo = crearNucleo({
      velocidadMs: 1000,
      pedirOpciones: async () => {
        throw new Error('red')
      },
    })
    nucleo.iniciar()
    bus.emit('turno', { texto: 'Hola' })
    await vaciarPromesas()
    assert.equal(nucleo.obtener().conversacion, 'sinConexion')
  })

  test('los suscriptores se enteran de cada cambio', () => {
    let avisos = 0
    const off = nucleo.suscribir(() => avisos++)
    mock.timers.tick(1000)
    off()
    assert.ok(avisos >= 1)
  })

  test('detener deja de escuchar el bus', () => {
    nucleo.detener()
    bus.emit('turno', { texto: 'Hola' })
    assert.equal(pedidos.length, 0)
    nucleo.iniciar() // para que afterEach pueda detener sin romper
  })
})
