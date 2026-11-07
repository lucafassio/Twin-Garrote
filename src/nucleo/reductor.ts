import type { LineaHistorial } from '@/eventos'
import type { Accion, Efecto, Elemento, Estado, Resultado } from './tipos'

// Reglas del nucleo (issue #5). Funcion pura: sin timers, sin red, sin React.
// El motor ejecuta los efectos que devuelve.

export const VUELTAS_ANTES_DE_PAUSA = 3
export const TEXTO_SI = 'Sí.'
export const TEXTO_NO = 'No.'
export const TEXTO_ESPERA = 'Esperá, dejame pensar.'
export const TEXTO_URGENCIA = 'Necesito ayuda.'

export const estadoInicial: Estado = {
  conversacion: 'escuchando',
  opciones: [],
  historial: [],
  ultimoTurno: null,
  turnoMostrado: null,
  parcial: null,
  yaMostradas: [],
  pedidoId: 0,
  iluminado: 0,
  vueltas: 0,
  pausado: false,
  urgencia: false,
  urgenciaPaso: 'aviso',
  pedirAlCortarUrgencia: false,
  hayParaRepetir: false,
  hablando: false,
  escuchando: false,
  esperandoHabla: false,
  ojosCerrados: false,
  progreso: 0,
  eleccionPendiente: null,
  turnoPendiente: null,
}

// Orden del barrido: opciones (por probabilidad) y despues la franja fija.
export function elementosBarrido(estado: Estado): Elemento[] {
  const lista: Elemento[] = []
  if (estado.conversacion === 'opciones') {
    estado.opciones.forEach((_, indice) => lista.push({ tipo: 'opcion', indice }))
  }
  lista.push({ tipo: 'urgencia' }, { tipo: 'si' }, { tipo: 'no' }, { tipo: 'espera' })
  if (estado.conversacion !== 'pensando') lista.push({ tipo: 'otra' })
  if (estado.hayParaRepetir) lista.push({ tipo: 'repetir' })
  return lista
}

// Historial sin el turno que se esta respondiendo (ese va como ultimoTurno).
function historialPrevio(e: Estado): LineaHistorial[] {
  const ultima = e.historial.at(-1)
  if (e.ultimoTurno !== null && ultima?.quien === 'interlocutor' && ultima.texto === e.ultimoTurno) {
    return e.historial.slice(0, -1)
  }
  return e.historial
}

// Helpers que mutan una copia del estado y acumulan efectos.
type Ctx = { e: Estado; efectos: Efecto[] }

function reiniciarBarrido(c: Ctx) {
  c.e.iluminado = 0
  c.e.vueltas = 0
  c.e.pausado = false
  c.efectos.push({ tipo: 'reiniciarTick' })
}

function pedirOpciones(c: Ctx) {
  c.e.pedidoId += 1
  c.e.conversacion = 'pensando'
  c.e.opciones = []
  c.efectos.push({
    tipo: 'pedirOpciones',
    pedidoId: c.e.pedidoId,
    pedido: { historial: historialPrevio(c.e), ultimoTurno: c.e.ultimoTurno, yaMostradas: c.e.yaMostradas },
  })
  reiniciarBarrido(c)
}

function recibirTurno(c: Ctx, texto: string) {
  c.e.historial = [...c.e.historial, { quien: 'interlocutor', texto }]
  c.e.ultimoTurno = texto
  c.e.turnoMostrado = texto
  c.e.parcial = null
  c.e.yaMostradas = []
  if (c.e.urgencia) {
    c.e.pedirAlCortarUrgencia = true
    return
  }
  pedirOpciones(c)
}

function esperarHabla(c: Ctx) {
  c.e.esperandoHabla = true
  c.efectos.push({ tipo: 'armarEsperaHabla' })
}

function decir(c: Ctx, texto: string) {
  c.efectos.push({ tipo: 'decir', texto })
  c.e.hayParaRepetir = true
  esperarHabla(c)
}

function repetir(c: Ctx) {
  c.efectos.push({ tipo: 'repetir' })
  esperarHabla(c)
  reiniciarBarrido(c)
}

// Respuesta al turno: se dice, entra al historial y limpia las opciones.
function responder(c: Ctx, texto: string, origen: 'opcion' | 'fija') {
  decir(c, texto)
  c.e.historial = [...c.e.historial, { quien: 'usuario', texto, origen }]
  c.e.conversacion = 'escuchando'
  c.e.opciones = []
  c.e.ultimoTurno = null
  c.e.yaMostradas = []
  reiniciarBarrido(c)
}

function activarUrgencia(c: Ctx) {
  c.e.urgencia = true
  c.e.urgenciaPaso = 'aviso'
  c.e.eleccionPendiente = null
  c.efectos.push({ tipo: 'decir', texto: TEXTO_URGENCIA, urgencia: true })
}

