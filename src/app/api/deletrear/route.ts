// Ruta de deletrear: frases o palabras predichas a partir de la pista deletreada.
// POST con { tipo: 'frases' | 'palabras', escrito, pedido: PedidoOpciones } -> { lista, proveedor, ms }.
// Si el modelo falla, la lista viene vacia (nunca 5xx por el modelo).
import type { PedidoOpciones } from '@/eventos'
import { crearAlmacenEnArchivos } from '@/llm'
import { elegirProveedor } from '@/llm/proveedores'
import { crearPrediccion } from '@/deletrear/llm'

// Una instancia por proceso. Lee la misma huella y memoria que /api/opciones, sin escribirlas.
const proveedor = elegirProveedor()
const predecir = crearPrediccion({ proveedor, almacen: crearAlmacenEnArchivos() })

function esPedido(x: unknown): x is PedidoOpciones {
  if (typeof x !== 'object' || x === null) return false
  const p = x as Record<string, unknown>
  return (
    Array.isArray(p.historial) &&
    (p.ultimoTurno === null || typeof p.ultimoTurno === 'string') &&
    (p.cercania === undefined || ['familia', 'conocido', 'formal'].includes(p.cercania as string)) &&
    (p.interlocutor === undefined || typeof p.interlocutor === 'string')
  )
}

export async function POST(request: Request) {
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return Response.json({ error: 'El cuerpo no es JSON' }, { status: 400 })
  }
  const c = (cuerpo ?? {}) as Record<string, unknown>
  if (c.tipo !== 'frases' && c.tipo !== 'palabras') return Response.json({ error: 'tipo invalido' }, { status: 400 })
  if (typeof c.escrito !== 'string') return Response.json({ error: 'Falta escrito' }, { status: 400 })
  if (!esPedido(c.pedido)) return Response.json({ error: 'No es un PedidoOpciones' }, { status: 400 })

  const inicio = performance.now()
  const lista = await predecir(c.tipo, c.escrito, c.pedido)
  const ms = Math.round(performance.now() - inicio)
  return Response.json({ lista, proveedor: proveedor.nombre, ms })
}
