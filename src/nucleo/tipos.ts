import type { LineaHistorial, Opcion, PedidoOpciones } from '@/eventos'

export type ElementoFijo = 'urgencia' | 'si' | 'no' | 'espera' | 'otra' | 'repetir'
export type Elemento = { tipo: 'opcion'; indice: number } | { tipo: ElementoFijo }

// Que muestran los cuadrantes.
export type Conversacion = 'escuchando' | 'pensando' | 'opciones' | 'sinConexion'

export type Estado = {
  conversacion: Conversacion
  opciones: Opcion[]
  historial: LineaHistorial[]
  ultimoTurno: string | null // turno sin responder todavia
  turnoMostrado: string | null // lo que se ve arriba
  parcial: string | null // transcripcion en vivo
  yaMostradas: string[]
  pedidoId: number
  iluminado: number // indice en elementosBarrido(estado)
  vueltas: number
  pausado: boolean // pausa del barrido tras 3 vueltas
  urgencia: boolean
  urgenciaPaso: 'aviso' | 'confirmar' // "Fue sin querer" pide dos parpadeos largos
  pedirAlCortarUrgencia: boolean
  hayParaRepetir: boolean // ya se dijo algo que Repetir puede volver a decir
  hablando: boolean
  escuchando: boolean // el microfono esta escuchando (indicador para la sala)
  esperandoHabla: boolean // despues de elegir, hasta hablando false o el maximo
  ojosCerrados: boolean
  progreso: number
  eleccionPendiente: Elemento | null // se confirma al abrir los ojos
  turnoPendiente: string | null // turno que llego con los ojos cerrados
}

export type Accion =
  | { tipo: 'turno'; texto: string }
  | { tipo: 'parcial'; texto: string }
  | { tipo: 'ojos'; cerrados: boolean; progreso: number }
  | { tipo: 'parpadeoLargo' }
  | { tipo: 'tick' }
  | { tipo: 'opcionesRecibidas'; pedidoId: number; opciones: Opcion[] }
  | { tipo: 'opcionesFallaron'; pedidoId: number }
  | { tipo: 'hablando'; activo: boolean }
  | { tipo: 'escuchando'; activo: boolean }
  | { tipo: 'finEsperaHabla' }
  | { tipo: 'gestoUrgencia' }
  | { tipo: 'cortarUrgencia' } // la corta el cuidador (Escape o click)
  | { tipo: 'finConfirmacion' } // vencio el tiempo para confirmar la falsa alarma
  | { tipo: 'repetir' } // click de la sala en Repetir

// Lo que el motor tiene que hacer afuera del reductor.
export type Efecto =
  | { tipo: 'decir'; texto: string; urgencia?: boolean }
  | { tipo: 'detenerUrgencia'; falsaAlarma?: boolean }
  | { tipo: 'repetir' }
  | { tipo: 'armarConfirmacion' }
  | { tipo: 'pedirOpciones'; pedidoId: number; pedido: PedidoOpciones }
  | { tipo: 'reiniciarTick' }
  | { tipo: 'armarGestoUrgencia' }
  | { tipo: 'desarmarGestoUrgencia' }
  | { tipo: 'armarEsperaHabla' }

export type Resultado = { estado: Estado; efectos: Efecto[] }
