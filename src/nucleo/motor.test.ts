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
  mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'] })
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
    await vaciarPromesas() // pasa por la lectura del turno (local, sin lector con modelo)
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
    bus.emit('turno', { texto: '¿Qué querés tomar?' }) // abierta: la opcion 1 va primero
    await vaciarPromesas() // lectura del turno
    await vaciarPromesas() // opciones
    bus.emit('parpadeoLargo', {})
    assert.deepEqual(dichos, [{ texto: 'Dale.' }])
  })

  test('Deletrear frena el barrido y lo que devuelve se dice en el bus', () => {
    mock.timers.tick(5000) // urgencia, si, no, espera, otra, deletrear
    bus.emit('parpadeoLargo', {})
    assert.equal(nucleo.obtener().deletreando, true)
    mock.timers.tick(3000)
    assert.equal(nucleo.obtener().iluminado, 5)
    nucleo.terminarDeletreo('Hola.')
    assert.equal(nucleo.obtener().deletreando, false)
    assert.deepEqual(dichos, [{ texto: 'Hola.' }])
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

  test('ojos perdidos del bus cancelan la eleccion pendiente', async () => {
    bus.emit('turno', { texto: '¿Qué querés tomar?' })
    await vaciarPromesas()
    await vaciarPromesas()
    bus.emit('ojos', { cerrados: true, progreso: 1 })
    bus.emit('parpadeoLargo', {})
    bus.emit('ojos', { cerrados: false, progreso: 0, perdido: true })
    assert.deepEqual(dichos, [])
  })

  test('la zona mirada llega al estado despues de 300 ms firme', () => {
    bus.emit('zonaMirada', { zona: 'franja', confianza: 0.9 })
    assert.equal(nucleo.obtener().zonaMirada, null)
    mock.timers.tick(300)
    bus.emit('zonaMirada', { zona: 'franja', confianza: 0.9 })
    assert.equal(nucleo.obtener().zonaMirada, 'franja')
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
    bus.emit('turno', { texto: '¿Querés un mate?' })
    await vaciarPromesas()
    await vaciarPromesas()
    assert.equal(nucleo.obtener().conversacion, 'sinConexion')
  })

  test('el ruido del bus no pide opciones', async () => {
    bus.emit('turno', { texto: 'eh' })
    await vaciarPromesas()
    assert.equal(pedidos.length, 0)
    assert.equal(nucleo.obtener().descartado, 'eh')
  })

  test('usa el lector con modelo si esta', async () => {
    nucleo.detener()
    const leidos: string[] = []
    nucleo = crearNucleo({
      velocidadMs: 1000,
      pedirOpciones: async (p) => {
        pedidos.push(p)
        return OPCIONES
      },
      leerTurno: async (texto) => {
        leidos.push(texto)
        return { paraUsuario: 0.9, completo: 0.9, tipo: 'comentario' }
      },
    })
    nucleo.iniciar()
    bus.emit('turno', { texto: 'eh' }) // la heuristica lo descartaria; el modelo lo acepta
    await vaciarPromesas()
    assert.deepEqual(leidos, ['eh'])
    assert.equal(pedidos.length, 1)
  })

  test('si el lector con modelo tarda mas de 800 ms, usa la heuristica local', async () => {
    nucleo.detener()
    nucleo = crearNucleo({
      velocidadMs: 1000,
      pedirOpciones: async (p) => {
        pedidos.push(p)
        return OPCIONES
      },
      leerTurno: () => new Promise(() => {}), // nunca responde
    })
    nucleo.iniciar()
    bus.emit('turno', { texto: '¿Querés un mate?' })
    await vaciarPromesas()
    assert.equal(pedidos.length, 0)
    mock.timers.tick(800)
    await vaciarPromesas()
    assert.equal(pedidos.length, 1)
  })

  test('si el lector con modelo falla, usa la heuristica local', async () => {
    nucleo.detener()
    nucleo = crearNucleo({
      velocidadMs: 1000,
      pedirOpciones: async (p) => {
        pedidos.push(p)
        return OPCIONES
      },
      leerTurno: async () => {
        throw new Error('sin red')
      },
    })
    nucleo.iniciar()
    bus.emit('turno', { texto: '¿Querés un mate?' })
    await vaciarPromesas()
    await vaciarPromesas()
    assert.equal(pedidos.length, 1)
  })

  test('un acumulado incompleto para el usuario se acepta a los 4 s', async () => {
    bus.emit('turno', { texto: 'Roberto' })
    await vaciarPromesas()
    assert.equal(pedidos.length, 0)
    mock.timers.tick(4000)
    assert.equal(pedidos.length, 1)
    assert.equal(pedidos[0].ultimoTurno, 'Roberto')
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
