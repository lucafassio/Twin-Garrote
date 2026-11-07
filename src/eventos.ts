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

// origen (opcional): como eligio el usuario su respuesta. Lo usa el agente de memoria:
// lo deletreado pesa mas que lo elegido entre opciones.
export type LineaHistorial = {
  quien: 'interlocutor' | 'usuario'
  texto: string
  origen?: 'opcion' | 'fija' | 'deletreo'
}

// Relacion del interlocutor con el usuario. Opcional: si nadie la aclara, la infiere el LLM.
export type Cercania = 'familia' | 'conocido' | 'formal'

// Pedido al LLM. ultimoTurno null = el usuario quiere iniciar charla (eligio Otra sin turno).
export type PedidoOpciones = {
  historial: LineaHistorial[]
  ultimoTurno: string | null
  yaMostradas: string[] // opciones ya mostradas para este turno, para no repetirlas
  cercania?: Cercania // opcional: define tono y que hechos se pueden usar
}

export type Eventos = {
  // vision -> nucleo
  ojos: { cerrados: boolean; progreso: number } // progreso 0..1 hacia el parpadeo largo
  parpadeoLargo: Record<string, never>
  // voz -> nucleo
  transcripcionParcial: { texto: string } // lo que va diciendo el interlocutor, en vivo
  turno: { texto: string } // turno completo (fin de turno detectado o tipeado)
  hablando: { activo: boolean } // el sistema esta diciendo algo en voz alta
  escuchando: { activo: boolean } // el microfono esta transcribiendo (no escucha desde el aviso hasta que termina de hablar)
  // nucleo -> voz
  decir: { texto: string; urgencia?: boolean }
  detenerUrgencia: { falsaAlarma?: boolean } // sin falsaAlarma = atendida por alguien de la sala
  repetir: Record<string, never> // vuelve a decir la ultima respuesta
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
