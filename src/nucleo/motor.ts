import { bus, type Opcion, type PedidoOpciones } from '@/eventos'
import { estadoInicial, reducir } from './reductor'
import type { Accion, Efecto, Estado } from './tipos'

// Conecta el reductor con el mundo: escucha el bus, maneja los timers,
// llama al LLM y emite decir / detenerUrgencia. No decide nada: las reglas
// estan todas en el reductor.

export const VELOCIDAD_INICIAL_MS = 1200
export const GESTO_URGENCIA_MS = 2000
export const MAXIMO_ESPERA_HABLA_MS = 3000
export const MAXIMO_OPCIONES = 4

export type OpcionesNucleo = {
  pedirOpciones: (pedido: PedidoOpciones) => Promise<Opcion[]>
  velocidadMs?: number
}

export type Nucleo = {
  iniciar(): void
  detener(): void
  obtener(): Estado
  suscribir(fn: () => void): () => void
  cortarUrgencia(): void
  setVelocidad(ms: number): void
  velocidad(): number
}

export function crearNucleo({ pedirOpciones, velocidadMs = VELOCIDAD_INICIAL_MS }: OpcionesNucleo): Nucleo {
  let estado = estadoInicial
  let velocidad = velocidadMs
  let activo = false
  const oyentes = new Set<() => void>()
  let offs: (() => void)[] = []
  let tick: ReturnType<typeof setInterval> | null = null
  let gesto: ReturnType<typeof setTimeout> | null = null
  let espera: ReturnType<typeof setTimeout> | null = null

  function despachar(accion: Accion) {
    if (!activo) return
    const r = reducir(estado, accion)
    estado = r.estado
    r.efectos.forEach(ejecutar)
    oyentes.forEach((fn) => fn())
  }

  function reiniciarTick() {
    if (tick) clearInterval(tick)
    tick = setInterval(() => despachar({ tipo: 'tick' }), velocidad)
  }

  function limpiarTimers() {
    if (tick) clearInterval(tick)
    if (gesto) clearTimeout(gesto)
    if (espera) clearTimeout(espera)
    tick = gesto = espera = null
  }

  function ejecutar(efecto: Efecto) {
    switch (efecto.tipo) {
      case 'decir':
        bus.emit('decir', efecto.urgencia ? { texto: efecto.texto, urgencia: true } : { texto: efecto.texto })
        break
      case 'detenerUrgencia':
        bus.emit('detenerUrgencia', {})
        break
      case 'pedirOpciones': {
        const { pedidoId } = efecto
        pedirOpciones(efecto.pedido).then(
          (opciones) => despachar({ tipo: 'opcionesRecibidas', pedidoId, opciones: opciones.slice(0, MAXIMO_OPCIONES) }),
          () => despachar({ tipo: 'opcionesFallaron', pedidoId }),
        )
        break
      }
      case 'reiniciarTick':
        reiniciarTick()
        break
      case 'armarGestoUrgencia':
        if (gesto) clearTimeout(gesto)
        gesto = setTimeout(() => despachar({ tipo: 'gestoUrgencia' }), GESTO_URGENCIA_MS)
        break
      case 'desarmarGestoUrgencia':
        if (gesto) clearTimeout(gesto)
        gesto = null
        break
      case 'armarEsperaHabla':
        if (espera) clearTimeout(espera)
        espera = setTimeout(() => despachar({ tipo: 'finEsperaHabla' }), MAXIMO_ESPERA_HABLA_MS)
        break
    }
  }

  return {
    iniciar() {
      if (activo) return
      activo = true
      offs = [
        bus.on('turno', ({ texto }) => despachar({ tipo: 'turno', texto })),
        bus.on('transcripcionParcial', ({ texto }) => despachar({ tipo: 'parcial', texto })),
        bus.on('ojos', ({ cerrados, progreso }) => despachar({ tipo: 'ojos', cerrados, progreso })),
        bus.on('parpadeoLargo', () => despachar({ tipo: 'parpadeoLargo' })),
        bus.on('hablando', ({ activo }) => despachar({ tipo: 'hablando', activo })),
      ]
      reiniciarTick()
    },
    detener() {
      activo = false
      offs.forEach((off) => off())
      offs = []
      limpiarTimers()
    },
    obtener: () => estado,
    suscribir(fn) {
      oyentes.add(fn)
      return () => {
        oyentes.delete(fn)
      }
    },
    cortarUrgencia: () => despachar({ tipo: 'cortarUrgencia' }),
    setVelocidad(ms) {
      velocidad = Math.max(400, ms)
      if (activo) reiniciarTick()
      oyentes.forEach((fn) => fn())
    },
    velocidad: () => velocidad,
  }
}
