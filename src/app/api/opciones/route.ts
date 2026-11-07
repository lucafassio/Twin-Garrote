// Ruta de opciones del path llm: capa fina sobre el modulo de opciones.
// POST con PedidoOpciones -> { opciones, registro, nuevaConversacion, proveedor, ms }.
import type { PedidoOpciones } from '@/eventos'
import { ErrorOpciones } from '@/llm'
import { servidorLlm } from '@/llm/servidor'

// Una instancia por proceso, compartida con /api/memoria (servidor.ts). La huella y la memoria viven
// en .data/ (fuera de git). Al cerrarse una conversacion, el agente de memoria aprende en segundo plano.

function esPedido(x: unknown): x is PedidoOpciones {
  if (typeof x !== 'object' || x === null) return false
  const p = x as Record<string, unknown>
  return (
    Array.isArray(p.historial) &&
    (p.ultimoTurno === null || typeof p.ultimoTurno === 'string') &&
    Array.isArray(p.yaMostradas) &&
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
  if (!esPedido(cuerpo)) return Response.json({ error: 'No es un PedidoOpciones' }, { status: 400 })

  const { generarOpciones, proveedor } = servidorLlm()
  const inicio = performance.now()
  try {
    const resultado = await generarOpciones(cuerpo)
    const ms = Math.round(performance.now() - inicio)
    return Response.json({ ...resultado, proveedor: proveedor.nombre, ms })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    console.error('[api/opciones]', mensaje)
    const status = error instanceof ErrorOpciones ? 502 : 500
    return Response.json({ error: mensaje, proveedor: proveedor.nombre }, { status })
  }
}