function ejecutar(c: Ctx, el: Elemento) {
  switch (el.tipo) {
    case 'opcion': {
      const opcion = c.e.opciones[el.indice]
      if (opcion) responder(c, opcion.texto, 'opcion')
      return
    }
    case 'si':
      return responder(c, TEXTO_SI, 'fija')
    case 'no':
      return responder(c, TEXTO_NO, 'fija')
    case 'repetir':
      return repetir(c)
    case 'espera':
      decir(c, TEXTO_ESPERA)
      return reiniciarBarrido(c)
    case 'otra':
      c.e.yaMostradas = [...c.e.yaMostradas, ...c.e.opciones.map((o) => o.texto)]
      return pedirOpciones(c)
    case 'urgencia':
      return activarUrgencia(c)
  }
}

function barridoDetenido(e: Estado) {
  return e.urgencia || e.hablando || e.esperandoHabla || e.pausado || e.ojosCerrados
}

export function reducir(estado: Estado, accion: Accion): Resultado {
  const c: Ctx = { e: { ...estado }, efectos: [] }
  const e = c.e

  switch (accion.tipo) {
    case 'turno':
      if (e.ojosCerrados && !e.urgencia) e.turnoPendiente = accion.texto
      else recibirTurno(c, accion.texto)
      break

    case 'parcial':
      // Voz manda texto vacio cuando cierra o descarta un turno.
      e.parcial = accion.texto.trim() ? accion.texto : null
      break

    case 'ojos':
      e.progreso = accion.progreso
      if (accion.cerrados && !e.ojosCerrados) {
        e.ojosCerrados = true
        c.efectos.push({ tipo: 'armarGestoUrgencia' })
      } else if (!accion.cerrados && e.ojosCerrados) {
        e.ojosCerrados = false
        e.progreso = 0
        c.efectos.push({ tipo: 'desarmarGestoUrgencia' })
        if (e.eleccionPendiente) {
          const el = e.eleccionPendiente
          e.eleccionPendiente = null
          ejecutar(c, el)
        }
        if (e.turnoPendiente !== null) {
          const texto = e.turnoPendiente
          e.turnoPendiente = null
          recibirTurno(c, texto)
        }
      }
      break

    case 'parpadeoLargo': {
      // En la urgencia el unico elemento es "Fue sin querer", con confirmacion.
      // Anda aunque la voz este diciendo la alarma.
      if (e.urgencia) {
        if (e.urgenciaPaso === 'aviso') {
          e.urgenciaPaso = 'confirmar'
          c.efectos.push({ tipo: 'armarConfirmacion' })
        } else {
          e.urgencia = false
          e.urgenciaPaso = 'aviso'
          c.efectos.push({ tipo: 'detenerUrgencia', falsaAlarma: true })
          if (e.pedirAlCortarUrgencia) {
            e.pedirAlCortarUrgencia = false
            pedirOpciones(c)
          } else {
            reiniciarBarrido(c)
          }
        }
        break
      }
      if (e.hablando || e.esperandoHabla) break
      if (e.pausado) {
        reiniciarBarrido(c)
        break
      }
      const el = elementosBarrido(e)[e.iluminado]
      if (!el) break
      if (e.ojosCerrados) e.eleccionPendiente = el
      else ejecutar(c, el)
      break
    }

    case 'tick': {
      if (barridoDetenido(e)) break
      const total = elementosBarrido(e).length
      e.iluminado += 1
      if (e.iluminado >= total) {
        e.iluminado = 0
        e.vueltas += 1
        if (e.vueltas >= VUELTAS_ANTES_DE_PAUSA) e.pausado = true
      }
      break
    }

    case 'opcionesRecibidas':
      if (accion.pedidoId !== e.pedidoId || e.conversacion !== 'pensando') break
      e.opciones = accion.opciones
      e.conversacion = accion.opciones.length > 0 ? 'opciones' : 'sinConexion'
      reiniciarBarrido(c)
      break

    case 'opcionesFallaron':
      if (accion.pedidoId !== e.pedidoId || e.conversacion !== 'pensando') break
      e.conversacion = 'sinConexion'
      reiniciarBarrido(c)
      break

    case 'hablando':
      e.hablando = accion.activo
      if (accion.activo) {
        e.esperandoHabla = false
      } else if (!e.urgencia) {
        reiniciarBarrido(c)
      }
      break

    case 'escuchando':
      e.escuchando = accion.activo
      break

    case 'finEsperaHabla':
      if (e.esperandoHabla) {
        e.esperandoHabla = false
        reiniciarBarrido(c)
      }
      break

    case 'gestoUrgencia':
      if (e.ojosCerrados && !e.urgencia) activarUrgencia(c)
      break

    case 'cortarUrgencia':
      if (!e.urgencia) break
      e.urgencia = false
      e.urgenciaPaso = 'aviso'
      c.efectos.push({ tipo: 'detenerUrgencia' })
      if (e.pedirAlCortarUrgencia) {
        e.pedirAlCortarUrgencia = false
        pedirOpciones(c)
      } else {
        reiniciarBarrido(c)
      }
      break

    case 'finConfirmacion':
      if (e.urgencia) e.urgenciaPaso = 'aviso'
      break

    case 'repetir':
      if (e.hayParaRepetir && !e.urgencia && !e.hablando && !e.esperandoHabla) repetir(c)
      break
  }

  // Si la lista se achico, el iluminado no puede quedar afuera.
  if (e.iluminado >= elementosBarrido(e).length) e.iluminado = 0

  return { estado: e, efectos: c.efectos }
}
