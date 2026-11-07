import { bus, type LineaHistorial, type Opcion, type PedidoOpciones } from '@/eventos'
import { leerTurnoLocal } from './lecturaLocal'
import { estadoInicial, reducir } from './reductor'
import type { Accion, Efecto, Estado, LecturaTurno } from './tipos'

// Conecta el reductor con el mundo: escucha el bus, maneja los timers,
// llama al LLM y emite decir / detenerUrgencia. No decide nada: las reglas
// estan todas en el reductor.

export const VELOCIDAD_INICIAL_MS = 1200
export const GESTO_URGENCIA_MS = 2000
export const MAXIMO_ESPERA_HABLA_MS = 3000
export const MAXIMO_OPCIONES = 4
export const CONFIRMACION_FALSA_ALARMA_MS = 5000
export const LECTURA_MAXIMO_MS = 800 // si el lector con modelo tarda mas, decide la heuristica local
export const ACUMULADO_VENCE_MS = 4000 // sin fragmentos nuevos, se decide con la ultima lectura

export type LeerTurno = (texto: string, historial: LineaHistorial[]) => Promise<LecturaTurno>

export type OpcionesNucleo = {
  pedirOpciones: (pedido: PedidoOpciones) => Promise<Opcion[]>
  leerTurno?: LeerTurno // lector con modelo (Jev, LLM tipado); sin el, solo heuristica local
  nombreUsuario?: string
  velocidadMs?: number
}

export type Nucleo = {
  iniciar(): void
  detener(): void
  obtener(): Estado
  suscribir(fn: () => void): () => void
  cortarUrgencia(): void
  repetir(): void
  setVelocidad(ms: number): void
  velocidad(): number
}

export function crearNucleo({
  pedirOpciones,
  leerTurno,
  nombreUsuario = 'Roberto',
  velocidadMs = VELOCIDAD_INICIAL_MS,
}: OpcionesNucleo): Nucleo {
  let estado = estadoInicial
  let velocidad = velocidadMs
  let activo = false
  const oyentes = new Set<() => void>()
  let offs: (() => void)[] = []
  let tick: ReturnType<typeof setInterval> | null = null
  let gesto: ReturnType<typeof setTimeout> | null = null
  let espera: ReturnType<typeof setTimeout> | null = null
  let confirmacion: ReturnType<typeof setTimeout> | null = null
  let vencimiento: ReturnType<typeof setTimeout> | null = null

  // Lee el turno con el modelo si hay, con la heuristica local como respaldo
  // (si no hay modelo, si tarda mas de LECTURA_MAXIMO_MS o si falla).
  function leer(texto: string, historial: LineaHistorial[]): Promise<LecturaTurno> {
    const local = (): LecturaTurno => ({
      ...leerTurnoLocal(texto, { nombreUsuario, usuarioAcabaDeHablar: historial.at(-1)?.quien === 'usuario' }),
      fuente: 'local',
    })
    if (!leerTurno) return Promise.resolve(local())
    let limite: ReturnType<typeof setTimeout> | null = null
    const tarde = new Promise<null>((r) => {
      limite = setTimeout(() => r(null), LECTURA_MAXIMO_MS)
    })
    return Promise.race([leerTurno(texto, historial), tarde])
      .then((l): LecturaTurno => (l ? { ...l, fuente: 'modelo' } : local()))
      .catch(() => local())
      .finally(() => {
        if (limite) clearTimeout(limite)
      })
  }

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
    if (confirmacion) clearTimeout(confirmacion)
    if (vencimiento) clearTimeout(vencimiento)
    tick = gesto = espera = confirmacion = vencimiento = null
  }

  function ejecutar(efecto: Efecto) {
    switch (efecto.tipo) {
      case 'decir':
        bus.emit('decir', efecto.urgencia ? { texto: efecto.texto, urgencia: true } : { texto: efecto.texto })
        break
      case 'detenerUrgencia':
        bus.emit('detenerUrgencia', efecto.falsaAlarma ? { falsaAlarma: true } : {})
        break
      case 'repetir':
        bus.emit('repetir', {})
        break
      case 'leerTurno': {
        const { lecturaId } = efecto
        leer(efecto.texto, efecto.historial).then((lectura) => despachar({ tipo: 'lectura', lecturaId, lectura }))
        break
      }
      case 'armarVencimientoAcumulado':
        if (vencimiento) clearTimeout(vencimiento)
        vencimiento = setTimeout(() => despachar({ tipo: 'venceAcumulado' }), ACUMULADO_VENCE_MS)
        break
      case 'armarConfirmacion':
        if (confirmacion) clearTimeout(confirmacion)
        confirmacion = setTimeout(() => despachar({ tipo: 'finConfirmacion' }), CONFIRMACION_FALSA_ALARMA_MS)
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
        // Lo que cierra voz es un fragmento: la lectura del turno decide si es un turno.
        bus.on('turno', ({ texto }) => despachar({ tipo: 'fragmento', texto })),
        bus.on('transcripcionParcial', ({ texto }) => despachar({ tipo: 'parcial', texto })),
        bus.on('ojos', ({ cerrados, progreso, perdido }) => despachar({ tipo: 'ojos', cerrados, progreso, perdido })),
        bus.on('parpadeoLargo', () => despachar({ tipo: 'parpadeoLargo' })),
        bus.on('hablando', ({ activo }) => despachar({ tipo: 'hablando', activo })),
        bus.on('escuchando', ({ activo }) => despachar({ tipo: 'escuchando', activo })),
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
    repetir: () => despachar({ tipo: 'repetir' }),
    setVelocidad(ms) {
      velocidad = Math.max(400, ms)
      if (activo) reiniciarTick()
      oyentes.forEach((fn) => fn())
    },
    velocidad: () => velocidad,
  }
}
