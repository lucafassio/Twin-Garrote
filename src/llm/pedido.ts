import type { PedidoOpciones, TipoTurno } from '../eventos.ts'

const TIPOS_TURNO: TipoTurno[] = ['siNo', 'abierta', 'comentario', 'saludo', 'pedido', 'otro']

export function esPedido(x: unknown): x is PedidoOpciones {
  if (typeof x !== 'object' || x === null) return false
  const p = x as Record<string, unknown>
  return (
    Array.isArray(p.historial) &&
    (p.ultimoTurno === null || typeof p.ultimoTurno === 'string') &&
    Array.isArray(p.yaMostradas) &&
    (p.cercania === undefined || ['familia', 'conocido', 'formal'].includes(p.cercania as string)) &&
    (p.interlocutor === undefined || typeof p.interlocutor === 'string') &&
    (p.tipoTurno === undefined || TIPOS_TURNO.includes(p.tipoTurno as TipoTurno))
  )
}
