// La conversacion actual guardada en el servidor: su contexto (cercania e interlocutor) y sus lineas.
// La usan opciones (al abrir, seguir y cerrar por silencio) y el cierre explicito de la demo.
// Asi una recarga del cliente no pierde lo hablado, y la conversacion cerrada se atribuye con
// su propio contexto, nunca con el del pedido que abre la siguiente.
import type { LineaHistorial, PedidoOpciones } from '@/eventos'
import type { ConversacionActual, ConversacionCerrada } from './tipos.ts'

// El interlocutor aclarado en un pedido, o undefined si no lo trae.
const interlocutorDe = (pedido: PedidoOpciones) => pedido.interlocutor?.trim() || undefined

// Una conversacion nueva: el contexto es el del pedido que la abre. El historial que trae ese
// pedido es de la anterior, asi que esta empieza en su final.
export function abrirConversacion(pedido: PedidoOpciones, ahora: Date): ConversacionActual {
  const iso = ahora.toISOString()
  return {
    inicio: iso,
    ultimaActividad: iso,
    desdeLinea: pedido.historial.length,
    cercania: pedido.cercania ?? null,
    interlocutor: interlocutorDe(pedido) ?? null,
    lineas: [],
    turnoPendiente: pedido.ultimoTurno,
  }
}

// La misma conversacion con un pedido mas: guarda sus lineas nuevas, y lo aclarado en el pedido
// reemplaza a lo de antes (sin aclarar, se conserva).
export function seguirConversacion(
  actual: ConversacionActual,
  pedido: PedidoOpciones,
  ahora: Date,
): ConversacionActual {
  const interlocutor = interlocutorDe(pedido)
  return {
    ...sumarLineas(actual, pedido.historial),
    ultimaActividad: ahora.toISOString(),
    turnoPendiente: pedido.ultimoTurno,
    ...(pedido.cercania ? { cercania: pedido.cercania } : {}),
    ...(interlocutor ? { interlocutor } : {}),
  }
}

// La misma conversacion con las lineas nuevas del historial guardadas, sin tocar su actividad.
// Opciones la usa apenas llega el pedido, antes de esperar al modelo: si mientras tanto la cierra
// el chequeo periodico, la cerrada ya tiene las lineas de este pedido.
export function sumarLineas(actual: ConversacionActual, historial: LineaHistorial[]): ConversacionActual {
  return {
    ...actual,
    lineas: lineasDeConversacion(actual, historial),
    // Si el historial se achico (recarga), lo que trajo ya quedo en lineas: lo que siga se toma desde aca.
    desdeLinea: Math.min(actual.desdeLinea, historial.length),
  }
}

// La conversacion cerrada, con las lineas guardadas mas las que traiga el historial y el contexto
// de la propia conversacion (una memoria vieja sin cercania ni interlocutor cierra con null).
// null si no hay lineas: no hay nada que aprender.
export function armarCerrada(actual: ConversacionActual, historial: LineaHistorial[]): ConversacionCerrada | null {
  const lineas = conTurnoPendiente(lineasDeConversacion(actual, historial), actual.turnoPendiente)
  if (lineas.length === 0) return null
  return {
    inicio: actual.inicio,
    fin: actual.ultimaActividad,
    lineas,
    cercania: actual.cercania ?? null,
    interlocutor: actual.interlocutor ?? null,
  }
}

// La cola de una conversacion cerrada por tiempo: la cerrada con las lineas que trae ahora el historial.
// null si no trae nada nuevo. Las ya aprendidas van primero, como contexto.
export function completarCerrada(cerrada: ConversacionActual, historial: LineaHistorial[]): ConversacionCerrada | null {
  const aprendidas = cerrada.lineas ?? []
  const lineas = lineasDeConversacion(cerrada, historial)
  if (lineas.length <= aprendidas.length) return null
  return {
    inicio: cerrada.inicio,
    fin: cerrada.ultimaActividad,
    lineas,
    cercania: cerrada.cercania ?? null,
    interlocutor: cerrada.interlocutor ?? null,
    yaAprendidas: aprendidas.length,
  }
}

// El ultimo turno del interlocutor se suma si el historial todavia no lo trajo: si la ultima linea
// del interlocutor ya es ese turno, ya esta.
function conTurnoPendiente(lineas: LineaHistorial[], turno: string | null | undefined): LineaHistorial[] {
  if (!turno?.trim()) return lineas
  const ultimaDelInterlocutor = lineas.findLast((l) => l.quien === 'interlocutor')
  if (ultimaDelInterlocutor?.texto === turno) return lineas
  return [...lineas, { quien: 'interlocutor', texto: turno }]
}

// Las lineas de la conversacion: las guardadas en el servidor, mas las nuevas que trae el historial
// del cliente desde donde empezo. Si el historial se achico (recarga), lo del cliente es todo lo
// nuevo que hay y las guardadas no se pierden.
// Limite conocido: una recarga se detecta solo si el historial llega mas corto que desdeLinea.
export function lineasDeConversacion(actual: ConversacionActual, historial: LineaHistorial[]): LineaHistorial[] {
  const desde = actual.desdeLinea <= historial.length ? actual.desdeLinea : 0
  return unirLineas(actual.lineas ?? [], historial.slice(desde))
}

// Una linea ya guardada se reconoce por quien la dijo y su texto. Se busca el solapamiento mas
// largo entre el final de las guardadas y el principio de las del cliente, y se suma lo que sigue:
// asi el mismo historial dos veces no duplica, y un "Si." dicho de nuevo cuenta como nuevo.
// Limite conocido: justo despues de una recarga, una linea igual a la ultima guardada se toma como ya guardada.
function unirLineas(guardadas: LineaHistorial[], delCliente: LineaHistorial[]): LineaHistorial[] {
  const igual = (a: LineaHistorial, b: LineaHistorial) => a.quien === b.quien && a.texto === b.texto
  for (let n = Math.min(guardadas.length, delCliente.length); n > 0; n--) {
    const cola = guardadas.slice(-n)
    if (cola.every((l, i) => igual(l, delCliente[i]))) return [...guardadas, ...delCliente.slice(n)]
  }
  return [...guardadas, ...delCliente]
}
