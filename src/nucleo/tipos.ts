import type { LineaHistorial, Opcion, PedidoOpciones } from '@/eventos'

// Lectura del turno: que es lo que se escucho, antes de pedir opciones.
// paraUsuario y completo son probabilidades 0..1 (de un modelo o de la heuristica local).
export type TipoTurno = 'siNo' | 'abierta' | 'comentario' | 'saludo' | 'pedido' | 'otro'
export type LecturaTurno = {
  paraUsuario: number
  completo: number
  tipo: TipoTurno
  fuente?: 'modelo' | 'local' // de donde salio (lo completa el motor, para el debug)
}

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
  // Lectura del turno: los fragmentos de voz se acumulan hasta que la lectura los acepta.
  acumulado: string | null
  lecturaId: number
  ultimaLectura: LecturaTurno | null // del acumulado actual
  descartado: string | null // ultimo texto que no parecia para el usuario (se muestra en gris)
  tipoTurno: TipoTurno | null // del turno que se esta respondiendo
}

export type Accion =
  | { tipo: 'turno'; texto: string } // turno ya aceptado (por la lectura o tipeado por el operador)
  | { tipo: 'fragmento'; texto: string } // lo que cerro voz: todavia hay que leerlo
  | { tipo: 'lectura'; lecturaId: number; lectura: LecturaTurno }
  | { tipo: 'venceAcumulado' }
  | { tipo: 'parcial'; texto: string }
  | { tipo: 'ojos'; cerrados: boolean; progreso: number; perdido?: boolean } // perdido: vision dejo de ver los ojos
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
  | { tipo: 'leerTurno'; lecturaId: number; texto: string; historial: LineaHistorial[] }
  | { tipo: 'armarVencimientoAcumulado' }
  | { tipo: 'pedirOpciones'; pedidoId: number; pedido: PedidoOpciones }
  | { tipo: 'reiniciarTick' }
  | { tipo: 'armarGestoUrgencia' }
  | { tipo: 'desarmarGestoUrgencia' }
  | { tipo: 'armarEsperaHabla' }

export type Resultado = { estado: Estado; efectos: Efecto[] }
