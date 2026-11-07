// Contrato compartido entre paths. Solo se agregan eventos, nunca se renombran ni borran.

export type Intencion = 'aceptar' | 'rechazar' | 'preguntar' | 'otra'
export type Opcion = { intencion: Intencion; texto: string }

export type Perfil = {
  nombre: string
  edad: number
  familia: string[]
  gustos: string[]
  tono: string
  frasesTipicas: string[]
}

export type LineaHistorial = { quien: 'interlocutor' | 'usuario'; texto: string }

// Pedido al LLM. ultimoTurno null = el usuario quiere iniciar charla (eligio Otra sin turno).
export type PedidoOpciones = {
  historial: LineaHistorial[]
  ultimoTurno: string | null
  yaMostradas: string[] // opciones ya mostradas para este turno, para no repetirlas
}

export type Eventos = {
  // vision -> nucleo
  ojos: { cerrados: boolean; progreso: number } // progreso 0..1 hacia el parpadeo largo
  parpadeoLargo: Record<string, never>
  // voz -> nucleo
  transcripcionParcial: { texto: string } // lo que va diciendo el interlocutor, en vivo
  turno: { texto: string } // turno completo (fin de turno detectado o tipeado)
  hablando: { activo: boolean } // el sistema esta diciendo algo en voz alta
  // nucleo -> voz
  decir: { texto: string; urgencia?: boolean }
  detenerUrgencia: Record<string, never>
}

type Handler<T> = (payload: T) => void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers = new Map<keyof Eventos, Set<Handler<any>>>()

export const bus = {
  on<K extends keyof Eventos>(evento: K, fn: Handler<Eventos[K]>): () => void {
    if (!handlers.has(evento)) handlers.set(evento, new Set())
    handlers.get(evento)!.add(fn)
    return () => {
      handlers.get(evento)!.delete(fn)
    }
  },
  emit<K extends keyof Eventos>(evento: K, payload: Eventos[K]) {
    handlers.get(evento)?.forEach((fn) => fn(payload))
  },
}
